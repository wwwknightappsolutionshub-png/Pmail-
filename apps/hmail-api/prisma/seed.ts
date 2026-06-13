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

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    create: {
      slug: "demo",
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
    },
    update: {
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
    },
    include: { branding: true, mail: true },
  });

  await seedAddonCatalog();
  await seedImmigrationTemplates();
  await seedPlatformAdmin();
  await seedSiteSections();
  await seedHostingPlans();
  await seedAddonMarketing();

  const businessPlan = await prisma.hostingPlan.findFirst({ where: { slug: "business" } });
  await seedDemoHostingAccount(tenant.id, businessPlan?.id);
  await seedDemoVps(tenant.id);

  console.log("Seeded tenant:", tenant.slug);
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
