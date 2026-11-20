"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Smartphone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { APP_VERSION, APP_NAME } from "@/lib/app-config";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installHint, setInstallHint] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  const isStandalone = () =>
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  const isIOS = () => {
    if (typeof navigator === "undefined") return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)
    );
  };

  useEffect(() => {
    const w = window as any;

    if (isStandalone() || w.__pwaInstalled) {
      setIsInstalled(true);
      return;
    }

    // Event mungkin sudah tertangkap script di <head> sebelum hydrate
    if (w.__deferredInstallPrompt) setDeferredPrompt(w.__deferredInstallPrompt);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      w.__deferredInstallPrompt = e;
      setDeferredPrompt(e);
    };
    const onInstallable = () => {
      if (w.__deferredInstallPrompt) setDeferredPrompt(w.__deferredInstallPrompt);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setInstallHint(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("pwa-installed", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pwa-installed", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const w = window as any;

    if (isStandalone() || w.__pwaInstalled) {
      setIsInstalled(true);
      return;
    }

    const prompt = deferredPrompt || w.__deferredInstallPrompt;

    // Tanpa prompt dari browser, install programatik tidak mungkin dilakukan
    if (!prompt) {
      setInstallHint(
        isIOS()
          ? "iPhone/iPad belum mengizinkan install otomatis. Ketuk Bagikan (⬆️) → “Tambahkan ke Layar Utama” sekali saja."
          : "Browser ini belum mengizinkan install otomatis. Pastikan dibuka lewat HTTPS di Chrome/Edge (Android/desktop), lalu coba lagi."
      );
      return;
    }

    setInstallHint(null);
    setInstalling(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") setIsInstalled(true);
      // Prompt hanya bisa dipakai sekali
      w.__deferredInstallPrompt = null;
      setDeferredPrompt(null);
    } catch {
      setInstallHint("Install dibatalkan atau tidak didukung browser ini. Coba lagi setelah halaman dimuat ulang.");
    } finally {
      setInstalling(false);
    }
  };

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      {/* Background decorations */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-5 sm:p-8 md:p-10 shadow-2xl border border-white/20 animate-[slideUp_0.5s_ease-out]">
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-[110px] sm:w-[122px] md:w-[135px] mx-auto">
              <img src={`/logo-login.png?v=${APP_VERSION}`} alt="SIMIRA" className="w-full h-auto object-contain" />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm mb-5">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Username</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Masukkan password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] sm:text-xs">
              <label className="flex items-center gap-1.5 text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-blue-600 w-3 h-3 sm:w-3.5 sm:h-3.5"
                />
                Ingat saya
              </label>
              <button type="button" onClick={() => alert("Hubungi admin untuk reset password")} className="text-blue-600 font-medium hover:underline whitespace-nowrap ml-2">
                Lupa password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-glow w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              <span className={`${loading ? "opacity-0" : ""}`}>
                {loading ? "" : "Masuk"}
              </span>
              {loading && (
                <svg className="animate-spin h-5 w-5 absolute" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
            </button>
          </form>

          {/* PWA Install */}
          {!isInstalled && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                className="w-full py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl font-medium text-sm hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60"
              >
                <Smartphone size={16} className="group-hover:animate-bounce" />
                {installing ? "Memproses..." : `Install ${APP_NAME}`}
              </button>

              {installHint && (
                <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] sm:text-xs text-blue-900 leading-relaxed">
                  {installHint}
                </p>
              )}
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400 mt-4">&copy; 2026 SIMIRA — design by NUI6184</p>
        </div>
      </div>
    </div>
  );
}
