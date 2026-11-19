"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import publicClient from "@/lib/axios/public";
import { formatErrorDetails } from "@/lib/handleAxiosError";
import { getRetryAfterSeconds } from "@/lib/retryAfter";
import { cn } from "@/lib/utils";
import axios from "axios";
import { MoveRight } from "lucide-react";
import { useState } from "react";

/**
 * Batas panjang per field — HARUS sama dengan `ContactCreateRequest` di backend
 * (name 100, email 200, subject 200, message 5000; lebih dari itu 422).
 *
 * `maxLength` di browser menghitung unit UTF-16, sedangkan backend menghitung
 * karakter (rune). Emoji dihitung 2 di browser, jadi batas di sisi klien
 * paling-paling sedikit lebih ketat — tidak pernah lebih longgar dari backend.
 */
export const CONTACT_MAX_LENGTH = {
  name: 100,
  email: 200,
  subject: 200,
  message: 5000,
} as const;

// Penghitung karakter berubah warna mulai 90% dari batas, sebagai peringatan dini.
const MESSAGE_WARN_AT = Math.floor(CONTACT_MAX_LENGTH.message * 0.9);

// Kunci `error.details` backend adalah nama field struct Go (`Name`, `Email`,
// ...). Dicocokkan tanpa peduli huruf besar/kecil. Pakai `Map`, bukan objek
// biasa, supaya kunci seperti `constructor`/`__proto__` tidak membaca prototype.
const CONTACT_FIELD_LABELS = new Map<string, string>([
  ["name", "Name"],
  ["email", "Email"],
  ["subject", "Subject"],
  ["message", "Message"],
]);

export const contactFieldLabel = (key: string): string =>
  CONTACT_FIELD_LABELS.get(key.toLowerCase()) ?? key;

interface ContactFormProps {
  /**
   * - `section`: tampilan di beranda (berbingkai, dengan judul "Send a Dispatch").
   * - `panel`: di dalam panel sempit (tanpa bingkai & judul, satu kolom) —
   *   induknya sudah menyediakan judul.
   */
  variant?: "section" | "panel";
  /** Awalan `id` field, supaya dua form tidak bentrok bila sehalaman. */
  idPrefix?: string;
}

const fieldClass =
  "border-b-border h-12 rounded-none border-x-0 border-t-0 bg-transparent px-0 focus-visible:border-b-2 focus-visible:border-b-white";

/**
 * Form kontak. Dipakai di beranda (ContactSection) dan di panel kotak surat
 * /playground; logika kirim, batas panjang, dan penanganan 422/429-nya satu.
 */
export function ContactForm({
  variant = "section",
  idPrefix = "contact",
}: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageLength, setMessageLength] = useState(0);
  const panel = variant === "panel";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: (formData.get("name") || "").toString().trim(),
      email: (formData.get("email") || "").toString().trim(),
      subject: (formData.get("subject") || "").toString().trim(),
      message: (formData.get("message") || "").toString().trim(),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.subject ||
      !payload.message
    ) {
      toast({
        title: "Required fields missing",
        description: "Please fill all required fields.",
        variant: "warning",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await publicClient.post("/contact-messages", payload);

      toast({
        title: "Message Transmitted.",
        description:
          "Thank you for reaching out. I'll get back to you shortly.",
        variant: "success",
      });

      form.reset();
      // form.reset() tidak memicu onChange, jadi penghitung direset manual.
      setMessageLength(0);
    } catch (error) {
      // Backend membatasi form kontak 5 pesan/menit per IP. Beri tahu
      // pengunjung kapan bisa mencoba lagi, bukan pesan "gagal" generik.
      // Interceptor publicClient sengaja tidak memunculkan toast untuk 429,
      // jadi ini satu-satunya pesan yang tampil.
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const seconds = getRetryAfterSeconds(error);
        toast({
          title: "Too many messages.",
          description: seconds
            ? `Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`
            : "Please try again in a minute.",
          variant: "warning",
        });
        return;
      }

      // 422: validasi backend gagal (mis. melebihi batas panjang, format email).
      // Tampilkan detail per field supaya pengunjung tahu apa yang harus
      // diperbaiki, bukan pesan generik yang membuatnya mengirim ulang sampai
      // kena rate limit. Interceptor publicClient tidak memunculkan toast untuk
      // 422, jadi ini satu-satunya pesan yang tampil.
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const body = error.response.data as
          { error?: { message?: string; details?: unknown } } | undefined;
        const details = body?.error?.details;
        const hasDetails =
          !!details &&
          typeof details === "object" &&
          Object.keys(details).length > 0;

        toast({
          title: "Please check your input.",
          description: hasDetails
            ? formatErrorDetails(
                details as Record<string, unknown>,
                contactFieldLabel,
              )
            : body?.error?.message || "Some fields are invalid.",
          variant: "warning",
        });
        return;
      }

      toast({
        title: "Transmission Failed.",
        description: "An error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const countId = `${idPrefix}-message-count`;

  return (
    <form
      onSubmit={handleSubmit}
      className={
        panel
          ? "flex w-full flex-col gap-6"
          : "border-thin flex w-full max-w-2xl flex-col gap-8 border p-8 md:p-12"
      }
    >
      {!panel && (
        <h3 className="border-thin mb-2 border-b pb-4 text-2xl font-bold tracking-widest uppercase">
          Send a Dispatch
        </h3>
      )}

      <div
        className={
          panel
            ? "grid grid-cols-1 gap-6"
            : "grid grid-cols-1 gap-8 md:grid-cols-2"
        }
      >
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-name`} className="eyebrow">
            Name
          </label>
          <Input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            required
            maxLength={CONTACT_MAX_LENGTH.name}
            className={fieldClass}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-email`} className="eyebrow">
            Email
          </label>
          <Input
            id={`${idPrefix}-email`}
            name="email"
            type="email"
            required
            maxLength={CONTACT_MAX_LENGTH.email}
            className={fieldClass}
            placeholder="john@example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-subject`} className="eyebrow">
          Subject
        </label>
        <Input
          id={`${idPrefix}-subject`}
          name="subject"
          type="text"
          required
          maxLength={CONTACT_MAX_LENGTH.subject}
          className={fieldClass}
          placeholder="Project Inquiry"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-message`} className="eyebrow">
          Message
        </label>
        <Textarea
          id={`${idPrefix}-message`}
          name="message"
          required
          rows={4}
          maxLength={CONTACT_MAX_LENGTH.message}
          aria-describedby={countId}
          onChange={(e) => setMessageLength(e.target.value.length)}
          className="border-b-border resize-none rounded-none border-x-0 border-t-0 bg-transparent px-0 pt-4 focus-visible:border-b-2 focus-visible:border-b-white"
          placeholder="Tell me about your idea..."
        />
        {/* Penghitung selalu tampil, kecil dan senada dengan label
            eyebrow; berubah amber mulai 90% dari batas. Tidak memakai aria-live agar pembaca
            layar tidak mengumumkan setiap ketikan — nilainya dibaca
            lewat aria-describedby saat textarea difokus. */}
        <p
          id={countId}
          className={cn(
            "text-right font-mono text-[11px] tracking-[0.2em] tabular-nums transition-colors",
            messageLength >= MESSAGE_WARN_AT
              ? "text-amber-400"
              : "text-zinc-400",
          )}
        >
          {messageLength} / {CONTACT_MAX_LENGTH.message}{" "}
          <span className="sr-only">characters</span>
        </p>
      </div>

      <div className={panel ? "" : "mt-4"}>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="bg-foreground text-background hover:text-foreground border-thin w-full border px-12 transition-colors duration-300 hover:bg-transparent md:w-auto"
        >
          {isSubmitting ? (
            <span className="animate-pulse">TRANSMITTING...</span>
          ) : (
            <>
              Submit <MoveRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
