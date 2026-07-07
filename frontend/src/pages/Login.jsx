import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Languages, Lock, Mail, ScanSearch, ShieldCheck } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import {
  AuthDivider,
  AuthField,
  AuthInput,
  AuthNotice,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSwitchLink,
} from '../components/AuthUI';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your details to sign in.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setGoogleSubmitting(true);
    setError('');
    const result = await loginWithGoogle(credential);
    setGoogleSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <main className="login-redesign-page">
      <section className="login-redesign-shell">
        <aside className="login-redesign-panel">
          <div className="login-redesign-brand">
              <span>🧠</span>
              <div>
                <strong>SomaliGuard AI</strong>
              <small>Academic Moderation System</small>
              </div>
            </div>

            <div className="login-redesign-copy">
            <span className="login-redesign-kicker"><ShieldCheck size={15} /> Research workspace</span>
            <h1>Analyze Somali text and images through a clear model workflow.</h1>
            <p>Sign in to review predictions, inspect analysis history, and manage the Somali offensive-language detection system.</p>
          </div>

          <div className="login-redesign-signals">
            <div>
              <BrainCircuit size={20} />
              <span>Model review</span>
            </div>
            <div>
              <ScanSearch size={20} />
              <span>OCR pipeline</span>
            </div>
            <div>
              <Languages size={20} />
              <span>Somali focused</span>
            </div>
          </div>
        </aside>

        <section className="login-redesign-card">
          <div className="login-redesign-card-header">
            <span className="login-redesign-lock"><Lock size={22} /></span>
            <h2>Welcome back</h2>
            <p>Use your verified account to access SomaliGuard AI.</p>
          </div>

          <AuthNotice text={error} />

          <form className="auth-form" onSubmit={handleSubmit}>
            <AuthField label="Email address" icon={<Mail size={18} />}>
              <AuthInput
                icon
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
              />
            </AuthField>

            <AuthField
              label="Password"
              icon={<Lock size={18} />}
              rightLabel={<Link to="/forgot-password">Forgot password?</Link>}
            >
              <AuthPasswordInput
                value={password}
                onChange={setPassword}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                autoComplete="current-password"
              />
            </AuthField>

            <AuthPrimaryButton loading={submitting}>
              {submitting ? 'Signing in...' : 'Sign in'} <ArrowRight size={16} />
            </AuthPrimaryButton>
          </form>

          <AuthDivider />
          <GoogleAuthButton onCredential={handleGoogleCredential} disabled={googleSubmitting} text="signin_with" />

          <AuthSwitchLink>
            Don't have an account? <Link to="/register">Sign up</Link>
          </AuthSwitchLink>
        </section>
      </section>
    </main>
  );
};

export default Login;
