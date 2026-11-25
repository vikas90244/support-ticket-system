import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Support Desk | New request",
  description: "Tell our support team what you need help with.",
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
