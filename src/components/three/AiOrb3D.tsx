import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createRadialGlowTexture,
  detectHardwareWebGL,
  disposeThreeResources,
} from './threeUtils';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AiOrb3DProps {
  state: OrbState;
  audioLevel?: number; // 0..1 amplitude for voice responsiveness
  size?: 'sm' | 'lg';
  className?: string;
}

export default function AiOrb3D({
  state,
  audioLevel = 0,
  size = 'lg',
  className = '',
}: AiOrb3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<OrbState>(state);
  const levelRef = useRef<number>(audioLevel);
  const [supported, setSupported] = useState<boolean>(() => detectHardwareWebGL());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !supported) return;

    let frameId = 0;
    let contextLost = false;
    const width = container.clientWidth || (size === 'sm' ? 48 : 220);
    const height = container.clientHeight || (size === 'sm' ? 48 : 160);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 20);
    camera.position.set(0, 0.15, 4.1);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.0);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x288567, 1.5);
    rimLight.position.set(-3, -2, -3);
    scene.add(rimLight);

    const corePoint = new THREE.PointLight(0xdfc082, 3.2, 6, 1.8);
    scene.add(corePoint);

    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // Core Crystal Geometry
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xdfc082,
      emissive: 0xc98b2c,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.15,
      clearcoat: 1.0,
    });
    const innerCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.56, 2), coreMat);
    orbGroup.add(innerCore);

    // Translucent Obsidian-Emerald Glass Shell
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x173c30,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.65,
      thickness: 0.6,
      ior: 1.48,
      transparent: true,
      opacity: 0.9,
    });
    const outerShell = new THREE.Mesh(new THREE.SphereGeometry(0.76, 36, 36), shellMat);
    orbGroup.add(outerShell);

    // Dual Gyroscope Champagne-Gold Rings
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xc9a45c,
      roughness: 0.2,
      metalness: 0.94,
    });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.028, 16, 72), ringMat);
    ring1.rotation.set(Math.PI * 0.35, 0.2, 0);
    orbGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.02, 16, 72), ringMat);
    ring2.rotation.set(-Math.PI * 0.28, -0.35, 0);
    orbGroup.add(ring2);

    // Expanding Acoustic Pulse Halo shown distinctly during 'listening' state
    const listeningWaveMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const listeningWaveRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.018, 12, 72),
      listeningWaveMat
    );
    orbGroup.add(listeningWaveRing);

    // Ambient Orbital Aura Particles
    const count = size === 'sm' ? 16 : 32;
    const pts = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 1.25 + (i % 3) * 0.16;
      pts[i * 3] = Math.cos(a) * r;
      pts[i * 3 + 1] = Math.sin(a * 2) * 0.42;
      pts[i * 3 + 2] = Math.sin(a) * r;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    const glowTex = createRadialGlowTexture();
    const particleMat = new THREE.PointsMaterial({
      size: size === 'sm' ? 0.18 : 0.14,
      map: glowTex,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const aura = new THREE.Points(particleGeo, particleMat);
    orbGroup.add(aura);

    const onResize = () => {
      const w = container.clientWidth || (size === 'sm' ? 48 : 220);
      const h = container.clientHeight || (size === 'sm' ? 48 : 160);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const canvas = renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frameId);
      setSupported(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const clock = new THREE.Clock();
    let smoothedScale = 1;
    let smoothedSpeed = 0.5;
    let smoothedEmissive = 0.75;
    let smoothedListeningMix = 0;

    const targetColorIdle = new THREE.Color(0xc98b2c);
    const targetColorListening = new THREE.Color(0x34d399);
    const targetColorThinking = new THREE.Color(0xf59e0b);
    const targetColorSpeaking = new THREE.Color(0xffe09e);

    const animate = () => {
      if (contextLost) return;
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const curState = stateRef.current;
      const lvl = Math.min(1, Math.max(0, levelRef.current));

      let targetSpeed = 0.45;
      let targetEmissive = 0.75;
      let targetScale = 1 + Math.sin(elapsed * 2.0) * 0.03;
      let desiredColor = targetColorIdle;

      if (curState === 'listening') {
        targetSpeed = 1.35 + lvl * 1.4;
        targetEmissive = 1.25 + lvl * 0.75 + Math.sin(elapsed * 5.2) * 0.16;
        targetScale = 1.06 + lvl * 0.18 + Math.sin(elapsed * 5.2) * 0.045;
        desiredColor = targetColorListening;
      } else if (curState === 'thinking') {
        targetSpeed = 2.4;
        targetEmissive = 1.35 + Math.sin(elapsed * 7.5) * 0.35;
        targetScale = 0.96 + Math.sin(elapsed * 6.0) * 0.06;
        desiredColor = targetColorThinking;
      } else if (curState === 'speaking') {
        targetSpeed = 1.55 + lvl * 1.2;
        targetEmissive = 1.25 + lvl * 0.9 + Math.sin(elapsed * 9.0) * 0.2;
        targetScale = 1.06 + lvl * 0.22 + Math.sin(elapsed * 10.0) * 0.04;
        desiredColor = targetColorSpeaking;
      }

      smoothedScale += (targetScale - smoothedScale) * 0.14;
      smoothedSpeed += (targetSpeed - smoothedSpeed) * 0.08;
      smoothedEmissive += (targetEmissive - smoothedEmissive) * 0.12;
      smoothedListeningMix += ((curState === 'listening' ? 1 : 0) - smoothedListeningMix) * 0.1;

      coreMat.emissive.lerp(desiredColor, 0.08);
      coreMat.emissiveIntensity = smoothedEmissive;
      corePoint.color.lerp(desiredColor, 0.08);
      corePoint.intensity = 2.6 + smoothedEmissive * 1.2;

      innerCore.scale.setScalar(smoothedScale);
      innerCore.rotation.y += delta * smoothedSpeed;
      innerCore.rotation.x += delta * smoothedSpeed * 0.45;

      ring1.rotation.z += delta * smoothedSpeed * 0.85;
      ring1.rotation.x += delta * 0.32;
      ring2.rotation.z -= delta * smoothedSpeed * 1.05;
      ring2.rotation.y += delta * 0.48;
      aura.rotation.y += delta * smoothedSpeed * 0.6;

      // Smooth expanding acoustic wave cycle while listening
      const waveCycle = (elapsed * 0.95) % 1;
      const waveScale = 0.86 + waveCycle * (0.62 + lvl * 0.28);
      listeningWaveRing.scale.setScalar(waveScale);
      listeningWaveRing.rotation.z = elapsed * 0.6;
      listeningWaveMat.opacity = smoothedListeningMix * (1 - waveCycle) * 0.72;

      orbGroup.position.y = Math.sin(elapsed * 1.6) * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      envTarget.dispose();
      disposeThreeResources(scene, renderer, [glowTex]);
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [supported, size]);

  if (!supported) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border border-[#C9A45C]/50 bg-gradient-to-br from-[#173C30] via-[#141414] to-[#2B2010] text-[#DFC082] ${className}`}
        aria-hidden="true"
      >
        <Sparkles className={size === 'sm' ? 'w-4 h-4' : 'w-8 h-8'} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
}
