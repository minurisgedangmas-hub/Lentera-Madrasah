import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { PendingApprovalView } from './components/PendingApprovalView';
import { DashboardWorkspace } from './components/DashboardWorkspace';
import { OfflineIndicator } from './components/PWAInstallButton';

function AppRouter() {
  const { firebaseUser, profile, authReady } = useAuth();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-700 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-600">Memuat Portal Lentera Madrasah...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <LandingPage />;
  }

  if (!profile || profile.role === 'pending') {
    return <PendingApprovalView />;
  }

  return <DashboardWorkspace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
        <OfflineIndicator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
