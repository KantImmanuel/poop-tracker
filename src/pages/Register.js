import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <div className="container">
        <div className="text-center mb-3">
          <span style={{ fontSize: '64px' }}>🍽️💩</span>
          <h1 style={{ margin: '16px 0 8px', color: '#4A2E1F' }}>Create Account</h1>
          <p className="text-muted">Start tracking your IBS triggers</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#F5E3E0', color: '#B8564A', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p className="text-center mt-2">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#7E8B47', fontWeight: '500' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
