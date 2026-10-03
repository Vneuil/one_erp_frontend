import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ONE ERP — AI-Powered All-in-One Business Super App",
  description: "AI-Powered All-in-One Business Super App — Modern, Modular, Omnichannel Enterprise Operating System",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-white antialiased selection:bg-brand-tint selection:text-brand-indigo">
        {children}
      </body>
    </html>
  );
}
