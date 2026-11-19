import { findRoute, type Point, routeLength } from "@/lib/playground/grid";
import {
  PLAYER_RADIUS,
  type RoomLayout,
  type Target,
} from "@/lib/playground/layout";

/**
 * Tur dengan scroll: dari "sejauh mana halaman digulir" menjadi posisi kamera
 * dan posisi robot di ruang server.
 *
 * Fungsi murni (tanpa three.js, tanpa DOM): scene hanya membaca hasilnya, dan
 * semua sifat yang penting — robot tidak menembus halangan, kamera tidak masuk
 * ke dalam rak — diuji langsung di Vitest.
 *
 * Satu perhentian = satu bagian portfolio. `progress` adalah bilangan pecahan:
 * 0 = perhentian pertama, 1 = kedua, 1,5 = di tengah jalan antara kedua dan
 * ketiga.
 */

export type TourStopId =
  "top" | "about" | "projects" | "experience" | "status" | "contact";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TourStop {
  id: TourStopId;
  /** Posisi kamera dan titik yang dilihatnya. */
  camera: Vec3;
  look: Vec3;
  /** Tempat robot berdiri, dan arah hadapnya saat diam di sana. */
  dog: Point;
  face: number;
}

export interface Tour {
  stops: TourStop[];
  /**
   * `routes[i]` = jalur robot dari perhentian `i` ke `i + 1`, dicari di grid
   * navigasi ruangan supaya memutari rak dan perabot.
   */
  routes: Point[][];
}

export interface TourState {
  camera: Vec3;
  look: Vec3;
  dog: Point;
  /** Arah hadap robot saat diam: milik perhentian terdekat. */
  face: number;
}

/** Jalur dihaluskan dengan lebar ini ke kiri-kanan (sama dengan playground). */
const ROUTE_RADIUS = 0.14;

function fixture(layout: RoomLayout, kind: Target["kind"]): Target | null {
  return layout.fixtures.find((f) => f.kind === kind) ?? null;
}

/**
 * Susun perhentian untuk sebuah tata letak. Semua koordinat diturunkan dari
 * `layout` — lobi berada di sisi +Z ruangan, jadi posisi diukur dari dinding
 * depan (`front`) supaya tetap benar saat baris rak bertambah ke arah -Z.
 *
 * Perhentian "experience" hanya ada bila dinding pengalamannya terpasang.
 */
export function buildTour(layout: RoomLayout): Tour {
  const front = layout.depth / 2;
  const side = layout.width / 2;
  // Rak pertama (R01): proyek pertama selalu di sana, berapa pun jumlahnya.
  const rack = layout.slots[0];
  const wall = fixture(layout, "wall");
  const terminal = fixture(layout, "terminal");
  const mailbox = fixture(layout, "mailbox");

  const stops: TourStop[] = [
    {
      // Pandangan pembuka: seluruh ruangan dari pojok depan-kanan, di luar
      // dinding (dinding hanya tergambar dari dalam).
      id: "top",
      camera: { x: side + 2.5, y: 8.8, z: front + 6.5 },
      look: { x: 0.8, y: 0.6, z: front - 7.2 },
      dog: { x: -0.6, z: front - 3.4 },
      face: 0.7,
    },
    {
      // Dari atas: deretan rak sebagai "tumpukan" keahlian.
      id: "about",
      camera: { x: 1.6, y: 13.5, z: front + 2.2 },
      look: { x: 0.4, y: 0, z: front - 6.6 },
      dog: { x: -2.2, z: front - 4.5 },
      face: Math.PI,
    },
    {
      // Setinggi mata di lobi, menghadap baris rak depan. Titik pandang di
      // kanan R01 supaya rak itu jatuh di samping kartu teks, bukan di baliknya.
      id: "projects",
      camera: { x: rack.x + 4, y: 2.8, z: front - 0.6 },
      look: { x: rack.x + 1, y: 1.25, z: rack.z },
      dog: rack.approach,
      face: rack.face,
    },
  ];

  if (wall) {
    stops.push({
      id: "experience",
      camera: { x: 3.4, y: 2.5, z: wall.z + 1.8 },
      look: { x: -side, y: 1.85, z: wall.z - 0.2 },
      dog: wall.approach,
      face: wall.face,
    });
  }
  if (terminal) {
    stops.push({
      // Dari luar dinding depan, sedikit di kiri meja: layar monitor terbaca.
      id: "status",
      camera: { x: terminal.x - 2.6, y: 2.9, z: front + 1.8 },
      look: { x: terminal.x - 0.2, y: 1.15, z: terminal.z },
      dog: terminal.approach,
      face: terminal.face,
    });
  }
  if (mailbox) {
    stops.push({
      // Dari depan-kanan: robot (di belakang kotak surat, menghadap kamera)
      // terlihat di sampingnya, tidak tertutup.
      id: "contact",
      camera: { x: mailbox.x + 2.8, y: 2.5, z: front + 1.6 },
      look: { x: mailbox.x - 0.2, y: 0.95, z: mailbox.z - 0.7 },
      dog: mailbox.approach,
      face: mailbox.face,
    });
  }

  const routes: Point[][] = [];
  for (let i = 0; i < stops.length - 1; i++) {
    const from = stops[i].dog;
    const to = stops[i + 1].dog;
    // Tidak ada jalur seharusnya mustahil (semua titik di lobi); kalau terjadi,
    // garis lurus lebih baik daripada robot yang menghilang.
    routes.push(
      findRoute(layout.grid, from, to, ROUTE_RADIUS) ?? [
        { x: from.x, z: from.z },
        { x: to.x, z: to.z },
      ],
    );
  }
  return { stops, routes };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Peredam masuk-keluar. Kamera berlama-lama di tiap perhentian (kartu teksnya
 * sedang dibaca) dan bergerak cepat di antaranya.
 */
export function ease(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * c * (c * (c * 6 - 15) + 10);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), z: mix(a.z, b.z, t) };
}

/** Titik pada polyline `route` setelah menempuh bagian `t` (0..1) panjangnya. */
export function pointAlong(route: Point[], t: number): Point {
  if (route.length === 0) return { x: 0, z: 0 };
  if (route.length === 1) return { ...route[0] };
  const total = routeLength(route);
  if (total === 0) return { ...route[0] };

  let remaining = clamp(t, 0, 1) * total;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= length || i === route.length - 1) {
      const f = length === 0 ? 0 : clamp(remaining / length, 0, 1);
      return { x: mix(a.x, b.x, f), z: mix(a.z, b.z, f) };
    }
    remaining -= length;
  }
  return { ...route[route.length - 1] };
}

/**
 * Keadaan tur pada `progress`. Nilai di luar rentang dijepit; `NaN` dianggap 0
 * (halaman yang belum sempat diukur tidak boleh membuat kamera lenyap).
 */
export function tourState(tour: Tour, progress: number): TourState {
  const { stops, routes } = tour;
  const last = stops.length - 1;
  const p = Number.isFinite(progress) ? clamp(progress, 0, last) : 0;
  if (last <= 0) {
    const only = stops[0];
    return {
      camera: { ...only.camera },
      look: { ...only.look },
      dog: { ...only.dog },
      face: only.face,
    };
  }

  const index = Math.min(Math.floor(p), last - 1);
  const t = ease(p - index);
  const from = stops[index];
  const to = stops[index + 1];
  return {
    camera: mixVec(from.camera, to.camera, t),
    look: mixVec(from.look, to.look, t),
    dog: pointAlong(routes[index], t),
    face: t < 0.5 ? from.face : to.face,
  };
}

/**
 * Dari posisi gulir ke `progress`.
 *
 * @param centers  titik tengah tiap bagian (koordinat dokumen, urut menaik).
 * @param y        titik tengah layar saat ini (`scrollY + tinggi / 2`).
 *
 * Tepat di tengah bagian ke-k hasilnya k; di antaranya linear. Di atas bagian
 * pertama atau di bawah yang terakhir hasilnya dijepit.
 */
export function progressAt(centers: readonly number[], y: number): number {
  const last = centers.length - 1;
  if (last < 0 || !Number.isFinite(y)) return 0;
  // Halaman belum punya tata letak (semua bagian di titik yang sama): anggap
  // masih di awal, jangan melompat ke perhentian terakhir.
  if (y <= centers[0] || centers[last] <= centers[0]) return 0;
  for (let i = 0; i < last; i++) {
    const a = centers[i];
    const b = centers[i + 1];
    if (y <= b) {
      // Dua bagian bertumpuk di titik yang sama (tinggi nol): lompat saja.
      return b > a ? i + (y - a) / (b - a) : i + 1;
    }
  }
  return last;
}

/** Radius badan robot; diekspor ulang untuk test dan scene tur. */
export const TOUR_DOG_RADIUS = PLAYER_RADIUS;
