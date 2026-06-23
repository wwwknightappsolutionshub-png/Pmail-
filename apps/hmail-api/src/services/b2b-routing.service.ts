import { prisma } from "../lib/prisma.js";

function slugifyDomain(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9.-]/g, "").replace(/\./g, "-");
}

export async function provisionB2bRouting(workspaceId: string, tenantId: string): Promise<void> {
  const workspace = await prisma.b2bWorkspace.findFirst({
    where: { id: workspaceId, tenantId },
  });
  if (!workspace) throw new Error("Workspace not found");
  if (workspace.routingStatus === "active" && workspace.routingMailbox) return;

  const domain = workspace.routingDomain?.trim() || workspace.clientDomain?.trim();
  if (!domain) {
    await prisma.b2bWorkspace.update({
      where: { id: workspaceId },
      data: { routingStatus: "pending" },
    });
    return;
  }

  const slug = slugifyDomain(domain);
  const routingMailbox = `clients+${slug}@mail.prohost.cloud`;

  await prisma.b2bWorkspace.update({
    where: { id: workspaceId },
    data: {
      routingStatus: "active",
      routingMailbox,
      routingActivatedAt: new Date(),
    },
  });
}
