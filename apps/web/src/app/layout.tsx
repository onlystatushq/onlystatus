import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import LocalFont from "next/font/local";
import { cn } from "@openstatus/ui/lib/utils";
import { Nav } from "@/components/nav";
import "./globals.css";

const cal = LocalFont({
  src: "../../public/fonts/CalSans-SemiBold.ttf",
  variable: "--font-cal-sans",
});

const commitMono = LocalFont({
  src: [
    {
      path: "../../public/fonts/CommitMono-400-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/CommitMono-400-Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/CommitMono-700-Regular.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/CommitMono-700-Italic.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-commit-mono",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OnlyStatus - Self-Hosted Monitoring",
  description:
    "Self-hosted synthetic monitoring platform. Monitor your websites and APIs from anywhere. No cloud. No limits.",
  metadataBase: new URL("https://onlystatus.dev"),
  icons: "/favicon.ico",
  openGraph: {
    title: "OnlyStatus",
    description: "Self-hosted monitoring. No cloud. No limits.",
    url: "https://onlystatus.dev",
    siteName: "OnlyStatus",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OnlyStatus",
    description: "Self-hosted monitoring. No cloud. No limits.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          outfit.variable,
          geistMono.variable,
          cal.variable,
          commitMono.variable,
          "font-sans antialiased",
        )}
      >
        <Nav />
        {children}
      </body>
    </html>
  );
}
