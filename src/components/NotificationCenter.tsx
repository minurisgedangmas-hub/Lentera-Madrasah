import { useState } from 'react';
import {
  Bell,
  BellRing,
  BookOpen,
  CalendarCheck,
  Check,
  Megaphone,
  Smartphone,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { markNotificationRead } from '../services/schoolService';
import { NotificationRecord, NotificationType } from '../types/school';
import {
  getBrowserNotificationPermission,
  isAppBadgeSupported,
  isExternalNotifEnabled,
  requestBrowserNotificationPermission,
  setExternalNotifEnabled,
  showExternalSystemNotification,
  syncAppBadge,
} from '../utils/externalNotifications';

function isNotifRead(n: NotificationRecord, uid: string): boolean {
  if (n.isBroadcast) {
    return (n.readByUids || []).includes(uid);
  }
  return n.isRead;
}

function notifTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'nilai':
      return 'Nilai';
    case 'absensi':
      return 'Absensi';
    case 'pengumuman':
      return 'Pengumuman';
  }
}

function NotifIcon({ type }: { type: NotificationType }) {
  if (type === 'nilai') {
    return (
      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
        <BookOpen className="w-4 h-4" />
      </div>
    );
  }
  if (type === 'absensi') {
    return (
      <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
        <CalendarCheck className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
      <Megaphone className="w-4 h-4" />
    </div>
  );
}

function formatTime(n: NotificationRecord): string {
  if (!n.createdAt?.toDate) return 'Baru saja';
  return n.createdAt.toDate().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NotificationToast({
  notification,
  onDismiss,
  onOpenCenter,
}: {
  notification: NotificationRecord | null;
  onDismiss: () => void;
  onOpenCenter: () => void;
}) {
  if (!notification) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100%-2.5rem)] bg-[#FCFBF8] border border-[#D4CFC2] rounded-xl shadow-lg p-4">
      <div className="flex items-start gap-3">
        <NotifIcon type={notification.type} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#064E3B]">
              Notifikasi Baru · {notifTypeLabel(notification.type)}
            </span>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Tutup notifikasi"
              className="text-[#8A928C] hover:text-[#111C18] p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm font-semibold text-[#111C18] mt-0.5 truncate">
            {notification.title}
          </p>
          <p className="text-xs text-[#4A5550] mt-1 line-clamp-2">{notification.message}</p>
          <button
            type="button"
            onClick={() => {
              onDismiss();
              onOpenCenter();
            }}
            className="mt-2 text-xs font-medium text-[#064E3B] hover:text-[#04392B] cursor-pointer"
          >
            Lihat Semua Notifikasi
          </button>
        </div>
      </div>
    </div>
  );
}

export function NotificationBellPopover({
  notifications,
  unreadCount,
  onOpenAll,
}: {
  notifications: NotificationRecord[];
  unreadCount: number;
  onOpenAll: () => void;
}) {
  const { firebaseUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState(() => getBrowserNotificationPermission());
  const uid = firebaseUser?.uid || '';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Buka notifikasi"
        className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-[#111C18] hover:bg-[#F5F3EC] transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <Bell className="w-4 h-4 text-[#064E3B]" />
        <span className="text-xs font-medium hidden sm:inline">Notifikasi</span>
        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md bg-gradient-to-r from-rose-600 to-red-600 text-white font-mono text-[11px] font-bold tabular-nums shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FCFBF8] border border-[#D4CFC2] rounded-xl shadow-lg z-40 overflow-hidden">
            <div className="px-4 py-3 bg-[#F5F3EC] border-b border-[#EAE6DB] flex items-center justify-between">
              <span className="text-sm font-semibold text-[#111C18]">
                Notifikasi Real-Time
              </span>
              <span className="font-mono text-xs text-[#5C6660] tabular-nums">
                {unreadCount} belum dibaca
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#EFECE2]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#5C6660]">
                  Belum ada notifikasi masuk.
                </div>
              ) : (
                notifications.slice(0, 6).map((n) => {
                  const read = isNotifRead(n, uid);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        if (!read && uid) void markNotificationRead(n, uid);
                      }}
                      className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                        read ? 'bg-[#FCFBF8] hover:bg-[#F5F3EC]' : 'bg-[#EEF5F1] hover:bg-[#E4EFE9]'
                      }`}
                    >
                      <NotifIcon type={n.type} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 text-xs text-[#5C6660]">
                          <span>{notifTypeLabel(n.type)}</span>
                          <span className="font-mono tabular-nums">{formatTime(n)}</span>
                        </div>
                        <p className="text-sm font-medium text-[#111C18] truncate mt-0.5">
                          {n.title}
                        </p>
                        <p className="text-xs text-[#4A5550] line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-[#EAE6DB] bg-[#F5F3EC] space-y-2">
              {perm === 'default' && (
                <button
                  type="button"
                  onClick={async () => {
                    const next = await requestBrowserNotificationPermission();
                    setPerm(next);
                    if (next === 'granted') {
                      await showExternalSystemNotification(
                        {
                          title: 'Lentera Madrasah',
                          message: 'Notifikasi perangkat & angka lencana ikon berhasil diaktifkan.',
                        },
                        unreadCount
                      );
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold hover:from-emerald-500 hover:to-teal-500 transition-colors cursor-pointer"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Aktifkan Notif Perangkat &amp; Angka Ikon</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenAll();
                }}
                className="w-full text-center text-xs font-medium text-[#064E3B] hover:text-[#04392B] py-1 cursor-pointer"
              >
                Buka Pusat Notifikasi Lengkap
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function NotificationCenterPage({
  notifications,
}: {
  notifications: NotificationRecord[];
}) {
  const { firebaseUser } = useAuth();
  const [filterType, setFilterType] = useState<'semua' | NotificationType>('semua');
  const [permission, setPermission] = useState(() => getBrowserNotificationPermission());
  const [externalEnabled, setExternalEnabled] = useState(() => isExternalNotifEnabled());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const badgeSupported = isAppBadgeSupported();
  const uid = firebaseUser?.uid || '';

  const unreadTotal = notifications.filter((n) => !isNotifRead(n, uid)).length;

  const filtered = notifications.filter((n) =>
    filterType === 'semua' ? true : n.type === filterType
  );

  const handleMarkAllRead = async () => {
    if (!uid) return;
    const unread = filtered.filter((n) => !isNotifRead(n, uid));
    await Promise.all(unread.map((n) => markNotificationRead(n, uid)));
  };

  const handleEnableExternalNotif = async () => {
    const result = await requestBrowserNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setExternalEnabled(true);
      await syncAppBadge(unreadTotal);
      await showExternalSystemNotification(
        {
          title: 'Lentera Madrasah',
          message:
            unreadTotal > 0
              ? `Notifikasi aktif! Saat ini ada ${unreadTotal} pemberitahuan belum dibaca.`
              : 'Notifikasi perangkat aktif. Pemberitahuan baru akan muncul di luar aplikasi.',
        },
        unreadTotal
      );
      setStatusMessage(
        'Izin notifikasi perangkat aktif! Angka lencana ikon aplikasi & judul tab otomatis mengikuti jumlah notifikasi yang belum dibaca.'
      );
    } else if (result === 'denied') {
      setStatusMessage(
        'Izin notifikasi ditolak di browser. Aktifkan izin Notifikasi lewat ikon gembok / Setelan Situs di browser Anda.'
      );
    } else {
      setStatusMessage(
        'Browser atau jendela pratinjau saat ini membatasi dialog izin notifikasi. Buka aplikasi di tab browser utama atau instal sebagai aplikasi (PWA).'
      );
    }
  };

  const handleToggleExternal = (next: boolean) => {
    setExternalEnabled(next);
    setExternalNotifEnabled(next);
    setStatusMessage(
      next
        ? 'Notifikasi perangkat otomatis saat ada pemberitahuan baru diaktifkan.'
        : 'Notifikasi popup perangkat dimatikan (angka lencana ikon tetap disinkronkan).'
    );
  };

  const handleTestNotification = async () => {
    const testCount = unreadTotal > 0 ? unreadTotal : 1;
    await syncAppBadge(testCount);
    const shown = await showExternalSystemNotification(
      {
        title: 'Tes Notifikasi Lentera Madrasah',
        message: `Terdapat ${testCount} pemberitahuan baru dari madrasah.`,
      },
      testCount
    );
    setStatusMessage(
      shown
        ? `Notifikasi perangkat & angka lencana (${testCount}) berhasil dikirim! Jika sebelumnya 0 belum dibaca, angka lencana akan kembali ke ${unreadTotal} saat data disinkronkan.`
        : 'Tidak dapat menampilkan notifikasi perangkat dari konteks ini. Pastikan izin notifikasi browser aktif dan aplikasi dibuka di tab penuh / terinstal (PWA).'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#111C18]">
            Pusat Notifikasi Real-Time
          </h1>
          <p className="text-sm text-[#4A5550] mt-1">
            Pembaruan otomatis untuk nilai mata pelajaran, absensi harian, dan pengumuman kegiatan madrasah.
          </p>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-[#111C18] text-sm font-medium hover:bg-[#F5F3EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Check className="w-4 h-4 text-[#064E3B]" />
          <span>Tandai Semua Dibaca</span>
        </button>
      </div>

      {/* External Device Notification & App Icon Badge Card */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-2xl p-5 sm:p-6 border border-[#144D3C] shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#F3D88B]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-white">
                  Notifikasi Luar Aplikasi &amp; Angka Lencana Ikon ({unreadTotal})
                </h2>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                    permission === 'granted'
                      ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                      : permission === 'denied'
                      ? 'bg-rose-500/25 text-rose-200 border border-rose-400/40'
                      : 'bg-amber-400/25 text-amber-200 border border-amber-300/40'
                  }`}
                >
                  {permission === 'granted'
                    ? 'Izin Perangkat Aktif'
                    : permission === 'denied'
                    ? 'Izin Diblokir Browser'
                    : permission === 'unsupported'
                    ? 'Browser Tidak Mendukung'
                    : 'Belum Diaktifkan'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#D4E7E0] mt-1 leading-relaxed">
                Saat aplikasi sudah diinstal (PWA) ke layar utama HP atau desktop, jumlah notifikasi belum dibaca akan otomatis muncul sebagai angka/titik lencana pada ikon aplikasi dan judul tab browser, disertai notifikasi sistem ketika pemberitahuan baru masuk.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {permission === 'default' && (
              <button
                type="button"
                onClick={handleEnableExternalNotif}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs sm:text-sm font-bold hover:from-amber-300 hover:to-yellow-300 shadow-sm cursor-pointer whitespace-nowrap"
              >
                <BellRing className="w-4 h-4" />
                <span>Aktifkan Notif &amp; Angka Ikon</span>
              </button>
            )}

            {permission === 'granted' && (
              <>
                <button
                  type="button"
                  onClick={() => handleToggleExternal(!externalEnabled)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    externalEnabled
                      ? 'bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500'
                      : 'bg-[#0B3A2C] text-[#C6DDD4] border-[#2C6B57] hover:bg-[#104A39]'
                  }`}
                >
                  <span>Notif Otomatis: {externalEnabled ? 'Aktif' : 'Nonaktif'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 text-xs font-bold hover:from-amber-300 hover:to-yellow-300 cursor-pointer whitespace-nowrap"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Uji Notifikasi</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#185745] text-xs text-[#C6DDD4]">
          <p>
            <strong className="text-[#F3D88B]">Status Lencana Ikon (Badging API):</strong>{' '}
            {badgeSupported
              ? 'Didukung perangkat ini — angka belum dibaca disinkronkan ke ikon aplikasi terinstal.'
              : 'Perangkat menampilkan lencana melalui notifikasi aktif / judul tab browser.'}
          </p>
          <p>
            <strong className="text-[#F3D88B]">Catatan Penting:</strong> Notifikasi &amp; angka ikon berjalan real-time selama aplikasi terpasang/terbuka di latar belakang; agar masuk saat aplikasi tertutup penuh 24 jam dibutuhkan server Push (FCM).
          </p>
        </div>

        {statusMessage && (
          <div className="px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-xs text-[#FAF8F2]">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Segmented Filter Control */}
      <div className="inline-flex items-center gap-1 p-1 bg-[#E9E6DC] rounded-lg border border-[#D8D3C6]">
        {(
          [
            ['semua', 'Semua'],
            ['nilai', 'Nilai'],
            ['absensi', 'Absensi'],
            ['pengumuman', 'Pengumuman'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterType(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              filterType === key
                ? 'bg-[#064E3B] text-[#FAF8F2]'
                : 'text-[#4A5550] hover:text-[#111C18]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden divide-y divide-[#EFECE2]">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-8 h-8 text-[#8A928C] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#111C18]">Belum ada notifikasi pada kategori ini</p>
            <p className="text-xs text-[#5C6660] mt-1">
              Notifikasi akan muncul seketika saat guru menginput nilai, absensi, atau pengumuman baru.
            </p>
          </div>
        ) : (
          filtered.map((n) => {
            const read = isNotifRead(n, uid);
            return (
              <div
                key={n.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  read ? 'bg-[#FCFBF8]' : 'bg-[#EEF5F1]/80'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <NotifIcon type={n.type} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5C6660] mb-1">
                      <span className="font-medium text-[#111C18]">{notifTypeLabel(n.type)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Oleh {n.senderName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatTime(n)}</span>
                      {!read && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-[#064E3B]">Belum dibaca</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[#111C18]">{n.title}</h3>
                    <p className="text-sm text-[#4A5550] mt-1 leading-relaxed">{n.message}</p>
                  </div>
                </div>

                {!read && uid && (
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(n, uid)}
                    className="px-3 py-1.5 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-xs font-medium text-[#111C18] hover:bg-[#F5F3EC] whitespace-nowrap shrink-0 cursor-pointer self-start"
                  >
                    Tandai Dibaca
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
