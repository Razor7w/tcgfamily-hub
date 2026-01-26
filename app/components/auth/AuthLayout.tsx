import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface AuthLayoutProps {
  children: React.ReactNode;
  role?: "user" | "admin";
}

/**
 * Layout que protege rutas requiriendo autenticación
 * Si el usuario no está autenticado, redirige a la página principal (/)
 */
export default async function AuthLayout({
  children,
  role = "user",
}: AuthLayoutProps) {
  const session = await auth();

  if (session && role === "admin" && session.user.role !== "admin") {
    // Si el rol es admin pero el usuario no es admin, redirigir a la página principal
    redirect("/");
  }

  // Si no hay sesión, redirigir a la página principal
  if (!session) {
    redirect("/");
  }

  return <>{children}</>;
}
