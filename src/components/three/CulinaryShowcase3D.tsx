import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  createContactShadowTexture,
  detectHardwareWebGL,
  disposeThreeResources,
} from './threeUtils';

interface CulinaryShowcase3DProps {
  revealCloche?: boolean;
  fallbackImage: string;
}

export default function CulinaryShowcase3D({
  revealCloche = false,
  fallbackImage,
}: CulinaryShowcase3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const revealRef = useRef<boolean>(revealCloche);
  const hoverRef = useRef<boolean>(false);
  const [supported, setSupported] = useState<boolean>(() => detectHardwareWebGL());

  useEffect(() => {
    revealRef.current = revealCloche;
  }, [revealCloche]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !supported) return;

    let frameId = 0;
    let contextLost = false;
    const width = container.clientWidth || 460;
    const height = container.clientHeight || 380;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 35);
    camera.position.set(0, 2.15, 4.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enableZoom = false; // Never hijack vertical page scrolling
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.28, 0);
    controls.update();

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffe9c2, 0x10201a, 0.7);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.1);
    keyLight.position.set(3.5, 5.2, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x286652, 1.2);
    fillLight.position.set(-4, 2.2, -2.5);
    scene.add(fillLight);

    const warmCandle = new THREE.PointLight(0xffb454, 2.8, 7, 1.8);
    warmCandle.position.set(1.25, 0.68, 0.85);
    scene.add(warmCandle);

    // Composite Object Group (9+ parts)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.62;
    stageGroup.add(shadowPlane);

    const teakWoodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2314,
      roughness: 0.48,
      metalness: 0.08,
    });
    const stonewareMat = new THREE.MeshStandardMaterial({
      color: 0x1d1d1c,
      roughness: 0.32,
      metalness: 0.16,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xc9a45c,
      roughness: 0.2,
      metalness: 0.92,
    });
    const polishedBrassMat = new THREE.MeshStandardMaterial({
      color: 0xdfc082,
      roughness: 0.14,
      metalness: 0.96,
    });
    const garnishMat = new THREE.MeshStandardMaterial({
      color: 0xc45127,
      roughness: 0.55,
      metalness: 0.05,
    });
    const emberFlameMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });

    // 1. Mahogany Serving Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.54, 0.16, 48), teakWoodMat);
    pedestal.position.y = -0.52;
    pedestal.receiveShadow = true;
    stageGroup.add(pedestal);

    // 2. Brushed Gold Trim Ring
    const pedestalRim = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.022, 16, 64), goldMat);
    pedestalRim.rotation.x = Math.PI / 2;
    pedestalRim.position.y = -0.44;
    stageGroup.add(pedestalRim);

    // 3. Hand-Thrown West African Stoneware Platter
    const platterPoints = [
      new THREE.Vector2(0, -0.42),
      new THREE.Vector2(0.85, -0.41),
      new THREE.Vector2(1.16, -0.34),
      new THREE.Vector2(1.22, -0.26),
      new THREE.Vector2(1.16, -0.24),
      new THREE.Vector2(0.84, -0.35),
      new THREE.Vector2(0, -0.36),
    ];
    const platter = new THREE.Mesh(new THREE.LatheGeometry(platterPoints, 48), stonewareMat);
    platter.castShadow = true;
    platter.receiveShadow = true;
    stageGroup.add(platter);

    // 4. Sculpted Culinary Composition under the Cloche
    const foodGroup = new THREE.Group();
    foodGroup.position.y = -0.28;
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.46, 32, 20), garnishMat);
    mound.scale.set(1.25, 0.52, 0.95);
    mound.position.set(0, 0.08, 0);
    mound.castShadow = true;
    foodGroup.add(mound);

    const sideAccent1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.18, 20),
      new THREE.MeshStandardMaterial({ color: 0xdfb15b, roughness: 0.45 })
    );
    sideAccent1.position.set(-0.48, 0.06, 0.22);
    foodGroup.add(sideAccent1);

    const sideAccent2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x265947, roughness: 0.5 })
    );
    sideAccent2.scale.set(1.2, 0.65, 1.0);
    sideAccent2.position.set(0.46, 0.05, -0.18);
    foodGroup.add(sideAccent2);
    stageGroup.add(foodGroup);

    // 5. Champagne-Gold Serving Cloche Dome + Finial
    const clocheGroup = new THREE.Group();
    const domePoints = [
      new THREE.Vector2(1.06, -0.27),
      new THREE.Vector2(1.04, 0.02),
      new THREE.Vector2(0.92, 0.34),
      new THREE.Vector2(0.68, 0.58),
      new THREE.Vector2(0.35, 0.72),
      new THREE.Vector2(0.0, 0.76),
    ];
    const clocheDome = new THREE.Mesh(new THREE.LatheGeometry(domePoints, 48), goldMat);
    clocheDome.castShadow = true;
    clocheGroup.add(clocheDome);

    const clocheLip = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.024, 14, 48), polishedBrassMat);
    clocheLip.rotation.x = Math.PI / 2;
    clocheLip.position.y = -0.27;
    clocheGroup.add(clocheLip);

    const finialNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.12, 20), polishedBrassMat);
    finialNeck.position.y = 0.8;
    clocheGroup.add(finialNeck);

    const finialOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 1), polishedBrassMat);
    finialOrb.position.y = 0.94;
    clocheGroup.add(finialOrb);
    stageGroup.add(clocheGroup);

    // 6. Floating Table Brass Lantern Accent
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(1.25, 0.18, 0.85);
    const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 24), goldMat);
    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.34, 24, 1, true),
      new THREE.MeshPhysicalMaterial({
        color: 0xffe4b3,
        transmission: 0.72,
        roughness: 0.12,
        transparent: true,
        side: THREE.DoubleSide,
      })
    );
    lanternGlass.position.y = 0.2;
    const candleFlame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12), emberFlameMat);
    candleFlame.position.y = 0.18;
    const lanternTop = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.14, 24), goldMat);
    lanternTop.position.y = 0.44;
    lanternGroup.add(lanternBase, lanternGlass, candleFlame, lanternTop);
    stageGroup.add(lanternGroup);

    // 7. Floating Orbital Accent Ring
    const orbitalRing = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.012, 12, 80), polishedBrassMat);
    orbitalRing.rotation.set(Math.PI * 0.42, 0.2, 0);
    orbitalRing.position.y = 0.18;
    stageGroup.add(orbitalRing);

    const onResize = () => {
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const onEnter = () => {
      hoverRef.current = true;
    };
    const onLeave = () => {
      hoverRef.current = false;
    };
    container.addEventListener('pointerenter', onEnter);
    container.addEventListener('pointerleave', onLeave);

    const canvas = renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frameId);
      setSupported(false);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const clock = new THREE.Clock();
    const animate = () => {
      if (contextLost) return;
      frameId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      const targetClocheY = revealRef.current ? 0.68 : hoverRef.current ? 0.14 : 0;
      clocheGroup.position.y += (targetClocheY - clocheGroup.position.y) * 0.08;
      clocheGroup.rotation.y += delta * (revealRef.current ? 0.45 : 0.18);

      lanternGroup.position.y = 0.18 + Math.sin(elapsed * 1.8) * 0.07;
      warmCandle.position.y = lanternGroup.position.y + 0.22;
      warmCandle.intensity = 2.6 + Math.sin(elapsed * 5.2) * 0.35;

      orbitalRing.rotation.z += delta * 0.22;
      stageGroup.rotation.y += delta * (hoverRef.current ? 0.24 : 0.1);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerenter', onEnter);
      container.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      envTarget.dispose();
      disposeThreeResources(scene, renderer, [shadowTex]);
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [supported]);

  if (!supported) {
    return (
      <div className="relative w-full h-full min-h-[340px] rounded-sm overflow-hidden border border-[#C9A45C]/30 bg-[#141414]">
        <img
          src={fallbackImage}
          alt="Chop 'n Chill Kasoa signature dish and upstairs terrace hospitality"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive 3D Chop 'n Chill dining cloche, stoneware platter, and brass lantern showcase"
      className="w-full h-full min-h-[340px] cursor-grab active:cursor-grabbing select-none"
    />
  );
}
