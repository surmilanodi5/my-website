import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const StaticRibbonFallback: React.FC = () => (
  <div
    className="relative flex h-full w-full items-center justify-center rounded-2xl border border-slate-200 bg-[#EAF1FA] p-8 dark:border-cyan-500/20 dark:bg-[#0B172E]"
    aria-label="Flowing fabric ribbon and needlework illustration"
  >
    <svg viewBox="0 0 420 360" className="h-full max-h-[340px] w-full" fill="none">
      <path
        d="M55 240 C115 110, 195 270, 260 140 C305 55, 355 155, 375 105"
        stroke="#0891B2"
        strokeWidth="26"
        strokeLinecap="round"
        strokeOpacity="0.92"
      />
      <path
        d="M65 255 C135 130, 205 280, 272 155 C318 75, 362 170, 382 120"
        stroke="#22D3EE"
        strokeWidth="10"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <path d="M80 120 L330 225" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <ellipse
        cx="95"
        cy="126"
        rx="8"
        ry="3.5"
        transform="rotate(22 95 126)"
        stroke="#22D3EE"
        strokeWidth="1.8"
      />
      <path
        d="M95 126 C55 160, 120 290, 225 270 C300 255, 345 190, 365 230"
        stroke="#22D3EE"
        strokeWidth="1.75"
        strokeDasharray="4 4"
      />
    </svg>
  </div>
);

const TONE_STOPS = [
  new THREE.Color('#0E7490'), // Hero: deep cyan-navy silk
  new THREE.Color('#0F3460'), // About/Services: deep royal navy
  new THREE.Color('#0891B2'), // Fashion/Teaching: luminous cyan-teal
  new THREE.Color('#155E75'), // Portfolio/Skills: slate cyan
  new THREE.Color('#0E7490'), // Contact & Footer: cyan-navy
];

export const HeroThreeScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowCores =
      typeof navigator !== 'undefined' &&
      navigator.hardwareConcurrency &&
      navigator.hardwareConcurrency <= 2;

    if (prefersReduced || lowCores) {
      setUseFallback(true);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        setUseFallback(true);
        return;
      }
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      setUseFallback(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setUseFallback(true);
      return;
    }

    const width = container.clientWidth || 520;
    const height = container.clientHeight || 460;

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 6.2);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0b172e, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf0fdff, 1.55);
    keyLight.position.set(4.5, 6.0, 5.0);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -4;
      keyLight.shadow.camera.right = 4;
      keyLight.shadow.camera.top = 4;
      keyLight.shadow.camera.bottom = -4;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x22d3ee, 1.05);
    rimLight.position.set(-4.5, 2.0, -3.5);
    scene.add(rimLight);

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    // 1. Primary flowing woven cloth/ribbon (Navy & Cyan sheen)
    const segX = 84;
    const segY = 18;
    const ribbonGeo = new THREE.PlaneGeometry(4.5, 1.32, segX, segY);
    const basePositions = new Float32Array(ribbonGeo.attributes.position.array);

    const primaryFabricMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0E7490'),
      roughness: 0.62,
      metalness: 0.1,
      sheen: 1.0,
      sheenRoughness: 0.4,
      sheenColor: new THREE.Color('#67E8F9'),
      side: THREE.DoubleSide,
    });
    const primaryRibbon = new THREE.Mesh(ribbonGeo, primaryFabricMat);
    primaryRibbon.castShadow = !isSoftwareGl;
    primaryRibbon.receiveShadow = !isSoftwareGl;
    sculpture.add(primaryRibbon);

    // 2. Counter-folded icy-slate inner ribbon
    const linenGeo = new THREE.PlaneGeometry(3.85, 0.44, 64, 8);
    const linenBasePositions = new Float32Array(linenGeo.attributes.position.array);
    const linenMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#BAE6FD'),
      roughness: 0.78,
      metalness: 0.06,
      sheen: 0.85,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#FFFFFF'),
      side: THREE.DoubleSide,
    });
    const linenRibbon = new THREE.Mesh(linenGeo, linenMat);
    linenRibbon.position.set(0.05, -0.22, -0.18);
    linenRibbon.castShadow = !isSoftwareGl;
    sculpture.add(linenRibbon);

    // 3. Brushed silver-steel sewing needle
    const needleGroup = new THREE.Group();
    const steelMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#E2E8F0'),
      metalness: 0.94,
      roughness: 0.18,
      anisotropy: 0.65,
    });
    const shaftGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.2, 16);
    const shaft = new THREE.Mesh(shaftGeo, steelMat);
    needleGroup.add(shaft);

    const tipGeo = new THREE.ConeGeometry(0.022, 0.26, 16);
    const tip = new THREE.Mesh(tipGeo, steelMat);
    tip.position.y = 1.23;
    needleGroup.add(tip);

    const eyeGeo = new THREE.TorusGeometry(0.042, 0.014, 10, 24);
    const needleEye = new THREE.Mesh(eyeGeo, steelMat);
    needleEye.position.y = -1.12;
    needleEye.scale.set(0.62, 1.45, 1);
    needleGroup.add(needleEye);

    needleGroup.rotation.z = -Math.PI / 3.2;
    needleGroup.rotation.x = 0.28;
    needleGroup.position.set(-0.2, 0.35, 0.48);
    sculpture.add(needleGroup);

    // 4. Luminous cyan thread curve
    const threadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.14, -0.25, 0.48),
      new THREE.Vector3(-1.65, -0.75, 0.72),
      new THREE.Vector3(-0.75, -1.15, 0.32),
      new THREE.Vector3(0.55, -0.82, -0.25),
      new THREE.Vector3(1.55, 0.12, 0.35),
      new THREE.Vector3(0.95, 0.92, -0.15),
    ]);
    const threadGeo = new THREE.TubeGeometry(threadCurve, 72, 0.016, 8, false);
    const threadMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#22D3EE'),
      roughness: 0.45,
      metalness: 0.15,
    });
    const threadMesh = new THREE.Mesh(threadGeo, threadMat);
    sculpture.add(threadMesh);

    // 5. Deep navy architectural pattern folios
    const cardShape = new THREE.Shape();
    cardShape.moveTo(-0.55, -0.72);
    cardShape.lineTo(0.55, -0.72);
    cardShape.lineTo(0.55, 0.72);
    cardShape.lineTo(-0.55, 0.72);
    cardShape.closePath();

    const folioGeo = new THREE.ExtrudeGeometry(cardShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    const folioMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#112240'),
      roughness: 0.72,
      metalness: 0.18,
    });
    const folioBack = new THREE.Mesh(folioGeo, folioMat);
    folioBack.position.set(1.38, -0.45, -0.75);
    folioBack.rotation.set(0.18, -0.42, -0.15);
    sculpture.add(folioBack);

    const folioAccent = new THREE.Mesh(folioGeo, folioMat);
    folioAccent.scale.set(0.75, 0.75, 1);
    folioAccent.position.set(-1.52, 0.62, -0.68);
    folioAccent.rotation.set(-0.22, 0.35, 0.24);
    sculpture.add(folioAccent);

    // Ground contact shadow disc
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
      grad.addColorStop(0, 'rgba(6, 13, 30, 0.35)');
      grad.addColorStop(0.55, 'rgba(6, 13, 30, 0.12)');
      grad.addColorStop(1, 'rgba(6, 13, 30, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.2),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -1.55, 0);
    scene.add(shadowPlane);

    let pointerX = 0;
    let pointerY = 0;
    let scrollProgress = 0;
    const _lookTarget = new THREE.Vector3(0, 0, 0);
    const _blendedTone = new THREE.Color();

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      pointerX = THREE.MathUtils.clamp(nx, -1, 1);
      pointerY = THREE.MathUtils.clamp(ny, -1, 1);
    };

    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollProgress = THREE.MathUtils.clamp(window.scrollY / maxScroll, 0, 1);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 520;
      const h = container.clientHeight || 460;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setUseFallback(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    function deformRibbons(time: number, morph: number) {
      const posAttr = ribbonGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const wave1 = Math.sin(bx * 1.35 + time * 0.65 + morph * 3.1) * 0.44;
        const fold = Math.cos(bx * 0.85 - morph * 2.4) * (0.28 + morph * 0.16);
        const twist = by * Math.sin(bx * 0.65 + morph * 2.5 + time * 0.3) * (0.45 + morph * 0.25);
        posAttr.setXYZ(i, bx, by + fold * 0.55, wave1 + twist);
      }
      posAttr.needsUpdate = true;
      ribbonGeo.computeVertexNormals();

      const lAttr = linenGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < lAttr.count; i++) {
        const bx = linenBasePositions[i * 3];
        const by = linenBasePositions[i * 3 + 1];
        const wave = Math.cos(bx * 1.25 - time * 0.55 + morph * 2.3) * 0.36;
        const lift = Math.sin(bx * 0.85 + morph * 1.8) * 0.24;
        lAttr.setXYZ(i, bx, by + lift, wave);
      }
      lAttr.needsUpdate = true;
      linenGeo.computeVertexNormals();
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;

      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      deformRibbons(elapsed, scrollProgress);

      const scaled = scrollProgress * (TONE_STOPS.length - 1);
      const idx = Math.min(TONE_STOPS.length - 2, Math.floor(scaled));
      const frac = scaled - idx;
      _blendedTone.copy(TONE_STOPS[idx]).lerp(TONE_STOPS[idx + 1], frac);
      primaryFabricMat.color.lerp(_blendedTone, 0.12);

      const targetRotY = pointerX * 0.28 + scrollProgress * 1.35;
      const targetRotX = -pointerY * 0.18 + Math.sin(scrollProgress * Math.PI) * 0.38;
      sculpture.rotation.y = THREE.MathUtils.damp(sculpture.rotation.y, targetRotY, 4.5, delta);
      sculpture.rotation.x = THREE.MathUtils.damp(sculpture.rotation.x, targetRotX, 4.5, delta);
      sculpture.position.y = THREE.MathUtils.damp(
        sculpture.position.y,
        Math.sin(elapsed * 0.8) * 0.08 - scrollProgress * 0.35,
        4,
        delta,
      );

      needleGroup.position.y = 0.35 + Math.sin(elapsed * 0.9 + 0.5) * 0.06;
      folioBack.rotation.z = -0.15 + Math.sin(elapsed * 0.45) * 0.04;
      folioAccent.rotation.z = 0.24 + Math.cos(elapsed * 0.5) * 0.04;

      const targetCamX = pointerX * 0.32;
      const targetCamY = 0.45 - pointerY * 0.2 + scrollProgress * 0.55;
      const targetCamZ = 6.2 - scrollProgress * 0.7;
      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 3.5, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 3.5, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 3.5, delta);
      camera.lookAt(_lookTarget);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      ribbonGeo.dispose();
      linenGeo.dispose();
      shaftGeo.dispose();
      tipGeo.dispose();
      eyeGeo.dispose();
      threadGeo.dispose();
      folioGeo.dispose();
      shadowPlane.geometry.dispose();

      primaryFabricMat.dispose();
      linenMat.dispose();
      steelMat.dispose();
      threadMat.dispose();
      folioMat.dispose();
      (shadowPlane.material as THREE.Material).dispose();
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  if (useFallback) {
    return <StaticRibbonFallback />;
  }

  return (
    <div
      ref={mountRef}
      className="relative h-full w-full min-h-[340px] select-none"
      aria-label="Interactive 3D flowing fabric and needlework sculpture"
    />
  );
};
export default HeroThreeScene;
