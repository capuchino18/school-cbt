import React from 'react';

export default function SpaceBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full bg-[#050B14] overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Deep Space Nebula & Realistic Starfield Texture (Statis & Stabil) */}
      <div className="absolute inset-0 opacity-80 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/40 via-[#050B14]/95 to-[#020408] z-0" />
      
      {/* Lapisan Bintang Diam di Latar Belakang */}
      <div className="absolute inset-0 opacity-60 pointer-events-none stars-dense-1 z-0" />
      <div className="absolute inset-0 opacity-80 pointer-events-none stars-dense-2 z-0" />

      {/* Rasi Bintang Diletakkan di Pojok Kanan Atas dan Digeser Sedikit ke Bawah */}
      <div className="absolute top-12 right-6 sm:top-16 sm:right-10 w-36 h-36 sm:w-48 sm:h-48 pointer-events-none z-0 opacity-85">
        <svg viewBox="0 0 320 320" className="w-full h-full drop-shadow-[0_0_8px_rgba(147,197,253,0.3)]">
          
          <defs>
            <radialGradient id="microGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="50%" stopColor="#bae6fd" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="microWarmGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="50%" stopColor="#fecdd3" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Gugusan Bintang Rasi (Skala Alami) */}
          <g>
            <g transform="translate(145, 125)">
              <circle cx="0" cy="0" r="5" fill="url(#microWarmGlow)" />
              <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
            </g>

            <g transform="translate(220, 160)">
              <circle cx="0" cy="0" r="4.5" fill="url(#microGlow)" />
              <circle cx="0" cy="0" r="1.3" fill="#ffffff" />
            </g>

            {/* Pleiades / Gugusan Sekitar */}
            <g transform="translate(255, 65)"><circle cx="0" cy="0" r="3.5" fill="url(#microGlow)" /><circle cx="0" cy="0" r="1" fill="#ffffff" /></g>
            <g transform="translate(268, 54)"><circle cx="0" cy="0" r="3" fill="url(#microGlow)" /><circle cx="0" cy="0" r="0.8" fill="#dbeafe" /></g>
            <g transform="translate(275, 72)"><circle cx="0" cy="0" r="3.2" fill="url(#microGlow)" /><circle cx="0" cy="0" r="0.9" fill="#bfdbfe" /></g>
            <g transform="translate(260, 80)"><circle cx="0" cy="0" r="2.8" fill="url(#microGlow)" /><circle cx="0" cy="0" r="0.7" fill="#bfdbfe" /></g>
          </g>

          {/* Bintang Pendukung dengan Kedip Halus */}
          <g>
            <g transform="translate(185, 90)" className="animate-pulse" style={{ animationDuration: '3.5s' }}>
              <circle cx="0" cy="0" r="3.5" fill="url(#microGlow)" />
              <circle cx="0" cy="0" r="1" fill="#ffffff" />
            </g>

            <g transform="translate(100, 115)" className="animate-pulse" style={{ animationDuration: '4.5s' }}>
              <circle cx="0" cy="0" r="3" fill="url(#microGlow)" />
              <circle cx="0" cy="0" r="0.9" fill="#ffffff" />
            </g>

            <g transform="translate(75, 150)" className="animate-pulse" style={{ animationDuration: '4s' }}>
              <circle cx="0" cy="0" r="4" fill="url(#microGlow)" />
              <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
            </g>

            <g transform="translate(165, 175)" className="animate-pulse" style={{ animationDuration: '5s' }}>
              <circle cx="0" cy="0" r="3" fill="url(#microGlow)" />
              <circle cx="0" cy="0" r="0.9" fill="#ffffff" />
            </g>
          </g>

          {/* Debu Bintang / Titik-titik Kecil Natural */}
          <g opacity="0.8">
            <circle cx="125" cy="90" r="0.8" fill="#ffffff" />
            <circle cx="205" cy="110" r="0.6" fill="#93c5fd" />
            <circle cx="155" cy="140" r="0.9" fill="#ffffff" />
            <circle cx="90" cy="125" r="0.5" fill="#ffffff" />
            <circle cx="225" cy="115" r="0.7" fill="#bfdbfe" />
            <circle cx="180" cy="70" r="0.5" fill="#ffffff" />
            <circle cx="240" cy="140" r="0.8" fill="#93c5fd" />
          </g>

        </svg>
      </div>
      
      {/* 3 Komet Melaju Cepat dengan Jeda Waktu Bergantian */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="comet-fast-1" />
        <div className="comet-fast-2" />
        <div className="comet-fast-3" />
      </div>

      {/* Konten Utama Aplikasi */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}