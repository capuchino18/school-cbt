import './globals.css';
import React from 'react';
import Script from 'next/script';

export const metadata = {
  title: 'Aplikasi Ujian Sekolah CBT',
  description: 'Portal Ujian Berbasis Komputer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-900 text-slate-100 antialiased">
        {children}
        {/* Load Google Identity Services SDK secara otomatis */}
        <Script 
          src="https://accounts.google.com/gsi/client" 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}