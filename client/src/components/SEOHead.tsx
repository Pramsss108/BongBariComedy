import { Helmet } from "react-helmet-async";

// ─── BongBari SEO Head — Drop this in any page to get full SEO coverage ───────

interface SEOHeadProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  structuredData?: object | object[];
  twitterCard?: "summary" | "summary_large_image";
  keywords?: string;
  noIndex?: boolean;
  /**
   * Custom favicon base path (without size suffix / extension).
   * e.g. "/humanizer-favicon" will resolve to:
   *   /humanizer-favicon-16.png  (16×16)
   *   /humanizer-favicon-32.png  (32×32)
   *   /humanizer-favicon-180.png (apple-touch)
   *   /humanizer-favicon.ico     (shortcut)
   * Leave undefined to keep the default Bong Bari logo favicon.
   */
  faviconBase?: string;
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
  faviconBase,
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

      {/* ── Favicon override (per-page) ── */}
      {faviconBase && <link rel="icon" type="image/png" sizes="32x32" href={`${faviconBase}-32.png`} />}
      {faviconBase && <link rel="icon" type="image/png" sizes="16x16" href={`${faviconBase}-16.png`} />}
      {faviconBase && <link rel="apple-touch-icon" sizes="180x180" href={`${faviconBase}-180.png`} />}
      {faviconBase && <link rel="shortcut icon" href={`${faviconBase}.ico`} />}

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
