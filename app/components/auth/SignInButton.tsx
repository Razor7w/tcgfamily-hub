"use client";

import { signIn } from "next-auth/react";

export default function SignInButton() {
  return (
    <button
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="px-4 py-2 bg-blue-500 text-white rounded"
    >
      Iniciar sesión con Google
    </button>
  );
}
