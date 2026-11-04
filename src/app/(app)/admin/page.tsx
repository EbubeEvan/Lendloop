import { AdminGuard } from "@/components/app/admin-guard";
import { AdminOverview } from "@/features/admin";

export const metadata = {
  title: "Admin overview",
};

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminOverview />
    </AdminGuard>
  );
}
