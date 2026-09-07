import fallbackImage from "@/assets/project-taskmanager.jpg";
import { canOptimizeImage } from "@/lib/imageHosts";
import Image from "next/image";

interface ProjectImageProps {
  /** URL cover dari database. Boleh kosong — akan jatuh ke gambar cadangan. */
  src?: string | null;
  alt: string;
  /** Kelas untuk elemen <img> hasil render. */
  className?: string;
  /**
   * Lebar tampil per breakpoint. WAJIB diisi benar: inilah yang menentukan
   * ukuran berkas mana yang diunduh browser, dan sumber penghematan sebenarnya
   * dari next/image. Salah isi = tetap mengunduh gambar kebesaran.
   */
  sizes: string;
  priority?: boolean;
}

/**
 * Gambar cover proyek dengan optimasi yang aman.
 *
 * Sebelumnya halaman publik memakai tag <img> mentah — tanpa penyesuaian
 * ukuran, tanpa WebP, dan tanpa penundaan muat. Sementara halaman detail
 * memakai next/image tapi dengan `unoptimized` di semua tempat, yang efeknya
 * sama saja: optimasinya mati.
 *
 * Komponen ini memutuskan PER GAMBAR: host yang terdaftar dioptimasi, host lain
 * dilewatkan apa adanya. URL diisi manual lewat panel admin sehingga bisa
 * menunjuk ke mana saja — dan next/image MELEMPAR saat render kalau host-nya
 * tidak terdaftar, jadi keputusan ini yang menjaga halaman tetap hidup.
 *
 * Memakai `fill`, jadi elemen pembungkusnya harus `position: relative`.
 */
export function ProjectImage({
  src,
  alt,
  className,
  sizes,
  priority,
}: ProjectImageProps) {
  const url = src?.trim();

  // Impor statis: dioptimasi Next tanpa perlu remotePattern apa pun.
  if (!url) {
    return (
      <Image
        src={fallbackImage}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        priority={priority}
        placeholder="blur"
      />
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      unoptimized={!canOptimizeImage(url)}
    />
  );
}
