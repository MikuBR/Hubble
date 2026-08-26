import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/shared/components/providers";

export const metadata: Metadata = {
  title: {
    default: "HUBBLE — Rastreador de Mídia Privado",
    template: "%s · HUBBLE",
  },
  description:
    "Rastreador de mídia unificado, privado e offline-first. Centralize filmes, séries, animes, mangás, livros e jogos em um único lugar.",
  keywords: [
    "tracker",
    "letterboxd",
    "anilist",
    "mal",
    "trakt",
    "anime",
    "manga",
    "movie",
    "private",
    "open source",
  ],
  authors: [{ name: "HUBBLE" }],
  creator: "HUBBLE",
  applicationName: "HUBBLE",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://hubble.local",
    title: "HUBBLE — Rastreador de Mídia Privado",
    description:
      "Centralize todo o seu consumo de mídia em um único lugar privado.",
    siteName: "HUBBLE",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
   </html>
  );
}