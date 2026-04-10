import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import ThemeRegistry from "@/components/ThemeRegistry";
import { QueryProvider } from "@/lib/query-client";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="es">
      <body>
        <AppRouterCacheProvider>
          <QueryProvider>
            <ThemeRegistry>
              <SessionProvider session={session}>
                {children}
              </SessionProvider>
            </ThemeRegistry>
          </QueryProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
