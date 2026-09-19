// High-Intelligence Automotive & Mobility IT AI Assistant (gpt-5-mini)
class MobilityAIAssistant {
  constructor() {
    this.defaultKey = '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';
    this.apiKey = localStorage.getItem('neoarcade_openai_api_key') || this.defaultKey;
    this.isLoading = false;
    this.isKeyVisible = false;

    this.systemPrompt = `당신은 스마트 API 챗봇 & 3D 물리/리퀴드 시뮬레이션 플랫폼의 AI 수석 연구원입니다.
OpenAI API(gpt-5-mini) 기반의 고지능 컴퓨터 그래픽스 & 물리 엔진 테크 멘토로서, 3D 웹 그래픽스(WebGL/Three.js), 실시간 강체 역학(Rigid Body, Cannon.js, PhysX, Blender 물리), 실시간 3D 유체 역학(SPH: Smoothed Particle Hydrodynamics, 나비에-스토크스 방정식, Tait 상태방정식, 점성/표면장력), 충돌 감지 알고리즘, PBR 쉐이더 및 API 아키텍처에 대해 신뢰할 수 있는 정확한 지식을 제공합니다.

[핵심 원칙]
1. 사실 및 공학 기반 응답: 근거 없는 추측이나 과장(할루시네이션)을 철저히 배제하고 물리 법칙(뉴턴 역학, 오일러/베를레 적분, 나비에-스토크스 유체역학), 수치해석, 컴퓨터 그래픽스 파이프라인 사실에 입각하여 답변합니다.
2. 3D 물리 및 유체 시뮬레이션 지식:
   - 강체 역학(Rigid Body): 충돌 감지(Broadphase: SAP/Octree, Narrowphase: GJK/EPA), 임펄스 해결기(Impulse Solver), 반발계수 및 마찰력
   - 유체 역학(SPH Liquid): 공간 해시 그리드, Poly6 커널 밀도 추정, Spiky 압력 경도, 점성 라플라시안, 표면 장력 응집력, 고체-유체 충돌 및 물보라(Splash)
   - 블렌더 4대 뷰포트 셰이딩: 와이어프레임(Wireframe), 솔리드 클레이(MatCap Solid), 머티리얼 프리뷰(PBR Material), 렌더(Raytrace/Dynamic Lighting)
   - 물리 인터랙션 수식: 충격파 폭발(Radial Inverse-Square Impulse), 마우스 투척(Fling Velocity Momentum), 관성 모멘트
3. OpenAI API(gpt-5-mini) 연동 아키텍처, 실시간 다중 통신, WebGL 최적화 및 브라우저 성능 튜닝에 대해서도 논리적이고 명쾌하게 답변합니다.
4. 군더더기 없는 정중하고 신뢰감 있는 한국어로 답변합니다.`;

    this.messages = [
      { role: 'system', content: this.systemPrompt }
    ];

    this.initDOM();
    this.bindEvents();
    this.updateKeyStatusBadge();
  }

  initDOM() {
    this.keyInput = document.getElementById('aiApiKeyInput');
    this.toggleVisBtn = document.getElementById('aiToggleKeyBtn');
    this.keyBadge = document.getElementById('aiKeyStatusBadge');
    this.keyBar = document.getElementById('aiKeyBar');
    this.newChatBtn = document.getElementById('aiNewChatBtn');

    this.scrollArea = document.getElementById('aiChatScrollArea');
    this.welcomeHero = document.getElementById('aiWelcomeHero');
    this.messagesList = document.getElementById('aiMessagesList');
    this.chatForm = document.getElementById('aiChatForm');
    this.chatInput = document.getElementById('aiChatInput');
    this.sendBtn = document.getElementById('aiSendBtn');
    this.modelBadge = document.getElementById('aiModelBadge');

    if (this.keyInput) {
      this.keyInput.value = this.apiKey;
    }
  }

  bindEvents() {
    if (this.keyInput) {
      this.keyInput.addEventListener('input', () => {
        this.apiKey = this.keyInput.value.trim();
        localStorage.setItem('neoarcade_openai_api_key', this.apiKey);
        this.updateKeyStatusBadge();
      });
    }

    if (this.toggleVisBtn) {
      this.toggleVisBtn.addEventListener('click', () => {
        this.isKeyVisible = !this.isKeyVisible;
        this.keyInput.type = this.isKeyVisible ? 'text' : 'password';
        this.toggleVisBtn.innerHTML = this.isKeyVisible 
          ? '<i data-lucide="eye-off" style="width: 15px; height: 15px;"></i>'
          : '<i data-lucide="eye" style="width: 15px; height: 15px;"></i>';
        if (window.lucide) window.lucide.createIcons();
      });
    }

    if (this.newChatBtn) {
      this.newChatBtn.addEventListener('click', () => this.resetChat());
    }

    document.querySelectorAll('.ai-suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (prompt && this.chatInput) {
          this.chatInput.value = prompt;
          this.sendMessage();
        }
      });
    });

    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
  }

  updateKeyStatusBadge() {
    if (!this.keyBadge) return;
    const key = this.keyInput?.value.trim() || this.apiKey;
    if (key && key.length > 8) {
      this.keyBadge.textContent = '✅ 인증됨';
      this.keyBadge.className = 'key-status-indicator ready';
    } else {
      this.keyBadge.textContent = '⚠️ 미입력';
      this.keyBadge.className = 'key-status-indicator empty';
    }
  }

  resetChat() {
    this.messages = [
      { role: 'system', content: this.systemPrompt }
    ];
    if (this.messagesList) this.messagesList.innerHTML = '';
    if (this.welcomeHero) this.welcomeHero.style.display = 'flex';
    if (this.chatInput) {
      this.chatInput.value = '';
      this.chatInput.focus();
    }
  }

  async sendMessage() {
    const text = this.chatInput?.value.trim();
    if (!text || this.isLoading) return;

    const currentKey = this.keyInput?.value.trim() || this.apiKey;
    if (!currentKey) {
      if (this.keyBar) {
        this.keyBar.classList.add('highlight-alert');
        setTimeout(() => this.keyBar.classList.remove('highlight-alert'), 600);
      }
      this.keyInput?.focus();
      return;
    }

    if (this.welcomeHero) {
      this.welcomeHero.style.display = 'none';
    }

    this.appendUserMessage(text);
    this.messages.push({ role: 'user', content: text });

    this.chatInput.value = '';
    this.isLoading = true;
    if (this.sendBtn) this.sendBtn.disabled = true;

    const typingElem = this.showTypingIndicator();

    try {
      const isHttp = window.location.protocol.startsWith('http');
      const primaryUrl = isHttp ? '/api/chat' : 'https://api.openai.com/v1/chat/completions';
      const fallbackUrl = isHttp ? 'https://api.openai.com/v1/chat/completions' : '/api/chat';

      const sendRequest = async (url, modelName) => {
        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: this.messages
          })
        });
      };

      let response;
      try {
        response = await sendRequest(primaryUrl, 'gpt-5-mini');
        if (!response.ok && response.status !== 401) {
          response = await sendRequest(fallbackUrl, 'gpt-5-mini');
        }
      } catch (e1) {
        try {
          response = await sendRequest(fallbackUrl, 'gpt-5-mini');
        } catch (e2) {
          throw e2;
        }
      }

      // If gpt-5-mini model had issue, fallback to gpt-4o-mini
      if (!response.ok && (response.status === 400 || response.status === 404)) {
        try {
          const fallbackResp = await sendRequest(isHttp ? '/api/chat' : 'https://api.openai.com/v1/chat/completions', 'gpt-4o-mini');
          if (fallbackResp.ok) {
            response = fallbackResp;
            if (this.modelBadge) this.modelBadge.textContent = 'gpt-4o-mini (호환)';
          }
        } catch (mErr) {}
      }

      this.removeTypingIndicator(typingElem);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMsg = errorData.error?.message || `HTTP ${response.status} 통신 오류`;
        this.appendAssistantMessage(`❌ **오류 발생**: ${errMsg}\n\n*상단 API Key를 확인해 주세요.*`);
        return;
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '응답을 받지 못했습니다.';

      this.messages.push({ role: 'assistant', content: reply });
      this.appendAssistantMessage(reply);

    } catch (err) {
      console.error('Chat error:', err);
      this.removeTypingIndicator(typingElem);
      this.appendAssistantMessage(`❌ **통신 오류**: ${err.message || '서버와 연결할 수 없습니다.'}`);
    } finally {
      this.isLoading = false;
      if (this.sendBtn) this.sendBtn.disabled = false;
      this.scrollToBottom();
      this.chatInput?.focus();
    }
  }

  appendUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row user';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble user-bubble';
    bubble.textContent = text;

    row.appendChild(bubble);
    this.messagesList.appendChild(row);
    this.scrollToBottom();
  }

  appendAssistantMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const avatar = document.createElement('div');
    avatar.className = 'assistant-avatar';
    avatar.innerHTML = '<i data-lucide="bot" style="width: 18px; height: 18px;"></i>';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble assistant-bubble';
    bubble.innerHTML = this.parseMarkdown(text);

    row.appendChild(avatar);
    row.appendChild(bubble);
    this.messagesList.appendChild(row);

    if (window.lucide) window.lucide.createIcons();
    this.scrollToBottom();
  }

  showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row assistant typing-row';

    const avatar = document.createElement('div');
    avatar.className = 'assistant-avatar';
    avatar.innerHTML = '<i data-lucide="bot" style="width: 18px; height: 18px;"></i>';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble assistant-bubble typing-box';
    bubble.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

    row.appendChild(avatar);
    row.appendChild(bubble);
    this.messagesList.appendChild(row);

    if (window.lucide) window.lucide.createIcons();
    this.scrollToBottom();
    return row;
  }

  removeTypingIndicator(elem) {
    if (elem && elem.parentNode) {
      elem.parentNode.removeChild(elem);
    }
  }

  scrollToBottom() {
    if (this.scrollArea) {
      this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
    }
  }

  parseMarkdown(str) {
    let safe = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    safe = safe.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    safe = safe.replace(/\n/g, '<br>');

    return safe;
  }
}

window.MobilityAIAssistant = MobilityAIAssistant;
