'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import SpaceBackground from '@/components/SpaceBackground';
import { API_URL } from '@/utils/api';

export default function LoginPage() {
  const router = useRouter();
  
  const [selectedRole, setSelectedRole] = useState<'TEACHER' | 'STUDENT'>('TEACHER');
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);

  const [fullName, setFullName] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const showMsg = (text: string, type: 'success' | 'error' = 'error') => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleGoogleResponse = async (response: any) => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_URL}/api/auth/google-teacher-login`, {
        credential: response.credential,
      });

      const { token, role, name } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);

      showMsg('Login Google Berhasil! Mengalihkan...', 'success');
      setTimeout(() => {
        if (role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else {
          router.push('/teacher/dashboard');
        }
      }, 800);
    } catch (err: any) {
      showMsg(err.response?.data?.message || 'Autentikasi Google gagal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        const googleButtonContainer = document.getElementById('googleButtonDiv');
        if (googleButtonContainer) {
          googleButtonContainer.innerHTML = '';
          (window as any).google.accounts.id.renderButton(googleButtonContainer, {
            theme: 'filled_white',
            size: 'large',
            width: googleButtonContainer.offsetWidth || 320,
            text: 'signin_with',
            locale: 'id',
          });
        }
      }
    };
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [selectedRole, isRegisterMode]);

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (selectedRole === 'STUDENT') {
        const res = await axios.post(`${API_URL}/api/auth/login`, {
          username: usernameInput.trim(),
          password
        });

        const { token, role, name } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('role', role || 'STUDENT');
        localStorage.setItem('name', name || usernameInput);

        showMsg('Login siswa berhasil! Mengalihkan...', 'success');
        setTimeout(() => {
          router.push('/student/dashboard');
        }, 800);

      } else {
        if (isRegisterMode) {
          await axios.post(`${API_URL}/api/auth/register-teacher`, {
            name: fullName.trim(),
            username: usernameInput.trim(),
            email: emailInput.trim(),
            password
          });
          showMsg('Registrasi pengajar berhasil! Silakan login.', 'success');
          setIsRegisterMode(false);
          setPassword('');
          setUsernameInput('');
          setEmailInput('');
          setFullName('');
        } else {
          const res = await axios.post(`${API_URL}/api/auth/login`, {
            username: usernameInput.trim(),
            password
          });

          const { token, role, name } = res.data;
          localStorage.setItem('token', token);
          localStorage.setItem('role', role || 'TEACHER');
          localStorage.setItem('name', name || usernameInput);

          showMsg('Login pengajar berhasil! Mengalihkan...', 'success');
          setTimeout(() => {
            if (role === 'ADMIN') {
              router.push('/admin/dashboard');
            } else {
              router.push('/teacher/dashboard');
            }
          }, 800);
        }
      }
    } catch (err: any) {
      const errMessage = err.response?.data?.message || err.message || 'Username atau password salah.';
      showMsg(errMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SpaceBackground>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-x-hidden">
        <div className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 my-auto">
          
          <div className="text-center space-y-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-white">Aplikasi Ujian Sekolah CBT</h1>
            <p className="text-xs text-slate-400">Silakan pilih akses masuk Anda</p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('TEACHER');
                setIsRegisterMode(false);
                setMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition ${selectedRole === 'TEACHER' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Pengajar
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('STUDENT');
                setIsRegisterMode(false);
                setMessage(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-bold transition ${selectedRole === 'STUDENT' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Siswa
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-xs font-semibold border ${message.type === 'success' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'}`}>
              {message.text}
            </div>
          )}

          {selectedRole === 'TEACHER' && !isRegisterMode && (
            <div className="space-y-4">
              <div className="flex justify-center w-full overflow-hidden [&>div]:w-full">
                <div id="googleButtonDiv" className="flex justify-center w-full"></div>
              </div>

              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="px-3 text-[10px] text-slate-500 font-semibold uppercase">Atau Masuk Manual</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleLoginOrRegister} className="space-y-4" autoComplete="off" spellCheck="false">
            
            {selectedRole === 'TEACHER' && isRegisterMode && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder=""
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder=""
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder=""
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {(!isRegisterMode || selectedRole === 'STUDENT') && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder=""
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl shadow-lg transition active:scale-[0.98]"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {selectedRole === 'TEACHER' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegisterMode(!isRegisterMode);
                  setMessage(null);
                }}
                className="text-xs text-blue-400 hover:underline font-semibold"
              >
                {isRegisterMode ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun pengajar? Daftar'}
              </button>
            </div>
          )}

        </div>
      </div>
    </SpaceBackground>
  );
}