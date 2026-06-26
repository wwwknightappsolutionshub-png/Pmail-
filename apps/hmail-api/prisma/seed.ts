import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedImmigrationTemplates } from "../src/services/templates.service.js";
import { seedRealEstateTemplates } from "../src/services/real-estate-templates.service.js";
import { seedAccountingTemplates } from "../src/services/accounting-templates.service.js";
import { seedRecruitmentTemplates } from "../src/services/recruitment-templates.service.js";
import { seedB2bTemplates } from "../src/services/b2b-templates.service.js";
import { seedHealthcareTemplates } from "../src/services/healthcare-templates.service.js";
import { seedPlatformAdmin } from "../src/services/admin-auth.service.js";
import { seedSiteSections } from "../src/services/cms.service.js";
import { seedHostingPlans } from "../src/services/hosting-plans.service.js";
import { seedAddonMarketing } from "../src/services/addon-marketing.service.js";
import { seedDemoHostingAccount } from "../src/services/hosting-accounts.service.js";
import { seedDemoVps } from "../src/services/vps.service.js";
import { seedEmailTemplates } from "../src/services/email-template.service.js";
import { seedPublicFormDefinitions } from "../src/services/form-definition.service.js";
import { seedTestimonials } from "../src/services/testimonial.service.js";
import { ensurePmailPlatformConfig } from "../src/services/pmail-platform-config.service.js";

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
      mailOnboardingComplete: true,
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

async function seedPmailTesterTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "pmail-tester" },
    create: {
      slug: "pmail-tester",
      name: "PMail+ Tester Tenant",
      branding: {
        create: {
          productName: "PMail+",
          primaryColor: "#0f172a",
          accentColor: "#14b8a6",
          backgroundColor: "#f8fafc",
          loginTagline: "Local PMail+ tester — accounting workspace",
          industryProfile: "accounting",
        },
      },
      mail: {
        create: {
          imapHost: "local.pmail.test",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "local.pmail.test",
          smtpPort: 465,
          smtpSecure: true,
          mailOnboardingComplete: true,
        },
      },
    },
    update: {
      name: "PMail+ Tester Tenant",
      branding: {
        upsert: {
          create: {
            productName: "PMail+",
            primaryColor: "#0f172a",
            accentColor: "#14b8a6",
            backgroundColor: "#f8fafc",
            loginTagline: "Local PMail+ tester — accounting workspace",
            industryProfile: "accounting",
          },
          update: {
            productName: "PMail+",
            loginTagline: "Local PMail+ tester — accounting workspace",
            industryProfile: "accounting",
          },
        },
      },
    },
    include: { branding: true, mail: true },
  });

  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "pmailtester@gmail.com" } },
    create: {
      tenantId: tenant.id,
      email: "pmailtester@gmail.com",
      displayName: "PMail Tester",
      businessVertical: "accounting",
      uiThemeVersion: "dark",
      mailConfig: {
        create: {
          providerPreset: "custom",
          imapHost: "local.pmail.test",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "local.pmail.test",
          smtpPort: 465,
          smtpSecure: true,
        },
      },
    },
    update: {
      displayName: "PMail Tester",
      businessVertical: "accounting",
      isActive: true,
    },
  });

  const { resetPmailTesterCareerState, ensurePmailTesterAccountingWorkspace } = await import(
    "../src/services/pmail-tester-seed.service.js"
  );
  const { ensurePmailTesterPanelWorkspaceTrial } = await import("../src/services/panel-workspace-trial.service.js");
  await ensurePmailTesterPanelWorkspaceTrial(user.id);
  await resetPmailTesterCareerState(user.id);
  await ensurePmailTesterAccountingWorkspace(tenant.id, user.id);

  return { tenant, user };
}

async function main() {
  const prohost = await seedTenant("prohost");
  const demo = await seedTenant("demo");

  await seedAddonCatalog();
  await seedImmigrationTemplates();
  await seedRealEstateTemplates();
  await seedAccountingTemplates();
  await seedRecruitmentTemplates();
  await seedB2bTemplates();
  await seedHealthcareTemplates();
  await seedPlatformAdmin();
  await seedSiteSections();
  await seedPublicFormDefinitions();
  await seedEmailTemplates();
  await seedHostingPlans();
  await seedAddonMarketing();
  await seedTestimonials();
  await ensurePmailPlatformConfig();
  const tester = await seedPmailTesterTenant();

  const businessPlan = await prisma.hostingPlan.findFirst({ where: { slug: "business" } });
  await seedDemoHostingAccount(demo.id, businessPlan?.id);
  await seedDemoVps(demo.id);

  console.log("Seeded tenants:", prohost.slug, demo.slug, tester.tenant.slug);
  console.log("PMail+ login URL: /login (tenant: prohost)");
  console.log("Seeded add-on catalog, landing CMS, platform admin, demo VPS, and demo panel account (demo@hostnet.local / panel123)");
  console.log("Platform admins: admin@hostnet.local / changeme123 (super_admin), ops@hostnet.local / ops-admin-pass12 (admin, dev only)");
  console.log("PMail+ tester: tenant pmail-tester, pmailtester@gmail.com / mailtester1234 (Accounting workspace)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
