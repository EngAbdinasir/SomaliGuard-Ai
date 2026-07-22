import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Languages, Lock, Mail, ScanSearch, Sparkles } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';
import {
  AuthCardTopline,
  AuthDivider,
  AuthField,
  AuthInput,
  AuthNotice,
  AuthPasswordInput,
  AuthPrimaryButton,
  AuthSwitchLink,
  AuthVisualPanel,
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
    if (submitting) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError('Please enter your details to sign in.');
      return;
    }

    setSubmitting(true);
    const result = await login(normalizedEmail, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (googleSubmitting) return;
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
        <AuthVisualPanel
          subtitle="Academic moderation platform"
          kickerIcon={<Sparkles size={15} />}
          kicker="Research workspace"
          title="Safer Somali digital communication starts here."
          description="Analyze written content, extract text from images, and review every result from one focused research workspace."
          signals={[
            { icon: <BrainCircuit size={20} />, label: 'Model analysis' },
            { icon: <ScanSearch size={20} />, label: 'OCR workflow' },
            { icon: <Languages size={20} />, label: 'Somali focused' },
          ]}
        />

        <section className="login-redesign-card">
          <AuthCardTopline status="Verified access" />
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

          <p className="auth-card-footnote"><Lock size={14} /> Your session and account data are protected.</p>
        </section>
      </section>
    </main>
  );
};

export default Login;
