import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', date_of_birth: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Mật khẩu tối thiểu 6 ký tự');

    setLoading(true);
    try {
      await register(form);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h1 className="auth-title">Tạo tài khoản</h1>
        <p className="auth-subtitle">Bắt đầu trải nghiệm đặt vé</p>

        <form onSubmit={submit} className="card">
          {error && (
            <div className="mb-md" style={{ padding: 12, background: 'var(--error)', borderRadius: 8, color: 'white' }}>
              {error}
            </div>
          )}

          {[
            ['Họ và tên *', 'full_name', 'text', 'Nguyễn Văn A', true],
            ['Email *', 'email', 'email', 'example@email.com', true],
            ['Số điện thoại', 'phone', 'tel', '0901234567', false],
            ['Ngày sinh', 'date_of_birth', 'date', '', false],
            ['Mật khẩu *', 'password', 'password', 'Tối thiểu 6 ký tự', true],
          ].map(([label, name, type, placeholder, required]) => (
            <div key={name} className="form-group">
              <label className="form-label">{label}</label>
              <input
                type={type}
                value={form[name]}
                onChange={setField(name)}
                placeholder={placeholder}
                required={required}
              />
            </div>
          ))}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Đăng ký'}
          </button>

          <div className="text-center mt-md text-secondary text-sm">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
