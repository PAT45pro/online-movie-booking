import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './utils/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import MoviesPage from './pages/MoviesPage';
import MovieDetailPage from './pages/MovieDetailPage';
import CinemasPage from './pages/CinemasPage';
import CinemaDetailPage from './pages/CinemaDetailPage';
import PromotionsPage from './pages/PromotionsPage';
import PromotionDetailPage from './pages/PromotionDetailPage';
import NewsPage from './pages/NewsPage';
import NewsDetailPage from './pages/NewsDetailPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import PaymentPage from './pages/PaymentPage';
import BookingConfirmPage from './pages/BookingConfirmPage';
import MyBookingsPage from './pages/MyBookingsPage';
import ProfilePage from './pages/ProfilePage';

// Layout wrapper để ẩn Navbar/Footer trên các trang auth
function AppLayout({ children }) {
  const location = useLocation();
  const authRoutes = ['/login', '/register'];
  const isAuthPage = authRoutes.includes(location.pathname);

  if (isAuthPage) return children;

  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

// Public-only: nếu đã login thì redirect về home
function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            {/* Auth (public) */}
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

            {/* Trang công khai (xem được không cần login) */}
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/movies/:id" element={<MovieDetailPage />} />
            <Route path="/cinemas" element={<CinemasPage />} />
            <Route path="/cinemas/:id" element={<CinemaDetailPage />} />
            <Route path="/promotions" element={<PromotionsPage />} />
            <Route path="/promotions/:id" element={<PromotionDetailPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:id" element={<NewsDetailPage />} />

            {/* Các trang cần đăng nhập */}
            <Route path="/showtime/:showtimeId" element={<ProtectedRoute><SeatSelectionPage /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
            <Route path="/booking/:id" element={<ProtectedRoute><BookingConfirmPage /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}
