import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <div className="container">
        <div className="text-center mb-3">
          <span style={{ fontSize: '64px' }}>🍽️💩</span>
          <h1 style={{ margin: '16px 0 8px', color: '#4A2E1F' }}>Gut Feeling</h1>
          <p className="text-muted">Track meals, find triggers</p>
        </div>

        <div className="card" style={{ background: 'white', border: '1px solid #E8D9C8' }}>
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
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-2">
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#7E8B47', fontWeight: '500' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
