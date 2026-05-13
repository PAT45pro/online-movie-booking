const router = require('express').Router();
const auth = require('./controllers/authController');
const movie = require('./controllers/movieController');
const cinema = require('./controllers/cinemaController');
const showtime = require('./controllers/showtimeController');
const booking = require('./controllers/bookingController');
const payment = require('./controllers/paymentController');
const coupon = require('./controllers/couponController');
const content = require('./controllers/contentController');
const hold = require('./controllers/holdController');
const room = require('./controllers/roomController');
const { authRequired, authOptional } = require('./middleware/auth');

// ---- Auth ----
router.post('/auth/register', auth.register);
router.post('/auth/login',    auth.login);
router.get ('/auth/me',       authRequired, auth.me);

// ---- Content (banners, promotions, news) ----
router.get('/banners',           content.listBanners);
router.get('/promotions',        content.listPromotions);
router.get('/promotions/:id',    content.promotionDetail);
router.get('/news',              content.listNews);
router.get('/news/:id',          content.newsDetail);

// ---- Movies ----
router.get('/movies',                  movie.listMovies);
router.get('/movies/:id',              movie.movieDetail);
router.get('/movies/:id/showtimes',    movie.movieShowtimes);
router.get('/movies/:id/reviews',      movie.movieReviews);

// ---- Cinemas ----
router.get('/cinemas',         cinema.listCinemas);
router.get('/cinemas/cities',  cinema.listCities);
router.get('/cinemas/:id',     cinema.cinemaDetail);

// ---- Showtimes ----
router.get('/showtimes/:id',       showtime.showtimeDetail);
router.get('/showtimes/:id/seats', authOptional, showtime.showtimeSeats);
// Admin only: hủy suất chiếu (force majeure) → tự động hoàn tiền cho khách
router.patch('/showtimes/:id/cancel', authRequired, showtime.cancelShowtime);

// ---- Seat Holds (giữ ghế tạm 8 phút) ----
router.post  ('/showtimes/:id/holds',                authRequired, hold.createHolds);
router.get   ('/showtimes/:id/holds',                authRequired, hold.getMyHolds);
router.delete('/showtimes/:id/holds/:session_id',    authRequired, hold.releaseHolds);

// ---- Rooms (public read layout, admin save) ----
router.get ('/rooms/:id/layout',          room.getRoomLayout);
router.post('/admin/rooms/:id/layout',    authRequired, room.saveRoomLayout);
router.get ('/admin/rooms',                authRequired, room.listRoomsForAdmin);

// ---- Bookings (đều yêu cầu login) ----
router.post ('/bookings',             authRequired, booking.createBooking);     // legacy direct
router.post ('/bookings/from-hold',   authRequired, booking.createFromHold);    
router.get  ('/bookings/mine',        authRequired, booking.myBookings);
router.get  ('/bookings/:id',         authRequired, booking.bookingDetail);
// KHÔNG có route cancel - không hỗ trợ khách tự hủy vé

// ---- Payments ----
router.get ('/payments/methods',  payment.listMethods);
router.post('/payments',          authRequired, payment.pay);

// ---- Coupons ----
router.get ('/coupons',           coupon.listActive);
router.post('/coupons/validate',  authRequired, coupon.validate);

module.exports = router;
