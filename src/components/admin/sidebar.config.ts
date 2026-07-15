// Satu-satunya tempat menambah/mengubah menu
import { Role } from "@/context/AdminAuthContext";
import { Briefcase, FolderOpen, Home, Mail } from "lucide-react";

export type NavItem = {
  href?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items?: NavItem[];
  roles?: Role[]; // biarkan kosong jika boleh untuk semua role
  key?: string; // identifier unik & stabil
};

export const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    href: "/admin",
    label: "Dashboard",
    icon: Home,
  },
  {
    key: "experiences",
    href: "/admin/experiences",
    label: "Experiences",
    icon: Briefcase,
  },
  {
    key: "projects",
    href: "/admin/projects",
    label: "Projects",
    icon: FolderOpen,
  },
  {
    key: "contact-messages",
    href: "/admin/contact-messages",
    label: "Pesan",
    icon: Mail,
  },
];
