import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, Globe2, MessageSquare, Code2, Copy, Check, Loader2, Zap,
  ArrowRight, CheckCircle2, RefreshCw, Smartphone, Layers, Search,
  ChevronRight, ExternalLink, Send, Sparkles,
} from 'lucide-react';

type BotRecord = {
  id: string;
  name: string;
  source_url: string;
  embed_key: string;
  status: 'pending' | 'crawling' | 'ready' | 'error';
  pages_crawled: number;
  chunks_count: number;
  welcome_message: string;
  primary_color: string;
  whatsapp_enabled: boolean;
  whatsapp_phone_number_id?: string;
  whatsapp_verify_token?: string;
  crawl_error?: string;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const T = {
  bg: '#060608', bgElevated: '#0f0f14', bgCard: '#14141c',
  text: '#fafafa', textBody: '#a1a1aa', textMuted: '#71717a',
  border: 'rgba(255,255,255,0.08)', accent: '#22c55e', accent2: '#3b82f6', accent3: '#8b5cf6',
  glow: 'rgba(34, 197, 94, 0.3)',
};

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FEATURES = [
  { icon: Globe2, title: 'Crawl4AI Engine', body: 'Full browser crawl via Crawl4AI — handles JS-heavy SPAs, extracts clean markdown for RAG. Up to 20 pages per site.' },
  { icon: Layers, title: 'LangGraph RAG Agent', body: 'Stateful retrieve → generate pipeline built with LangGraph. Answers grounded in crawled content with conversation memory.' },
  { icon: Code2, title: 'One-Line Embed', body: 'Copy a single script tag and your chatbot goes live on any website in seconds.' },
  { icon: Smartphone, title: 'WhatsApp Ready', body: 'Connect Meta WhatsApp Business API. Same knowledge base powers web and WhatsApp conversations.' },
  { icon: Search, title: 'Deep Multi-Page Crawl', body: 'BFS deep crawling discovers linked pages on the same domain — not just the homepage.' },
  { icon: Zap, title: 'Deploy in Minutes', body: 'Create, crawl, test, and embed — powered by Crawl4AI + LangGraph microservice.' },
];

const STEPS = [
  { n: '01', title: 'Enter website URL', desc: 'We crawl your site and index every page into a vector knowledge base.' },
  { n: '02', title: 'Test your bot', desc: 'Chat with your bot instantly to verify answers match your website content.' },
  { n: '03', title: 'Embed anywhere', desc: 'Drop one script tag on your site or connect WhatsApp Business API.' },
];

const EXAMPLE_URLS = ['https://jointavrion.com', 'https://stripe.com/docs', 'https://docs.anthropic.com'];

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ANON_KEY}`,
  };
}

export function TavrionBot() {
  const [url, setUrl] = useState('');
  const [botName, setBotName] = useState('');
  const [loading, setLoading] = useState(false);
  const [bot, setBot] = useState<BotRecord | null>(null);
  const [pages, setPages] = useState<{ url: string; title: string; words: number }[]>([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'test' | 'embed' | 'whatsapp'>('test');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waSaving, setWaSaving] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jointavrion.com';

  const embedScript = bot
    ? `<!-- Tavrion Bot — paste before </body> -->
<script
  src="${siteOrigin}/tavrion-bot.js"
  data-bot-key="${bot.embed_key}"
  data-api-url="${SUPABASE_URL}"
  data-position="bottom-right"
  async
></script>`
    : '';

  const whatsappWebhook = bot
    ? `${SUPABASE_URL}/functions/v1/tavrion-bot-whatsapp?bot=${bot.embed_key}`
    : '';

  async function createBot() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setBot(null);
    setPages([]);
    setMessages([]);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tavrion-bot-crawl`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ url: url.trim(), name: botName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crawl failed');

      setBot(data.bot);
      setPages(data.pages || []);
      setMessages([{ role: 'assistant', content: data.bot.welcome_message }]);
      if (data.crawlEngine || data.ragEngine) {
        console.info(`Engines: crawl=${data.crawlEngine}, rag=${data.ragEngine}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create bot');
    } finally {
      setLoading(false);
    }
  }

  async function recrawl() {
    if (!bot) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tavrion-bot-crawl`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ botId: bot.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Recrawl failed');
      setBot(data.bot);
      setPages(data.pages || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Recrawl failed');
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !bot || bot.status !== 'ready') return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setMessages((m) => [...m, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tavrion-bot-chat`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ embedKey: bot.embed_key, message: userMsg, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch (e: unknown) {
      setMessages((m) => [...m, { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : 'Unknown'}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function saveWhatsApp() {
    if (!bot) return;
    setWaSaving(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(SUPABASE_URL, ANON_KEY);
      const { data, error: err } = await sb.from('tavrion_bots').update({
        whatsapp_enabled: true,
        whatsapp_phone_number_id: waPhoneId.trim(),
        whatsapp_access_token: waToken.trim(),
        updated_at: new Date().toISOString(),
      }).eq('id', bot.id).select().single();
      if (err) throw err;
      setBot(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save WhatsApp config');
    } finally {
      setWaSaving(false);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: FONT }}>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(12px)',
        background: 'rgba(6,6,8,0.85)', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Bot size={20} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Tavrion Bot</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/dna-studio" style={{ color: T.textBody, textDecoration: 'none', fontSize: 14 }}>DNA Studio</Link>
          <Link to="/login" style={{ color: T.textBody, textDecoration: 'none', fontSize: 14 }}>LMS Login</Link>
          <a href="https://jointavrion.com" style={{
            padding: '8px 16px', borderRadius: 8, background: T.accent, color: '#000',
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}>Get Started</a>
        </div>
      </nav>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px 40px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px',
          borderRadius: 999, background: 'rgba(34,197,94,0.12)', border: `1px solid rgba(34,197,94,0.3)`,
          fontSize: 13, color: T.accent, marginBottom: 24,
        }}>
          <Sparkles size={14} /> Crawl4AI + LangGraph
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
          Turn any website into an<br />
          <span style={{ background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AI chatbot in minutes
          </span>
        </h1>
        <p style={{ color: T.textBody, fontSize: 18, maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.6 }}>
          Crawl your site, build a RAG knowledge base, and deploy a chat widget or WhatsApp bot — no code required.
        </p>

        <div style={{
          background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: 24, textAlign: 'left', maxWidth: 640, margin: '0 auto',
        }}>
          <label style={{ fontSize: 13, color: T.textMuted, display: 'block', marginBottom: 8 }}>Website URL</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com"
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
                background: T.bgElevated, color: T.text, fontSize: 15, outline: 'none',
              }}
              onKeyDown={(e) => e.key === 'Enter' && createBot()}
            />
          </div>
          <label style={{ fontSize: 13, color: T.textMuted, display: 'block', marginBottom: 8 }}>Bot name (optional)</label>
          <input
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="My Website Assistant"
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
              background: T.bgElevated, color: T.text, fontSize: 15, outline: 'none', marginBottom: 16,
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {EXAMPLE_URLS.map((u) => (
              <button key={u} onClick={() => setUrl(u)} style={{
                padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`,
                background: 'transparent', color: T.textMuted, fontSize: 12, cursor: 'pointer',
              }}>{u.replace('https://', '')}</button>
            ))}
          </div>
          <button
            onClick={createBot}
            disabled={loading || !url.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: loading ? 'wait' : 'pointer',
              background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: '#000',
              fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: loading || !url.trim() ? 0.6 : 1,
            }}
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Crawling & building RAG...</> : <><Zap size={18} /> Create Bot</>}
          </button>
          {error && <p style={{ color: '#ef4444', fontSize: 14, marginTop: 12 }}>{error}</p>}
        </div>
      </section>

      {bot && (
        <section style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 48px' }}>
          <div style={{
            background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={18} color={bot.status === 'ready' ? T.accent : '#f59e0b'} />
                  <span style={{ fontWeight: 700, fontSize: 18 }}>{bot.name}</span>
                  <span style={{
                    fontSize: 12, padding: '2px 8px', borderRadius: 6,
                    background: bot.status === 'ready' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: bot.status === 'ready' ? T.accent : '#f59e0b',
                  }}>{bot.status}</span>
                </div>
                <p style={{ color: T.textMuted, fontSize: 13, marginTop: 4 }}>
                  {bot.pages_crawled} pages · {bot.chunks_count} chunks · {bot.source_url}
                </p>
              </div>
              <button onClick={recrawl} disabled={loading} style={{
                padding: '8px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
                background: 'transparent', color: T.textBody, cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <RefreshCw size={14} /> Recrawl
              </button>
            </div>

            {pages.length > 0 && (
              <div style={{ padding: '12px 24px', borderBottom: `1px solid ${T.border}`, maxHeight: 120, overflowY: 'auto' }}>
                {pages.map((p) => (
                  <div key={p.url} style={{ fontSize: 12, color: T.textMuted, padding: '3px 0', display: 'flex', gap: 8 }}>
                    <ExternalLink size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: T.textBody }}>{p.title || p.url}</span>
                    <span>({p.words} words)</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
              {(['test', 'embed', 'whatsapp'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  background: tab === t ? T.bgElevated : 'transparent',
                  color: tab === t ? T.text : T.textMuted,
                  borderBottom: tab === t ? `2px solid ${T.accent}` : '2px solid transparent',
                }}>
                  {t === 'test' ? 'Test Chat' : t === 'embed' ? 'Embed Script' : 'WhatsApp'}
                </button>
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {tab === 'test' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: 400 }}>
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {messages.map((m, i) => (
                      <div key={i} style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                        background: m.role === 'user' ? `linear-gradient(135deg, ${T.accent}, ${T.accent2})` : T.bgElevated,
                        color: m.role === 'user' ? '#000' : T.text,
                        border: m.role === 'assistant' ? `1px solid ${T.border}` : 'none',
                      }}>{m.content}</div>
                    ))}
                    {chatLoading && <div style={{ color: T.textMuted, fontSize: 13 }}>Thinking...</div>}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={sendChat} style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={bot.status === 'ready' ? 'Ask about the website...' : 'Waiting for crawl to finish...'}
                      disabled={bot.status !== 'ready' || chatLoading}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
                        background: T.bgElevated, color: T.text, fontSize: 14, outline: 'none',
                      }}
                    />
                    <button type="submit" disabled={bot.status !== 'ready' || chatLoading} style={{
                      padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: T.accent, color: '#000', fontWeight: 600,
                    }}>
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              )}

              {tab === 'embed' && (
                <div>
                  <p style={{ color: T.textBody, fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
                    Paste this script before <code style={{ color: T.accent }}>&lt;/body&gt;</code> on any website.
                    The widget loads in a shadow DOM — no CSS conflicts.
                  </p>
                  <div style={{ position: 'relative' }}>
                    <pre style={{
                      background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 10,
                      padding: 16, fontSize: 12, color: T.textBody, overflowX: 'auto', lineHeight: 1.6,
                    }}>{embedScript}</pre>
                    <button onClick={() => copyText(embedScript, 'embed')} style={{
                      position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 6,
                      border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, cursor: 'pointer',
                      fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      {copied === 'embed' ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                    </button>
                  </div>
                  <p style={{ color: T.textMuted, fontSize: 12, marginTop: 12 }}>
                    Bot key: <code style={{ color: T.accent }}>{bot.embed_key}</code>
                  </p>
                </div>
              )}

              {tab === 'whatsapp' && (
                <div>
                  <p style={{ color: T.textBody, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Connect your Meta WhatsApp Business API. Set this webhook URL in your Meta Developer Console:
                  </p>
                  <div style={{ position: 'relative', marginBottom: 20 }}>
                    <pre style={{
                      background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 10,
                      padding: 16, fontSize: 12, color: T.textBody, overflowX: 'auto',
                    }}>{whatsappWebhook}</pre>
                    <button onClick={() => copyText(whatsappWebhook, 'wa-url')} style={{
                      position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 6,
                      border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, cursor: 'pointer', fontSize: 12,
                    }}>
                      {copied === 'wa-url' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p style={{ color: T.textBody, fontSize: 13, marginBottom: 8 }}>
                    Verify token: <code style={{ color: T.accent }}>{bot.whatsapp_verify_token}</code>
                    <button onClick={() => copyText(bot.whatsapp_verify_token || '', 'wa-token')} style={{
                      marginLeft: 8, padding: '2px 8px', borderRadius: 4, border: `1px solid ${T.border}`,
                      background: 'transparent', color: T.textMuted, cursor: 'pointer', fontSize: 11,
                    }}>{copied === 'wa-token' ? 'Copied' : 'Copy'}</button>
                  </p>
                  <div style={{ marginTop: 24, display: 'grid', gap: 12 }}>
                    <input
                      value={waPhoneId}
                      onChange={(e) => setWaPhoneId(e.target.value)}
                      placeholder="WhatsApp Phone Number ID"
                      style={{
                        padding: '12px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
                        background: T.bgElevated, color: T.text, fontSize: 14, outline: 'none',
                      }}
                    />
                    <input
                      value={waToken}
                      onChange={(e) => setWaToken(e.target.value)}
                      placeholder="WhatsApp Access Token"
                      type="password"
                      style={{
                        padding: '12px 16px', borderRadius: 10, border: `1px solid ${T.border}`,
                        background: T.bgElevated, color: T.text, fontSize: 14, outline: 'none',
                      }}
                    />
                    <button onClick={saveWhatsApp} disabled={waSaving} style={{
                      padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: T.accent2, color: '#fff', fontWeight: 600,
                    }}>
                      {waSaving ? 'Saving...' : 'Enable WhatsApp Integration'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{
              background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24,
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: T.accent, marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: T.textBody, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 800, marginBottom: 40 }}>Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24,
            }}>
              <f.icon size={24} color={T.accent} style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: T.textBody, fontSize: 14, lineHeight: 1.6 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{
        borderTop: `1px solid ${T.border}`, padding: '32px 24px', textAlign: 'center', color: T.textMuted, fontSize: 13,
      }}>
        <p>Tavrion Bot · Part of the Tavrion platform</p>
        <Link to="/" style={{ color: T.accent, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          Back to Tavrion <ChevronRight size={14} />
        </Link>
      </footer>
    </div>
  );
}

export default TavrionBot;
