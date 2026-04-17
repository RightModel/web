import { defaultSiteUrl, siteDescription, siteTitle } from "@/lib/site";

export type JsonLdType = "WebPage" | "WebSite" | "CollectionPage" | "AboutPage" | "FAQPage" | "TechArticle";

function getSiteUrl() {
  return import.meta.env.PUBLIC_SITE_URL || defaultSiteUrl;
}

export function buildCanonical(pathname: string) {
  return new URL(pathname, getSiteUrl()).toString();
}

export function buildPageJsonLd(args: {
  type?: JsonLdType;
  title: string;
  description: string;
  canonical: string;
  image?: string;
}) {
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": args.type ?? "WebPage",
    name: args.title,
    headline: args.title,
    description: args.description,
    url: args.canonical,
    inLanguage: "en-CA",
    isAccessibleForFree: true,
    publisher: {
      "@type": "Organization",
      name: siteTitle,
      url: getSiteUrl()
    }
  };

  if (args.image) {
    jsonLd.image = args.image;
  }

  return jsonLd;
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; item: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
}

export function buildItemListJsonLd(args: {
  name: string;
  description?: string;
  items: Array<{ name: string; item: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: args.name,
    description: args.description ?? siteDescription,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    numberOfItems: args.items.length,
    itemListElement: args.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
}
