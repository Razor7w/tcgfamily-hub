"use client";

import { useSession } from "next-auth/react";
import SignInButton from "@/components/auth/SignInButton";
import SignOutButton from "@/components/auth/SignOutButton";

export default function Profile() {
const { data: session, status } = useSession();

// if (status === "loading") return <p>Cargando...</p>;
// if (status === "unauthenticated") return <p>No autenticado</p>;

return (
<div>
<SignOutButton />
<h1>Perfil</h1>
<p>Nombre: {session?.user?.name}</p>
<p>Email: {session?.user?.email}</p>
{/_ <img src={session?.user?.image || ""} alt="Avatar" /> _/}
</div>
);
}
