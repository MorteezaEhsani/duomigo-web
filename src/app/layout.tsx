import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastProvider } from "@/components/ToastProvider";
import { ENV } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Duomigo - Learn Languages Naturally",
  description: "Practice speaking, listening, and conversing in your target language",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={ENV.CLERK_PUBLISHABLE_KEY}>
      {/*
        IMPORTANT: Ensure the following URLs are added to your Clerk Dashboard
        under Allowed Origins/Redirects:
        - https://duomigo.com
        - https://www.duomigo.com (if not automatically redirecting to apex)
      */}
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
          <ToastProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}