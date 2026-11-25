import { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#D4A74A] bg-[#D4A74A]/15 text-[#062C21] font-semibold hover:bg-[#D4A74A]/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
        }`}
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#064E3B]" />
        <span>Instal Aplikasi</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-[#064E3B] font-semibold hover:bg-[#F5F3EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs sm:text-sm'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Pasang Aplikasi</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#FCFBF8] border border-[#DDD9CE] p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-[#062C21]">
                  Pasang di iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Tutup panduan"
                  className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[#064E3B]">1.</span>
                  <span>
                    Ketuk ikon <strong className="inline-flex items-center gap-1 text-slate-900"><Share className="w-3.5 h-3.5 inline" /> Bagikan (Share)</strong> di bilah Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[#064E3B]">2.</span>
                  <span>
                    Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-[#064E3B] py-2.5 text-sm font-semibold text-[#FAF8F2] hover:bg-[#04392B] transition-colors cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg border border-amber-500">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode Offline — Menampilkan data tersimpan</span>
    </div>
  );
}
