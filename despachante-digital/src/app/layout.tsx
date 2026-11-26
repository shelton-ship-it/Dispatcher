import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import Boot from '@/components/Boot';

export const metadata: Metadata = {
  title: { default: 'Despachante Digital — candidaturas prontas em minutos', template: '%s · Despachante Digital' },
  description: 'Requerimento, declaração, carta, CV e documentos digitalizados em PDF, já preenchidos para a vaga ou concurso. Feito para Moçambique.',
  manifest: '/manifest.json', icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0B6B4F' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body>
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-line">
          <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-[17px]">
              <img src="/icon.svg" alt="" width={28} height={28} className="rounded-md" /> Despachante Digital
            </Link>
            <Link href="/recuperar" className="text-sm font-semibold text-verde py-2">Recuperar pagamento</Link>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-28 pt-5">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 pb-10 text-[13px] text-mute">
          Os teus dados ficam guardados só neste telemóvel. Não pedimos conta nem palavra-passe. Confirma sempre a lista de documentos no aviso oficial da vaga.
        </footer>
        <Boot />
      </body>
    </html>
  );
}
