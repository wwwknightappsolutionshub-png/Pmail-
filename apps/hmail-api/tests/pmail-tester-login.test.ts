import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { resetTestDatabase } from "./helpers.js";

describe("PMail+ tester login", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("GET login-preflight skips provider setup for tester tenant", async () => {
    const res = await request(app).get("/api/auth/login-preflight").query({
      tenantSlug: "pmail-tester",
      email: "pmailtester@gmail.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.needsProviderSetup).toBe(false);
    expect(res.body.testerBypass).toBe(true);
  });

  it("POST /api/auth/tester/login signs in without IMAP verification", async () => {
    const res = await request(app).post("/api/auth/tester/login").send({
      email: "pmailtester@gmail.com",
      password: "mailtester1234",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("pmailtester@gmail.com");
    expect(res.body.user.tenant.slug).toBe("pmail-tester");
    expect(res.body.user.businessVertical).toBe("accounting");
  });

  it("seeds accounting workspace data and addon trials for tester login", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/tester/login").send({
      email: "pmailtester@gmail.com",
      password: "mailtester1234",
    });
    expect(login.status).toBe(200);

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toEqual(
      expect.arrayContaining([
        "ac-document-intake",
        "ac-filing-calendar",
        "ac-secure-exchange",
        "ac-client-entities",
      ]),
    );

    const entities = await agent.get("/api/features/accounting/client-entities");
    expect(entities.status).toBe(200);
    expect(entities.body.clientEntities.length).toBeGreaterThan(0);

    const requests = await agent.get("/api/features/accounting/document-requests");
    expect(requests.status).toBe(200);
    expect(requests.body.documentRequests.length).toBeGreaterThan(0);
  });

  it("rejects tester login with wrong password", async () => {
    const res = await request(app).post("/api/auth/tester/login").send({
      email: "pmailtester@gmail.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
  });
});
