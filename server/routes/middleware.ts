import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { unionStaff, userActivityLogs } from "@shared/schema";
import type { User } from "@shared/schema";
import { storage } from "../storage";
import { createHmac, timingSafeEqual, randomUUID } from "crypto";

// JWT-like token utilities
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

interface AuthenticatedRequest extends Request {
  user?: User & { merchantId?: string; isGlobalAdmin?: boolean };
}

function signToken(payload: any): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    
    if (!timingSafeEqual(Buffer.from(signature, 'base64url'), Buffer.from(expectedSignature, 'base64url'))) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    
    // Check expiration
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomUUID().replace(/-/g, ''); // Remove dashes for cleaner salt
  const { scrypt } = await import('crypto');
  const { promisify } = await import('util');
  const scryptAsync = promisify(scrypt);
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    if (storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$')) {
      const bcrypt = await import('bcryptjs');
      return bcrypt.compare(password, storedHash);
    }

    if (!storedHash.includes(':')) {
      return false;
    }
    
    const [salt, hash] = storedHash.split(':');
    
    if (!/^[0-9a-fA-F]+$/.test(hash)) {
      console.error('Invalid hash format detected - rejecting authentication');
      return false;
    }
    
    const { scrypt } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);
    const hashBuffer = await scryptAsync(password, salt, 64) as Buffer;
    const computedHash = hashBuffer.toString('hex');
    
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
  } catch {
    return false;
  }
}

// Middleware
function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminSessionToken = req.cookies?.admin_session_token;
  const authToken = req.cookies?.auth_token;
  const merchantToken = req.cookies?.merchant_token;
  
  const tokens: string[] = [];
  if (adminSessionToken) tokens.push(adminSessionToken);
  if (authToken && authToken !== adminSessionToken) tokens.push(authToken);
  if (merchantToken && merchantToken !== authToken && merchantToken !== adminSessionToken) tokens.push(merchantToken);
  
  if (tokens.length === 0) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const tryToken = (index: number) => {
    if (index >= tokens.length) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const payload = verifyToken(tokens[index]);
    if (!payload) {
      return tryToken(index + 1);
    }
    resolvePayload(payload, () => tryToken(index + 1));
  };

  const resolvePayload = (payload: any, fallback: () => void) => {
    if (payload.role === 'merchant' || payload.role === 'merchant_subuser' || payload.role === 'merchant_staff') {
      storage.getMerchants().then(allMerchants => {
        const merchantId = payload.role === 'merchant_subuser' ? payload.parentId : payload.id;
        const merchant = allMerchants.find((m: any) => m.id === merchantId);
        if (!merchant) {
          return fallback();
        }
        // Enforce force-logout: reject tokens issued before sessionInvalidatedAt
        if (merchant.sessionInvalidatedAt && payload.iat !== undefined) {
          if (new Date(payload.iat * 1000) < new Date(merchant.sessionInvalidatedAt)) {
            res.clearCookie('merchant_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
            return fallback();
          }
        }
        const isAdmin = merchant.role === 'admin' || merchant.id === 'admin-1' || (merchant as any).isAdmin;
        const isGlobalAdmin = merchant.id === 'admin-1';
        const effectiveMerchantId = isGlobalAdmin ? null : merchantId;
        req.user = {
          id: payload.id || merchant.id,
          name: payload.name || merchant.restaurantName || merchant.contactName,
          email: payload.email || merchant.contactEmail,
          role: isAdmin ? 'admin' : 'merchant',
          passwordHash: '',
          createdAt: new Date(),
          phone: merchant.contactPhone,
          merchantId: effectiveMerchantId,
          isGlobalAdmin,
        } as any;
        next();
      }).catch(() => fallback());
    } else if (payload.userId) {
      storage.getUser(payload.userId).then(user => {
        if (!user) return fallback();
        if (user.role === 'admin') {
          const isGlobal = user.email === 'aavincart@gmail.com' || payload.parentId === undefined;
          (user as any).isGlobalAdmin = isGlobal && !payload.isSubUser;
          (user as any).merchantId = isGlobal && !payload.isSubUser ? null : (payload.parentId || null);
        }
        req.user = user;
        next();
      }).catch(() => fallback());
    } else if (payload.agentId) {
      resolveAgentPayload(payload, fallback);
    } else if (payload.staffId) {
      resolveStaffPayload(payload, fallback);
    } else {
      fallback();
    }
  };

  const resolveAgentPayload = (payload: any, fallback: () => void) => {
    const agentId = payload.agentId;
    const isWsdId = agentId.startsWith('wsd-');
    if (isWsdId) {
      const realId = agentId.replace('wsd-', '');
      storage.getWholesaleDealerById(realId).then(wsd => {
        if (!wsd) return fallback();
        req.user = {
          id: agentId, name: wsd.name, email: wsd.email || '', role: 'agent',
          passwordHash: wsd.passwordHash || '', createdAt: wsd.createdAt,
          agentCode: wsd.wsdCode, agentType: 'WSD',
          unionId: payload.unionId || 'merchant-3',
          freshMilkTier: wsd.hasFreshMilkAccess ? 'WSD' : null, productTier: 'WSD',
          pricingRole: 'WHOLESALE_DEALER', phone: wsd.mobileNumber, wsdCategory: wsd.wsdCategory,
        } as any;
        next();
      }).catch(() => fallback());
    } else {
      storage.getAgent(agentId).then(agent => {
        if (!agent) return fallback();
        req.user = {
          id: agent.id, name: agent.name, email: agent.email || '', role: 'agent',
          passwordHash: agent.passwordHash || '', createdAt: agent.createdAt,
          agentCode: agent.agentCode, agentType: agent.agentType,
          unionId: agent.assignedUnionId, freshMilkTier: agent.freshMilkTier,
          productTier: agent.productTier, phone: agent.phone,
        } as any;
        next();
      }).catch(() => fallback());
    }
  };

  const resolveStaffPayload = (payload: any, fallback: () => void) => {
    db.query.unionStaff.findFirst({
      where: eq(unionStaff.id, payload.staffId)
    }).then(staff => {
      if (!staff) return fallback();
      req.user = {
        id: staff.id, name: staff.name, email: staff.email || '', role: 'union_staff',
        passwordHash: staff.passwordHash || '', createdAt: staff.createdAt,
        phone: staff.phone, unionId: staff.unionId, department: staff.department,
        designation: staff.designation, designationId: staff.designationId,
        accessTier: staff.accessTier, level: staff.level,
        permissions: staff.permissions, assignedSegments: staff.assignedSegments,
        username: staff.username,
      } as any;
      next();
    }).catch(() => fallback());
  };

  tryToken(0);
}

function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role === 'admin') {
      return next();
    }
    
    if (roles.includes(req.user.role)) {
      return next();
    }

    const merchantToken = req.cookies?.merchant_token;
    const authToken = req.cookies?.auth_token;
    if (merchantToken && merchantToken !== authToken) {
      const payload = verifyToken(merchantToken);
      const resolveId = payload?.userId || payload?.id;
      if (payload && resolveId) {
        if (payload.role === 'merchant' || payload.role === 'merchant_subuser' || payload.role === 'merchant_staff') {
          storage.getMerchants().then(allMerchants => {
            const merchantId = payload.role === 'merchant_subuser' ? payload.parentId : (payload.id || resolveId);
            const merchant = allMerchants.find((m: any) => m.id === merchantId);
            if (merchant) {
              const isAdmin = merchant.role === 'admin' || merchant.id === 'admin-1' || (merchant as any).isAdmin;
              if (isAdmin || roles.includes('merchant') || roles.includes(merchant.role)) {
                const isGlobalAdmin = merchant.id === 'admin-1';
                req.user = {
                  id: payload.id || merchant.id,
                  name: payload.name || merchant.restaurantName || merchant.contactName,
                  email: payload.email || merchant.contactEmail,
                  role: isAdmin ? 'admin' : 'merchant',
                  passwordHash: '',
                  createdAt: new Date(),
                  phone: merchant.contactPhone,
                  merchantId: isGlobalAdmin ? null : merchantId,
                  isGlobalAdmin,
                } as any;
                return next();
              }
            }
            return res.status(403).json({ error: 'Insufficient permissions' });
          }).catch(() => {
            return res.status(403).json({ error: 'Insufficient permissions' });
          });
          return;
        }
        storage.getUser(resolveId).then(user => {
          if (user && (user.role === 'admin' || roles.includes(user.role))) {
            req.user = user;
            return next();
          }
          return res.status(403).json({ error: 'Insufficient permissions' });
        }).catch(() => {
          return res.status(403).json({ error: 'Insufficient permissions' });
        });
        return;
      }
    }

    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

function getUnionScope(req: AuthenticatedRequest): { isGlobalAdmin: boolean; merchantId: string | null; allIds: string[] } {
  const user = req.user as any;
  if (!user) return { isGlobalAdmin: false, merchantId: null, allIds: [] };
  if (user.isGlobalAdmin === true || user.id === 'admin-1') {
    return { isGlobalAdmin: true, merchantId: null, allIds: [] };
  }
  const mid = user.merchantId || null;
  if (!mid) {
    if (user.role === 'admin' && user.email === 'aavincart@gmail.com') {
      return { isGlobalAdmin: true, merchantId: null, allIds: [] };
    }
    return { isGlobalAdmin: false, merchantId: null, allIds: [] };
  }
  return { isGlobalAdmin: false, merchantId: mid, allIds: [] };
}

async function logActivity(eventType: string, data: { userId?: string; userName?: string; userRole?: string; userEmail?: string; userPhone?: string; metadata?: any; ipAddress?: string }) {
  try {
    await db.insert(userActivityLogs).values({
      eventType,
      userId: data.userId || null,
      userName: data.userName || null,
      userRole: data.userRole || null,
      userEmail: data.userEmail || null,
      userPhone: data.userPhone || null,
      metadata: data.metadata || null,
      ipAddress: data.ipAddress || null,
    });
  } catch (e) {
    console.error('Activity log error:', e);
  }
}

export { requireAuth, requireRole, getUnionScope, logActivity, signToken, verifyToken, hashPassword, verifyPassword };
export type { AuthenticatedRequest };
