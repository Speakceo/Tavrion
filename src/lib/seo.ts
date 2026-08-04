import { useEffect } from 'react';

export const SITE_URL = 'https://jointavrion.com';
export const SITE_NAME = 'Tavrion';
export const BRAND_TAGLINE = 'Train the world. Scale without limits.';
export const BRAND_POSITIONING = 'Enterprise sales and hiring assessment platform';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;

export const SEO = {
  home: {
    title: 'Tavrion — Enterprise Sales & Hiring Assessment Platform',
    description:
      'Enterprise sales and hiring assessment platform for global teams. Role-based skills tests, AI mock calls, SCORM courses, live coaching, certificates, and analytics — hire smarter and train faster in 150+ countries.',
    keywords:
      'enterprise sales assessment platform, hiring assessment platform, sales skills testing, candidate assessment software, AI mock calls, SCORM LMS, sales training software, call coaching platform, role-based assessments, learning analytics, multi-tenant LMS',
    path: '/',
  },
  dnaStudio: {
    title: 'DNA Studio — AI Brand & Campaign Generator | Tavrion',
    description:
      'Paste any URL to extract brand DNA, colors, and tone — then generate on-brand social campaigns and images with AI. Free brand analysis tool by Tavrion.',
    path: '/dna-studio',
  },
  tavrionBot: {
    title: 'Tavrion Bot — AI Website Chatbot with RAG | Tavrion',
    description:
      'Turn any website into an AI chatbot in minutes. Crawl your site, embed a branded widget, and answer visitor questions with grounded RAG responses.',
    path: '/tavrion-bot',
  },
  login: {
    title: 'Sign In | Tavrion',
    description:
      'Sign in to Tavrion — the enterprise sales and hiring assessment platform with AI coaching, SCORM courses, and team analytics.',
    path: '/login',
    noindex: true,
  },
} as const;

type PageSeoOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
};

/** Inject or replace a JSON-LD script block (for FAQ, Product, etc.) */
export function injectJsonLd(id: string, data: object) {
  const scriptId = `jsonld-${id}`;
  let el = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = scriptId;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string) {
  document.getElementById(`jsonld-${id}`)?.remove();
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export function formatDocumentTitle(pageTitle: string): string {
  if (pageTitle.includes('|')) return pageTitle;
  return `${pageTitle} | ${SITE_NAME}`;
}

/** Update the browser tab title when route content changes. */
export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    document.title = formatDocumentTitle(pageTitle);
  }, [pageTitle]);
}

export function usePageSeo({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  keywords,
  noindex = false,
  type = 'website',
}: PageSeoOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path === '/' ? '' : path}`;
    const fullTitle = path === '/' ? title : title;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('name', 'application-name', SITE_NAME);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:image:alt', fullTitle);
    upsertMeta('property', 'og:locale', 'en_GB');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', '@tavrion');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', fullTitle);
  }, [title, description, path, image, keywords, noindex, type]);
}
