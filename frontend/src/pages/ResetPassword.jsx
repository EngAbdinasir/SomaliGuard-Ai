import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MailCheck,
  ScanSearch,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { resetPassword } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const passwordState = useMemo(() => getPasswordState(password, confirmPassword), [password, confirmPassword]);
  const canSubmit = Boolean(token.trim()) && passwordState.valid && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const data = await resetPassword(token, password, confirmPassword);
      setMessage(data.message);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-redesign-page recovery-redesign-page">
      <section className="login-redesign-shell reset-redesign-shell">
        <aside className="login-redesign-panel reset-redesign-panel">
          <div className="login-redesign-brand">
            <span>🧠</span>
            <div>
              <strong>SomaliGuard AI</strong>
              <small>Password security</small>
            </div>
          </div>

          <div className="login-redesign-copy">
            <span className="login-redesign-kicker"><ShieldCheck size={15} /> Secure reset</span>
            <h1>Create a stronger SomaliGuard AI password.</h1>
            <p>Use a secure password to protect your prediction history, profile, and moderation workspace.</p>
          </div>

          <div className="login-redesign-signals">
            <div>
              <KeyRound size={20} />
              <span>Reset token</span>
            </div>
            <div>
              <MailCheck size={20} />
              <span>Email recovery</span>
            </div>
            <div>
              <ScanSearch size={20} />
              <span>Protected history</span>
            </div>
          </div>
        </aside>

        <section className="login-redesign-card reset-redesign-card">
          <div className="login-redesign-card-header">
            <span className="login-redesign-lock"><Lock size={22} /></span>
            <h2>Reset password</h2>
            <p>Choose a strong password to secure your SomaliGuard AI account.</p>
          </div>

          {!token && <Notice type="error" text="This reset link is incomplete. Please request a new password reset email." />}

          <form onSubmit={handleSubmit} className="reset-password-form">
            <PasswordInput
              label="New password"
              value={password}
              onChange={setPassword}
              visible={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
            />

            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((value) => !value)}
            />

            <PasswordStrength state={passwordState} />
            <PasswordRules rules={passwordState.rules} />

            {error && <Notice type="error" text={error} />}
            {message && <Notice type="success" text={message} />}

            <button
              type="submit"
              disabled={!canSubmit}
              className="auth-primary-button reset-submit-button"
              style={{ opacity: canSubmit ? 1 : 0.55, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
            >
              {submitting ? 'Resetting password...' : 'Reset password'} <ArrowRight size={16} />
            </button>

            <Link to="/login" className="auth-back-link">Back to login</Link>
          </form>
        </section>
      </section>
    </main>
  );
};

const validatePassword = (password, confirmPassword) => {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[\d\W_]/.test(password)) return 'Password must include at least one number or symbol.';
  if (password !== confirmPassword) return 'New password and confirm password must match.';
  return '';
};

const getPasswordState = (password, confirmPassword) => {
  const rules = [
    { label: 'Minimum 8 characters', valid: password.length >= 8 },
    { label: 'Uppercase and lowercase letters', valid: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: 'At least one number or symbol', valid: /[\d\W_]/.test(password) },
    { label: 'Passwords match', valid: Boolean(confirmPassword) && password === confirmPassword },
  ];
  const score = rules.filter((rule) => rule.valid).length;
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  const color = score <= 1 ? '#ef4444' : score === 2 ? '#f59e0b' : score === 3 ? '#0ea5e9' : '#10b981';
  return { rules, score, label, color, valid: score === rules.length };
};

const FieldLabel = ({ icon, text }) => (
  <label style={label}>
    <span style={{ color: '#3b1cf6', display: 'inline-flex' }}>{icon}</span>
    {text}
  </label>
);

const PasswordInput = ({ label: inputLabel, value, onChange, visible, onToggle }) => (
  <div style={{ display: 'grid', gap: '10px' }}>
    <FieldLabel icon={<Lock size={17} />} text={inputLabel} />
    <div style={inputWrap}>
      <Lock size={18} style={inputIcon} />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Enter password"
        style={passwordInput}
      />
      <button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} style={iconButton}>
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const PasswordStrength = ({ state }) => (
  <div style={{ display: 'grid', gap: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: 'var(--muted)', fontSize: '13px', fontWeight: 800 }}>
      <span>Password strength</span>
      <span style={{ color: state.color }}>{state.label}</span>
    </div>
    <div style={{ height: '8px', borderRadius: '999px', background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
      <div style={{ width: `${(state.score / 4) * 100}%`, height: '100%', background: state.color, borderRadius: '999px', transition: 'width 180ms ease, background 180ms ease' }} />
    </div>
  </div>
);

const PasswordRules = ({ rules }) => (
  <div style={rulesGrid}>
    {rules.map((rule) => (
      <span key={rule.label} style={{ ...ruleItem, color: rule.valid ? '#047857' : 'var(--muted)' }}>
        {rule.valid ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
        {rule.label}
      </span>
    ))}
  </div>
);

const Notice = ({ type, text }) => {
  const success = type === 'success';
  return (
    <div className={success ? '' : 'alert-error'} style={{ ...notice, background: success ? 'rgba(16, 185, 129, 0.08)' : undefined, color: success ? '#047857' : undefined, borderColor: success ? 'rgba(16, 185, 129, 0.22)' : undefined }}>
      {success ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
      <span>{text}</span>
    </div>
  );
};

const label = {
  margin: 0,
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontWeight: 900,
  fontSize: '14px',
};

const inputWrap = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const inputIcon = {
  position: 'absolute',
  left: '14px',
  color: 'var(--muted)',
};

const passwordInput = {
  width: '100%',
  borderRadius: '12px',
  border: '1px solid var(--line)',
  background: 'var(--bg)',
  color: 'var(--text)',
  padding: '14px 48px 14px 44px',
  fontSize: '15px',
  outline: 0,
};

const iconButton = {
  position: 'absolute',
  right: '12px',
  width: '32px',
  height: '32px',
  border: 0,
  background: 'transparent',
  color: 'var(--muted)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
};

const rulesGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '9px 12px',
  fontSize: '13px',
};

const ruleItem = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  fontWeight: 800,
};

const notice = {
  padding: '12px 14px',
  borderRadius: '10px',
  fontSize: '14px',
  border: '1px solid transparent',
  display: 'flex',
  gap: '9px',
  alignItems: 'center',
  fontWeight: 700,
};

export default ResetPassword;
