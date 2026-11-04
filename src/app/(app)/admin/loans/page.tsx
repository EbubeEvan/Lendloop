import { AdminGuard } from "@/components/app/admin-guard";
import { AdminLoans } from "@/features/admin";

export const metadata = {
  title: "Admin loans",
};

export default function AdminLoansPage() {
  return (
    <AdminGuard>
      <AdminLoans />
    </AdminGuard>
  );
}
