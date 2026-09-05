import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider } from './firebase/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { GmailInboxPage } from './pages/GmailInboxPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { DashboardPage } from './pages/DashboardPage';
import { LetterRegisterPage } from './pages/LetterRegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { RangeInformationPage } from './pages/RangeInformationPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import './App.css';

function RangeInformationShortcut() {
  const { pathname } = useLocation();
  if (pathname !== '/' && pathname !== '/dashboard') return null;

  return (
    <Link
      to="/range-information"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-700 px-4 py-3 text-sm font-extrabold text-white shadow-xl shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 print:hidden"
      aria-label="Open Kodinga Range Information Centre"
    >
      <span aria-hidden="true">🌿</span>
      Range Information Centre
    </Link>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <RangeInformationShortcut />
        <Routes>
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/range-information" element={<RangeInformationPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/admin/audit" element={<AdminRoute><AdminAuditPage /></AdminRoute>} />
          <Route path="/admin/gmail" element={<AdminRoute><GmailInboxPage /></AdminRoute>} />
          <Route path="/incoming" element={<ProtectedRoute><LetterRegisterPage type="incoming" /></ProtectedRoute>} />
          <Route path="/outgoing" element={<ProtectedRoute><LetterRegisterPage type="outgoing" /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
