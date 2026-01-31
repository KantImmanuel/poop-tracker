import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function Settings() {
  const { user, isGuest, logout } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPwSuccess(false);
        setShowChangePassword(false);
      }, 2000);
    } catch (error) {
      setPwError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="container">
        {isGuest ? (
          <>
            {/* Guest: Create Account CTA */}
            <div className="card">
              <h3 style={{ margin: '0 0 8px 0' }}>You're using guest mode</h3>
              <p style={{ margin: '0 0 16px', color: '#7A5A44', fontSize: '14px', lineHeight: '1.5' }}>
                Your data is stored on this device only. Create an account to sync your data, access AI-powered insights, and use photo food logging.
              </p>
              <button
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => navigate('/register')}
              >
                Create Free Account
              </button>
              <p style={{ fontSize: '12px', color: '#7A5A44', textAlign: 'center', margin: '8px 0 0' }}>
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  style={{ background: 'none', border: 'none', color: '#7E8B47', fontWeight: '600', cursor: 'pointer', padding: 0, fontSize: '12px', fontFamily: 'inherit' }}
                >
                  Sign in
                </button>
              </p>
            </div>

            {/* Exit Guest Mode */}
            <div style={{ marginTop: '16px' }} />
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '2px solid #E8D9C8',
                borderRadius: '16px',
                color: '#B8564A',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '14px 24px',
                width: '100%',
                fontFamily: 'inherit'
              }}
            >
              Exit Guest Mode
            </button>
          </>
        ) : (
          <>
            {/* Account card */}
            <div className="card">
              <h3 style={{ margin: '0 0 8px 0' }}>Account</h3>
              <p style={{ margin: 0, color: '#7A5A44', fontSize: '15px' }}>{user?.email}</p>
            </div>

            {/* Change Password */}
            {!showChangePassword ? (
              <button
                onClick={() => { setShowChangePassword(true); setPwError(''); setPwSuccess(false); }}
                style={{
                  background: 'none',
                  border: '2px solid #E8D9C8',
                  borderRadius: '16px',
                  color: '#7A5A44',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '12px 24px',
                  width: '100%',
                  fontFamily: 'inherit'
                }}
              >
                Change Password
              </button>
            ) : (
              <div className="card">
                <h3 style={{ margin: '0 0 16px 0' }}>Change Password</h3>
                {pwSuccess && (
                  <div style={{ background: '#E5EDE5', color: '#3A6B3A', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                    Password updated!
                  </div>
                )}
                {pwError && (
                  <div style={{ background: '#F5E3E0', color: '#B8564A', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {pwError}
                  </div>
                )}
                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      className="input"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="submit"
                      disabled={pwLoading}
                      style={{
                        flex: 1,
                        background: '#7E8B47',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        opacity: pwLoading ? 0.6 : 1
                      }}
                    >
                      {pwLoading ? '...' : 'Update'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowChangePassword(false); setPwError(''); }}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: '2px solid #E8D9C8',
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '15px',
                        fontWeight: '600',
                        color: '#7A5A44',
                        cursor: 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sign Out */}
            <div style={{ marginTop: '16px' }} />
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '2px solid #E8D9C8',
                borderRadius: '16px',
                color: '#B8564A',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '14px 24px',
                width: '100%',
                fontFamily: 'inherit'
              }}
            >
              Sign Out
            </button>
          </>
        )}
      </div>

      {/* Footer links */}
      <div style={{ textAlign: 'center', padding: '24px', marginTop: 'auto', borderTop: '1px solid #E8D9C8' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '12px' }}>
          <button onClick={() => navigate('/privacy')} style={{ background: 'none', border: 'none', color: '#7A5A44', fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Privacy</button>
          <button onClick={() => navigate('/terms')} style={{ background: 'none', border: 'none', color: '#7A5A44', fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Terms</button>
          <button onClick={() => navigate('/contact')} style={{ background: 'none', border: 'none', color: '#7A5A44', fontSize: '14px', fontWeight: '500', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>Contact</button>
        </div>
        <p style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif", fontSize: '14px', fontWeight: '600', color: '#E8D9C8', margin: 0 }}>Gut Feeling</p>
      </div>
    </div>
  );
}

export default Settings;
