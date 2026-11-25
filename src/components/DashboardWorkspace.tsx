import { useMemo, useState } from 'react';
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Compass,
  Database,
  ExternalLink,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PiggyBank,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSchoolData } from '../hooks/useSchoolData';
import { seedSampleSchoolData } from '../services/schoolService';
import { FinanceClassLevel, MadrasahIdentity, PortalPreviewMode } from '../types/school';
import { AdminManagementView } from './AdminManagementView';
import { AnnouncementsView } from './AnnouncementsView';
import {
  CLASS_LEVELS_1_TO_6,
  FinanceManagementView,
  KeuanganSubmenu,
} from './FinanceManagementView';
import { IdentitasMadrasahView } from './IdentitasMadrasahView';
import { MadrasahLogo } from './MadrasahEmblem';
import { PWAInstallButton } from './PWAInstallButton';
import {
  NotificationBellPopover,
  NotificationCenterPage,
  NotificationToast,
} from './NotificationCenter';
import { SiswaSubmenu, StudentManagementView } from './StudentManagementView';
import { StudentParentPortalView } from './StudentParentPortalView';
import { GuruSubmenu, TeacherDirectoryView } from './TeacherDirectoryView';
import { AbsensiPreviewView } from './TeacherPortalViews';

type NavTab =
  | 'overview'
  | 'identitas'
  | 'guru'
  | 'data_siswa'
  | 'absensi'
  | 'keuangan'
  | 'pengumuman'
  | 'notifikasi'
  | 'admin';

const KEUANGAN_SUBMENUS: Array<{
  id: KeuanganSubmenu;
  label: string;
  classItemPrefix: string;
  hasClassSubmenus: boolean;
  icon: typeof Wallet;
}> = [
  { id: 'kas_kelas', label: 'KAS Kelas 1-6', classItemPrefix: 'Kas', hasClassSubmenus: true, icon: Wallet },
  {
    id: 'tabungan_siswa',
    label: 'Tabungan Siswa Kelas 1-6',
    classItemPrefix: 'Tabungan',
    hasClassSubmenus: true,
    icon: PiggyBank,
  },
  {
    id: 'tabungan_wajib_6',
    label: 'Tabungan Wajib Kelas 6',
    classItemPrefix: 'Tabungan Wajib',
    hasClassSubmenus: false,
    icon: ShieldCheck,
  },
  {
    id: 'pembayaran_kursus',
    label: 'Pembayaran Kursus',
    classItemPrefix: 'Kursus',
    hasClassSubmenus: true,
    icon: BookOpenCheck,
  },
  {
    id: 'ekstra_pramuka',
    label: 'Kegiatan Ekstra Pramuka',
    classItemPrefix: 'Pramuka',
    hasClassSubmenus: true,
    icon: Compass,
  },
];

export function DashboardWorkspace() {
  const { firebaseUser, profile, previewMode, setPreviewMode, effectiveRole, signOut } = useAuth();
  const {
    madrasahIdentity,
    classes,
    students,
    attendance,
    announcements,
    notifications,
    unreadCount,
    allUsers,
    roleInvites,
    teachers,
    studentMutations,
    financeTransactions,
    attendanceReportLinks,
    loading,
    latestToast,
    dismissToast,
  } = useSchoolData();

  const [activeTab, setActiveTab] = useState<NavTab>('pengumuman');
  const [guruSubmenu, setGuruSubmenu] = useState<GuruSubmenu>('direktori');
  const [siswaSubmenu, setSiswaSubmenu] = useState<SiswaSubmenu>('daftar');
  const [keuanganSubmenu, setKeuanganSubmenu] = useState<KeuanganSubmenu | null>(null);
  const [keuanganClassLevel, setKeuanganClassLevel] = useState<FinanceClassLevel | null>(null);
  const [keuanganMenuOpen, setKeuanganMenuOpen] = useState(false);
  const [expandedFinanceCategory, setExpandedFinanceCategory] = useState<KeuanganSubmenu | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const isAdminAccount = profile?.role === 'admin';
  const canTeach = effectiveRole === 'guru' || effectiveRole === 'admin';

  const navItems = useMemo(() => {
    if (effectiveRole === 'siswa' || effectiveRole === 'orangtua') {
      return [
        { id: 'pengumuman' as NavTab, label: 'Pengumuman Kegiatan', icon: Megaphone },
        { id: 'overview' as NavTab, label: 'Ringkasan Akademik MI', icon: LayoutDashboard },
        { id: 'identitas' as NavTab, label: 'Identitas Madrasah', icon: Landmark },
        { id: 'notifikasi' as NavTab, label: 'Notifikasi Real-Time', icon: Bell },
      ];
    }

    const items: Array<{ id: NavTab; label: string; icon: typeof LayoutDashboard }> = [
      { id: 'pengumuman', label: 'Pengumuman Kegiatan', icon: Megaphone },
      { id: 'overview', label: 'Ringkasan Madrasah', icon: LayoutDashboard },
      { id: 'identitas', label: 'Identitas Madrasah', icon: Landmark },
      ...(isAdminAccount
        ? [{ id: 'guru' as NavTab, label: 'Data Guru', icon: GraduationCap }]
        : []),
      { id: 'data_siswa', label: 'Data Siswa', icon: Users },
      { id: 'absensi', label: 'Laporan Absensi', icon: CalendarCheck },
      { id: 'keuangan', label: 'Keuangan Madrasah', icon: Wallet },
      { id: 'notifikasi', label: 'Notifikasi Real-Time', icon: Bell },
    ];

    if (isAdminAccount) {
      items.push({ id: 'admin', label: 'Kelola Peran & Akses', icon: Shield });
    }
    return items;
  }, [effectiveRole, isAdminAccount]);

  const handleModeChange = (mode: PortalPreviewMode) => {
    setPreviewMode(mode);
    setActiveTab('pengumuman');
    setKeuanganSubmenu(null);
    setKeuanganClassLevel(null);
    setKeuanganMenuOpen(false);
    setExpandedFinanceCategory(null);
  };

  const handleQuickSeed = async () => {
    if (!firebaseUser || !profile) return;
    setSeeding(true);
    try {
      await seedSampleSchoolData(firebaseUser.uid, profile.displayName);
    } finally {
      setSeeding(false);
    }
  };

  const portalLabel =
    effectiveRole === 'guru'
      ? 'Portal Guru'
      : effectiveRole === 'siswa'
      ? 'Portal Siswa'
      : effectiveRole === 'orangtua'
      ? 'Portal Orang Tua'
      : 'Panel Admin';

  const activeNavLabel =
    activeTab === 'guru'
      ? guruSubmenu === 'wali_kelas'
        ? 'Data Guru / Pengaturan Wali Kelas'
        : 'Data Guru / Direktori Guru'
      : activeTab === 'data_siswa'
      ? siswaSubmenu === 'mutasi'
        ? 'Data Siswa / Mutasi Keluar & Masuk'
        : siswaSubmenu === 'kenaikan'
        ? 'Data Siswa / Kenaikan Kelas'
        : siswaSubmenu === 'alumni'
        ? 'Data Siswa / Alumni'
        : 'Data Siswa / Daftar Siswa'
      : activeTab === 'keuangan'
      ? keuanganSubmenu
        ? `Keuangan Madrasah / ${KEUANGAN_SUBMENUS.find((s) => s.id === keuanganSubmenu)?.label || ''}${
            keuanganClassLevel && keuanganSubmenu !== 'tabungan_wajib_6'
              ? ` / ${keuanganClassLevel}`
              : ''
          }`
        : 'Keuangan Madrasah'
      : navItems.find((i) => i.id === activeTab)?.label || 'Ringkasan';

  return (
    <div className="min-h-screen bg-[#F1F0EA] flex">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar (260px Deep Forest Emerald) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#062C21] bg-madrasah-lattice-dark text-[#E6F1EC] border-r border-[#144D3C] flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-[#165341] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <MadrasahLogo
              logoUrl={madrasahIdentity?.logoUrl}
              alt={madrasahIdentity?.namaMadrasah || 'Logo Madrasah'}
              className="w-9 h-9 shrink-0"
            />
            <div className="min-w-0">
              <span className="block font-display text-base font-bold text-[#FAF8F2] truncate leading-tight">
                Lentera Madrasah
              </span>
              <span className="block text-[11px] font-medium text-[#F3D88B] truncate mt-0.5">
                {madrasahIdentity?.namaMadrasah || 'Madrasah Ibtidaiyah (MI)'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
            className="lg:hidden p-1 text-[#B8D1C7] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#F3D88B]">
              Menu Utama Madrasah
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;

              if (item.id === 'keuangan') {
                return (
                  <div key={item.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTab === 'keuangan') {
                          setKeuanganMenuOpen((prev) => !prev);
                        } else {
                          setActiveTab('keuangan');
                          setKeuanganSubmenu(null);
                          setKeuanganClassLevel(null);
                          setKeuanganMenuOpen(true);
                          setExpandedFinanceCategory(null);
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#0F533F] text-[#FAF8F2] border border-[#2A7860]'
                          : 'text-[#C6DDD4] hover:bg-[#0B3C2E] hover:text-[#FAF8F2] border border-transparent'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            active ? 'text-[#F3D88B]' : 'text-[#8BB7A7]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {keuanganMenuOpen ? (
                        <ChevronDown className="w-4 h-4 shrink-0 text-[#F3D88B]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0 text-[#8BB7A7]" />
                      )}
                    </button>

                    {keuanganMenuOpen && (
                      <div className="ml-4 pl-3 border-l border-[#1C5E4A] space-y-1">
                        {KEUANGAN_SUBMENUS.map((sub) => {
                          const SubIcon = sub.icon;
                          const subActive = activeTab === 'keuangan' && keuanganSubmenu === sub.id;
                          const isCatExpanded = expandedFinanceCategory === sub.id;

                          if (!sub.hasClassSubmenus) {
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setActiveTab('keuangan');
                                  setKeuanganSubmenu(sub.id);
                                  setKeuanganClassLevel('Kelas 6');
                                  setExpandedFinanceCategory(null);
                                  setMobileMenuOpen(false);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                                  subActive
                                    ? 'bg-[#D4A74A] text-[#062C21] font-semibold'
                                    : 'text-[#B8D5CA] hover:bg-[#0B3C2E] hover:text-[#FAF8F2]'
                                }`}
                              >
                                <SubIcon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    subActive ? 'text-[#062C21]' : 'text-[#8BB7A7]'
                                  }`}
                                />
                                <span className="truncate">{sub.label}</span>
                              </button>
                            );
                          }

                          return (
                            <div key={sub.id} className="space-y-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('keuangan');
                                  setKeuanganSubmenu(sub.id);
                                  setKeuanganClassLevel(null);
                                  setExpandedFinanceCategory((prev) =>
                                    prev === sub.id ? null : sub.id
                                  );
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                                  subActive && !keuanganClassLevel
                                    ? 'bg-[#0F533F] text-[#FAF8F2] border border-[#2A7860]'
                                    : subActive
                                    ? 'bg-[#0B3C2E] text-[#F3D88B]'
                                    : 'text-[#B8D5CA] hover:bg-[#0B3C2E] hover:text-[#FAF8F2]'
                                }`}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <SubIcon
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      subActive ? 'text-[#F3D88B]' : 'text-[#8BB7A7]'
                                    }`}
                                  />
                                  <span className="truncate">{sub.label}</span>
                                </span>
                                {isCatExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#F3D88B]" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#8BB7A7]" />
                                )}
                              </button>

                              {isCatExpanded && (
                                <div className="ml-3 pl-2.5 border-l border-[#1C5E4A] flex flex-col gap-0.5">
                                  {CLASS_LEVELS_1_TO_6.map((cls) => {
                                    const clsActive = subActive && keuanganClassLevel === cls;
                                    return (
                                      <button
                                        key={cls}
                                        type="button"
                                        onClick={() => {
                                          setActiveTab('keuangan');
                                          setKeuanganSubmenu(sub.id);
                                          setKeuanganClassLevel(cls);
                                          setMobileMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                          clsActive
                                            ? 'bg-[#D4A74A] text-[#062C21] font-semibold'
                                            : 'text-[#B8D5CA] hover:bg-[#0B3C2E] hover:text-[#FAF8F2]'
                                        }`}
                                      >
                                        {sub.classItemPrefix} {cls}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setKeuanganMenuOpen(false);
                    setExpandedFinanceCategory(null);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#0F533F] text-[#FAF8F2] border border-[#2A7860]'
                      : 'text-[#C6DDD4] hover:bg-[#0B3C2E] hover:text-[#FAF8F2] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F3D88B]' : 'text-[#8BB7A7]'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="p-4 border-t border-[#165341] bg-[#04231A]/70 space-y-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#FAF8F2] truncate">{profile?.displayName}</p>
            <p className="text-xs text-[#A8C6BB] truncate">
              {profile?.role === 'admin' ? 'Administrator Madrasah' : portalLabel} · {profile?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#23614E] bg-[#0A3A2B] text-[#E6F1EC] text-xs font-medium hover:bg-[#104A39] transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Workspace Header */}
        <header className="sticky top-0 z-20 bg-[#FAF9F5] border-b border-[#DDD9CE] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu"
              className="lg:hidden p-2 rounded-lg border border-[#D4CFC2] bg-[#FCFBF8] text-slate-700 hover:bg-[#EAE7DC] cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs sm:text-sm text-slate-500 truncate">
              <span className="font-semibold text-[#064E3B]">{portalLabel}</span>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-slate-900 font-medium">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <PWAInstallButton compact />
            {isAdminAccount && (
              <div className="hidden md:inline-flex items-center gap-1 p-1 bg-[#E9E6DC] rounded-lg border border-[#D8D3C6]">
                {(
                  [
                    ['guru', 'Guru'],
                    ['siswa', 'Siswa'],
                    ['orangtua', 'Orang Tua'],
                    ['admin', 'Admin'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleModeChange(mode)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      previewMode === mode
                        ? 'bg-[#064E3B] text-[#FAF8F2]'
                        : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            <NotificationBellPopover
              notifications={notifications}
              unreadCount={unreadCount}
              onOpenAll={() => setActiveTab('notifikasi')}
            />
          </div>
        </header>

        {/* Mobile Role Switcher for Admin */}
        {isAdminAccount && (
          <div className="md:hidden px-4 py-2.5 bg-[#FAF9F5] border-b border-[#DDD9CE] flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Mode Portal:</span>
            <div className="inline-flex items-center gap-1 p-1 bg-[#E9E6DC] rounded-lg border border-[#D8D3C6]">
              {(
                [
                  ['guru', 'Guru'],
                  ['siswa', 'Siswa'],
                  ['orangtua', 'Orang Tua'],
                  ['admin', 'Admin'],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleModeChange(mode)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap cursor-pointer ${
                    previewMode === mode
                      ? 'bg-[#064E3B] text-[#FAF8F2]'
                      : 'text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 w-full bg-[#E5E2D7] rounded-xl animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-24 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-64 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl animate-pulse" />
            </div>
          ) : (
            <>
              {activeTab === 'overview' &&
                (effectiveRole === 'siswa' || effectiveRole === 'orangtua') && (
                  <StudentParentPortalView
                    mode={effectiveRole}
                    students={students}
                    attendance={attendance}
                    announcements={announcements}
                  />
                )}

              {activeTab === 'overview' && canTeach && (
                <TeacherOverview
                  madrasahIdentity={madrasahIdentity}
                  classesCount={classes.length}
                  studentsCount={students.length}
                  attendanceReportLinksCount={attendanceReportLinks.length}
                  announcements={announcements}
                  isAdmin={isAdminAccount}
                  seeding={seeding}
                  onSeed={handleQuickSeed}
                  onNavigate={setActiveTab}
                />
              )}

              {activeTab === 'identitas' && (
                <IdentitasMadrasahView
                  identity={madrasahIdentity}
                  canEdit={isAdminAccount}
                />
              )}

              {activeTab === 'guru' && isAdminAccount && (
                <TeacherDirectoryView
                  teachers={teachers}
                  classes={classes}
                  students={students}
                  allUsers={allUsers}
                  madrasahName={madrasahIdentity?.namaMadrasah}
                  activeSubmenu={guruSubmenu}
                  onChangeSubmenu={setGuruSubmenu}
                />
              )}

              {activeTab === 'data_siswa' && canTeach && (
                <StudentManagementView
                  students={students}
                  classes={classes}
                  mutations={studentMutations}
                  madrasahName={madrasahIdentity?.namaMadrasah}
                  isAdmin={isAdminAccount}
                  activeSubmenu={siswaSubmenu}
                  onChangeSubmenu={setSiswaSubmenu}
                />
              )}

              {activeTab === 'absensi' && canTeach && (
                <AbsensiPreviewView
                  links={attendanceReportLinks}
                  classes={classes}
                  fallbackAbsensiReportUrl={madrasahIdentity?.absensiReportUrl}
                  madrasahName={madrasahIdentity?.namaMadrasah}
                  canEdit={canTeach}
                  isAdmin={isAdminAccount}
                />
              )}

              {activeTab === 'keuangan' && canTeach && (
                <FinanceManagementView
                  transactions={financeTransactions}
                  students={students}
                  madrasahName={madrasahIdentity?.namaMadrasah}
                  activeSubmenu={keuanganSubmenu}
                  onChangeSubmenu={(sub) => {
                    setKeuanganSubmenu(sub);
                    setExpandedFinanceCategory(sub);
                  }}
                  selectedClass={keuanganClassLevel}
                  onChangeClass={setKeuanganClassLevel}
                />
              )}

              {activeTab === 'pengumuman' && (
                <AnnouncementsView
                  announcements={announcements}
                  canManage={canTeach}
                  madrasahName={madrasahIdentity?.namaMadrasah}
                  jadwalPelajaranUrl={madrasahIdentity?.jadwalPelajaranUrl}
                  isAdmin={isAdminAccount}
                  hasMadrasahIdentity={Boolean(madrasahIdentity)}
                />
              )}

              {activeTab === 'notifikasi' && (
                <NotificationCenterPage notifications={notifications} />
              )}

              {activeTab === 'admin' && isAdminAccount && (
                <AdminManagementView
                  users={allUsers}
                  invites={roleInvites}
                  students={students}
                />
              )}
            </>
          )}
        </main>
      </div>

      <NotificationToast
        notification={latestToast}
        onDismiss={dismissToast}
        onOpenCenter={() => setActiveTab('notifikasi')}
      />
    </div>
  );
}

function TeacherOverview({
  madrasahIdentity,
  classesCount,
  studentsCount,
  attendanceReportLinksCount,
  announcements,
  isAdmin,
  seeding,
  onSeed,
  onNavigate,
}: {
  madrasahIdentity: MadrasahIdentity | null;
  classesCount: number;
  studentsCount: number;
  attendanceReportLinksCount: number;
  announcements: ReturnType<typeof useSchoolData>['announcements'];
  isAdmin: boolean;
  seeding: boolean;
  onSeed: () => void;
  onNavigate: (tab: NavTab) => void;
}) {
  const absensiUrl = (madrasahIdentity?.absensiReportUrl || '').trim();
  const hasAnyAttendanceLink = attendanceReportLinksCount > 0 || Boolean(absensiUrl);

  return (
    <div className="space-y-6">
      {/* Executive Madrasah Overview Banner */}
      <div className="bg-[#062C21] bg-madrasah-lattice-dark text-[#FAF8F2] rounded-xl p-6 border border-[#144D3C] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          <MadrasahLogo
            logoUrl={madrasahIdentity?.logoUrl}
            alt={madrasahIdentity?.namaMadrasah || 'Logo Madrasah'}
            className="w-12 h-12 shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#F3D88B]">
              {madrasahIdentity
                ? `${madrasahIdentity.namaYayasan} · Akreditasi ${madrasahIdentity.statusAkreditasi}`
                : 'Portal Akademik Madrasah Ibtidaiyah (MI)'}
            </p>
            <h1 className="font-display text-2xl font-bold text-[#FAF8F2] mt-0.5">
              {madrasahIdentity ? madrasahIdentity.namaMadrasah : 'Ringkasan Akademik Madrasah (MI)'}
            </h1>
            <p className="text-xs sm:text-sm text-[#C6DDD4] mt-1">
              {madrasahIdentity
                ? `NSM ${madrasahIdentity.nsm} · NPSN ${madrasahIdentity.npsn} · Kepala Madrasah: ${madrasahIdentity.namaKepalaMadrasah}`
                : 'Pantau perkembangan data siswa kelas I–VI, pratinjau laporan absensi, dan pengumuman aktif secara terpadu.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('data_siswa')}
            className="px-4 py-2 rounded-lg bg-[#D4A74A] text-[#062C21] text-sm font-semibold hover:bg-[#DFB763] transition-colors whitespace-nowrap cursor-pointer"
          >
            Data Siswa
          </button>
          <button
            type="button"
            onClick={() => onNavigate('absensi')}
            className="px-4 py-2 rounded-lg border border-[#2C6B57] bg-[#0B3A2C] text-[#FAF8F2] text-sm font-medium hover:bg-[#104A39] transition-colors whitespace-nowrap cursor-pointer"
          >
            Laporan Absensi
          </button>
        </div>
      </div>

      {/* Institutional Identity Strip / Setup Prompt */}
      {madrasahIdentity ? (
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-600 truncate">
            Berdiri Tahun <span className="font-mono font-semibold text-slate-900 tabular-nums">{madrasahIdentity.tahunBerdiri}</span> · {madrasahIdentity.alamat}
          </p>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('identitas')}
              className="text-xs font-semibold text-[#064E3B] hover:text-emerald-950 whitespace-nowrap cursor-pointer"
            >
              {isAdmin ? 'Kelola Identitas Madrasah' : 'Lihat Profil Madrasah'}
            </button>
          </div>
        </div>
      ) : (
        isAdmin && (
          <div className="bg-[#FCFBF8] border border-amber-300/70 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Identitas Madrasah Belum Dilengkapi
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Lengkapi Nama Yayasan, Nama Madrasah, NSM, NPSN, Akreditasi, Tahun Berdiri, Kepala Madrasah, Alamat, dan Logo Drive.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('identitas')}
              className="px-3.5 py-2 rounded-lg border border-amber-700/30 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Isi Identitas Madrasah
            </button>
          </div>
        )
      )}

      {/* Empty State Onboarding Banner */}
      {classesCount === 0 && studentsCount === 0 && isAdmin && (
        <div className="bg-[#FCFBF8] border border-emerald-800/20 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Mulai Cepat dengan Data Contoh Madrasah Ibtidaiyah (MI)
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Basis data masih kosong. Muat contoh kelas IV A &amp; V B, 5 siswa MI, serta pengumuman kegiatan madrasah.
            </p>
          </div>
          <button
            type="button"
            onClick={onSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-sm font-medium hover:bg-[#04392B] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Database className="w-4 h-4" />
            <span>{seeding ? 'Memuat Data...' : 'Muat Data Contoh MI'}</span>
          </button>
        </div>
      )}

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Siswa</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {studentsCount} Siswa
          </p>
          <p className="text-xs text-slate-500 mt-1">Peserta didik terdaftar</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Rombongan Belajar</p>
          <p className="font-mono text-2xl font-bold text-[#064E3B] tabular-nums mt-1.5">
            {classesCount} Kelas
          </p>
          <p className="text-xs text-slate-500 mt-1">Kelas I sampai Kelas VI</p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Laporan Absensi</p>
          <p className="font-display text-xl font-bold text-[#064E3B] mt-1.5">
            {attendanceReportLinksCount > 0
              ? `${attendanceReportLinksCount} Rombel`
              : absensiUrl
              ? 'Terhubung'
              : 'Belum Diatur'}
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {attendanceReportLinksCount > 0
              ? 'Link per kelas & rombel'
              : 'Link laporan eksternal'}
          </p>
        </div>

        <div className="bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pengumuman Aktif</p>
          <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1.5">
            {announcements.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Agenda &amp; info kegiatan</p>
        </div>
      </div>

      {/* External Attendance Preview Card & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Preview Laporan Absensi</h2>
            <button
              type="button"
              onClick={() => onNavigate('absensi')}
              className="text-xs font-semibold text-[#064E3B] hover:text-emerald-950 cursor-pointer"
            >
              Kelola Link &amp; Preview
            </button>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-between gap-4">
            {hasAnyAttendanceLink ? (
              <>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#E4EFE9] text-[#064E3B] text-xs font-semibold">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>
                      {attendanceReportLinksCount > 0
                        ? `${attendanceReportLinksCount} Rombel Terhubung`
                        : 'Aplikasi Absensi Terhubung'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Laporan kehadiran siswa dipisahkan per kelas dan rombel serta dapat dipratinjau langsung dari menu{' '}
                    <span className="font-semibold text-slate-900">Lihat Laporan Absensi</span> di halaman depan.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('absensi')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors cursor-pointer"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-[#F3D88B]" />
                    <span>Buka Preview &amp; Kelola Link</span>
                  </button>
                  {absensiUrl && (
                    <a
                      href={absensiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D4CFC2] bg-white text-xs font-semibold text-slate-800 hover:bg-[#F5F3EC] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka di Tab Baru</span>
                    </a>
                  )}
                </div>
              </>
            ) : (
              <div className="py-4 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  Tautan laporan absensi per kelas &amp; rombel belum ditambahkan. Tempel link laporan absensi Anda agar tampil di halaman depan.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('absensi')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#064E3B] text-[#FAF8F2] text-xs font-semibold hover:bg-[#04392B] transition-colors cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-[#F3D88B]" />
                  <span>Atur Link Per Kelas &amp; Rombel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#FCFBF8] border border-[#DDD9CE] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAE6DB] bg-[#F5F3EC] flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Pengumuman Madrasah</h2>
            <button
              type="button"
              onClick={() => onNavigate('pengumuman')}
              className="text-xs font-semibold text-[#064E3B] hover:text-emerald-950 cursor-pointer"
            >
              Lihat Semua
            </button>
          </div>
          <div className="divide-y divide-[#EFECE2]">
            {announcements.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                Belum ada pengumuman aktif.
              </p>
            ) : (
              announcements.slice(0, 4).map((ann) => (
                <div key={ann.id} className="px-5 py-3.5 hover:bg-[#F5F3EC]/70 transition-colors">
                  <div className="text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-[#064E3B]">{ann.category}</span>
                    <span className="mx-1.5">·</span>
                    <span>Untuk {ann.targetAudience}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{ann.title}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ann.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
