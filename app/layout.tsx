import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { PwaSetup } from "@/app/components/pwa-setup";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klivr",
  description: "Personal productivity: tasks, calendar, matrix, habits, notes, finance.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
};

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
