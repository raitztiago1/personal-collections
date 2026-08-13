import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Catálogo de coleções pessoais",
  description: "Catálogo pessoal autenticado para consultar e cadastrar coleções",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="overflow-x-hidden">
      <body className="min-h-dvh overflow-x-hidden bg-zinc-50 text-zinc-900 antialiased">
        {children}
      </body>
    </html>
  );
}
