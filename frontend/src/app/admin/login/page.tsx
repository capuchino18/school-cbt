'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/utils/api';

export default function AdminGoogleLogin() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    // Inisialisasi Google One Tap / Button SDK
    const initGoogleSDK = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleResponse,
        });

        (window as any).google.accounts.id.renderButton(
          document.getElementById('googleSignInBtn'),
          { theme: 'filled_blue', size: 'large', width: '320', text: 'signin_with' }
        );
      }
    };

    if (!(window as any).google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogleSDK;
      document.body.appendChild(script);
    } else {
      initGoogleSDK();
    }
  }, [googleClientId]);

  const handleGoogleResponse = async (response: any) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await axios.post(`${API_URL}/api/auth/google-admin-login`, {
        credential: response.credential,
      });

      const { token, role, name, email } = res.data;

      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      localStorage.setItem('email', email);

      alert(`✅ Login Admin Berhasil!\nSelamat datang, ${name} (${email})`);
      router.push('/teacher/dashboard'); // Arahkan ke Dashboard
    } catch (err: any) {
      console.error('Login Admin Error:', err);
      setErrorMsg(err.response?.data?.message || 'Gagal login via Google. Pastikan email Anda terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
      <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
            🛡️
          </div>
          <h1 className="text-xl font-bold text-white">Portal Administrator CBT</h1>
          <p className="text-slate-400 text-xs">
            Khusus Akun Google Admin Terverifikasi (Whitelist)
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl text-left">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="flex justify-center py-4">
          <div id="googleSignInBtn"></div>
        </div>

        {loading && (
          <p className="text-xs text-blue-400 font-semibold animate-pulse">
            Memverifikasi kredensial Google Admin...
          </p>
        )}

        <div className="pt-4 border-t border-slate-700/60 text-[11px] text-slate-500">
          Akses terbatas. Hanya 3 email Google terdaftar yang dapat masuk.
        </div>
      </div>
    </div>
  );
}