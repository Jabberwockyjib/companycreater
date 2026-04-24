import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sales Data Generator",
  description:
    "Generate synthetic CRM, BI, and sales operations data for B2B product companies.",
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
