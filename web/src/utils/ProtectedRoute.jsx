import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

/**
 * Bảo vệ route, optional check role.
 *
 * Cách dùng:
 *   <ProtectedRoute>...</ProtectedRoute>             - chỉ cần đăng nhập
 *   <ProtectedRoute requireRole="admin">...</...>     - cần là admin
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading text="Đang khởi động..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Check role nếu yêu cầu
  if (requireRole && user.role !== requireRole) {
    return (
      <div className="container page">
        <div className="empty">
          <div className="empty-icon">🔒</div>
          <div className="text-lg font-bold mb-sm">Không có quyền truy cập</div>
          <div className="text-muted">
            Trang này chỉ dành cho <strong>{requireRole}</strong>.
            <br />
            Vai trò hiện tại: <strong>{user.role}</strong>
          </div>
          <button onClick={() => window.history.back()} className="btn btn-primary mt-md">
            ← Quay lại
          </button>
        </div>
      </div>
    );
  }

  return children;
}
