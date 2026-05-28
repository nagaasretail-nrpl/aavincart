import { db } from "./db";
import { auditLogs } from "@shared/schema";
import type { Request } from "express";

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  userName?: string;
}

export async function logAudit(
  req: AuthenticatedRequest,
  tableName: string,
  recordId: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  options?: {
    changedFields?: string[];
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
  }
): Promise<void> {
  try {
    const ip = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "";
    await db.insert(auditLogs).values({
      tableName,
      recordId: String(recordId),
      action,
      changedFields: options?.changedFields || null,
      previousValues: options?.previousValues || null,
      newValues: options?.newValues || null,
      changedByUserId: (req as any).userId || null,
      changedByName: (req as any).userName || null,
      changedByRole: (req as any).userRole || null,
      ipAddress: ip,
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}

export function diffObjects(
  oldObj: Record<string, any> | null,
  newObj: Record<string, any> | null
): { changedFields: string[]; previousValues: Record<string, any>; newValues: Record<string, any> } {
  const changedFields: string[] = [];
  const previousValues: Record<string, any> = {};
  const newValues: Record<string, any> = {};

  if (!oldObj && newObj) {
    return { changedFields: Object.keys(newObj), previousValues: {}, newValues: newObj };
  }
  if (oldObj && !newObj) {
    return { changedFields: Object.keys(oldObj), previousValues: oldObj, newValues: {} };
  }
  if (!oldObj || !newObj) return { changedFields: [], previousValues: {}, newValues: {} };

  const skipFields = ["passwordHash", "password", "plainPassword", "updatedAt", "createdAt"];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    if (skipFields.includes(key)) continue;
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changedFields.push(key);
      previousValues[key] = oldObj[key] ?? null;
      newValues[key] = newObj[key] ?? null;
    }
  }

  return { changedFields, previousValues, newValues };
}
