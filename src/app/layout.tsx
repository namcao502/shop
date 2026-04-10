import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { ConfirmProvider } from "@/lib/confirm-context";
import { CartProvider } from "@/lib/cart-context";
import { ToastProvider } from "@/lib/toast-context";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Souvenir Shop - Vietnamese Souvenirs",
  description: "Shop unique Vietnamese souvenirs and gifts online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <AuthProvider>
          <LocaleProvider>
            <ConfirmProvider>
              <CartProvider>
              <ToastProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              </ToastProvider>
              </CartProvider>
            </ConfirmProvider>
          </LocaleProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
