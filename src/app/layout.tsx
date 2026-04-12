import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AeroView",
  description: "Find the best seat for your flight view",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
