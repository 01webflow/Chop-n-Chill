import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
  OrbitControls,
  Sparkles,
} from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Component, type ErrorInfo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { detectHardwareWebGL } from './threeUtils';

export interface Hero3DSceneProps {
  fallbackImage: string;
  fallbackAlt?: string;
  className?: string;
}

type LoungeMood = 'amber' | 'emerald';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGL3DErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Gracefully yield to photographic fallback UI on WebGL failure
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function HeroFallbackCard({
  fallbackImage,
  fallbackAlt,
  className = '',
}: {
  fallbackImage: string;
  fallbackAlt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-full rounded-sm overflow-hidden border border-[#C9A45C]/30 bg-[#141414] shadow-2xl ${className}`}
    >
      <img
        src={fallbackImage}
        alt={fallbackAlt}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover object-center"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(16,16,16,0.18) 0%, rgba(16,16,16,0.35) 55%, rgba(16,16,16,0.9) 100%)',
        }}
      />
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#C9A45C]">
            Upstairs Terrace &amp; Lounge
          </p>
          <p className="text-xs text-[#E6DFD1] mt-0.5">
            Afro-modern dining ambience in Kasoa, Ghana
          </p>
        </div>
      </div>
    </div>
  );
}

function AfroModernLoungePavilion({
  mood,
  hovered,
  onToggleMood,
  onHoverChange,
}: {
  mood: LoungeMood;
  hovered: boolean;
  onToggleMood: () => void;
  onHoverChange: (next: boolean) => void;
}) {
  const pavilionRef = useRef<THREE.Group | null>(null);
  const coreRef = useRef<THREE.Mesh | null>(null);
  const outerHaloRef = useRef<THREE.Mesh | null>(null);
  const innerHaloRef = useRef<THREE.Mesh | null>(null);
  const coreMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const coreLightRef = useRef<THREE.PointLight | null>(null);
  const flameLightRef = useRef<THREE.PointLight | null>(null);

  const amberColor = useMemo(() => new THREE.Color('#ffaa3b'), []);
  const emeraldColor = useMemo(() => new THREE.Color('#34d399'), []);

  // Sculpted stoneware carafe & champagne tasting chalice geometries via LatheGeometry
  const { vesselGeometry, chaliceGeometry } = useMemo(() => {
    const vesselPts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.14, 0.0),
      new THREE.Vector2(0.19, 0.14),
      new THREE.Vector2(0.18, 0.28),
      new THREE.Vector2(0.08, 0.42),
      new THREE.Vector2(0.065, 0.56),
      new THREE.Vector2(0.095, 0.62),
      new THREE.Vector2(0.075, 0.62),
      new THREE.Vector2(0.055, 0.52),
      new THREE.Vector2(0.0, 0.52),
    ];
    const chalicePts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.09, 0.0),
      new THREE.Vector2(0.09, 0.015),
      new THREE.Vector2(0.018, 0.03),
      new THREE.Vector2(0.016, 0.19),
      new THREE.Vector2(0.085, 0.28),
      new THREE.Vector2(0.1, 0.42),
      new THREE.Vector2(0.092, 0.42),
      new THREE.Vector2(0.074, 0.29),
      new THREE.Vector2(0.0, 0.22),
    ];
    return {
      vesselGeometry: new THREE.LatheGeometry(vesselPts, 32),
      chaliceGeometry: new THREE.LatheGeometry(chalicePts, 28),
    };
  }, []);

  useEffect(() => {
    return () => {
      vesselGeometry.dispose();
      chaliceGeometry.dispose();
    };
  }, [vesselGeometry, chaliceGeometry]);

  const columnAngles = useMemo(
    () => Array.from({ length: 8 }, (_, idx) => (idx / 8) * Math.PI * 2),
    []
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (pavilionRef.current) {
      pavilionRef.current.rotation.y += dt * (hovered ? 0.26 : 0.12);
    }
    if (coreRef.current) {
      coreRef.current.rotation.y -= dt * (hovered ? 0.9 : 0.45);
      coreRef.current.rotation.x += dt * 0.18;
      coreRef.current.position.y = 0.62 + Math.sin(t * 1.5) * 0.05;
      const targetScale = hovered ? 1.12 : 1.0;
      const nextScale = THREE.MathUtils.damp(coreRef.current.scale.x, targetScale, 5, dt);
      coreRef.current.scale.setScalar(nextScale);
    }
    if (outerHaloRef.current) {
      outerHaloRef.current.rotation.z += dt * 0.18;
    }
    if (innerHaloRef.current) {
      innerHaloRef.current.rotation.z -= dt * 0.24;
    }

    const desiredColor = mood === 'amber' ? amberColor : emeraldColor;
    if (coreMatRef.current) {
      coreMatRef.current.emissive.lerp(desiredColor, 0.08);
      coreMatRef.current.emissiveIntensity = THREE.MathUtils.damp(
        coreMatRef.current.emissiveIntensity,
        hovered ? 1.35 : 0.95,
        5,
        dt
      );
    }
    if (coreLightRef.current) {
      coreLightRef.current.color.lerp(desiredColor, 0.08);
      coreLightRef.current.intensity = (hovered ? 5.2 : 4.2) + Math.sin(t * 2.1) * 0.45;
    }
    if (flameLightRef.current) {
      flameLightRef.current.intensity = 1.6 + Math.sin(t * 6.5) * 0.25;
    }
  });

  return (
    <group
      position={[0, -0.45, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onToggleMood();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHoverChange(true);
      }}
      onPointerOut={() => onHoverChange(false)}
    >
      {/* 1. Outer Obsidian Terrace Plinth */}
      <mesh position={[0, -1.16, 0]} receiveShadow>
        <cylinderGeometry args={[1.68, 1.84, 0.22, 56]} />
        <meshStandardMaterial color="#151515" roughness={0.42} metalness={0.22} />
      </mesh>

      {/* 2. Brushed Champagne-Gold Inlay Trim */}
      <mesh position={[0, -1.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.69, 0.024, 16, 72]} />
        <meshStandardMaterial color="#DFC082" roughness={0.2} metalness={0.94} />
      </mesh>

      {/* 3. Upper Polished Stone Deck */}
      <mesh position={[0, -0.96, 0]} receiveShadow>
        <cylinderGeometry args={[1.22, 1.32, 0.16, 56]} />
        <meshStandardMaterial color="#1C1C1C" roughness={0.28} metalness={0.3} />
      </mesh>

      {/* 4. Sculpted West African Lounge Stoneware Vessel (LatheGeometry) */}
      <mesh
        geometry={vesselGeometry}
        position={[-0.96, -0.88, 0.46]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#271E18" roughness={0.48} metalness={0.14} />
      </mesh>

      {/* 5. Gold-Rimmed Lounge Tasting Chalice (LatheGeometry) */}
      <mesh
        geometry={chaliceGeometry}
        position={[-0.64, -0.88, 0.72]}
        castShadow
      >
        <meshStandardMaterial color="#C9A45C" roughness={0.16} metalness={0.92} />
      </mesh>

      {/* 6. Warm Brass Candle Holder & Flame Bulb */}
      <group position={[0.92, -0.88, 0.56]}>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.08, 24]} />
          <meshStandardMaterial color="#C9A45C" roughness={0.22} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.14, 16]} />
          <meshStandardMaterial color="#F8F4EC" roughness={0.65} metalness={0.0} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshStandardMaterial
            color="#FFE09E"
            emissive="#FF9E2C"
            emissiveIntensity={2.2}
            roughness={0.1}
          />
        </mesh>
        <pointLight ref={flameLightRef} position={[0, 0.34, 0]} color="#FFB35C" intensity={1.6} distance={3} />
      </group>

      {/* 7. Rotating 8-Column Fluted Afro-Modern Pavilion & Canopy */}
      <group ref={pavilionRef}>
        <mesh position={[0, -0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.76, 0.038, 16, 56]} />
          <meshStandardMaterial color="#C9A45C" roughness={0.24} metalness={0.88} />
        </mesh>

        {columnAngles.map((angle, idx) => (
          <mesh
            key={idx}
            position={[Math.cos(angle) * 0.76, 0.42, Math.sin(angle) * 0.76]}
            castShadow
          >
            <cylinderGeometry args={[0.025, 0.034, 2.42, 14]} />
            <meshStandardMaterial color="#C9A45C" roughness={0.22} metalness={0.9} />
          </mesh>
        ))}

        {/* Architectural Canopy Crown Ring + Lattice Accent */}
        <mesh position={[0, 1.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.8, 0.045, 16, 56]} />
          <meshStandardMaterial color="#DFC082" roughness={0.2} metalness={0.92} />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.78, 0.84, 0.07, 8]} />
          <meshStandardMaterial color="#173C30" roughness={0.35} metalness={0.45} />
        </mesh>
        <mesh position={[0, 1.98, 0]} castShadow>
          <coneGeometry args={[0.24, 0.56, 24]} />
          <meshStandardMaterial color="#DFC082" roughness={0.18} metalness={0.95} />
        </mesh>

        {/* Glass Lantern Sleeve around Illuminated Core */}
        <mesh position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.54, 0.54, 1.24, 32, 1, true]} />
          <meshPhysicalMaterial
            color="#173C30"
            roughness={0.1}
            metalness={0.05}
            transmission={0.72}
            thickness={0.35}
            ior={1.45}
            transparent
            opacity={0.42}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Illuminated Amber / Emerald Lantern Core */}
        <mesh ref={coreRef} position={[0, 0.62, 0]} castShadow>
          <octahedronGeometry args={[0.42, 1]} />
          <meshPhysicalMaterial
            ref={coreMatRef}
            color="#FFCF7D"
            emissive="#FFAA3B"
            emissiveIntensity={0.95}
            roughness={0.14}
            metalness={0.1}
            clearcoat={1}
          />
        </mesh>
        <pointLight
          ref={coreLightRef}
          position={[0, 0.62, 0]}
          color="#FFAA3B"
          intensity={4.2}
          distance={8}
          decay={1.8}
        />
      </group>

      {/* 8. Floating Champagne-Gold Orbital Halos */}
      <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.35}>
        <mesh
          ref={outerHaloRef}
          position={[0, 0.56, 0]}
          rotation={[Math.PI * 0.36, Math.PI * 0.14, 0]}
        >
          <torusGeometry args={[1.48, 0.018, 16, 96]} />
          <meshStandardMaterial color="#DFC082" roughness={0.18} metalness={0.94} />
        </mesh>
        <mesh
          ref={innerHaloRef}
          position={[0, 0.64, 0]}
          rotation={[-Math.PI * 0.28, Math.PI * 0.22, 0]}
        >
          <torusGeometry args={[1.18, 0.014, 16, 84]} />
          <meshStandardMaterial color="#C9A45C" roughness={0.24} metalness={0.88} />
        </mesh>
      </Float>

      {/* Atmospheric Floating Gold Embers */}
      <Sparkles
        count={42}
        scale={[3.8, 3.2, 3.8]}
        position={[0, 0.6, 0]}
        size={2.2}
        speed={0.35}
        opacity={0.75}
        color={mood === 'amber' ? '#DFC082' : '#6EE7B7'}
      />

      {/* Soft Grounded Contact Shadow */}
      <ContactShadows
        position={[0, -1.27, 0]}
        opacity={0.62}
        scale={5.4}
        blur={2.2}
        far={3.5}
        color="#050505"
      />
    </group>
  );
}

export default function Hero3DScene({
  fallbackImage,
  fallbackAlt = "Chop 'n Chill Kasoa upstairs terrace and evening lounge atmosphere",
  className = '',
}: Hero3DSceneProps) {
  const [webglReady, setWebglReady] = useState<boolean>(() => detectHardwareWebGL());
  const [mood, setMood] = useState<LoungeMood>('amber');
  const [hovered, setHovered] = useState(false);

  const fallbackNode = (
    <HeroFallbackCard
      fallbackImage={fallbackImage}
      fallbackAlt={fallbackAlt}
      className={className}
    />
  );

  if (!webglReady) {
    return fallbackNode;
  }

  return (
    <WebGL3DErrorBoundary fallback={fallbackNode}>
      <div
        className={`relative w-full h-full select-none ${hovered ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${className}`}
      >
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0.35, 1.65, 5.8], fov: 38, near: 0.1, far: 40 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              'webglcontextlost',
              (e) => {
                e.preventDefault();
                setWebglReady(false);
              },
              { once: true }
            );
          }}
        >
          {/* Procedural Studio Environment (Zero External HDR URLs) */}
          <Environment resolution={128}>
            <Lightformer
              form="rect"
              intensity={2.2}
              color="#FFF0D4"
              scale={[8, 4, 1]}
              position={[0, 5, 4]}
              rotation={[Math.PI / 3, 0, 0]}
            />
            <Lightformer
              form="rect"
              intensity={1.5}
              color="#173C30"
              scale={[6, 6, 1]}
              position={[-5, 1, -2]}
              rotation={[0, Math.PI / 2, 0]}
            />
            <Lightformer
              form="ring"
              intensity={1.8}
              color="#C9A45C"
              scale={4}
              position={[4, 2, -3]}
              rotation={[0, -Math.PI / 3, 0]}
            />
          </Environment>

          <hemisphereLight args={['#ffe6b3', '#0e1d17', 0.65]} />
          <directionalLight
            position={[4.5, 6.5, 4.2]}
            intensity={2.1}
            color="#FFF0D4"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-4.5, 2.5, -3.5]} intensity={1.3} color="#2D7A62" />

          <AfroModernLoungePavilion
            mood={mood}
            hovered={hovered}
            onToggleMood={() => setMood((m) => (m === 'amber' ? 'emerald' : 'amber'))}
            onHoverChange={setHovered}
          />

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.5}
            minPolarAngle={Math.PI * 0.28}
            maxPolarAngle={Math.PI * 0.56}
          />
        </Canvas>

        {/* Minimal Solid-Backing Interactive Controls Bar (Zero backdrop-filter over canvas) */}
        <div className="pointer-events-auto absolute bottom-3 right-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMood((m) => (m === 'amber' ? 'emerald' : 'amber'))}
            className="px-3 py-1.5 rounded-sm bg-[#141414]/95 border border-[#C9A45C]/45 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#DFC082] hover:border-[#DFC082] hover:text-[#F8F4EC] transition-colors min-h-[34px]"
          >
            {mood === 'amber' ? 'Mood: Amber Lantern' : 'Mood: Terrace Emerald'}
          </button>
          <span className="hidden xl:inline-block px-2.5 py-1.5 rounded-sm bg-[#141414]/90 border border-[#F8F4EC]/15 text-[11px] text-[#C8BFA8]">
            Drag to rotate
          </span>
        </div>
      </div>
    </WebGL3DErrorBoundary>
  );
}
