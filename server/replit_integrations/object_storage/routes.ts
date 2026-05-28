import type { Express, Request, Response, NextFunction } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { createHmac, timingSafeEqual } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

interface AuthenticatedRequest extends Request {
  isAuthenticated?: () => boolean;
  user?: {
    id: string;
    username: string;
    role: string;
    merchantId?: string;
  };
  unionStaff?: {
    id: string;
    unionId: string;
    accessLevel: string;
  };
}

function verifyToken(token: string): any | null {
  try {
    const [header, body, signature] = token.split('.');
    const expectedSignature = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    
    if (!timingSafeEqual(Buffer.from(signature, 'base64url'), Buffer.from(expectedSignature, 'base64url'))) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

function requireUploadAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const isUserAuth = req.isAuthenticated?.() && req.user;
  const isUnionStaffAuth = req.unionStaff && req.unionStaff.id;
  
  if (isUserAuth || isUnionStaffAuth) {
    return next();
  }
  
  // Check cookie-based auth tokens (main app uses auth_token, unions use merchant_token)
  const authToken = req.cookies?.auth_token;
  const merchantToken = req.cookies?.merchant_token;
  
  if (authToken) {
    const payload = verifyToken(authToken);
    if (payload && (payload.userId || payload.agentId)) {
      return next();
    }
  }
  
  if (merchantToken) {
    const payload = verifyToken(merchantToken);
    if (payload && (payload.id || payload.role === 'merchant' || payload.role === 'merchant_subuser')) {
      return next();
    }
  }
  
  return res.status(401).json({ error: "Authentication required for uploads" });
}

/**
 * Register object storage routes for file uploads.
 *
 * This provides routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading (requires auth)
 * 2. The client then uploads directly to the presigned URL
 * 3. GET /objects/* - Serve uploaded files publicly
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload (requires authentication).
   * Accepts: auth_token cookie (users/agents) OR merchant_token cookie (unions)
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   */
  app.post("/api/uploads/request-url", requireUploadAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      const userId = req.user?.id || req.unionStaff?.id || 'unknown';
      console.log(`Upload URL generated for user ${userId}: ${name}`);
      
      res.json({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  /**
   * Serve public objects from object storage.
   *
   * GET /public/:filePath(*)
   *
   * This serves files from the public directory of object storage.
   * Files are searched using the PUBLIC_OBJECT_SEARCH_PATHS configuration.
   */
  app.get("/public/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const objectFile = await objectStorageService.searchPublicObject(filePath);
      
      if (!objectFile) {
        return res.status(404).json({ error: "File not found" });
      }
      
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      return res.status(500).json({ error: "Failed to serve file" });
    }
  });
}

