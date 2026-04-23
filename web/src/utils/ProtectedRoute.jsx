import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading text="Đang khởi động..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
