"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION } from "@/lib/app-config";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Silakan masukkan username");
      return;
    }
    if (!password.trim()) {
      setError("Silakan masukkan password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(username.trim(), password);
      router.push("/dashboard/shipment-laut");
    } catch (err: any) {
      setError(err?.message || "Login gagal, periksa username dan password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(26,86,219,.2),_transparent_34%),linear-gradient(135deg,_#0f172a_0%,_#1e3a5f_35%,_#0d9488_100%)] flex items-center justify-center text-white p-4">
      <div className="w-full max-w-md">
        <div className="glass overflow-hidden rounded-3xl p-6 text-slate-900 shadow-soft sm:p-8">
          <div className="mb-6 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-3 sm:mb-4 overflow-hidden">
              <img alt="Logo" className="w-full h-full object-contain" src={`/logo.png?v=${APP_VERSION}`} />
            </div>
            <h2 className="text-2xl font-bold">Monitoring Shipment</h2>
            <p className="mt-2 text-sm text-slate-500">PT. Semen Tonasa / SBI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <input
                  type="text"
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] sm:text-xs">
              <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-blue-600 w-3 h-3 sm:w-3.5 sm:h-3.5"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Ingat saya
              </label>
              <button
                type="button"
                onClick={() => alert("Hubungi admin untuk reset password")}
                className="text-blue-600 font-medium hover:underline whitespace-nowrap ml-2"
              >
                Lupa password?
              </button>
            </div>
            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="block w-full rounded-2xl bg-gradient-to-r from-[#1a56db] to-emerald-500 px-4 py-3 text-center font-semibold text-white shadow-lg transition-all duration-200 hover:opacity-95 disabled:opacity-60 btn-glow"
            >
              <span>{loading ? "Memproses..." : "Masuk"}</span>
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3">
            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  if ("serviceWorker" in navigator) {
                    navigator.serviceWorker.register("/sw.js").then(() => {
                      alert('Aplikasi siap diinstall! Gunakan menu "Install" di browser Anda.');
                    }).catch(() => {
                      alert("Gagal registrasi service worker.");
                    });
                  } else {
                    alert("Browser Anda tidak mendukung installasi PWA.");
                  }
                }}
                className="w-full py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl font-medium text-sm hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smartphone group-hover:animate-bounce">
                  <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                  <path d="M12 18h.01"></path>
                </svg>
                Install Infra Pocket
              </button>
            </div>
            <div className="text-center text-xs text-slate-500">
              © 2026 Dept. of Infrastructure — design by NUI6184
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}