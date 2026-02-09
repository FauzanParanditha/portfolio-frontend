"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminProjects } from "@/hooks/use-admin-projects";
import { useAdminTags } from "@/hooks/use-admin-tags";
import { useToast } from "@/hooks/use-toast";
import { toProjectUpsertPayload } from "@/lib/mapper/project";
import { Project } from "@/types/project";
import { motion } from "framer-motion";
import { Edit, ExternalLink, Github, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const emptyProject: Project = {
  id: "tmp",
  slug: "",
  title: "",
  shortDesc: "",
  longDescription: "",
  coverImageUrl: "",

  category: "",
  timeline: "",
  role: "",

  challenge: "",
  solution: "",

  results: [],
  technicalDetails: {
    architecture: "",
    frontend: "",
    backend: "",
    database: "",
    deployment: "",
  },

  demoUrl: "",
  repoUrl: "",

  isFeatured: false,
  sortOrder: 1,

  tags: [],
  features: [],
  screenshots: [],
};

const AdminProjects = () => {
  const { projects, isLoading, error, createOne, updateOne, deleteOne } =
    useAdminProjects({ page: 1, limit: 12 });

  const { tags, isLoading: tagsLoading } = useAdminTags({
    page: 1,
    limit: 100,
  });

  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<Project>(emptyProject);
  const [techInput, setTechInput] = useState("");

  const toggleTag = (tag: { id: string; name: string; type: string }) => {
    setFormData((prev) => {
      const exists = prev.tags.some((t) => t.id === tag.id);
      return {
        ...prev,
        tags: exists
          ? prev.tags.filter((t) => t.id !== tag.id)
          : [...prev.tags, tag],
      };
    });
  };

  const linesToText = (arr?: string[]) => (arr ?? []).join("\n");
  const textToLines = (val: string) =>
    val
      .replace(/\r/g, "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  // features editor: FE simpan [{text}] tapi user input multiline
  const featuresToText = (fs?: { text: string }[]) =>
    (fs ?? []).map((x) => x.text).join("\n");

  const textToFeatures = (val: string) =>
    textToLines(val).map((text) => ({ text }));

  // screenshots editor: response [{imageUrl, sortOrder}] -> textarea url per line
  const screenshotsToText = (ss?: { imageUrl: string }[]) =>
    (ss ?? []).map((x) => x.imageUrl).join("\n");

  const textToScreenshots = (val: string) =>
    textToLines(val).map((url, idx) => ({ imageUrl: url, sortOrder: idx + 1 }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = toProjectUpsertPayload(formData, formData.sortOrder || 1);

      if (editingProject) {
        await updateOne(editingProject.id, payload);
        toast({ title: "Project updated", description: "Saved." });
      } else {
        await createOne(payload);
        toast({ title: "Project created", description: "Saved." });
      }

      setIsOpen(false);
      resetForm();
    } catch {
      toast({
        title: "Failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData(emptyProject);
    setEditingProject(null);
    setTechInput("");
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData(project);
    setIsOpen(true);
  };

  const deleteProject = async (id: string) => {
    try {
      await deleteOne(id);
      toast({ title: "Project deleted", description: "Removed." });
    } catch {
      toast({
        title: "Failed",
        description: "Could not delete.",
        variant: "destructive",
      });
    }
  };

  const addFeature = () => {
    if (techInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, { text: techInput.trim() }],
      });
      setTechInput("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-black">Projects</h1>
            <p className="text-muted-foreground">
              Manage your portfolio projects
            </p>
          </div>
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white text-muted-foreground">
              <DialogHeader>
                <DialogTitle className="text-muted-foreground">
                  {editingProject ? "Edit Project" : "Add New Project"}
                </DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="space-y-4 text-muted-foreground"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Project Title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Category</Label>
                    <Input
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      placeholder="Web App, Mobile, etc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      placeholder="e-commerce-platform"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Sort Order</Label>
                    <Input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: Number(e.target.value || 1),
                        })
                      }
                      min={1}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Description</Label>
                  <Textarea
                    value={formData.shortDesc}
                    onChange={(e) =>
                      setFormData({ ...formData, shortDesc: e.target.value })
                    }
                    rows={3}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Long Description
                  </Label>
                  <Textarea
                    value={formData.longDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longDescription: e.target.value,
                      })
                    }
                    rows={6}
                    className="bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Live URL</Label>
                    <Input
                      value={formData.demoUrl ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, demoUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">GitHub URL</Label>
                    <Input
                      value={formData.repoUrl ?? ""}
                      onChange={(e) =>
                        setFormData({ ...formData, repoUrl: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Timeline</Label>
                    <Input
                      value={formData.timeline}
                      onChange={(e) =>
                        setFormData({ ...formData, timeline: e.target.value })
                      }
                      placeholder="3 months"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Role</Label>
                    <Input
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      placeholder="Full Stack Developer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Challenge</Label>
                  <Textarea
                    value={formData.challenge}
                    onChange={(e) =>
                      setFormData({ ...formData, challenge: e.target.value })
                    }
                    rows={4}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Solution</Label>
                  <Textarea
                    value={formData.solution}
                    onChange={(e) =>
                      setFormData({ ...formData, solution: e.target.value })
                    }
                    rows={4}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Results (1 line = 1 item)
                  </Label>
                  <Textarea
                    value={linesToText(formData.results)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        results: textToLines(e.target.value),
                      })
                    }
                    placeholder={"99.9% uptime\n50% faster load\n..."}
                    rows={4}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Features (1 line = 1 item)
                  </Label>
                  <Textarea
                    value={featuresToText(formData.features)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: textToFeatures(e.target.value),
                      })
                    }
                    placeholder={"Payment Integration\nAdmin Dashboard\n..."}
                    rows={4}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Technical Details
                  </Label>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      "architecture",
                      "frontend",
                      "backend",
                      "database",
                      "deployment",
                    ].map((k) => (
                      <div key={k} className="space-y-1">
                        <Label className="text-xs capitalize text-muted-foreground">
                          {k}
                        </Label>
                        <Input
                          value={String(formData.technicalDetails?.[k] ?? "")}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              technicalDetails: {
                                ...(formData.technicalDetails ?? {}),
                                [k]: e.target.value,
                              },
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tags</Label>

                  {tagsLoading ? (
                    <div className="text-sm text-muted-foreground">
                      Loading tags...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t) => {
                        const checked = formData.tags.some(
                          (x) => x.id === t.id,
                        );
                        return (
                          <label
                            key={t.id}
                            className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm text-muted-foreground"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTag(t)}
                            />
                            <span>{t.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Image URL</Label>
                  <Input
                    value={formData.coverImageUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        coverImageUrl: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    Screenshots URLs (1 line = 1 url)
                  </Label>
                  <Textarea
                    value={screenshotsToText(formData.screenshots)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        screenshots: textToScreenshots(e.target.value),
                      })
                    }
                    placeholder={"https://...\nhttps://..."}
                    rows={3}
                    className="bg-white"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isFeatured: e.target.checked,
                      })
                    }
                  />
                  Featured
                </label>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsOpen(false);
                      resetForm();
                    }}
                    className="bg-white"
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingProject ? "Save Changes" : "Create Project"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="overflow-hidden rounded-xl border border-border bg-card bg-white shadow-sm"
            >
              <div className="aspect-video bg-muted">
                <img
                  src={project.coverImageUrl}
                  alt={project.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="mb-1 font-semibold text-black">
                  {project.title}
                </h3>
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {project.shortDesc}
                </p>
                <div className="mb-4 flex flex-wrap gap-1">
                  {(project.tags?.length
                    ? project.tags.map((t) => t.name)
                    : project.features.map((f) => f.text)
                  )
                    .slice(0, 3)
                    .map((label) => (
                      <span
                        key={label}
                        className="rounded bg-muted px-2 py-1 text-xs"
                      >
                        {label}
                      </span>
                    ))}

                  {(project.tags?.length
                    ? project.tags.length
                    : project.features.length) > 3 && (
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                      +
                      {(project.tags?.length
                        ? project.tags.length
                        : project.features.length) - 3}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-black"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-black"
                      >
                        <Github className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(project)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteProject(project.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="mb-4 text-muted-foreground">No projects yet</p>
            <Button
              variant="outline"
              onClick={() => setIsOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Your First Project
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminProjects;
