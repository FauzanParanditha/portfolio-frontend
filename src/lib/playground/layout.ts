import type { Experience } from "@/types/experience";
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
// Jarak antar-rak dipilih supaya celahnya (1,4 m) cukup lega untuk dilewati,
// dan supaya tepi rak yang sudah diperlebar di grid jatuh dekat garis sel
// (kelipatan 0,25 m) — celah di grid jadi seragam 4 sel di semua kolom.
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
/**
 * Celah properti-ke-dinding yang lebih sempit dari ini ditutup (kotak halangan
 * diperpanjang sampai dinding). Celah seperti itu muat untuk gerak manual tetapi
 * tertutup di grid; kalau dibiarkan, pemain bisa masuk ke "kantong" di balik
 * properti lalu klik-untuk-jalan dari sana memotong menembus properti itu.
 */
const MIN_WALL_GAP = 1.2;

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

/** Subset data pengalaman yang dipakai dinding pengalaman & panelnya. */
export type PlaygroundExperience = Pick<
  Experience,
  | "id"
  | "title"
  | "company"
  | "location"
  | "startDate"
  | "endDate"
  | "isCurrent"
  | "description"
> & { tags: string[]; highlights: string[] };

export function toPlaygroundExperience(
  experience: Experience,
): PlaygroundExperience {
  return {
    id: experience.id,
    title: experience.title,
    company: experience.company,
    location: experience.location,
    startDate: experience.startDate,
    endDate: experience.endDate,
    isCurrent: experience.isCurrent,
    description: experience.description,
    tags: (experience.tags ?? []).map((tag) => tag.name).filter(Boolean),
    highlights: (experience.highlights ?? [])
      .map((item) => item.text)
      .filter(Boolean),
  };
}

/** Rentang waktu sebuah pengalaman, seperti yang tampil di beranda. */
export function experiencePeriod(
  experience: Pick<PlaygroundExperience, "startDate" | "endDate" | "isCurrent">,
): string {
  const end = experience.isCurrent
    ? "Present"
    : experience.endDate || "Finished";
  return `${experience.startDate} — ${end}`;
}

/**
 * Stasiun = sesuatu yang bisa dikunjungi dan punya panel. Dua kelompok:
 * - rak (`project`, `archive`): satu per proyek, selalu di awal array;
 * - perabot (`status`, `experience`, `contact`): terminal, dinding, kotak surat.
 *
 * `href` adalah tujuan tautan di daftar (bekerja tanpa JavaScript / tanpa 3D);
 * `null` bila stasiun itu tidak punya padanan halaman biasa.
 */
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
    }
  | { kind: "status"; id: "status"; label: string; href: null }
  | {
      kind: "experience";
      id: "experience";
      label: string;
      href: "/#experience";
      experiences: PlaygroundExperience[];
    }
  | { kind: "contact"; id: "contact"; label: string; href: "/#contact" };

export type FixtureKind = "terminal" | "wall" | "mailbox";

/** Perabot yang mewakili tiap jenis stasiun non-rak. */
const FIXTURE_FOR: Record<
  Exclude<Station["kind"], "project" | "archive">,
  FixtureKind
> = { status: "terminal", experience: "wall", contact: "mailbox" };

export function isRackStation(station: Station): boolean {
  return station.kind === "project" || station.kind === "archive";
}

/** Jenis perabot yang dibutuhkan sebuah daftar stasiun, urut sesuai daftarnya. */
export function fixtureKindsFor(stations: Station[]): FixtureKind[] {
  const kinds: FixtureKind[] = [];
  for (const station of stations) {
    if (station.kind === "project" || station.kind === "archive") continue;
    kinds.push(FIXTURE_FOR[station.kind]);
  }
  return kinds;
}

/**
 * Susun stasiun dari proyek. `total` = jumlah proyek di backend (dari meta
 * paginasi), boleh lebih besar dari `projects.length`.
 *
 * Bila proyek melebihi kapasitas, rak terakhir menjadi rak "Arsip" yang
 * menautkan ke daftar lengkap — tidak ada proyek yang hilang tanpa jejak.
 *
 * Setelah rak menyusul stasiun perabot: terminal status (selalu ada), dinding
 * pengalaman (hanya bila ada datanya), dan kotak surat (selalu ada).
 */
export function buildStations(
  projects: PlaygroundProject[],
  total = projects.length,
  experiences: PlaygroundExperience[] = [],
): Station[] {
  // `total` datang dari meta API; nilai yang tidak masuk akal (NaN, negatif,
  // tak hingga) diabaikan dan jumlah yang benar-benar diterima yang dipakai.
  const reported =
    Number.isFinite(total) && total >= 0 ? Math.floor(total) : projects.length;
  const count = Math.max(reported, projects.length);
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

  stations.push({
    kind: "status",
    id: "status",
    label: "Live status",
    href: null,
  });
  if (experiences.length > 0) {
    stations.push({
      kind: "experience",
      id: "experience",
      label: "Experience",
      href: "/#experience",
      experiences,
    });
  }
  stations.push({
    kind: "contact",
    id: "contact",
    label: "Contact",
    href: "/#contact",
  });
  return stations;
}

/**
 * Tujuan yang bisa didatangi pemain: rak atau perabot. `index` adalah posisinya
 * di `layout.targets` (rak lebih dulu, lalu perabot) dan dipakai sebagai
 * pengenal di seluruh playground.
 */
export interface Target {
  index: number;
  kind: "rack" | FixtureKind;
  x: number;
  z: number;
  /** Indeks ke array stasiun, atau `null` untuk rak kosong (dekorasi). */
  station: number | null;
  /** Titik berdiri pemain di depan tujuan. */
  approach: Point;
  /** Arah hadap pemain saat berdiri di sana (0 = +Z, π = -Z). */
  face: number;
}

export type RackSlot = Target & { kind: "rack" };
export type Fixture = Target & { kind: FixtureKind };

/** Tapak meja terminal dan kotak surat (lebar X × kedalaman Z). */
export const DESK = { width: 1.9, depth: 0.8, height: 0.78 } as const;
export const MAILBOX = { width: 0.5, depth: 0.4 } as const;

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
  /** Rak (berisi maupun kosong). */
  slots: RackSlot[];
  /** Perabot berstasiun: terminal, dinding pengalaman, kotak surat. */
  fixtures: Fixture[];
  /** `slots` diikuti `fixtures`; `targets[i].index === i`. */
  targets: Target[];
  props: RoomProp[];
  spawn: Point;
  /** Grid kasar untuk pencarian jalur (klik-untuk-jalan). */
  grid: Grid;
  /** Kotak halangan tepat (rak + perabot + properti) untuk tabrakan gerak manual. */
  obstacles: Rect[];
  /** Batas dalam ruangan (dinding). */
  bounds: Rect;
}

/**
 * @param stationCount jumlah stasiun RAK (proyek + arsip).
 * @param fixtureKinds perabot yang dipasang, urut sesuai stasiunnya; stasiun
 *   perabot ke-i berindeks `stationCount + i` di array stasiun.
 */
export function buildLayout(
  stationCount: number,
  fixtureKinds: FixtureKind[] = [],
): RoomLayout {
  const count = Math.min(Math.max(0, stationCount), MAX_STATIONS);
  const rows = Math.max(MIN_ROWS, Math.ceil(count / RACKS_PER_ROW));

  // Dibulatkan ke meter utuh (14) supaya ubin lantai dan sel grid pas.
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
      kind: "rack",
      x,
      z,
      station: index < count ? index : null,
      approach: { x, z: z + RACK.depth / 2 + APPROACH_DISTANCE },
      face: Math.PI,
    });
  }

  // Perabot berada di lobi (sisi +Z ruangan), jauh dari lorong rak.
  const fixtures: Fixture[] = fixtureKinds.map((kind, i) => {
    const base = { index: slots.length + i, kind, station: count + i };
    if (kind === "terminal") {
      // Meja menghadap lobi; pemain berdiri di depannya, menghadap monitor.
      const x = width / 2 - 2.9;
      const z = depth / 2 - 3.2;
      return {
        ...base,
        x,
        z,
        approach: { x, z: z + DESK.depth / 2 + APPROACH_DISTANCE },
        face: Math.PI,
      };
    }
    if (kind === "wall") {
      // Papan menempel di dinding barat; pemain menghadap dinding.
      const z = depth / 2 - 3.9;
      return {
        ...base,
        x: -width / 2,
        z,
        approach: { x: -width / 2 + 1.6, z },
        face: -Math.PI / 2,
      };
    }
    // Kotak surat di dinding depan; pemain datang dari arah rak dan berdiri
    // menghadap kamera.
    const x = 0.8;
    const z = depth / 2 - 0.95;
    return {
      ...base,
      x,
      z,
      approach: { x, z: z - MAILBOX.depth / 2 - APPROACH_DISTANCE },
      face: 0,
    };
  });

  const props: RoomProp[] = [
    // Sudut kiri-depan: tempat tidur si robot beserta mangkuknya (tapak
    // mencakup keduanya) — titik awal pemain ada di sebelahnya.
    { kind: "bed", x: -width / 2 + 2, z: depth / 2 - 1.5, w: 2, d: 1.1 },
    { kind: "plant", x: width / 2 - 1.1, z: depth / 2 - 1.1, w: 0.7, d: 0.7 },
    { kind: "plant", x: -width / 2 + 0.8, z: frontRowZ + 0.4, w: 0.7, d: 0.7 },
    // Kardus di pojok belakang-kanan (lobi kanan dipakai meja terminal).
    { kind: "crates", x: width / 2 - 1.2, z: -depth / 2 + 1.2, w: 1.1, d: 1.0 },
    // Unit pendingin menempel dinding kanan, di antara dua baris pertama.
    {
      kind: "cooler",
      x: width / 2 - 0.75,
      z: frontRowZ - ROW_SPACING_Z / 2,
      w: 0.9,
      d: 1.7,
    },
  ];

  const bounds: Rect = {
    minX: -width / 2 + WALL_MARGIN,
    maxX: width / 2 - WALL_MARGIN,
    minZ: -depth / 2 + WALL_MARGIN,
    maxZ: depth / 2 - WALL_MARGIN,
  };
  const obstacles: Rect[] = [
    ...slots.map((slot) =>
      rectFromCenter(slot.x, slot.z, RACK.width, RACK.depth),
    ),
    ...fixtures.flatMap((fixture) =>
      fixture.kind === "terminal"
        ? [rectFromCenter(fixture.x, fixture.z, DESK.width, DESK.depth)]
        : fixture.kind === "mailbox"
          ? [
              sealWallGaps(
                rectFromCenter(
                  fixture.x,
                  fixture.z,
                  MAILBOX.width,
                  MAILBOX.depth,
                ),
                bounds,
              ),
            ]
          : [],
    ),
    ...props.map((prop) =>
      sealWallGaps(rectFromCenter(prop.x, prop.z, prop.w, prop.d), bounds),
    ),
  ];

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
    fixtures,
    targets: [...slots, ...fixtures],
    props,
    spawn: { x: -width / 2 + 3.6, z: depth / 2 - 1.9 },
    grid,
    obstacles,
    bounds,
  };
}

/** Perpanjang kotak sampai dinding di sisi yang celahnya terlalu sempit. */
function sealWallGaps(rect: Rect, bounds: Rect): Rect {
  return {
    minX: rect.minX - bounds.minX < MIN_WALL_GAP ? bounds.minX : rect.minX,
    maxX: bounds.maxX - rect.maxX < MIN_WALL_GAP ? bounds.maxX : rect.maxX,
    minZ: rect.minZ - bounds.minZ < MIN_WALL_GAP ? bounds.minZ : rect.minZ,
    maxZ: bounds.maxZ - rect.maxZ < MIN_WALL_GAP ? bounds.maxZ : rect.maxZ,
  };
}

/** Tujuan berstasiun yang titik berdirinya paling dekat, dalam `maxDistance`. */
export function nearestStationSlot(
  layout: RoomLayout,
  x: number,
  z: number,
  maxDistance = 1.15,
): Target | null {
  let best: Target | null = null;
  let bestDist = maxDistance;
  for (const target of layout.targets) {
    if (target.station === null) continue;
    const dist = Math.hypot(target.approach.x - x, target.approach.z - z);
    if (dist <= bestDist) {
      bestDist = dist;
      best = target;
    }
  }
  return best;
}

/** Kode rak dua digit untuk papan nama: R01, R02, … */
export function rackCode(index: number): string {
  return `R${String(index + 1).padStart(2, "0")}`;
}

const FIXTURE_CODE: Record<FixtureKind, string> = {
  terminal: "API",
  wall: "LOG",
  mailbox: "MSG",
};

/** Kode pendek sebuah tujuan untuk daftar dan papan nama: R01, API, LOG, MSG. */
export function targetCode(target: Pick<Target, "index" | "kind">): string {
  return target.kind === "rack"
    ? rackCode(target.index)
    : FIXTURE_CODE[target.kind];
}
