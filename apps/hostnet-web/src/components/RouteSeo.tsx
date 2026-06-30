import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { applyPageSeo } from "../lib/seo";
import { resolveMarketingSeo } from "../lib/seoConfig";

export function RouteSeo() {
  const { pathname } = useLocation();
  const { useCaseId } = useParams<{ useCaseId?: string }>();

  useEffect(() => {
    const config = resolveMarketingSeo(pathname, useCaseId);
    applyPageSeo(config);
  }, [pathname, useCaseId]);

  return null;
}
