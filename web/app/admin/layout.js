import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = {
  title: "Админка Dr. Sevara",
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
