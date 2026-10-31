
const state = {
  models: [],
  selected: '',
  messages: [],
  currentConversationId: null,
  busy: false,
  modelLoading: true
};

const $ = id => document.getElementById(id);

const esc = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

function status(el, available, text) {
  if (!el) return;
  el.className = 'status ' + (available ? 'available' : 'unavailable');
  el.textContent = text;
}

/* ==============================
   CONVERSATION STORAGE
============================== */

function getConversations() {
  try {
    return JSON.parse(
      localStorage.getItem('omniai-conversations') || '[]'
    );
  } catch {
    return [];
  }
}

function saveCurrentConversation() {
  if (!state.messages.length) return;

  const conversations = getConversations();

  const firstUserMessage = state.messages.find(
    message => message.role === 'user'
  );

  if (!firstUserMessage) return;

  if (!state.currentConversationId) {
    state.currentConversationId =
      Date.now().toString() + Math.random().toString(36).slice(2, 7);
  }

  const conversation = {
    id: state.currentConversationId,
    title: firstUserMessage.content.slice(0, 65),
    date: new Date().toLocaleString(),
    messages: state.messages
  };

  const existingIndex = conversations.findIndex(
    item => item.id === state.currentConversationId
  );

  if (existingIndex >= 0) {
    conversations[existingIndex] = conversation;
  } else {
    conversations.unshift(conversation);
  }

  conversations.sort(
    (a, b) => Number(b.id.slice(0, 13)) - Number(a.id.slice(0, 13))
  );

  try {
    localStorage.setItem(
      'omniai-conversations',
      JSON.stringify(conversations.slice(0, 30))
    );
  } catch (error) {
    console.error('Could not save conversation:', error);
  }

  renderHistory();
  renderDashboard();
}

function renderHistory() {
  const box = $('history-list');
  if (!box) return;

  const conversations = getConversations();

  if (!conversations.length) {
    box.innerHTML = '<p>Your saved conversations will appear here.</p>';
    return;
  }

  box.innerHTML = conversations.map(item => `
    <button
      type="button"
      class="history-item ${
        item.id === state.currentConversationId ? 'active' : ''
      }"
      data-conversation="${esc(item.id)}"
    >
      <strong>${esc(item.title)}</strong>
      <small>${esc(item.date)}</small>
    </button>
  `).join('');

  box.querySelectorAll('[data-conversation]').forEach(button => {
    button.addEventListener('click', () => {
      openConversation(button.dataset.conversation);
    });
  });
}

function openConversation(id) {
  const conversation = getConversations().find(
    item => item.id === id
  );

  if (!conversation) return;

  state.currentConversationId = conversation.id;
  state.messages = conversation.messages || [];

  $('messages').innerHTML = '';
  $('chat-error').classList.add('hidden');
  $('suggestions').classList.add('hidden');

  state.messages.forEach(message => {
    addMessage(
      message.role,
      message.content,
      message.role === 'assistant' ? 'OmniAI' : undefined
    );
  });

  renderHistory();
  switchTab('chat');
}

function clearHistory() {
  if (!confirm('Delete all saved conversations?')) return;

  localStorage.removeItem('omniai-conversations');

  state.messages = [];
  state.currentConversationId = null;

  $('messages').innerHTML = '';
  $('chat-error').classList.add('hidden');
  $('suggestions').classList.remove('hidden');

  renderHistory();
  renderDashboard();
}

/* ==============================
   DASHBOARD
============================== */

function renderDashboard() {
  const items = getConversations();

  $('dashboard-model-count').textContent = state.models.length;
  $('dashboard-work-count').textContent = items.length;

  $('recent-workspaces').innerHTML = items.length
    ? items.slice(0, 5).map(item => `
        <p>
          ✳ ${esc(item.title)}
          <small>· ${esc(item.date)}</small>
        </p>
      `).join('')
    : '<p>Your recent conversations will appear here.</p>';

  $('dashboard-gateway-status').textContent = state.models.length
    ? `${state.models.length} connected model(s) detected. Your provider gateway is responding.`
    : 'No connected models detected. Check your provider configuration.';
}

/* ==============================
   LOAD AI MODELS
============================== */

async function loadModels() {
  try {
    const r = await fetch('/.netlify/functions/models');
    const d = await r.json();

    if (!r.ok) {
      throw Error(d.error || 'The model gateway is not configured.');
    }

    state.models = Array.isArray(d.models) ? d.models : [];

    state.selected =
      state.models.find(m => /gpt.?6/i.test(m.id + ' ' + m.name))?.id ||
      state.models[0]?.id || '';

    $('gateway-label').textContent = state.models.length
      ? 'Connected models: ' + state.models.length
      : 'Gateway needs setup';

    $('gateway-label').title = state.models.length
      ? 'Loaded from your configured provider'
      : 'Check your provider configuration.';

    $('selected-model-label').textContent =
      state.models.find(m => m.id === state.selected)?.name ||
      'No model connected';

    const g = state.models.find(
      m => /gpt.?6/i.test(m.id + ' ' + m.name)
    );

    status($('gpt6-status'), !!g, g ? 'Connected' : 'Not connected');
    status($('compare-gpt6'), !!g, g ? 'Connected' : 'Not connected');

    $('gpt6-copy').textContent = g
      ? 'Detected in your live provider catalog and ready to use.'
      : 'Featured model slot. It activates only if your configured provider lists a GPT-6 model.';

    renderModelOptions();
    renderDiscover();
    renderCompare();

    if (!state.models.length) {
      $('gateway-note').innerHTML =
        'No connected models found. Add your provider API key in <a href="https://app.netlify.com/" target="_blank" rel="noreferrer">Netlify site settings</a>, then redeploy.';
    } else {
      $('gateway-note').textContent =
        'Connected to your configured AI provider. Model availability depends on your API account.';
    }

  } catch (e) {
    $('gateway-label').textContent = 'Gateway not configured';

    $('gateway-note').textContent =
      'AI chat needs a provider API key. Check OPENAI_API_KEY in Netlify environment variables.';

    status($('gpt6-status'), false, 'Not connected');
    status($('compare-gpt6'), false, 'Not connected');

    $('gpt6-copy').textContent =
      'This is a featured model slot, not a claim that GPT-6 API access is available.';

    $('selected-model-label').textContent = 'No model connected';

    renderDiscover();
    renderCompare();

  } finally {
    state.modelLoading = false;
    renderDashboard();
  }
}

/* ==============================
   MODEL OPTIONS
============================== */

function renderModelOptions() {
  const box = $('model-options');

  box.innerHTML = state.models.length
    ? state.models.map(m => `
        <button type="button"
          class="model-option ${m.id === state.selected ? 'selected' : ''}"
          data-model="${esc(m.id)}">
          <span>
            <strong>${esc(m.name)}</strong>
            <small>${esc(m.id)}</small>
          </span>
          ${m.id === state.selected ? '<span class="check">✓</span>' : ''}
        </button>
      `).join('')
    : '<p class="gateway-note">No models available. Configure a provider API key in Netlify.</p>';

  box.querySelectorAll('[data-model]').forEach(b => {
    b.addEventListener('click', () => {
      state.selected = b.dataset.model;

      $('selected-model-label').textContent =
        state.models.find(m => m.id === state.selected)?.name || state.selected;

      $('model-menu').classList.add('hidden');
      renderModelOptions();
    });
  });

  $('send-btn').disabled = !state.selected || state.busy;
}

/* ==============================
   DISCOVER MODELS
============================== */

function renderDiscover() {
  const q = ($('model-search')?.value || '').toLowerCase();

  const models = state.models.filter(m =>
    (m.id + ' ' + m.name).toLowerCase().includes(q)
  );

  const g = state.models.find(
    m => /gpt.?6/i.test(m.id + ' ' + m.name)
  );

  let cards = `
    <article class="catalog-card featured">
      <div class="catalog-icon">✳</div>
      <div class="catalog-top">
        <span class="eyebrow">FEATURED MODEL</span>
        <span class="status ${g ? 'available' : 'unavailable'}">
          ${g ? 'Connected' : 'Not connected'}
        </span>
      </div>
      <h3>GPT-6</h3>
      <p>${g
        ? 'Detected in your connected model catalog.'
        : 'Featured model slot for advanced reasoning, writing, and coding when your provider exposes it.'
      }</p>
      <button data-use="${g ? esc(g.id) : ''}">
        ${g ? 'Chat with GPT-6' : 'Check provider models'} ↗
      </button>
    </article>
  `;

  cards += models.map(m => `
    <article class="catalog-card">
      <div class="catalog-icon">◈</div>
      <div class="catalog-top">
        <span class="eyebrow">LIVE MODEL</span>
        <span class="status available">Connected</span>
      </div>
      <h3>${esc(m.name)}</h3>
      <p>Available through your configured AI provider. Exact capabilities depend on the model and account.</p>
      <button data-use="${esc(m.id)}">Open chat ↗</button>
      <small>${esc(m.id)}</small>
    </article>
  `).join('');

  $('model-grid').innerHTML = cards;

  if (!state.models.length) {
    $('model-grid').innerHTML += `
      <div class="empty-state">
        No live models detected.<br>
        Configure your provider in Netlify, then reload this page.
      </div>
    `;
  }

  $('model-grid').querySelectorAll('[data-use]').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.use) {
        state.selected = b.dataset.use;

        $('selected-model-label').textContent =
          state.models.find(m => m.id === state.selected)?.name || state.selected;

        renderModelOptions();
      }

      switchTab('chat');
      $('prompt').focus();
    });
  });
}

/* ==============================
   COMPARE MODELS
============================== */

function renderCompare() {
  const g = state.models.find(
    m => /gpt.?6/i.test(m.id + ' ' + m.name)
  );

  $('compare-live-models').innerHTML = state.models.map(m => `
    <div class="compare-row">
      <strong>${esc(m.name)}<small>${esc(m.id)}</small></strong>
      <span>Check provider documentation for exact strengths</span>
      <span class="status available">Connected</span>
    </div>
  `).join('');

  if (g) {
    status($('compare-gpt6'), true, 'Connected');
  }
}

/* ==============================
   NAVIGATION
============================== */

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('hidden', v.id !== 'view-' + tab);
  });

  $('model-menu').classList.add('hidden');
}

document.querySelectorAll('.tab').forEach(b => {
  b.addEventListener('click', () => switchTab(b.dataset.tab));
});

document.querySelectorAll('[data-go]').forEach(b => {
  b.addEventListener('click', () => {
    switchTab(b.dataset.go);

    if (b.dataset.prompt) {
      $('prompt').value = b.dataset.prompt;
      $('prompt').dispatchEvent(new Event('input'));
      $('prompt').focus();
    }
  });
});

/* ==============================
   MODEL MENU
============================== */

$('model-picker').addEventListener('click', () =>
  $('model-menu').classList.toggle('hidden')
);

$('close-model-menu').addEventListener('click', () =>
  $('model-menu').classList.add('hidden')
);

/* ==============================
   NEW CHAT
============================== */

$('new-chat').addEventListener('click', () => {
  state.messages = [];
  state.currentConversationId = null;

  $('messages').innerHTML = '';
  $('chat-error').classList.add('hidden');
  $('suggestions').classList.remove('hidden');
  $('prompt').value = '';

  renderHistory();
  switchTab('chat');
  $('prompt').focus();
});

/* ==============================
   CLEAR CHAT HISTORY
============================== */

$('clear-history')?.addEventListener('click', clearHistory);

/* ==============================
   PROMPT INPUT
============================== */

$('prompt').addEventListener('input', () => {
  $('send-btn').disabled =
    !$('prompt').value.trim() || !state.selected || state.busy;
});

$('prompt').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('chat-form').requestSubmit();
  }
});

document.querySelectorAll('[data-prompt]').forEach(b => {
  b.addEventListener('click', () => {
    $('prompt').value = b.dataset.prompt;
    $('prompt').dispatchEvent(new Event('input'));
    $('prompt').focus();
  });
});

$('model-search').addEventListener('input', renderDiscover);

/* ==============================
   DISPLAY CHAT MESSAGES
============================== */

function addMessage(role, content, model) {
  const wrap = document.createElement('div');
  wrap.className = 'message';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'assistant' ? '✳' : 'Y';

  const body = document.createElement('div');
  body.className = 'message-body';

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = role === 'assistant' ? (model || 'OmniAI') : 'You';

  const text = document.createElement('div');
  text.className = 'message-content';
  text.textContent = content;

  body.append(meta, text);
  wrap.append(avatar, body);

  $('messages').append(wrap);
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  return wrap;
}

/* ==============================
   CHAT SUBMISSION
============================== */

$('chat-form').addEventListener('submit', async e => {
  e.preventDefault();

  const prompt = $('prompt').value.trim();

  if (!prompt || state.busy) return;

  if (!state.selected) {
    $('chat-error').textContent =
      'No connected model is available. Configure a provider in Netlify.';
    $('chat-error').classList.remove('hidden');
    return;
  }

  state.messages.push({ role: 'user', content: prompt });
  addMessage('user', prompt);

  // Save the user's message immediately.
  // It remains saved even if the provider returns an error.
  saveCurrentConversation();

  $('prompt').value = '';
  $('suggestions').classList.add('hidden');
  $('chat-error').classList.add('hidden');

  state.busy = true;
  $('send-btn').disabled = true;

  const waiting = document.createElement('div');
  waiting.className = 'message';

  waiting.innerHTML = `
    <div class="avatar">✳</div>
    <div class="message-body">
      <div class="message-meta">AI is thinking</div>
      <div class="typing"><i></i><i></i><i></i></div>
    </div>
  `;

  $('messages').append(waiting);

  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: state.selected,
        messages: state.messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw Error(data.error || 'The model could not answer. Please try again.');
    }

    state.messages.push({
      role: 'assistant',
      content: data.content
    });

    waiting.remove();

    addMessage(
      'assistant',
      data.content,
      state.models.find(m => m.id === state.selected)?.name || state.selected
    );

    // Save the assistant's reply too.
    saveCurrentConversation();

  } catch (err) {
    waiting.remove();

    $('chat-error').textContent =
      err.message || 'Could not connect to the model provider.';

    $('chat-error').classList.remove('hidden');

  } finally {
    state.busy = false;

    $('send-btn').disabled =
      !state.selected || !$('prompt').value.trim();

    $('prompt').focus();
  }
});

/* ==============================
   TOOLS
============================== */

document.querySelectorAll('[data-tool]').forEach(b => {
  b.addEventListener('click', () => {
    const t = b.dataset.tool;

    if (t === 'writing' || t === 'coding') {
      switchTab('chat');

      $('prompt').value = t === 'coding'
        ? 'Help me plan, build, or debug this code: '
        : 'Help me research and write about: ';

      $('prompt').dispatchEvent(new Event('input'));
      $('prompt').focus();

    } else if (t === 'prompts') {
      switchTab('chat');

      $('prompt').value =
        'Help me create a reusable, high-quality prompt template for: ';

      $('prompt').dispatchEvent(new Event('input'));
      $('prompt').focus();

    } else {
      alert(
        'This tool needs a separate ' + t +
        ' provider integration. It is not connected yet.'
      );
    }
  });
});

/* ==============================
   START OMNIAI
============================== */

renderHistory();
renderDashboard();
loadModels();
switchTab('dashboard');
