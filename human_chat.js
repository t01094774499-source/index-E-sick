// Real-time Human-to-Human Community Chat Module
class HumanChatManager {
  constructor() {
    this.username = localStorage.getItem('platform_chat_user') || `테크참여자_${Math.floor(Math.random() * 899 + 100)}`;
    this.messages = [];
    this.lastMessageId = 0;
    this.pollInterval = null;

    this.initDOM();
    this.bindEvents();
    this.startPolling();
  }

  initDOM() {
    this.usernameInput = document.getElementById('humanChatUsername');
    this.messagesContainer = document.getElementById('humanChatMessages');
    this.chatForm = document.getElementById('humanChatForm');
    this.chatInput = document.getElementById('humanChatInput');
    this.userCountBadge = document.getElementById('humanChatActiveUsers');

    if (this.usernameInput) {
      this.usernameInput.value = this.username;
    }
  }

  bindEvents() {
    if (this.usernameInput) {
      this.usernameInput.addEventListener('change', () => {
        const val = this.usernameInput.value.trim();
        if (val) {
          this.username = val;
          localStorage.setItem('morning_chat_user', val);
        }
      });
    }

    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }
  }

  async startPolling() {
    await this.fetchMessages();
    this.pollInterval = setInterval(() => {
      this.fetchMessages();
    }, 1800);
  }

  async fetchMessages() {
    try {
      const resp = await fetch('/api/human-chat');
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          const hasNew = data.length !== this.messages.length || (data.length > 0 && data[data.length - 1].id !== this.lastMessageId);
          if (hasNew) {
            this.messages = data;
            if (data.length > 0) {
              this.lastMessageId = data[data.length - 1].id;
            }
            this.renderMessages();
          }
        }
      }
    } catch (e) {
      // Gentle polling ignore on transient network drop
    }
  }

  async sendMessage() {
    const text = this.chatInput?.value.trim();
    if (!text) return;

    this.chatInput.value = '';
    const payload = {
      user: this.username,
      text: text
    };

    try {
      const resp = await fetch('/api/human-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) {
          this.messages = data;
          if (data.length > 0) {
            this.lastMessageId = data[data.length - 1].id;
          }
          this.renderMessages();
        }
      }
    } catch (e) {
      console.error('Failed to send human chat message:', e);
    }
  }

  renderMessages() {
    if (!this.messagesContainer) return;
    this.messagesContainer.innerHTML = '';

    this.messages.forEach(msg => {
      const isMe = msg.user === this.username && !msg.isSystem;

      if (msg.isSystem) {
        const sysDiv = document.createElement('div');
        sysDiv.className = 'human-system-msg';
        sysDiv.textContent = `📢 ${msg.text}`;
        this.messagesContainer.appendChild(sysDiv);
        return;
      }

      const row = document.createElement('div');
      row.className = `human-msg-row ${isMe ? 'me' : 'other'}`;

      if (!isMe) {
        const avatar = document.createElement('div');
        avatar.className = 'human-avatar';
        avatar.textContent = (msg.user || '익')[0].toUpperCase();
        row.appendChild(avatar);
      }

      const body = document.createElement('div');
      body.className = 'human-msg-body';

      if (!isMe) {
        const sender = document.createElement('div');
        sender.className = 'human-sender-name';
        sender.textContent = msg.user;
        body.appendChild(sender);
      }

      const bubbleWrap = document.createElement('div');
      bubbleWrap.className = 'human-bubble-wrap';

      const bubble = document.createElement('div');
      bubble.className = `human-bubble ${isMe ? 'bubble-me' : 'bubble-other'}`;
      bubble.textContent = msg.text;

      const time = document.createElement('span');
      time.className = 'human-time';
      time.textContent = msg.time || '';

      if (isMe) {
        bubbleWrap.appendChild(time);
        bubbleWrap.appendChild(bubble);
      } else {
        bubbleWrap.appendChild(bubble);
        bubbleWrap.appendChild(time);
      }

      body.appendChild(bubbleWrap);
      row.appendChild(body);
      this.messagesContainer.appendChild(row);
    });

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

window.HumanChatManager = HumanChatManager;
