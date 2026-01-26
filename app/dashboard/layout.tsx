import AuthLayout from "@/components/auth/AuthLayout";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <Header />
      {children}
    </AuthLayout>
  );
}
