"use client";

import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminExperiences } from "@/hooks/use-admin-experience";
import { useAdminTags } from "@/hooks/use-admin-tags";
import { useToast } from "@/hooks/use-toast";
import { toExperienceUpsertPayload } from "@/lib/mapper/experience";
import type { Experience } from "@/types/experience";
import { motion } from "framer-motion";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );

const AdminExperience = () => {
  const { toast } = useToast();

  const {
    experiences,
    isLoading,
    error,
    refresh,
    createOne,
    updateOne,
    deleteOne,
  } = useAdminExperiences({ page: 1, limit: 50 });

  const { tags, isLoading: tagsLoading } = useAdminTags({
    page: 1,
    limit: 100,
  });

  const [formData, setFormData] = useState<Experience[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const highlightsToText = (highs?: { text: string }[]) =>
    (highs ?? []).map((h) => h.text ?? "").join("\n");

  const textToHighlights = (val: string) =>
    val
      .replace(/\r/g, "") // kalau user paste dari Windows
      .split("\n")
      .map((text) => ({ text }));

  // init sekali saja (biar tidak reset tiap revalidate)
  // const initialized = useRef(false);
  // useEffect(() => {
  //   if (initialized.current) return;
  //   setFormData(experiences);
  //   initialized.current = true;
  // }, [experiences]);

  useEffect(() => {
    if (formData.length === 0 && experiences.length > 0) {
      setFormData(experiences);
    }
  }, [experiences, formData.length]);

  const addExperience = () => {
    setFormData((prev) => [
      ...prev,
      {
        id: `tmp_${crypto.randomUUID()}`, // penting: bedain dari uuid server
        title: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        sortOrder: prev.length + 1,
        tags: [],
        highlights: [],
      },
    ]);
  };

  const removeExperience = (id: string) => {
    setFormData((prev) => prev.filter((exp) => exp.id !== id));
  };

  const updateExperience = <K extends keyof Experience>(
    id: string,
    field: K,
    value: Experience[K],
  ) => {
    setFormData((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    );
  };

  const toggleTag = (
    expId: string,
    tag: { id: string; name: string; type: string },
  ) => {
    setFormData((prev) =>
      prev.map((exp) => {
        if (exp.id !== expId) return exp;

        const exists = (exp.tags ?? []).some((t) => t.id === tag.id);
        const nextTags = exists
          ? (exp.tags ?? []).filter((t) => t.id !== tag.id)
          : [...(exp.tags ?? []), tag];

        return { ...exp, tags: nextTags };
      }),
    );
  };

  const tagsByType = tags.reduce<Record<string, typeof tags>>((acc, t) => {
    (acc[t.type] ||= []).push(t);
    return acc;
  }, {});

  const handleSaveCard = async (exp: Experience, index: number) => {
    setSavingId(exp.id);
    try {
      const body = toExperienceUpsertPayload(exp, index + 1);

      if (isUuid(exp.id)) {
        await updateOne(exp.id, body as any); // updateOne signature boleh kamu ubah jadi payload type
        toast({ title: "Updated", description: "Saved.", variant: "success" });
      } else {
        const res = await createOne(body as any);

        // response kamu kemungkinan { data: ExperienceResponse }
        const created = res?.data ?? res;
        const newId = created?.id ?? created?.data?.id;

        if (newId) {
          setFormData((prev) =>
            prev.map((x) => (x.id === exp.id ? { ...x, id: newId } : x)),
          );
        }

        toast({ title: "Created", description: "Saved." });
      }

      await refresh();
    } catch (e) {
      toast({
        title: "Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCard = async (exp: Experience) => {
    if (!isUuid(exp.id)) {
      removeExperience(exp.id);
      toast({ title: "Removed", description: "Draft removed." });
      return;
    }

    setDeletingId(exp.id);
    try {
      await deleteOne(exp.id);
      removeExperience(exp.id);
      toast({ title: "Deleted", description: "Experience deleted." });
      const latest = await refresh();
      if (latest?.data)
        setFormData(
          latest.data.slice().sort((a, b) => a.sortOrder - b.sortOrder),
        );
    } catch {
      toast({
        title: "Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) return <FullScreenLoader />;
  if (error) return <div className="p-8">Failed to load experiences.</div>;

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-black">Experience</h1>
            <p className="text-muted-foreground">Manage your work experience</p>
          </div>
          <Button onClick={addExperience} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Experience
          </Button>
        </div>

        <div className="space-y-6">
          {formData.map((experience, index) => (
            <motion.div
              key={experience.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-xl border border-border bg-card bg-white p-6 shadow-md"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                  <span className="font-medium">Experience {index + 1}</span>
                  {!isUuid(experience.id) ? (
                    <span className="ml-2 rounded-md border px-2 py-0.5 text-xs">
                      Draft
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 bg-white"
                    onClick={() => handleSaveCard(experience, index)}
                    disabled={savingId === experience.id}
                  >
                    <Save className="h-4 w-4" />
                    {savingId === experience.id ? "Saving..." : "Save"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCard(experience)}
                    disabled={deletingId === experience.id}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input
                    value={experience.title}
                    onChange={(e) =>
                      updateExperience(experience.id, "title", e.target.value)
                    }
                    placeholder="Full Stack Developer"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    value={experience.company}
                    onChange={(e) =>
                      updateExperience(experience.id, "company", e.target.value)
                    }
                    placeholder="PANDI"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Location</Label>
                  <Input
                    value={experience.location}
                    onChange={(e) =>
                      updateExperience(
                        experience.id,
                        "location",
                        e.target.value,
                      )
                    }
                    placeholder="Jakarta, Indonesia"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={experience.startDate}
                    onChange={(e) =>
                      updateExperience(
                        experience.id,
                        "startDate",
                        e.target.value,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={experience.endDate ?? ""}
                    onChange={(e) =>
                      updateExperience(experience.id, "endDate", e.target.value)
                    }
                    disabled={experience.isCurrent}
                  />
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={experience.isCurrent}
                      onChange={(e) =>
                        updateExperience(
                          experience.id,
                          "isCurrent",
                          e.target.checked,
                        )
                      }
                    />
                    Current Position
                  </label>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={experience.description}
                    onChange={(e) =>
                      updateExperience(
                        experience.id,
                        "description",
                        e.target.value,
                      )
                    }
                    className="bg-white"
                    placeholder="Describe your role and achievements..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Highlights (1 line = 1 bullet)</Label>
                  <Textarea
                    value={highlightsToText(experience.highlights)}
                    onChange={(e) =>
                      updateExperience(
                        experience.id,
                        "highlights",
                        textToHighlights(e.target.value) as any,
                      )
                    }
                    placeholder={"BACKEND\nFRONTEND\nCI/CD"}
                    rows={4}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Tags</Label>

                  {tagsLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading tags...
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(tagsByType).map(([type, items]) => (
                        <div
                          key={type}
                          className="rounded-lg border border-border p-3"
                        >
                          <div className="mb-2 text-sm font-medium capitalize text-black">
                            {type}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {items.map((t) => {
                              const checked = (experience.tags ?? []).some(
                                (x) => x.id === t.id,
                              );
                              return (
                                <label
                                  key={t.id}
                                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleTag(experience.id, t)}
                                  />
                                  <span>{t.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}

          {formData.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card bg-white p-12 text-center">
              <p className="mb-4 text-black">No experience entries yet</p>
              <Button
                type="button"
                variant="outline"
                onClick={addExperience}
                className="gap-2 bg-white"
              >
                <Plus className="h-4 w-4" />
                Add Your First Experience
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminExperience;
