import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useLanguageStore } from '@/store/languageStore';
import { useAuthStore } from '@/store/authStore';
import i18n from '@/i18n/config';
import { withAuth } from '@/hocs/withAuth';
import { withPageTransition } from '@/hocs/withPageTransition';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Users } from '@/pages/Users';
import { Devices } from '@/pages/Devices';
import { UserDetail } from '@/pages/UserDetail';
import { DeviceDetail } from '@/pages/DeviceDetail';
import { Contacts } from '@/pages/Contacts';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const DashboardPage = withPageTransition(Dashboard);
const UsersPage = withPageTransition(Users);
const DevicesPage = withPageTransition(Devices);
const UserDetailPage = withPageTransition(UserDetail);
const DeviceDetailPage = withPageTransition(DeviceDetail);
const ContactsPage = withPageTransition(Contacts);

const DashboardLayout = withAuth(() => {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/users" element={<UsersPage />} />
              <Route path="/dashboard/users/:id" element={<UserDetailPage />} />
              <Route path="/dashboard/devices" element={<DevicesPage />} />
              <Route
                path="/dashboard/devices/:id"
                element={<DeviceDetailPage />}
              />
              <Route path="/dashboard/contacts" element={<ContactsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
});

function App() {
  const { language } = useLanguageStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    void i18n.changeLanguage(language);
  }, [language]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            }
          />
          <Route path="/*" element={<DashboardLayout />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
