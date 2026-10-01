// "VAYU" - Super Smart Disaster & Emergency AI Assistant
// Context-aware academic environmental and civil defense advisory engine

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.VayuChatbot = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  class VayuChatbot {
    constructor(containerId, getLiveContextCallback) {
      this.container = document.getElementById(containerId);
      this.getLiveContext = getLiveContextCallback;
      this.isOpen = false;
      this.messages = [];

      this.initKnowledgeBase();
      this.render();
      this.setupListeners();
      this.sendInitialGreeting();
    }

    initKnowledgeBase() {
      this.faq = [
        {
          triggers: ['flood', 'waterlogging', 'heavy rain', 'deluge', 'submerged'],
          title: 'NDRF Flood & Heavy Rainfall Safety Protocol',
          response: (ctx) => `🌊 **FLOOD & MONSOON DISASTER PROTOCOL (${ctx.cityName}):**
1. **Move to Elevated Ground:** If water levels rise near watercourses or low-lying areas in ${ctx.cityName}, do not wait; immediately evacuate to multi-story shelters.
2. **Electrical Isolation:** Switch off primary circuit breakers and unplug all mains. Never walk or wade through stagnant water near downed utility poles.
3. **Automotive Warning:** Never attempt to drive through moving water. 15 cm of water can stall an engine; 30 cm can float most passenger cars.
4. **Emergency Helpline:** Dial **1078** (National Disaster Response Force - NDRF) or **112** for emergency evacuation.`
        },
        {
          triggers: ['heat', 'heatwave', 'sunstroke', 'dehydration', 'temperature'],
          title: 'IMD Heatwave & Hyperthermia Defense',
          response: (ctx) => `☀️ **HEATWAVE & THERMAL EMERGENCY ADVISORY (${ctx.cityName}):**
*Current Temperature in ${ctx.cityName}:* **${ctx.temp || 32}°C**
1. **Hydration Strategy:** Drink ORS (Oral Rehydration Salts), homemade lemon water, or buttermilk regularly—even if not feeling thirsty.
2. **Peak Sunlight Window:** Avoid direct exposure between 12:00 PM and 3:30 PM. Use umbrellas, wide-brim hats, and UV400 eyewear.
3. **Heatstroke Symptoms:** Dizziness, nausea, lack of sweating despite heat, confusion. If observed, immediately move patient to shade, apply ice packs to axillae/groin, and call **102** (Ambulance).`
        },
        {
          triggers: ['aqi', 'cpcb', 'smog', 'pollution', 'pm2.5', 'pm10', 'mask', 'n95'],
          title: 'CPCB Smog & Respiratory Protection',
          response: (ctx) => `🌫️ **CPCB AIR QUALITY ADVISORY (${ctx.cityName}):**
*Live CPCB Index:* **${ctx.aqi || 68} (${ctx.category || 'Satisfactory'})** | *Dominant:* **${ctx.dominant || 'PM2.5'}**
1. **Respirator Standard:** Cloth masks filter less than 20% of PM2.5. Always use certified **N95 or FFP2** respirators with an airtight facial seal.
2. **Indoor Air Control:** Keep windows shut during early morning inversions. Run HEPA filtration units in recirculate mode.
3. **Vulnerable Demographics:** Asthmatics and COPD patients should keep emergency bronchodilators within reach. Limit vigorous outdoor exercise.`
        },
        {
          triggers: ['contact', 'helpline', 'phone', 'emergency', 'ndrf', 'police', 'ambulance'],
          title: 'Official Indian Emergency Helplines',
          response: () => `🚨 **OFFICIAL NATIONAL EMERGENCY HELPLINES (INDIA):**
- 🛡️ **National Emergency Unified:** [112](tel:112)
- 🌊 **NDRF Disaster Control:** [1078](tel:1078) / [011-24363260](tel:01124363260)
- 🚑 **Medical Ambulance:** [102](tel:102) / [108](tel:108)
- 👮 **Police Control Room:** [100](tel:100)
- 🚒 **Fire & Rescue:** [101](tel:101)
- ⚡ **Disaster Management (State EOC):** [1070](tel:1070)
- 👶 **Childline Helpline:** [1098](tel:1098)`
        },
        {
          triggers: ['cpcb scale', 'bands', 'categories', 'levels', 'index'],
          title: 'CPCB National Air Quality Index (NAQI) Scale',
          response: () => `📊 **INDIAN CPCB NAQI OFFICIAL CLASSIFICATION BANDS:**
- 🟢 **Good (0 - 50):** Minimal impact on human health.
- 🍏 **Satisfactory (51 - 100):** Minor breathing discomfort to sensitive people.
- 🟡 **Moderate (101 - 200):** Breathing discomfort for people with lung/heart disease and children.
- 🟠 **Poor (201 - 300):** Breathing discomfort to most people on prolonged exposure.
- 🔴 **Very Poor (301 - 400):** Respiratory illness on prolonged exposure.
- 🟣 **Severe (401 - 500):** Impacts healthy people, seriously impairs those with existing conditions.`
        }
      ];
    }

    render() {
      this.container.innerHTML = `
        <!-- Floating Glassmorphic Trigger -->
        <button id="vayu-toggle-btn" class="vayu-fab shadow-xl" aria-label="Open VAYU AI Assistant">
          <div class="vayu-fab-pulse"></div>
          <div class="vayu-avatar-ring">
            <svg width="20" height="20" class="text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span class="vayu-fab-label">VAYU AI Emergency</span>
          <span class="vayu-status-dot" title="Live Sensor Connected"></span>
        </button>

        <!-- Glassmorphic Chat Window -->
        <div id="vayu-chat-window" class="vayu-window hidden">
          <!-- Header -->
          <div class="vayu-header">
            <div class="flex items-center gap-3">
              <div class="vayu-header-badge">
                <svg width="18" height="18" class="text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-slate-800 text-sm tracking-tight">VAYU Emergency Bot</h3>
                  <span class="vayu-verified-pill">CPCB Aware</span>
                </div>
                <p class="text-xs text-slate-500 font-medium" id="vayu-context-indicator">Live Context: Vasai-Virar</p>
              </div>
            </div>
            <button id="vayu-close-btn" class="vayu-btn-icon" aria-label="Close Chat">
              <svg width="18" height="18" class="text-slate-500 hover:text-slate-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Emergency Helpline Bar (One-Tap Dials) -->
          <div class="vayu-helpline-hub">
            <div class="vayu-helpline-label">Instant Emergency Dials:</div>
            <div class="vayu-helpline-chips">
              <a href="tel:112" class="vayu-help-chip" title="National Emergency Unified">🚨 112 All</a>
              <a href="tel:1078" class="vayu-help-chip" title="NDRF Disaster Relief">🌊 1078 NDRF</a>
              <a href="tel:102" class="vayu-help-chip" title="Ambulance Emergency">🚑 102 Amb</a>
              <a href="tel:100" class="vayu-help-chip" title="Police Emergency">👮 100 Police</a>
              <a href="tel:101" class="vayu-help-chip" title="Fire Services">🚒 101 Fire</a>
            </div>
          </div>

          <!-- Chat Messages Container -->
          <div id="vayu-messages" class="vayu-messages-body"></div>

          <!-- Quick Action Chips -->
          <div class="vayu-quick-chips">
            <button class="vayu-chip" data-query="Flood Safety Tips">🌊 Flood Precautions</button>
            <button class="vayu-chip" data-query="CPCB AQI Scale">📊 CPCB AQI Scale</button>
            <button class="vayu-chip" data-query="Emergency Contacts">🚨 Emergency Contacts</button>
            <button class="vayu-chip" data-query="Heatstroke First Aid">☀️ Heatwave Advisory</button>
            <button class="vayu-chip" data-query="N95 Mask Guidance">😷 N95 Mask Rules</button>
          </div>

          <!-- Input Box -->
          <form id="vayu-form" class="vayu-input-form" autocomplete="off">
            <input 
              type="text" 
              id="vayu-input" 
              placeholder="Ask VAYU (e.g. Flooding in my area, PM2.5 risk...)" 
              autocomplete="off"
              class="vayu-input-field"
            />
            <button type="submit" class="vayu-send-btn" aria-label="Send Message">
              <svg width="16" height="16" class="text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      `;
    }

    setupListeners() {
      const toggleBtn = document.getElementById('vayu-toggle-btn');
      const closeBtn = document.getElementById('vayu-close-btn');
      const windowEl = document.getElementById('vayu-chat-window');
      const form = document.getElementById('vayu-form');
      const input = document.getElementById('vayu-input');

      toggleBtn.addEventListener('click', () => {
        this.isOpen = !this.isOpen;
        windowEl.classList.toggle('hidden', !this.isOpen);
        if (this.isOpen) {
          this.updateContextIndicator();
          input.focus();
        }
      });

      closeBtn.addEventListener('click', () => {
        this.isOpen = false;
        windowEl.classList.add('hidden');
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        this.handleUserMessage(text);
        input.value = '';
      });

      this.container.querySelectorAll('.vayu-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const query = chip.getAttribute('data-query');
          this.handleUserMessage(query);
        });
      });
    }

    sendInitialGreeting() {
      const ctx = this.getLiveContext ? this.getLiveContext() : { cityName: 'Vasai-Virar', aqi: 68, category: 'Satisfactory', temp: 30 };
      const greeting = `Namaste! I am **VAYU**, your real-time academic environmental & civil defense assistant.

I am connected to live sensors for **${ctx.cityName}** (AQI: ${ctx.aqi || '--'}, Temp: ${ctx.temp || '--'}°C).

Tap any quick chip below or ask me about flood protocols, severe smog guidance, extreme heatwave precautions, or official emergency numbers!`;

      this.addMessage('bot', greeting);
    }

    updateContextIndicator() {
      const ctx = this.getLiveContext ? this.getLiveContext() : { cityName: 'Vasai-Virar' };
      const el = document.getElementById('vayu-context-indicator');
      if (el) {
        el.textContent = `Live Context: ${ctx.cityName} (AQI: ${ctx.aqi || '--'})`;
      }
    }

    handleUserMessage(userText) {
      this.addMessage('user', userText);

      const ctx = this.getLiveContext ? this.getLiveContext() : { cityName: 'Vasai-Virar', aqi: 68, category: 'Satisfactory', temp: 30 };
      this.updateContextIndicator();

      const lower = userText.toLowerCase();

      let responseText = null;
      for (const item of this.faq) {
        if (item.triggers.some(t => lower.includes(t))) {
          responseText = item.response(ctx);
          break;
        }
      }

      if (!responseText) {
        responseText = `🤖 **VAYU Real-Time Analysis for ${ctx.cityName}:**
Current monitored status: **${ctx.category || 'Satisfactory'} (AQI: ${ctx.aqi || 68})** with ambient temperature **${ctx.temp || 30}°C**.

Based on environmental engineering standards:
- Always check daily local municipal and CPCB meteorological advisories.
- For respiratory protection when AQI exceeds 150, use N95 respirators.
- For immediate fire, flood or medical emergencies anywhere in India, dial **112**.

Would you like details on **Flood Safety**, **AQI Scale**, or **Emergency Helpline Numbers**?`;
      }

      setTimeout(() => {
        this.addMessage('bot', responseText);
      }, 400);
    }

    addMessage(sender, markdownText) {
      const container = document.getElementById('vayu-messages');
      if (!container) return;

      const msgEl = document.createElement('div');
      msgEl.className = `vayu-msg ${sender === 'user' ? 'vayu-msg-user' : 'vayu-msg-bot'}`;

      let formatted = markdownText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="vayu-link" target="_blank">$1</a>')
        .replace(/\n/g, '<br/>');

      msgEl.innerHTML = `
        <div class="vayu-msg-content">${formatted}</div>
        <div class="vayu-msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      `;

      container.appendChild(msgEl);
      container.scrollTop = container.scrollHeight;
    }
  }

  return VayuChatbot;
});
