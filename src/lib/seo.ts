import { useEffect } from 'react';

export const SITE_URL = 'https://jointavrion.com';
export const SITE_NAME = 'Tavrion';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;

export const SEO = {
  home: {
    title: 'Tavrion — Enterprise LMS for Sales Training, AI Coaching & SCORM',
    description:
      'All-in-one enterprise learning platform for global teams. AI mock calls, SCORM/xAPI courses, live call coaching, multi-org management, certificates, and real-time analytics — deploy in 150+ countries.',
    keywords:
      'enterprise LMS, learning management system, sales training software, AI mock calls, SCORM LMS, call coaching platform, employee onboarding, compliance training, multi-tenant LMS, learning analytics',
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
    description: 'Sign in to your Tavrion learning platform account.',
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
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertLink('canonical', url);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:locale', 'en_GB');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', '@tavrion');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
  }, [title, description, path, image, keywords, noindex, type]);
}
