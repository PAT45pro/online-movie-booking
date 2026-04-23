import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Bạn muốn đăng xuất?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <NavLink to="/" className="navbar-logo">
          🎬 Cinema<span className="navbar-logo-accent">Booking</span>
        </NavLink>

        <div className="navbar-menu">
          <NavLink to="/" end className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
            Trang chủ
          </NavLink>
          <NavLink to="/movies" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
            Phim
          </NavLink>
          <NavLink to="/cinemas" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
            Rạp/Giá vé
          </NavLink>
          <NavLink to="/promotions" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
            Ưu đãi
          </NavLink>
          <NavLink to="/news" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
            Tin tức
          </NavLink>
          {user && (
            <NavLink to="/my-bookings" className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}>
              Vé của tôi
            </NavLink>
          )}
        </div>

        <div className="navbar-right">
          {user ? (
            <>
              <NavLink to="/profile" className="flex items-center gap-sm navbar-link">
                <div className="navbar-avatar">{user.full_name?.charAt(0)?.toUpperCase()}</div>
                <span>{user.full_name?.split(' ').slice(-1)[0]}</span>
              </NavLink>
              <button className="btn btn-outline btn-sm" onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-outline btn-sm">Đăng nhập</NavLink>
              <NavLink to="/register" className="btn btn-primary btn-sm">Đăng ký</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
