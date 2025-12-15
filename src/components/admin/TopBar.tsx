"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Role } from "@/context/AdminAuthContext";
import { Menu } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { MobileSidebar } from "./MobileSidebar";
import { UserMenu } from "./UserMenu";

export function Topbar({ role }: { role?: Role }) {
  return (
    <div className="flex items-center gap-2">
      {/* Drawer untuk mobile */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>

          {/* Pastikan SheetContent punya title (a11y) */}
          <SheetContent
            side="left"
            title="Navigation Menu"
            className="h-dvh w-[88vw] max-w-xs overflow-hidden p-0 text-black"
          >
            <div className="h-full overflow-y-auto">
              <MobileSidebar role={role} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Search */}
      <div className="flex min-w-0 flex-1">
        <Input
          placeholder="Search…"
          className="w-full rounded-xl bg-white text-black"
          aria-label="Search"
        />
      </div>

      {/* Avatar dropdown */}
      <UserMenu />
    </div>
  );
}
