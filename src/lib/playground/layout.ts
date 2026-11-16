import type { Project } from "@/types/portfolio";
import { type Rect, rectFromCenter } from "./collision";
import {
  blockBorder,
  blockRect,
  createGrid,
  type Grid,
  type Point,
} from "./grid";

/**
 * Tata letak ruang server: dari daftar proyek menjadi "stasiun" (rak yang bisa
 * dikunjungi), posisi tiap rak, properti dekoratif, dan grid navigasinya.
 *
 * Fungsi murni — scene 3D, daftar DOM, dan test membaca dari sumber yang sama,
 * sehingga apa yang terlihat selalu cocok dengan apa yang bisa dipijak.
 *
 * Orientasi: rak menghadap +Z (ke arah lobi/kamera). Baris pertama paling dekat
 * lobi; baris berikutnya mundur ke arah -Z.
 */

/** Jumlah rak berisi paling banyak. Lebih dari ini → rak terakhir jadi "Arsip". */
export const MAX_STATIONS = 24;
export const RACKS_PER_ROW = 4;
/** Ruangan selalu punya minimal dua baris supaya tidak terasa kosong. */
export const MIN_ROWS = 2;

export const RACK = { width: 1.1, depth: 0.9, height: 2.3 } as const;
// Jarak antar-rak dan margin samping dipilih supaya tepi rak jatuh di garis
// sel grid (kelipatan 0,25 m) dan celah antar-rak cukup lega untuk dilewati.
const RACK_SPACING_X = 2.5;
const ROW_SPACING_Z = 3.6;
const SIDE_MARGIN = 2.7;
const LOBBY_DEPTH = 6;
const BACK_MARGIN = 2.6;

/** Jarak titik berdiri pemain dari muka rak. */
const APPROACH_DISTANCE = 0.95;
/** Radius badan pemain; halangan diperlebar sebesar ini di grid. */
export const PLAYER_RADIUS = 0.28;
export const GRID_CELL = 0.25;
/**
 * Pelebaran halangan di grid. Lebih kecil dari radius pemain karena pembulatan
 * ke sel sudah menambah hingga setengah sel di tiap sisi; kalau memakai radius
 * penuh, celah yang secara visual lega jadi tampak tertutup.
 */
const GRID_PADDING = PLAYER_RADIUS - GRID_CELL / 2;
/** Tebal "bantalan" dinding: pemain tidak menempel persis ke dinding. */
const WALL_MARGIN = 0.12;

/** Subset data proyek yang benar-benar dipakai playground (hemat payload RSC). */
export type PlaygroundProject = Pick<
  Project,
  | "id"
  | "title"
  | "slug"
  | "shortDesc"
  | "coverImageUrl"
  | "category"
  | "timeline"
  | "role"
  | "demoUrl"
  | "repoUrl"
> & { tags: string[] };

export function toPlaygroundProject(project: Project): PlaygroundProject {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    shortDesc: project.shortDesc,
    coverImageUrl: project.coverImageUrl,
    category: project.category,
    timeline: project.timeline,
    role: project.role,
    demoUrl: project.demoUrl,
    repoUrl: project.repoUrl,
    tags: (project.tags ?? []).map((tag) => tag.name).filter(Boolean),
  };
}

export type Station =
  | {
      kind: "project";
      id: string;
      label: string;
      href: string;
      project: PlaygroundProject;
    }
  | {
      kind: "archive";
      id: "archive";
      label: string;
      href: "/projects";
      /** Banyaknya proyek yang tidak kebagian rak sendiri. */
      remaining: number;
    };

/**
 * Susun stasiun dari proyek. `total` = jumlah proyek di backend (dari meta
 * paginasi), boleh lebih besar dari `projects.length`.
 *
 * Bila proyek melebihi kapasitas, rak terakhir menjadi rak "Arsip" yang
 * menautkan ke daftar lengkap — tidak ada proyek yang hilang tanpa jejak.
 */
export function buildStations(
  projects: PlaygroundProject[],
  total = projects.length,
): Station[] {
  const count = Math.max(total, projects.length);
  const overflow = count > MAX_STATIONS;
  const shown = projects.slice(0, overflow ? MAX_STATIONS - 1 : MAX_STATIONS);

  const stations: Station[] = shown.map((project) => ({
    kind: "project",
    id: project.id,
    label: project.title,
    href: `/projects/${encodeURIComponent(project.slug)}`,
    project,
  }));

  if (overflow) {
    stations.push({
      kind: "archive",
      id: "archive",
      label: "Project archive",
      href: "/projects",
      remaining: count - shown.length,
    });
  }
  return stations;
}

export interface RackSlot {
  index: number;
  x: number;
  z: number;
  /** Indeks ke array stasiun, atau `null` untuk rak kosong (dekorasi). */
  station: number | null;
  /** Titik berdiri pemain di depan rak. */
  approach: Point;
}

export type PropKind = "bed" | "plant" | "cooler" | "crates";

export interface RoomProp {
  kind: PropKind;
  x: number;
  z: number;
  /** Tapak (lebar X × kedalaman Z) yang menghalangi jalan. */
  w: number;
  d: number;
}

export interface RoomLayout {
  width: number;
  depth: number;
  rows: number;
  slots: RackSlot[];
  props: RoomProp[];
  spawn: Point;
  /** Grid kasar untuk pencarian jalur (klik-untuk-jalan). */
  grid: Grid;
  /** Kotak halangan tepat (rak + properti) untuk tabrakan gerak manual. */
  obstacles: Rect[];
  /** Batas dalam ruangan (dinding). */
  bounds: Rect;
}

export function buildLayout(stationCount: number): RoomLayout {
  const count = Math.min(Math.max(0, stationCount), MAX_STATIONS);
  const rows = Math.max(MIN_ROWS, Math.ceil(count / RACKS_PER_ROW));

  // Dibulatkan: 2,7 × 2 + 2,5 × 3 + 1,1 tidak tepat 14 di floating point.
  const width = Math.round(
    SIDE_MARGIN * 2 + (RACKS_PER_ROW - 1) * RACK_SPACING_X + RACK.width,
  );
  // Dibulatkan ke atas ke meter utuh supaya ubin lantai dan sel grid pas.
  const depth = Math.ceil(
    LOBBY_DEPTH + (rows - 1) * ROW_SPACING_Z + RACK.depth + BACK_MARGIN,
  );

  const frontRowZ = depth / 2 - LOBBY_DEPTH - RACK.depth / 2;
  const firstX = -((RACKS_PER_ROW - 1) * RACK_SPACING_X) / 2;

  const slots: RackSlot[] = [];
  for (let index = 0; index < rows * RACKS_PER_ROW; index++) {
    const row = Math.floor(index / RACKS_PER_ROW);
    const col = index % RACKS_PER_ROW;
    const x = firstX + col * RACK_SPACING_X;
    const z = frontRowZ - row * ROW_SPACING_Z;
    slots.push({
      index,
      x,
      z,
      station: index < count ? index : null,
      approach: { x, z: z + RACK.depth / 2 + APPROACH_DISTANCE },
    });
  }

  const props: RoomProp[] = [
    // Sudut kiri-depan: tempat tidur si robot — titik awalnya di sebelahnya.
    { kind: "bed", x: -width / 2 + 1.7, z: depth / 2 - 1.5, w: 1.4, d: 1.1 },
    { kind: "plant", x: width / 2 - 1.1, z: depth / 2 - 1.1, w: 0.7, d: 0.7 },
    { kind: "plant", x: -width / 2 + 0.8, z: frontRowZ + 0.4, w: 0.7, d: 0.7 },
    { kind: "crates", x: width / 2 - 1.3, z: depth / 2 - 3.1, w: 1.1, d: 1.0 },
    // Unit pendingin menempel dinding kanan, di antara dua baris pertama.
    {
      kind: "cooler",
      x: width / 2 - 0.75,
      z: frontRowZ - ROW_SPACING_Z / 2,
      w: 0.9,
      d: 1.7,
    },
  ];

  const obstacles: Rect[] = [
    ...slots.map((slot) =>
      rectFromCenter(slot.x, slot.z, RACK.width, RACK.depth),
    ),
    ...props.map((prop) => rectFromCenter(prop.x, prop.z, prop.w, prop.d)),
  ];
  const bounds: Rect = {
    minX: -width / 2 + WALL_MARGIN,
    maxX: width / 2 - WALL_MARGIN,
    minZ: -depth / 2 + WALL_MARGIN,
    maxZ: depth / 2 - WALL_MARGIN,
  };

  const grid = createGrid(width, depth, GRID_CELL);
  // 2 sel × 0,25 m = 0,5 m dari dinding.
  blockBorder(grid, 2);
  for (const rect of obstacles) {
    blockRect(
      grid,
      (rect.minX + rect.maxX) / 2,
      (rect.minZ + rect.maxZ) / 2,
      rect.maxX - rect.minX,
      rect.maxZ - rect.minZ,
      GRID_PADDING,
    );
  }

  return {
    width,
    depth,
    rows,
    slots,
    props,
    spawn: { x: -width / 2 + 3.6, z: depth / 2 - 1.9 },
    grid,
    obstacles,
    bounds,
  };
}

/** Slot (rak berisi) yang titik berdirinya paling dekat, dalam `maxDistance`. */
export function nearestStationSlot(
  layout: RoomLayout,
  x: number,
  z: number,
  maxDistance = 1.15,
): RackSlot | null {
  let best: RackSlot | null = null;
  let bestDist = maxDistance;
  for (const slot of layout.slots) {
    if (slot.station === null) continue;
    const dist = Math.hypot(slot.approach.x - x, slot.approach.z - z);
    if (dist <= bestDist) {
      bestDist = dist;
      best = slot;
    }
  }
  return best;
}

/** Kode rak dua digit untuk papan nama: R01, R02, … */
export function rackCode(index: number): string {
  return `R${String(index + 1).padStart(2, "0")}`;
}
