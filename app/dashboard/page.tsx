"use client";

import { useSession } from "next-auth/react";
import SignOutButton from "@/components/auth/SignOutButton";

export default function Profile() {
  const { data: session } = useSession();

  // if (status === "loading") return <p>Cargando...</p>;
  // if (status === "unauthenticated") return <p>No autenticado</p>;

  return (
    <div>
      <SignOutButton />
      <h1>Perfil</h1>
      <p>Nombre: {session?.user?.name}</p>
      <p>Email: {session?.user?.email}</p>
      {/* <img src={session?.user?.image || ""} alt="Avatar" /> */}
    </div>
  );
}
