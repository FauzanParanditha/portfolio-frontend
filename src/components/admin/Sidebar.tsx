"use client";

import { Role, useAdminAuth } from "@/context/AdminAuthContext";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { NAV_ITEMS, NavItem } from "./sidebar.config";

export function Sidebar({ role }: { role?: Role }) {
  const pathname = usePathname();
  const user = useAdminAuth();

  // console.log("[Sidebar] badges", badges); // ⬅️ LOG 7

  const allowed = (roles?: Role[]) =>
    !roles || roles.length === 0 || (role ? roles.includes(role) : true);

  const isItemActive = (item: NavItem): boolean => {
    const href = item.href;

    const activeSelf =
      !!href &&
      (() => {
        // Root admin harus exact match saja
        if (href === "/admin") return pathname === "/admin";

        return pathname === href || pathname.startsWith(href + "/");
      })();

    const activeChild = (item.items ?? []).some(isItemActive);
    return activeSelf || activeChild;
  };

  const defaultOpenKeys = useMemo(() => {
    const keys: Record<string, boolean> = {};
    const walk = (items: NavItem[]) => {
      for (const it of items) {
        const key = it.key ?? it.href ?? it.label;
        if (it.items?.length) {
          if (isItemActive(it)) keys[key] = true;
          walk(it.items);
        }
      }
    };
    walk(NAV_ITEMS);
    return keys;
  }, [pathname]);

  const [open, setOpen] = useState<Record<string, boolean>>(defaultOpenKeys);
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const NavList = ({
    items,
    level = 0,
  }: {
    items: NavItem[];
    level?: number;
  }) => {
    return (
      <div className="space-y-1">
        {items
          .filter((i) => allowed(i.roles))
          .map((item) => {
            const key = item.key ?? item.href ?? item.label;
            const active = isItemActive(item);
            const hasChildren = !!item.items?.length;

            const paddingLeft = 12 + level * 12;

            if (!hasChildren) {
              return (
                <Link
                  key={key}
                  href={item.href ?? "#"}
                  className={[
                    "flex items-center justify-between rounded-xl px-3 py-2 text-sm",
                    "hover:bg-gray-100",
                    active ? "bg-gray-100 font-medium" : "",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                  style={{ paddingLeft }}
                >
                  <span className="flex items-center gap-2">
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
                    <span className="truncate">{item.label}</span>
                  </span>
                </Link>
              );
            }

            const isOpen = open[key] ?? false;

            return (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className={[
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
                    "hover:bg-gray-100",
                    active ? "bg-gray-100 font-medium" : "",
                  ].join(" ")}
                  aria-expanded={isOpen}
                  style={{ paddingLeft }}
                >
                  <span className="flex items-center gap-2">
                    {item.icon ? <item.icon className="h-4 w-4" /> : null}
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
                  <div className="ml-1 mt-1">
                    <NavList items={item.items!} level={level + 1} />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <nav className="flex h-full flex-col">
      <div className="mb-3 text-sm font-semibold">{user.user?.name}</div>
      <div className="flex-1">
        <NavList items={NAV_ITEMS} />
      </div>
    </nav>
  );
}
