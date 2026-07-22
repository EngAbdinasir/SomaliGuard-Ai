import { useEffect, useRef, useState } from 'react';
import { Camera, KeyRound, Monitor, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Card, PageHeader } from '../components/ui/Primitives';

const Settings = () => {
  const { currentUser, updateProfilePicture } = useAuth();
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState(localStorage.getItem('somaliGuardTheme') || 'light');
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark', theme === 'dark' || (theme === 'system' && systemDark));
    localStorage.setItem('somaliGuardTheme', theme);
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', message: 'Choose a PNG, JPG, JPEG, or WEBP image.' });
      return;
    }
    setUploading(true);
    setFeedback(null);
    const result = await updateProfilePicture(file);
    setFeedback(result.success
      ? { type: 'success', message: 'Your profile photo was updated.' }
      : { type: 'error', message: result.error });
    setUploading(false);
    event.target.value = '';
  };

  const displayName = currentUser?.full_name || currentUser?.name || 'User';

  return (
    <main className="page sg-settings-page">
      <PageHeader eyebrow="Account" title="Settings" description="Review your account information and choose how SomaliGuard AI appears on this device." />
      {feedback && <Alert type={feedback.type}>{feedback.message}</Alert>}

      <div className="sg-settings-grid">
        <Card title="Personal information" description="Account details returned by the authenticated profile API.">
          <div className="sg-profile-summary">
            <div className="sg-profile-avatar">
              {currentUser?.profile_picture_url ? <img src={currentUser.profile_picture_url} alt={`${displayName} profile`} /> : <UserRound size={28} />}
            </div>
            <div><strong>{displayName}</strong><span>{currentUser?.email || 'No email available'}</span><span className="sg-badge sg-badge-info">{currentUser?.role || 'user'}</span></div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhoto} hidden />
          <button className="sg-button sg-button-outline" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Camera size={17} /> {uploading ? 'Uploading…' : 'Change profile photo'}
          </button>
          <p className="sg-help">PNG, JPG, JPEG, or WEBP. The image is uploaded through the existing protected profile endpoint.</p>
        </Card>

        <Card title="Appearance" description="Theme preference is stored locally in this browser.">
          <div className="sg-theme-options" role="radiogroup" aria-label="Color theme">
            <button type="button" role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}><Sun size={20} /><strong>Light</strong><span>Bright, neutral workspace</span></button>
            <button type="button" role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}><Moon size={20} /><strong>Dark</strong><span>Reduced-light workspace</span></button>
            <button type="button" role="radio" aria-checked={theme === 'system'} className={theme === 'system' ? 'selected' : ''} onClick={() => setTheme('system')}><Monitor size={20} /><strong>System</strong><span>Follow device preference</span></button>
          </div>
        </Card>

        <Card title="Account security" description="Password recovery uses the existing verified-email workflow.">
          <div className="sg-security-row"><div><KeyRound size={20} /><span><strong>Password</strong><small>Request a secure reset link through your registered email.</small></span></div><Link className="sg-button sg-button-outline" to="/forgot-password">Reset password</Link></div>
          <div className="sg-security-row"><div><ShieldCheck size={20} /><span><strong>Protected session</strong><small>Your account token is required for analysis, history, and profile requests.</small></span></div><span className="sg-badge sg-badge-safe">Active</span></div>
        </Card>
      </div>
    </main>
  );
};

export default Settings;
