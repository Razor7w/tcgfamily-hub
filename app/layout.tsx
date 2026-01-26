import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import ThemeRegistry from "@/components/ThemeRegistry";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="es">
      <body>
        <ThemeRegistry>
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
