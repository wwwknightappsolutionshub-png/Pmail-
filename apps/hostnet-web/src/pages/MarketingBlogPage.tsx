import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { PlatformMarketingArticle } from "../types/site";
import "./MarketingCatalogPage.css";
import "./LandingPage.css";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function MarketingBlogPage() {
  const [articles, setArticles] = useState<PlatformMarketingArticle[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .publicArticles()
      .then((res) => setArticles(res.articles))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="landing marketing-catalog-page">
      <MarketingHeader />
      <main className="container marketing-catalog-main">
        <p className="marketing-catalog-eyebrow">Resources</p>
        <h1 className="landing-section-title">Guides for hosting, PMail+, and growth</h1>
        <p className="muted marketing-catalog-lead">
          Practical articles on enterprise hosting, branded mail, and workspace add-ons from the Prohost Cloud team.
        </p>
        {error ? <p className="error-banner">{error}</p> : null}
        <div className="marketing-catalog-grid">
          {articles.map((article) => (
            <article key={article.id} className="marketing-catalog-card">
              <h2>{article.title}</h2>
              {article.excerpt ? <p className="muted">{article.excerpt}</p> : null}
              {article.publishedAt ? (
                <p className="marketing-blog-date muted">{formatDate(article.publishedAt)}</p>
              ) : null}
              <Link to={`/blog/${article.slug}`} className="btn btn-primary">
                Read article
              </Link>
            </article>
          ))}
        </div>
        {!error && articles.length === 0 ? (
          <p className="muted">New guides are on the way. Check back soon.</p>
        ) : null}
      </main>
      <MarketingFooter />
    </div>
  );
}
