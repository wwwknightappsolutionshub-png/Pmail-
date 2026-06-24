import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { processDueScheduledMessages } from "../src/services/scheduled.service.js";
import { createAuthenticatedAgent, resetTestDatabase, testPrisma } from "./helpers.js";

vi.mock("../src/services/imap.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/imap.service.js")>();
  return {
    ...actual,
    verifyImapLogin: vi.fn(async () => undefined),
    appendToSentFolder: vi.fn(async () => "Sent"),
  };
});

vi.mock("../src/services/smtp.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/services/smtp.service.js")>();
  return {
    ...actual,
    verifySmtpLogin: vi.fn(async () => undefined),
    sendMail: vi.fn(async () => ({ messageId: "<undo-send-test@mock>" })),
  };
});

async function setUndoSendSeconds(userId: string, seconds: number) {
  await testPrisma.userComposeSettings.upsert({
    where: { userId },
    create: { userId, undoSendSeconds: seconds },
    update: { undoSendSeconds: seconds },
  });
}

describe("undo send", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("POST /api/mail/send/:pendingId/undo requires auth", async () => {
    const res = await request(app).post("/api/mail/send/pending-id/undo");
    expect(res.status).toBe(401);
  });

  it("POST /api/mail/send sends immediately while undo send is disabled", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    await setUndoSendSeconds(user.id, 10);

    const res = await agent.post("/api/mail/send").send({
      to: "client@example.com",
      subject: "Immediate while disabled",
      text: "Body text",
    });

    expect(res.status).toBe(201);
    expect(res.body.messageId).toBeTruthy();
    expect(res.body.queued).toBeUndefined();

    const rows = await testPrisma.scheduledMessage.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("POST /api/mail/send/:pendingId/undo cancels a legacy pending send", async () => {
    const { agent, user, tenant } = await createAuthenticatedAgent(app);

    const row = await testPrisma.scheduledMessage.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        to: "client@example.com",
        subject: "Cancel me",
        text: "Body text",
        scheduledFor: new Date(Date.now() + 60_000),
        status: "pending",
        sendKind: "undo_send",
        payloadJson: JSON.stringify({
          to: "client@example.com",
          subject: "Cancel me",
          text: "Body text",
        }),
      },
    });

    const undo = await agent.post(`/api/mail/send/${row.id}/undo`);
    expect(undo.status).toBe(200);
    expect(undo.body.cancelled).toBe(true);

    const updated = await testPrisma.scheduledMessage.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("cancelled");
  });

  it("POST /api/mail/send sends immediately when undoSendSeconds is 0", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    await setUndoSendSeconds(user.id, 0);

    const res = await agent.post("/api/mail/send").send({
      to: "client@example.com",
      subject: "Immediate",
      text: "Body text",
    });

    expect(res.status).toBe(201);
    expect(res.body.messageId).toBeTruthy();
    expect(res.body.queued).toBeUndefined();

    const rows = await testPrisma.scheduledMessage.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("processDueScheduledMessages sends queued undo_send rows", async () => {
    const { user, tenant } = await createAuthenticatedAgent(app);
    await setUndoSendSeconds(user.id, 5);

    const row = await testPrisma.scheduledMessage.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        to: "due@example.com",
        subject: "Due now",
        text: "Send me",
        scheduledFor: new Date(Date.now() - 1_000),
        status: "pending",
        sendKind: "undo_send",
        payloadJson: JSON.stringify({
          to: "due@example.com",
          subject: "Due now",
          text: "Send me",
        }),
      },
    });

    await processDueScheduledMessages();

    const updated = await testPrisma.scheduledMessage.findUnique({ where: { id: row.id } });
    expect(updated?.status).toBe("sent");
  });
});
