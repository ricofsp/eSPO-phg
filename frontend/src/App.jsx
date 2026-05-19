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
import DocumentViewerPage  from './pages/DocumentViewerPage';

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
