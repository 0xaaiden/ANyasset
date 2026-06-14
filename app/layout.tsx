import type { Metadata } from "next";
import { DynamicProvider } from "@/components/DynamicProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "AnyAsset Checkout",
  description: "Crypto checkout links that accept any source asset and settle merchants in USDC on Arc."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DynamicProvider>
          {children}
        </DynamicProvider>
      </body>
    </html>
  );
}
