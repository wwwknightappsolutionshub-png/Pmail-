import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { applyPageSeo } from "../lib/seo";
import { resolveMarketingSeo } from "../lib/seoConfig";

export function RouteSeo() {
  const { pathname } = useLocation();
  const { useCaseId, slug } = useParams<{
    useCaseId?: string;
    slug?: string;
  }>();

  useEffect(() => {
    const planSlug = pathname.startsWith("/hosting/") ? slug : undefined;
    const addonSlug = pathname.startsWith("/addons/") ? slug : undefined;
    const articleSlug = pathname.startsWith("/blog/") ? slug : undefined;
    const config = resolveMarketingSeo(pathname, { useCaseId, planSlug, addonSlug, articleSlug });
    applyPageSeo(config);
  }, [pathname, useCaseId, slug]);

  return null;
}
