import { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router';
import { Menu } from 'lucide-react';
import { ApplicationProvider } from '../contexts/ApplicationContext';
import { Toaster } from './components/ui/sonner';
import { Navigation } from './components/layout/navigation';
import { Dashboard } from './pages/dashboard';
import { Applications } from './pages/applications';
const SchoolWorkspace = lazy(() => import('./pages/school-workspace').then(m => ({ default: m.SchoolWorkspace })));
const Documents = lazy(() => import('./pages/documents').then(m => ({ default: m.Documents })));
const Timeline = lazy(() => import('./pages/timeline').then(m => ({ default: m.Timeline })));
const Settings = lazy(() => import('./pages/settings').then(m => ({ default: m.Settings })));
const Profile = lazy(() => import('./pages/profile').then(m => ({ default: m.Profile })));
import { SignIn } from './pages/auth/sign-in';
import { SignUp } from './pages/auth/sign-up';
import { Onboarding } from './pages/auth/onboarding';
import { ForgotPassword } from './pages/auth/forgot-password';
import { ResetPassword } from './pages/auth/reset-password';
import { AuthCallback } from './pages/auth/callback';
import { BottomNav } from './components/layout/bottom-nav';
import { MobileHeader } from './components/layout/mobile-header';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { OfflineBanner } from './components/offline-banner';
import { ErrorBoundary } from '@/app/components/error-boundary';
import { ProductTour } from './components/product-tour';

function LegacyApplicationRedirect() {
  const { id } = useParams();
  return <Navigate to={`/applications/${id}`} replace />;
}

function AppLayout() {
  const location = useLocation();
  const [tabletSidebarOpen, setTabletSidebarOpen] = useState(false);

  const getPageName = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path === '/applications') return 'Applications';
    if (path === '/deadlines') return 'Deadlines';
    if (path === '/documents') return 'Documents';
    if (path === '/settings') return 'Settings';
    if (path === '/profile') return 'Profile';
    if (path === '/onboarding') return 'Onboarding';
    if (path.startsWith('/applications/') && path !== '/applications') return 'Application';
    if (path.startsWith('/application/')) return 'Application';
    return 'GradOS';
  };

  const showBottomNav = location.pathname !== '/onboarding';

  return (
    <>
      <MobileHeader pageName={getPageName()} />
      <div className="flex h-screen overflow-hidden bg-background">
        <Navigation
          tabletOverlayOpen={tabletSidebarOpen}
          onTabletOverlayClose={() => setTabletSidebarOpen(false)}
        />
        <main className="flex-1 overflow-y-auto pt-[52px] md:pt-12 lg:pt-0 pb-[60px] md:pb-0 relative md:pl-0">
          <button
            type="button"
            className="hidden md:flex lg:hidden items-center justify-center fixed top-3 left-3 z-30 w-10 h-10 rounded-lg border border-border bg-card text-foreground shadow-sm hover:bg-accent"
            onClick={() => setTabletSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/applications/:id" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
                  <SchoolWorkspace />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/application/:id" element={<LegacyApplicationRedirect />} />
            <Route path="/deadlines" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
                  <Timeline />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/documents" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
                  <Documents />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/settings" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
                  <Settings />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/profile" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
                  <Profile />
                </Suspense>
              </ErrorBoundary>
            } />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </main>
      </div>
      {showBottomNav && <BottomNav />}
      <ProductTour />
    </>
  );
}

function AppRoutes() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ApplicationProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </ApplicationProvider>
  );
}
