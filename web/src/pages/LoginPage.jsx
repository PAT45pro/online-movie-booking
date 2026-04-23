import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('demo@cinema.vn');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">🎬</div>
        <h1 className="auth-title">Cinema Booking</h1>
        <p className="auth-subtitle">Đặt vé xem phim trực tuyến</p>

        <form onSubmit={submit} className="card">
          {error && (
            <div className="mb-md" style={{ padding: 12, background: 'var(--error)', borderRadius: 8, color: 'white' }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="text-center mt-md text-secondary text-sm">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </div>
        </form>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: 'var(--surface)',
            borderRadius: 8,
            borderLeft: '3px solid var(--warning)',
          }}
        >
          <div className="text-warning font-semibold text-sm">💡 Tài khoản demo</div>
          <div className="text-secondary text-sm mt-sm">
            <code>demo@cinema.vn</code> / <code>123456</code>
          </div>
        </div>
      </div>
    </div>
  );
}
