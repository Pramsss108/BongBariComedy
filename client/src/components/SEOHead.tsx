import { Helmet } from "react-helmet-async";

// ─── BongBari SEO Head — Drop this in any page to get full SEO coverage ───────
// Props mirror what Google / OG / Twitter actually care about.
// Every field has a sensible default pointing to the homepage, so you can
// override only what you need.

interface SEOHeadProps {
  /** Browser tab title (also used as og:title / twitter:title) */
  title: string;
  /** Meta description — aim for 120-155 characters */
  description: string;
  /** Canonical URL for this page */
  url: string;
  /** OG image — full absolute URL, 1200×630 recommended */
  image?: string;
  /** og:type — 'website' for landing pages, 'article' for blog posts */
  type?: string;
  /** Extra JSON-LD structured data blocks */
  structuredData?: object | object[];
  /** Override twitter:card — default 'summary_large_image' */
  twitterCard?: "summary" | "summary_large_image";
  /** Keywords for meta keywords tag (helps some crawlers) */
  keywords?: string;
  /** Set to true if this page should not be indexed (admin, login, etc.) */
  noIndex?: boolean;
}

const DEFAULTS = {
  image: "https://www.bongbari.com/logo.png",
  type: "website",
  twitterCard: "summary_large_image" as const,
};

export function SEOHead({
  title,
  description,
  url,
  image = DEFAULTS.image,
  type = DEFAULTS.type,
  structuredData,
  twitterCard = DEFAULTS.twitterCard,
  keywords,
  noIndex = false,
}: SEOHeadProps) {
  const schemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [];

  return (
    <Helmet>
      {/* ── Core ── */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* ── Open Graph (Facebook, WhatsApp, LinkedIn, Telegram) ── */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Bong Bari" />
      <meta property="og:locale" content="en_IN" />

      {/* ── Twitter / X Card ── */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@BongBari" />

      {/* ── JSON-LD Structured Data ── */}
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
