import { BrowserRouter, Routes, Route } from 'react-router';
import { ApplicationProvider } from '../contexts/ApplicationContext';
import { Toaster } from './components/ui/sonner';
import { Navigation } from './components/layout/navigation';
import { Dashboard } from './pages/dashboard';
import { Applications } from './pages/applications';
import { SchoolWorkspace } from './pages/school-workspace';
import { Documents } from './pages/documents';
import { Timeline } from './pages/timeline';
import { PlaceholderPage } from './pages/placeholder';
import { Settings } from './pages/settings';
import { SignIn } from './pages/auth/sign-in';
import { SignUp } from './pages/auth/sign-up';
import { Onboarding } from './pages/auth/onboarding';
import { ForgotPassword } from './pages/auth/forgot-password';
import { BottomNav } from './components/layout/bottom-nav';
import { MobileHeader } from './components/layout/mobile-header';
import { useLocation } from 'react-router';

function AppRoutes() {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('gradOS_authenticated') === 'true';

  const getPageName = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/applications') return 'Applications';
    if (path === '/deadlines') return 'Deadlines';
    if (path === '/documents') return 'Documents';
    if (path === '/settings') return 'Settings';
    if (path.startsWith('/application/')) return 'Application';
    return 'GradOS';
  };

  const showBottomNav = () => {
    return true;
  };

  return (
    <Routes>
      {/* Auth Routes - No Navigation */}
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* App Routes - With Navigation */}
      <Route
        path="/*"
        element={
          !isAuthenticated ? (
            <SignIn />
          ) : (
            <>
              <MobileHeader pageName={getPageName()} />
              <div className="flex h-screen overflow-hidden bg-background">
                <Navigation />
                <main className="flex-1 overflow-y-auto pt-[52px] md:pt-0 pb-[60px] md:pb-0">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/application/:id" element={<SchoolWorkspace />} />
                    <Route path="/deadlines" element={<Timeline />} />
                    <Route path="/documents" element={<Documents />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </main>
              </div>
              {showBottomNav() && <BottomNav />}
            </>
          )
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