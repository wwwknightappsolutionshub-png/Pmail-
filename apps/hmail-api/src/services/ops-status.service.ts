import { getReadiness } from "./health.service.js";
import { getBillingLifecycleSummary } from "./billing-lifecycle.service.js";
import { prisma } from "../lib/prisma.js";
import { getEnv, isPaymentMockMode, getEnabledPaymentProviders } from "../config/env.js";

export async function getAdminSystemStatus() {
  const readiness = await getReadiness();
  const billing = await getBillingLifecycleSummary();
  const env = getEnv();

  const [tenantCount, leadCount, checkoutCount, webhookCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.marketingLead.count(),
    prisma.paymentCheckout.count({ where: { status: "completed" } }),
    prisma.paymentWebhookEvent.count(),
  ]);

  return {
    readiness,
    billing,
    counts: {
      tenants: tenantCount,
      leads: leadCount,
      completedCheckouts: checkoutCount,
      webhookEvents: webhookCount,
    },
    payments: {
      mockMode: isPaymentMockMode(),
      providers: getEnabledPaymentProviders(),
    },
    config: {
      nodeEnv: env.NODE_ENV,
      cookieSecure: env.COOKIE_SECURE,
      auditAdminActions: env.AUDIT_ADMIN_ACTIONS,
      publicApiUrl: env.PUBLIC_API_URL ?? null,
    },
  };
}
