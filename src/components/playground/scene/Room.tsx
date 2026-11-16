"use client";

import type { RoomLayout, RoomProp } from "@/lib/playground/layout";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { type InstancedMesh, Object3D } from "three";
import {
  createFanTexture,
  createFloorTexture,
  createWallSignTexture,
  hash01,
  PALETTE,
} from "./textures";

const WALL_HEIGHT = 4.2;

interface RoomProps {
  layout: RoomLayout;
  /** Bayangan real-time; dimatikan di perangkat lemah. */
  shadows: boolean;
  onFloorClick: (event: ThreeEvent<MouseEvent>) => void;
}

/**
 * Cangkang ruangan: lantai, dinding, pencahayaan, dan properti dekoratif.
 *
 * Dinding hanya dirender dari sisi dalam (FrontSide). Kamera berada di luar
 * dinding selatan dan melihat ke dalam — dinding yang membelakangi kamera
 * otomatis tidak tergambar, jadi tidak perlu logika "sembunyikan dinding".
 */
export function Room({ layout, shadows, onFloorClick }: RoomProps) {
  const { width, depth } = layout;

  const floorTexture = useMemo(
    () => createFloorTexture(width, depth),
    [width, depth],
  );
  const signTexture = useMemo(() => createWallSignTexture(), []);
  useEffect(() => () => floorTexture.dispose(), [floorTexture]);
  useEffect(() => () => signTexture.dispose(), [signTexture]);

  const shadowExtent = Math.max(width, depth) / 2 + 2;

  return (
    <group>
      {/* ── Cahaya ── */}
      <hemisphereLight args={["#c3ceff", "#3a2c20", 1.9]} />
      <directionalLight
        position={[width * 0.35, 13, depth * 0.55]}
        intensity={3.2}
        color="#ffe0bd"
        castShadow={shadows}
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[
            -shadowExtent,
            shadowExtent,
            shadowExtent,
            -shadowExtent,
            1,
            40,
          ]}
        />
      </directionalLight>
      {/* Isian dari arah kamera supaya muka rak tidak gelap gulita. */}
      <directionalLight
        position={[-2, 5, depth]}
        intensity={0.9}
        color="#dfe6ff"
      />
      {/* Lampu hangat di lobi, dan isian cyan di antara rak. */}
      <pointLight
        position={[-width / 2 + 2.6, 2.4, depth / 2 - 2]}
        color={PALETTE.warm}
        intensity={34}
        distance={12}
        decay={2}
      />
      <pointLight
        position={[0, 3, -depth / 2 + 3]}
        color={PALETTE.accent}
        intensity={30}
        distance={16}
        decay={2}
      />

      {/* ── Lantai (juga bidang klik-untuk-jalan) ── */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={floorTexture}
          roughness={0.62}
          metalness={0.1}
        />
      </mesh>

      <Walls width={width} depth={depth} />

      {/* Papan nama di dinding belakang. */}
      <mesh position={[0, 3.05, -depth / 2 + 0.03]}>
        <planeGeometry args={[7.2, 1.8]} />
        <meshBasicMaterial map={signTexture} transparent toneMapped={false} />
      </mesh>
      <WallSlats width={width} depth={depth} />

      {layout.props.map((prop, index) => (
        <Prop key={`${prop.kind}-${index}`} prop={prop} seed={index} />
      ))}
    </group>
  );
}

function Walls({ width, depth }: { width: number; depth: number }) {
  const y = WALL_HEIGHT / 2;
  return (
    <group>
      {/* Utara (belakang), menghadap +Z. */}
      <mesh position={[0, y, -depth / 2]} receiveShadow>
        <planeGeometry args={[width, WALL_HEIGHT]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
      </mesh>
      {/* Selatan, menghadap -Z. */}
      <mesh position={[0, y, depth / 2]} rotation-y={Math.PI}>
        <planeGeometry args={[width, WALL_HEIGHT]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
      </mesh>
      {/* Barat, menghadap +X. */}
      <mesh
        position={[-width / 2, y, 0]}
        rotation-y={Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[depth, WALL_HEIGHT]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
      </mesh>
      {/* Timur, menghadap -X. */}
      <mesh
        position={[width / 2, y, 0]}
        rotation-y={-Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[depth, WALL_HEIGHT]} />
        <meshStandardMaterial color={PALETTE.wall} roughness={0.9} />
      </mesh>

      {/* Garis aksen tipis di kaki dinding belakang dan samping. */}
      <mesh position={[0, 0.09, -depth / 2 + 0.03]}>
        <boxGeometry args={[width, 0.05, 0.03]} />
        <meshBasicMaterial color="#0e7490" toneMapped={false} />
      </mesh>
      <mesh position={[-width / 2 + 0.03, 0.09, 0]}>
        <boxGeometry args={[0.03, 0.05, depth]} />
        <meshBasicMaterial color="#0e7490" toneMapped={false} />
      </mesh>
      <mesh position={[width / 2 - 0.03, 0.09, 0]}>
        <boxGeometry args={[0.03, 0.05, depth]} />
        <meshBasicMaterial color="#0e7490" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Bilah lampu hangat vertikal di dinding belakang, kiri-kanan papan nama. */
function WallSlats({ width, depth }: { width: number; depth: number }) {
  const ref = useRef<InstancedMesh>(null);
  const perSide = 4;
  const count = perSide * 2;

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    for (let i = 0; i < count; i++) {
      const side = i < perSide ? -1 : 1;
      const k = i % perSide;
      dummy.position.set(
        side * (width / 2 - 0.9 - k * 0.55),
        1.75,
        -depth / 2 + 0.04,
      );
      dummy.scale.set(1, 1 - k * 0.14, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, width, depth]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.1, 2.6, 0.04]} />
      <meshBasicMaterial color="#ffb86b" toneMapped={false} />
    </instancedMesh>
  );
}

function Prop({ prop, seed }: { prop: RoomProp; seed: number }) {
  switch (prop.kind) {
    case "bed":
      return <DogBed x={prop.x} z={prop.z} />;
    case "plant":
      return <Plant x={prop.x} z={prop.z} seed={seed} />;
    case "crates":
      return <Crates x={prop.x} z={prop.z} />;
    case "cooler":
      return <Cooler x={prop.x} z={prop.z} depth={prop.d} />;
  }
}

/** Tempat tidur si robot, plus mangkuk berisi mur & baut. */
function DogBed({ x, z }: { x: number; z: number }) {
  // (x,z) = pusat tapak halangan, yang mencakup tempat tidur DAN mangkuknya.
  // Tempat tidur di separuh kiri, mangkuk di separuh kanan.
  return (
    <group position={[x - 0.3, 0, z]}>
      <mesh position-y={0.07} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.14, 20]} />
        <meshStandardMaterial color="#7a4a2e" roughness={0.95} />
      </mesh>
      <mesh position-y={0.17} rotation-x={Math.PI / 2} castShadow>
        <torusGeometry args={[0.5, 0.13, 10, 24]} />
        <meshStandardMaterial color="#99603a" roughness={0.95} />
      </mesh>
      <mesh position-y={0.16} receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.08, 20]} />
        <meshStandardMaterial color="#ecd9bd" roughness={1} />
      </mesh>

      {/* Mangkuk di samping tempat tidur. */}
      <group position={[0.95, 0, 0.25]}>
        <mesh position-y={0.06} castShadow>
          <cylinderGeometry args={[0.2, 0.15, 0.12, 16]} />
          <meshStandardMaterial
            color="#0e7490"
            roughness={0.35}
            metalness={0.6}
          />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 1.9) * 0.08,
              0.125,
              Math.sin(i * 1.9) * 0.08,
            ]}
            rotation-y={i * 0.7}
          >
            <cylinderGeometry args={[0.035, 0.035, 0.03, 6]} />
            <meshStandardMaterial
              color="#d4d4d8"
              roughness={0.3}
              metalness={0.9}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Plant({ x, z, seed }: { x: number; z: number; seed: number }) {
  const leaves = 7;
  return (
    <group position={[x, 0, z]} rotation-y={hash01(seed) * Math.PI}>
      <mesh position-y={0.19} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.19, 0.38, 12]} />
        <meshStandardMaterial color="#b3603f" roughness={0.9} />
      </mesh>
      <mesh position-y={0.375}>
        <cylinderGeometry args={[0.22, 0.22, 0.02, 12]} />
        <meshStandardMaterial color="#2a1c14" roughness={1} />
      </mesh>
      {Array.from({ length: leaves }, (_, i) => {
        const angle = (i / leaves) * Math.PI * 2;
        const tilt = 0.35 + hash01(seed * 7 + i) * 0.4;
        const length = 0.75 + hash01(seed * 3 + i) * 0.5;
        return (
          <group key={i} position-y={0.38} rotation-y={angle}>
            <mesh
              position={[
                0,
                (length / 2) * Math.cos(tilt),
                (length / 2) * Math.sin(tilt),
              ]}
              rotation-x={tilt}
              scale={[1, 1, 0.28]}
              castShadow
            >
              <coneGeometry args={[0.13, length, 5]} />
              <meshStandardMaterial
                color={i % 2 ? "#2f9e6e" : "#3bb37f"}
                roughness={0.8}
                flatShading
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Crates({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} rotation-y={0.12} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.6, 0.75]} />
        <meshStandardMaterial color="#8d6c48" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.605, 0]} rotation-y={0.12}>
        <boxGeometry args={[0.14, 0.012, 0.76]} />
        <meshStandardMaterial color="#c9b18c" roughness={0.8} />
      </mesh>
      <mesh
        position={[0.08, 0.83, -0.04]}
        rotation-y={-0.3}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.55, 0.45, 0.5]} />
        <meshStandardMaterial color="#9a7850" roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Unit pendingin menempel dinding timur; kisi kipasnya menghadap ke ruangan. */
function Cooler({ x, z, depth }: { x: number; z: number; depth: number }) {
  const fanTexture = useMemo(() => createFanTexture(), []);
  useEffect(() => () => fanTexture.dispose(), [fanTexture]);
  const height = 2.1;

  return (
    <group position={[x, 0, z]}>
      <mesh position-y={height / 2} castShadow receiveShadow>
        <boxGeometry args={[0.9, height, depth]} />
        <meshStandardMaterial color="#34343b" roughness={0.6} metalness={0.2} />
      </mesh>
      {[-0.4, 0.4].map((offset) => (
        <mesh
          key={offset}
          position={[-0.452, 1.35, offset]}
          rotation-y={-Math.PI / 2}
        >
          <planeGeometry args={[0.7, 0.7]} />
          <meshStandardMaterial map={fanTexture} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[-0.455, 0.6, 0]}>
        <boxGeometry args={[0.01, 0.05, depth * 0.7]} />
        <meshBasicMaterial color={PALETTE.green} toneMapped={false} />
      </mesh>
    </group>
  );
}
