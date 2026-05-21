import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import DashboardPage  from './pages/DashboardPage';
import DocumentsPage  from './pages/DocumentsPage';
import HospitalsPage  from './pages/HospitalsPage';
import DivisionsPage  from './pages/DivisionsPage';
import UsersPage      from './pages/UsersPage';
import LoginPage           from './pages/LoginPage';
import DocumentViewerPage     from './pages/DocumentViewerPage';
import DaftarFormulirPage     from './pages/formulir/DaftarFormulirPage';
import PengajuanBaruPage      from './pages/formulir/PengajuanBaruPage';
import PengajuanSayaPage      from './pages/formulir/PengajuanSayaPage';
import ReviewDashboardPage    from './pages/formulir/ReviewDashboardPage';
import DetailFormulirPage     from './pages/formulir/DetailFormulirPage';
import DesignSubmitPage       from './pages/formulir/DesignSubmitPage';
import PengajuanSayaSpoPage   from './pages/spo/PengajuanSayaSpoPage';
import ReviewSpoPage          from './pages/spo/ReviewSpoPage';
import ReleaseQueuePage       from './pages/spo/ReleaseQueuePage';
import TemplateSpoPage        from './pages/spo/TemplateSpoPage';
import DetailSpoPage          from './pages/spo/DetailSpoPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

            <Route path="/dashboard" element={
              <ProtectedRoute><MainLayout><DashboardPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/documents" element={
              <ProtectedRoute><MainLayout><DocumentsPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/hospitals" element={
              <ProtectedRoute adminOnly><MainLayout><HospitalsPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/divisions" element={
              <ProtectedRoute adminOnly><MainLayout><DivisionsPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute adminOnly><MainLayout><UsersPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/viewer/:id" element={
              <ProtectedRoute><DocumentViewerPage /></ProtectedRoute>
            } />

            <Route path="/formulir" element={
              <ProtectedRoute><MainLayout><DaftarFormulirPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/formulir/baru" element={
              <ProtectedRoute><MainLayout><PengajuanBaruPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/formulir/pengajuan-saya" element={
              <ProtectedRoute><MainLayout><PengajuanSayaPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/formulir/review" element={
              <ProtectedRoute><MainLayout><ReviewDashboardPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/formulir/:id" element={
              <ProtectedRoute><MainLayout><DetailFormulirPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/formulir/:id/design" element={
              <ProtectedRoute><MainLayout><DesignSubmitPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/spo/pengajuan-saya" element={
              <ProtectedRoute><MainLayout><PengajuanSayaSpoPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/spo/review" element={
              <ProtectedRoute><MainLayout><ReviewSpoPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/spo/release-queue" element={
              <ProtectedRoute><MainLayout><ReleaseQueuePage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/spo/template" element={
              <ProtectedRoute><MainLayout><TemplateSpoPage /></MainLayout></ProtectedRoute>
            } />
            <Route path="/spo/:id" element={
              <ProtectedRoute><MainLayout><DetailSpoPage /></MainLayout></ProtectedRoute>
            } />

            <Route path="/"  element={<Navigate to="/dashboard" replace />} />
            <Route path="*"  element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--c-card)',
              color: 'var(--c-text)',
              border: '1px solid var(--c-border)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: 'transparent' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: 'transparent' } },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
