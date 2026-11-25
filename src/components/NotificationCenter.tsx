import { useState } from 'react';
import { Bell, BookOpen, CalendarCheck, Check, Megaphone, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { markNotificationRead } from '../services/schoolService';
import { NotificationRecord, NotificationType } from '../types/school';

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
          <span className="font-mono text-xs font-semibold text-[#064E3B] tabular-nums">
            ({unreadCount})
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

            <div className="px-4 py-2.5 border-t border-[#EAE6DB] bg-[#F5F3EC]">
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
  const uid = firebaseUser?.uid || '';

  const filtered = notifications.filter((n) =>
    filterType === 'semua' ? true : n.type === filterType
  );

  const handleMarkAllRead = async () => {
    if (!uid) return;
    const unread = filtered.filter((n) => !isNotifRead(n, uid));
    await Promise.all(unread.map((n) => markNotificationRead(n, uid)));
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
