import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RequestsPage from './pages/RequestsPage';
import RequestDetailPage from './pages/RequestDetailPage';
import SettingsPage from './pages/SettingsPage';
import ProductsPage from './pages/ProductsPage';
import CustomersPage from './pages/CustomersPage';
import QuotationsPage from './pages/QuotationsPage';
import QuotationDetailPage from './pages/QuotationDetailPage';
import { requestsAPI } from './services/api';

const ProtectedRoute = ({ children }) => {
  const { admin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
        <span className="loading-text">Loading...</span>
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AppLayout = ({ theme, setTheme }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await requestsAPI.getStats();
        setPendingCount(res.data.pending || 0);
      } catch {
        // silently fail
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <Sidebar
        pendingCount={pendingCount}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        theme={theme}
        setTheme={setTheme}
      />
      <main className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/quotations" element={<QuotationsPage />} />
          <Route path="/quotations/:id" element={<QuotationDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#141c2e',
              color: '#f0f4f8',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              fontSize: '13.5px',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(16px)',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#fff' },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginRedirect theme={theme} setTheme={setTheme} />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout theme={theme} setTheme={setTheme} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

const LoginRedirect = ({ theme, setTheme }) => {
  const { admin, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-spinner" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (admin) return <Navigate to="/" replace />;
  return <LoginPage theme={theme} setTheme={setTheme} />;
};

export default App;
