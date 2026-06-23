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

  it("POST /api/mail/send queues message when undoSendSeconds > 0", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    await setUndoSendSeconds(user.id, 10);

    const res = await agent.post("/api/mail/send").send({
      to: "client@example.com",
      subject: "Queued hello",
      text: "Body text",
    });

    expect(res.status).toBe(202);
    expect(res.body.queued).toBe(true);
    expect(res.body.pendingId).toBeTruthy();
    expect(res.body.undoSeconds).toBe(10);
    expect(res.body.subject).toBe("Queued hello");
    expect(res.body.to).toBe("client@example.com");

    const row = await testPrisma.scheduledMessage.findUnique({ where: { id: res.body.pendingId } });
    expect(row?.status).toBe("pending");
    expect(row?.sendKind).toBe("undo_send");
  });

  it("POST /api/mail/send/:pendingId/undo cancels a pending send", async () => {
    const { agent, user } = await createAuthenticatedAgent(app);
    await setUndoSendSeconds(user.id, 10);

    const queued = await agent.post("/api/mail/send").send({
      to: "client@example.com",
      subject: "Cancel me",
      text: "Body text",
    });
    expect(queued.status).toBe(202);

    const undo = await agent.post(`/api/mail/send/${queued.body.pendingId}/undo`);
    expect(undo.status).toBe(200);
    expect(undo.body.cancelled).toBe(true);

    const row = await testPrisma.scheduledMessage.findUnique({ where: { id: queued.body.pendingId } });
    expect(row?.status).toBe("cancelled");
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
