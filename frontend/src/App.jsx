import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Analyze from './pages/Analyze';
import History from './pages/History';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TextPrediction from './pages/TextPrediction';
import Dashboard from './pages/Dashboard';
import UserList from './pages/UserList';

const Footer = () => {
  const location = useLocation();
  if (['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname)) return null;
  return <div className="bottom-copy">© 2025 SomaliGuard AI. All rights reserved.</div>;
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
        <Routes>
          {/* Standalone Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contact" element={<AppLayout><Contact /></AppLayout>} />

          {/* Protected Main Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<AppLayout><Home /></AppLayout>} />
            <Route path="/analyze" element={<AppLayout><Analyze /></AppLayout>} />
            <Route path="/predict-text" element={<AppLayout><TextPrediction /></AppLayout>} />
            <Route path="/history" element={<AppLayout><History /></AppLayout>} />
            <Route path="/about" element={<AppLayout><About /></AppLayout>} />
          </Route>

          {/* Admin Protected Route */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/users" element={<AppLayout><UserList /></AppLayout>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
