"use client";

import AdminGuard from "@/components/AdminGuard";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { motion } from "framer-motion";
import { Briefcase, FolderOpen, Mail } from "lucide-react";
import Link from "next/link";

const AdminOverview = () => {
  const { overview, isLoading, error } = useDashboardOverview();

  const stats = [
    {
      icon: FolderOpen,
      label: "Projects",
      value: overview?.projects.total ?? 0,
      sub: overview
        ? `${overview.projects.featured} featured • ${overview.projects.recentCount} recent`
        : "",
      path: "/admin/projects",
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: Briefcase,
      label: "Experiences",
      value: overview?.experiences.total ?? 0,
      sub: overview
        ? `${overview.experiences.current} current • ${overview.experiences.recentCount} recent`
        : "",
      path: "/admin/experiences",
      color: "bg-green-500/10 text-green-500",
    },
    {
      icon: Mail,
      label: "Contact Messages",
      value: overview?.contactMessages.total ?? 0,
      sub: overview
        ? `${overview.contactMessages.unread} unread • ${overview.contactMessages.recentCount} recent`
        : "",
      path: "/admin/contact-messages",
      color: "bg-orange-500/10 text-orange-500",
    },
  ];

  return (
    <AdminGuard>
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-2 text-3xl font-bold text-black">
            Dashboard Overview
          </h1>
          <p className="text-muted-foreground mb-8">
            {isLoading
              ? "Loading overview..."
              : error
                ? "Failed to load overview"
                : overview
                  ? `Server time: ${new Date(overview.system.serverTime).toLocaleString("id-ID")}`
                  : "Welcome to your portfolio admin panel"}
          </p>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={stat.path}
                  className="border-border hover:border-primary/50 block rounded-xl border bg-white p-6 transition-colors"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
                  >
                    <stat.icon className="h-6 w-6" />
                  </div>

                  <p className="text-3xl font-bold text-black">
                    {isLoading ? "…" : stat.value}
                  </p>

                  <p className="text-muted-foreground">{stat.label}</p>

                  {stat.sub ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {stat.sub}
                    </p>
                  ) : null}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminGuard>
  );
};

export default AdminOverview;
