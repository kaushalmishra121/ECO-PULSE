# EcoPulse - Real-Time 3D Climate, Weather & CPCB AQI Platform
### Vasai-Virar & Global Real-Time Air Quality Index (AQI) & Weather Platform
*Department of Environmental Engineering | Official Real-Time Indian CPCB Standard Air Quality & Meteorological Platform*

---

## 🌟 Overview
**EcoPulse** is an official-grade, high-end 3D Environmental Science (ESE) dashboard engineered to deliver real-time atmospheric intelligence, micro-climate metrics, and official Indian Central Pollution Control Board (CPCB) Air Quality Index (NAQI) classifications. 

Built with **Google's clean AQI widget visual architecture** and **Light Glassmorphism**, EcoPulse combines live geocoding, high-resolution meteorological models, and a GPU-accelerated **Three.js 3D urban simulation**.

---

## 🚀 Key Architectural Highlights

### 1. UI & Design System (Light Glassmorphism)
- **Visual Structure:** High-contrast Google Clean AQI card layout with prominent AQI numbers, dynamic status badges, and official CPCB 6-color band spectrum.
- **Color Palette:** Pure White (`#FFFFFF`), Canvas (`#F8FAFC`), Frosted Glass Panels (`rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(16px)`), and Deep Slate typography (`#0F172A`).
- **Aesthetics:** Rounded corners (`rounded-2xl`, `rounded-3xl`), soft ambient elevation shadows, zero dark AI template tropes.

### 2. Real-Time Geocoding & Open-Meteo Integration
- **Search Engine:** Live OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/search?format=json&q={query}`).
- **Zero Hardcoded Names:** Searching any global locality (e.g., *"Norway"*, *"Vasai"*, *"Delhi"*, *"Tokyo"*, *"London"*) dynamically refreshes all station cards, coordinates, pollutants, weather conditions, and 3D simulation atmosphere.
- **Explicit Real-Time Coordinates:** Accurately extracted and displayed in the main location header (e.g., `Lat: 19.3919° N, Lon: 72.8397° E`).
- **GPS Auto-Detect:** One-click device geolocation via HTML5 Geolocation API with reverse geocoding.

### 3. Indian CPCB NAQI Standard Calculation Engine
- **Formula:** Dynamic sub-index calculation:
  $$I_p = \frac{I_{Hi} - I_{Lo}}{B_{Hi} - B_{Lo}} \times (C_p - B_{Lo}) + I_{Lo}$$
- **Full Spectrum Coverage:**
  - 🟢 **Good (0 - 50):** Minimal impact on human health.
  - 🍏 **Satisfactory (51 - 100):** Minor breathing discomfort to sensitive groups.
  - 🟡 **Moderate (101 - 200):** Breathing discomfort to people with lung/asthma/heart conditions.
  - 🟠 **Poor (201 - 300):** Breathing discomfort to most people on prolonged exposure.
  - 🔴 **Very Poor (301 - 400):** Respiratory illness on prolonged exposure.
  - 🟣 **Severe (401 - 500+):** Serious impacts on healthy people and vulnerable populations.
- **Core Parameters Monitored:** PM2.5, PM10, NO₂, SO₂, CO, and O₃.

### 4. Hyper-Realistic Three.js 3D Canvas
- **Sleek Responsive Canvas:** Responsive mid-sized 3D viewport container (`height: 380px; max-width: 100%; border-radius: 16px; overflow: hidden;`) with perfectly aligned HUD metrics.
- **Procedural 3D City:** Box geometries rendered with concrete/brick procedural facade textures, subtle bump maps, and crisp slate wireframe outlines (`#64748B`) over light building bodies (`#E2E8F0`) for high contrast against smog/fog backgrounds.
- **Vegetation:** Segmented low-poly green trees with bark cylinders and foliage canopies planted along avenues.
- **Camera Controls (FIX ZOOM):** Powered by `THREE.OrbitControls` with `enableZoom = true`, `minDistance = 5`, and `maxDistance = 300` to completely eliminate camera freezing or lockups.
- **3 Dynamic Environmental View Switchers:**
  1. 🌫️ **AQI Pollution View:** Live particle haze/smog dynamic density and color matching official CPCB bands.
  2. 🌧️ **3D Rain Simulation:** Falling raindrop particle system with cloudy sky fog (`THREE.FogExp2`) and wet ground plane reflections.
  3. ☀️ **High Temp / Sun View:** Warm directional sunlight, solar flare disk, and bright clear atmospheric rendering.

### 5. Night Mode / Slate Dark Theme Toggle
- **Sun/Moon Toggle:** Instant light/dark theme switch in the top navigation bar.
- **Color Aesthetics:** Seamlessly transforms panels, card backgrounds, glassmorphism cards, and text to a slate dark aesthetic (`#0F172A` background, glass cards `#1E293B`) while preserving the 3D WebGL atmospheric canvas.
- **State Persistence:** Preserves user theme preference across sessions via `localStorage`.

### 5. Supabase & Real Authentication Modal
- **Dual Sign-In:** "Sign in with Google" OAuth and "Email / Password Login".
- **Strict RFC Email Validation:** Enforced via `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- **Database Schema (User Profiles):** Stores `user_id`, `email`, `full_name`, `favorite_city` (e.g., *"Vasai-Virar"*), and notification preferences.
- **Automatic Favorite Locality Alert:** Proactively checks live weather for the saved city upon login and renders top banner alerts (*"Good News! Vasai AQI is Satisfactory"*, *"Rainfall Expected"*, *"Stay Hydrated"*).

### 6. "VAYU" - Smart AI Emergency & Disaster Chatbot
- **Floating Glassmorphic Assistant:** Bottom-right widget with glowing sensor status.
- **Dynamic Context Injection:** Reads the current station's live AQI and temperature to provide tailored civil defense advice.
- **Disaster Protocols:** Real-time actionable guidance on Floods/Waterlogging, Extreme Heatwaves, Heavy Smog, Cyclones, and Earthquakes.
- **One-Tap Indian Emergency Helpline Dials:**
  - 🚨 **National Emergency Unified:** `112`
  - 🌊 **NDRF Disaster Management:** `1078` / `011-24363260`
  - 🚑 **Ambulance Emergency:** `102`
  - 👮 **Police Control Room:** `100`
  - 🚒 **Fire Services:** `101`

---

## 📁 Project Structure

```
ese project/
├── index.html         # Main dashboard HTML (Google Clean AQI layout & 3D canvas mount)
├── style.css          # Light glassmorphism design system & responsive styling
├── cpcb-calc.js       # Official Indian CPCB NAQI calculation algorithms & breakpoints
├── three-scene.js     # Three.js 3D city scene with procedural textures, wireframes, & 3 modes
├── auth-db.js         # Supabase & persistent user storage, RFC email validation, & alert banner
├── vayu-bot.js        # VAYU Smart Disaster & Emergency AI Assistant with helpline dials
├── app.js             # Core controller linking geocoding, APIs, 3D viewport, and UI
└── README.md          # Comprehensive technical and academic documentation
```

---

## ⚡ How to Run
Simply open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave, Safari):
- **Double click** [index.html](file:///c:/Users/KUSHAL%20%20MISHRA/OneDrive/Desktop/ese%20project/index.html) or right-click -> Open with Chrome / Edge.
- No build process, npm install, or local server required! Zero CORS restrictions on local asset loading.
