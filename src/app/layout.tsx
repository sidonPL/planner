import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Family Planner",
    template: "%s | Family Planner"
  },
  description: "Aplikacja do zarządzania rodziną - plany, zadania, budżet, przepisy, kalendarze i wiele więcej",
  manifest: "/manifest.json",
  keywords: ["family", "planner", "tasks", "budget", "recipes", "calendar", "household management"],
  authors: [
    {
      name: "Family Planner Team"
    }
  ],
  creator: "Family Planner",
  publisher: "Family Planner",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Planner",
    startupImage: [
      {
        url: "/icon-192x192.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      },
      {
        url: "/icon-512x512.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
      }
    ]
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: [
      { url: "/favicon.ico" }
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      { url: "/icon-maskable.png", sizes: "192x192", type: "image/png", rel: "apple-touch-icon" }
    ]
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    url: "https://familyplanner.app",
    siteName: "Family Planner",
    title: "Family Planner - Zarządzanie rodziną",
    description: "Kompleksowa aplikacja do zarządzania życiem rodzinnym"
  },
  twitter: {
    card: "summary_large_image",
    title: "Family Planner",
    description: "Aplikacja do zarządzania rodziną"
  }
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1.0,
    minimumScale: 1.0,
    maximumScale: 5.0,
    userScalable: true,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#ffffff" },
      { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" }
    ]
  };
}

export function generateRobots() {
  return {
    index: true,
    follow: true,
    googleBot: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
    bingbot: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
