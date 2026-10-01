// Indian Central Pollution Control Board (CPCB) NAQI Calculation Engine
// Reference: Official CPCB National Air Quality Index (NAQI) standards

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CPCB = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const CPCB_BANDS = {
    GOOD: { min: 0, max: 50, label: 'Good', color: '#00b050', bg: '#ecfdf5', text: '#065f46', icon: 'smile', advice: 'Minimal impact. Air quality is considered satisfactory, and air pollution poses little or no risk.' },
    SATISFACTORY: { min: 51, max: 100, label: 'Satisfactory', color: '#92d050', bg: '#f7fee7', text: '#3f6212', icon: 'thumbs-up', advice: 'Minor breathing discomfort to sensitive people. Clean and acceptable air quality for most individuals.' },
    MODERATE: { min: 101, max: 200, label: 'Moderate', color: '#ffc000', bg: '#fffbeb', text: '#92400e', icon: 'alert-circle', advice: 'Breathing discomfort to people with lungs, asthma and heart diseases. Sensitive groups should wear a mask.' },
    POOR: { min: 201, max: 300, label: 'Poor', color: '#ff6600', bg: '#fff7ed', text: '#9a3412', icon: 'alert-triangle', advice: 'Breathing discomfort to most people on prolonged exposure. Avoid strenuous outdoor activities.' },
    VERY_POOR: { min: 301, max: 400, label: 'Very Poor', color: '#c00000', bg: '#fef2f2', text: '#991b1b', icon: 'shield-alert', advice: 'Respiratory illness on prolonged exposure. Significant risk for people with heart or lung disease. Wear N95 masks.' },
    SEVERE: { min: 401, max: 500, label: 'Severe', color: '#7030a0', bg: '#faf5ff', text: '#581c87', icon: 'skull', advice: 'Affects healthy people and seriously impacts those with existing diseases. Emergency conditions. Avoid outdoor exposure completely.' }
  };

  // CPCB Breakpoint table for Indian Standard
  // [B_Lo, B_Hi, I_Lo, I_Hi]
  const CPCB_BREAKPOINTS = {
    pm2_5: [
      [0, 30, 0, 50],
      [31, 60, 51, 100],
      [61, 90, 101, 200],
      [91, 120, 201, 300],
      [121, 250, 301, 400],
      [251, 500, 401, 500]
    ],
    pm10: [
      [0, 50, 0, 50],
      [51, 100, 51, 100],
      [101, 250, 101, 200],
      [251, 350, 201, 300],
      [351, 430, 301, 400],
      [431, 600, 401, 500]
    ],
    nitrogen_dioxide: [ // NO2 in µg/m³
      [0, 40, 0, 50],
      [41, 80, 51, 100],
      [81, 180, 101, 200],
      [181, 280, 201, 300],
      [281, 400, 301, 400],
      [401, 800, 401, 500]
    ],
    sulphur_dioxide: [ // SO2 in µg/m³
      [0, 40, 0, 50],
      [41, 80, 51, 100],
      [81, 380, 101, 200],
      [381, 800, 201, 300],
      [801, 1600, 301, 400],
      [1601, 2400, 401, 500]
    ],
    carbon_monoxide: [ // CO in mg/m³
      [0, 1.0, 0, 50],
      [1.1, 2.0, 51, 100],
      [2.1, 10.0, 101, 200],
      [10.1, 17.0, 201, 300],
      [17.1, 34.0, 301, 400],
      [34.1, 50.0, 401, 500]
    ],
    ozone: [ // O3 in µg/m³
      [0, 50, 0, 50],
      [51, 100, 51, 100],
      [101, 168, 101, 200],
      [169, 208, 201, 300],
      [209, 748, 301, 400],
      [749, 1000, 401, 500]
    ]
  };

  /**
   * Calculates sub-index for a specific pollutant according to CPCB formula:
   * Ip = [ (I_Hi - I_Lo) / (B_Hi - B_Lo) ] * (Cp - B_Lo) + I_Lo
   */
  function calculateSubIndex(pollutantKey, concentration) {
    if (concentration === undefined || concentration === null || isNaN(concentration)) {
      return 0;
    }
    const val = Number(concentration);
    const breakpoints = CPCB_BREAKPOINTS[pollutantKey];
    if (!breakpoints) return Math.min(500, Math.round(val));

    for (const [bLo, bHi, iLo, iHi] of breakpoints) {
      if (val >= bLo && val <= bHi) {
        const subIndex = ((iHi - iLo) / (bHi - bLo)) * (val - bLo) + iLo;
        return Math.round(subIndex);
      }
    }

    const highest = breakpoints[breakpoints.length - 1];
    if (val > highest[1]) {
      return 500;
    }
    return 0;
  }

  function getCPCBCategory(aqi) {
    if (aqi <= 50) return CPCB_BANDS.GOOD;
    if (aqi <= 100) return CPCB_BANDS.SATISFACTORY;
    if (aqi <= 200) return CPCB_BANDS.MODERATE;
    if (aqi <= 300) return CPCB_BANDS.POOR;
    if (aqi <= 400) return CPCB_BANDS.VERY_POOR;
    return CPCB_BANDS.SEVERE;
  }

  /**
   * Computes overall CPCB AQI and dominant pollutant
   * AQI = Max(sub-indices of all measured pollutants)
   */
  function calculateOverallCPCB(pollutants) {
    const subIndices = {};
    let maxAQI = 0;
    let dominantPollutant = 'PM2.5';

    const keys = ['pm2_5', 'pm10', 'nitrogen_dioxide', 'sulphur_dioxide', 'ozone', 'carbon_monoxide'];
    
    keys.forEach(k => {
      let conc = pollutants[k];
      if (k === 'carbon_monoxide' && conc > 50) {
        conc = conc / 1000;
      }
      const subIdx = calculateSubIndex(k, conc);
      subIndices[k] = subIdx;

      if (subIdx > maxAQI) {
        maxAQI = subIdx;
        if (k === 'pm2_5') dominantPollutant = 'PM2.5';
        else if (k === 'pm10') dominantPollutant = 'PM10';
        else if (k === 'nitrogen_dioxide') dominantPollutant = 'NO₂';
        else if (k === 'sulphur_dioxide') dominantPollutant = 'SO₂';
        else if (k === 'ozone') dominantPollutant = 'O₃';
        else if (k === 'carbon_monoxide') dominantPollutant = 'CO';
      }
    });

    if (maxAQI === 0 && pollutants.pm2_5 !== undefined) {
      maxAQI = Math.max(15, Math.round(pollutants.pm2_5 * 1.5));
    }

    const category = getCPCBCategory(maxAQI);

    return {
      aqi: maxAQI,
      category: category.label,
      color: category.color,
      bgColor: category.bg,
      textColor: category.text,
      healthAdvice: category.advice,
      icon: category.icon,
      dominantPollutant,
      subIndices,
      rawValues: pollutants
    };
  }

  return {
    CPCB_BANDS,
    calculateSubIndex,
    calculateOverallCPCB,
    getCPCBCategory
  };
});
