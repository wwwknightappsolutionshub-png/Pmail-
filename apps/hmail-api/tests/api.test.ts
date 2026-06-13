import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";

describe("hostnet-platform-api", () => {
  const app = createApp();

  it("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.product).toBe("hostnet-platform-api");
    expect(res.body.modules).toContain("hmail");
    expect(res.body.modules).toContain("panel");
  });

  it("GET /api/auth/me without session returns 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login validates body", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "bad" });
    expect(res.status).toBe(400);
  });

  it("GET /api/mail/folders without auth returns 401", async () => {
    const res = await request(app).get("/api/mail/folders");
    expect(res.status).toBe(401);
  });
});
