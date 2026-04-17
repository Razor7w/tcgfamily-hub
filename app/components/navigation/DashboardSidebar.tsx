import DashboardUserNav from "@/components/navigation/DashboardUserNav";

export default function DashboardSidebar({ isAdmin }: { isAdmin: boolean }) {
  return <DashboardUserNav isAdmin={isAdmin} />;
}
