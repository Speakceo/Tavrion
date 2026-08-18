import { useEffect } from 'react';

export const SITE_URL = 'https://jointavrion.com';
export const SITE_NAME = 'Tavrion';
export const BRAND_TAGLINE = 'Train the world. Scale without limits.';
export const BRAND_POSITIONING = 'Enterprise learning and assessment platform';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export const SEO = {
  home: {
    title: 'Tavrion | Enterprise LMS & Skills Assessment',
    description:
      'Enterprise LMS for global teams: SCORM courses, AI mock calls, hiring assessments, and analytics in one platform.',
    keywords:
      'enterprise LMS, learning management system, learning and assessment platform, corporate training software, skills assessment software, hiring assessment platform, employee onboarding LMS, compliance training platform, SCORM LMS, AI coaching platform, mock call training, talent assessment, multi-tenant LMS, learning analytics, L&D software',
    path: '/',
  },
  dnaStudio: {
    title: 'DNA Studio | AI Brand & Campaign Generator | Tavrion',
    description:
      'Paste any URL to extract brand DNA, colors, and tone, then generate on-brand social campaigns and images with AI. Free brand analysis tool by Tavrion.',
    path: '/dna-studio',
    noindex: true,
  },
  tavrionBot: {
    title: 'Tavrion Bot | AI Website Chatbot with RAG | Tavrion',
    description:
      'Turn any website into an AI chatbot in minutes. Crawl your site, embed a branded widget, and answer visitor questions with grounded RAG responses.',
    path: '/tavrion-bot',
    noindex: true,
  },
  login: {
    title: 'Sign In | Tavrion',
    description:
      'Sign in to Tavrion, the enterprise learning and assessment platform with AI coaching, SCORM courses, skills tests, and team analytics.',
    path: '/login',
    noindex: true,
  },
} as const;

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const SOFTWARE_ID = `${SITE_URL}/#software`;

export function buildOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
    description: BRAND_POSITIONING,
    email: 'hello@jointavrion.com',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'hello@jointavrion.com',
      availableLanguage: ['English'],
    },
  };
}

export function buildWebSiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: BRAND_POSITIONING,
    slogan: BRAND_TAGLINE,
    publisher: { '@id': ORG_ID },
    inLanguage: 'en-GB',
  };
}

export function buildSoftwareApplicationSchema(description = SEO.home.description) {
  return {
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: [
      {
        '@type': 'Offer',
        name: 'Starter',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free plan for up to 5 learners',
      },
      {
        '@type': 'Offer',
        name: 'Growth',
        price: '12',
        priceCurrency: 'USD',
        priceSpecification: { '@type': 'UnitPriceSpecification', unitText: 'user/month' },
        description: 'Per user per month for growing teams',
      },
    ],
    featureList: [
      'SCORM Course Delivery',
      'AI Coaching and Mock Calls',
      'Live Call Practice',
      'Hiring and Skills Assessments',
      'Onboarding and Compliance',
      'Certificates',
      'Multi-organisation LMS',
      'Learning Analytics',
    ],
    publisher: { '@id': ORG_ID },
  };
}

export function buildHomePageSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: faqs.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/#product-modules`,
        name: 'Tavrion platform modules',
        itemListElement: [
          'AI Mock Calls',
          'AI Tutor',
          'Live Call Coaching',
          'SCORM Courses',
          'Skills Assessments',
          'Learning Analytics',
          'DNA Studio',
          'Tavrion Bot',
        ].map((name, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name,
        })),
      },
    ],
  };
}

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
    upsertMeta(
      'name',
      'robots',
      noindex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
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
    upsertMeta('property', 'og:image:type', image.endsWith('.svg') ? 'image/svg+xml' : 'image/png');

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:site', '@tavrion');
    upsertMeta('name', 'twitter:creator', '@tavrion');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', fullTitle);
  }, [title, description, path, image, keywords, noindex, type]);
}
