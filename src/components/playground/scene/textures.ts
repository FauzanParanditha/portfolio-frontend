import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

/**
 * Tekstur prosedural, digambar dengan Canvas 2D saat runtime.
 *
 * Tidak ada berkas gambar, font, atau model yang diunduh untuk scene ini —
 * semuanya dibuat di browser. Artinya nol request tambahan dan tidak ada
 * ketergantungan CDN. Pemanggil bertanggung jawab memanggil `.dispose()`.
 */

/** Palet ruangan: zinc gelap + satu aksen cyan, selaras dengan situs. */
export const PALETTE = {
  background: "#09090b",
  floor: "#26262b",
  wall: "#1e1e24",
  rack: "#2c2c33",
  rackVacant: "#1f1f25",
  accent: "#22d3ee",
  accentSoft: "#67e8f9",
  warm: "#ffb86b",
  amber: "#f59e0b",
  green: "#34d399",
  text: "#fafafa",
  textDim: "#a1a1aa",
} as const;

const UI_FONT =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function createCanvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D tidak tersedia");
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Pseudo-acak deterministik (hasil sama tiap render, tanpa Math.random). */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Satu ubin lantai-angkat 1×1 m; diulang sebanyak ukuran ruangan. */
export function createFloorTexture(
  repeatX: number,
  repeatZ: number,
): CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);

  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 0, size, size);

  // Bintik halus supaya permukaan tidak tampak datar seperti plastik.
  for (let i = 0; i < 900; i++) {
    const shade = hash01(i) > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.012 + hash01(i + 7) * 0.02})`;
    ctx.fillRect(hash01(i * 3.1) * size, hash01(i * 5.7) * size, 2, 2);
  }

  // Nat antar-ubin: garis gelap + tepi terang tipis (kesan bevel).
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  ctx.strokeRect(3.5, 3.5, size - 7, size - 7);

  // Baut di empat sudut.
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (const [x, y] of [
    [14, 14],
    [size - 14, 14],
    [14, size - 14],
    [size - 14, size - 14],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = toTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatZ);
  return texture;
}

/**
 * Muka depan rak: tumpukan unit server.
 * `active = false` → panel kosong (blanking plate) untuk rak yang belum terisi.
 */
export function createRackFrontTexture(active: boolean): CanvasTexture {
  const width = 256;
  const height = 512;
  const [canvas, ctx] = createCanvas(width, height);

  ctx.fillStyle = "#101013";
  ctx.fillRect(0, 0, width, height);

  const units = 13;
  const pad = 14;
  const gap = 5;
  const unitHeight = (height - pad * 2 - gap * (units - 1)) / units;

  for (let i = 0; i < units; i++) {
    const y = pad + i * (unitHeight + gap);
    const filled = active && hash01(i * 9.3) > 0.16;

    ctx.fillStyle = filled ? "#2b2b32" : "#1c1c21";
    roundRect(ctx, pad, y, width - pad * 2, unitHeight, 4);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (!filled) continue;

    // Kisi ventilasi di sisi kiri.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const slots = 9;
    for (let s = 0; s < slots; s++) {
      ctx.fillRect(pad + 12 + s * 9, y + 7, 4, unitHeight - 14);
    }

    // Slot drive di tengah.
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    const drives = 3 + Math.floor(hash01(i * 2.7) * 3);
    for (let d = 0; d < drives; d++) {
      roundRect(ctx, pad + 104 + d * 20, y + 8, 15, unitHeight - 16, 2);
      ctx.fill();
    }
    // Sisi kanan dibiarkan polos — LED sungguhan (mesh) dipasang di sana.
  }

  return toTexture(canvas);
}

/** Jauh lebih panjang dari yang muat di papan nama (± 20 karakter). */
export const MAX_NAMEPLATE_CHARS = 80;

/** Papan nama di atas rak: kode rak + judul proyek. */
export function createNameplateTexture(
  code: string,
  title: string,
  variant: "project" | "archive",
): CanvasTexture {
  const width = 512;
  const height = 128;
  const [canvas, ctx] = createCanvas(width, height);

  ctx.fillStyle = "rgba(9,9,11,0.94)";
  roundRect(ctx, 3, 3, width - 6, height - 6, 16);
  ctx.fill();
  ctx.strokeStyle = variant === "archive" ? PALETTE.amber : PALETTE.accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Kode rak di kiri.
  ctx.fillStyle = variant === "archive" ? PALETTE.amber : PALETTE.accent;
  ctx.font = `600 34px ${MONO_FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText(code, 26, height / 2 + 2);
  const codeWidth = ctx.measureText(code).width;

  // Garis pemisah.
  const dividerX = 26 + codeWidth + 18;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(dividerX, 30, 2, height - 60);

  // Judul, dipotong dengan elipsis bila tidak muat.
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 40px ${UI_FONT}`;
  const maxWidth = width - dividerX - 44;
  const text = clipText(ctx, title, maxWidth);
  ctx.fillText(text, dividerX + 20, height / 2 + 2);

  return toTexture(canvas);
}

/** Tulisan besar di dinding belakang. */
export function createWallSignTexture(): CanvasTexture {
  const width = 1024;
  const height = 256;
  const [canvas, ctx] = createCanvas(width, height);

  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 120px ${UI_FONT}`;
  ctx.fillText("PARANDITHA", 8, 140);

  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(12, 168, 96, 6);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `500 40px ${MONO_FONT}`;
  ctx.fillText("SERVER ROOM  ·  PROJECT RACKS", 128, 186);

  return toTexture(canvas);
}

/** Pendar bulat lembut (aditif) untuk "cahaya" di lantai depan rak. */
export function createGlowTexture(): CanvasTexture {
  const size = 128;
  const [canvas, ctx] = createCanvas(size, size);
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/** Kisi kipas untuk unit pendingin. */
export function createFanTexture(): CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size, size);
  ctx.fillStyle = "#1f1f23";
  ctx.fillRect(0, 0, size, size);

  const c = size / 2;
  ctx.fillStyle = "#08080a";
  ctx.beginPath();
  ctx.arc(c, c, 104, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  for (let r = 24; r <= 104; r += 20) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(angle) * 104, c + Math.sin(angle) * 104);
    ctx.stroke();
  }
  ctx.fillStyle = "#2a2a30";
  ctx.beginPath();
  ctx.arc(c, c, 20, 0, Math.PI * 2);
  ctx.fill();

  return toTexture(canvas);
}

/**
 * Potong teks dengan elipsis supaya muat di `maxWidth` (font sudah di-set).
 *
 * - `String(...)`: data API yang cacat (bukan string) tidak boleh menjatuhkan
 *   seluruh scene.
 * - Dipotong ke `MAX_NAMEPLATE_CHARS` sebelum diukur: loop di bawah memanggil
 *   `measureText` sekali per karakter yang dibuang, jadi teks raksasa tidak
 *   boleh sampai ke sana apa adanya.
 */
function clipText(
  ctx: CanvasRenderingContext2D,
  value: unknown,
  maxWidth: number,
): string {
  const raw = String(value ?? "");
  let text =
    raw.length > MAX_NAMEPLATE_CHARS ? raw.slice(0, MAX_NAMEPLATE_CHARS) : raw;
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text.trimEnd()}…`;
}

/** Satu papan di dinding pengalaman: periode, jabatan, perusahaan. */
export function createBoardTexture(
  period: string,
  title: string,
  company: string,
): CanvasTexture {
  const width = 512;
  const height = 430;
  const [canvas, ctx] = createCanvas(width, height);

  ctx.fillStyle = "#1c1c21";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);

  ctx.fillStyle = PALETTE.accent;
  ctx.fillRect(40, 46, 110, 10);
  ctx.textBaseline = "alphabetic";
  ctx.font = `500 34px ${MONO_FONT}`;
  ctx.fillText(clipText(ctx, period, width - 80), 40, 122);

  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 52px ${UI_FONT}`;
  ctx.fillText(clipText(ctx, title, width - 80), 40, 206);

  ctx.fillStyle = PALETTE.textDim;
  ctx.font = `400 38px ${UI_FONT}`;
  ctx.fillText(clipText(ctx, company, width - 80), 40, 266);

  // Garis-garis samar: isyarat "ada rinciannya" tanpa teks yang tak terbaca.
  ctx.fillStyle = "#3f3f46";
  ctx.fillRect(40, 316, 380, 10);
  ctx.fillRect(40, 346, 300, 10);
  ctx.fillRect(40, 376, 340, 10);

  return toTexture(canvas);
}

export interface ScreenLine {
  text: string;
  color: string;
}

/**
 * Layar monitor terminal. Teksturnya digambar ulang saat status berubah —
 * tanpa membuat tekstur baru tiap kali.
 */
export function createScreenTexture(): {
  texture: CanvasTexture;
  draw: (lines: ScreenLine[]) => void;
} {
  const width = 512;
  const height = 304;
  const [canvas, ctx] = createCanvas(width, height);
  const texture = toTexture(canvas);

  const draw = (lines: ScreenLine[]) => {
    ctx.fillStyle = "#06181d";
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = "alphabetic";
    ctx.font = `500 30px ${MONO_FONT}`;
    lines.slice(0, 6).forEach((line, index) => {
      ctx.fillStyle = line.color;
      ctx.fillText(clipText(ctx, line.text, width - 48), 24, 56 + index * 44);
    });
    texture.needsUpdate = true;
  };
  draw([]);

  return { texture, draw };
}
