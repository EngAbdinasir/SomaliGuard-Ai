import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Camera,
  Contact,
  FileImage,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Type,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout, updateProfilePicture } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('somaliGuardTheme') || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    const applyTheme = () => {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.classList.toggle('dark', theme === 'dark' || (theme === 'system' && systemDark));
    };
    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => setTheme(localStorage.getItem('somaliGuardTheme') || 'light');
    window.addEventListener('themechange', syncTheme);
    return () => window.removeEventListener('themechange', syncTheme);
  }, []);

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('somaliGuardTheme', nextTheme);
    window.dispatchEvent(new Event('themechange'));
  };

  const closeMenus = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeMenus();
    navigate('/login');
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('Choose a PNG, JPG, JPEG, or WEBP image.');
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    setUploadError('');
    const result = await updateProfilePicture(file);
    if (!result.success) {
      setUploadError(result.error);
      setLocalPreview('');
    }
    setUploading(false);
    event.target.value = '';
  };

  const displayName = currentUser?.full_name || currentUser?.name || 'User';
  const avatarSrc = localPreview || currentUser?.profile_picture_url;
  const isAdmin = currentUser?.role === 'admin';
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/predict-text', label: 'Analyze Text', icon: Type },
    { to: '/analyze', label: 'Analyze Image', icon: FileImage },
    { to: '/history', label: 'Prediction History', icon: History },
    { to: '/about', label: 'About', icon: ShieldCheck },
    { to: '/contact', label: 'Contact', icon: Contact },
  ];
  const adminItems = isAdmin ? [
    { to: '/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard },
    { to: '/users', label: 'User Management', icon: Users },
  ] : [];

  const renderLink = ({ to, label, icon: Icon }) => (
    <Link
      key={to}
      to={to}
      className={location.pathname === to ? 'active' : ''}
      aria-current={location.pathname === to ? 'page' : undefined}
      onClick={closeMenus}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );

  return (
    <>
      {sidebarOpen && <button type="button" className="sg-nav-backdrop" onClick={closeMenus} aria-label="Close navigation" />}

      <aside id="primary-sidebar" className={`sg-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sg-sidebar-brand">
          <Link to="/" onClick={closeMenus} aria-label="SomaliGuard AI dashboard">
            <span><ShieldCheck size={22} /></span>
            <div><strong>SomaliGuard AI</strong><small>Somali NLP research system</small></div>
          </Link>
          <button type="button" className="sg-sidebar-mobile-close" onClick={closeMenus} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <nav className="sg-sidebar-nav" aria-label="Primary navigation">
          <small>Research workspace</small>
          {navItems.map(renderLink)}
          {adminItems.length > 0 && <small>Administration</small>}
          {adminItems.map(renderLink)}
        </nav>

        <div className="sg-sidebar-bottom">
          <div className="sg-sidebar-user">
            <span className="sg-avatar">{avatarSrc ? <img src={avatarSrc} alt={`${displayName} profile`} /> : displayName.charAt(0).toUpperCase()}</span>
            <span className="sg-sidebar-user-copy"><strong>{displayName}</strong><small>{currentUser?.role || 'user'}</small></span>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleProfilePictureChange} hidden />
            <button type="button" className="sg-sidebar-photo" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Change profile photo"><Camera size={15} /></button>
          </div>
          {uploadError && <p className="sg-sidebar-error" role="alert">{uploadError}</p>}
          <button type="button" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}<span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
          </button>
          <button type="button" className="danger" onClick={handleLogout}>
            <LogOut size={19} /><span>Logout</span>
          </button>
        </div>
      </aside>
      <button type="button" className="sg-mobile-menu-floating" onClick={() => setSidebarOpen(true)} aria-label="Open navigation" aria-controls="primary-sidebar" aria-expanded={sidebarOpen}><Menu size={20} /></button>
    </>
  );
};

export default Navbar;
