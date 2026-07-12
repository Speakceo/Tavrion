(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var botKey = script.getAttribute('data-bot-key');
  // Prefer same-origin proxy path — never default to *.supabase.co
  var apiBase = script.getAttribute('data-api-url') || (typeof location !== 'undefined' ? (location.origin + '/api/sb') : '');
  var anonKey = script.getAttribute('data-anon-key') || '';
  var position = script.getAttribute('data-position') || 'bottom-right';

  if (!botKey) {
    console.error('[Tavrion Bot] Missing data-bot-key attribute');
    return;
  }
  if (!apiBase) {
    console.error('[Tavrion Bot] Missing data-api-url attribute');
    return;
  }

  var chatUrl = apiBase + '/functions/v1/tavrion-bot-chat';
  var previewUrl = apiBase + '/functions/v1/tavrion-bot-link-preview?url=';
  var proxyUrl = apiBase + '/functions/v1/dna-studio-image-proxy?url=';
  var sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var config = {
    primaryColor: '#6366f1',
    secondaryColor: '#1e293b',
    accentColor: '#3b82f6',
    logoUrl: null,
    name: 'Assistant',
    welcomeMessage: 'Hi! How can I help you?',
  };
  var isOpen = false;

  var host = document.createElement('div');
  host.id = 'tavrion-bot-root';
  document.body.appendChild(host);

  var shadow = host.attachShadow({ mode: 'open' });

  var styles = document.createElement('style');
  styles.textContent = [
    '* { box-sizing: border-box; margin: 0; padding: 0; }',
    '.tb-wrap { position: fixed; z-index: 2147483000; font-family: Inter, system-ui, -apple-system, sans-serif; }',
    '.tb-wrap.br { bottom: 24px; right: 24px; }',
    '.tb-wrap.bl { bottom: 24px; left: 24px; }',
    '.tb-bubble { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; color: #fff; font-size: 22px; box-shadow: 0 8px 32px rgba(0,0,0,.28); display: flex; align-items: center; justify-content: center; transition: transform .2s; }',
    '.tb-bubble:hover { transform: scale(1.05); }',
    '.tb-panel { display: none; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 100px); background: #fff; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,.22); flex-direction: column; overflow: hidden; margin-bottom: 12px; border: 1px solid rgba(0,0,0,.06); }',
    '.tb-panel.open { display: flex; }',
    '.tb-header { padding: 14px 16px; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 10px; }',
    '.tb-header-left { display: flex; align-items: center; gap: 10px; min-width: 0; }',
    '.tb-logo { width: 32px; height: 32px; border-radius: 8px; background: #fff; object-fit: contain; padding: 3px; flex-shrink: 0; }',
    '.tb-header h3 { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }',
    '.tb-close { background: rgba(255,255,255,.2); border: none; color: #fff; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; font-size: 16px; flex-shrink: 0; }',
    '.tb-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #fafafa; }',
    '.tb-msg { max-width: 88%; font-size: 14px; line-height: 1.5; }',
    '.tb-msg-wrap { align-self: flex-start; max-width: 88%; }',
    '.tb-msg-wrap.user { align-self: flex-end; }',
    '.tb-msg-bubble { padding: 10px 14px; border-radius: 12px; }',
    '.tb-msg.bot .tb-msg-bubble { background: #fff; border: 1px solid #e5e5e5; }',
    '.tb-msg.user .tb-msg-bubble { background: var(--tb-gradient); color: #fff; }',
    '.tb-msg a { color: inherit; text-decoration: underline; word-break: break-all; }',
    '.tb-msg.user a { color: #fff; }',
    '.tb-live-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--tb-primary); margin-bottom: 4px; padding: 2px 8px; border-radius: 6px; background: rgba(99,102,241,.1); }',
    '.tb-link-card { display: block; margin-top: 8px; border-radius: 10px; overflow: hidden; border: 1px solid #e5e5e5; background: #fff; text-decoration: none; color: inherit; }',
    '.tb-link-card img { width: 100%; height: 100px; object-fit: cover; display: block; }',
    '.tb-link-card-body { padding: 10px 12px; }',
    '.tb-link-site { font-size: 11px; color: var(--tb-primary); font-weight: 600; margin-bottom: 2px; }',
    '.tb-link-title { font-size: 13px; font-weight: 600; line-height: 1.3; margin-bottom: 2px; color: #171717; }',
    '.tb-link-desc { font-size: 12px; color: #666; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }',
    '.tb-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; background: #fff; }',
    '.tb-input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; }',
    '.tb-input:focus { border-color: var(--tb-primary); }',
    '.tb-send { border: none; background: var(--tb-gradient); color: #fff; border-radius: 10px; padding: 0 16px; cursor: pointer; font-weight: 600; font-size: 14px; }',
    '.tb-send:disabled { opacity: .5; cursor: not-allowed; }',
    '.tb-typing { font-size: 12px; color: #888; padding: 4px 0; }',
    '.tb-powered { text-align: center; font-size: 10px; color: #aaa; padding: 6px; }',
  ].join('\n');

  var wrap = document.createElement('div');
  wrap.className = 'tb-wrap ' + (position === 'bottom-left' ? 'bl' : 'br');

  var panel = document.createElement('div');
  panel.className = 'tb-panel';

  var header = document.createElement('div');
  header.className = 'tb-header';
  header.innerHTML = '<div class="tb-header-left"><h3>Assistant</h3></div><button class="tb-close" aria-label="Close">×</button>';

  var messages = document.createElement('div');
  messages.className = 'tb-messages';

  var typing = document.createElement('div');
  typing.className = 'tb-typing';
  typing.style.display = 'none';
  typing.textContent = 'Thinking...';

  var inputRow = document.createElement('div');
  inputRow.className = 'tb-input-row';
  inputRow.innerHTML = '<input class="tb-input" placeholder="Ask a question..." /><button class="tb-send">Send</button>';

  var powered = document.createElement('div');
  powered.className = 'tb-powered';
  powered.innerHTML = 'Powered by <a href="https://jointavrion.com" target="_blank" rel="noopener" style="color:#888">Tavrion</a>';

  var bubble = document.createElement('button');
  bubble.className = 'tb-bubble';
  bubble.setAttribute('aria-label', 'Open chat');
  bubble.textContent = '💬';

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(typing);
  panel.appendChild(inputRow);
  panel.appendChild(powered);
  wrap.appendChild(panel);
  wrap.appendChild(bubble);

  shadow.appendChild(styles);
  shadow.appendChild(wrap);

  var input = shadow.querySelector('.tb-input');
  var sendBtn = shadow.querySelector('.tb-send');
  var closeBtn = shadow.querySelector('.tb-close');
  var headerLeft = shadow.querySelector('.tb-header-left');

  function applyTheme() {
    var p = config.primaryColor;
    var a = config.accentColor || p;
    var gradient = 'linear-gradient(135deg, ' + p + ', ' + a + ')';
    shadow.host.style.setProperty('--tb-primary', p);
    shadow.host.style.setProperty('--tb-gradient', gradient);
    bubble.style.background = gradient;
    header.style.background = gradient;
    titleUpdate();
  }

  function titleUpdate() {
    var html = '<h3>' + config.name + '</h3>';
    if (config.logoUrl) {
      html = '<img class="tb-logo" src="' + proxyUrl + encodeURIComponent(config.logoUrl) + '" alt="" />' + html;
    }
    headerLeft.innerHTML = html;
  }

  function extractUrls(text, extra) {
    var urls = [];
    var seen = {};
    var re = /https?:\/\/[^\s<>"')\]]+/gi;
    var m;
  function add(u) {
      u = u.replace(/[.,;:!?)]+$/, '');
      if (!seen[u]) { seen[u] = 1; urls.push(u); }
    }
    if (extra) extra.forEach(function (s) { if (s && s.url) add(s.url); });
    while ((m = re.exec(text)) !== null && urls.length < 4) add(m[0]);
    return urls.slice(0, 3);
  }

  function linkifyText(text, isUser) {
    var parts = text.split(/(https?:\/\/[^\s<>"')\]]+)/gi);
    var frag = document.createDocumentFragment();
    parts.forEach(function (part) {
      if (/^https?:\/\//i.test(part)) {
        var a = document.createElement('a');
        a.href = part.replace(/[.,;:!?)]+$/, '');
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = a.href;
        frag.appendChild(a);
      } else {
        frag.appendChild(document.createTextNode(part));
      }
    });
    return frag;
  }

  function fetchPreview(url) {
    var headers = anonKey ? { Authorization: 'Bearer ' + anonKey } : {};
    return fetch(previewUrl + encodeURIComponent(url), { headers: headers })
      .then(function (r) { return r.json(); })
      .catch(function () {
        try { return { url: url, title: new URL(url).hostname, description: '', siteName: new URL(url).hostname }; }
        catch (e) { return null; }
      });
  }

  function renderLinkCard(preview) {
    var card = document.createElement('a');
    card.className = 'tb-link-card';
    card.href = preview.url;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    if (preview.image) {
      var imgWrap = document.createElement('div');
      imgWrap.style.height = '100px';
      imgWrap.style.overflow = 'hidden';
      var img = document.createElement('img');
      img.src = preview.image;
      img.alt = '';
      img.onerror = function () { imgWrap.style.display = 'none'; };
      imgWrap.appendChild(img);
      card.appendChild(imgWrap);
    }
    var body = document.createElement('div');
    body.className = 'tb-link-card-body';
    var site = document.createElement('div');
    site.className = 'tb-link-site';
    try { site.textContent = preview.siteName || new URL(preview.url).hostname; } catch (e) { site.textContent = preview.url; }
    var title = document.createElement('div');
    title.className = 'tb-link-title';
    title.textContent = preview.title || preview.url;
    body.appendChild(site);
    body.appendChild(title);
    if (preview.description) {
      var desc = document.createElement('div');
      desc.className = 'tb-link-desc';
      desc.textContent = preview.description;
      body.appendChild(desc);
    }
    card.appendChild(body);
    return card;
  }

  function addMessage(text, role, meta) {
    meta = meta || {};
    var wrap = document.createElement('div');
    wrap.className = 'tb-msg-wrap ' + role;

    if (meta.liveFetched && role === 'bot') {
      var badge = document.createElement('div');
      badge.className = 'tb-live-badge';
      badge.textContent = '⚡ Live data fetched';
      wrap.appendChild(badge);
    }

    var msg = document.createElement('div');
    msg.className = 'tb-msg ' + role;
    var bubble = document.createElement('div');
    bubble.className = 'tb-msg-bubble';
    bubble.appendChild(linkifyText(text, role === 'user'));
    msg.appendChild(bubble);
    wrap.appendChild(msg);

    if (role === 'bot') {
      var urls = extractUrls(text, meta.sources);
      urls.forEach(function (url) {
        fetchPreview(url).then(function (preview) {
          if (preview && !preview.error) wrap.appendChild(renderLinkCard(preview));
        });
      });
    }

    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function setLoading(on, userText) {
    typing.style.display = on ? 'block' : 'none';
    typing.textContent = on && userText && /\b(price|pricing|cost|plan|fee|how much)\b/i.test(userText)
      ? 'Fetching live pricing data...'
      : 'Thinking...';
    sendBtn.disabled = on;
    input.disabled = on;
  }

  function apiCall(body) {
    return fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  function sendMessage() {
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage(text, 'user');
    setLoading(true, text);

    apiCall({ embedKey: botKey, message: text, sessionId: sessionId })
      .then(function (data) {
        setLoading(false);
        if (data.error) {
          addMessage('Sorry, something went wrong. Please try again.', 'bot');
          return;
        }
        if (data.sessionId) sessionId = data.sessionId;
        addMessage(data.reply, 'bot', { sources: data.sources, liveFetched: data.liveFetched });
      })
      .catch(function () {
        setLoading(false);
        addMessage('Connection error. Please try again.', 'bot');
      });
  }

  bubble.addEventListener('click', function () {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    bubble.textContent = isOpen ? '×' : '💬';
    if (isOpen && messages.children.length === 0) {
      addMessage(config.welcomeMessage, 'bot');
    }
  });

  closeBtn.addEventListener('click', function () {
    isOpen = false;
    panel.classList.remove('open');
    bubble.textContent = '💬';
  });

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') sendMessage();
  });

  apiCall({ embedKey: botKey, action: 'config' })
    .then(function (data) {
      if (data.bot) {
        config = {
          primaryColor: data.bot.primaryColor || config.primaryColor,
          secondaryColor: data.bot.secondaryColor || config.secondaryColor,
          accentColor: data.bot.accentColor || config.accentColor,
          logoUrl: data.bot.logoUrl || null,
          name: data.bot.name || config.name,
          welcomeMessage: data.bot.welcomeMessage || config.welcomeMessage,
        };
        applyTheme();
      }
    })
    .catch(function () { applyTheme(); });
})();
