import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, MailCheck, ScanSearch, ShieldCheck } from 'lucide-react';
import {
  AuthCardTopline,
  AuthField,
  AuthInput,
  AuthNotice,
  AuthPrimaryButton,
  AuthSwitchLink,
  AuthVisualPanel,
} from '../components/AuthUI';
import { forgotPassword } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await forgotPassword(normalizedEmail);
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-redesign-page recovery-redesign-page">
      <section className="login-redesign-shell recovery-redesign-shell">
        <AuthVisualPanel
          className="recovery-redesign-panel"
          subtitle="Secure account recovery"
          kickerIcon={<KeyRound size={15} />}
          kicker="Recover access"
          title="Return securely to your research workspace."
          description="Request a time-limited reset link and create a new password without exposing whether an account exists."
          signals={[
            { icon: <MailCheck size={20} />, label: 'Email link' },
            { icon: <ShieldCheck size={20} />, label: 'Protected reset' },
            { icon: <ScanSearch size={20} />, label: 'Resume research' },
          ]}
        />

        <section className="login-redesign-card recovery-redesign-card">
          <AuthCardTopline status="Account recovery" />
          <div className="login-redesign-card-header">
            <span className="login-redesign-lock"><Mail size={22} /></span>
            <h2>Forgot password</h2>
            <p>We will send instructions to help you create a new password.</p>
          </div>

          <AuthNotice text={error} />
          <AuthNotice type="success" text={message} />

          <form className="auth-form" onSubmit={handleSubmit}>
            <AuthField label="Email address" icon={<Mail size={18} />}>
              <AuthInput
                icon
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </AuthField>

            <AuthPrimaryButton loading={submitting}>
              {submitting ? 'Sending reset link...' : 'Send reset link'} <ArrowRight size={16} />
            </AuthPrimaryButton>
          </form>

          <AuthSwitchLink>
            <Link to="/login">Back to login</Link>
          </AuthSwitchLink>

          <p className="auth-card-footnote"><ShieldCheck size={14} /> Reset links are time-limited for your security.</p>
        </section>
      </section>
    </main>
  );
};

export default ForgotPassword;
