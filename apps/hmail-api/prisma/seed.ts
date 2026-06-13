import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedImmigrationTemplates } from "../src/services/templates.service.js";
import { seedPlatformAdmin } from "../src/services/admin-auth.service.js";
import { seedSiteSections } from "../src/services/cms.service.js";
import { seedHostingPlans } from "../src/services/hosting-plans.service.js";
import { seedAddonMarketing } from "../src/services/addon-marketing.service.js";
import { seedDemoHostingAccount } from "../src/services/hosting-accounts.service.js";
import { seedDemoVps } from "../src/services/vps.service.js";

resolveDatabaseUrl();

const prisma = new PrismaClient();

const prohostTenantData = {
  name: "Prohost Cloud",
  branding: {
    create: {
      productName: "PMail+",
      primaryColor: "#0d4f6c",
      accentColor: "#0d9488",
      backgroundColor: "#0f2744",
      loginTagline: "Secure cloud mail powered by Prohost Cloud",
    },
  },
  mail: {
    create: {
      imapHost: "imap.hostinger.com",
      imapPort: 993,
      imapSecure: true,
      smtpHost: "smtp.hostinger.com",
      smtpPort: 465,
      smtpSecure: true,
    },
  },
};

const prohostTenantUpdate = {
  name: "Prohost Cloud",
  branding: {
    upsert: {
      create: {
        productName: "PMail+",
        primaryColor: "#0d4f6c",
        accentColor: "#0d9488",
        backgroundColor: "#0f2744",
        loginTagline: "Secure cloud mail powered by Prohost Cloud",
      },
      update: {
        productName: "PMail+",
        loginTagline: "Secure cloud mail powered by Prohost Cloud",
      },
    },
  },
};

async function seedTenant(slug: string) {
  return prisma.tenant.upsert({
    where: { slug },
    create: { slug, ...prohostTenantData },
    update: prohostTenantUpdate,
    include: { branding: true, mail: true },
  });
}

async function main() {
  const prohost = await seedTenant("prohost");
  const demo = await seedTenant("demo");

  await seedAddonCatalog();
  await seedImmigrationTemplates();
  await seedPlatformAdmin();
  await seedSiteSections();
  await seedHostingPlans();
  await seedAddonMarketing();

  const businessPlan = await prisma.hostingPlan.findFirst({ where: { slug: "business" } });
  await seedDemoHostingAccount(demo.id, businessPlan?.id);
  await seedDemoVps(demo.id);

  console.log("Seeded tenants:", prohost.slug, demo.slug);
  console.log("PMail+ login URL: /login (tenant: prohost)");
  console.log("Seeded add-on catalog, landing CMS, platform admin, demo VPS, and demo panel account (demo@hostnet.local / panel123)");
  console.log("Platform admins: admin@hostnet.local / changeme123 (super_admin), ops@hostnet.local / ops-admin-pass12 (admin, dev only)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
