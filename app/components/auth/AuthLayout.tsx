import { auth } from "@/auth";
import { redirect } from "next/navigation";

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout que protege rutas requiriendo autenticación
 * Si el usuario no está autenticado, redirige a la página principal (/)
 */
export default async function AuthLayout({ children }: AuthLayoutProps) {
  const session = await auth();

  // Si no hay sesión, redirigir a la página principal
  if (!session) {
    redirect("/");
  }

  return <>{children}</>;
}
