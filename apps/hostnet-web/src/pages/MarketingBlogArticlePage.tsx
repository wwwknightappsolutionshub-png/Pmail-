import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { applyPageSeo, buildCanonicalUrl, getMarketingSiteOrigin } from "../lib/seo";
import { MarketingFooter } from "../components/MarketingFooter";
import { MarketingHeader } from "../components/MarketingHeader";
import type { PlatformMarketingArticle } from "../types/site";
import "./MarketingCatalogPage.css";
import "./LandingPage.css";

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function buildArticleJsonLd(article: PlatformMarketingArticle, origin: string) {
  const url = buildCanonicalUrl(origin, `/blog/${article.slug}`);
  const blocks: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt || undefined,
      datePublished: article.publishedAt ?? undefined,
      dateModified: article.updatedAt,
      url,
      image: article.ogImageUrl || buildCanonicalUrl(origin, "/og-image.png"),
      author: { "@type": "Organization", name: "Prohost Cloud" },
      publisher: {
        "@type": "Organization",
        name: "Prohost Cloud",
        logo: { "@type": "ImageObject", url: buildCanonicalUrl(origin, "/og-image.png") },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: origin },
        { "@type": "ListItem", position: 2, name: "Resources", item: buildCanonicalUrl(origin, "/blog") },
        { "@type": "ListItem", position: 3, name: article.title, item: url },
      ],
    },
  ];

  if (article.faq.length > 0) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: article.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  return blocks;
}

export function MarketingBlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<PlatformMarketingArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api
      .publicArticle(slug)
      .then((res) => setArticle(res.article))
      .catch((err: Error) => setError(err.message));
  }, [slug]);

  const origin = useMemo(() => getMarketingSiteOrigin(), []);

  useEffect(() => {
    if (!article) return;
    applyPageSeo({
      title: article.metaTitle || `${article.title} | Prohost Cloud Resources`,
      description: article.metaDescription || article.excerpt || article.title,
      canonicalPath: `/blog/${article.slug}`,
      ogType: "article",
      ogImagePath: article.ogImageUrl || "/og-image.png",
      locale: article.locale.replace("-", "_"),
      jsonLd: buildArticleJsonLd(article, origin),
    });
  }, [article, origin]);

  if (error) {
    return (
      <div className="landing marketing-catalog-page">
        <MarketingHeader />
        <main className="container marketing-catalog-main">
          <p className="error-banner">{error}</p>
          <Link to="/blog" className="btn btn-secondary">
            Back to resources
          </Link>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="landing marketing-catalog-page">
        <MarketingHeader />
        <main className="container marketing-catalog-main">
          <p className="muted">Loading article…</p>
        </main>
        <MarketingFooter />
      </div>
    );
  }

  return (
    <div className="landing marketing-catalog-page">
      <MarketingHeader />
      <main className="container marketing-catalog-main marketing-blog-article">
        <p className="marketing-catalog-eyebrow">
          <Link to="/blog">Resources</Link>
        </p>
        <h1 className="landing-section-title">{article.title}</h1>
        {article.publishedAt ? <p className="muted marketing-blog-date">{formatDate(article.publishedAt)}</p> : null}
        {article.excerpt ? <p className="marketing-catalog-lead">{article.excerpt}</p> : null}
        <div className="marketing-blog-body" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />
        {article.faq.length > 0 ? (
          <section className="marketing-blog-faq" aria-labelledby="article-faq-heading">
            <h2 id="article-faq-heading">Frequently asked questions</h2>
            <div className="marketing-blog-faq-list">
              {article.faq.map((item) => (
                <details key={item.question} className="marketing-blog-faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
        <p className="marketing-catalog-cta">
          <Link to="/hosting" className="btn btn-primary">
            View hosting plans
          </Link>
          <Link to="/blog" className="btn btn-secondary">
            More resources
          </Link>
        </p>
      </main>
      <MarketingFooter />
    </div>
  );
}
