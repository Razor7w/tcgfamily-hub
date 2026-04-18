import { redirect } from "next/navigation";

/** Ruta antigua: enlaces guardados apuntan aquí. */
export default function AdminDashboardModulesRedirectPage() {
  redirect("/admin/configuracion");
}
