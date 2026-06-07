import { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Camera, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react';

const Navbar = () => {
  const { currentUser, logout, updateProfilePicture } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('somaliGuardTheme') || 'light');
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [localPreview, setLocalPreview] = useState('');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
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
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('somaliGuardTheme', newTheme);
    window.dispatchEvent(new Event('themechange'));
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
    setDropdownOpen(false);
  };

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file.');
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
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

  return (
    <header className="navbar">
      <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-icon"><ShieldCheck size={24} /></div>
        <div>
          <h3>SomaliGuard AI</h3>
          <p>Offensive Text Detection</p>
        </div>
      </Link>
      
      <nav className={`navlinks ${menuOpen ? 'show' : ''}`} id="navlinks">
        {isAdmin && <Link to="/dashboard" className={isActive('/dashboard')} onClick={() => setMenuOpen(false)}>DASHBOARD</Link>}
        <Link to="/" className={isActive('/')} onClick={() => setMenuOpen(false)}>HOME</Link>
        <Link to="/analyze" className={isActive('/analyze')} onClick={() => setMenuOpen(false)}>ANALYZE IMAGE</Link>
        <Link to="/predict-text" className={isActive('/predict-text')} onClick={() => setMenuOpen(false)}>ANALYZE TEXT</Link>
        <Link to="/history" className={isActive('/history')} onClick={() => setMenuOpen(false)}>HISTORY</Link>
        <Link to="/about" className={isActive('/about')} onClick={() => setMenuOpen(false)}>ABOUT</Link>
        <Link to="/contact" className={isActive('/contact')} onClick={() => setMenuOpen(false)}>CONTACT</Link>
      </nav>

      <div className="right-nav">
        <button className="theme-icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button type="button" className="switch" onClick={toggleTheme} aria-label="Toggle theme">
          <Sun size={14} />
          <span></span>
        </button>
        
        {currentUser ? (
          <div className="user-menu-container" onClick={() => setDropdownOpen(!dropdownOpen)}>
            <div className="user-avatar">
              {avatarSrc ? (
                <img src={avatarSrc} alt={`${displayName} profile`} />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span>{displayName.split(' ')[0]} ⌄</span>
            
            {dropdownOpen && (
              <div className="user-dropdown show">
                <div className="user-dropdown-item profile-summary" style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
                  <div className="user-avatar large">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={`${displayName} profile`} />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <strong>{displayName}</strong>
                    <small style={{ color: '#6b7280' }}>Role: {currentUser.role}</small>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="user-dropdown-item"
                  disabled={uploading}
                >
                  <Camera size={16} /> {uploading ? 'Uploading...' : 'Change Profile Picture'}
                </button>
                {uploading && (
                  <div className="user-dropdown-item" style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.4 }}>
                    Saving your new photo...
                  </div>
                )}
                {uploadError && (
                  <div className="user-dropdown-item" style={{ color: '#ef4444', fontSize: '12px', lineHeight: 1.4 }}>
                    {uploadError}
                  </div>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleLogout();
                  }}
                  className="user-dropdown-item danger"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="btn primary" style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Login</Link>
        )}
        
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>
    </header>
  );
};

export default Navbar;
