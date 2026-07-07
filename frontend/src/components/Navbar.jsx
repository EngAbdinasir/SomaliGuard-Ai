import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Camera,
  Contact,
  FileImage,
  History,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  ShieldCheck,
  Sun,
  Type,
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    setLocalPreview('');
  }, [currentUser?.profile_picture_url]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const toggleTheme = () => {
    const updatedTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(updatedTheme);
    localStorage.setItem('somaliGuardTheme', updatedTheme);
    window.dispatchEvent(new Event('themechange'));
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setProfileOpen(false);
  };

  const handleLogout = () => {
    logout();
    closeSidebar();
    navigate('/login');
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
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
  const isAdmin = currentUser?.role === 'admin';
  const avatarSrc = localPreview || currentUser?.profile_picture_url;

  const navItems = [
    ...(isAdmin ? [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { to: '/', label: 'Home', icon: Home },
    { to: '/predict-text', label: 'Analyze Text', icon: Type },
    { to: '/analyze', label: 'Analyze Image', icon: FileImage },
    { to: '/history', label: 'History', icon: History },
    { to: '/about', label: 'About', icon: ShieldCheck },
    { to: '/contact', label: 'Contact', icon: Contact },
  ];

  return (
    <>
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" onClick={closeSidebar}>
            <div className="brand-icon">
              <ShieldCheck size={23} />
            </div>
            <div>
              <h3>SomaliGuard AI</h3>
              <p>Offensive Text Detection</p>
            </div>
          </Link>

          <button type="button" className="sidebar-close" onClick={closeSidebar} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-status">
          <span className="status-dot" />
          <div>
            <strong>Research Model Online</strong>
            <small>Transformer + OCR Pipeline</small>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={location.pathname === to ? 'active' : ''}
              onClick={closeSidebar}
            >
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="sidebar-theme" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {currentUser ? (
            <div className="sidebar-user">
              <button type="button" className="sidebar-user-button" onClick={() => setProfileOpen(!profileOpen)}>
                <div className="user-avatar">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={`${displayName} profile`} />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <strong>{displayName.split(' ')[0]}</strong>
                  <small>{currentUser.role || 'user'}</small>
                </div>
                <PanelLeftClose size={17} />
              </button>

              {profileOpen && (
                <div className="sidebar-user-menu">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    style={{ display: 'none' }}
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Camera size={16} />
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </button>
                  {uploadError && <p>{uploadError}</p>}
                  <button type="button" className="danger" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="sidebar-login" onClick={closeSidebar}>
              <LogIn size={17} />
              Login
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default Navbar;
