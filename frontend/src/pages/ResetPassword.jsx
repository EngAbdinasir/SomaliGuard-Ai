import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Lock,
  MailCheck,
  ScanSearch,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  AuthCardTopline,
  AuthField,
  AuthNotice,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSwitchLink,
  AuthVisualPanel,
} from '../components/AuthUI';
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
    if (submitting) return;

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
        <AuthVisualPanel
          className="reset-redesign-panel"
          subtitle="Password security"
          kickerIcon={<ShieldCheck size={15} />}
          kicker="Secure password reset"
          title="Protect every saved analysis with a stronger password."
          description="Choose a password that secures your profile, prediction history, and access to the SomaliGuard AI workspace."
          signals={[
            { icon: <KeyRound size={20} />, label: 'Reset token' },
            { icon: <MailCheck size={20} />, label: 'Email recovery' },
            { icon: <ScanSearch size={20} />, label: 'Protected data' },
          ]}
        />

        <section className="login-redesign-card reset-redesign-card">
          <AuthCardTopline status="Password update" />
          <div className="login-redesign-card-header">
            <span className="login-redesign-lock"><Lock size={22} /></span>
            <h2>Reset password</h2>
            <p>Choose a strong password to secure your SomaliGuard AI account.</p>
          </div>

          <AuthNotice text={!token ? 'This reset link is incomplete. Please request a new password reset email.' : error} />
          <AuthNotice type="success" text={message} />

          <form onSubmit={handleSubmit} className="reset-password-form">
            <AuthField label="New password" icon={<Lock size={18} />}>
              <AuthPasswordInput
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="new-password"
                disabled={!token || submitting}
              />
            </AuthField>

            <AuthField label="Confirm new password" icon={<Lock size={18} />}>
              <AuthPasswordInput
                value={confirmPassword}
                onChange={setConfirmPassword}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                autoComplete="new-password"
                disabled={!token || submitting}
              />
            </AuthField>

            <PasswordStrength state={passwordState} />
            <PasswordRules rules={passwordState.rules} />

            <AuthPrimaryButton loading={submitting} disabled={!canSubmit}>
              {submitting ? 'Resetting password...' : 'Reset password'} <ArrowRight size={16} />
            </AuthPrimaryButton>

            <AuthSwitchLink>
              <Link to="/login">Back to login</Link>
            </AuthSwitchLink>
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

const PasswordStrength = ({ state }) => (
  <div className="password-strength">
    <div className="password-strength-label">
      <span>Password strength</span>
      <span style={{ color: state.color }}>{state.label}</span>
    </div>
    <div className="password-strength-track">
      <div style={{ width: `${(state.score / 4) * 100}%`, background: state.color }} />
    </div>
  </div>
);

const PasswordRules = ({ rules }) => (
  <div className="password-rules">
    {rules.map((rule) => (
      <span key={rule.label} className={rule.valid ? 'valid' : ''}>
        {rule.valid ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
        {rule.label}
      </span>
    ))}
  </div>
);

export default ResetPassword;
