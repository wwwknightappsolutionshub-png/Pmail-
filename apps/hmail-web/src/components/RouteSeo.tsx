import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { applyPageSeo } from "../lib/seo";
import { resolvePmailSeo } from "../lib/seoConfig";

export function RouteSeo() {
  const { pathname } = useLocation();
  const { tenantSlug } = useParams<{ tenantSlug?: string }>();

  useEffect(() => {
    const config = resolvePmailSeo(pathname, tenantSlug);
    applyPageSeo(config);
  }, [pathname, tenantSlug]);

  return null;
}
