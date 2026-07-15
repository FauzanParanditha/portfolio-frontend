"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminContactMessages } from "@/hooks/use-admin-contact-messages";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ContactMessage, ContactReadFilter } from "@/types/contact";
import { motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

const PAGE_SIZE = 10;

// Format tanggal ringkas & ramah dibaca (locale Indonesia).
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Peta filter status -> parameter isRead untuk backend.
function filterToIsRead(filter: ContactReadFilter): boolean | undefined {
  if (filter === "unread") return false;
  if (filter === "read") return true;
  return undefined;
}

const STATUS_TABS: { key: ContactReadFilter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "unread", label: "Belum dibaca" },
  { key: "read", label: "Sudah dibaca" },
];

const AdminContactMessages = () => {
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ContactReadFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");

  // Debounce input pencarian agar tidak menembak API tiap ketikan.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { messages, meta, isLoading, error, markRead, deleteOne } =
    useAdminContactMessages({
      page,
      limit: PAGE_SIZE,
      q: q || undefined,
      isRead: filterToIsRead(filter),
    });

  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContactMessage | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? 0;

  // Clamp halaman ke totalPages agar tidak terjebak di halaman kosong
  // (mis. setelah menghapus pesan terakhir di halaman > 1). Guard `page > tp`
  // mencegah loop set-state.
  useEffect(() => {
    const tp = meta?.totalPages ?? 1;
    if (page > tp) setPage(Math.max(1, tp));
  }, [meta?.totalPages, page]);

  // Empty-state kontekstual: bedakan hasil filter/pencarian kosong vs benar-benar kosong.
  const isFiltered = q !== "" || filter !== "all";

  const changeFilter = (next: ContactReadFilter) => {
    setFilter(next);
    setPage(1);
  };

  // Tandai satu pesan sebagai dibaca. Error sudah ditangani interceptor
  // adminClient (menampilkan toast), jadi di sini cukup toast sukses.
  const handleMarkRead = async (msg: ContactMessage) => {
    if (msg.isRead) return;
    setBusyId(msg.id);
    try {
      await markRead(msg.id, true);
      toast({
        title: "Ditandai dibaca",
        description: `Pesan dari ${msg.name} ditandai sudah dibaca.`,
        variant: "success",
      });
    } catch {
      // toast error sudah dimunculkan interceptor adminClient
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const msg = pendingDelete;
    setBusyId(msg.id);
    try {
      await deleteOne(msg.id);
      toast({
        title: "Pesan dihapus",
        description: `Pesan dari ${msg.name} telah dihapus.`,
        variant: "success",
      });
      setPendingDelete(null);
      if (selected?.id === msg.id) setSelected(null);
    } catch {
      // toast error sudah dimunculkan interceptor adminClient
    } finally {
      setBusyId(null);
    }
  };

  // Buka detail pesan; jika belum dibaca, tandai dibaca otomatis.
  // Guard `busyId` mencegah PATCH /read ganda saat klik cepat.
  const openDetail = (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.isRead && busyId !== msg.id) {
      setBusyId(msg.id);
      void markRead(msg.id, true)
        .catch(() => {
          // diabaikan: interceptor sudah menoast error
        })
        .finally(() => setBusyId(null));
    }
  };

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-zinc-900">Pesan</h1>
            <p className="text-muted-foreground">
              Kotak masuk dari formulir kontak
              {total > 0 ? ` • ${total} pesan` : ""}
            </p>
          </div>
        </div>

        {/* Kontrol: pencarian + filter status */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="w-full max-w-sm space-y-2">
            <Label htmlFor="contact-search" className="text-zinc-700">
              Cari pesan
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="contact-search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Nama, email, atau subjek…"
                className="bg-white pl-9"
              />
            </div>
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-border bg-white p-1"
            role="group"
            aria-label="Filter status pesan"
          >
            {STATUS_TABS.map((tab) => {
              const active = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeFilter(tab.key)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-zinc-600 hover:bg-muted hover:text-zinc-900",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* State: error */}
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive"
          >
            Gagal memuat pesan. Coba muat ulang halaman.
          </div>
        ) : isLoading ? (
          // State: loading (skeleton, bukan spinner generik)
          <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
                <div className="mb-2 h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          // State: empty
          <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center">
            <Mail
              className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="text-muted-foreground">
              {isFiltered ? "Tidak ada pesan yang cocok" : "Belum ada pesan"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg, index) => (
              <motion.li
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-sm transition-colors",
                  msg.isRead
                    ? "border-border"
                    : "border-primary/40 bg-primary/[0.03]",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openDetail(msg)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {!msg.isRead && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className={cn(
                          "truncate text-zinc-900",
                          msg.isRead ? "font-medium" : "font-semibold",
                        )}
                      >
                        {msg.name}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">
                        {msg.email}
                      </span>
                      <span
                        className={cn(
                          "ml-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          msg.isRead
                            ? "bg-muted text-zinc-600"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        {msg.isRead ? "Dibaca" : "Belum dibaca"}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mb-1 truncate",
                        msg.isRead
                          ? "text-zinc-700"
                          : "font-medium text-zinc-900",
                      )}
                    >
                      {msg.subject}
                    </p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {msg.message}
                    </p>
                  </button>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(msg.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      {!msg.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkRead(msg)}
                          disabled={busyId === msg.id}
                          aria-label={`Tandai pesan dari ${msg.name} sebagai dibaca`}
                          className="gap-1 text-zinc-600 hover:text-zinc-900"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">
                            Tandai dibaca
                          </span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDelete(msg)}
                        disabled={busyId === msg.id}
                        aria-label={`Hapus pesan dari ${msg.name}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {!isLoading && !error && messages.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="gap-1 bg-white"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="gap-1 bg-white"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Dialog detail pesan */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto bg-white">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-zinc-900">
                  <MailOpen
                    className="h-5 w-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {selected.subject}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Dari {selected.name} • {formatDate(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Email
                  </p>
                  <a
                    href={`mailto:${selected.email}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {selected.email}
                  </a>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Pesan
                  </p>
                  <p className="whitespace-pre-wrap break-words text-zinc-800">
                    {selected.message}
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="bg-white"
                  onClick={() => setSelected(null)}
                >
                  Tutup
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setPendingDelete(selected)}
                  className="gap-1"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Hapus
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog konfirmasi hapus */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-zinc-900">Hapus pesan?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {pendingDelete
                ? `Pesan dari ${pendingDelete.name} akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => setPendingDelete(null)}
              disabled={!!busyId}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!busyId}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {busyId ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactMessages;
