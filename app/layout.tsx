import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daybook",
  description: "Personal productivity: tasks, matrix, calendar, habits, journal.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
