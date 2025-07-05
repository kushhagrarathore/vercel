import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
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

    if (!email || !password) {
      setError('Please enter both email and password.');
      toast('Please enter both email and password.', 'error');
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
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="framer-login-input"
        />
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
