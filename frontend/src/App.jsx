import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

const UserDashboard = lazy(() => import('./pages/Home'));
const Analyze = lazy(() => import('./pages/Analyze'));
const History = lazy(() => import('./pages/History'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const TextPrediction = lazy(() => import('./pages/TextPrediction'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const UserList = lazy(() => import('./pages/UserList'));
const Settings = lazy(() => import('./pages/Settings'));

const RouteLoading = () => <div className="sg-route-loading" role="status"><span className="sg-processing-mark"><span /></span><strong>Loading page…</strong></div>;

const Footer = () => {
  const location = useLocation();
  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) return null;
  return <div className="bottom-copy">© 2025–2026 SomaliGuard AI · Graduation Project</div>;
};

const AppLayout = ({ children }) => {
  return (
    <div className="app-shell">
      <Navbar />
      <section className="app-content">
        {children}
        <Footer />
      </section>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<RouteLoading />}>
        <Routes>
          {/* Standalone Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Main Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout><UserDashboard /></AppLayout>} />
            <Route path="/analyze" element={<AppLayout><Analyze /></AppLayout>} />
            <Route path="/predict-text" element={<AppLayout><TextPrediction /></AppLayout>} />
            <Route path="/history" element={<AppLayout><History /></AppLayout>} />
            <Route path="/about" element={<AppLayout><About /></AppLayout>} />
            <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
            <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />
          </Route>

          {/* Admin Protected Route */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/users" element={<AppLayout><UserList /></AppLayout>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
