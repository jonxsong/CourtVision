import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: "CourtVision — NBA Intelligence", template: "%s · CourtVision" },
  description: "See the game beyond the box score. Basketball analytics, visualized with context.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    siteName: "CourtVision",
    url: SITE_URL,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><a className="skip-link" href="#main">Skip to content</a><Header /><main id="main">{children}</main><Footer /></body>
    </html>
  );
}
