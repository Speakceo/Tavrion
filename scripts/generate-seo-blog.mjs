import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOG_POSTS, SITE_URL } from './seo-blog/posts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const blogRoot = path.join(root, 'public', 'blog');

const SHARED_CSS = `
:root { color-scheme: light; }
body { margin: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #fff; color: #171717; line-height: 1.65; }
a { color: #171717; }
.wrap { max-width: 760px; margin: 0 auto; padding: 28px 24px 64px; }
.logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; font-weight: 700; letter-spacing: -0.03em; font-size: 18px; margin-bottom: 32px; }
.mark { width: 32px; height: 32px; border-radius: 8px; background: #171717; color: #fff; display: grid; place-items: center; font-size: 16px; }
.meta { font-size: 13px; color: #808080; margin: 0 0 20px; }
h1 { font-size: clamp(30px, 4.5vw, 42px); font-weight: 750; letter-spacing: -0.04em; line-height: 1.1; margin: 0 0 16px; }
.lead { font-size: 18px; color: #4d4d4d; margin: 0 0 28px; }
h2 { font-size: 22px; letter-spacing: -0.03em; margin: 36px 0 12px; }
p { color: #4d4d4d; font-size: 16px; margin: 0 0 16px; }
ul { color: #4d4d4d; font-size: 16px; padding-left: 20px; margin: 0 0 20px; }
li { margin-bottom: 8px; }
.cta { display: inline-block; margin-top: 8px; padding: 11px 18px; border-radius: 8px; background: #171717; color: #fff !important; text-decoration: none; font-size: 14px; font-weight: 600; }
.card-list { display: grid; gap: 16px; margin-top: 24px; }
.card { border: 1px solid #ebebeb; border-radius: 12px; padding: 18px; background: #fafafa; }
.card h2 { font-size: 18px; margin: 0 0 8px; }
.card p { font-size: 14px; margin: 0 0 10px; }
.card a { font-size: 14px; font-weight: 600; }
footer { border-top: 1px solid #ebebeb; margin-top: 48px; padding-top: 24px; font-size: 12px; color: #808080; }
footer a { color: #666; }
`.trim();

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSections(sections) {
  return sections.map((sec) => {
    const heading = sec.heading ? `<h2>${escapeHtml(sec.heading)}</h2>` : '';
    const paras = (sec.paragraphs || []).map((p) => `<p>${p}</p>`).join('');
    const list = sec.list ? `<ul>${sec.list.map((item) => `<li>${item}</li>`).join('')}</ul>` : '';
    return heading + paras + list;
  }).join('\n');
}

function pageShell({ title, description, keywords, canonical, jsonLd, body }) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  ${keywords ? `<meta name="keywords" content="${escapeHtml(keywords)}" />` : ''}
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="${canonical}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Tavrion" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${SITE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${SITE_URL}/og-image.png" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <div class="wrap">
    <a class="logo" href="/"><span class="mark">T</span> Tavrion</a>
    ${body}
    <footer>
      <p>&copy; 2026 Tavrion. <a href="/">Home</a> · <a href="/lms">Tavrion LMS</a> · <a href="/blog/">Blog</a> · <a href="/login">Start free trial</a></p>
    </footer>
  </div>
</body>
</html>`;
}

function writePost(post) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { '@type': 'Organization', name: 'Tavrion', url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Tavrion',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.svg` },
    },
    mainEntityOfPage: url,
    url,
    inLanguage: 'en-GB',
  };

  const body = `
    <p class="meta"><a href="/blog/">Blog</a> · ${post.date} · ${post.readMinutes} min read</p>
    <h1>${escapeHtml(post.title)}</h1>
    <p class="lead">${escapeHtml(post.description)}</p>
    ${renderSections(post.sections)}
    <p><strong>Ready to try Tavrion LMS?</strong> Import SCORM, run assessments, and practice with AI coaching — free for up to 5 learners.</p>
    <a class="cta" href="/login">Start free trial</a>
    <p style="margin-top:28px;font-size:14px;color:#808080">Related: <a href="/lms">What is Tavrion LMS?</a> · <a href="/">Platform overview</a></p>
  `;

  const dir = path.join(blogRoot, post.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, 'index.html'),
    pageShell({
      title: `${post.title} | Tavrion Blog`,
      description: post.description,
      keywords: post.keywords,
      canonical: url,
      jsonLd,
      body,
    }),
  );
}

function writeIndex() {
  const cards = BLOG_POSTS.map(
    (p) => `<article class="card">
      <h2><a href="/blog/${p.slug}/">${escapeHtml(p.title)}</a></h2>
      <p>${escapeHtml(p.description)}</p>
      <a href="/blog/${p.slug}/">Read article →</a>
    </article>`,
  ).join('\n');

  const body = `
    <p class="meta">Tavrion Blog · LMS, training &amp; assessment insights</p>
    <h1>Tavrion Blog — LMS, skills assessments &amp; enterprise training</h1>
    <p class="lead">Guides on learning management systems, SCORM, AI coaching, hiring assessments, and global onboarding — from the team behind <a href="/lms">Tavrion LMS</a>.</p>
    <div class="card-list">${cards}</div>
    <p style="margin-top:32px"><a class="cta" href="/login">Start free trial</a></p>
  `;

  mkdirSync(blogRoot, { recursive: true });
  writeFileSync(
    path.join(blogRoot, 'index.html'),
    pageShell({
      title: 'Blog | Tavrion LMS — Enterprise Training & Assessment Guides',
      description:
        'Articles on enterprise LMS, SCORM training, AI mock calls, skills assessments, compliance, and global onboarding from Tavrion.',
      keywords: 'Tavrion blog, LMS blog, enterprise training, skills assessment, SCORM LMS',
      canonical: `${SITE_URL}/blog/`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'Tavrion Blog',
        url: `${SITE_URL}/blog/`,
        description: 'Enterprise LMS, training, and assessment guides from Tavrion.',
        publisher: { '@type': 'Organization', name: 'Tavrion', url: SITE_URL },
        blogPost: BLOG_POSTS.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          url: `${SITE_URL}/blog/${p.slug}`,
          datePublished: p.date,
        })),
      },
      body,
    }),
  );
}

function writeSitemap() {
  const urls = [
    { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
    { loc: `${SITE_URL}/lms`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${SITE_URL}/blog/`, priority: '0.85', changefreq: 'weekly' },
    ...BLOG_POSTS.map((p) => ({
      loc: `${SITE_URL}/blog/${p.slug}`,
      priority: '0.7',
      changefreq: 'monthly',
      lastmod: p.date,
    })),
  ];

  const today = new Date().toISOString().slice(0, 10);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

  writeFileSync(path.join(root, 'public', 'sitemap.xml'), xml);
}

mkdirSync(blogRoot, { recursive: true });
writeIndex();
for (const post of BLOG_POSTS) writePost(post);
writeSitemap();

console.log(`Generated ${BLOG_POSTS.length} blog posts + index + sitemap.xml`);
