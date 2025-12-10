import AdminGuard from "@/components/AdminGuard";

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      {/* isi dashboard admin di sini */}
      <div className="p-4">Dashboard admin</div>
    </AdminGuard>
  );
}
