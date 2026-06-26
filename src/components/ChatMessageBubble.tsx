import { useEffect, useState } from 'react';
import { ExternalLink, Zap } from 'lucide-react';

export type SourceLink = { url: string; title: string; live?: boolean };

type LinkPreview = {
  url: string;
  title: string;
  description: string;
  image?: string | null;
  siteName?: string;
};

type ChatMessageBubbleProps = {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceLink[];
  liveFetched?: boolean;
  theme: { primary: string; accent: string };
  apiBase: string;
  anonKey?: string;
  isDark?: boolean;
};

function extractUrls(text: string): string[] {
  const urls = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    urls.add(m[0].replace(/[.,;:!?)]+$/, ''));
    if (urls.size >= 4) break;
  }
  return [...urls];
}

function linkifyText(text: string, accent: string) {
  const parts = text.split(/(https?:\/\/[^\s<>"')\]]+)/gi);
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      const href = part.replace(/[.,;:!?)]+$/, '');
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: accent, textDecoration: 'underline', wordBreak: 'break-all' }}>
          {href}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function LinkPreviewCard({ preview, accent, isDark }: { preview: LinkPreview; accent: string; isDark?: boolean }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', marginTop: 8, borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e5e5'}`,
        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        textDecoration: 'none', color: 'inherit', transition: 'border-color .15s',
      }}
    >
      {preview.image && (
        <div style={{ height: 100, overflow: 'hidden', background: '#f0f0f0' }}>
          <img src={preview.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: accent, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <ExternalLink size={10} /> {preview.siteName || new URL(preview.url).hostname}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 2,
          color: isDark ? '#fafafa' : '#171717' }}>
          {preview.title}
        </div>
        {preview.description && (
          <div style={{ fontSize: 12, color: isDark ? '#a1a1aa' : '#666', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {preview.description}
          </div>
        )}
      </div>
    </a>
  );
}

export function ChatMessageBubble({ role, content, sources, liveFetched, theme, apiBase, anonKey, isDark }: ChatMessageBubbleProps) {
  const [previews, setPreviews] = useState<LinkPreview[]>([]);

  const urls = [
    ...new Set([
      ...(sources?.map((s) => s.url) || []),
      ...extractUrls(content),
    ]),
  ].slice(0, 3);

  useEffect(() => {
    if (role !== 'assistant' || urls.length === 0) {
      setPreviews([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(`${apiBase}/functions/v1/tavrion-bot-link-preview?url=${encodeURIComponent(url)}`, {
            headers: anonKey ? { Authorization: `Bearer ${anonKey}` } : {},
          });
          const data = await res.json();
          if (data.error) return null;
          return data as LinkPreview;
        } catch {
          return { url, title: new URL(url).hostname, description: '', siteName: new URL(url).hostname };
        }
      }),
    ).then((results) => {
      if (!cancelled) setPreviews(results.filter((r): r is LinkPreview => r !== null));
    });
    return () => { cancelled = true; };
  }, [content, role, apiBase, urls.join('|')]);

  const isUser = role === 'user';

  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      maxWidth: '88%',
    }}>
      {liveFetched && !isUser && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
          color: theme.accent, marginBottom: 4, padding: '2px 8px', borderRadius: 6,
          background: `${theme.accent}18`,
        }}>
          <Zap size={10} /> Live data fetched
        </div>
      )}
      <div style={{
        padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.55,
        background: isUser ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` : (isDark ? '#14141c' : '#f4f4f5'),
        color: isUser ? '#fff' : (isDark ? '#fafafa' : '#171717'),
        border: !isUser ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e5e5'}` : 'none',
      }}>
        {linkifyText(content, isUser ? '#fff' : theme.primary)}
      </div>
      {!isUser && previews.map((p) => (
        <LinkPreviewCard key={p.url} preview={p} accent={theme.primary} isDark={isDark} />
      ))}
    </div>
  );
}
