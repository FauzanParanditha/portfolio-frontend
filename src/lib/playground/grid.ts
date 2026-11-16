/**
 * Grid navigasi lantai ruang server + pencarian jalur.
 *
 * Seluruh isi berkas ini fungsi murni (tanpa three.js, tanpa DOM) supaya bisa
 * diuji di Vitest dan dipakai ulang oleh scene maupun logika klik-untuk-jalan.
 *
 * Koordinat dunia: bidang XZ, titik (0,0) di tengah ruangan. Sel grid diindeks
 * (col,row) dari pojok (minX,minZ).
 */

export interface Point {
  x: number;
  z: number;
}

export interface Cell {
  col: number;
  row: number;
}

export interface Grid {
  cols: number;
  rows: number;
  /** Panjang sisi satu sel, dalam meter. */
  cell: number;
  minX: number;
  minZ: number;
  /** 1 = terhalang, 0 = bisa dilalui. Indeks = row * cols + col. */
  blocked: Uint8Array;
}

export function createGrid(width: number, depth: number, cell = 0.5): Grid {
  const cols = Math.max(1, Math.round(width / cell));
  const rows = Math.max(1, Math.round(depth / cell));
  return {
    cols,
    rows,
    cell,
    minX: -width / 2,
    minZ: -depth / 2,
    blocked: new Uint8Array(cols * rows),
  };
}

export function inBounds(grid: Grid, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < grid.cols && row < grid.rows;
}

export function isWalkable(grid: Grid, col: number, row: number): boolean {
  return inBounds(grid, col, row) && grid.blocked[row * grid.cols + col] === 0;
}

export function worldToCell(grid: Grid, x: number, z: number): Cell {
  return {
    col: Math.floor((x - grid.minX) / grid.cell),
    row: Math.floor((z - grid.minZ) / grid.cell),
  };
}

/** Titik tengah sel dalam koordinat dunia. */
export function cellToWorld(grid: Grid, col: number, row: number): Point {
  return {
    x: grid.minX + (col + 0.5) * grid.cell,
    z: grid.minZ + (row + 0.5) * grid.cell,
  };
}

export function isWalkableAt(grid: Grid, x: number, z: number): boolean {
  const c = worldToCell(grid, x, z);
  return isWalkable(grid, c.col, c.row);
}

/**
 * Tandai persegi panjang (pusat cx,cz; ukuran w×d) sebagai terhalang.
 * `pad` memperlebar halangan ke segala arah — dipakai untuk memberi ruang
 * selebar badan pemain sehingga ia tidak menembus sudut rak.
 */
export function blockRect(
  grid: Grid,
  cx: number,
  cz: number,
  w: number,
  d: number,
  pad = 0,
): void {
  const a = worldToCell(grid, cx - w / 2 - pad, cz - d / 2 - pad);
  // Kurangi epsilon supaya tepi yang tepat di garis sel tidak ikut menghalangi
  // sel tetangganya.
  const b = worldToCell(grid, cx + w / 2 + pad - 1e-6, cz + d / 2 + pad - 1e-6);
  for (let row = a.row; row <= b.row; row++) {
    for (let col = a.col; col <= b.col; col++) {
      if (inBounds(grid, col, row)) grid.blocked[row * grid.cols + col] = 1;
    }
  }
}

/** Halangi sel di tepi grid setebal `cells` (dinding ruangan). */
export function blockBorder(grid: Grid, cells = 1): void {
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (
        col < cells ||
        row < cells ||
        col >= grid.cols - cells ||
        row >= grid.rows - cells
      ) {
        grid.blocked[row * grid.cols + col] = 1;
      }
    }
  }
}

/**
 * Sel bisa-dilalui terdekat dari (col,row), dicari melingkar keluar.
 * Dipakai saat pengguna mengeklik lantai di bawah rak atau di luar ruangan.
 */
export function nearestWalkable(
  grid: Grid,
  col: number,
  row: number,
): Cell | null {
  const c0 = Math.min(grid.cols - 1, Math.max(0, col));
  const r0 = Math.min(grid.rows - 1, Math.max(0, row));
  if (isWalkable(grid, c0, r0)) return { col: c0, row: r0 };

  const maxRadius = Math.max(grid.cols, grid.rows);
  for (let radius = 1; radius <= maxRadius; radius++) {
    let best: Cell | null = null;
    let bestDist = Infinity;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        // Hanya keliling cincin; bagian dalamnya sudah diperiksa.
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        const col2 = c0 + dc;
        const row2 = r0 + dr;
        if (!isWalkable(grid, col2, row2)) continue;
        const dist = dc * dc + dr * dr;
        if (dist < bestDist) {
          bestDist = dist;
          best = { col: col2, row: row2 };
        }
      }
    }
    if (best) return best;
  }
  return null;
}

const SQRT2 = Math.SQRT2;
// Urutan: 4 arah lurus dulu, lalu 4 diagonal.
const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/** Heuristik oktil: jarak terpendek di grid 8-arah tanpa halangan. */
function octile(dc: number, dr: number): number {
  const a = Math.abs(dc);
  const b = Math.abs(dr);
  return a + b + (SQRT2 - 2) * Math.min(a, b);
}

/**
 * A* 8-arah. Diagonal hanya boleh bila kedua sel ortogonal di sampingnya
 * kosong, sehingga jalur tidak pernah memotong sudut rak.
 *
 * Mengembalikan daftar sel dari `start` sampai `goal` (keduanya ikut), atau
 * `null` bila tidak ada jalur. Grid ruangan kecil (≈ ribuan sel), jadi antrean
 * prioritas sederhana berbasis array sudah lebih dari cukup.
 */
export function findPath(grid: Grid, start: Cell, goal: Cell): Cell[] | null {
  if (
    !isWalkable(grid, start.col, start.row) ||
    !isWalkable(grid, goal.col, goal.row)
  ) {
    return null;
  }

  const { cols, rows } = grid;
  const size = cols * rows;
  const startIdx = start.row * cols + start.col;
  const goalIdx = goal.row * cols + goal.col;
  if (startIdx === goalIdx) return [start];

  const g = new Float32Array(size).fill(Infinity);
  const f = new Float32Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open: number[] = [startIdx];

  g[startIdx] = 0;
  f[startIdx] = octile(goal.col - start.col, goal.row - start.row);

  while (open.length > 0) {
    // Ambil simpul ber-f terkecil.
    let bestAt = 0;
    for (let i = 1; i < open.length; i++) {
      if (f[open[i]] < f[open[bestAt]]) bestAt = i;
    }
    const current = open[bestAt];
    open[bestAt] = open[open.length - 1];
    open.pop();

    if (current === goalIdx) {
      const path: Cell[] = [];
      for (let at = current; at !== -1; at = cameFrom[at]) {
        path.push({ col: at % cols, row: Math.floor(at / cols) });
      }
      return path.reverse();
    }
    if (closed[current]) continue;
    closed[current] = 1;

    const col = current % cols;
    const row = Math.floor(current / cols);

    for (const [dc, dr, cost] of NEIGHBORS) {
      const nc = col + dc;
      const nr = row + dr;
      if (!isWalkable(grid, nc, nr)) continue;
      if (
        dc !== 0 &&
        dr !== 0 &&
        (!isWalkable(grid, col + dc, row) || !isWalkable(grid, col, row + dr))
      ) {
        continue;
      }
      const next = nr * cols + nc;
      if (closed[next]) continue;
      const tentative = g[current] + cost;
      if (tentative < g[next]) {
        g[next] = tentative;
        f[next] = tentative + octile(goal.col - nc, goal.row - nr);
        cameFrom[next] = current;
        open.push(next);
      }
    }
  }
  return null;
}

/**
 * Apakah garis lurus a→b bebas halangan? Garis disampel rapat (seperempat
 * sel) dan diberi lebar `radius` ke kiri-kanan, agar badan pemain — bukan
 * hanya titik pusatnya — tidak menyerempet halangan.
 */
export function hasLineOfSight(
  grid: Grid,
  a: Point,
  b: Point,
  radius = 0,
): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  if (length === 0) return isWalkableAt(grid, a.x, a.z);

  const steps = Math.ceil(length / (grid.cell / 4));
  // Vektor normal satuan untuk sampel samping.
  const nx = -dz / length;
  const nz = dx / length;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + dx * t;
    const z = a.z + dz * t;
    if (!isWalkableAt(grid, x, z)) return false;
    if (radius > 0) {
      if (!isWalkableAt(grid, x + nx * radius, z + nz * radius)) return false;
      if (!isWalkableAt(grid, x - nx * radius, z - nz * radius)) return false;
    }
  }
  return true;
}

/**
 * Sederhanakan jalur sel menjadi titik belok seperlunya ("string pulling"):
 * dari tiap titik, lompat ke titik terjauh yang masih terlihat lurus.
 * Hasilnya gerak yang tampak alami, bukan zig-zag mengikuti kotak grid.
 */
export function smoothPath(grid: Grid, points: Point[], radius = 0): Point[] {
  if (points.length <= 2) return points.slice();

  const result: Point[] = [points[0]];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = points.length - 1;
    while (
      next > anchor + 1 &&
      !hasLineOfSight(grid, points[anchor], points[next], radius)
    ) {
      next--;
    }
    result.push(points[next]);
    anchor = next;
  }
  return result;
}

/**
 * Rute dunia dari `from` ke `to`, sudah dihaluskan. Titik awal yang berada di
 * sel terhalang (mis. akibat pembulatan) digeser ke sel kosong terdekat; begitu
 * pula tujuan. Mengembalikan `null` bila tidak ada jalur sama sekali.
 *
 * Titik pertama hasil selalu `from` apa adanya, supaya pemain tidak "melompat"
 * ke tengah sel saat mulai berjalan.
 */
export function findRoute(
  grid: Grid,
  from: Point,
  to: Point,
  radius = 0,
): Point[] | null {
  const startCell = worldToCell(grid, from.x, from.z);
  const goalCell = worldToCell(grid, to.x, to.z);
  const start = nearestWalkable(grid, startCell.col, startCell.row);
  const goal = nearestWalkable(grid, goalCell.col, goalCell.row);
  if (!start || !goal) return null;

  const cells = findPath(grid, start, goal);
  if (!cells) return null;

  const points = cells.map((c) => cellToWorld(grid, c.col, c.row));
  points[0] = { x: from.x, z: from.z };

  // Tujuan persis seperti yang diminta bila titiknya memang bisa dipijak;
  // kalau tidak, berhenti di tengah sel kosong terdekat.
  if (isWalkableAt(grid, to.x, to.z)) {
    points[points.length - 1] = { x: to.x, z: to.z };
  }

  return smoothPath(grid, points, radius);
}

/** Panjang total sebuah rute, dalam meter. */
export function routeLength(points: Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].z - points[i - 1].z,
    );
  }
  return total;
}
