// EcoPulse - Core Dashboard Controller
// Dynamic OpenStreetMap Nominatim Geocoding, Open-Meteo Weather/AQI, Three.js 3D & VAYU Bot

(function () {
  const { calculateOverallCPCB, getCPCBCategory } = window.CPCB || {};
  const EcoPulseScene = window.EcoPulseScene;
  const AuthDatabaseManager = window.AuthDatabaseManager;
  const VayuChatbot = window.VayuChatbot;

  class EcoPulseApp {
    constructor() {
      this.currentCity = {
        name: 'Vasai-Virar',
        displayName: 'Vasai-Virar, Palghar District, Maharashtra, India',
        lat: 19.3919,
        lon: 72.8397
      };

      this.liveAQIData = null;
      this.liveWeatherData = null;
      this.historyChart = null;

      this.init();
    }

    async init() {
      // 1. Initialize Three.js 3D Viewport
      if (EcoPulseScene) {
        this.scene3D = new EcoPulseScene('three-canvas-container');
      }

      // 2. Initialize Auth & Database Manager
      if (AuthDatabaseManager) {
        this.authManager = new AuthDatabaseManager(
          (user) => this.renderUserProfile(user),
          (alert) => this.renderTopAlert(alert)
        );
      }

      // 3. Initialize VAYU Chatbot with real-time dynamic context callback
      if (VayuChatbot) {
        this.vayuBot = new VayuChatbot('vayu-bot-root', () => ({
          cityName: this.currentCity.name,
          aqi: this.liveAQIData ? this.liveAQIData.aqi : 68,
          category: this.liveAQIData ? this.liveAQIData.category : 'Satisfactory',
          temp: this.liveWeatherData ? Math.round(this.liveWeatherData.current.temperature_2m) : 30,
          dominant: this.liveAQIData ? this.liveAQIData.dominantPollutant : 'PM2.5'
        }));
      }

      // 4. Setup UI Listeners
      this.setupEventListeners();

      // 5. Fetch initial data for default locality
      await this.fetchCityData(this.currentCity.lat, this.currentCity.lon, this.currentCity.name, this.currentCity.displayName);
    }

    setupEventListeners() {
      const searchForm = document.getElementById('search-form');
      const searchInput = document.getElementById('search-input');
      const suggestionsBox = document.getElementById('search-suggestions');

      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (!query) return;
        suggestionsBox.innerHTML = '';
        suggestionsBox.classList.add('hidden');
        await this.geocodeAndSearch(query);
      });

      // Dark/Night Mode Theme Toggle
      const themeBtn = document.getElementById('theme-toggle-btn');
      const savedTheme = localStorage.getItem('ecopulse_theme');
      if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
      }
      if (themeBtn) {
        themeBtn.addEventListener('click', () => {
          const isDark = document.body.classList.toggle('dark-mode');
          localStorage.setItem('ecopulse_theme', isDark ? 'dark' : 'light');
          if (this.scene3D) this.scene3D.onResize();
        });
      }

      // Autocomplete Real-Time Search Handler (Trigger on 2+ characters)
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = searchInput.value.trim();
        if (query.length < 2) {
          suggestionsBox.innerHTML = '';
          suggestionsBox.classList.add('hidden');
          return;
        }
        debounceTimer = setTimeout(() => this.fetchSearchSuggestions(query), 280);
      });

      // Keyboard navigation for search input
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          suggestionsBox.classList.add('hidden');
        }
      });

      document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
          suggestionsBox.classList.add('hidden');
        }
      });

      const gpsBtn = document.getElementById('gps-locate-btn');
      gpsBtn.addEventListener('click', () => this.locateUserGPS());

      document.querySelectorAll('.quick-city-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const city = chip.getAttribute('data-city');
          searchInput.value = city;
          this.geocodeAndSearch(city);
        });
      });

      const modeButtons = document.querySelectorAll('.three-mode-btn');
      modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          modeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const mode = btn.getAttribute('data-mode');
          if (this.scene3D) this.scene3D.setMode(mode);
          this.updateHUDMode(mode);
        });
      });

      const resetCamBtn = document.getElementById('reset-camera-btn');
      if (resetCamBtn && this.scene3D) {
        resetCamBtn.addEventListener('click', () => this.scene3D.resetCamera());
      }

      this.setupAuthModal();
    }

    updateHUDMode(mode) {
      const el = document.getElementById('hud-mode-text');
      if (!el) return;
      if (mode === 'aqi') el.textContent = 'CPCB Pollution Fog Simulation';
      else if (mode === 'rain') el.textContent = '3D Real-time Raindrop System';
      else if (mode === 'sun') el.textContent = 'Solar Ray & High Temp Glare';
    }

    async geocodeAndSearch(query) {
      this.setSearchLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const data = await res.json();

        if (!data || data.length === 0) {
          alert(`Location "${query}" could not be found. Please try another city or country.`);
          this.setSearchLoading(false);
          return;
        }

        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        const addr = item.address || {};
        const cityName = addr.city || addr.town || addr.municipality || addr.district || addr.state || addr.country || query;
        const displayName = item.display_name;

        await this.fetchCityData(lat, lon, cityName, displayName);
      } catch (err) {
        console.error('Geocoding error:', err);
        alert('Unable to connect to Geocoding service. Please check network.');
      } finally {
        this.setSearchLoading(false);
      }
    }

    // Real-Time Autocomplete with matching options (e.g. Pratapgarh, UP vs Pratapgarh, Rajasthan)
    async fetchSearchSuggestions(query) {
      const suggestionsBox = document.getElementById('search-suggestions');
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        const items = await res.json();

        if (!items || items.length === 0) {
          suggestionsBox.classList.add('hidden');
          return;
        }

        suggestionsBox.innerHTML = items.map(item => {
          const addr = item.address || {};
          const primaryName = addr.city || addr.town || addr.village || addr.municipality || addr.district || addr.county || item.display_name.split(',')[0].trim();
          const statePart = addr.state || addr.region || '';
          const countryPart = addr.country || '';
          const contextSubtitle = [statePart, countryPart].filter(Boolean).join(', ') || item.display_name;

          return `
            <div class="suggestion-item" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${primaryName}" data-display="${item.display_name}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <div class="suggestion-text-main">${primaryName} ${statePart ? `<span style="font-weight:400; opacity:0.75; font-size:0.78rem;">(${statePart})</span>` : ''}</div>
                <div class="suggestion-text-sub">${contextSubtitle}</div>
              </div>
            </div>
          `;
        }).join('');

        suggestionsBox.classList.remove('hidden');

        suggestionsBox.querySelectorAll('.suggestion-item').forEach(el => {
          el.addEventListener('click', () => {
            const lat = parseFloat(el.getAttribute('data-lat'));
            const lon = parseFloat(el.getAttribute('data-lon'));
            const name = el.getAttribute('data-name');
            const display = el.getAttribute('data-display');
            document.getElementById('search-input').value = name;
            suggestionsBox.classList.add('hidden');
            this.fetchCityData(lat, lon, name, display);
          });
        });
      } catch (e) {
        console.warn('Suggestions failed:', e);
      }
    }

    locateUserGPS() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      const gpsBtn = document.getElementById('gps-locate-btn');
      gpsBtn.textContent = 'Locating GPS...';

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            const addr = data.address || {};
            const cityName = addr.city || addr.town || addr.suburb || 'Your GPS Location';
            await this.fetchCityData(latitude, longitude, cityName, data.display_name);
          } catch {
            await this.fetchCityData(latitude, longitude, 'My Location', `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
          } finally {
            gpsBtn.innerHTML = `
              <svg class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v8M8 12h8"/>
              </svg>
              GPS Auto-Detect
            `;
          }
        },
        (err) => {
          alert('Unable to retrieve GPS coordinates: ' + err.message);
          gpsBtn.innerHTML = `
            <svg class="w-4 h-4 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 2a10 10 0 100 20 10 10 0 000-20zM12 8v8M8 12h8"/>
            </svg>
            GPS Auto-Detect
          `;
        }
      );
    }

    async fetchCityData(lat, lon, cityName, displayName) {
      this.currentCity = { lat, lon, name: cityName, displayName };

      // Format coordinates explicitly for header card
      const latFormatted = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
      const lonFormatted = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;

      // Update Header Cards Dynamically - Zero hardcoded strings
      document.getElementById('current-city-title').textContent = cityName;
      document.getElementById('current-city-address').textContent = displayName;
      document.getElementById('current-lat-lon').textContent = `Lat: ${latFormatted}, Lon: ${lonFormatted}`;
      document.getElementById('hud-city-name').textContent = cityName;

      try {
        // 1. Air Quality API
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index&hourly=pm10,pm2_5,nitrogen_dioxide&timezone=auto`;
        const aqiRes = await fetch(aqiUrl);
        const aqiJson = await aqiRes.json();

        // 2. Weather Forecast API
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability&timezone=auto`;
        const weatherRes = await fetch(weatherUrl);
        const weatherJson = await weatherRes.json();

        this.liveWeatherData = weatherJson;

        const cur = aqiJson.current || {};
        const pollutants = {
          pm2_5: cur.pm2_5 !== undefined ? cur.pm2_5 : 35,
          pm10: cur.pm10 !== undefined ? cur.pm10 : 65,
          nitrogen_dioxide: cur.nitrogen_dioxide !== undefined ? cur.nitrogen_dioxide : 24,
          sulphur_dioxide: cur.sulphur_dioxide !== undefined ? cur.sulphur_dioxide : 12,
          carbon_monoxide: cur.carbon_monoxide !== undefined ? cur.carbon_monoxide : 450,
          ozone: cur.ozone !== undefined ? cur.ozone : 48
        };

        const cpcbResult = calculateOverallCPCB(pollutants);
        this.liveAQIData = cpcbResult;

        this.renderAQICard(cpcbResult);
        this.renderWeatherCard(weatherJson);
        this.renderPollutantsGrid(pollutants, cpcbResult.subIndices);
        this.renderHistoryChart(aqiJson.hourly);

        if (this.scene3D) {
          this.scene3D.updateAQI(cpcbResult.aqi, cpcbResult.color);
        }

        if (weatherJson.current && weatherJson.current.precipitation > 0.5) {
          const rainBtn = document.querySelector('[data-mode="rain"]');
          if (rainBtn) rainBtn.click();
        }

        if (this.vayuBot) {
          this.vayuBot.updateContextIndicator();
        }

      } catch (e) {
        console.error('Failed to load air quality/weather data:', e);
      }
    }

    renderAQICard(cpcb) {
      const aqiNumberEl = document.getElementById('aqi-number');
      const categoryBadgeEl = document.getElementById('aqi-category-badge');
      const aqiMarkerEl = document.getElementById('aqi-scale-marker');
      const adviceTextEl = document.getElementById('health-advice-text');
      const dominantEl = document.getElementById('dominant-pollutant-text');

      aqiNumberEl.textContent = cpcb.aqi;
      aqiNumberEl.style.color = cpcb.color;

      categoryBadgeEl.textContent = cpcb.category;
      categoryBadgeEl.style.backgroundColor = cpcb.bgColor;
      categoryBadgeEl.style.color = cpcb.textColor;
      categoryBadgeEl.style.border = `1.5px solid ${cpcb.color}`;

      const pct = Math.min(100, Math.max(0, (cpcb.aqi / 500) * 100));
      aqiMarkerEl.style.left = `${pct}%`;
      aqiMarkerEl.style.borderColor = cpcb.color;

      adviceTextEl.textContent = cpcb.healthAdvice;
      if (dominantEl) {
        dominantEl.textContent = `Dominant Pollutant: ${cpcb.dominantPollutant} (Calculated via Indian CPCB Formula)`;
      }
    }

    renderWeatherCard(weather) {
      const cur = weather.current || {};
      const temp = Math.round(cur.temperature_2m || 30);
      const feels = Math.round(cur.apparent_temperature || temp);
      const humidity = cur.relative_humidity_2m || 65;
      const wind = cur.wind_speed_10m || 8.5;
      const pressure = Math.round(cur.surface_pressure || 1012);
      const precip = cur.precipitation || 0;

      document.getElementById('weather-temp-val').textContent = `${temp}°C`;
      document.getElementById('weather-feels-val').textContent = `Feels like ${feels}°C`;
      document.getElementById('weather-condition-val').textContent = this.getWeatherConditionText(cur.weather_code, precip);
      document.getElementById('micro-humidity').textContent = `${humidity}%`;
      document.getElementById('micro-wind').textContent = `${wind} km/h`;
      document.getElementById('micro-pressure').textContent = `${pressure} hPa`;
      document.getElementById('micro-precip').textContent = `${precip} mm`;
    }

    getWeatherConditionText(code, precip) {
      if (precip > 1.0) return 'Rainfall Active';
      if (code === 0) return 'Clear Sunny Sky';
      if (code >= 1 && code <= 3) return 'Partly Cloudy';
      if (code >= 45 && code <= 48) return 'Haze & Foggy';
      if (code >= 51 && code <= 67) return 'Drizzle / Light Rain';
      if (code >= 71 && code <= 77) return 'Snow / Cold Air';
      if (code >= 80 && code <= 82) return 'Rain Showers';
      if (code >= 95) return 'Thunderstorm Warning';
      return 'Mild Overcast';
    }

    renderPollutantsGrid(pollutants, subIndices) {
      const defs = [
        { key: 'pm2_5', name: 'PM2.5', label: 'Fine Particles', unit: 'µg/m³', max: 250 },
        { key: 'pm10', name: 'PM10', label: 'Coarse Dust', unit: 'µg/m³', max: 400 },
        { key: 'nitrogen_dioxide', name: 'NO₂', label: 'Nitrogen Dioxide', unit: 'µg/m³', max: 200 },
        { key: 'sulphur_dioxide', name: 'SO₂', label: 'Sulphur Dioxide', unit: 'µg/m³', max: 150 },
        { key: 'carbon_monoxide', name: 'CO', label: 'Carbon Monoxide', unit: 'mg/m³', max: 15, isCO: true },
        { key: 'ozone', name: 'O₃', label: 'Surface Ozone', unit: 'µg/m³', max: 180 }
      ];

      const container = document.getElementById('pollutants-grid-container');
      container.innerHTML = defs.map(d => {
        let val = pollutants[d.key];
        if (d.isCO && val > 50) val = val / 1000;
        val = val !== undefined ? Number(val).toFixed(d.isCO ? 2 : 1) : '--';

        const subIdx = subIndices ? (subIndices[d.key] || 0) : 0;
        const cat = getCPCBCategory ? getCPCBCategory(subIdx) : { bg: '#f1f5f9', text: '#334155', color: '#94a3b8', label: 'Moderate' };
        const fillPct = Math.min(100, (subIdx / 500) * 100);

        return `
          <div class="pollutant-card">
            <div class="pollutant-card-top">
              <span class="pollutant-name">${d.name}</span>
              <span class="pollutant-sub-badge" style="background:${cat.bg}; color:${cat.text}; border:1px solid ${cat.color}40;">
                ${cat.label}
              </span>
            </div>
            <div>
              <div class="pollutant-value">${val}</div>
              <div class="pollutant-unit">${d.unit} (CPCB Sub-Idx: ${subIdx})</div>
            </div>
            <div class="pollutant-progress-bar">
              <div class="pollutant-progress-fill" style="width: ${fillPct}%; background-color: ${cat.color};"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    renderHistoryChart(hourly) {
      if (!hourly || !hourly.time || !window.Chart) return;

      const ctx = document.getElementById('aqi-trend-chart');
      if (!ctx) return;

      const times = hourly.time.slice(0, 24).map(t => {
        const d = new Date(t);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });
      const pm25Data = hourly.pm2_5 ? hourly.pm2_5.slice(0, 24) : [];
      const pm10Data = hourly.pm10 ? hourly.pm10.slice(0, 24) : [];

      if (this.historyChart) {
        this.historyChart.destroy();
      }

      this.historyChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: times,
          datasets: [
            {
              label: 'PM2.5 (µg/m³)',
              data: pm25Data,
              borderColor: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              borderWidth: 2.5,
              fill: true,
              tension: 0.35,
              pointRadius: 2,
              pointHoverRadius: 6
            },
            {
              label: 'PM10 (µg/m³)',
              data: pm10Data,
              borderColor: '#94a3b8',
              backgroundColor: 'transparent',
              borderWidth: 1.5,
              borderDash: [4, 4],
              tension: 0.35,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: 600 } }
            },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: 700 },
              bodyFont: { family: 'Plus Jakarta Sans', size: 11 },
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } }
            },
            y: {
              grid: { color: '#f1f5f9' },
              ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } },
              beginAtZero: true
            }
          }
        }
      });
    }

    renderTopAlert(alert) {
      const banner = document.getElementById('top-alert-banner');
      if (!banner) return;

      banner.className = `top-alert-banner alert-${alert.type}`;
      document.getElementById('alert-headline').textContent = alert.title;
      document.getElementById('alert-description').textContent = alert.message;
      document.getElementById('alert-city-tag').textContent = alert.cityName;
      banner.classList.remove('hidden');

      const closeBtn = document.getElementById('close-alert-btn');
      closeBtn.onclick = () => banner.classList.add('hidden');
    }

    renderUserProfile(user) {
      const authBtn = document.getElementById('header-auth-btn');
      if (!user) {
        authBtn.innerHTML = `
          <svg class="w-4 h-4 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Sign In / Register
        `;
      } else {
        const initial = (user.full_name || user.email || 'U').charAt(0).toUpperCase();
        authBtn.innerHTML = `
          <div class="user-avatar-mini">${initial}</div>
          <span>${user.full_name || user.email.split('@')[0]}</span>
        `;
      }
    }

    setupAuthModal() {
      const modal = document.getElementById('auth-modal');
      const openBtn = document.getElementById('header-auth-btn');
      const closeBtn = document.getElementById('modal-close-btn');
      const googleBtn = document.getElementById('google-signin-btn');
      const authForm = document.getElementById('email-auth-form');
      const emailInput = document.getElementById('auth-email');
      const passInput = document.getElementById('auth-password');
      const nameInput = document.getElementById('auth-name');
      const errorEl = document.getElementById('auth-error-msg');

      const authFormView = document.getElementById('auth-form-view');
      const profileView = document.getElementById('profile-view');
      const profileName = document.getElementById('profile-full-name');
      const profileEmail = document.getElementById('profile-email');
      const favInput = document.getElementById('profile-fav-city-input');
      const favSaveBtn = document.getElementById('profile-fav-city-save');
      const logoutBtn = document.getElementById('logout-btn');

      openBtn.addEventListener('click', () => {
        const user = this.authManager ? this.authManager.currentUser : null;
        if (user) {
          authFormView.classList.add('hidden');
          profileView.classList.remove('hidden');
          profileName.textContent = user.full_name;
          profileEmail.textContent = user.email;
          favInput.value = user.favorite_city || 'Vasai';
        } else {
          authFormView.classList.remove('hidden');
          profileView.classList.add('hidden');
          emailInput.value = '';
          passInput.value = '';
          nameInput.value = '';
          errorEl.style.display = 'none';
        }
        modal.classList.remove('hidden');
      });

      closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });

      googleBtn.addEventListener('click', async () => {
        try {
          if (this.authManager) await this.authManager.signInWithGoogle();
          modal.classList.add('hidden');
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
      });

      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';

        const email = emailInput.value;
        const pass = passInput.value;
        const name = nameInput.value;

        try {
          if (this.authManager) await this.authManager.loginWithEmail(email, pass, name);
          modal.classList.add('hidden');
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
      });

      favSaveBtn.addEventListener('click', () => {
        const newCity = favInput.value.trim();
        if (newCity && this.authManager) {
          this.authManager.updateFavoriteCity(newCity);
          alert(`Favorite locality updated to "${newCity}". Alert banner will track this location.`);
        }
      });

      logoutBtn.addEventListener('click', () => {
        if (this.authManager) this.authManager.logout();
        modal.classList.add('hidden');
      });
    }

    setSearchLoading(isLoading) {
      const btn = document.getElementById('search-submit-btn');
      if (isLoading) {
        btn.innerHTML = `Searching...`;
      } else {
        btn.innerHTML = `Search`;
      }
    }
  }

  window.EcoPulseApp = EcoPulseApp;

  window.addEventListener('DOMContentLoaded', () => {
    window.ecoPulse = new EcoPulseApp();
  });
})();
