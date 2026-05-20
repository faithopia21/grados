import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { ApplicationProvider } from '../contexts/ApplicationContext';
import { Toaster } from './components/ui/sonner';
import { Navigation } from './components/layout/navigation';
import { Dashboard } from './pages/dashboard';
import { Applications } from './pages/applications';
import { SchoolWorkspace } from './pages/school-workspace';
import { Documents } from './pages/documents';
import { Timeline } from './pages/timeline';
import { Settings } from './pages/settings';
import { Profile } from './pages/profile';
import { SignIn } from './pages/auth/sign-in';
import { SignUp } from './pages/auth/sign-up';
import { Onboarding } from './pages/auth/onboarding';
import { ForgotPassword } from './pages/auth/forgot-password';
import { BottomNav } from './components/layout/bottom-nav';
import { MobileHeader } from './components/layout/mobile-header';
import { ProtectedRoute } from '../components/ProtectedRoute';

function AppLayout() {
  const location = useLocation();

  const getPageName = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path === '/applications') return 'Applications';
    if (path === '/deadlines') return 'Deadlines';
    if (path === '/documents') return 'Documents';
    if (path === '/settings') return 'Settings';
    if (path === '/profile') return 'Profile';
    if (path === '/onboarding') return 'Onboarding';
    if (path.startsWith('/application/')) return 'Application';
    return 'GradOS';
  };

  const showBottomNav = location.pathname !== '/onboarding';

  return (
    <>
      <MobileHeader pageName={getPageName()} />
      <div className="flex h-screen overflow-hidden bg-background">
        <Navigation />
        <main className="flex-1 overflow-y-auto pt-[52px] md:pt-0 pb-[60px] md:pb-0">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/application/:id" element={<SchoolWorkspace />} />
            <Route path="/deadlines" element={<Timeline />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/onboarding" element={<Onboarding />} />
          </Routes>
        </main>
      </div>
      {showBottomNav && <BottomNav />}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/signin" element={<SignIn />} />
      <Route path="/sign-in" element={<Navigate to="/signin" replace />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
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
