// EcoPulse - Hyper-Realistic Three.js 3D Canvas
// Procedural City Scene, Dynamic CPCB Atmospheric Fog, Rain Particles, and Solar Simulation

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EcoPulseScene = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {

  class EcoPulseScene {
    constructor(canvasContainerId, config = {}) {
      this.container = document.getElementById(canvasContainerId);
      if (!this.container) return;

      this.config = config || {};
      this.currentMode = this.config.mode || 'aqi'; // 'aqi' | 'rain' | 'sun'
      this.aqiValue = (this.config.aqiValue !== undefined && this.config.aqiValue !== null) ? this.config.aqiValue : 68;
      this.aqiColor = this.config.aqiColor || '#92d050';
      this.isRaining = false;
      this.rainParticles = null;
      this.smogParticles = null;
      this.sunMesh = null;
      this.dirLight = null;
      this.hemiLight = null;
      this.ambientLight = null;
      this.cars = [];

      this.init();
      this.createProceduralTextures();
      this.buildCity();
      this.setupEnvironmentalModes();
      this.setupEventListeners();
      this.animate();
    }

    init() {
      const width = this.container.clientWidth || 800;
      const height = this.container.clientHeight || 380;

      // Scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#f1f5f9');
      this.scene.fog = new THREE.FogExp2('#e2e8f0', 0.008);

      // Camera
      this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
      this.camera.position.set(45, 38, 55);

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
      this.container.appendChild(this.renderer.domElement);

      // Fixed OrbitControls - enableZoom = true, minDistance = 5, maxDistance = 300
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = true;
      this.controls.minDistance = 5;
      this.controls.maxDistance = 300;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
      this.controls.target.set(0, 4, 0);

      // Lights
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      this.scene.add(this.ambientLight);

      this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.45);
      this.scene.add(this.hemiLight);

      this.dirLight = new THREE.DirectionalLight(0xfffaed, 1.2);
      this.dirLight.position.set(40, 70, 30);
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 200;
      const d = 50;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.scene.add(this.dirLight);
    }

    createProceduralTextures() {
      // 1. Concrete / Brick Wall Texture with bump map
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 512, 512);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      const step = 32;
      for (let x = 0; x <= 512; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
      for (let y = 0; y <= 512; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      for (let y = 8; y < 512; y += step) {
        for (let x = 8; x < 512; x += step) {
          ctx.fillStyle = (Math.random() > 0.4) ? '#38bdf8' : '#e2e8f0';
          ctx.fillRect(x + 2, y + 2, step - 8, step - 8);
        }
      }

      this.buildingTexture = new THREE.CanvasTexture(canvas);
      this.buildingTexture.wrapS = THREE.RepeatWrapping;
      this.buildingTexture.wrapT = THREE.RepeatWrapping;
      this.buildingTexture.repeat.set(2, 4);

      // Bump map
      const bumpCanvas = document.createElement('canvas');
      bumpCanvas.width = 256;
      bumpCanvas.height = 256;
      const bCtx = bumpCanvas.getContext('2d');
      bCtx.fillStyle = '#808080';
      bCtx.fillRect(0, 0, 256, 256);
      bCtx.strokeStyle = '#000000';
      bCtx.lineWidth = 2;
      for (let x = 0; x <= 256; x += 16) {
        bCtx.strokeRect(x, 0, 16, 256);
      }
      this.buildingBump = new THREE.CanvasTexture(bumpCanvas);
      this.buildingBump.wrapS = THREE.RepeatWrapping;
      this.buildingBump.wrapT = THREE.RepeatWrapping;

      // Road Texture
      const roadCanvas = document.createElement('canvas');
      roadCanvas.width = 512;
      roadCanvas.height = 512;
      const rCtx = roadCanvas.getContext('2d');
      rCtx.fillStyle = '#334155';
      rCtx.fillRect(0, 0, 512, 512);
      rCtx.strokeStyle = '#f8fafc';
      rCtx.lineWidth = 8;
      rCtx.setLineDash([24, 20]);
      rCtx.beginPath();
      rCtx.moveTo(256, 0);
      rCtx.lineTo(256, 512);
      rCtx.stroke();
      rCtx.setLineDash([]);
      rCtx.strokeStyle = '#e2e8f0';
      rCtx.lineWidth = 12;
      rCtx.strokeRect(6, 6, 500, 500);

      this.roadTexture = new THREE.CanvasTexture(roadCanvas);
      this.roadTexture.wrapS = THREE.RepeatWrapping;
      this.roadTexture.wrapT = THREE.RepeatWrapping;
      this.roadTexture.repeat.set(1, 10);
    }

    buildCity() {
      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(160, 160);
      const groundColor = this.config?.groundColor ?? 0xf8fafc;
      this.groundMat = new THREE.MeshStandardMaterial({
        color: groundColor ?? 0xf8fafc,
        roughness: 0.5,
        metalness: 0.1
      });
      this.ground = new THREE.Mesh(groundGeo, this.groundMat);
      this.ground.rotation.x = -Math.PI / 2;
      this.ground.receiveShadow = true;
      this.scene.add(this.ground);

      // Plaza Base
      const plazaGeo = new THREE.BoxGeometry(110, 0.4, 110);
      const plazaColor = this.config?.plazaColor ?? 0xe2e8f0;
      const plazaMat = new THREE.MeshStandardMaterial({
        color: plazaColor ?? 0xe2e8f0,
        roughness: 0.6,
        metalness: 0.1
      });
      const plaza = new THREE.Mesh(plazaGeo, plazaMat);
      plaza.position.y = 0.2;
      plaza.receiveShadow = true;
      this.scene.add(plaza);

      // Cross Avenues
      const roadColor = this.config?.roadColor ?? 0x475569;
      const roadMat = new THREE.MeshStandardMaterial({
        color: roadColor ?? 0x475569,
        roughness: 0.6,
        metalness: 0.2,
        map: this.roadTexture
      });

      const nsRoadGeo = new THREE.PlaneGeometry(12, 120);
      const nsRoad = new THREE.Mesh(nsRoadGeo, roadMat);
      nsRoad.rotation.x = -Math.PI / 2;
      nsRoad.position.set(0, 0.22, 0);
      nsRoad.receiveShadow = true;
      this.scene.add(nsRoad);

      const ewRoadGeo = new THREE.PlaneGeometry(120, 12);
      const ewRoad = new THREE.Mesh(ewRoadGeo, roadMat);
      ewRoad.rotation.x = -Math.PI / 2;
      ewRoad.rotation.z = Math.PI / 2;
      ewRoad.position.set(0, 0.22, 0);
      ewRoad.receiveShadow = true;
      this.scene.add(ewRoad);

      // Procedural Buildings
      const buildingGroup = new THREE.Group();
      const wireColor = this.config?.wireframeColor ?? 0x64748b;
      const wireframeMat = new THREE.LineBasicMaterial({ color: wireColor ?? 0x64748b, linewidth: 1.5 });

      const blocks = [
        { xRange: [-42, -12], zRange: [-42, -12] },
        { xRange: [12, 42], zRange: [-42, -12] },
        { xRange: [-42, -12], zRange: [12, 42] },
        { xRange: [12, 42], zRange: [12, 42] }
      ];

      const bColors = [0xffffff, 0xf1f5f9, 0xe2e8f0, 0xf8fafc];

      blocks.forEach((block, bIdx) => {
        for (let x = block.xRange[0] + 4; x <= block.xRange[1] - 4; x += 11) {
          for (let z = block.zRange[0] + 4; z <= block.zRange[1] - 4; z += 11) {
            const height = 8 + Math.random() * 24 + ((x === 26 || z === 26) ? 10 : 0);
            const width = 6.5 + Math.random() * 2;
            const depth = 6.5 + Math.random() * 2;

            const boxGeo = new THREE.BoxGeometry(width, height, depth);
            // Safe non-negative index lookup to guarantee color is never undefined
            const colorIdx = Math.abs(Math.floor(x + z + bIdx)) % bColors.length;
            const blockColor = bColors[colorIdx] ?? 0xf1f5f9;

            const boxMat = new THREE.MeshStandardMaterial({
              color: blockColor ?? 0xffffff,
              map: this.buildingTexture,
              bumpMap: this.buildingBump,
              bumpScale: 0.05,
              roughness: 0.35,
              metalness: 0.25
            });

            const building = new THREE.Mesh(boxGeo, boxMat);
            building.position.set(x, height / 2 + 0.2, z);
            building.castShadow = true;
            building.receiveShadow = true;
            buildingGroup.add(building);

            // Crisp wireframe outline over light slate building geometries (#64748B)
            const edges = new THREE.EdgesGeometry(boxGeo);
            const wireframe = new THREE.LineSegments(edges, wireframeMat);
            wireframe.position.copy(building.position);
            buildingGroup.add(wireframe);

            // Rooftop components
            if (Math.random() > 0.4) {
              const roofColor = this.config?.roofColor ?? 0x94a3b8;
              const roofBox = new THREE.Mesh(
                new THREE.BoxGeometry(2, 1.2, 2),
                new THREE.MeshStandardMaterial({ color: roofColor ?? 0x94a3b8 })
              );
              roofBox.position.set(x, height + 0.8, z);
              roofBox.castShadow = true;
              buildingGroup.add(roofBox);
            }
          }
        }
      });

      // Environmental Landmark Spire
      const spireBaseGeo = new THREE.CylinderGeometry(4.5, 6, 32, 16);
      const spireColor = this.config?.spireColor ?? 0xffffff;
      const spireMat = new THREE.MeshStandardMaterial({ color: spireColor ?? 0xffffff, metalness: 0.6, roughness: 0.2 });
      const tower = new THREE.Mesh(spireBaseGeo, spireMat);
      tower.position.set(0, 16, 0);
      tower.castShadow = true;
      buildingGroup.add(tower);

      const spireEdges = new THREE.EdgesGeometry(spireBaseGeo);
      const spireWireColor = this.config?.spireWireColor ?? 0x0284c7;
      const spireWire = new THREE.LineSegments(spireEdges, new THREE.LineBasicMaterial({ color: spireWireColor ?? 0x0284c7 }));
      spireWire.position.copy(tower.position);
      buildingGroup.add(spireWire);

      const needleGeo = new THREE.CylinderGeometry(0.2, 0.8, 14, 8);
      const needleColor = this.config?.needleColor ?? 0x0ea5e9;
      const needleEmissive = this.config?.needleEmissive ?? 0x0284c7;
      const needleMat = new THREE.MeshStandardMaterial({ color: needleColor ?? 0x0ea5e9, emissive: needleEmissive ?? 0x0284c7, emissiveIntensity: 0.3 });
      const needle = new THREE.Mesh(needleGeo, needleMat);
      needle.position.set(0, 39, 0);
      buildingGroup.add(needle);

      const sensorGlobeGeo = new THREE.SphereGeometry(1.6, 24, 24);
      const globeColor = this.aqiColor ?? (this.config?.sensorGlobeColor ?? 0x92d050);
      this.sensorGlobeMat = new THREE.MeshStandardMaterial({
        color: globeColor ?? 0x92d050,
        emissive: globeColor ?? 0x92d050,
        emissiveIntensity: 0.8,
        roughness: 0.1
      });
      this.sensorGlobe = new THREE.Mesh(sensorGlobeGeo, this.sensorGlobeMat);
      this.sensorGlobe.position.set(0, 46, 0);
      buildingGroup.add(this.sensorGlobe);

      this.scene.add(buildingGroup);

      this.plantTrees();
      this.createCityVehicles();
    }

    plantTrees() {
      const treeGroup = new THREE.Group();
      const trunkColor = this.config?.trunkColor ?? 0x78350f;
      const foliageColor = this.config?.foliageColor ?? 0x16a34a;
      const altFoliageColor = this.config?.altFoliageColor ?? 0x22c55e;
      const trunkMat = new THREE.MeshStandardMaterial({ color: trunkColor ?? 0x78350f, roughness: 0.9 });
      const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor ?? 0x16a34a, roughness: 0.5, metalness: 0.1 });
      const altFoliageMat = new THREE.MeshStandardMaterial({ color: altFoliageColor ?? 0x22c55e, roughness: 0.5, metalness: 0.1 });

      const treePositions = [];

      for (let z = -45; z <= 45; z += 9) {
        if (Math.abs(z) > 8) {
          treePositions.push({ x: -8, z });
          treePositions.push({ x: 8, z });
        }
      }
      for (let x = -45; x <= 45; x += 9) {
        if (Math.abs(x) > 8) {
          treePositions.push({ x, z: -8 });
          treePositions.push({ x, z: 8 });
        }
      }

      treePositions.forEach((pos, idx) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2.5, 6), trunkMat);
        trunk.position.y = 1.25;
        trunk.castShadow = true;
        tree.add(trunk);

        const folMat = idx % 2 === 0 ? foliageMat : altFoliageMat;
        const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.2, 7), folMat);
        foliage1.position.y = 2.8;
        foliage1.castShadow = true;
        tree.add(foliage1);

        const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.8, 7), folMat);
        foliage2.position.y = 3.9;
        foliage2.castShadow = true;
        tree.add(foliage2);

        tree.position.set(pos.x, 0.2, pos.z);
        treeGroup.add(tree);
      });

      this.scene.add(treeGroup);
    }

    createCityVehicles() {
      const carColor = this.config?.carColor ?? 0x0284c7;
      const evColor = this.config?.evColor ?? 0x10b981;
      const cabinColor = this.config?.cabinColor ?? 0x0f172a;
      const wheelColor = this.config?.wheelColor ?? 0x1e293b;

      const carMat = new THREE.MeshStandardMaterial({ color: carColor ?? 0x0284c7, roughness: 0.3, metalness: 0.7 });
      const evMat = new THREE.MeshStandardMaterial({ color: evColor ?? 0x10b981, roughness: 0.3, metalness: 0.7 });
      const cabinMat = new THREE.MeshStandardMaterial({ color: cabinColor ?? 0x0f172a, roughness: 0.1 });
      const wheelMat = new THREE.MeshStandardMaterial({ color: wheelColor ?? 0x1e293b });

      for (let i = 0; i < 4; i++) {
        const carGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 3.6), i % 2 === 0 ? carMat : evMat);
        body.position.y = 0.5;
        body.castShadow = true;
        carGroup.add(body);

        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 1.8), cabinMat);
        cabin.position.set(0, 1.1, -0.2);
        carGroup.add(cabin);

        [-0.9, 0.9].forEach(wx => {
          [-1.1, 1.1].forEach(wz => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8), wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.35, wz);
            carGroup.add(wheel);
          });
        });

        const axis = i < 2 ? 'z' : 'x';
        const offset = (i % 2 === 0) ? 2.8 : -2.8;
        carGroup.position.set(axis === 'z' ? offset : -45 + i * 25, 0.2, axis === 'x' ? offset : -45 + i * 25);
        this.scene.add(carGroup);

        this.cars.push({
          mesh: carGroup,
          axis,
          dir: i % 2 === 0 ? 1 : -1,
          speed: 0.25 + Math.random() * 0.15
        });
      }
    }

    setupEnvironmentalModes() {
      // 1. Rain
      const rainCount = 4500;
      const rainGeo = new THREE.BufferGeometry();
      const rainPositions = new Float32Array(rainCount * 3);

      for (let i = 0; i < rainCount * 3; i += 3) {
        rainPositions[i] = (Math.random() - 0.5) * 120;
        rainPositions[i + 1] = Math.random() * 80;
        rainPositions[i + 2] = (Math.random() - 0.5) * 120;
      }
      rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const rainColor = this.config?.rainColor ?? 0x38bdf8;
      const rainMat = new THREE.PointsMaterial({
        color: rainColor ?? 0x38bdf8,
        size: 0.45,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      });
      this.rainParticles = new THREE.Points(rainGeo, rainMat);
      this.rainParticles.visible = false;
      this.scene.add(this.rainParticles);

      // 2. AQI Smog / Haze
      const hazeCount = 1200;
      const hazeGeo = new THREE.BufferGeometry();
      const hazePositions = new Float32Array(hazeCount * 3);
      for (let i = 0; i < hazeCount * 3; i += 3) {
        hazePositions[i] = (Math.random() - 0.5) * 100;
        hazePositions[i + 1] = 1 + Math.random() * 35;
        hazePositions[i + 2] = (Math.random() - 0.5) * 100;
      }
      hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePositions, 3));

      const hazeColor = this.aqiColor ?? (this.config?.hazeColor ?? '#92d050');
      this.hazeMat = new THREE.PointsMaterial({
        color: new THREE.Color(hazeColor ?? 0x92d050),
        size: 1.8,
        transparent: true,
        opacity: 0.35,
        blending: THREE.NormalBlending
      });
      this.smogParticles = new THREE.Points(hazeGeo, this.hazeMat);
      this.scene.add(this.smogParticles);

      // 3. Sun Mesh
      const sunGeo = new THREE.SphereGeometry(4.5, 32, 32);
      const sunColor = this.config?.sunColor ?? 0xffedd5;
      const sunMat = new THREE.MeshBasicMaterial({ color: sunColor ?? 0xffedd5, transparent: true, opacity: 0.95 });
      this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
      this.sunMesh.position.set(45, 65, 35);
      this.sunMesh.visible = false;
      this.scene.add(this.sunMesh);

      const flareGeo = new THREE.RingGeometry(5, 12, 32);
      const flareColor = this.config?.flareColor ?? 0xfbbf24;
      const flareMat = new THREE.MeshBasicMaterial({
        color: flareColor ?? 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35
      });
      this.flareMesh = new THREE.Mesh(flareGeo, flareMat);
      this.flareMesh.position.copy(this.sunMesh.position);
      this.flareMesh.visible = false;
      this.scene.add(this.flareMesh);
    }

    setMode(mode) {
      this.currentMode = mode;

      if (mode === 'aqi') {
        this.rainParticles.visible = false;
        this.sunMesh.visible = false;
        this.flareMesh.visible = false;
        this.smogParticles.visible = true;

        this.applyAQIVisuals();
      } else if (mode === 'rain') {
        this.smogParticles.visible = false;
        this.sunMesh.visible = false;
        this.flareMesh.visible = false;
        this.rainParticles.visible = true;

        this.scene.background.set('#cbd5e1');
        this.scene.fog = new THREE.FogExp2('#94a3b8', 0.016);
        this.dirLight.intensity = 0.45;
        this.dirLight.color.set('#94a3b8');
        this.ambientLight.intensity = 0.5;

        this.groundMat.roughness = 0.15;
        this.groundMat.metalness = 0.6;
        this.groundMat.color.set('#64748b');
      } else if (mode === 'sun') {
        this.rainParticles.visible = false;
        this.smogParticles.visible = false;
        this.sunMesh.visible = true;
        this.flareMesh.visible = true;

        this.scene.background.set('#fef3c7');
        this.scene.fog = new THREE.FogExp2('#fed7aa', 0.005);
        this.dirLight.intensity = 1.6;
        this.dirLight.color.set('#ffedd5');
        this.ambientLight.intensity = 0.8;

        this.groundMat.roughness = 0.5;
        this.groundMat.metalness = 0.1;
        this.groundMat.color.set('#f8fafc');
      }
    }

    updateAQI(aqiValue, colorHex) {
      this.aqiValue = (aqiValue !== undefined && aqiValue !== null) ? aqiValue : 68;
      const safeColor = colorHex ?? this.aqiColor ?? '#92d050';
      this.aqiColor = safeColor;

      if (this.sensorGlobeMat) {
        if (this.sensorGlobeMat.color) this.sensorGlobeMat.color.set(safeColor);
        if (this.sensorGlobeMat.emissive) this.sensorGlobeMat.emissive.set(safeColor);
      }

      if (this.currentMode === 'aqi') {
        this.applyAQIVisuals();
      }
    }

    applyAQIVisuals() {
      let fogDensity = 0.006;
      let particleOpacity = 0.25;
      let particleSize = 1.2;

      if (this.aqiValue <= 50) {
        this.scene.background.set('#f0fdf4');
        this.scene.fog = new THREE.FogExp2('#dcfce7', 0.005);
        particleOpacity = 0.15;
      } else if (this.aqiValue <= 100) {
        this.scene.background.set('#f7fee7');
        this.scene.fog = new THREE.FogExp2('#ecfccb', 0.007);
        particleOpacity = 0.25;
      } else if (this.aqiValue <= 200) {
        this.scene.background.set('#fefce8');
        this.scene.fog = new THREE.FogExp2('#fef08a', 0.012);
        particleOpacity = 0.45;
        particleSize = 1.8;
      } else if (this.aqiValue <= 300) {
        this.scene.background.set('#fff7ed');
        this.scene.fog = new THREE.FogExp2('#ffedd5', 0.018);
        particleOpacity = 0.6;
        particleSize = 2.2;
      } else if (this.aqiValue <= 400) {
        this.scene.background.set('#fef2f2');
        this.scene.fog = new THREE.FogExp2('#fee2e2', 0.024);
        particleOpacity = 0.75;
        particleSize = 2.6;
      } else {
        this.scene.background.set('#faf5ff');
        this.scene.fog = new THREE.FogExp2('#ebd5ff', 0.032);
        particleOpacity = 0.85;
        particleSize = 3.0;
      }

      if (this.hazeMat && this.hazeMat.color) {
        const safeColor = this.aqiColor ?? '#92d050';
        this.hazeMat.color.set(safeColor);
        this.hazeMat.opacity = particleOpacity;
        this.hazeMat.size = particleSize;
      }

      this.dirLight.intensity = Math.max(0.6, 1.4 - (this.aqiValue / 500));
      this.groundMat.roughness = 0.5;
      this.groundMat.metalness = 0.1;
      this.groundMat.color.set('#f8fafc');
    }

    resetCamera() {
      this.camera.position.set(45, 38, 55);
      this.controls.target.set(0, 4, 0);
      this.controls.update();
    }

    setupEventListeners() {
      window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    animate() {
      requestAnimationFrame(() => this.animate());

      this.controls.update();

      if (this.currentMode === 'rain' && this.rainParticles) {
        const positions = this.rainParticles.geometry.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 1.8;
          if (positions[i] < 0) {
            positions[i] = 80;
          }
        }
        this.rainParticles.geometry.attributes.position.needsUpdate = true;
      }

      if (this.currentMode === 'aqi' && this.smogParticles) {
        this.smogParticles.rotation.y += 0.0008;
      }

      if (this.currentMode === 'sun' && this.flareMesh) {
        this.flareMesh.lookAt(this.camera.position);
        this.flareMesh.rotation.z += 0.002;
      }

      this.cars.forEach(car => {
        if (car.axis === 'z') {
          car.mesh.position.z += car.speed * car.dir;
          if (car.mesh.position.z > 55) car.mesh.position.z = -55;
          if (car.mesh.position.z < -55) car.mesh.position.z = 55;
        } else {
          car.mesh.position.x += car.speed * car.dir;
          if (car.mesh.position.x > 55) car.mesh.position.x = -55;
          if (car.mesh.position.x < -55) car.mesh.position.x = 55;
        }
      });

      this.renderer.render(this.scene, this.camera);
    }
  }

  return EcoPulseScene;
});
