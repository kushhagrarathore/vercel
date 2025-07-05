import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase'; // Adjust path as needed
import './Signup.css';
import signupImage from './signup.jpg' // Update with your image name

const SignUp = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      alert('Signup successful! Check your email to verify your account.');
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="admin-header">
        INQUIZO
        <div className="nav-links" style={{ display: 'flex', gap: '1200px' }}></div>
      </div>

      <div className="signup-card">
        <div className="signup-form">
          <h2>Sign up for free</h2>
          <form onSubmit={handleSubmit}>
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <label>Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
          </form>
          <p>
            Already have an account? <Link to="/">Log in</Link>
          </p>
        </div>

        <div className="signup-image">
          <img
            src={signupImage}
            alt="Signup Illustration"
          />
        </div>
      </div>
    </div>
  );
};

export default SignUp;

