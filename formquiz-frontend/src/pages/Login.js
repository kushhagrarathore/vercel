import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // ✅ Check if user is logged in (e.g., redirected after OAuth)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem('session', JSON.stringify(session));
        navigate('/dashboard');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogin = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      toast('Please enter a valid email address.', 'error');
      setLoading(false);
      return;
    }
    if (!password) {
      setError('Password cannot be empty.');
      toast('Password cannot be empty.', 'error');
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      toast(signInError.message, 'error');
    } else {
      localStorage.setItem('session', JSON.stringify(data.session));
      setMessage('Login successful! Redirecting...');
      toast('Login successful! Redirecting...', 'success');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setError('');
    setMessage('');
    if (!email) {
      setError('Please enter your email to reset password.');
      toast('Please enter your email to reset password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetError) {
        setError(resetError.message);
        toast(resetError.message, 'error');
      } else {
        setMessage('Password reset email sent. Check your inbox!');
        toast('Password reset email sent. Check your inbox!', 'success');
      }
    } catch (err) {
      setError('An error occurred while sending password reset email.');
      toast('An error occurred while sending password reset email.', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewUser = () => {
    navigate('/signup');
  };

  const handleOAuthLogin = async (provider) => {
    setError('');
    setMessage('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      setError(`Error logging in with ${provider}: ${error.message}`);
      toast(`Error logging in with ${provider}: ${error.message}`, 'error');
    }
    setLoading(false);
  };

  // SVG icons for eye open and closed
  const EyeOpen = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
  );
  const EyeClosed = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.81 21.81 0 0 1 5.06-5.94M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
  );

  return (
  <div className="login-framer-bg">
    <div className="framer-bg-animated"></div>
    <div className="framer-login-card">
      <div className="framer-login-title">Welcome to Inquizo</div>
      <button
        className="framer-login-btn google"
        onClick={() => handleOAuthLogin('google')}
        disabled={loading}
      >
        <span className="google-icon">G</span> Continue with Google
      </button>
      <button
        className="framer-login-btn github"
        onClick={() => handleOAuthLogin('github')}
        disabled={loading}
      >
        <span className="github-icon" style={{background: '#fff', color: '#24292e', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1em', marginRight: 6}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#24292e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.49 2.87 8.3 6.84 9.64.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.36-3.37-1.36-.45-1.18-1.1-1.5-1.1-1.5-.9-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.58.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2z"/></svg>
        </span>
        Continue with GitHub
      </button>
      <div className="framer-or-divider">or</div>
      <form
        className="framer-login-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="framer-login-input"
        />
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="framer-login-input"
            style={{ paddingRight: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOpen /> : <EyeClosed />}
          </button>
        </div>
        <button type="submit" className="framer-login-btn email" disabled={loading}>
          {loading ? <Spinner size={22} /> : 'Continue with email'}
        </button>
      </form>
      <div className="framer-login-footer">
        <a href="#" className="framer-forgot" onClick={handleForgotPassword}>
          Forgot Password?
        </a>
        <button
          type="button"
          className="framer-signup"
          onClick={handleNewUser}
          disabled={loading}
        >
          New User? Sign Up
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-message">{message}</p>}
    </div>
  </div>
);}
