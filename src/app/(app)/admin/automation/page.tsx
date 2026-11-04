import { AdminGuard } from "@/components/app/admin-guard";
import { AdminAutomation } from "@/features/admin";

export const metadata = {
  title: "Admin automation",
};

export default function AdminAutomationPage() {
  return (
    <AdminGuard>
      <AdminAutomation />
    </AdminGuard>
  );
}
