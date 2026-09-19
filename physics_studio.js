/**
 * Blender-Style 3D Physics Studio with Continuous Flowing River & Waterfall Simulation
 * (Cannon.js Rigid Body Dynamics + 3D Continuous Fluid Mesh Surface + River Current Physics)
 * High-performance 60fps, 4 Blender shading modes, Archimedes buoyancy,
 * flowing current advection (water carries floating objects downstream), and interactive rapids.
 */

// ==========================================================================
// 1. CONTINUOUS FLOWING RIVER & WATERFALL FLUID MESH ENGINE
// ==========================================================================
class ContinuousFlowingRiver {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.flowSpeed = 2.8; // Stream velocity multiplier
    this.time = 0;
    this.surgeWave = 0;
    this.liquidType = 'water';
    this.visible = true;

    // Grid Dimensions: 9m wide, 18m long from Z=-9 to Z=+9
    this.width = 9.0;
    this.halfWidth = this.width / 2;
    this.length = 18.0;
    this.halfLength = this.length / 2;
    this.segX = 36;
    this.segZ = 72;

    this.initMaterials();
    this.buildRiverMesh();
    this.buildRiverBanksAndBed();
    this.buildPhysicsBedrock();
  }

  initMaterials() {
    this.materials = {
      water: new THREE.MeshStandardMaterial({
        color: 0x0284c7, // Vibrant Ocean/River Blue
        roughness: 0.04,
        metalness: 0.25,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      }),
      lava: new THREE.MeshStandardMaterial({
        color: 0xff3b00, // Molten Lava
        emissive: 0xff2200,
        emissiveIntensity: 0.9,
        roughness: 0.45,
        side: THREE.DoubleSide
      }),
      slime: new THREE.MeshStandardMaterial({
        color: 0x65a30d, // Toxic Slime
        roughness: 0.18,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      }),
      mercury: new THREE.MeshStandardMaterial({
        color: 0xe2e8f0, // Liquid Mercury Chrome
        metalness: 0.96,
        roughness: 0.04,
        side: THREE.DoubleSide
      })
    };
  }

  // Smooth Height Profile: Upper reservoir (y=3.4) -> Waterfall (Hermite drop) -> Lower river (y=0.9)
  getRiverBaseY(z) {
    if (z < -5.0) {
      return 3.4; // Upper plateau basin
    } else if (z < -1.5) {
      const t = (z - (-5.0)) / 3.5;
      const s = t * t * (3 - 2 * t); // Smooth Hermite S-curve
      return 3.4 - s * (3.4 - 0.9);
    } else {
      return 0.9; // Lower flowing river & lake
    }
  }

  buildRiverMesh() {
    // 1. Continuous Flowing Water Plane Geometry
    this.geometry = new THREE.PlaneGeometry(
      this.width,
      this.length,
      this.segX - 1,
      this.segZ - 1
    );
    this.geometry.rotateX(-Math.PI / 2);

    // Initial shape conforming to the river profile
    const posAttr = this.geometry.attributes.position;
    this.basePositions = new Float32Array(posAttr.count * 3);

    for (let i = 0; i < posAttr.count; i++) {
      const z = posAttr.getZ(i);
      const baseY = this.getRiverBaseY(z);
      posAttr.setY(i, baseY);
      this.basePositions[i * 3] = posAttr.getX(i);
      this.basePositions[i * 3 + 1] = baseY;
      this.basePositions[i * 3 + 2] = z;
    }

    this.geometry.computeVertexNormals();

    this.waterMesh = new THREE.Mesh(this.geometry, this.materials.water);
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // 2. Waterfall Foam Sheet (White turbulent spray at the drop zone)
    const foamGeo = new THREE.PlaneGeometry(this.width * 0.92, 4.2, 16, 24);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      wireframe: false
    });
    this.foamMesh = new THREE.Mesh(foamGeo, foamMat);
    this.foamMesh.position.set(0, 2.2, -3.25);
    this.foamMesh.rotation.x = 0.62; // Aligned with waterfall slope
    this.scene.add(this.foamMesh);
  }

  buildRiverBanksAndBed() {
    this.canyonGroup = new THREE.Group();

    // Natural Slate Rock Material for Canyon Walls
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.85,
      metalness: 0.15
    });

    const hw = this.halfWidth;
    const l = this.length;

    // Left Canyon Bank
    const leftBankGeo = new THREE.BoxGeometry(1.6, 4.5, l);
    const leftBank = new THREE.Mesh(leftBankGeo, rockMat);
    leftBank.position.set(-hw - 0.8, 2.2, 0);
    leftBank.receiveShadow = true;
    leftBank.castShadow = true;
    this.canyonGroup.add(leftBank);

    // Right Canyon Bank
    const rightBankGeo = new THREE.BoxGeometry(1.6, 4.5, l);
    const rightBank = new THREE.Mesh(rightBankGeo, rockMat);
    rightBank.position.set(hw + 0.8, 2.2, 0);
    rightBank.receiveShadow = true;
    rightBank.castShadow = true;
    this.canyonGroup.add(rightBank);

    // Upper Reservoir Back Wall
    const backWallGeo = new THREE.BoxGeometry(this.width + 3.2, 4.8, 1.4);
    const backWall = new THREE.Mesh(backWallGeo, rockMat);
    backWall.position.set(0, 2.4, -this.halfLength - 0.7);
    backWall.receiveShadow = true;
    backWall.castShadow = true;
    this.canyonGroup.add(backWall);

    // Stone Steps under Waterfall
    for (let step = 0; step < 3; step++) {
      const stepGeo = new THREE.BoxGeometry(this.width, 0.6, 1.2);
      const stepMesh = new THREE.Mesh(stepGeo, rockMat);
      stepMesh.position.set(0, 1.2 + step * 0.7, -4.6 + step * 1.1);
      stepMesh.receiveShadow = true;
      this.canyonGroup.add(stepMesh);
    }

    this.scene.add(this.canyonGroup);
  }

  buildPhysicsBedrock() {
    // 1. Upper Reservoir Floor Bedrock in Cannon.js
    const upperBedBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 1.5, -7.0)
    });
    upperBedBody.addShape(new CANNON.Box(new CANNON.Vec3(this.halfWidth + 0.5, 1.5, 2.2)));
    this.world.addBody(upperBedBody);

    // 2. Left and Right Canyon Walls in Cannon.js (Keeps floating objects in river)
    const leftWallBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(-this.halfWidth - 0.6, 2.2, 0)
    });
    leftWallBody.addShape(new CANNON.Box(new CANNON.Vec3(0.6, 2.5, this.halfLength)));
    this.world.addBody(leftWallBody);

    const rightWallBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(this.halfWidth + 0.6, 2.2, 0)
    });
    rightWallBody.addShape(new CANNON.Box(new CANNON.Vec3(0.6, 2.5, this.halfLength)));
    this.world.addBody(rightWallBody);

    // 3. Back Barrier in Cannon.js
    const backWallBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 2.4, -this.halfLength - 0.5)
    });
    backWallBody.addShape(new CANNON.Box(new CANNON.Vec3(this.halfWidth + 1.0, 2.5, 0.6)));
    this.world.addBody(backWallBody);

    // 4. Waterfall Sloped Bedrock
    const slopeBody = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(0, 1.8, -3.2)
    });
    slopeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -0.55);
    slopeBody.addShape(new CANNON.Box(new CANNON.Vec3(this.halfWidth, 0.4, 2.1)));
    this.bedBodies = [upperBedBody, leftWallBody, rightWallBody, backWallBody, slopeBody];
  }

  setVisible(visible) {
    this.visible = visible;
    this.waterMesh.visible = visible;
    if (this.foamMesh) this.foamMesh.visible = visible && (this.liquidType === 'water');
    if (this.canyonGroup) this.canyonGroup.visible = visible;
    if (this.bedBodies) {
      this.bedBodies.forEach(b => {
        b.collisionResponse = visible;
      });
    }
  }

  setLiquidType(type) {
    if (!this.materials[type]) return;
    this.liquidType = type;
    this.waterMesh.material = this.materials[type];

    if (type === 'lava') {
      this.foamMesh.visible = false;
      this.flowSpeed = 1.6;
    } else if (type === 'slime') {
      this.foamMesh.visible = false;
      this.flowSpeed = 1.9;
    } else if (type === 'mercury') {
      this.foamMesh.visible = false;
      this.flowSpeed = 3.2;
    } else {
      this.foamMesh.visible = true;
      this.flowSpeed = 2.8;
    }

    const slider = document.getElementById('sliderFlowSpeed');
    if (slider) slider.value = this.flowSpeed;
    const badge = document.getElementById('flowSpeedVal');
    if (badge) badge.innerText = `${(this.flowSpeed * 1.2).toFixed(1)} m/s`;
    const speedBadge = document.getElementById('studioFlowSpeedBadge');
    if (speedBadge) {
      const typeIcons = { water: '🌊', lava: '🌋', slime: '🧪', mercury: '🪞' };
      speedBadge.innerText = `${typeIcons[type] || '🌊'} 유속: ${(this.flowSpeed * 1.2).toFixed(1)} m/s`;
    }
  }

  setFlowSpeed(val) {
    this.flowSpeed = parseFloat(val);
    const badge = document.getElementById('flowSpeedVal');
    if (badge) badge.innerText = `${(this.flowSpeed * 1.2).toFixed(1)} m/s`;
    const speedBadge = document.getElementById('studioFlowSpeedBadge');
    if (speedBadge) {
      const typeIcons = { water: '🌊', lava: '🌋', slime: '🧪', mercury: '🪞' };
      speedBadge.innerText = `${typeIcons[this.liquidType] || '🌊'} 유속: ${(this.flowSpeed * 1.2).toFixed(1)} m/s`;
    }
  }

  triggerSurge(strength = 1.8) {
    this.surgeWave = strength;
  }

  update(dt, rigidBodies = []) {
    if (!this.visible) return;

    this.time += dt * this.flowSpeed;
    if (this.surgeWave > 0) {
      this.surgeWave = Math.max(0, this.surgeWave - dt * 0.8);
    }

    // 1. Procedural Animated Fluid Mesh Waves (Continuous Flowing Forward)
    const posAttr = this.geometry.attributes.position;
    const count = posAttr.count;
    const t = this.time;
    const surge = this.surgeWave;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const x = this.basePositions[idx];
      const baseY = this.basePositions[idx + 1];
      const z = this.basePositions[idx + 2];

      // Gerstner / Sine dual-wave flowing forward (+Z direction)
      const wave1 = 0.12 * Math.sin(2.4 * z - t * 3.2);
      const wave2 = 0.07 * Math.cos(2.8 * x + 1.8 * z - t * 4.0);

      // Rapid turbulent rapids at the waterfall drop zone (-5.0 <= z <= -1.5)
      let waterfallTurbulence = 0;
      if (z >= -5.2 && z <= -1.2) {
        waterfallTurbulence = 0.16 * Math.sin(6.0 * z - t * 8.0) * Math.cos(4.0 * x);
      }

      // Surge tsunami wave
      const surgeOffset = surge * 0.5 * Math.sin(1.5 * z - t * 2.0);

      posAttr.setY(i, baseY + wave1 + wave2 + waterfallTurbulence + surgeOffset);
    }

    posAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();

    // Subtle foam pulsing
    if (this.foamMesh.visible) {
      this.foamMesh.material.opacity = 0.32 + 0.14 * Math.sin(t * 5.0);
    }

    // 2. REAL PHYSICAL RIVER CURRENT ADVECTION & BUOYANCY ON RIGID BODIES
    if (rigidBodies && rigidBodies.length > 0) {
      for (let b = 0; b < rigidBodies.length; b++) {
        const item = rigidBodies[b];
        const body = item.body;
        if (!body || body.mass === 0) continue;

        const bx = body.position.x;
        const by = body.position.y;
        const bz = body.position.z;

        // Check if inside river channel bounds: |x| < 4.2 and -8.5 < z < 8.5
        if (Math.abs(bx) < this.halfWidth - 0.2 && bz > -8.5 && bz < this.halfLength - 0.2) {
          const baseY = this.getRiverBaseY(bz);
          const surfaceY = baseY + 0.1 * Math.sin(2.4 * bz - t * 3.2);
          const depth = surfaceY - by;

          // Object is in or touching the flowing water!
          if (depth > -0.3) {
            const subFactor = Math.min(1.8, Math.max(0, depth + 0.4));

            // A. Archimedes Buoyancy (Upward lift)
            const fBuoyancy = body.mass * 19.5 * subFactor;
            body.applyForce(new CANNON.Vec3(0, fBuoyancy, 0), body.position);

            // B. River Current Flow Vector (Pushes object forward downstream!)
            let targetVz = 2.4 * this.flowSpeed; // Steady lower river velocity
            let targetVy = 0.0;

            if (bz >= -5.2 && bz <= -1.5) {
              // Rapid waterfall drop: accelerates downward and violently forward!
              targetVy = -4.5;
              targetVz = 5.2 * this.flowSpeed;
            } else if (bz < -5.2) {
              // Upper reservoir steady current
              targetVz = 1.8 * this.flowSpeed;
            }

            // Current drag force F = (targetVel - bodyVel) * dragCoeff
            const fCurrentZ = (targetVz - body.velocity.z) * body.mass * 3.6;
            const fCurrentY = (targetVy - body.velocity.y) * body.mass * 2.0;

            // Center drift force (keeps objects floating in middle of river)
            const fCenter = -bx * body.mass * 1.5;

            body.applyForce(new CANNON.Vec3(fCenter, fCurrentY, fCurrentZ), body.position);

            // Water viscosity damping
            body.velocity.x *= 0.94;
            body.angularVelocity.scale(0.93, body.angularVelocity);
          }
        }
      }
    }

    // Update UI Flow speed meter
    const speedEl = document.getElementById('studioFlowSpeedBadge');
    if (speedEl) {
      speedEl.innerText = `${(this.flowSpeed * 1.2).toFixed(1)} m/s`;
    }
  }
}

// ==========================================================================
// 1.5. KOREAN NATIONAL ANTHEM (대한민국 애국가) WEB AUDIO SYNTHESIZER
// ==========================================================================
class AegukgaPlayer {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.timerIds = [];
    this.onStateChange = null;
  }

  init() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  stop() {
    this.timerIds.forEach(id => clearTimeout(id));
    this.timerIds = [];
    this.isPlaying = false;
    if (this.audioCtx) {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
    if (this.onStateChange) this.onStateChange(false);
  }

  play() {
    this.stop();
    this.init();
    this.isPlaying = true;
    if (this.onStateChange) this.onStateChange(true);

    const ctx = this.audioCtx;
    const bpm = 84;
    const beatSec = 60 / bpm; // ~0.714s per quarter beat

    // 대한민국 애국가 멜로디와 화음 (Korean National Anthem)
    const notes = [
      // 1: 동해물과 백두산이 마르고 닳도록
      { m: 'G4', b: 0.75, c: 'C' },
      { m: 'G4', b: 0.25, c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'C4', b: 0.5,  c: 'C' },
      { m: 'D4', b: 0.5,  c: 'G' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'F4', b: 0.5,  c: 'F' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'D4', b: 0.75, c: 'G' },
      { m: 'D4', b: 0.25, c: 'G' },
      { m: 'D4', b: 1.0,  c: 'G' },
      { m: 'E4', b: 0.75, c: 'C' },
      { m: 'F4', b: 0.25, c: 'F' },
      { m: 'G4', b: 0.5,  c: 'C' },
      { m: 'A4', b: 0.5,  c: 'F' },
      { m: 'G4', b: 1.0,  c: 'C' },
      { m: 'E4', b: 1.0,  c: 'C' },

      // 2: 하느님이 보우하사 우리나라 만세
      { m: 'A4', b: 0.75, c: 'F' },
      { m: 'A4', b: 0.25, c: 'F' },
      { m: 'C5', b: 0.5,  c: 'C' },
      { m: 'B4', b: 0.5,  c: 'G' },
      { m: 'A4', b: 0.5,  c: 'F' },
      { m: 'G4', b: 0.5,  c: 'C' },
      { m: 'A4', b: 0.5,  c: 'F' },
      { m: 'G4', b: 0.5,  c: 'C' },
      { m: 'E4', b: 0.75, c: 'C' },
      { m: 'D4', b: 0.25, c: 'G' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'F4', b: 0.5,  c: 'F' },
      { m: 'D4', b: 1.5,  c: 'G' },
      { m: 'G4', b: 0.5,  c: 'G' },
      { m: 'C4', b: 2.0,  c: 'C' },

      // 3: 무궁화 삼천리 화려강산
      { m: 'E4', b: 1.0,  c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'F4', b: 0.5,  c: 'F' },
      { m: 'G4', b: 1.0,  c: 'C' },
      { m: 'A4', b: 0.75, c: 'F' },
      { m: 'B4', b: 0.25, c: 'G' },
      { m: 'C5', b: 0.5,  c: 'C' },
      { m: 'A4', b: 0.5,  c: 'F' },
      { m: 'G4', b: 1.5,  c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },

      // 4: 대한사람 대한으로 길이 보전하세
      { m: 'G4', b: 0.75, c: 'C' },
      { m: 'G4', b: 0.25, c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'C4', b: 0.5,  c: 'C' },
      { m: 'D4', b: 0.5,  c: 'G' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'F4', b: 0.5,  c: 'F' },
      { m: 'A4', b: 0.5,  c: 'F' },
      { m: 'G4', b: 1.0,  c: 'C' },
      { m: 'C5', b: 1.0,  c: 'C' },
      { m: 'G4', b: 0.5,  c: 'C' },
      { m: 'E4', b: 0.5,  c: 'C' },
      { m: 'D4', b: 0.75, c: 'G' },
      { m: 'E4', b: 0.25, c: 'C' },
      { m: 'C4', b: 3.0,  c: 'C' }
    ];

    const freqMap = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25
    };

    const chordBassMap = {
      'C': 130.81, // C3
      'G': 98.00,  // G2
      'F': 110.00  // A2 / F2
    };

    let startTime = ctx.currentTime + 0.08;

    notes.forEach(item => {
      const dur = item.b * beatSec;
      const freq = freqMap[item.m] || 440;

      // Brass / Strings Timbre (Sawtooth + Triangle with smooth low-pass filter)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, startTime);
      filter.Q.setValueAtTime(1.8, startTime);

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.002, startTime); // Subtle chorus richness

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
      gain.gain.setValueAtTime(0.16, startTime + dur * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.96);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(filter);
      filter.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + dur);
      osc2.stop(startTime + dur);

      // Deep Orchestral Brass/Bass Accompaniment
      if (item.c && (item.b >= 0.75 || item === notes[0])) {
        const bassOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(chordBassMap[item.c] || 130.81, startTime);

        bassGain.gain.setValueAtTime(0.0001, startTime);
        bassGain.gain.linearRampToValueAtTime(0.13, startTime + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur * 0.94);

        bassOsc.connect(bassGain);
        bassGain.connect(ctx.destination);

        bassOsc.start(startTime);
        bassOsc.stop(startTime + dur);
      }

      startTime += dur;
    });

    const totalDurationMs = (startTime - ctx.currentTime) * 1000;
    const tid = setTimeout(() => {
      this.isPlaying = false;
      if (this.onStateChange) this.onStateChange(false);
    }, Math.max(totalDurationMs, 1000));
    this.timerIds.push(tid);
  }
}

// ==========================================================================
// 2. MAIN BLENDER 3D PHYSICS & FLOWING RIVER STUDIO
// ==========================================================================
class BlenderPhysicsStudio {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container element not found:', containerId);
      return;
    }

    // Studio state
    this.shadingMode = 'rendered'; // 'wireframe', 'solid', 'material', 'rendered'
    this.timeScale = 1.0;
    this.currentGravity = -9.82;
    this.restitution = 0.4;
    this.friction = 0.3;
    this.objects = []; // { mesh, body, initialColor, type }
    this.constraints = []; // Ragdoll joints and physics constraints
    this.drones = []; // Active DJI Drones

    // Korean National Anthem Web Audio Player
    this.aegukga = new AegukgaPlayer();

    // Map System State
    this.currentMap = 'canyon'; // 'canyon', 'wall_district', 'cyber'
    this.mapGroup = new THREE.Group();
    this.mapBodies = [];

    // FPS & Real-Time Performance Monitor (Default: Max 240 FPS Target)
    this.targetFps = 240;
    this.frameDuration = 1000 / this.targetFps; // 4.1666ms
    this.fps = 240;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.lastFrameTime = performance.now();
    this.fpsBadgeEl = null;
    this.isPaused = false;

    // Mouse drag physics state
    this.isDraggingObject = false;
    this.draggedBody = null;
    this.dragPlane = new THREE.Plane();
    this.planeIntersect = new THREE.Vector3();
    this.dragOffset = new THREE.Vector3();
    this.mouseVelocity = new THREE.Vector3();
    this.lastMousePos = new THREE.Vector3();
    this.lastDragTime = 0;

    this.palette = [
      0xe87d0d, // Blender Orange
      0x00b4d8, // Electric Blue
      0x7209b7, // Deep Purple
      0x4ade80, // Emerald Green
      0xf72585, // Neon Magenta
      0xfbbf24, // Warm Amber
      0xe0e7ff, // Ice White
      0xef4444  // Vivid Red
    ];

    this.initThree();
    this.initCannon();
    this.initInteraction();
    this.setupLighting();
    this.createStudioFloor();
    this.scene.add(this.mapGroup);

    // Initialize Continuous Flowing River & Waterfall
    this.river = new ContinuousFlowingRiver(this.scene, this.world);

    this.bindUI();

    // Default Scene: Floating objects riding the waterfall and stream!
    this.buildRiverStreamScene();

    // Start 240 FPS high-precision simulation loop
    this.clock = new THREE.Clock();
    this.initLoop();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  // ==========================================
  // THREE.JS VIEWPORT & RENDERER SETUP
  // ==========================================
  initThree() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || (window.innerHeight - 80);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x242426);
    this.scene.fog = new THREE.FogExp2(0x242426, 0.015);

    this.camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 500);
    this.camera.position.set(12, 10, 15);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.01;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 60;
    this.controls.target.set(0, 1.8, 0);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  // ==========================================
  // CANNON.JS PHYSICS WORLD SETUP
  // ==========================================
  initCannon() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, this.currentGravity, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 12;

    this.groundPhysicsMaterial = new CANNON.Material('ground');
    this.objectPhysicsMaterial = new CANNON.Material('object');

    this.groundContactMaterial = new CANNON.ContactMaterial(
      this.groundPhysicsMaterial,
      this.objectPhysicsMaterial,
      { friction: this.friction, restitution: this.restitution }
    );
    this.world.addContactMaterial(this.groundContactMaterial);

    this.objectContactMaterial = new CANNON.ContactMaterial(
      this.objectPhysicsMaterial,
      this.objectPhysicsMaterial,
      { friction: this.friction, restitution: this.restitution }
    );
    this.world.addContactMaterial(this.objectContactMaterial);

    const groundShape = new CANNON.Plane();
    this.groundBody = new CANNON.Body({ mass: 0, material: this.groundPhysicsMaterial });
    this.groundBody.addShape(groundShape);
    this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.groundBody);

    this.createArenaBoundaries(70);
  }

  createArenaBoundaries(size) {
    const wallMaterial = new CANNON.Material('wall');
    const wallContact = new CANNON.ContactMaterial(this.objectPhysicsMaterial, wallMaterial, {
      friction: 0.1,
      restitution: 0.5
    });
    this.world.addContactMaterial(wallContact);

    const half = size / 2;
    const wallShape = new CANNON.Plane();

    const walls = [
      { pos: [0, 0, -half], rot: [0, 0, 0] },
      { pos: [0, 0, half], rot: [0, Math.PI, 0] },
      { pos: [-half, 0, 0], rot: [0, Math.PI / 2, 0] },
      { pos: [half, 0, 0], rot: [0, -Math.PI / 2, 0] }
    ];

    walls.forEach(w => {
      const b = new CANNON.Body({ mass: 0, material: wallMaterial });
      b.addShape(wallShape);
      b.position.set(w.pos[0], w.pos[1], w.pos[2]);
      b.quaternion.setFromEuler(w.rot[0], w.rot[1], w.rot[2]);
      this.world.addBody(b);
    });
  }

  // ==========================================
  // BLENDER STUDIO LIGHTING & FLOOR
  // ==========================================
  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    this.keyLight.position.set(16, 24, 14);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 70;
    this.keyLight.shadow.camera.left = -16;
    this.keyLight.shadow.camera.right = 16;
    this.keyLight.shadow.camera.top = 16;
    this.keyLight.shadow.camera.bottom = -16;
    this.keyLight.shadow.bias = -0.0003;
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.45);
    this.fillLight.position.set(-14, 12, -10);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0xfb923c, 0.35);
    this.rimLight.position.set(0, 10, -18);
    this.scene.add(this.rimLight);
  }

  createStudioFloor() {
    this.grid = new THREE.GridHelper(36, 36, 0x52525b, 0x333338);
    this.grid.position.y = 0.002;
    this.scene.add(this.grid);

    const groundGeo = new THREE.PlaneGeometry(60, 60);
    this.groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e22,
      roughness: 0.85,
      metalness: 0.15
    });
    this.groundMesh = new THREE.Mesh(groundGeo, this.groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const originGeo = new THREE.RingGeometry(0.8, 0.85, 32);
    const originMat = new THREE.MeshBasicMaterial({ color: 0xe87d0d, side: THREE.DoubleSide });
    this.originRing = new THREE.Mesh(originGeo, originMat);
    this.originRing.rotation.x = -Math.PI / 2;
    this.originRing.position.y = 0.003;
    this.scene.add(this.originRing);
  }

  // ==========================================
  // BLENDER VIEWPORT SHADING MODES
  // ==========================================
  setShadingMode(mode) {
    this.shadingMode = mode;

    this.objects.forEach(item => {
      const mesh = item.mesh;
      if (mesh.userData.isHelper) return;

      if (mode === 'wireframe') {
        mesh.material = new THREE.MeshBasicMaterial({ color: 0x4ade80, wireframe: true });
        mesh.castShadow = false;
      } else if (mode === 'solid') {
        mesh.material = new THREE.MeshLambertMaterial({ color: 0xd4d4d8 });
        mesh.castShadow = true;
      } else if (mode === 'material') {
        mesh.material = new THREE.MeshStandardMaterial({
          color: item.initialColor,
          metalness: 0.25,
          roughness: 0.35
        });
        mesh.castShadow = false;
      } else if (mode === 'rendered') {
        mesh.material = new THREE.MeshStandardMaterial({
          color: item.initialColor,
          metalness: 0.4,
          roughness: 0.3,
          clearcoat: 0.3
        });
        mesh.castShadow = true;
      }
    });

    document.querySelectorAll('.blender-shade-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  // ==========================================
  // OBJECT CREATION & SPAWN PRIMITIVES
  // ==========================================
  getRandomColor() {
    return this.palette[Math.floor(Math.random() * this.palette.length)];
  }

  registerObject(mesh, body, color, type = 'primitive') {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { body, color, type };

    this.scene.add(mesh);
    this.world.addBody(body);

    const entry = { mesh, body, initialColor: color, type };
    this.objects.push(entry);

    this.setShadingMode(this.shadingMode);
    this.updateStats();
    return entry;
  }

  spawnCube(x = 0, y = 5, z = 0, size = 1.2, color = null) {
    const c = color || this.getRandomColor();
    const half = size / 2;

    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);

    const shape = new CANNON.Box(new CANNON.Vec3(half, half, half));
    const body = new CANNON.Body({
      mass: size * size * size * 1.5,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(x, y, z)
    });
    body.addShape(shape);
    return this.registerObject(mesh, body, c, 'cube');
  }

  spawnSphere(x = 0, y = 5, z = 0, radius = 0.7, color = null) {
    const c = color || this.getRandomColor();

    const geo = new THREE.SphereGeometry(radius, 32, 24);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: (4 / 3) * Math.PI * Math.pow(radius, 3) * 1.5,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(x, y, z)
    });
    body.addShape(shape);
    return this.registerObject(mesh, body, c, 'sphere');
  }

  spawnCylinder(x = 0, y = 5, z = 0, radius = 0.6, height = 1.4, color = null) {
    const c = color || this.getRandomColor();

    const geo = new THREE.CylinderGeometry(radius, radius, height, 28);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);

    const shape = new CANNON.Cylinder(radius, radius, height, 16);
    const body = new CANNON.Body({
      mass: Math.PI * radius * radius * height * 1.4,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(x, y, z)
    });
    body.addShape(shape);
    return this.registerObject(mesh, body, c, 'cylinder');
  }

  spawnTorus(x = 0, y = 5, z = 0, radius = 0.8, tube = 0.3, color = null) {
    const c = color || this.getRandomColor();

    const geo = new THREE.TorusGeometry(radius, tube, 20, 36);
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);

    const body = new CANNON.Body({
      mass: 2.0,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(x, y, z)
    });

    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      body.addShape(new CANNON.Sphere(tube * 1.1), new CANNON.Vec3(px, py, 0));
    }
    return this.registerObject(mesh, body, c, 'torus');
  }

  spawnPhysicsCar(x = 0, y = 4, z = 0) {
    const carColor = 0x3b82f6;
    const carGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(2.4, 0.6, 1.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.3, metalness: 0.4 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.3;
    bodyMesh.castShadow = true;
    carGroup.add(bodyMesh);

    const cabinGeo = new THREE.BoxGeometry(1.3, 0.5, 1.0);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2, metalness: 0.8 });
    const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
    cabinMesh.position.set(-0.1, 0.75, 0);
    cabinMesh.castShadow = true;
    carGroup.add(cabinMesh);

    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 20);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
    const wheelPositions = [
      [0.8, 0, 0.65],
      [0.8, 0, -0.65],
      [-0.8, 0, 0.65],
      [-0.8, 0, -0.65]
    ];

    wheelPositions.forEach(pos => {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.rotation.x = Math.PI / 2;
      wMesh.position.set(pos[0], pos[1], pos[2]);
      wMesh.castShadow = true;
      carGroup.add(wMesh);
    });

    carGroup.position.set(x, y, z);

    const carBody = new CANNON.Body({
      mass: 7.0,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(x, y, z)
    });

    carBody.addShape(new CANNON.Box(new CANNON.Vec3(1.2, 0.3, 0.6)), new CANNON.Vec3(0, 0.3, 0));
    carBody.addShape(new CANNON.Box(new CANNON.Vec3(0.65, 0.25, 0.5)), new CANNON.Vec3(-0.1, 0.75, 0));

    wheelPositions.forEach(pos => {
      carBody.addShape(new CANNON.Sphere(0.35), new CANNON.Vec3(pos[0], pos[1], pos[2]));
    });

    return this.registerObject(carGroup, carBody, carColor, 'car');
  }

  // ==========================================
  // DJI QUADCOPTER DRONE (4K Camera, 4 Rotors, Hover Stabilization)
  // ==========================================
  spawnDjiDrone(x = 0, y = 5.0, z = 0) {
    const droneGroup = new THREE.Group();
    droneGroup.position.set(x, y, z);

    // 1. Central Aerodynamic Fuselage (DJI Mavic / Mini Matte Dark Slate)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x22262e,
      roughness: 0.35,
      metalness: 0.55
    });

    const upperMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.65
    });

    // Lower streamlined body
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.22, 1.1);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = true;
    droneGroup.add(bodyMesh);

    // Top Aerodynamic Canopy
    const topGeo = new THREE.BoxGeometry(0.55, 0.12, 0.85);
    const topMesh = new THREE.Mesh(topGeo, upperMat);
    topMesh.position.set(0, 0.14, -0.05);
    topMesh.castShadow = true;
    droneGroup.add(topMesh);

    // DJI LED Battery Level Status Bar
    const stripGeo = new THREE.BoxGeometry(0.18, 0.04, 0.4);
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9
    });
    const stripMesh = new THREE.Mesh(stripGeo, stripMat);
    stripMesh.position.set(0, 0.21, 0.15);
    droneGroup.add(stripMesh);

    // 2. 3-Axis 4K Camera Gimbal with Gold Accent Ring
    const gimbalArmGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8);
    const gimbalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const gimbalArm = new THREE.Mesh(gimbalArmGeo, gimbalMat);
    gimbalArm.position.set(0, -0.1, -0.55);
    gimbalArm.rotation.x = Math.PI / 2;
    droneGroup.add(gimbalArm);

    const camGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.18, 16);
    const camMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.8 });
    const camMesh = new THREE.Mesh(camGeo, camMat);
    camMesh.rotation.x = Math.PI / 2;
    camMesh.position.set(0, -0.16, -0.62);
    droneGroup.add(camMesh);

    // Gold camera accent ring (DJI Pro Signature)
    const ringGeo = new THREE.TorusGeometry(0.12, 0.015, 8, 24);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, -0.16, -0.71);
    droneGroup.add(ringMesh);

    // Optical Lens
    const lensGeo = new THREE.SphereGeometry(0.08, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.rotation.x = -Math.PI / 2;
    lensMesh.position.set(0, -0.16, -0.72);
    droneGroup.add(lensMesh);

    // 3. 4 Rotor Arms with Motors and Low-Noise Propellers
    const armMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
    const motorMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9, roughness: 0.3 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.3 });
    const propTipMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 }); // Orange safety tips

    const armOffsets = [
      { x: -0.75, z: -0.75, angle: Math.PI / 4, isFront: true },
      { x:  0.75, z: -0.75, angle: -Math.PI / 4, isFront: true },
      { x: -0.85, z:  0.75, angle: 3 * Math.PI / 4, isFront: false },
      { x:  0.85, z:  0.75, angle: -3 * Math.PI / 4, isFront: false }
    ];

    const propellers = [];

    armOffsets.forEach(pos => {
      // Carbon arm beam
      const armGeo = new THREE.BoxGeometry(0.1, 0.08, 0.85);
      const armMesh = new THREE.Mesh(armGeo, armMat);
      armMesh.position.set(pos.x * 0.5, 0.02, pos.z * 0.5);
      armMesh.rotation.y = pos.angle;
      armMesh.castShadow = true;
      droneGroup.add(armMesh);

      // Brushless motor housing
      const motorGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.14, 16);
      const motorMesh = new THREE.Mesh(motorGeo, motorMat);
      motorMesh.position.set(pos.x, 0.09, pos.z);
      motorMesh.castShadow = true;
      droneGroup.add(motorMesh);

      // Glowing LED navigation indicator under motor
      const ledColor = pos.isFront ? 0xef4444 : 0x10b981; // Front Red, Rear Green
      const ledMat = new THREE.MeshStandardMaterial({
        color: ledColor,
        emissive: ledColor,
        emissiveIntensity: 1.5
      });
      const ledGeo = new THREE.SphereGeometry(0.05, 8, 8);
      const ledMesh = new THREE.Mesh(ledGeo, ledMat);
      ledMesh.position.set(pos.x, -0.02, pos.z);
      droneGroup.add(ledMesh);

      // Rotating Propeller Group
      const propGroup = new THREE.Group();
      propGroup.position.set(pos.x, 0.17, pos.z);

      const bladeGeo = new THREE.BoxGeometry(0.85, 0.015, 0.1);
      const bladeMesh = new THREE.Mesh(bladeGeo, propMat);
      bladeMesh.castShadow = true;
      propGroup.add(bladeMesh);

      // Dual Orange Tips
      const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.102), propTipMat);
      tip1.position.set(0.38, 0, 0);
      propGroup.add(tip1);
      const tip2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.102), propTipMat);
      tip2.position.set(-0.38, 0, 0);
      propGroup.add(tip2);

      droneGroup.add(propGroup);
      propellers.push(propGroup);
    });

    // Landing skids
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    [-0.3, 0.3].forEach(sx => {
      const legGeo = new THREE.BoxGeometry(0.06, 0.22, 0.6);
      const legMesh = new THREE.Mesh(legGeo, skidMat);
      legMesh.position.set(sx, -0.16, 0);
      legMesh.castShadow = true;
      droneGroup.add(legMesh);
    });

    // Cannon.js Rigid Body
    const droneBody = new CANNON.Body({
      mass: 3.5,
      linearDamping: 0.2,
      angularDamping: 0.3,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(x, y, z)
    });

    droneBody.addShape(new CANNON.Box(new CANNON.Vec3(0.4, 0.18, 0.6)));
    droneBody.addShape(new CANNON.Box(new CANNON.Vec3(0.85, 0.08, 0.85)));

    this.world.addBody(droneBody);
    this.scene.add(droneGroup);

    const droneObj = {
      mesh: droneGroup,
      body: droneBody,
      propellers: propellers,
      type: 'dji_drone',
      targetHoverY: y,
      isHovering: true
    };

    this.objects.push(droneObj);
    if (!this.drones) this.drones = [];
    this.drones.push(droneObj);

    this.updateStats();
    return droneObj;
  }

  // ==========================================
  // HUMAN RAGDOLL PHYSICS (10 Connected Joints)
  // ==========================================
  spawnHumanRagdoll(x = 0, y = 5.0, z = 0, scale = 1.0, shirtColor = null) {
    if (!this.constraints) this.constraints = [];

    const sc = scale;
    const skinColor = 0xfbcfe8;
    const topColor = shirtColor || this.getRandomColor();
    const pantsColor = 0x1e3a8a; // Denim Blue
    const shoeColor = 0x09090b;  // Black sneakers

    const matStandard = (col, rough = 0.45, metal = 0.1) => {
      return new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: metal });
    };

    // Helper to create & register a ragdoll part
    const makePart = (shape, geo, mat, mass, pos, type = 'ragdoll') => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const body = new CANNON.Body({
        mass: mass,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(pos.x, pos.y, pos.z),
        linearDamping: 0.05,
        angularDamping: 0.12
      });
      body.addShape(shape);

      this.registerObject(mesh, body, mat.color.getHex(), type);
      return { mesh, body };
    };

    // 1. Head (with Hair & Face Details)
    const headRadius = 0.26 * sc;
    const head = makePart(
      new CANNON.Sphere(headRadius),
      new THREE.SphereGeometry(headRadius, 16, 16),
      matStandard(skinColor),
      2.5,
      { x: x, y: y + 1.6 * sc, z: z },
      'ragdoll_head'
    );

    // Hair Style (Stylized dark brown hair mesh)
    const hairGeo = new THREE.SphereGeometry(headRadius * 1.05, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.58);
    const hairMat = matStandard(0x27272a, 0.8);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.y = headRadius * 0.1;
    head.mesh.add(hairMesh);

    // Cool Sunglasses / Face Visor
    const glassGeo = new THREE.BoxGeometry(headRadius * 1.25, headRadius * 0.32, headRadius * 0.15);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.15, metalness: 0.8 });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, headRadius * 0.05, headRadius * 0.95);
    head.mesh.add(glassMesh);

    // 2. Chest / Torso (Hoodie / Casual Shirt)
    const chestHalf = { x: 0.28 * sc, y: 0.26 * sc, z: 0.16 * sc };
    const chest = makePart(
      new CANNON.Box(new CANNON.Vec3(chestHalf.x, chestHalf.y, chestHalf.z)),
      new THREE.BoxGeometry(chestHalf.x * 2, chestHalf.y * 2, chestHalf.z * 2),
      matStandard(topColor),
      5.5,
      { x: x, y: y + 1.05 * sc, z: z },
      'ragdoll_chest'
    );

    // 3. Pelvis / Hips
    const pelvisHalf = { x: 0.25 * sc, y: 0.18 * sc, z: 0.15 * sc };
    const pelvis = makePart(
      new CANNON.Box(new CANNON.Vec3(pelvisHalf.x, pelvisHalf.y, pelvisHalf.z)),
      new THREE.BoxGeometry(pelvisHalf.x * 2, pelvisHalf.y * 2, pelvisHalf.z * 2),
      matStandard(pantsColor),
      4.5,
      { x: x, y: y + 0.62 * sc, z: z },
      'ragdoll_pelvis'
    );

    // 4. Arms (with skin-tone hands)
    const armW = 0.10 * sc, armH = 0.22 * sc;
    // Left Upper & Lower
    const lUpArm = makePart(
      new CANNON.Box(new CANNON.Vec3(armW, armH, armW)),
      new THREE.BoxGeometry(armW * 2, armH * 2, armW * 2),
      matStandard(topColor),
      1.5,
      { x: x - 0.42 * sc, y: y + 1.05 * sc, z: z },
      'ragdoll_limb'
    );
    const lLoArm = makePart(
      new CANNON.Box(new CANNON.Vec3(armW * 0.9, armH, armW * 0.9)),
      new THREE.BoxGeometry(armW * 1.8, armH * 2, armW * 1.8),
      matStandard(skinColor),
      1.2,
      { x: x - 0.42 * sc, y: y + 0.58 * sc, z: z },
      'ragdoll_limb'
    );
    // Left Hand
    const handGeo = new THREE.SphereGeometry(armW * 0.85, 8, 8);
    const handMat = matStandard(skinColor);
    const lHand = new THREE.Mesh(handGeo, handMat);
    lHand.position.set(0, -armH * 0.95, 0);
    lLoArm.mesh.add(lHand);

    // Right Upper & Lower
    const rUpArm = makePart(
      new CANNON.Box(new CANNON.Vec3(armW, armH, armW)),
      new THREE.BoxGeometry(armW * 2, armH * 2, armW * 2),
      matStandard(topColor),
      1.5,
      { x: x + 0.42 * sc, y: y + 1.05 * sc, z: z },
      'ragdoll_limb'
    );
    const rLoArm = makePart(
      new CANNON.Box(new CANNON.Vec3(armW * 0.9, armH, armW * 0.9)),
      new THREE.BoxGeometry(armW * 1.8, armH * 2, armW * 1.8),
      matStandard(skinColor),
      1.2,
      { x: x + 0.42 * sc, y: y + 0.58 * sc, z: z },
      'ragdoll_limb'
    );
    // Right Hand
    const rHand = new THREE.Mesh(handGeo, handMat);
    rHand.position.set(0, -armH * 0.95, 0);
    rLoArm.mesh.add(rHand);

    // 5. Legs (with sneakers & white soles)
    const legW = 0.12 * sc, legH = 0.26 * sc;
    // Left Upper & Lower Leg
    const lUpLeg = makePart(
      new CANNON.Box(new CANNON.Vec3(legW, legH, legW)),
      new THREE.BoxGeometry(legW * 2, legH * 2, legW * 2),
      matStandard(pantsColor),
      2.5,
      { x: x - 0.15 * sc, y: y + 0.2 * sc, z: z },
      'ragdoll_limb'
    );
    const lLoLeg = makePart(
      new CANNON.Box(new CANNON.Vec3(legW * 0.9, legH, legW * 0.9)),
      new THREE.BoxGeometry(legW * 1.8, legH * 2, legW * 1.8),
      matStandard(shoeColor),
      2.0,
      { x: x - 0.15 * sc, y: y - 0.35 * sc, z: z },
      'ragdoll_limb'
    );
    // Left Sneaker Sole
    const soleGeo = new THREE.BoxGeometry(legW * 1.85, 0.08 * sc, legW * 2.2);
    const soleMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const lSole = new THREE.Mesh(soleGeo, soleMat);
    lSole.position.set(0, -legH + 0.03 * sc, 0.04 * sc);
    lLoLeg.mesh.add(lSole);

    // Right Upper & Lower Leg
    const rUpLeg = makePart(
      new CANNON.Box(new CANNON.Vec3(legW, legH, legW)),
      new THREE.BoxGeometry(legW * 2, legH * 2, legW * 2),
      matStandard(pantsColor),
      2.5,
      { x: x + 0.15 * sc, y: y + 0.2 * sc, z: z },
      'ragdoll_limb'
    );
    const rLoLeg = makePart(
      new CANNON.Box(new CANNON.Vec3(legW * 0.9, legH, legW * 0.9)),
      new THREE.BoxGeometry(legW * 1.8, legH * 2, legW * 1.8),
      matStandard(shoeColor),
      2.0,
      { x: x + 0.15 * sc, y: y - 0.35 * sc, z: z },
      'ragdoll_limb'
    );
    // Right Sneaker Sole
    const rSole = new THREE.Mesh(soleGeo, soleMat);
    rSole.position.set(0, -legH + 0.03 * sc, 0.04 * sc);
    rLoLeg.mesh.add(rSole);

    // Helper to add PointToPointConstraint
    const addJoint = (bodyA, pivotA, bodyB, pivotB) => {
      const c = new CANNON.PointToPointConstraint(
        bodyA,
        new CANNON.Vec3(pivotA[0], pivotA[1], pivotA[2]),
        bodyB,
        new CANNON.Vec3(pivotB[0], pivotB[1], pivotB[2])
      );
      c.collideConnected = false;
      this.world.addConstraint(c);
      this.constraints.push(c);
      return c;
    };

    // --- CONNECT JOINTS ---
    // 1. Neck (Chest top to Head bottom)
    addJoint(chest.body, [0, chestHalf.y, 0], head.body, [0, -headRadius, 0]);

    // 2. Spine (Chest bottom to Pelvis top)
    addJoint(chest.body, [0, -chestHalf.y, 0], pelvis.body, [0, pelvisHalf.y, 0]);

    // 3. Left Arm (Shoulder & Elbow)
    addJoint(chest.body, [-chestHalf.x - 0.04 * sc, chestHalf.y * 0.8, 0], lUpArm.body, [0, armH, 0]);
    addJoint(lUpArm.body, [0, -armH, 0], lLoArm.body, [0, armH, 0]);

    // 4. Right Arm (Shoulder & Elbow)
    addJoint(chest.body, [chestHalf.x + 0.04 * sc, chestHalf.y * 0.8, 0], rUpArm.body, [0, armH, 0]);
    addJoint(rUpArm.body, [0, -armH, 0], rLoArm.body, [0, armH, 0]);

    // 5. Left Leg (Hip & Knee)
    addJoint(pelvis.body, [-pelvisHalf.x * 0.6, -pelvisHalf.y, 0], lUpLeg.body, [0, legH, 0]);
    addJoint(lUpLeg.body, [0, -legH, 0], lLoLeg.body, [0, legH, 0]);

    // 6. Right Leg (Hip & Knee)
    addJoint(pelvis.body, [pelvisHalf.x * 0.6, -pelvisHalf.y, 0], rUpLeg.body, [0, legH, 0]);
    addJoint(rUpLeg.body, [0, -legH, 0], rLoLeg.body, [0, legH, 0]);

    return { head, chest, pelvis, lUpArm, lLoArm, rUpArm, rLoArm, lUpLeg, lLoLeg, rUpLeg, rLoLeg };
  }

  // ==========================================
  // SCENE PRESETS (FLOWING RIVER, JENGA, DOMINOES)
  // ==========================================
  clearAllObjects() {
    this.objects.forEach(item => {
      this.scene.remove(item.mesh);
      this.world.remove(item.body);
    });
    this.objects = [];
    this.drones = [];

    if (this.constraints) {
      this.constraints.forEach(c => {
        this.world.removeConstraint(c);
      });
      this.constraints = [];
    }

    this.updateStats();
  }

  // DEFAULT SCENE: CONTINUOUS FLOWING RIVER & WATERFALL
  buildRiverStreamScene() {
    this.clearAllObjects();
    this.river.setLiquidType('water');

    // 1. Spawns floating objects placed on the waterfall & river stream
    // Floating Box riding down the stream
    this.spawnCube(0, 4.2, -6.8, 1.3, 0xfbbf24);
    // Floating Ball entering the waterfall drop
    this.spawnSphere(1.2, 3.8, -4.5, 0.9, 0xef4444);
    // Floating Donut Tube cruising in the lower river
    this.spawnTorus(-1.0, 1.8, 1.5, 0.9, 0.32, 0xf72585);
    // Floating Physics Car drifting in the lower lake
    this.spawnPhysicsCar(0.5, 2.0, 4.0);
    // Human Ragdoll swimming in the lower lake!
    this.spawnHumanRagdoll(-0.5, 2.2, 3.2, 1.0, 0x06b6d4);
  }

  // RAGDOLL WATERFALL TUMBLE PRESET SCENE
  buildRagdollWaterfallScene() {
    this.clearAllObjects();
    this.river.setLiquidType('water');

    // Spawn 3 ragdolls tumbling over the waterfall cascade!
    // 1. Ragdoll at the waterfall drop crest
    this.spawnHumanRagdoll(0, 5.0, -4.8, 1.05, 0xef4444);

    // 2. Ragdoll floating down the upper stream
    this.spawnHumanRagdoll(-1.2, 5.2, -7.0, 1.0, 0x0ea5e9);

    // 3. Ragdoll floating relaxed in the lower river lake
    this.spawnHumanRagdoll(0.8, 2.5, 2.0, 1.0, 0xfacc15);

    // Donut Tube floating beside them
    this.spawnTorus(1.2, 2.2, 2.6, 0.85, 0.3, 0xf72585);
  }

  // Launch a new object right into the upper stream!
  launchObjectInStream() {
    const types = ['cube', 'sphere', 'car', 'ragdoll'];
    const pick = types[Math.floor(Math.random() * types.length)];
    const rx = (Math.random() - 0.5) * 2.2;

    if (pick === 'cube') {
      this.spawnCube(rx, 4.8, -7.2, 1.3, this.getRandomColor());
    } else if (pick === 'sphere') {
      this.spawnSphere(rx, 4.8, -7.2, 0.85, this.getRandomColor());
    } else if (pick === 'car') {
      this.spawnPhysicsCar(rx, 5.0, -7.2);
    } else {
      this.spawnHumanRagdoll(rx, 5.2, -7.2, 1.0);
    }
  }

  // Dedicated: Launch person directly into the upper waterfall stream!
  launchHumanInStream() {
    const rx = (Math.random() - 0.5) * 1.8;
    this.spawnHumanRagdoll(rx, 5.2, -7.2, 1.05);
  }

  buildJengaTower() {
    this.clearAllObjects();
    const blockWidth = 0.8;
    const blockHeight = 0.5;
    const blockLength = 2.4;
    const layers = 10;
    const spacing = 0.03;

    for (let layer = 0; layer < layers; layer++) {
      const y = (layer * (blockHeight + 0.01)) + blockHeight / 2 + 1.0;
      const isEven = layer % 2 === 0;
      const layerColor = this.palette[layer % this.palette.length];

      for (let i = -1; i <= 1; i++) {
        const offset = i * (blockWidth + spacing);
        const geo = new THREE.BoxGeometry(
          isEven ? blockLength : blockWidth,
          blockHeight,
          isEven ? blockWidth : blockLength
        );
        const mat = new THREE.MeshStandardMaterial({ color: layerColor, roughness: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);

        const x = isEven ? 0 : offset;
        const z = (isEven ? offset : 0) + 3.0; // Placed downstream
        mesh.position.set(x, y, z);

        const shape = new CANNON.Box(new CANNON.Vec3(
          (isEven ? blockLength : blockWidth) / 2,
          blockHeight / 2,
          (isEven ? blockWidth : blockLength) / 2
        ));
        const body = new CANNON.Body({
          mass: 1.2,
          material: this.objectPhysicsMaterial,
          position: new CANNON.Vec3(x, y, z)
        });
        body.addShape(shape);

        this.registerObject(mesh, body, layerColor, 'jenga_block');
      }
    }
  }

  buildDominoRun() {
    this.clearAllObjects();
    const dominoW = 0.2;
    const dominoH = 1.4;
    const dominoD = 0.7;
    const count = 28;
    const radius = 5.0;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const angle = (t * Math.PI * 1.5) - Math.PI * 0.75;
      const x = Math.sin(angle) * (radius + Math.sin(t * Math.PI * 2) * 1.2);
      const z = (t - 0.5) * 12 + 2.0;
      const y = dominoH / 2 + 1.0;

      const nextT = Math.min(1, t + 0.02);
      const nextAngle = (nextT * Math.PI * 1.5) - Math.PI * 0.75;
      const nextX = Math.sin(nextAngle) * (radius + Math.sin(nextT * Math.PI * 2) * 1.2);
      const nextZ = (nextT - 0.5) * 12 + 2.0;
      const facingAngle = Math.atan2(nextX - x, nextZ - z);

      const color = this.palette[i % this.palette.length];
      const geo = new THREE.BoxGeometry(dominoW, dominoH, dominoD);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = facingAngle;

      const shape = new CANNON.Box(new CANNON.Vec3(dominoW / 2, dominoH / 2, dominoD / 2));
      const body = new CANNON.Body({
        mass: 0.8,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(x, y, z)
      });
      body.addShape(shape);
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), facingAngle);

      this.registerObject(mesh, body, color, 'domino');
    }

    setTimeout(() => {
      const first = this.objects[0];
      if (first) {
        const ball = this.spawnSphere(first.mesh.position.x - 1.2, 2.5, first.mesh.position.z - 1.2, 0.6, 0xef4444);
        ball.body.velocity.set(3, 0, 3);
      }
    }, 200);
  }

  buildLavaRiverScene() {
    this.clearAllObjects();
    this.river.setLiquidType('lava');

    // Floating obsidian rocks in glowing magma river
    this.spawnCube(0, 4.5, -6.5, 1.4, 0x18181b);
    this.spawnCube(-1.5, 2.2, 1.0, 1.5, 0x27272a);
    this.spawnSphere(1.5, 2.5, 3.5, 1.0, 0x3f3f46);
  }

  // ==========================================
  // DESTRUCTION ACTIONS: CANNON & EXPLOSION
  // ==========================================
  shootCannonBall() {
    const origin = new THREE.Vector3();
    this.camera.getWorldPosition(origin);

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    const spawnPos = origin.clone().add(dir.clone().multiplyScalar(2.0));
    const radius = 0.85;
    const heavyColor = 0x09090b;

    const geo = new THREE.SphereGeometry(radius, 32, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: heavyColor,
      metalness: 0.9,
      roughness: 0.15
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: 35.0,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(spawnPos.x, spawnPos.y, spawnPos.z)
    });
    body.addShape(shape);

    const speed = 40.0;
    body.velocity.set(dir.x * speed, dir.y * speed, dir.z * speed);

    this.registerObject(mesh, body, heavyColor, 'cannonball');
    this.triggerCameraShake(0.3);
  }

  triggerShockwave() {
    const center = new CANNON.Vec3(0, 1.5, 0);
    const forceMagnitude = 65.0;

    this.objects.forEach(item => {
      if (item.body.mass === 0) return;

      const diff = item.body.position.vsub(center);
      const dist = diff.length();
      if (dist < 18) {
        const factor = Math.max(0.2, 1.0 - dist / 18);
        diff.normalize();

        const impulse = new CANNON.Vec3(
          diff.x * forceMagnitude * factor,
          (diff.y + 0.8) * forceMagnitude * factor * 1.4,
          diff.z * forceMagnitude * factor
        );
        item.body.applyImpulse(impulse, item.body.position);
      }
    });

    // Surge wave in the flowing river!
    if (this.river) {
      this.river.triggerSurge(2.5);
    }

    this.createShockwaveVisual();
    this.triggerCameraShake(0.4);
  }

  createShockwaveVisual() {
    const ringGeo = new THREE.RingGeometry(0.1, 0.6, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 1.0;
    this.scene.add(ringMesh);

    let scale = 1;
    const anim = () => {
      scale += 0.8;
      ringMesh.scale.set(scale, scale, 1);
      ringMat.opacity -= 0.04;
      if (ringMat.opacity > 0) {
        requestAnimationFrame(anim);
      } else {
        this.scene.remove(ringMesh);
        ringGeo.dispose();
        ringMat.dispose();
      }
    };
    anim();
  }

  triggerCameraShake(intensity = 0.3) {
    const originalPos = this.camera.position.clone();
    let frames = 8;
    const shake = () => {
      if (frames > 0) {
        this.camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity;
        this.camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity;
        this.camera.position.z = originalPos.z + (Math.random() - 0.5) * intensity;
        frames--;
        requestAnimationFrame(shake);
      } else {
        this.camera.position.copy(originalPos);
      }
    };
    shake();
  }

  // ==========================================
  // MAP SWITCHER & THEMED ENVIRONMENTS
  // ==========================================
  setMap(mapName) {
    if (this.currentMap === mapName) return;
    this.currentMap = mapName;

    // Clear previous map meshes and static bodies
    if (this.mapGroup) {
      while (this.mapGroup.children.length > 0) {
        const c = this.mapGroup.children[0];
        if (c.geometry) c.geometry.dispose();
        this.mapGroup.remove(c);
      }
    }
    if (this.mapBodies) {
      this.mapBodies.forEach(b => this.world.remove(b));
      this.mapBodies = [];
    }

    // Update active button UI
    document.querySelectorAll('.map-chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.map === mapName);
    });

    const riverBadge = document.getElementById('studioFlowSpeedBadge');

    if (mapName === 'canyon') {
      this.river.setVisible(true);
      if (riverBadge) riverBadge.style.display = 'inline-block';
      this.scene.background.setHex(0x242426);
      this.scene.fog.color.setHex(0x242426);
      this.scene.fog.density = 0.015;
      this.keyLight.color.setHex(0xffffff);
      this.keyLight.intensity = 1.15;
      this.setGravity('earth');
      this.buildRiverStreamScene();
    } else if (mapName === 'wall_district') {
      this.river.setVisible(false);
      if (riverBadge) riverBadge.style.display = 'none';
      this.scene.background.setHex(0x7dd3fc); // Anime blue sky
      this.scene.fog.color.setHex(0x93c5fd);
      this.scene.fog.density = 0.008;
      this.keyLight.color.setHex(0xfffaed);
      this.keyLight.intensity = 1.4;
      this.setGravity('earth');
      this.buildWallDistrictMap();
    } else if (mapName === 'cyber') {
      this.river.setVisible(false);
      if (riverBadge) riverBadge.style.display = 'none';
      this.scene.background.setHex(0x05070f); // Deep cyber void
      this.scene.fog.color.setHex(0x05070f);
      this.scene.fog.density = 0.018;
      this.keyLight.color.setHex(0x38bdf8);
      this.keyLight.intensity = 0.9;
      this.buildCyberZeroGMap();
    }
  }

  // ==========================================
  // WALL MARIA DISTRICT (진격의 거인 파괴 가능한 방벽 & 중세 마을)
  // ==========================================
  buildWallDistrictMap() {
    this.clearAllObjects();

    // 1. Outer Massive Fortress Gate Anchors (Static Wings: x <= -10 and x >= 10)
    const flankGeo = new THREE.BoxGeometry(16, 18, 5);
    const flankMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.9,
      metalness: 0.1
    });

    // Left Wing
    const leftFlank = new THREE.Mesh(flankGeo, flankMat);
    leftFlank.position.set(-17.5, 9, -15);
    leftFlank.castShadow = true;
    leftFlank.receiveShadow = true;
    this.mapGroup.add(leftFlank);

    const leftBody = new CANNON.Body({
      mass: 0,
      material: this.groundPhysicsMaterial,
      position: new CANNON.Vec3(-17.5, 9, -15)
    });
    leftBody.addShape(new CANNON.Box(new CANNON.Vec3(8, 9, 2.5)));
    this.world.addBody(leftBody);
    this.mapBodies.push(leftBody);

    // Right Wing
    const rightFlank = new THREE.Mesh(flankGeo, flankMat);
    rightFlank.position.set(17.5, 9, -15);
    rightFlank.castShadow = true;
    rightFlank.receiveShadow = true;
    this.mapGroup.add(rightFlank);

    const rightBody = new CANNON.Body({
      mass: 0,
      material: this.groundPhysicsMaterial,
      position: new CANNON.Vec3(17.5, 9, -15)
    });
    rightBody.addShape(new CANNON.Box(new CANNON.Vec3(8, 9, 2.5)));
    this.world.addBody(rightBody);
    this.mapBodies.push(rightBody);

    // 2. CENTRAL DESTRUCTIBLE WALL MARIA (20 Gigantic Masonry Blocks + Parapets)
    // 4 Columns x 5 Tiers stacked tight = 20 huge breakable stone blocks!
    // Total breach width: ~19m, height: 18m, depth: 4.8m
    const blockW = 4.6;
    const blockH = 3.55;
    const blockD = 4.6;
    const wallCols = 4;
    const wallTiers = 5;
    const startX = -6.9; // columns centered at -6.9, -2.3, +2.3, +6.9
    const wallZ = -15;

    const blockGeo = new THREE.BoxGeometry(blockW - 0.08, blockH - 0.08, blockD - 0.08);
    const stoneColors = [0x94a3b8, 0x8b9cb0, 0x7c8c9e, 0x64748b];

    for (let tier = 0; tier < wallTiers; tier++) {
      const y = (tier + 0.5) * blockH;
      for (let col = 0; col < wallCols; col++) {
        // Offset alternating rows slightly for authentic interlocking stone masonry
        const xOffset = (tier % 2 === 1) ? 0.35 : -0.35;
        const x = startX + col * blockW + xOffset;

        const color = stoneColors[(tier * 2 + col) % stoneColors.length];
        const mat = new THREE.MeshStandardMaterial({
          color: color,
          roughness: 0.85,
          metalness: 0.12
        });
        const mesh = new THREE.Mesh(blockGeo, mat);
        mesh.position.set(x, y, wallZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const body = new CANNON.Body({
          mass: 75.0, // Heavy stone masonry
          material: this.objectPhysicsMaterial,
          linearDamping: 0.1,
          angularDamping: 0.2,
          position: new CANNON.Vec3(x, y, wallZ)
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3((blockW - 0.08) / 2, (blockH - 0.08) / 2, (blockD - 0.08) / 2)));

        this.world.addBody(body);
        this.scene.add(mesh);
        this.registerObject(mesh, body, color, 'wall_block');
      }
    }

    // Parapet Battlements on top of Wall Maria (Destructible)
    const parapetGeo = new THREE.BoxGeometry(2.0, 1.2, 0.8);
    for (let px = -8.0; px <= 8.0; px += 3.2) {
      // Front parapet
      const pMesh = new THREE.Mesh(parapetGeo, new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 }));
      pMesh.position.set(px, 18.4, -13.0);
      pMesh.castShadow = true;
      const pBody = new CANNON.Body({
        mass: 25.0,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(px, 18.4, -13.0)
      });
      pBody.addShape(new CANNON.Box(new CANNON.Vec3(1.0, 0.6, 0.4)));
      this.world.addBody(pBody);
      this.scene.add(pMesh);
      this.registerObject(pMesh, pBody, 0x64748b, 'parapet_block');
    }

    // 3. MODULAR DESTRUCTIBLE MEDIEVAL TOWNHOUSES (4 Houses)
    const villageHouses = [
      { x: -8, z: -5, color: 0xfef08a },
      { x:  8, z: -5, color: 0xfde047 },
      { x: -6, z:  4, color: 0xfef9c3 },
      { x:  6, z:  4, color: 0xfde68a }
    ];

    villageHouses.forEach(h => {
      // House Ground Walls (2 modular side segments)
      const wallHalfGeo = new THREE.BoxGeometry(2.3, 3.2, 4.6);
      const hMat = new THREE.MeshStandardMaterial({ color: h.color, roughness: 0.7 });

      [-1.25, 1.25].forEach(dx => {
        const wMesh = new THREE.Mesh(wallHalfGeo, hMat);
        wMesh.position.set(h.x + dx, 1.6, h.z);
        wMesh.castShadow = true;
        wMesh.receiveShadow = true;

        const wBody = new CANNON.Body({
          mass: 30.0,
          material: this.objectPhysicsMaterial,
          position: new CANNON.Vec3(h.x + dx, 1.6, h.z)
        });
        wBody.addShape(new CANNON.Box(new CANNON.Vec3(1.15, 1.6, 2.3)));
        this.world.addBody(wBody);
        this.scene.add(wMesh);
        this.registerObject(wMesh, wBody, h.color, 'house_wall');
      });

      // Timber-frame Upper Floor Block
      const upperGeo = new THREE.BoxGeometry(4.7, 2.2, 4.5);
      const upperMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });
      const uMesh = new THREE.Mesh(upperGeo, upperMat);
      uMesh.position.set(h.x, 4.3, h.z);
      uMesh.castShadow = true;

      const uBody = new CANNON.Body({
        mass: 35.0,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(h.x, 4.3, h.z)
      });
      uBody.addShape(new CANNON.Box(new CANNON.Vec3(2.35, 1.1, 2.25)));
      this.world.addBody(uBody);
      this.scene.add(uMesh);
      this.registerObject(uMesh, uBody, 0x92400e, 'house_upper');

      // Destructible Terracotta Peaked Roof
      const roofGeo = new THREE.ConeGeometry(3.6, 2.6, 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.55 });
      const rMesh = new THREE.Mesh(roofGeo, roofMat);
      rMesh.rotation.y = Math.PI / 4;
      rMesh.position.set(h.x, 6.7, h.z);
      rMesh.castShadow = true;

      const rBody = new CANNON.Body({
        mass: 25.0,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(h.x, 6.7, h.z)
      });
      rBody.addShape(new CANNON.Box(new CANNON.Vec3(2.2, 1.25, 2.2)));
      this.world.addBody(rBody);
      this.scene.add(rMesh);
      this.registerObject(rMesh, rBody, 0xb91c1c, 'house_roof');

      // Destructible Stone Chimney
      const chGeo = new THREE.BoxGeometry(0.7, 1.8, 0.7);
      const chMat = new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.85 });
      const chMesh = new THREE.Mesh(chGeo, chMat);
      chMesh.position.set(h.x + 1.2, 7.6, h.z + 0.8);
      chMesh.castShadow = true;

      const chBody = new CANNON.Body({
        mass: 12.0,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(h.x + 1.2, 7.6, h.z + 0.8)
      });
      chBody.addShape(new CANNON.Box(new CANNON.Vec3(0.35, 0.9, 0.35)));
      this.world.addBody(chBody);
      this.scene.add(chMesh);
      this.registerObject(chMesh, chBody, 0x52525b, 'house_chimney');
    });

    // 4. DESTRUCTIBLE WATCHTOWER (Stacked 3 stone tiers + conical roof)
    const towerTiers = [
      { y: 3.0, h: 6.0, r: 2.2, mass: 45.0 },
      { y: 8.5, h: 5.0, r: 1.9, mass: 35.0 },
      { y: 13.0, h: 4.0, r: 1.6, mass: 25.0 }
    ];

    towerTiers.forEach(t => {
      const tGeo = new THREE.CylinderGeometry(t.r * 0.9, t.r, t.h, 12);
      const tMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
      const tMesh = new THREE.Mesh(tGeo, tMat);
      tMesh.position.set(16, t.y, -3);
      tMesh.castShadow = true;

      const tBody = new CANNON.Body({
        mass: t.mass,
        material: this.objectPhysicsMaterial,
        position: new CANNON.Vec3(16, t.y, -3)
      });
      tBody.addShape(new CANNON.Cylinder(t.r * 0.9, t.r, t.h, 12));
      this.world.addBody(tBody);
      this.scene.add(tMesh);
      this.registerObject(tMesh, tBody, 0x78716c, 'tower_tier');
    });

    // Watchtower Conical Spire
    const spireGeo = new THREE.ConeGeometry(2.3, 3.5, 8);
    const spireMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const sMesh = new THREE.Mesh(spireGeo, spireMat);
    sMesh.position.set(16, 16.6, -3);
    sMesh.castShadow = true;

    const sBody = new CANNON.Body({
      mass: 16.0,
      material: this.objectPhysicsMaterial,
      position: new CANNON.Vec3(16, 16.6, -3)
    });
    sBody.addShape(new CANNON.Box(new CANNON.Vec3(1.1, 1.7, 1.1)));
    this.world.addBody(sBody);
    this.scene.add(sMesh);
    this.registerObject(sMesh, sBody, 0x991b1b, 'tower_spire');

    // 5. Initial Spawns in Wall District
    // Human Ragdoll standing on Wall Maria parapet!
    this.spawnHumanRagdoll(0, 19.5, -15, 1.1, 0x15803d);

    // Two humans in village square
    this.spawnHumanRagdoll(-3, 2.5, 0, 1.0, 0x0284c7);
    this.spawnHumanRagdoll(3, 2.5, 0, 1.0, 0xe11d48);

    // Patrolling DJI Quadcopter Drone hovering above the village
    this.spawnDjiDrone(0, 7.5, 0);

    // Physics Cart
    this.spawnPhysicsCar(0, 1.5, 7.5);

    this.camera.position.set(0, 14, 24);
    this.controls.target.set(0, 6, -3);
    this.updateStats();
  }

  // CYBER ZERO-G ARENA (사이버 무중력 아레나)
  buildCyberZeroGMap() {
    this.clearAllObjects();

    // 1. Neon Grid Floating Platforms
    const platMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2
    });

    const platCoords = [
      [0, 3.5, 0, 8, 0.4, 8],
      [-10, 6.5, -6, 6, 0.4, 6],
      [10, 7.5, -6, 6, 0.4, 6],
      [-6, 11.5, 8, 7, 0.4, 7],
      [8, 12.5, 8, 7, 0.4, 7]
    ];

    platCoords.forEach(([px, py, pz, pw, ph, pd]) => {
      const geo = new THREE.BoxGeometry(pw, ph, pd);
      const mesh = new THREE.Mesh(geo, platMat);
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.mapGroup.add(mesh);

      // Glowing edge line
      const edges = new THREE.EdgesGeometry(geo);
      const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 }));
      edgeLine.position.set(px, py, pz);
      this.mapGroup.add(edgeLine);

      // Cannon.js static body
      const pBody = new CANNON.Body({
        mass: 0,
        material: this.groundPhysicsMaterial,
        position: new CANNON.Vec3(px, py, pz)
      });
      pBody.addShape(new CANNON.Box(new CANNON.Vec3(pw / 2, ph / 2, pd / 2)));
      this.world.addBody(pBody);
      this.mapBodies.push(pBody);
    });

    // 2. Glowing Neon Pillars
    const pillarMat1 = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const pillarMat2 = new THREE.MeshBasicMaterial({ color: 0xd946ef });

    const pillarCoords = [
      [-16, 8, -16], [16, 8, -16], [-16, 8, 16], [16, 8, 16]
    ];
    pillarCoords.forEach(([px, py, pz], idx) => {
      const pGeo = new THREE.CylinderGeometry(0.4, 0.4, 18, 16);
      const pMesh = new THREE.Mesh(pGeo, idx % 2 === 0 ? pillarMat1 : pillarMat2);
      pMesh.position.set(px, py, pz);
      this.mapGroup.add(pMesh);

      const pBody = new CANNON.Body({
        mass: 0,
        material: this.groundPhysicsMaterial,
        position: new CANNON.Vec3(px, py, pz)
      });
      pBody.addShape(new CANNON.Cylinder(0.4, 0.4, 18, 16));
      this.world.addBody(pBody);
      this.mapBodies.push(pBody);
    });

    // Zero Gravity
    this.world.gravity.set(0, 0, 0);

    // Spawns in Cyber Map (Floating weightlessly)
    this.spawnHumanRagdoll(0, 5.5, 0, 1.0, 0x06b6d4);
    this.spawnHumanRagdoll(-6, 8.5, -4, 1.0, 0xd946ef);
    this.spawnHumanRagdoll(6, 9.5, 4, 1.0, 0xfacc15);

    this.spawnSphere(2, 6.0, -2, 0.9, 0x38bdf8);
    this.spawnCube(-3, 7.0, 2, 1.2, 0xec4899);
    this.spawnTorus(0, 9.0, 0, 1.2, 0.35, 0x8b5cf6);

    this.camera.position.set(16, 14, 18);
    this.controls.target.set(0, 7, 0);
  }

  // ==========================================
  // INTERACTION: MOUSE DRAG & FLING PHYSICS
  // ==========================================
  initInteraction() {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.shootCannonBall();
      }
    });
  }

  onPointerDown(event) {
    if (event.button !== 0) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.objects.map(o => o.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let topMesh = intersects[0].object;
      while (topMesh.parent && topMesh.parent !== this.scene) {
        if (topMesh.userData && topMesh.userData.body) break;
        topMesh = topMesh.parent;
      }

      if (topMesh.userData && topMesh.userData.body && topMesh.userData.body.mass > 0) {
        this.isDraggingObject = true;
        this.draggedBody = topMesh.userData.body;

        this.controls.enabled = false;

        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        this.dragPlane.setFromNormalAndCoplanarPoint(
          camDir.negate(),
          new THREE.Vector3(this.draggedBody.position.x, this.draggedBody.position.y, this.draggedBody.position.z)
        );

        this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect);
        this.dragOffset.set(
          this.draggedBody.position.x - this.planeIntersect.x,
          this.draggedBody.position.y - this.planeIntersect.y,
          this.draggedBody.position.z - this.planeIntersect.z
        );

        this.lastMousePos.copy(this.planeIntersect);
        this.lastDragTime = performance.now();
        this.mouseVelocity.set(0, 0, 0);

        this.draggedBody.wakeUp();
      }
    }
  }

  onPointerMove(event) {
    if (!this.isDraggingObject || !this.draggedBody) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.planeIntersect)) {
      const targetPos = this.planeIntersect.clone().add(this.dragOffset);
      targetPos.y = Math.max(0.5, targetPos.y);

      const now = performance.now();
      const dt = Math.max(0.001, (now - this.lastDragTime) / 1000);

      this.mouseVelocity.subVectors(targetPos, new THREE.Vector3(this.draggedBody.position.x, this.draggedBody.position.y, this.draggedBody.position.z)).divideScalar(dt);
      this.mouseVelocity.clampLength(0, 45);

      this.draggedBody.position.set(targetPos.x, targetPos.y, targetPos.z);
      this.draggedBody.velocity.set(this.mouseVelocity.x * 0.4, this.mouseVelocity.y * 0.4, this.mouseVelocity.z * 0.4);

      this.lastMousePos.copy(targetPos);
      this.lastDragTime = now;
    }
  }

  onPointerUp() {
    if (this.isDraggingObject && this.draggedBody) {
      this.draggedBody.velocity.set(
        this.mouseVelocity.x * 0.6,
        this.mouseVelocity.y * 0.6,
        this.mouseVelocity.z * 0.6
      );
      this.draggedBody.angularVelocity.set(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6
      );
      this.draggedBody.wakeUp();
    }

    this.isDraggingObject = false;
    this.draggedBody = null;
    this.controls.enabled = true;
  }

  // ==========================================
  // PHYSICS INSPECTOR & UI BINDINGS
  // ==========================================
  setGravity(preset) {
    const gravities = {
      earth: -9.82,
      moon: -1.62,
      jupiter: -24.79,
      zero: 0.0,
      invert: 9.82
    };

    if (typeof preset === 'number') {
      this.currentGravity = preset;
    } else if (gravities[preset] !== undefined) {
      this.currentGravity = gravities[preset];
    }

    this.world.gravity.set(0, this.currentGravity, 0);
    this.objects.forEach(o => o.body.wakeUp());

    const badge = document.getElementById('physicsGravityVal');
    if (badge) badge.innerText = `${this.currentGravity.toFixed(1)} m/s²`;
  }

  setRestitution(val) {
    this.restitution = parseFloat(val);
    this.groundContactMaterial.restitution = this.restitution;
    this.objectContactMaterial.restitution = this.restitution;
    const badge = document.getElementById('physicsBounceVal');
    if (badge) badge.innerText = this.restitution.toFixed(2);
  }

  setFriction(val) {
    this.friction = parseFloat(val);
    this.groundContactMaterial.friction = this.friction;
    this.objectContactMaterial.friction = this.friction;
    const badge = document.getElementById('physicsFrictionVal');
    if (badge) badge.innerText = this.friction.toFixed(2);
  }

  setTimeScale(val) {
    this.timeScale = parseFloat(val);
    const badge = document.getElementById('physicsTimeVal');
    if (badge) badge.innerText = `${this.timeScale.toFixed(2)}x`;
  }

  bindUI() {
    // 0. World Map Selector Buttons
    document.querySelectorAll('.map-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setMap(btn.dataset.map);
      });
    });

    // 1. Shading Mode Buttons
    document.querySelectorAll('.blender-shade-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setShadingMode(btn.dataset.mode);
      });
    });

    // 2. Add Primitive Buttons
    const btnCube = document.getElementById('spawnCubeBtn');
    if (btnCube) btnCube.addEventListener('click', () => this.spawnCube((Math.random() - 0.5) * 3, 5, 0));

    const btnSphere = document.getElementById('spawnSphereBtn');
    if (btnSphere) btnSphere.addEventListener('click', () => this.spawnSphere((Math.random() - 0.5) * 3, 5, 0));

    const btnCylinder = document.getElementById('spawnCylinderBtn');
    if (btnCylinder) btnCylinder.addEventListener('click', () => this.spawnCylinder((Math.random() - 0.5) * 3, 5, 0));

    const btnTorus = document.getElementById('spawnTorusBtn');
    if (btnTorus) btnTorus.addEventListener('click', () => this.spawnTorus((Math.random() - 0.5) * 3, 5, 0));

    const btnCar = document.getElementById('spawnCarBtn');
    if (btnCar) btnCar.addEventListener('click', () => this.spawnPhysicsCar((Math.random() - 0.5) * 3, 5, 0));

    const btnRagdoll = document.getElementById('spawnRagdollBtn');
    if (btnRagdoll) btnRagdoll.addEventListener('click', () => this.spawnHumanRagdoll((Math.random() - 0.5) * 2, 5.5, (Math.random() - 0.5) * 2));

    const btnHuman = document.getElementById('spawnHumanBtn');
    if (btnHuman) btnHuman.addEventListener('click', () => this.spawnHumanRagdoll((Math.random() - 0.5) * 2, 5.5, (Math.random() - 0.5) * 2));

    const btnDji = document.getElementById('spawnDjiDroneBtn');
    if (btnDji) btnDji.addEventListener('click', () => this.spawnDjiDrone((Math.random() - 0.5) * 3, 6.0, (Math.random() - 0.5) * 3));

    // 3. Preset Scenes
    const btnWaterRiver = document.getElementById('presetWaterBasinBtn');
    if (btnWaterRiver) btnWaterRiver.addEventListener('click', () => {
      if (this.currentMap !== 'canyon') this.setMap('canyon');
      else this.buildRiverStreamScene();
    });

    const btnRagdollPreset = document.getElementById('presetRagdollBtn');
    if (btnRagdollPreset) btnRagdollPreset.addEventListener('click', () => {
      if (this.currentMap !== 'canyon') this.setMap('canyon');
      this.buildRagdollWaterfallScene();
    });

    const btnJenga = document.getElementById('presetJengaBtn');
    if (btnJenga) btnJenga.addEventListener('click', () => this.buildJengaTower());

    const btnDomino = document.getElementById('presetDominoBtn');
    if (btnDomino) btnDomino.addEventListener('click', () => this.buildDominoRun());

    const btnLavaRiver = document.getElementById('presetLavaBasinBtn');
    if (btnLavaRiver) btnLavaRiver.addEventListener('click', () => {
      if (this.currentMap !== 'canyon') this.setMap('canyon');
      this.buildLavaRiverScene();
    });

    // 4. Action Buttons (Cannon, Shockwave, Clear)
    const btnCannon = document.getElementById('actionShootCannonBtn');
    if (btnCannon) btnCannon.addEventListener('click', () => this.shootCannonBall());

    const btnShock = document.getElementById('actionShockwaveBtn');
    if (btnShock) btnShock.addEventListener('click', () => this.triggerShockwave());

    const btnClear = document.getElementById('actionClearAllBtn');
    if (btnClear) btnClear.addEventListener('click', () => this.clearAllObjects());

    // 5. Flowing Water Controls
    const btnLaunchStream = document.getElementById('actionLaunchInStreamBtn');
    if (btnLaunchStream) {
      btnLaunchStream.addEventListener('click', () => this.launchObjectInStream());
    }

    const btnLaunchHuman = document.getElementById('actionLaunchHumanInStreamBtn');
    if (btnLaunchHuman) {
      btnLaunchHuman.addEventListener('click', () => this.launchHumanInStream());
    }

    const btnSurge = document.getElementById('actionSurgeWaveBtn');
    if (btnSurge) {
      btnSurge.addEventListener('click', () => this.river.triggerSurge(2.4));
    }

    document.querySelectorAll('.liquid-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.liquid-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.river.setLiquidType(btn.dataset.liquid);
      });
    });

    const flowSlider = document.getElementById('sliderFlowSpeed');
    if (flowSlider) {
      flowSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.river.setFlowSpeed(val);
        const badge = document.getElementById('flowSpeedVal');
        if (badge) badge.innerText = `${(val * 1.2).toFixed(1)} m/s`;
      });
    }

    // 6. Physics Inspector Controls
    document.querySelectorAll('.gravity-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gravity-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setGravity(btn.dataset.grav);
      });
    });

    const bounceSlider = document.getElementById('sliderBounce');
    if (bounceSlider) {
      bounceSlider.addEventListener('input', (e) => this.setRestitution(e.target.value));
    }

    const frictionSlider = document.getElementById('sliderFriction');
    if (frictionSlider) {
      frictionSlider.addEventListener('input', (e) => this.setFriction(e.target.value));
    }

    const timeSlider = document.getElementById('sliderTimeScale');
    if (timeSlider) {
      timeSlider.addEventListener('input', (e) => this.setTimeScale(e.target.value));
    }

    // 7. Max Target FPS Chips & Badge Cycle Click
    document.querySelectorAll('.fps-target-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTargetFps(btn.dataset.fps);
      });
    });

    const fpsBadge = document.getElementById('studioFpsBadge');
    if (fpsBadge) {
      fpsBadge.style.cursor = 'pointer';
      fpsBadge.title = '클릭하여 최대 프레임 전환 (60 / 120 / 144 / 240 FPS)';
      fpsBadge.addEventListener('click', () => this.cycleFpsTarget());
    }

    // 8. Korean National Anthem (애국가) Button
    const btnAnthem = document.getElementById('btnAegukgaAnthem');
    if (btnAnthem) {
      btnAnthem.addEventListener('click', () => this.toggleAegukga());
    }

    if (this.aegukga) {
      this.aegukga.onStateChange = (playing) => this.updateAegukgaButton(playing);
    }
  }

  toggleAegukga() {
    if (!this.aegukga) return;
    const playing = this.aegukga.toggle();
    this.updateAegukgaButton(playing);
  }

  updateAegukgaButton(playing) {
    const btn = document.getElementById('btnAegukgaAnthem');
    const textEl = document.getElementById('anthemBtnText');
    if (btn) {
      btn.classList.toggle('playing', playing);
      if (textEl) {
        textEl.innerText = playing ? '애국가 정지' : '애국가 재생';
      }
    }
  }

  updateStats() {
    const countEl = document.getElementById('studioBodyCount');
    if (countEl) {
      countEl.innerText = `${this.objects.length}개 오브젝트`;
    }
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastFpsTime = performance.now();
    this.frameCount = 0;
    setTimeout(() => this.onWindowResize(), 30);
  }

  setTargetFps(fps) {
    this.targetFps = parseInt(fps) || 240;
    this.frameDuration = 1000 / this.targetFps;

    document.querySelectorAll('.fps-target-chip-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.fps) === this.targetFps);
    });

    const badgeVal = document.getElementById('physicsFpsVal');
    if (badgeVal) {
      badgeVal.innerText = `${this.targetFps} FPS${this.targetFps === 240 ? ' (Max)' : ''}`;
    }
  }

  cycleFpsTarget() {
    const presets = [60, 120, 144, 240];
    const idx = presets.indexOf(this.targetFps);
    const nextFps = presets[(idx + 1) % presets.length];
    this.setTargetFps(nextFps);
  }

  // ==========================================
  // ULTRA-SMOOTH HIGH-REFRESH SIMULATION LOOP (UP TO 240 FPS)
  // ==========================================
  initLoop() {
    this.lastFrameTime = performance.now();
    this.lastFpsTime = performance.now();
    this.rafLoop = this.rafLoop.bind(this);
    this.rafId = requestAnimationFrame(this.rafLoop);
  }

  rafLoop(now) {
    this.rafId = requestAnimationFrame(this.rafLoop);
    if (this.isPaused) return;

    if (!now) now = performance.now();
    const elapsed = now - this.lastFrameTime;

    // Respect targetFps throttling if user selected a lower rate (e.g. 60 FPS on 144Hz monitor)
    if (this.targetFps < 240 && elapsed < this.frameDuration - 0.8) {
      return;
    }

    const dt = Math.min(elapsed / 1000, 0.05);
    this.lastFrameTime = now;
    this.stepSimulation(now, dt);
  }

  stepSimulation(now, dt) {
    // 0. Real-Time Frame Rate (FPS) and Frame Render Time (ms) Monitor
    this.frameCount++;
    const fpsElapsed = now - this.lastFpsTime;
    if (fpsElapsed >= 250) {
      this.fps = Math.round((this.frameCount * 1000) / fpsElapsed);
      const frameMs = (fpsElapsed / this.frameCount).toFixed(1);
      this.frameCount = 0;
      this.lastFpsTime = now;

      if (!this.fpsBadgeEl) {
        this.fpsBadgeEl = document.getElementById('studioFpsBadge');
      }
      if (this.fpsBadgeEl) {
        this.fpsBadgeEl.innerHTML = `<span class="fps-dot"></span><span>${this.fps} FPS</span> <small>(${frameMs}ms)</small>`;
        this.fpsBadgeEl.classList.toggle('ultra', this.fps >= 180);
        this.fpsBadgeEl.classList.toggle('high', this.fps >= 100 && this.fps < 180);
        this.fpsBadgeEl.classList.toggle('warning', this.fps < 45 && this.fps >= 25);
        this.fpsBadgeEl.classList.toggle('danger', this.fps < 25);
      }
    }

    if (this.timeScale > 0) {
      // 1. High-Precision Cannon Rigid Body Dynamics with 240Hz sub-stepping
      try {
        const fixedTimeStep = 1 / Math.max(60, this.targetFps);
        this.world.step(fixedTimeStep, dt * this.timeScale, 10);
      } catch (e) {
        console.warn('Physics step warning:', e);
      }

      // 2. Update Continuous Flowing River & Waterfall Currents
      if (this.river) {
        this.river.update(dt * this.timeScale, this.objects);
      }

      // 3. Update DJI Quadcopter Drones (Propeller Rotation & Hover Stabilization)
      if (this.drones && this.drones.length > 0) {
        for (let i = this.drones.length - 1; i >= 0; i--) {
          const d = this.drones[i];
          if (!this.objects.includes(d)) {
            this.drones.splice(i, 1);
            continue;
          }
          if (d.propellers) {
            d.propellers.forEach((p, idx) => {
              p.rotation.y += (idx % 2 === 0 ? 0.65 : -0.65);
            });
          }
          if (d.isHovering && (!this.isDraggingObject || this.draggedBody !== d.body)) {
            const currentY = d.body.position.y;
            const targetY = Math.max(d.targetHoverY || 6.0, 3.5);
            const yDiff = targetY - currentY;
            const hoverForce = Math.abs(this.currentGravity) * d.body.mass * (1.0 + yDiff * 0.5) - (d.body.velocity.y * 3.5);
            d.body.applyForce(new CANNON.Vec3(0, Math.max(hoverForce, 0), 0), d.body.position);
          }
        }
      }
    }

    // Synchronize Three.js visual meshes with Cannon.js rigid bodies
    for (let i = 0; i < this.objects.length; i++) {
      const item = this.objects[i];
      item.mesh.position.copy(item.body.position);
      item.mesh.quaternion.copy(item.body.quaternion);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.BlenderPhysicsStudio = BlenderPhysicsStudio;
window.ContinuousFlowingRiver = ContinuousFlowingRiver;
window.AegukgaPlayer = AegukgaPlayer;

// Global Audio controls accessible anywhere
window.playAegukga = () => {
  if (window.physicsStudio && window.physicsStudio.aegukga) {
    window.physicsStudio.aegukga.play();
  }
};
window.stopAegukga = () => {
  if (window.physicsStudio && window.physicsStudio.aegukga) {
    window.physicsStudio.aegukga.stop();
  }
};
