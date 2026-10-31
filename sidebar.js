
(() => {
  const CONVERSATIONS_KEY = 'omniai-conversations';
  const META_KEY = 'omniai-conversation-meta';
  const PROJECTS_KEY = 'omniai-projects';

  const $ = id => document.getElementById(id);

  let activeFilter = 'recent';
  let activeProject = null;
  let activeConversation = null;

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function conversations() {
    return read(CONVERSATIONS_KEY, []);
  }

  function metadata() {
    return read(META_KEY, {});
  }

  function projects() {
    return read(PROJECTS_KEY, []);
  }

  function saveMetadata(data) {
    localStorage.setItem(META_KEY, JSON.stringify(data));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  }

  function refresh() {
    renderProjects();
    renderChats();
  }

  function renderProjects() {
    const box = $('sidebar-projects');
    if (!box) return;

    const list = projects();

    box.innerHTML = list.map(project => `
      <button
        class="sidebar-project-item ${activeProject === project.id ? 'active' : ''}"
        data-project="${escapeHTML(project.id)}"
        title="${escapeHTML(project.name)}"
      >
        ▣
        <span class="sidebar-project-title">${escapeHTML(project.name)}</span>
      </button>
    `).join('');

    box.querySelectorAll('[data-project]').forEach(button => {
      button.addEventListener('click', () => {
        activeProject = button.dataset.project;
        activeFilter = 'project';
        updateActiveFilter();
        refresh();
      });
    });
  }

  function renderChats() {
    const box = $('sidebar-recents');
    if (!box) return;

    const search = ($('sidebar-search')?.value || '').trim().toLowerCase();
    const all = conversations();
    const meta = metadata();

    let list = all.filter(chat => {
      const info = meta[chat.id] || {};

      if (activeFilter === 'pinned' && !info.pinned) return false;
      if (activeFilter === 'archived' && !info.archived) return false;
      if (activeFilter === 'recent' && info.archived) return false;

      if (activeFilter === 'project') {
        if (info.projectId !== activeProject || info.archived) return false;
      }

      return true;
    });

    if (search) {
      list = all.filter(chat => {
        const info = meta[chat.id] || {};
        const matchesText = (
          (chat.title || '') + ' ' +
          (chat.messages || []).map(m => m.content || '').join(' ')
        ).toLowerCase().includes(search);

        if (!matchesText) return false;

        if (activeFilter === 'pinned') return !!info.pinned;
        if (activeFilter === 'archived') return !!info.archived;
        if (activeFilter === 'recent') return !info.archived;
        if (activeFilter === 'project') {
          return info.projectId === activeProject && !info.archived;
        }

        return true;
      });
    }

    if (!list.length) {
      const messages = {
        recent: 'Your recent conversations will appear here.',
        pinned: 'You have no pinned conversations yet.',
        archived: 'Your archived conversations will appear here.',
        project: 'No conversations in this project yet.'
      };

      box.innerHTML = `<p class="sidebar-empty">${messages[activeFilter]}</p>`;
      return;
    }

    box.innerHTML = list.map(chat => {
      const info = meta[chat.id] || {};
      const title = chat.title || 'New conversation';

      return `
        <div class="sidebar-chat-item ${activeConversation === chat.id ? 'active' : ''}"
             data-chat-row="${escapeHTML(chat.id)}">

          <button class="sidebar-chat-title"
                  data-open-chat="${escapeHTML(chat.id)}"
                  title="${escapeHTML(title)}">
            ${escapeHTML(title)}
          </button>

          <div class="sidebar-chat-actions">
            <button data-pin-chat="${escapeHTML(chat.id)}"
                    title="${info.pinned ? 'Unpin chat' : 'Pin chat'}">
              ${info.pinned ? '★' : '☆'}
            </button>

            <button data-project-chat="${escapeHTML(chat.id)}"
                    title="Move to project">
              ▣
            </button>

            <button data-archive-chat="${escapeHTML(chat.id)}"
                    title="${info.archived ? 'Restore chat' : 'Archive chat'}">
              ${info.archived ? '↶' : '▤'}
            </button>
          </div>

        </div>
      `;
    }).join('');

    box.querySelectorAll('[data-open-chat]').forEach(button => {
      button.addEventListener('click', () => {
        activeConversation = button.dataset.openChat;

        document.dispatchEvent(new CustomEvent('omniai:open-conversation', {
          detail: { id: activeConversation }
        }));

        refresh();
      });
    });

    box.querySelectorAll('[data-pin-chat]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.pinChat;
        const data = metadata();

        data[id] = data[id] || {};
        data[id].pinned = !data[id].pinned;

        saveMetadata(data);
        refresh();
      });
    });

    box.querySelectorAll('[data-archive-chat]').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.dataset.archiveChat;
        const data = metadata();

        data[id] = data[id] || {};
        data[id].archived = !data[id].archived;

        saveMetadata(data);
        refresh();
      });
    });

    box.querySelectorAll('[data-project-chat]').forEach(button => {
      button.addEventListener('click', () => {
        moveToProject(button.dataset.projectChat);
      });
    });
  }

  function moveToProject(chatId) {
    const list = projects();

    if (!list.length) {
      alert('Create a project first.');
      return;
    }

    const choices = list.map((project, index) =>
      `${index + 1}. ${project.name}`
    ).join('\n');

    const answer = prompt(
      'Enter the number of the project:\n\n' + choices +
      '\n\nEnter 0 to remove this chat from its project.'
    );

    if (answer === null) return;

    const number = Number(answer);
    if (!Number.isInteger(number) || number < 0 || number > list.length) {
      alert('Please enter a valid project number.');
      return;
    }

    const data = metadata();
    data[chatId] = data[chatId] || {};

    data[chatId].projectId = number === 0
      ? null
      : list[number - 1].id;

    saveMetadata(data);
    refresh();
  }

  function createProject() {
    const name = prompt('What would you like to name your project?');

    if (!name || !name.trim()) return;

    const list = projects();

    const project = {
      id: 'project-' + Date.now(),
      name: name.trim()
    };

    list.push(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));

    activeProject = project.id;
    activeFilter = 'project';

    updateActiveFilter();
    refresh();
  }

  function updateActiveFilter() {
    document.querySelectorAll('[data-sidebar-view]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.sidebarView === activeFilter
      );
    });
  }

  function showNewChat() {
    document.dispatchEvent(new CustomEvent('omniai:new-chat'));
  }

  function init() {
    $('sidebar-new-chat')?.addEventListener('click', showNewChat);

    $('create-project')?.addEventListener('click', createProject);

    $('sidebar-search')?.addEventListener('input', renderChats);

    document.querySelectorAll('[data-sidebar-view]').forEach(button => {
      button.addEventListener('click', () => {
        activeFilter = button.dataset.sidebarView;
        activeProject = null;
        updateActiveFilter();
        refresh();
      });
    });

    $('show-all-recents')?.addEventListener('click', () => {
      activeFilter = 'recent';
      activeProject = null;
      if ($('sidebar-search')) $('sidebar-search').value = '';
      updateActiveFilter();
      refresh();
    });

    document.addEventListener('omniai:conversations-updated', refresh);

    // Keep the sidebar synchronized when chat messages change.
    const messages = $('messages');

    if (messages && window.MutationObserver) {
      new MutationObserver(() => {
        refresh();
      }).observe(messages, { childList: true });
    }

    refresh();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose a small refresh function for the main app.
  window.omniSidebarRefresh = refresh;
})();
