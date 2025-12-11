import ProvidersAdmin from "./ProvidersAdmin";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProvidersAdmin>{children}</ProvidersAdmin>
  );
}
