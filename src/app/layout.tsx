import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Knowledge Vault | Active Recall Study Partner",
  description: "A personal voice-first revision tool that turns spoken technical concepts into clean, structured study cards for placements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
