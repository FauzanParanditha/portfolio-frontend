"use client";

import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminTags } from "@/hooks/use-admin-tags";
import { useToast } from "@/hooks/use-toast";
import { handleAxiosError } from "@/lib/handleAxiosError";
import type { ExperienceTag } from "@/types/experience";
import { motion } from "framer-motion";
import { Check, Pencil, Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

const AdminTags = () => {
  const { toast } = useToast();
  const { tags, isLoading, error, createOne, updateOne, deleteOne } =
    useAdminTags({ page: 1, limit: 200 });

  // Form tambah
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit inline: menyimpan id yang sedang diedit beserta nilai sementaranya.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Konfirmasi hapus dua langkah — menghindari kehilangan tag karena salah klik
  // tanpa perlu dialog terpisah.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [filter, setFilter] = useState("");

  // Tipe yang sudah dipakai, untuk datalist supaya penamaan tetap konsisten
  // (mis. selalu "BACKEND", bukan campur "backend"/"Backend").
  const knownTypes = useMemo(
    () => Array.from(new Set(tags.map((t) => t.type))).sort(),
    [tags],
  );

  const visibleTags = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? tags.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.type.toLowerCase().includes(q),
        )
      : tags;

    return filtered.reduce<Record<string, ExperienceTag[]>>((acc, t) => {
      (acc[t.type] ||= []).push(t);
      return acc;
    }, {});
  }, [tags, filter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = newName.trim();
    const type = newType.trim();
    if (!name || !type) {
      toast({
        title: "Lengkapi form",
        description: "Nama dan tipe tag wajib diisi.",
        variant: "warning",
      });
      return;
    }

    setCreating(true);
    try {
      await createOne({ name, type });
      setNewName("");
      // Tipe sengaja dipertahankan supaya menambah banyak tag pada satu tipe
      // tidak perlu mengetik ulang tipenya.
      toast({ title: "Tag dibuat", description: `${name} (${type})` });
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (tag: ExperienceTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditType(tag.type);
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditType("");
  };

  const handleUpdate = async (id: string) => {
    const name = editName.trim();
    const type = editType.trim();
    if (!name || !type) {
      toast({
        title: "Lengkapi form",
        description: "Nama dan tipe tag wajib diisi.",
        variant: "warning",
      });
      return;
    }

    setSavingId(id);
    try {
      await updateOne(id, { name, type });
      cancelEdit();
      toast({ title: "Tag diperbarui", description: `${name} (${type})` });
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (tag: ExperienceTag) => {
    setDeletingId(tag.id);
    try {
      await deleteOne(tag.id);
      setConfirmDeleteId(null);
      toast({ title: "Tag dihapus", description: tag.name });
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <FullScreenLoader />;
  if (error) return <div className="p-8">Gagal memuat tag.</div>;

  const types = Object.keys(visibleTags).sort();

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-black">Tags</h1>
          <p className="text-muted-foreground">
            Kelola tag yang dipakai pada Projects dan Experiences.
          </p>
        </div>

        {/* Form tambah */}
        <form
          onSubmit={handleCreate}
          className="border-border mb-6 rounded-xl border bg-white p-6 shadow-xs"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Nama</Label>
              <Input
                id="tag-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Go, React, PostgreSQL"
                className="bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag-type">Tipe</Label>
              <Input
                id="tag-type"
                list="tag-types"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                placeholder="BACKEND, FRONTEND, TOOLS"
                className="bg-white"
              />
              <datalist id="tag-types">
                {knownTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <Button type="submit" disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? "Menyimpan..." : "Tambah Tag"}
            </Button>
          </div>
        </form>

        {/* Pencarian */}
        <div className="mb-6 max-w-sm space-y-2">
          <Label htmlFor="tag-filter">Cari</Label>
          <Input
            id="tag-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Saring berdasarkan nama atau tipe..."
            className="bg-white"
          />
        </div>

        {tags.length === 0 ? (
          <div className="border-border rounded-xl border border-dashed bg-white p-12 text-center">
            <TagIcon className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
            <p className="text-black">Belum ada tag</p>
            <p className="text-muted-foreground text-sm">
              Tambahkan tag pertama lewat form di atas.
            </p>
          </div>
        ) : types.length === 0 ? (
          <div className="border-border rounded-xl border border-dashed bg-white p-12 text-center">
            <p className="text-black">Tidak ada tag yang cocok</p>
          </div>
        ) : (
          <div className="space-y-4">
            {types.map((type) => (
              <div
                key={type}
                className="border-border rounded-xl border bg-white p-6 shadow-xs"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="font-semibold text-black capitalize">
                    {type}
                  </span>
                  <span className="text-muted-foreground rounded-md border px-2 py-0.5 text-xs">
                    {visibleTags[type].length}
                  </span>
                </div>

                <ul className="space-y-2">
                  {visibleTags[type].map((tag) => (
                    <li
                      key={tag.id}
                      className="border-border flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
                    >
                      {editingId === tag.id ? (
                        <>
                          <Input
                            aria-label="Nama tag"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-9 max-w-[200px] bg-white"
                          />
                          <Input
                            aria-label="Tipe tag"
                            list="tag-types"
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="h-9 max-w-[180px] bg-white"
                          />
                          <div className="ml-auto flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleUpdate(tag.id)}
                              disabled={savingId === tag.id}
                              className="gap-1"
                            >
                              <Check className="h-4 w-4" />
                              {savingId === tag.id ? "Menyimpan..." : "Simpan"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              aria-label={`Batal edit ${tag.name}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-black">{tag.name}</span>

                          <div className="ml-auto flex items-center gap-1">
                            {confirmDeleteId === tag.id ? (
                              <>
                                <span className="text-muted-foreground text-sm">
                                  Hapus tag ini?
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(tag)}
                                  disabled={deletingId === tag.id}
                                >
                                  {deletingId === tag.id
                                    ? "Menghapus..."
                                    : "Ya, hapus"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmDeleteId(null)}
                                >
                                  Batal
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(tag)}
                                  aria-label={`Edit ${tag.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmDeleteId(tag.id)}
                                  aria-label={`Hapus ${tag.name}`}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminTags;
