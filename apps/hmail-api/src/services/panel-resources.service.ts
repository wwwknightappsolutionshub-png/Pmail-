import type { HostingAccount } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const DEFAULT_DIRS = ["public_html", "mail", "logs", "backups"] as const;

export async function ensurePanelDefaults(account: HostingAccount): Promise<void> {
  const fileCount = await prisma.panelFileEntry.count({ where: { accountId: account.id } });
  if (fileCount === 0) {
    await prisma.panelFileEntry.createMany({
      data: [
        ...DEFAULT_DIRS.map((name) => ({
          accountId: account.id,
          parentPath: "/",
          name,
          type: "dir",
        })),
        {
          accountId: account.id,
          parentPath: "/",
          name: ".htaccess",
          type: "file",
          size: 412,
          content: "# Prohost Cloud\n",
        },
      ],
    });
  }

  const dbCount = await prisma.panelDatabase.count({ where: { accountId: account.id } });
  if (dbCount === 0 && account.databases > 0) {
    await prisma.panelDatabase.createMany({
      data: Array.from({ length: account.databases }, (_, i) => ({
        accountId: account.id,
        name: `${account.username}_db${i + 1}`,
        sizeMb: 12 + i * 4,
      })),
    });
  }

  const domainCount = await prisma.panelAddonDomain.count({ where: { accountId: account.id } });
  if (domainCount === 0) {
    await prisma.panelAddonDomain.create({
      data: {
        accountId: account.id,
        domain: account.domain,
        documentRoot: `${account.homePath}/public_html`,
        ssl: true,
        isPrimary: true,
      },
    });
  }

  const mailboxCount = await prisma.panelMailbox.count({ where: { accountId: account.id } });
  if (mailboxCount === 0) {
    await prisma.panelMailbox.createMany({
      data: [
        {
          accountId: account.id,
          address: `${account.username}@${account.domain}`,
          quotaMb: 1024,
          usedMb: 240,
        },
        {
          accountId: account.id,
          address: `support@${account.domain}`,
          quotaMb: 512,
          usedMb: 88,
        },
      ],
    });
  }
}

export async function listPanelFiles(accountId: string, parentPath = "/") {
  const rows = await prisma.panelFileEntry.findMany({
    where: { accountId, parentPath },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    size: row.size,
    parentPath: row.parentPath,
  }));
}

export async function createPanelFile(
  accountId: string,
  input: { parentPath: string; name: string; type: "dir" | "file"; content?: string },
) {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");
  const row = await prisma.panelFileEntry.create({
    data: {
      accountId,
      parentPath: input.parentPath || "/",
      name,
      type: input.type,
      size: input.type === "file" ? (input.content?.length ?? 0) : null,
      content: input.type === "file" ? input.content ?? "" : null,
    },
  });
  return row;
}

export async function upsertPanelFile(
  accountId: string,
  input: { parentPath: string; name: string; type: "dir" | "file"; content?: string },
) {
  const parentPath = input.parentPath || "/";
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const existing = await prisma.panelFileEntry.findFirst({
    where: { accountId, parentPath, name },
  });

  if (existing) {
    if (input.type === "dir" && existing.type === "dir") return existing;
    return prisma.panelFileEntry.update({
      where: { id: existing.id },
      data: {
        type: input.type,
        size: input.type === "file" ? (input.content?.length ?? 0) : null,
        content: input.type === "file" ? input.content ?? "" : existing.content,
      },
    });
  }

  return createPanelFile(accountId, input);
}

export async function deletePanelFile(accountId: string, id: string) {
  const row = await prisma.panelFileEntry.findFirst({ where: { id, accountId } });
  if (!row) throw new Error("File not found");
  if (DEFAULT_DIRS.includes(row.name as (typeof DEFAULT_DIRS)[number]) && row.parentPath === "/") {
    throw new Error("Cannot delete system directory");
  }
  await prisma.panelFileEntry.delete({ where: { id } });
}

export async function listPanelDatabases(accountId: string) {
  return prisma.panelDatabase.findMany({ where: { accountId }, orderBy: { name: "asc" } });
}

export async function createPanelDatabase(accountId: string, name: string) {
  const clean = name.trim();
  if (!clean) throw new Error("Database name is required");
  return prisma.panelDatabase.create({ data: { accountId, name: clean } });
}

export async function deletePanelDatabase(accountId: string, id: string) {
  const row = await prisma.panelDatabase.findFirst({ where: { id, accountId } });
  if (!row) throw new Error("Database not found");
  await prisma.panelDatabase.delete({ where: { id } });
}

export async function listPanelDomains(accountId: string) {
  const rows = await prisma.panelAddonDomain.findMany({ where: { accountId }, orderBy: { domain: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    domain: row.domain,
    documentRoot: row.documentRoot,
    ssl: row.ssl,
    primary: row.isPrimary,
  }));
}

export async function createPanelDomain(
  accountId: string,
  account: HostingAccount,
  domain: string,
) {
  const clean = domain.trim().toLowerCase();
  if (!clean) throw new Error("Domain is required");
  return prisma.panelAddonDomain.create({
    data: {
      accountId,
      domain: clean,
      documentRoot: `${account.homePath}/public_html/${clean}`,
      ssl: false,
      isPrimary: false,
    },
  });
}

export async function listPanelMailboxes(accountId: string) {
  return prisma.panelMailbox.findMany({ where: { accountId }, orderBy: { address: "asc" } });
}

export async function createPanelMailbox(accountId: string, address: string, quotaMb = 512) {
  const clean = address.trim().toLowerCase();
  if (!clean.includes("@")) throw new Error("Valid email address required");
  return prisma.panelMailbox.create({ data: { accountId, address: clean, quotaMb } });
}

export async function deletePanelMailbox(accountId: string, id: string) {
  const row = await prisma.panelMailbox.findFirst({ where: { id, accountId } });
  if (!row) throw new Error("Mailbox not found");
  await prisma.panelMailbox.delete({ where: { id } });
}
