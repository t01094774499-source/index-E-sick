// ============================================================================
// Kia All New Morning (기아 올 뉴 모닝 TA) 3D Interactive Showroom
// Ultra-Smooth NURBS-Equivalent Parametric Surface (Zero Stepping / Anti-Aliased)
// ============================================================================

class KiaMorningViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.carGroup = null;
    this.wheels = [];
    this.bodyMaterials = [];
    this.headlightMaterials = [];
    this.headlightsOn = true;
    this.headlightLights = [];
    this.isWireframe = false;
    this.isAutoRotate = true;

    // Authentic Kia All New Morning (TA) Color Palette
    this.colors = {
      silver: 0xd4d8df, // 스파클링 실버 (Sparkling Silver - Default from photo)
      white: 0xf6f7f9,  // 순백 클리어 화이트 (Clear White)
      beige: 0xe4d9c8,  // 밀키 베이지 (Milky Beige)
      gray: 0x474e58,   // 티타늄 실버 / 그레이 (Titanium Silver)
      red: 0xbc1a23,    // 시그널 레드 (Signal Red)
      yellow: 0xf7bc1a, // 앨리스 블루 / 허니비 옐로우
      black: 0x111317   // 오로라 블랙 펄 (Aurora Black)
    };

    // Default to the exact Sparkling Silver from user's photo
    this.currentColor = this.colors.silver;

    // Spec Hotspots
    this.hotspots = [
      {
        id: 'engine',
        title: '카파 1.0 가솔린 파워트레인 (Kappa 1.0)',
        desc: '최고출력 82마력, 최대토크 9.6kgf·m. 컴팩트 경량 3기통 엔진과 4단 자동변속기의 조화로 도심 연비 15.2km/L의 뛰어난 실용성을 발휘합니다.',
        pos: [0, 0.72, 1.25]
      },
      {
        id: 'grille',
        title: '시그니처 호랑이 코 라디에이터 그릴 & 타원 CI',
        desc: '피터 슈라이어(Peter Schreyer)의 디자인 철학이 반영된 콤팩트 크롬 타이거 노즈 그릴과 중앙에 장착된 클래식 오벌 KIA 엠블럼입니다.',
        pos: [0, 0.65, 1.62]
      },
      {
        id: 'wheel',
        title: '올 뉴 모닝 15인치 시그니처 플라워 휠 (Flower Wheel)',
        desc: '모닝만의 독보적인 상징인 4잎 클로버/플라워 페탈 다이아몬드 커팅 가공 알로이 휠로, 감각적이고 유니크한 익스테리어 감성을 완성합니다.',
        pos: [0.82, 0.32, 1.15]
      },
      {
        id: 'cockpit',
        title: '스마트 커넥티비티 콕핏 & 2열 분할 폴딩',
        desc: '운전자 중심의 인체공학 대시보드와 버튼 시동 스마트키, 2열 6:4 분할 폴딩으로 경차를 뛰어넘는 1,000L급 다목적 적재성을 제공합니다.',
        pos: [0, 1.02, 0.0]
      }
    ];

    this.hotspotMarkers = [];
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
  }

  init() {
    // 1. Scene Setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.038);

    // 2. Camera Setup
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 480;
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(4.2, 1.8, 3.8);

    // 3. Renderer Setup with Full Hardware Anti-Aliasing & Subpixel Density
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    this.renderer.setSize(width, height);
    // Support high-DPI displays without pixelation/stepping
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ultra-smooth soft shadow edges
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    if (window.THREE && THREE.OrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
      this.controls.minDistance = 2.4;
      this.controls.maxDistance = 11.0;
      this.controls.target.set(0, 0.65, 0);
      this.controls.autoRotate = this.isAutoRotate;
      this.controls.autoRotateSpeed = 0.9;
    }

    // 5. Lighting Setup (Soft Studio Lighting with Anti-Aliased Shadow Camera)
    this.setupLighting();

    // 6. Studio Showroom Floor
    this.setupFloor();

    // 7. Build Ultra-Smooth Kia All New Morning (TA)
    this.buildKiaAllNewMorning();

    // 8. 3D Hotspot Markers
    this.setupHotspotMarkers();

    // 9. Event Listeners
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));

    // 10. Start Animation Loop
    this.animate();
  }

  // ==========================================================================
  // LIGHTING SETUP (Anti-Aliased Soft Studio Shadows)
  // ==========================================================================
  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    // Key Light with Tightly Fitted Bounds and Blur Radius for Anti-Stepping
    const keyLight = new THREE.DirectionalLight(0xfff9f0, 1.75);
    keyLight.position.set(4.8, 7.2, 4.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 18.0;
    keyLight.shadow.camera.left = -2.6;
    keyLight.shadow.camera.right = 2.6;
    keyLight.shadow.camera.top = 2.6;
    keyLight.shadow.camera.bottom = -2.6;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 3.0; // Blurs shadow boundaries, preventing pixel staircasing!
    this.scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.1);
    fillLight.position.set(-4.5, 3.5, 5.0);
    this.scene.add(fillLight);

    // Cyan Tech Rim Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.25);
    rimLight.position.set(-5.0, 4.5, -4.5);
    this.scene.add(rimLight);

    // Floor Bounce Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 0.65);
    this.scene.add(hemiLight);
  }

  // ==========================================================================
  // SHOWROOM FLOOR & AMBIENT OCCLUSION (High-Density Rings)
  // ==========================================================================
  setupFloor() {
    // 1. Studio Circular Turntable (96 radial segments for silky circles)
    const floorGeo = new THREE.CylinderGeometry(5.2, 5.2, 0.08, 96);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x101524,
      roughness: 0.42,
      metalness: 0.38
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Cyan Tech LED Perimeter Ring
    const ringGeo = new THREE.RingGeometry(3.6, 5.0, 96);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.24
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.003;
    this.scene.add(ring);

    // 3. Radial Accent Rings (96 segments)
    [2.2, 3.0, 4.2].forEach(radius => {
      const circleGeo = new THREE.RingGeometry(radius - 0.012, radius, 96);
      const circleMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14
      });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.rotation.x = -Math.PI / 2;
      circle.position.y = 0.004;
      this.scene.add(circle);
    });

    // 4. Vehicle Contact Ambient Occlusion Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(2.1, 4.0);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256, 512, 40, 256, 512, 250);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.46)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);

    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.006, -0.05);
    this.scene.add(shadowPlane);
  }

  // ==========================================================================
  // BUILD KIA ALL NEW MORNING (TA) MODEL
  // ==========================================================================
  buildKiaAllNewMorning() {
    this.carGroup = new THREE.Group();
    this.bodyMaterials = [];
    this.headlightMaterials = [];
    this.wheels = [];

    // Master Materials
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: this.currentColor,
      metalness: 0.82,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      reflectivity: 0.95
    });
    this.bodyMaterials.push(paintMat);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      metalness: 0.12,
      roughness: 0.03,
      transmission: 0.88,
      transparent: true,
      opacity: 0.88,
      reflectivity: 0.98
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.06
    });

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x16181e,
      roughness: 0.84,
      metalness: 0.15
    });

    const machinedSilverMat = new THREE.MeshStandardMaterial({
      color: 0xe8ecf2,
      metalness: 0.92,
      roughness: 0.14
    });

    const ledHeadlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xe0f2fe,
      emissiveIntensity: 0.95,
      roughness: 0.1
    });
    this.headlightMaterials.push(ledHeadlightMat);

    const ledTaillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.85,
      roughness: 0.15
    });

    // 1. Ultra-Smooth Parametric Lofted Body Shell (Catmull-Rom Subdivision)
    const bodyShell = this.createUltraSmoothBodyShell(paintMat);
    this.carGroup.add(bodyShell);

    // 2. Tiger-Nose Grille with Red Oval KIA Emblem
    this.createTATigerNoseGrille(chromeMat, blackTrimMat);

    // 3. Swept-Back Teardrop Headlights
    this.createTAHeadlights(glassMat, chromeMat, ledHeadlightMat);

    // 4. Lower Hexagonal Intake with "morning" Plate & Boomerang Fog Lamps
    this.createTABumperAndFogLamps(blackTrimMat, chromeMat, ledHeadlightMat);

    // 5. Greenhouse (Smooth Curved Windshield & Glass)
    this.createTAGreenhouse(glassMat, blackTrimMat);

    // 6. Teardrop Side Mirrors with LED Repeater Strip
    this.createTASideMirrors(paintMat, blackTrimMat, chromeMat);

    // 7. Door Handles along Character Crease
    this.createTADoorDetails(paintMat, blackTrimMat, chromeMat);

    // 8. Rear Hatch, Taillights & 42° Micro Pole Antenna
    this.createTARearAndAntenna(paintMat, blackTrimMat, ledTaillightMat, chromeMat);

    // 9. Iconic 15" Flower / Clover Petal Wheels (플라워 휠) & Brakes
    this.createTAFlowerWheels(machinedSilverMat, blackTrimMat, chromeMat);

    // 10. Visible Interior Cockpit
    this.createTACockpit(blackTrimMat, machinedSilverMat);

    this.scene.add(this.carGroup);
  }

  // ==========================================================================
  // ULTRA-SMOOTH BODY SHELL (Catmull-Rom Lofting across 45 x 40 mesh)
  // Eliminates polygonal stepping, facet boundaries, and aliasing artifacts
  // ==========================================================================
  createUltraSmoothBodyShell(paintMat) {
    // 21 Key Control Station Profiles
    const rawStations = [
      [1.76, 0.24, 0.28, 0.56, 0.60, 0.52, 0.66, 0.52], // Front nose lower tip
      [1.68, 0.22, 0.32, 0.66, 0.70, 0.60, 0.72, 0.62], // Front bumper & intake
      [1.56, 0.22, 0.34, 0.73, 0.76, 0.64, 0.75, 0.66], // Tiger-nose & headlamps
      [1.38, 0.22, 0.35, 0.77, 0.81, 0.66, 0.78, 0.68], // Swept headlamp crest & hood
      [1.25, 0.38, 0.44, 0.79, 0.83, 0.68, 0.80, 0.68], // Front wheel arch front
      [1.15, 0.43, 0.47, 0.80, 0.84, 0.68, 0.80, 0.68], // Front wheel center
      [1.04, 0.38, 0.44, 0.81, 0.85, 0.68, 0.80, 0.68], // Front wheel arch rear
      [0.85, 0.22, 0.29, 0.83, 0.88, 0.66, 0.79, 0.68], // Hood trailing edge & cowl
      [0.60, 0.22, 0.28, 0.85, 1.10, 0.66, 0.78, 0.64], // Windshield base
      [0.30, 0.22, 0.28, 0.87, 1.32, 0.66, 0.78, 0.62], // Windshield mid
      [0.00, 0.22, 0.28, 0.89, 1.46, 0.66, 0.79, 0.60], // Roof crown / B-pillar
      [-0.40, 0.22, 0.28, 0.89, 1.46, 0.66, 0.79, 0.60], // Roof center
      [-0.80, 0.22, 0.28, 0.90, 1.44, 0.66, 0.79, 0.60], // C-pillar start
      [-1.05, 0.22, 0.32, 0.90, 1.42, 0.66, 0.79, 0.62], // C-pillar window corner
      [-1.15, 0.38, 0.44, 0.90, 1.41, 0.68, 0.80, 0.62], // Rear wheel arch front
      [-1.25, 0.43, 0.47, 0.89, 1.40, 0.68, 0.80, 0.62], // Rear wheel center
      [-1.35, 0.38, 0.44, 0.88, 1.39, 0.68, 0.80, 0.62], // Rear wheel arch rear
      [-1.48, 0.24, 0.30, 0.86, 1.40, 0.66, 0.78, 0.62], // Rear roof spoiler lip
      [-1.58, 0.25, 0.32, 0.82, 1.12, 0.64, 0.76, 0.60], // Rear hatch window
      [-1.68, 0.26, 0.34, 0.74, 0.76, 0.62, 0.72, 0.58], // Tailgate / taillights
      [-1.74, 0.28, 0.32, 0.56, 0.56, 0.54, 0.66, 0.52]  // Rear lower bumper
    ];

    // Catmull-Rom cubic spline interpolation function
    const catmullRom = (p0, p1, p2, p3, t) => {
      const t2 = t * t;
      const t3 = t2 * t;
      return 0.5 * (
        (2 * p1) +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
      );
    };

    // 1. Subdivide longitudinal stations from 21 to 45 smooth slices
    const numStations = 45;
    const M = rawStations.length;
    const interpolatedStations = [];

    for (let i = 0; i < numStations; i++) {
      const tGlobal = (i / (numStations - 1)) * (M - 1);
      const idx = Math.min(Math.floor(tGlobal), M - 2);
      const t = tGlobal - idx;

      const s0 = rawStations[Math.max(0, idx - 1)];
      const s1 = rawStations[idx];
      const s2 = rawStations[Math.min(M - 1, idx + 1)];
      const s3 = rawStations[Math.min(M - 1, idx + 2)];

      const inter = [];
      for (let k = 0; k < s0.length; k++) {
        inter.push(catmullRom(s0[k], s1[k], s2[k], s3[k], t));
      }
      interpolatedStations.push(inter);
    }

    // 2. Subdivide each cross-section ring to 40 smooth perimeter points
    const N = 40; // 40 vertices per ring loop
    const halfCount = 21; // 21 points on right half (0 to 20)
    const vertices = [];
    const uvs = [];
    const indices = [];

    interpolatedStations.forEach(st => {
      const [z, y_fl, y_rk, y_sh, y_rf, w_fl, w_sh, w_rf] = st;
      const y_cr = (y_rk + y_sh) * 0.5;

      // 11 coarse control points
      const ctrlPts = [
        [0.0, y_fl],
        [0.45 * w_fl, y_fl],
        [w_fl, y_rk],
        [w_sh * 0.96, y_cr],
        [w_sh, (y_cr + y_sh) * 0.5],
        [w_sh, y_sh], // Shoulder crease
        [w_sh * 0.95, y_sh + 0.04],
        [w_rf * 1.15, (y_sh + y_rf) * 0.55],
        [w_rf, y_rf],
        [0.5 * w_rf, y_rf + 0.02],
        [0.0, y_rf + 0.025]
      ];

      // Spline-smooth to 21 half-points
      const K = ctrlPts.length;
      const smoothedHalf = [];
      for (let i = 0; i < halfCount; i++) {
        const tg = (i / (halfCount - 1)) * (K - 1);
        const idx = Math.min(Math.floor(tg), K - 2);
        const t = tg - idx;

        const p0 = ctrlPts[Math.max(0, idx - 1)];
        const p1 = ctrlPts[idx];
        const p2 = ctrlPts[Math.min(K - 1, idx + 1)];
        const p3 = ctrlPts[Math.min(K - 1, idx + 2)];

        const x = catmullRom(p0[0], p1[0], p2[0], p3[0], t);
        const y = catmullRom(p0[1], p1[1], p2[1], p3[1], t);
        smoothedHalf.push([x, y]);
      }

      // Assemble full 40-point ring: right side (0 to 20), left mirrored side (19 down to 1)
      const ring = [];
      smoothedHalf.forEach(([x, y]) => ring.push([x, y, z]));
      for (let i = halfCount - 2; i >= 1; i--) {
        const [x, y] = smoothedHalf[i];
        ring.push([-x, y, z]);
      }

      ring.forEach(([x, y, pz], pIdx) => {
        vertices.push(x, y, pz);
        uvs.push(pIdx / N, (pz + 1.76) / 3.5);
      });
    });

    // Triangulate between station rings
    for (let s = 0; s < numStations - 1; s++) {
      const baseCurr = s * N;
      const baseNext = (s + 1) * N;
      for (let p = 0; p < N; p++) {
        const pNext = (p + 1) % N;
        const a = baseCurr + p;
        const b = baseNext + p;
        const c = baseNext + pNext;
        const d = baseCurr + pNext;
        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }

    // Smooth closed end caps (Front and rear)
    const frontCenterIdx = vertices.length / 3;
    vertices.push(0, 0.40, 1.78);
    uvs.push(0.5, 1.0);
    for (let p = 0; p < N; p++) {
      indices.push(frontCenterIdx, (p + 1) % N, p);
    }

    const rearCenterIdx = vertices.length / 3;
    vertices.push(0, 0.46, -1.76);
    uvs.push(0.5, 0.0);
    const baseLast = (numStations - 1) * N;
    for (let p = 0; p < N; p++) {
      indices.push(rearCenterIdx, baseLast + p, baseLast + ((p + 1) % N));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    // Computes continuous smooth normals across all adjacent triangles
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, paintMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // ==========================================================================
  // TIGER-NOSE GRILLE WITH RED OVAL KIA BADGE (Smooth Tubes)
  // ==========================================================================
  createTATigerNoseGrille(chromeMat, blackMat) {
    const grilleGroup = new THREE.Group();

    // 1. Black Honeycomb Mesh Backing
    const backingGeo = new THREE.PlaneGeometry(0.58, 0.10);
    const backing = new THREE.Mesh(backingGeo, blackMat);
    backing.position.set(0, 0.65, 1.625);
    grilleGroup.add(backing);

    // 2. High-Resolution Tiger-Nose Chrome Upper Lip (36 segments)
    const upperCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.29, 0.70, 1.60),
      new THREE.Vector3(-0.14, 0.69, 1.62),
      new THREE.Vector3(0.00, 0.675, 1.63),
      new THREE.Vector3(0.14, 0.69, 1.62),
      new THREE.Vector3(0.29, 0.70, 1.60)
    ]);
    const upperGeo = new THREE.TubeGeometry(upperCurve, 36, 0.011, 16, false);
    const upperMesh = new THREE.Mesh(upperGeo, chromeMat);
    grilleGroup.add(upperMesh);

    // 3. High-Resolution Tiger-Nose Chrome Lower Lip (36 segments)
    const lowerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.29, 0.60, 1.60),
      new THREE.Vector3(-0.14, 0.61, 1.62),
      new THREE.Vector3(0.00, 0.625, 1.63),
      new THREE.Vector3(0.14, 0.61, 1.62),
      new THREE.Vector3(0.29, 0.60, 1.60)
    ]);
    const lowerGeo = new THREE.TubeGeometry(lowerCurve, 36, 0.011, 16, false);
    const lowerMesh = new THREE.Mesh(lowerGeo, chromeMat);
    grilleGroup.add(lowerMesh);

    // 4. Authentic Red & Silver Oval "KIA" Badge
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 512;
    badgeCanvas.height = 256;
    const bctx = badgeCanvas.getContext('2d');
    bctx.fillStyle = '#b91c1c';
    bctx.beginPath();
    bctx.ellipse(256, 128, 230, 112, 0, 0, Math.PI * 2);
    bctx.fill();
    bctx.strokeStyle = '#e2e8f0';
    bctx.lineWidth = 18;
    bctx.stroke();
    bctx.fillStyle = '#ffffff';
    bctx.font = 'bold 128px Arial, sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('KIA', 256, 132);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    const badgeMat = new THREE.MeshStandardMaterial({
      map: badgeTex,
      metalness: 0.8,
      roughness: 0.2
    });
    const badgeGeo = new THREE.PlaneGeometry(0.10, 0.05);
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0.65, 1.638);
    grilleGroup.add(badge);

    this.carGroup.add(grilleGroup);
  }

  // ==========================================================================
  // SWEPT-BACK BUG-EYE HEADLIGHTS (High Segment Count)
  // ==========================================================================
  createTAHeadlights(glassMat, chromeMat, ledMat) {
    [-1, 1].forEach(side => {
      const x = side * 0.54;
      const headGroup = new THREE.Group();

      // Swept-back 48-segment lens (no polygon facets)
      const lensGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.36, 48);
      lensGeo.rotateX(Math.PI / 2.3);
      lensGeo.rotateY(side * -0.28);
      lensGeo.rotateZ(side * 0.12);
      const lens = new THREE.Mesh(lensGeo, glassMat);
      lens.position.set(x, 0.71, 1.48);
      headGroup.add(lens);

      const housingGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.32, 40);
      housingGeo.rotateX(Math.PI / 2.3);
      housingGeo.rotateY(side * -0.28);
      housingGeo.rotateZ(side * 0.12);
      const housing = new THREE.Mesh(housingGeo, chromeMat);
      housing.position.set(x - (0.01 * side), 0.70, 1.47);
      headGroup.add(housing);

      // Main Round Projector Low-Beam (32 segments)
      const projGeo = new THREE.SphereGeometry(0.042, 32, 32);
      const proj = new THREE.Mesh(projGeo, ledMat);
      proj.position.set(x + (0.03 * side), 0.68, 1.56);
      headGroup.add(proj);

      // Secondary High-Beam Bulb (32 segments)
      const highGeo = new THREE.SphereGeometry(0.034, 32, 32);
      const high = new THREE.Mesh(highGeo, ledMat);
      high.position.set(x - (0.04 * side), 0.75, 1.42);
      headGroup.add(high);

      // Forward Spotlight
      const spot = new THREE.SpotLight(0xf8fafc, 1.5, 14, Math.PI / 6, 0.35, 1);
      spot.position.set(x, 0.68, 1.62);
      const target = new THREE.Object3D();
      target.position.set(x * 0.5, 0.1, 8.0);
      this.scene.add(target);
      spot.target = target;
      this.scene.add(spot);
      this.headlightLights.push(spot);

      this.carGroup.add(headGroup);
    });
  }

  // ==========================================================================
  // LOWER BUMPER INTAKE, "morning" LICENSE PLATE & FOG LAMPS
  // ==========================================================================
  createTABumperAndFogLamps(blackMat, chromeMat, fogLedMat) {
    const bumperGroup = new THREE.Group();

    // 1. Lower Intake (48 radial segments)
    const intakeGeo = new THREE.CylinderGeometry(0.56, 0.66, 0.24, 48, 1, false, 0, Math.PI);
    intakeGeo.rotateY(-Math.PI / 2);
    const intake = new THREE.Mesh(intakeGeo, blackMat);
    intake.position.set(0, 0.38, 1.61);
    bumperGroup.add(intake);

    // 2. White "morning" Front License Plate
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 512;
    plateCanvas.height = 128;
    const pctx = plateCanvas.getContext('2d');
    pctx.fillStyle = '#ffffff';
    pctx.fillRect(0, 0, 512, 128);
    pctx.strokeStyle = '#cbd5e1';
    pctx.lineWidth = 6;
    pctx.strokeRect(4, 4, 504, 120);
    pctx.fillStyle = '#111827';
    pctx.font = 'bold italic 68px Arial, sans-serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('morning', 256, 64);

    const plateTex = new THREE.CanvasTexture(plateCanvas);
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });
    const plateGeo = new THREE.PlaneGeometry(0.44, 0.11);
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.44, 1.688);
    bumperGroup.add(plate);

    // 3. Swept Boomerang Fog Lamp Housings & Round Projector Fog Lamps
    [-1, 1].forEach(side => {
      const x = side * 0.58;

      const pocketGeo = new THREE.BoxGeometry(0.14, 0.22, 0.08);
      const pocket = new THREE.Mesh(pocketGeo, blackMat);
      pocket.position.set(x, 0.38, 1.58);
      pocket.rotation.y = side * -0.28;
      pocket.rotation.z = side * -0.15;
      bumperGroup.add(pocket);

      // Round Fog Lamp with 32-segment Torus Bezel
      const bezelGeo = new THREE.TorusGeometry(0.034, 0.007, 16, 32);
      const bezel = new THREE.Mesh(bezelGeo, chromeMat);
      bezel.position.set(x + (0.01 * side), 0.36, 1.62);
      bezel.rotation.y = side * -0.28;
      bumperGroup.add(bezel);

      const bulbGeo = new THREE.SphereGeometry(0.026, 32, 32);
      const bulb = new THREE.Mesh(bulbGeo, fogLedMat);
      bulb.position.set(x + (0.01 * side), 0.36, 1.62);
      bumperGroup.add(bulb);
    });

    this.carGroup.add(bumperGroup);
  }

  // ==========================================================================
  // GREENHOUSE (64-Segment Smooth Curved Glass)
  // ==========================================================================
  createTAGreenhouse(glassMat, blackMat) {
    const glassGroup = new THREE.Group();

    // 1. Curved Front Windshield (64 segments for ultra-smooth glass)
    const wsGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.74, 64, 1, true, Math.PI * 0.34, Math.PI * 0.32);
    wsGeo.rotateZ(Math.PI / 2);
    const ws = new THREE.Mesh(wsGeo, glassMat);
    ws.position.set(0, 1.14, 0.44);
    ws.rotation.x = -0.56;
    glassGroup.add(ws);

    // Dual Windshield Wipers
    [-0.24, 0.22].forEach(wx => {
      const wiperGeo = new THREE.BoxGeometry(0.012, 0.012, 0.38);
      const wiper = new THREE.Mesh(wiperGeo, blackMat);
      wiper.position.set(wx, 0.88, 0.74);
      wiper.rotation.set(-0.52, 0.1, -1.35);
      glassGroup.add(wiper);
    });

    // 2. Curved Hatchback Rear Window (64 segments)
    const rwGeo = new THREE.CylinderGeometry(1.52, 1.52, 0.62, 64, 1, true, Math.PI * 0.36, Math.PI * 0.28);
    rwGeo.rotateZ(Math.PI / 2);
    const rw = new THREE.Mesh(rwGeo, glassMat);
    rw.position.set(0, 1.12, -1.32);
    rw.rotation.x = 0.60;
    glassGroup.add(rw);

    // Rear Wiper
    const rwArmGeo = new THREE.BoxGeometry(0.01, 0.01, 0.24);
    const rwArm = new THREE.Mesh(rwArmGeo, blackMat);
    rwArm.position.set(0.05, 1.13, -1.47);
    rwArm.rotation.set(0.60, 0, -1.2);
    glassGroup.add(rwArm);

    // 3. Side Windows with Matte Black B-Pillar & Triangular C-Pillar Corner
    [-1, 1].forEach(side => {
      const x = side * 0.69;

      const sideWinGeo = new THREE.PlaneGeometry(1.80, 0.44);
      const sideWin = new THREE.Mesh(sideWinGeo, glassMat);
      sideWin.position.set(x, 1.10, -0.24);
      sideWin.rotation.y = (side > 0 ? Math.PI / 2 : -Math.PI / 2);
      glassGroup.add(sideWin);

      // Black B-Pillar
      const bPillarGeo = new THREE.BoxGeometry(0.03, 0.46, 0.12);
      const bPillar = new THREE.Mesh(bPillarGeo, blackMat);
      bPillar.position.set(x, 1.10, -0.22);
      glassGroup.add(bPillar);

      // C-Pillar Corner
      const cPillarGeo = new THREE.BoxGeometry(0.03, 0.40, 0.16);
      const cPillar = new THREE.Mesh(cPillarGeo, blackMat);
      cPillar.position.set(x, 1.10, -0.92);
      glassGroup.add(cPillar);
    });

    this.carGroup.add(glassGroup);
  }

  // ==========================================================================
  // TEARDROP SIDE MIRRORS
  // ==========================================================================
  createTASideMirrors(paintMat, blackMat, chromeMat) {
    const amberLedMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.85
    });

    [-1, 1].forEach(side => {
      const mirrorGroup = new THREE.Group();
      const x = side * 0.74;

      const capGeo = new THREE.SphereGeometry(0.09, 32, 32);
      capGeo.scale(1.2, 0.75, 1.4);
      const cap = new THREE.Mesh(capGeo, paintMat);
      cap.position.set(x + (0.10 * side), 0.94, 0.56);
      cap.rotation.y = side * 0.22;
      mirrorGroup.add(cap);
      this.bodyMaterials.push(cap.material);

      const armGeo = new THREE.BoxGeometry(0.08, 0.03, 0.06);
      const arm = new THREE.Mesh(armGeo, blackMat);
      arm.position.set(x + (0.03 * side), 0.92, 0.58);
      arm.rotation.z = side * 0.3;
      mirrorGroup.add(arm);

      const faceGeo = new THREE.PlaneGeometry(0.14, 0.09);
      const face = new THREE.Mesh(faceGeo, chromeMat);
      face.position.set(x + (0.09 * side), 0.94, 0.54);
      face.rotation.y = side * 0.15;
      mirrorGroup.add(face);

      const repeaterGeo = new THREE.BoxGeometry(0.014, 0.014, 0.14);
      const repeater = new THREE.Mesh(repeaterGeo, amberLedMat);
      repeater.position.set(x + (0.16 * side), 0.94, 0.58);
      repeater.rotation.y = side * 0.22;
      mirrorGroup.add(repeater);

      this.carGroup.add(mirrorGroup);
    });
  }

  // ==========================================================================
  // DOOR DETAILS ALONG CHARACTER CREASE
  // ==========================================================================
  createTADoorDetails(paintMat, blackMat, chromeMat) {
    const doorGroup = new THREE.Group();

    const handlePositions = [
      [-0.79, 0.87, 0.28, -1],  // Front Left
      [0.79, 0.87, 0.28, 1],    // Front Right
      [-0.79, 0.89, -0.58, -1], // Rear Left
      [0.79, 0.89, -0.58, 1]    // Rear Right
    ];

    handlePositions.forEach(([hx, hy, hz, side]) => {
      const handleGeo = new THREE.BoxGeometry(0.03, 0.025, 0.14);
      const handle = new THREE.Mesh(handleGeo, paintMat);
      handle.position.set(hx + (0.015 * side), hy, hz);
      doorGroup.add(handle);
      this.bodyMaterials.push(handle.material);

      const btnGeo = new THREE.BoxGeometry(0.008, 0.008, 0.016);
      const btn = new THREE.Mesh(btnGeo, chromeMat);
      btn.position.set(hx + (0.022 * side), hy, hz + 0.04);
      doorGroup.add(btn);
    });

    [-1, 1].forEach(side => {
      const skirtGeo = new THREE.BoxGeometry(0.05, 0.07, 1.82);
      const skirt = new THREE.Mesh(skirtGeo, blackMat);
      skirt.position.set(side * 0.73, 0.26, -0.05);
      doorGroup.add(skirt);
    });

    this.carGroup.add(doorGroup);
  }

  // ==========================================================================
  // REAR FASCIA, VERTICAL TAILLIGHTS & 42° MICRO POLE ANTENNA
  // ==========================================================================
  createTARearAndAntenna(paintMat, blackMat, taillightMat, chromeMat) {
    const rearGroup = new THREE.Group();

    // 1. Rear Roof Spoiler Lip
    const spoilerGeo = new THREE.BoxGeometry(1.22, 0.04, 0.24);
    const spoiler = new THREE.Mesh(spoilerGeo, paintMat);
    spoiler.position.set(0, 1.42, -1.42);
    spoiler.rotation.x = -0.10;
    rearGroup.add(spoiler);
    this.bodyMaterials.push(spoiler.material);

    // High-Mounted Stop Lamp (HMSL)
    const hmslGeo = new THREE.BoxGeometry(0.34, 0.014, 0.02);
    const hmsl = new THREE.Mesh(hmslGeo, taillightMat);
    hmsl.position.set(0, 1.42, -1.51);
    rearGroup.add(hmsl);

    // 2. Micro Pole Antenna
    const antennaBaseGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.03, 32);
    const antennaBase = new THREE.Mesh(antennaBaseGeo, blackMat);
    antennaBase.position.set(0, 1.48, -1.15);
    rearGroup.add(antennaBase);

    const rodGeo = new THREE.CylinderGeometry(0.004, 0.005, 0.36, 16);
    rodGeo.rotateX(-Math.PI / 4.2);
    const rod = new THREE.Mesh(rodGeo, blackMat);
    rod.position.set(0, 1.60, -1.26);
    rearGroup.add(rod);

    // 3. Vertical Curved C-Clamp LED Taillights
    [-1, 1].forEach(side => {
      const x = side * 0.64;
      const tlGroup = new THREE.Group();

      const housingGeo = new THREE.BoxGeometry(0.14, 0.50, 0.16);
      const housing = new THREE.Mesh(housingGeo, taillightMat);
      housing.position.set(x, 0.84, -1.63);
      housing.rotation.y = side * 0.2;
      tlGroup.add(housing);

      const clearMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfef08a,
        emissiveIntensity: 0.4
      });
      const revGeo = new THREE.BoxGeometry(0.07, 0.08, 0.04);
      const rev = new THREE.Mesh(revGeo, clearMat);
      rev.position.set(x, 0.84, -1.66);
      tlGroup.add(rev);

      rearGroup.add(tlGroup);
    });

    // 4. Rear Tailgate Oval KIA Emblem & "morning" script
    const rearLogoGeo = new THREE.BoxGeometry(0.11, 0.05, 0.015);
    const rearLogo = new THREE.Mesh(rearLogoGeo, chromeMat);
    rearLogo.position.set(0, 0.86, -1.66);
    rearGroup.add(rearLogo);

    const scriptGeo = new THREE.BoxGeometry(0.24, 0.024, 0.012);
    const script = new THREE.Mesh(scriptGeo, chromeMat);
    script.position.set(0, 0.72, -1.67);
    rearGroup.add(script);

    // Rear Korean Plate
    const plateGeo = new THREE.PlaneGeometry(0.40, 0.11);
    const plateCanvas = document.createElement('canvas');
    plateCanvas.width = 512;
    plateCanvas.height = 128;
    const pctx = plateCanvas.getContext('2d');
    pctx.fillStyle = '#ffffff';
    pctx.fillRect(0, 0, 512, 128);
    pctx.fillStyle = '#111827';
    pctx.font = 'bold 64px sans-serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('58가 7789', 256, 64);

    const plateTex = new THREE.CanvasTexture(plateCanvas);
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.54, -1.685);
    plate.rotation.y = Math.PI;
    rearGroup.add(plate);

    // Rear Lower Bumper & Dual Reflectors
    const diffuserGeo = new THREE.BoxGeometry(1.24, 0.16, 0.15);
    const diffuser = new THREE.Mesh(diffuserGeo, blackMat);
    diffuser.position.set(0, 0.32, -1.67);
    rearGroup.add(diffuser);

    [-0.50, 0.50].forEach(rx => {
      const refGeo = new THREE.BoxGeometry(0.12, 0.024, 0.02);
      const refMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.2 });
      const ref = new THREE.Mesh(refGeo, refMat);
      ref.position.set(rx, 0.37, -1.68);
      rearGroup.add(ref);
    });

    this.carGroup.add(rearGroup);
  }

  // ==========================================================================
  // ICONIC 15" FLOWER / CLOVER PETAL ALLOY WHEELS (High-Density Smooth Circles)
  // ==========================================================================
  createTAFlowerWheels(silverMat, blackMat, chromeMat) {
    const wheelPositions = [
      [-0.78, 0.29, 1.15, -1],  // Front Left
      [0.78, 0.29, 1.15, 1],    // Front Right
      [-0.78, 0.29, -1.25, -1], // Rear Left
      [0.78, 0.29, -1.25, 1]    // Rear Right
    ];

    const wheelRadius = 0.29; // 580mm overall wheel diameter
    const tireWidth = 0.19;

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.92,
      metalness: 0.05
    });

    const brakeDiscMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.22
    });

    const caliperMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.3,
      roughness: 0.35
    });

    wheelPositions.forEach(([wx, wy, wz, side]) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(wx, wy, wz);

      // 1. Toroidal Rubber Tire (36 x 72 segments for butter-smooth curvature)
      const tireGeo = new THREE.TorusGeometry(wheelRadius - 0.075, 0.075, 36, 72);
      tireGeo.rotateY(Math.PI / 2);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelAssembly.add(tire);

      // Inner Tire Barrel (64 segments)
      const barrelGeo = new THREE.CylinderGeometry(wheelRadius - 0.07, wheelRadius - 0.07, tireWidth - 0.02, 64);
      barrelGeo.rotateZ(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, blackMat);
      wheelAssembly.add(barrel);

      // 2. Machined Alloy Outer Rim Lip (64 segments)
      const rimLipGeo = new THREE.CylinderGeometry(wheelRadius * 0.76, wheelRadius * 0.76, tireWidth + 0.005, 64);
      rimLipGeo.rotateZ(Math.PI / 2);
      const rimLip = new THREE.Mesh(rimLipGeo, silverMat);
      wheelAssembly.add(rimLip);

      // 3. Black Inner Wheel Disc Backing (64 segments)
      const discBackingGeo = new THREE.CylinderGeometry(wheelRadius * 0.74, wheelRadius * 0.74, tireWidth - 0.01, 64);
      discBackingGeo.rotateZ(Math.PI / 2);
      const discBacking = new THREE.Mesh(discBackingGeo, blackMat);
      wheelAssembly.add(discBacking);

      // 4. SIGNATURE FLOWER / CLOVER 4-PETAL DESIGN (플라워 휠)
      const flowerGroup = new THREE.Group();
      const petalRadius = 0.062;
      const petalDist = 0.105;

      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const py = Math.sin(angle) * petalDist;
        const pz = Math.cos(angle) * petalDist;

        // Diamond-Cut Polished Petal Ring (24 x 48 segments)
        const petalRingGeo = new THREE.TorusGeometry(petalRadius, 0.015, 24, 48);
        petalRingGeo.rotateY(Math.PI / 2);
        const petalRing = new THREE.Mesh(petalRingGeo, silverMat);
        petalRing.position.set(side * (tireWidth * 0.5 + 0.008), py, pz);
        flowerGroup.add(petalRing);

        // Recessed Dark Inner Petal Hole (32 segments)
        const holeGeo = new THREE.CylinderGeometry(petalRadius - 0.014, petalRadius - 0.014, 0.02, 32);
        holeGeo.rotateZ(Math.PI / 2);
        const hole = new THREE.Mesh(holeGeo, blackMat);
        hole.position.set(side * (tireWidth * 0.5 + 0.004), py, pz);
        flowerGroup.add(hole);

        // Diagonal Connecting Diamond Bridge Spokes
        const diagAngle = angle + Math.PI / 4;
        const spokeGeo = new THREE.BoxGeometry(0.016, 0.026, wheelRadius * 0.70);
        const spoke = new THREE.Mesh(spokeGeo, silverMat);
        spoke.position.set(side * (tireWidth * 0.5 + 0.006), 0, 0);
        spoke.rotation.x = diagAngle;
        flowerGroup.add(spoke);
      }
      wheelAssembly.add(flowerGroup);

      // 5. Center Hub Cap (32 segments)
      const hubCapGeo = new THREE.CylinderGeometry(0.046, 0.046, tireWidth + 0.028, 32);
      hubCapGeo.rotateZ(Math.PI / 2);
      const hubCap = new THREE.Mesh(hubCapGeo, silverMat);
      wheelAssembly.add(hubCap);

      // Center KIA Logo
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = 128;
      logoCanvas.height = 128;
      const lctx = logoCanvas.getContext('2d');
      lctx.fillStyle = '#111827';
      lctx.fillRect(0, 0, 128, 128);
      lctx.fillStyle = '#e2e8f0';
      lctx.font = 'bold 42px Arial, sans-serif';
      lctx.textAlign = 'center';
      lctx.textBaseline = 'middle';
      lctx.fillText('KIA', 64, 64);
      const logoTex = new THREE.CanvasTexture(logoCanvas);
      const logoMat = new THREE.MeshBasicMaterial({ map: logoTex });
      const logoFace = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), logoMat);
      logoFace.position.set(side * (tireWidth * 0.5 + 0.016), 0, 0);
      logoFace.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      wheelAssembly.add(logoFace);

      // 4 Chrome Lug Nuts
      for (let n = 0; n < 4; n++) {
        const nutAngle = (n * Math.PI) / 2 + Math.PI / 4;
        const nutGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 12);
        nutGeo.rotateZ(Math.PI / 2);
        const nut = new THREE.Mesh(nutGeo, chromeMat);
        nut.position.set(
          side * (tireWidth * 0.5 + 0.015),
          Math.sin(nutAngle) * 0.032,
          Math.cos(nutAngle) * 0.032
        );
        wheelAssembly.add(nut);
      }

      // 6. Steel Brake Disc (48 segments) & Red Caliper
      const discGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, 0.02, 48);
      discGeo.rotateZ(Math.PI / 2);
      const disc = new THREE.Mesh(discGeo, brakeDiscMat);
      disc.position.x = side * -0.025;
      wheelAssembly.add(disc);

      const caliperGeo = new THREE.BoxGeometry(0.05, 0.09, 0.06);
      const caliper = new THREE.Mesh(caliperGeo, caliperMat);
      caliper.position.set(side * -0.025, 0.08, 0.08);
      wheelAssembly.add(caliper);

      this.wheels.push(wheelAssembly);
      this.carGroup.add(wheelAssembly);
    });
  }

  // ==========================================================================
  // INTERIOR COCKPIT
  // ==========================================================================
  createTACockpit(blackMat, silverMat) {
    const cockpitGroup = new THREE.Group();

    // 1. Dashboard
    const dashGeo = new THREE.BoxGeometry(1.26, 0.25, 0.44);
    const dash = new THREE.Mesh(dashGeo, blackMat);
    dash.position.set(0, 0.88, 0.35);
    cockpitGroup.add(dash);

    // 2. Navigation Screen
    const screenGeo = new THREE.BoxGeometry(0.22, 0.11, 0.02);
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 256;
    screenCanvas.height = 128;
    const sctx = screenCanvas.getContext('2d');
    sctx.fillStyle = '#0f172a';
    sctx.fillRect(0, 0, 256, 128);
    sctx.fillStyle = '#b91c1c';
    sctx.fillRect(0, 0, 256, 24);
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 16px sans-serif';
    sctx.fillText('KIA MOTORS · NAVIGATION', 12, 18);
    sctx.fillStyle = '#38bdf8';
    sctx.font = '14px sans-serif';
    sctx.fillText('기아 모닝 · 15.2 km/L', 12, 60);

    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.02, 0.34);
    screen.rotation.x = -0.15;
    cockpitGroup.add(screen);

    // 3. Steering Wheel (24 x 48 segments)
    const wheelRimGeo = new THREE.TorusGeometry(0.14, 0.018, 24, 48);
    const wheelRim = new THREE.Mesh(wheelRimGeo, blackMat);
    wheelRim.position.set(-0.35, 0.96, 0.16);
    wheelRim.rotation.set(-0.55, 0, 0);
    cockpitGroup.add(wheelRim);

    // 4. Front Seats & Headrests
    [-0.34, 0.34].forEach(sx => {
      const cushionGeo = new THREE.BoxGeometry(0.42, 0.14, 0.44);
      const cushion = new THREE.Mesh(cushionGeo, blackMat);
      cushion.position.set(sx, 0.48, -0.05);
      cockpitGroup.add(cushion);

      const backGeo = new THREE.BoxGeometry(0.40, 0.50, 0.12);
      const back = new THREE.Mesh(backGeo, blackMat);
      back.position.set(sx, 0.76, -0.25);
      back.rotation.x = -0.22;
      cockpitGroup.add(back);

      const headGeo = new THREE.BoxGeometry(0.18, 0.14, 0.09);
      const head = new THREE.Mesh(headGeo, blackMat);
      head.position.set(sx, 1.08, -0.32);
      cockpitGroup.add(head);
    });

    // 5. Rear Bench Seat
    const rearBenchGeo = new THREE.BoxGeometry(1.20, 0.14, 0.42);
    const rearBench = new THREE.Mesh(rearBenchGeo, blackMat);
    rearBench.position.set(0, 0.50, -0.82);
    cockpitGroup.add(rearBench);

    const rearBackGeo = new THREE.BoxGeometry(1.18, 0.46, 0.12);
    const rearBack = new THREE.Mesh(rearBackGeo, blackMat);
    rearBack.position.set(0, 0.76, -1.02);
    rearBack.rotation.x = -0.20;
    cockpitGroup.add(rearBack);

    this.carGroup.add(cockpitGroup);
  }

  // ==========================================================================
  // 3D INTERACTIVE SPEC HOTSPOTS
  // ==========================================================================
  setupHotspotMarkers() {
    this.hotspots.forEach((spec, idx) => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(...spec.pos);
      markerGroup.userData = { spec, index: idx };

      // Outer Glowing Ring (48 segments)
      const ringGeo = new THREE.RingGeometry(0.07, 0.095, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      markerGroup.add(ring);

      // Inner Pulsing Core Sphere (24 segments)
      const sphereGeo = new THREE.SphereGeometry(0.04, 24, 24);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.95
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      markerGroup.add(sphere);

      this.scene.add(markerGroup);
      this.hotspotMarkers.push(markerGroup);
    });
  }

  onPointerDown(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.hotspotMarkers, true);

    if (intersects.length > 0) {
      let parent = intersects[0].object;
      while (parent && !parent.userData.spec) {
        parent = parent.parent;
      }
      if (parent && parent.userData.spec) {
        this.selectHotspot(parent.userData.spec);
      }
    }
  }

  selectHotspot(spec) {
    const titleEl = document.getElementById('hotspotTitle');
    const descEl = document.getElementById('hotspotDesc');
    if (titleEl && descEl) {
      titleEl.innerText = spec.title;
      descEl.innerText = spec.desc;

      titleEl.style.transition = 'color 0.3s ease';
      titleEl.style.color = '#38bdf8';
      setTimeout(() => {
        titleEl.style.color = 'var(--text-bright)';
      }, 1000);
    }
  }

  // ==========================================================================
  // PUBLIC CONTROLLER API
  // ==========================================================================
  setColor(colorHex) {
    this.currentColor = colorHex;
    this.bodyMaterials.forEach(mat => {
      mat.color.setHex(colorHex);
    });
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.carGroup.traverse(child => {
      if (child.isMesh && child.material) {
        child.material.wireframe = this.isWireframe;
      }
    });
    return this.isWireframe;
  }

  toggleAutoRotate() {
    this.isAutoRotate = !this.isAutoRotate;
    if (this.controls) {
      this.controls.autoRotate = this.isAutoRotate;
    }
    return this.isAutoRotate;
  }

  toggleHeadlights() {
    this.headlightsOn = !this.headlightsOn;
    this.headlightMaterials.forEach(mat => {
      mat.emissiveIntensity = this.headlightsOn ? 1.0 : 0.05;
    });
    this.headlightLights.forEach(light => {
      light.intensity = this.headlightsOn ? 1.5 : 0.0;
    });
    return this.headlightsOn;
  }

  setCameraPreset(preset) {
    if (!this.controls) return;
    this.controls.autoRotate = false;

    if (preset === 'front') {
      this.camera.position.set(0, 1.15, 4.8);
    } else if (preset === 'side') {
      this.camera.position.set(5.2, 1.15, 0);
    } else if (preset === 'rear') {
      this.camera.position.set(0, 1.40, -4.8);
    } else if (preset === 'top') {
      this.camera.position.set(0, 6.2, 0.1);
    } else if (preset === 'iso') {
      this.camera.position.set(4.2, 1.8, 3.8);
    }
    this.controls.target.set(0, 0.65, 0);
    this.controls.update();
  }

  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight || 480;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);
    this.renderer.setPixelRatio(pixelRatio);
  }

  // ==========================================================================
  // RENDER LOOP
  // ==========================================================================
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const time = performance.now() * 0.002;

    // Pulse Hotspot 3D Markers facing camera
    if (this.camera && this.hotspotMarkers) {
      this.hotspotMarkers.forEach((marker, idx) => {
        marker.quaternion.copy(this.camera.quaternion);
        const scale = 1.0 + Math.sin(time * 3 + idx) * 0.14;
        marker.scale.set(scale, scale, scale);
      });
    }

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.KiaMorningViewer = KiaMorningViewer;
