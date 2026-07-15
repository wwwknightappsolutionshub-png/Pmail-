import type { NextFunction, Request, Response } from "express";
import {
  isTenantUiFeatureHidden,
  type TenantUiPolicyKey,
} from "../services/tenant-ui-policy.service.js";

export function blockWhenTenantUiFeatureHidden(policyKey: TenantUiPolicyKey, message: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.auth?.user.tenant.id;
    if (!tenantId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (await isTenantUiFeatureHidden(tenantId, policyKey)) {
      res.status(403).json({ error: message });
      return;
    }

    next();
  };
}
