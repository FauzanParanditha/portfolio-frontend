// Satu-satunya tempat menambah/mengubah menu
import { Role } from "@/context/AdminAuthContext";
import { Home } from "lucide-react";

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
];
