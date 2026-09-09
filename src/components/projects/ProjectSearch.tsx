"use client";

import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Kotak pencarian proyek. Satu-satunya bagian `/projects` yang butuh klien.
 *
 * Kata kuncinya disimpan di URL (`?q=...`), bukan di state React. Konsekuensinya
 * hasil pencarian bisa di-bookmark dan dibagikan, tombol Back berfungsi, dan
 * pengambilan datanya tetap di server.
 *
 * Nilai ketikan ditahan di state lokal lalu di-debounce 350 ms sebelum menulis
 * ke URL — tanpa itu setiap ketikan memicu navigasi dan permintaan server.
 *
 * `router.replace`, bukan `push`: mengetik tidak seharusnya menumpuk satu entri
 * riwayat per karakter.
 */
export function ProjectSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    // Sudah sinkron dengan URL — tidak perlu navigasi.
    if (value === initialQuery) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        next.set("q", value.trim());
      } else {
        next.delete("q");
      }
      // Kata kunci berubah → kembali ke halaman 1, kalau tidak pengguna bisa
      // mendarat di halaman kosong di luar jangkauan hasil baru.
      next.delete("page");

      const qs = next.toString();
      router.replace(qs ? `/projects?${qs}` : "/projects", { scroll: false });
    }, 350);

    return () => clearTimeout(timer);
  }, [value, initialQuery, router, searchParams]);

  return (
    <div className="relative mt-16 max-w-xl">
      <Search
        className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <label htmlFor="cari-proyek" className="sr-only">
        Cari proyek
      </label>
      <Input
        id="cari-proyek"
        type="search"
        placeholder="Search works..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="border-border focus-visible:border-primary rounded-none border-0 border-b bg-transparent px-0 py-6 pl-10 text-lg shadow-none focus-visible:ring-0"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Kosongkan pencarian"
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0 flex h-11 w-11 -translate-y-1/2 items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
