import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { PwaSetup } from "@/app/components/pwa-setup";
import { THEME_COLORS } from "@/app/lib/theme-colors";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klivr",
  description: "Personal productivity: tasks, calendar, matrix, habits, notes, finance.",
};

export async function generateViewport(): Promise<Viewport> {
  const store = await cookies();
  const theme = store.get("daybook_theme")?.value === "light" ? "light" : "dark";
  return { viewportFit: "cover", themeColor: THEME_COLORS[theme] };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const theme = store.get("daybook_theme")?.value === "light" ? "light" : "dark";

  return (
    <html lang="en" data-theme={theme}>
      <body>
        <PwaSetup />
        {children}
      </body>
    </html>
  );
}
