import type { PlatformAdmin } from "@prisma/client";
import type { HostingAccountWithRelations } from "../services/panel-auth.service.js";

declare global {
  namespace Express {
    interface Request {
      admin?: PlatformAdmin;
      panelAccount?: HostingAccountWithRelations;
    }
  }
}

export {};
