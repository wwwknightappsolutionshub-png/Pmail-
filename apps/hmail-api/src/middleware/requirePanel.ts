import type { NextFunction, Request, Response } from "express";
import { getPanelContext } from "../services/panel-auth.service.js";

export async function requirePanel(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await getPanelContext(req);
    if (!account) {
      res.status(401).json({ error: "Panel authentication required" });
      return;
    }
    req.panelAccount = account;
    next();
  } catch (err) {
    next(err);
  }
}
