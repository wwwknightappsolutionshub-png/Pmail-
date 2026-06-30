import { buildCanonicalUrl, getPmailSiteOrigin, type PageSeoConfig } from "./seo";

const PMAIL = "PMail+";
const PROHOST = "Prohost Cloud";

const APP_NOINDEX: PageSeoConfig = {
  title: `${PMAIL} — Secure Cloud Mail Workspace`,
  description:
    "Sign in to your PMail+ branded mail workspace — inbox, workspace tools, and industry add-ons powered by Prohost Cloud.",
  keywords:
    "PMail+, branded business email, secure cloud mail, webmail workspace, Prohost Cloud mail, professional email inbox",
  robots: "noindex, nofollow",
};

export function resolvePmailSeo(pathname: string, tenantSlug?: string): PageSeoConfig {
  const origin = getPmailSiteOrigin();

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const slugSuffix = tenantSlug && tenantSlug !== "default" ? ` — ${tenantSlug}` : "";
    return {
      title: `Sign in to ${PMAIL}${slugSuffix} | ${PROHOST}`,
      description:
        "Secure cloud mail sign-in for PMail+ — branded business email with workspace tools, open tracking, file vault, and industry vertical add-ons.",
      keywords:
        "PMail+ login, branded mail sign in, secure webmail, business email login, Prohost Cloud mail",
      canonicalPath: pathname,
      robots: "noindex, nofollow",
      ogImagePath: "/og-pmail.png",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: PMAIL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Secure cloud mail and workspace tools powered by Prohost Cloud.",
        url: buildCanonicalUrl(origin, "/login"),
        provider: { "@type": "Organization", name: PROHOST },
      },
    };
  }

  if (pathname === "/welcome" || pathname.startsWith("/welcome/")) {
    return {
      title: `Welcome to ${PMAIL} | Get Started`,
      description:
        "Onboarding for PMail+ — set up your branded mail workspace, explore platform tools, and activate industry add-ons.",
      keywords: "PMail+ onboarding, branded mail setup, workspace mail welcome, Prohost Cloud PMail",
      canonicalPath: pathname,
      robots: "noindex, nofollow",
      ogImagePath: "/og-pmail.png",
    };
  }

  return {
    ...APP_NOINDEX,
    canonicalPath: pathname,
    ogImagePath: "/pwa-512.png",
  };
}
