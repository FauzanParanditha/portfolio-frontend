"use client";

import { isWalkableAt } from "@/lib/playground/grid";
import {
  nearestStationSlot,
  type RoomLayout,
  type Station,
} from "@/lib/playground/layout";
import {
  createSim,
  FACE_RACK_HEADING,
  isMoving,
  setDestination,
  type Sim,
  stepSim,
  teleport,
} from "@/lib/playground/sim";
import {
  Canvas,
  type ThreeEvent,
  useFrame,
  useThree,
} from "@react-three/fiber";
import { type RefObject, useEffect, useRef, useState } from "react";
import { AdditiveBlending, type Mesh } from "three";
import { CLICK_DRAG_TOLERANCE, isPageTarget, isTypingTarget } from "../input";
import { CameraRig, DEFAULT_ORBIT, type Orbit } from "./CameraRig";
import { Racks } from "./Racks";
import { RobotDog } from "./RobotDog";
import { Room } from "./Room";
import { PALETTE } from "./textures";

/** Permintaan dari UI DOM: "jalan ke rak ini". `nonce` membedakan klik ulang. */
export interface WalkCommand {
  slot: number;
  nonce: number;
}

export interface PlaygroundCanvasProps {
  layout: RoomLayout;
  stations: Station[];
  command: WalkCommand | null;
  /** Panel terbuka / tab tersembunyi: hentikan render & input. */
  paused: boolean;
  reducedMotion: boolean;
  /** Pemain tiba di depan rak berisi. */
  onArrive: (slot: number) => void;
  /** Rak berisi terdekat saat pemain diam (untuk tombol "Inspect"). */
  onNearChange: (slot: number | null) => void;
  onReady: () => void;
}

const MOVE_KEYS: Record<string, readonly [number, number]> = {
  // [maju, kanan]
  KeyW: [1, 0],
  ArrowUp: [1, 0],
  KeyS: [-1, 0],
  ArrowDown: [-1, 0],
  KeyD: [0, 1],
  ArrowRight: [0, 1],
  KeyA: [0, -1],
  ArrowLeft: [0, -1],
};

/** Perangkat yang kemungkinan lemah: lewati bayangan real-time. */
function detectLowPower(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || cores <= 4;
}

export default function PlaygroundCanvas(props: PlaygroundCanvasProps) {
  const [lowPower] = useState(detectLowPower);
  // Batas atas resolusi render. Disimpan di state — bukan dipanggil langsung
  // lewat `setDpr` — karena <Canvas> menerapkan ulang prop `dpr` tiap kali ia
  // render; penurunan yang tidak tercermin di prop akan dibatalkan.
  const [maxDpr, setMaxDpr] = useState(lowPower ? 1.5 : 2);

  return (
    <Canvas
      // "percentage" = PCFShadowMap (penyaringan lembut bawaan three).
      shadows={lowPower ? false : "percentage"}
      dpr={[1, maxDpr]}
      frameloop={props.paused ? "demand" : "always"}
      camera={{ fov: 38, near: 0.5, far: 140, position: [5, 9, 16] }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMappingExposure: 1.2,
      }}
      // Halaman tidak menggulir; seret & cubit sepenuhnya milik kamera.
      style={{ touchAction: "none" }}
      aria-hidden="true"
    >
      <color attach="background" args={[PALETTE.background]} />
      <fog attach="fog" args={[PALETTE.background, 24, 62]} />
      <World
        {...props}
        shadows={!lowPower}
        maxDpr={maxDpr}
        onLowerResolution={setMaxDpr}
      />
    </Canvas>
  );
}

function World({
  layout,
  stations,
  command,
  paused,
  reducedMotion,
  shadows,
  onArrive,
  onNearChange,
  onReady,
  maxDpr,
  onLowerResolution,
}: PlaygroundCanvasProps & {
  shadows: boolean;
  maxDpr: number;
  onLowerResolution: (dpr: number) => void;
}) {
  const gl = useThree((state) => state.gl);

  // Keadaan simulasi hidup di ref: dimutasi tiap frame tanpa memicu render.
  const simRef = useRef<Sim | null>(null);
  if (simRef.current === null) {
    // Menghadap serong ke kamera saat pertama muncul.
    simRef.current = createSim(layout.spawn, 0.55);
  }
  const orbitRef = useRef<Orbit>({ ...DEFAULT_ORBIT });
  const keysRef = useRef(new Set<string>());
  const nearRef = useRef<number | null>(null);

  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  // Callback terbaru disimpan di ref supaya efek & frame loop tidak perlu
  // dipasang ulang tiap induknya render.
  const handlers = useRef({ onArrive, onNearChange });
  useEffect(() => {
    handlers.current = { onArrive, onNearChange };
  }, [onArrive, onNearChange]);

  useEffect(() => {
    onReady();
    // Hanya sekali saat scene terpasang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kursor "tangan" saat menunjuk rak berisi. Elemen kanvas disimpan di ref
  // karena gaya-nya diubah langsung (di luar alur render React).
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    canvasRef.current = gl.domElement;
  }, [gl]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const interactive =
      hoveredSlot !== null && layout.slots[hoveredSlot]?.station !== null;
    canvas.style.cursor = interactive ? "pointer" : "grab";
    return () => {
      canvas.style.cursor = "";
    };
  }, [hoveredSlot, layout]);

  // Perintah dari daftar DOM: jalan ke rak (atau langsung pindah bila
  // pengguna meminta gerak dikurangi).
  // Tiap perintah hanya dijalankan sekali: efek ini juga terpicu saat `layout`
  // atau `reducedMotion` berubah, dan perintah lama tidak boleh terulang.
  const handledNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!command || handledNonce.current === command.nonce) return;
    handledNonce.current = command.nonce;
    const slot = layout.slots[command.slot];
    const sim = simRef.current;
    if (!sim || !slot || slot.station === null) return;

    if (reducedMotion) {
      teleport(sim, slot.approach, FACE_RACK_HEADING);
      handlers.current.onArrive(slot.index);
      return;
    }
    if (!setDestination(sim, layout.grid, slot.approach, slot.index)) {
      // Tidak ada jalur (seharusnya mustahil) — tetap buka panelnya.
      handlers.current.onArrive(slot.index);
    }
  }, [command, layout, reducedMotion]);

  // Keyboard: WASD / panah, relatif terhadap arah kamera.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) keysRef.current.clear();
  }, [paused]);

  useEffect(() => {
    const keys = keysRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      // Tombol pengubah: lepaskan semua tombol gerak. macOS tidak mengirim
      // `keyup` untuk tombol lain selama Cmd ditahan, jadi tanpa ini pemain
      // bisa "tersangkut" berjalan.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        keys.clear();
        return;
      }
      if (!(event.code in MOVE_KEYS)) return;
      // Panel terbuka: biarkan tombol sepenuhnya milik dialog.
      if (pausedRef.current || isTypingTarget(event.target)) return;
      // Panah biasanya menggulir halaman / memindah fokus daftar; di sini
      // dipakai untuk berjalan hanya selama fokus tidak berada di kontrol lain.
      if (event.code.startsWith("Arrow") && !isPageTarget(event.target)) {
        return;
      }
      event.preventDefault();
      keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const clear = () => keys.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clear);
      keys.clear();
    };
  }, []);

  useFrame((_, delta) => {
    const sim = simRef.current;
    if (paused || !sim) return;

    let forward = 0;
    let right = 0;
    for (const code of keysRef.current) {
      const [f, r] = MOVE_KEYS[code];
      forward += f;
      right += r;
    }
    // Kamera berada di (sin a, cos a) dari pemain → "maju" menjauhi kamera.
    const azimuth = orbitRef.current.azimuth;
    const moveX = -Math.sin(azimuth) * forward + Math.cos(azimuth) * right;
    const moveZ = -Math.cos(azimuth) * forward - Math.sin(azimuth) * right;

    const event = stepSim(sim, layout, delta, { moveX, moveZ });
    if (
      event?.type === "arrived" &&
      event.slot !== null &&
      layout.slots[event.slot]?.station !== null
    ) {
      handlers.current.onArrive(event.slot);
    }

    const near = isMoving(sim)
      ? null
      : (nearestStationSlot(layout, sim.x, sim.z)?.index ?? null);
    if (near !== nearRef.current) {
      nearRef.current = near;
      handlers.current.onNearChange(near);
    }
  });

  const handleFloorClick = (event: ThreeEvent<MouseEvent>) => {
    const sim = simRef.current;
    if (paused || !sim || event.delta > CLICK_DRAG_TOLERANCE) return;
    // Seret-lalu-kembali ke titik awal tetap seretan kamera, bukan klik.
    if (orbitRef.current.dragged) return;
    setDestination(sim, layout.grid, {
      x: event.point.x,
      z: event.point.z,
    });
  };

  const handleRackSelect = (slotIndex: number) => {
    if (paused || orbitRef.current.dragged) return;
    const slot = layout.slots[slotIndex];
    const sim = simRef.current;
    if (!slot || !sim) return;
    setDestination(
      sim,
      layout.grid,
      slot.approach,
      slot.station !== null ? slot.index : null,
    );
  };

  return (
    <>
      <CameraRig
        layout={layout}
        simRef={simRef}
        orbitRef={orbitRef}
        reducedMotion={reducedMotion}
      />
      <Room layout={layout} shadows={shadows} onFloorClick={handleFloorClick} />
      <Racks
        layout={layout}
        stations={stations}
        hoveredSlot={hoveredSlot}
        reducedMotion={reducedMotion}
        onHover={setHoveredSlot}
        onSelect={handleRackSelect}
      />
      <RobotDog simRef={simRef} reducedMotion={reducedMotion} />
      <DestinationMarker simRef={simRef} layout={layout} />
      <AdaptiveResolution maxDpr={maxDpr} onLower={onLowerResolution} />
    </>
  );
}

/** Cincin penanda tujuan di lantai. */
function DestinationMarker({
  simRef,
  layout,
}: {
  simRef: RefObject<Sim | null>;
  layout: RoomLayout;
}) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    const mesh = ref.current;
    const marker = simRef.current?.marker;
    if (!mesh) return;
    const visible = !!marker && isWalkableAt(layout.grid, marker.x, marker.z);
    mesh.visible = visible;
    if (!visible || !marker) return;
    mesh.position.set(marker.x, 0.02, marker.z);
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.12;
    mesh.scale.setScalar(pulse);
  });

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} visible={false} renderOrder={3}>
      <ringGeometry args={[0.24, 0.32, 32]} />
      <meshBasicMaterial
        color={PALETTE.accentSoft}
        transparent
        opacity={0.9}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Turunkan resolusi render bila frame rate jatuh. Hanya menurun — tidak naik
 * lagi — supaya tidak berosilasi di perangkat yang pas-pasan.
 */
function AdaptiveResolution({
  maxDpr,
  onLower,
}: {
  maxDpr: number;
  onLower: (dpr: number) => void;
}) {
  const stats = useRef({ frames: 0, elapsed: 0, cooldown: 2 });

  useFrame((_, delta) => {
    const s = stats.current;
    // Lewati frame "lompat" (tab baru aktif) agar tidak salah menilai.
    if (delta > 0.25) return;
    if (s.cooldown > 0) {
      s.cooldown -= delta;
      return;
    }
    s.frames++;
    s.elapsed += delta;
    if (s.frames < 90) return;

    const fps = s.frames / s.elapsed;
    s.frames = 0;
    s.elapsed = 0;
    if (fps < 42 && maxDpr > 1) {
      onLower(Math.max(1, maxDpr - 0.5));
      s.cooldown = 2;
    }
  });

  return null;
}
