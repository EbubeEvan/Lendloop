import { AdminGuard } from "@/components/app/admin-guard";
import { AdminNeighbors } from "@/features/admin";

export const metadata = {
  title: "Admin neighbors",
};

export default function AdminNeighborsPage() {
  return (
    <AdminGuard>
      <AdminNeighbors />
    </AdminGuard>
  );
}
