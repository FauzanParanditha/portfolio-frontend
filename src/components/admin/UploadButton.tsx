"use client";

import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import adminClient from "@/lib/axios/admin";
import { handleAxiosError } from "@/lib/handleAxiosError";
import { Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

/** Bentuk balasan POST /admin/uploads. */
interface UploadResponse {
  data: {
    url: string;
    filename: string;
    contentType: string;
    size: number;
  };
}

interface UploadButtonProps {
  /** Dipanggil dengan URL publik berkas setelah unggahan berhasil. */
  onUploaded: (url: string) => void;
  /** Filter di dialog pemilih berkas. Backend tetap memvalidasi ulang isinya. */
  accept?: string;
  label?: string;
  className?: string;
}

/**
 * Tombol unggah berkas ke `POST /admin/uploads`.
 *
 * Sengaja dibuat sebagai PENDAMPING kolom URL, bukan penggantinya: menempel URL
 * dari layanan lain tetap bisa dilakukan. Yang hilang hanyalah keharusan
 * meng-hosting gambar di tempat lain sebelum menambah proyek.
 *
 * `accept` hanya menyaring dialog pemilih berkas di browser — filter itu mudah
 * dilewati, jadi backend tetap menentukan jenis berkas dari ISI-nya sendiri.
 */
export function UploadButton({
  onUploaded,
  accept = "image/*",
  label = "Unggah",
  className,
}: UploadButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);

      // Content-Type sengaja TIDAK di-set manual: axios harus menyusun sendiri
      // boundary multipart-nya.
      const res = await adminClient.post<UploadResponse>(
        "/admin/uploads",
        body,
      );

      const url = res.data?.data?.url;
      if (!url) {
        toast({
          title: "Unggahan gagal",
          description: "Server tidak mengembalikan URL berkas.",
          variant: "destructive",
        });
        return;
      }

      onUploaded(url);
      toast({ title: "Berkas terunggah", description: file.name });
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setBusy(false);
      // Reset supaya memilih berkas yang SAMA lagi tetap memicu onChange.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        {busy ? "Mengunggah..." : label}
      </Button>
    </>
  );
}
