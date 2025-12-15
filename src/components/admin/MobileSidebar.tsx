"use client";

import { Role } from "@/context/AdminAuthContext";
import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { SheetClose } from "../ui/sheet";
import { NAV_ITEMS, type NavItem } from "./sidebar.config";

export function MobileSidebar({ role }: { role?: Role }) {
  const pathname = usePathname();

  const allowed = (roles?: Role[]) =>
    !roles || roles.length === 0 || (role ? roles.includes(role) : true);

  const isActive = (href?: string) =>
    !!href && (pathname === href || pathname.startsWith(href + "/"));

  // default open untuk group yang mengandung route aktif
  const defaultOpen = useMemo(() => {
    const map: Record<string, boolean> = {};
    const walk = (items: NavItem[]) => {
      for (const it of items) {
        const key = it.key ?? it.href ?? it.label;
        if (it.items?.length) {
          const activeInGroup =
            it.items.some((c) => isActive(c.href)) ||
            it.items.some((c) => c.items?.some((g) => isActive(g.href)));
          if (activeInGroup) map[key] = true;
          walk(it.items);
        }
      }
    };
    walk(NAV_ITEMS);
    return map;
  }, [pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpen);
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  // rekursif
  const NavList = ({
    items,
    level = 0,
  }: {
    items: NavItem[];
    level?: number;
  }) => (
    <div className="flex flex-col gap-1">
      {items
        .filter((i) => allowed(i.roles))
        .map((item, idx) => {
          const key = item.key ?? item.href ?? `${item.label}-${idx}`;
          const paddingLeft = 12 + level * 12; // px
          const Icon = item.icon ?? Menu;

          if (item.items?.length) {
            const isOpen = open[key] ?? false;
            const active = item.items.some((c) => isActive(c.href));
            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={[
                    "mx-3 flex w-[calc(100%-1.5rem)] items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                    "hover:bg-gray-100",
                    active ? "bg-gray-100 font-medium" : "",
                  ].join(" ")}
                  style={{ paddingLeft }}
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronDown
                    className={[
                      "h-4 w-4 transition-transform",
                      isOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                {isOpen && (
                  <div className="ml-1">
                    <NavList items={item.items} level={level + 1} />
                  </div>
                )}
              </div>
            );
          }

          if (item.href) {
            const active = isActive(item.href);
            return (
              <SheetClose asChild key={key}>
                <Link
                  href={item.href}
                  className={[
                    "mx-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                    "hover:bg-gray-100",
                    active ? "bg-gray-100 font-medium" : "",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                  style={{ paddingLeft }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </SheetClose>
            );
          }

          return null; // item tanpa href & tanpa children
        })}
    </div>
  );

  return (
    <nav className="flex h-full flex-col gap-2 bg-white">
      <div className="px-3 pt-3 text-sm font-semibold capitalize">{role}</div>
      <NavList items={NAV_ITEMS} />
    </nav>
  );
}
