import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { randomUUID } from "node:crypto";
import { hashToken } from "../src/lib/crypto.js";
import { encryptSecret } from "../src/lib/crypto.js";
import { createAdminAgent, createAuthenticatedAgent, resetTestDatabase, testPrisma } from "./helpers.js";

const app = createApp();

describe("PMail+ user presence and admin directory", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("tracks session presence on authenticated requests and heartbeat", async () => {
    const { agent, user, token } = await createAuthenticatedAgent(app);

    const heartbeat = await agent.post("/api/auth/presence/heartbeat");
    expect(heartbeat.status).toBe(200);
    expect(heartbeat.body.ok).toBe(true);
    expect(heartbeat.body.lastActiveAt).toBeTruthy();

    const session = await testPrisma.session.findFirst({ where: { userId: user.id } });
    expect(session?.lastActiveAt).toBeTruthy();

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);

    const updated = await testPrisma.session.findFirst({ where: { tokenHash: hashToken(token) } });
    expect(updated?.lastActiveAt).toBeTruthy();
  });

  it("removes session presence on logout", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    const logout = await agent.post("/api/auth/logout");
    expect(logout.status).toBe(200);

    const sessions = await testPrisma.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(0);
  });

  it("lists global mail users with last login and online status for admins", async () => {
    const tenant = await testPrisma.tenant.create({
      data: {
        slug: "presence-co",
        name: "Presence Co",
        branding: { create: {} },
        mail: { create: {} },
      },
    });
    const user = await testPrisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "online@presence.local",
        displayName: "Online User",
        lastLoginAt: new Date(),
      },
    });
    const idleUser = await testPrisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "idle@presence.local",
        displayName: "Idle User",
        lastLoginAt: new Date(Date.now() - 86_400_000),
      },
    });

    await testPrisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(randomUUID()),
        encryptedMailPassword: encryptSecret("mail-pass"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastActiveAt: new Date(),
      },
    });
    await testPrisma.session.create({
      data: {
        userId: idleUser.id,
        tokenHash: hashToken(randomUUID()),
        encryptedMailPassword: encryptSecret("mail-pass"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastActiveAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });

    const { agent } = await createAdminAgent(app);

    const list = await agent.get("/api/admin/mail-users");
    expect(list.status).toBe(200);
    expect(list.body.users.length).toBeGreaterThanOrEqual(2);

    const onlineRow = list.body.users.find((row: { email: string }) => row.email === "online@presence.local");
    const idleRow = list.body.users.find((row: { email: string }) => row.email === "idle@presence.local");
    expect(onlineRow.presence.isOnline).toBe(true);
    expect(onlineRow.lastLoginAt).toBeTruthy();
    expect(idleRow.presence.isOnline).toBe(false);

    const online = await agent.get("/api/admin/mail-users/online");
    expect(online.status).toBe(200);
    expect(online.body.users.some((row: { email: string }) => row.email === "online@presence.local")).toBe(true);
    expect(online.body.users.some((row: { email: string }) => row.email === "idle@presence.local")).toBe(false);

    const stats = await agent.get("/api/admin/mail-users/presence");
    expect(stats.status).toBe(200);
    expect(stats.body.stats.onlineNow).toBeGreaterThanOrEqual(1);
    expect(stats.body.stats.activeSessions).toBeGreaterThanOrEqual(1);

    const sessions = await agent.get(`/api/admin/mail-users/${user.id}/sessions`);
    expect(sessions.status).toBe(200);
    expect(sessions.body.sessions.length).toBe(1);

    const poll = await agent.get("/api/admin/poll");
    expect(poll.status).toBe(200);
    expect(poll.body.presence.onlineNow).toBeGreaterThanOrEqual(1);

    const dashboard = await agent.get("/api/admin/dashboard");
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.dashboard.summary.mailUsers.onlineNow).toBeGreaterThanOrEqual(1);
  });

  it("super admin can revoke all PMail+ sessions and bump client refresh", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);

    const { agent: adminAgent } = await createAdminAgent(app);
    const revoke = await adminAgent.post("/api/admin/mail-users/sessions/revoke-all");
    expect(revoke.status).toBe(200);
    expect(revoke.body.deletedSessions).toBeGreaterThanOrEqual(1);
    expect(revoke.body.clientRefreshAt).toBeTruthy();

    const after = await agent.get("/api/auth/me");
    expect(after.status).toBe(401);

    const refresh = await request(app).get("/api/public/pmail-client-refresh");
    expect(refresh.status).toBe(200);
    expect(refresh.body.refreshAt).toBeTruthy();
  });

  it("includes presence in tenant ops user list", async () => {
    const tenant = await testPrisma.tenant.create({
      data: {
        slug: "tenant-ops-presence",
        name: "Tenant Ops Presence",
        branding: { create: {} },
        mail: { create: {} },
      },
    });
    const user = await testPrisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "tenantops@presence.local",
        lastLoginAt: new Date(),
      },
    });
    await testPrisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(randomUUID()),
        encryptedMailPassword: encryptSecret("mail-pass"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        lastActiveAt: new Date(),
      },
    });

    const { agent } = await createAdminAgent(app);
    const res = await agent.get(`/api/admin/tenants/${tenant.id}/ops`);
    expect(res.status).toBe(200);
    const row = res.body.ops.users.find((entry: { email: string }) => entry.email === "tenantops@presence.local");
    expect(row.lastLoginAt).toBeTruthy();
    expect(row.presence.isOnline).toBe(true);
    expect(row.presence.activeSessionCount).toBe(1);
  });
});
