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
  });

  it("rejects tester login with wrong password", async () => {
    const res = await request(app).post("/api/auth/tester/login").send({
      email: "pmailtester@gmail.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
  });
});
