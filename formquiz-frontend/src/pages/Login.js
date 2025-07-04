import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import customLoginImage from './login.png';
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
    <div className="login-page">
      <header className="admin-header">INQUIZO</header>

      <div className="login-container">
        {/* Left Side */}
        <div className="login-image-section">
          <img src={customLoginImage} alt="Login Visual" />
        </div>

        {/* Right Side */}
        <div className="login-form-section">
          <div className="form-brand">
            <span className="brand-logo">INQUIZO</span>
            <span className="brand-text">Build Forms, Collect Data</span>
            <div className="brand-underline"></div>
          </div>

          <h2 className="login-title">
            LOGIN
            
          </h2>

          <p className="welcome-message">Welcome back! Please enter your details.</p>

          <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="form-group">
              <input
                type="email"
                placeholder="Applicant Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-options">
              <label className="show-password-label">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  disabled={loading}
                />
                Show Password
              </label>
              <a href="#" className="forgot-password-link" onClick={handleForgotPassword}>
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? <Spinner size={22} /> : 'Login'}
            </button>
            <button type="button" className="login-button new-user-button" onClick={handleNewUser} disabled={loading}>
              New User? Sign Up
            </button>
          </form>

          <div className="oauth-divider">or continue with</div>

          <div className="oauth-buttons">
            <button
              className="oauth-button google-button"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
            >
              Continue with Google
            </button>
            <button
              className="oauth-button github-button"
              onClick={() => handleOAuthLogin('github')}
              disabled={loading}
            >
              Continue with GitHub
            </button>
          </div>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}
