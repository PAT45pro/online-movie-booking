const router = require('express').Router();
const auth = require('./controllers/authController');
const movie = require('./controllers/movieController');
const cinema = require('./controllers/cinemaController');
const showtime = require('./controllers/showtimeController');
const booking = require('./controllers/bookingController');
const payment = require('./controllers/paymentController');
const coupon = require('./controllers/couponController');
const content = require('./controllers/contentController');
const { authRequired } = require('./middleware/auth');

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
router.get('/showtimes/:id/seats', showtime.showtimeSeats);

// ---- Bookings (đều yêu cầu login) ----
router.post ('/bookings',             authRequired, booking.createBooking);
router.get  ('/bookings/mine',        authRequired, booking.myBookings);
router.get  ('/bookings/:id',         authRequired, booking.bookingDetail);
router.patch('/bookings/:id/cancel',  authRequired, booking.cancelBooking);

// ---- Payments ----
router.get ('/payments/methods',  payment.listMethods);
router.post('/payments',          authRequired, payment.pay);

// ---- Coupons ----
router.get ('/coupons',           coupon.listActive);
router.post('/coupons/validate',  authRequired, coupon.validate);

module.exports = router;
