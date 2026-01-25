import AuthLayout from "@/components/auth/AuthLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}
