import { useState } from 'react';
import { login, signUp } from '../services/authService.js';

function toFriendlyMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/user-not-found') return 'No account found for this email.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Invalid email or password.';
  if (code === 'auth/email-already-in-use') return 'An account with that email already exists.';
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
  return error?.message || 'Authentication failed. Please try again.';
}

function getPasswordStrength(password) {
  const value = password || '';
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (!value) return { label: 'None', level: 0 };
  if (score <= 1) return { label: 'Weak', level: 1 };
  if (score === 2) return { label: 'Fair', level: 2 };
  if (score === 3) return { label: 'Good', level: 3 };
  return { label: 'Strong', level: 4 };
}

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordStrength = getPasswordStrength(password);

  function resetState(nextMode) {
    setMode(nextMode);
    setError('');
    setPassword('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setError('Enter email and password.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError('Enter your full name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = mode === 'signup'
        ? await signUp(normalizedEmail, password)
        : await login(normalizedEmail, password);

      onAuthenticated({
        email: user.email || normalizedEmail,
        fullName: fullName.trim() || user.displayName || ''
      });
    } catch (requestError) {
      setError(toFriendlyMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="auth-milkyway" />
      <div className="auth-nebula" />
      <div className="auth-starfield" />

      <div className="auth-card">
        <h1>LumiLight</h1>
        <p>Access your night-sky dashboard.</p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => resetState('login')}
            role="tab"
            aria-selected={mode === 'login'}
          >
            Log In
          </button>
          <button
            type="button"
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => resetState('signup')}
            role="tab"
            aria-selected={mode === 'signup'}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Full name"
            autoComplete="name"
            disabled={loading}
          />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            disabled={loading}
          />
          {mode === 'signup' && (
            <div className="password-strength" aria-live="polite">
              <div className="password-strength-head">
                <span>Password strength</span>
                <span className={`password-strength-label strength-${passwordStrength.level}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="password-strength-bars">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`password-strength-bar ${
                      passwordStrength.level >= step ? `filled strength-${passwordStrength.level}` : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Log In'}
          </button>
        </form>
      </div>
    </section>
  );
}
