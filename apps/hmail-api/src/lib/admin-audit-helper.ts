import type { Request } from "express";
import { getEnv } from "../config/env.js";
import { logAdminAction } from "../services/admin-audit.service.js";

export async function auditAdminMutation(
  req: Request,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const env = getEnv();
  if (!env.AUDIT_ADMIN_ACTIONS || !req.admin) return;

  await logAdminAction({
    adminId: req.admin.id,
    action,
    entityType,
    entityId,
    metadata,
    ipAddress: req.ip,
  });
}
