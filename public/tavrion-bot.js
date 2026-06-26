(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var botKey = script.getAttribute('data-bot-key');
  var apiBase = script.getAttribute('data-api-url') || 'https://jilehijfjayayfumbrsl.supabase.co';
  var position = script.getAttribute('data-position') || 'bottom-right';

  if (!botKey) {
    console.error('[Tavrion Bot] Missing data-bot-key attribute');
    return;
  }

  var chatUrl = apiBase + '/functions/v1/tavrion-bot-chat';
  var sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  var config = { primaryColor: '#6366f1', name: 'Assistant', welcomeMessage: 'Hi! How can I help you?' };
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
    '.tb-bubble { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; color: #fff; font-size: 24px; box-shadow: 0 8px 32px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; transition: transform .2s; }',
    '.tb-bubble:hover { transform: scale(1.05); }',
    '.tb-panel { display: none; width: 380px; max-width: calc(100vw - 32px); height: 520px; max-height: calc(100vh - 100px); background: #fff; border-radius: 16px; box-shadow: 0 16px 48px rgba(0,0,0,.2); flex-direction: column; overflow: hidden; margin-bottom: 12px; }',
    '.tb-panel.open { display: flex; }',
    '.tb-header { padding: 16px 20px; color: #fff; display: flex; align-items: center; justify-content: space-between; }',
    '.tb-header h3 { font-size: 15px; font-weight: 600; }',
    '.tb-close { background: rgba(255,255,255,.2); border: none; color: #fff; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; font-size: 16px; }',
    '.tb-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #fafafa; }',
    '.tb-msg { max-width: 85%; padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; }',
    '.tb-msg.bot { background: #fff; border: 1px solid #e5e5e5; align-self: flex-start; }',
    '.tb-msg.user { background: var(--tb-color); color: #fff; align-self: flex-end; }',
    '.tb-input-row { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; background: #fff; }',
    '.tb-input { flex: 1; border: 1px solid #ddd; border-radius: 10px; padding: 10px 12px; font-size: 14px; outline: none; }',
    '.tb-input:focus { border-color: var(--tb-color); }',
    '.tb-send { border: none; background: var(--tb-color); color: #fff; border-radius: 10px; padding: 0 16px; cursor: pointer; font-weight: 600; font-size: 14px; }',
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
  header.innerHTML = '<h3>Tavrion Bot</h3><button class="tb-close" aria-label="Close">×</button>';

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
  powered.innerHTML = 'Powered by <a href="https://jointavrion.com" target="_blank" style="color:#888">Tavrion</a>';

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
  var titleEl = shadow.querySelector('.tb-header h3');

  function applyTheme() {
    shadow.host.style.setProperty('--tb-color', config.primaryColor);
    bubble.style.background = config.primaryColor;
    header.style.background = config.primaryColor;
  }

  function addMessage(text, role) {
    var el = document.createElement('div');
    el.className = 'tb-msg ' + role;
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function setLoading(on) {
    typing.style.display = on ? 'block' : 'none';
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
    setLoading(true);

    apiCall({ embedKey: botKey, message: text, sessionId: sessionId })
      .then(function (data) {
        setLoading(false);
        if (data.error) {
          addMessage('Sorry, something went wrong. Please try again.', 'bot');
          return;
        }
        if (data.sessionId) sessionId = data.sessionId;
        addMessage(data.reply, 'bot');
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
          name: data.bot.name || config.name,
          welcomeMessage: data.bot.welcomeMessage || config.welcomeMessage,
        };
        titleEl.textContent = config.name;
        applyTheme();
      }
    })
    .catch(function () { applyTheme(); });
})();
