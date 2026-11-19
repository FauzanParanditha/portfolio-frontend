"use client";

import {
  CHECK_LABEL,
  type Health,
  OVERALL_LABEL,
} from "@/lib/playground/health";
import {
  DESK,
  experiencePeriod,
  type Fixture,
  MAILBOX,
  type RoomLayout,
  type Station,
  targetCode,
} from "@/lib/playground/layout";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  type CanvasTexture,
  type Group,
  type MeshBasicMaterial,
} from "three";
import { CLICK_DRAG_TOLERANCE } from "../input";
import {
  createBoardTexture,
  createGlowTexture,
  createNameplateTexture,
  createScreenTexture,
  PALETTE,
  type ScreenLine,
} from "./textures";

interface FixturesProps {
  layout: RoomLayout;
  stations: Station[];
  health: Health | null;
  /** Indeks tujuan yang sedang disorot (bisa rak; di sini hanya perabot dipakai). */
  hovered: number | null;
  reducedMotion: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}

/**
 * Perabot berstasiun di lobi: meja terminal (status live), dinding pengalaman,
 * dan kotak surat. Masing-masing bisa diklik seperti rak, punya papan nama,
 * dan pendar di lantai pada titik berdirinya.
 */
export function Fixtures({
  layout,
  stations,
  health,
  hovered,
  reducedMotion,
  onHover,
  onSelect,
}: FixturesProps) {
  const glowTexture = useMemo(() => createGlowTexture(), []);
  useEffect(() => () => glowTexture.dispose(), [glowTexture]);

  return (
    <group>
      {layout.fixtures.map((fixture) => {
        const station = stations[fixture.station as number];
        if (!station) return null;
        const shared = {
          fixture,
          label: station.label,
          glowTexture,
          active: hovered === fixture.index,
          reducedMotion,
          onHover,
          onSelect,
        };
        if (fixture.kind === "terminal") {
          return <Terminal key={fixture.index} {...shared} health={health} />;
        }
        if (fixture.kind === "wall") {
          return (
            <ExperienceWall
              key={fixture.index}
              {...shared}
              station={station}
              wallX={-layout.width / 2}
            />
          );
        }
        return <Mailbox key={fixture.index} {...shared} />;
      })}
    </group>
  );
}

interface FixtureProps {
  fixture: Fixture;
  label: string;
  glowTexture: CanvasTexture;
  active: boolean;
  reducedMotion: boolean;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}

/** Penangan pointer yang sama untuk semua perabot. */
function pointerHandlers({ fixture, onHover, onSelect }: FixtureProps) {
  return {
    onPointerMove: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onHover(fixture.index);
    },
    onPointerOut: () => onHover(null),
    onClick: (event: ThreeEvent<MouseEvent>) => {
      // Perabot "menelan" klik supaya lantai di belakangnya tidak ikut kena.
      event.stopPropagation();
      if (event.delta > CLICK_DRAG_TOLERANCE) return;
      onSelect(fixture.index);
    },
  };
}

/** Papan nama + pendar lantai di titik berdiri; membesar/terang saat disorot. */
function Marker({
  fixture,
  label,
  glowTexture,
  active,
  reducedMotion,
  platePosition,
  plateRotation,
}: FixtureProps & {
  platePosition: [number, number, number];
  plateRotation: [number, number, number];
}) {
  const plateRef = useRef<Group>(null);
  const glowRef = useRef<MeshBasicMaterial>(null);
  const level = useRef(0);

  const texture = useMemo(
    () => createNameplateTexture(targetCode(fixture), label, "project"),
    [fixture, label],
  );
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    const ease = reducedMotion ? 1 : 1 - Math.exp(-12 * delta);
    level.current += ((active ? 1 : 0) - level.current) * ease;
    plateRef.current?.scale.setScalar(1 + level.current * 0.16);
    if (glowRef.current) glowRef.current.opacity = 0.2 + level.current * 0.4;
  });

  return (
    <>
      <group ref={plateRef} position={platePosition} rotation={plateRotation}>
        <mesh>
          <planeGeometry args={[1.24, 0.31]} />
          <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
      </group>
      <mesh
        position={[fixture.approach.x, 0.013, fixture.approach.z]}
        rotation-x={-Math.PI / 2}
        renderOrder={1}
      >
        <planeGeometry args={[1.8, 1.8]} />
        <meshBasicMaterial
          ref={glowRef}
          map={glowTexture}
          color={PALETTE.accent}
          transparent
          opacity={0.2}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}

const STATE_COLOR = {
  ok: PALETTE.green,
  degraded: PALETTE.amber,
  limited: PALETTE.textDim,
  unavailable: PALETTE.textDim,
} as const;

function screenLines(health: Health | null): ScreenLine[] {
  if (!health) {
    return [
      { text: "$ status", color: PALETTE.accentSoft },
      { text: "checking…", color: PALETTE.textDim },
    ];
  }
  const lines: ScreenLine[] = [];
  for (const check of health.checks) {
    lines.push({ text: `$ curl /${check.name}`, color: PALETTE.accentSoft });
    lines.push({
      text:
        check.latencyMs === null
          ? CHECK_LABEL[check.state]
          : `${CHECK_LABEL[check.state]}  ${check.latencyMs} ms`,
      color: STATE_COLOR[check.state],
    });
  }
  lines.push({
    text: `> ${OVERALL_LABEL[health.overall].toUpperCase()}`,
    color: health.overall === "operational" ? PALETTE.green : PALETTE.amber,
  });
  return lines;
}

/** Meja dengan monitor yang menampilkan status backend sebenarnya. */
function Terminal(props: FixtureProps & { health: Health | null }) {
  const { fixture, health } = props;
  const screen = useMemo(() => createScreenTexture(), []);
  useEffect(() => () => screen.texture.dispose(), [screen]);
  // Saat panel terbuka scene hanya merender atas permintaan
  // (`frameloop="demand"`); tanpa `invalidate` monitor baru berubah setelah
  // panel ditutup, padahal panel di sebelahnya sudah menampilkan status baru.
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    screen.draw(screenLines(health));
    invalidate();
  }, [screen, health, invalidate]);

  const { x, z } = fixture;
  return (
    <group>
      <group {...pointerHandlers(props)}>
        <mesh position={[x, DESK.height / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[DESK.width, DESK.height, DESK.depth]} />
          <meshStandardMaterial
            color="#2b2b31"
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[x, DESK.height + 0.1, z - 0.14]} castShadow>
          <boxGeometry args={[0.1, 0.2, 0.1]} />
          <meshStandardMaterial
            color="#3f3f46"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[x, DESK.height + 0.56, z - 0.14]} castShadow>
          <boxGeometry args={[1.24, 0.78, 0.06]} />
          <meshStandardMaterial
            color="#141416"
            roughness={0.4}
            metalness={0.3}
          />
        </mesh>
        <mesh position={[x, DESK.height + 0.56, z - 0.108]}>
          <planeGeometry args={[1.14, 0.68]} />
          <meshBasicMaterial map={screen.texture} toneMapped={false} />
        </mesh>
        <mesh position={[x, DESK.height + 0.016, z + 0.18]} castShadow>
          <boxGeometry args={[0.52, 0.03, 0.18]} />
          <meshStandardMaterial color="#18181b" roughness={0.6} />
        </mesh>
      </group>
      <Marker
        {...props}
        platePosition={[x, DESK.height + 1.18, z - 0.14]}
        plateRotation={[-0.3, 0, 0]}
      />
    </group>
  );
}

const BOARD = { width: 1.5, height: 1.26, spacing: 1.72 } as const;
const MAX_BOARDS = 3;

/** Papan-papan di dinding barat: satu per pengalaman (paling banyak tiga). */
function ExperienceWall(
  props: FixtureProps & { station: Station; wallX: number },
) {
  const { fixture, station, wallX } = props;
  const experiences = useMemo(
    () =>
      station.kind === "experience"
        ? station.experiences.slice(0, MAX_BOARDS)
        : [],
    [station],
  );
  const boards = useMemo(
    () =>
      experiences.map((experience) => ({
        id: experience.id,
        texture: createBoardTexture(
          experiencePeriod(experience),
          experience.title,
          experience.company,
        ),
      })),
    [experiences],
  );
  useEffect(
    () => () => {
      for (const board of boards) board.texture.dispose();
    },
    [boards],
  );

  // Entri pertama di sisi yang lebih dekat ke kamera (z lebih besar).
  const offset = (index: number) =>
    ((boards.length - 1) / 2 - index) * BOARD.spacing;

  return (
    <group>
      <group {...pointerHandlers(props)}>
        {boards.map((board, index) => (
          <mesh
            key={board.id}
            position={[wallX + 0.03, 1.85, fixture.z + offset(index)]}
            rotation-y={Math.PI / 2}
          >
            <planeGeometry args={[BOARD.width, BOARD.height]} />
            <meshBasicMaterial map={board.texture} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <Marker
        {...props}
        platePosition={[wallX + 0.05, 2.78, fixture.z]}
        plateRotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}

/** Kotak surat di dinding depan; membuka form kontak. */
function Mailbox(props: FixtureProps) {
  const { x, z } = props.fixture;
  return (
    <group>
      <group {...pointerHandlers(props)}>
        <mesh position={[x, 0.475, z]} castShadow>
          <boxGeometry args={[0.1, 0.95, 0.1]} />
          <meshStandardMaterial
            color="#3f3f46"
            roughness={0.5}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[x, 1.12, z]} castShadow>
          <boxGeometry args={[MAILBOX.width, 0.34, MAILBOX.depth]} />
          <meshStandardMaterial
            color="#0e7490"
            roughness={0.4}
            metalness={0.4}
          />
        </mesh>
        {/* Celah surat menghadap pemain (arah -Z). */}
        <mesh
          position={[x, 1.16, z - MAILBOX.depth / 2 - 0.002]}
          rotation-y={Math.PI}
        >
          <planeGeometry args={[0.32, 0.035]} />
          <meshBasicMaterial color="#06181d" />
        </mesh>
        <mesh position={[x + MAILBOX.width / 2 + 0.02, 1.28, z]} castShadow>
          <boxGeometry args={[0.03, 0.24, 0.12]} />
          <meshStandardMaterial color={PALETTE.amber} roughness={0.5} />
        </mesh>
      </group>
      <Marker
        {...props}
        platePosition={[x, 1.66, z - 0.05]}
        plateRotation={[-0.3, 0, 0]}
      />
    </group>
  );
}
