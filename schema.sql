-- ============================================================================
--  CƠ SỞ DỮ LIỆU: HỆ THỐNG ĐẶT VÉ XEM PHIM TRỰC TUYẾN
--  Database: cinema_booking
--  DBMS: MySQL 8.0+
--  Tác giả: Nhóm đồ án — 2026
-- ============================================================================

DROP DATABASE IF EXISTS cinema_booking;
CREATE DATABASE cinema_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinema_booking;

-- ============================================================================
-- 1. NHÓM BẢNG NGƯỜI DÙNG & PHÂN QUYỀN
-- ============================================================================

-- Bảng vai trò (phân quyền)
CREATE TABLE roles (
    role_id        INT PRIMARY KEY AUTO_INCREMENT,
    role_name      VARCHAR(30)  NOT NULL UNIQUE,        -- customer, staff, admin
    description    VARCHAR(200),
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Bảng hạng thành viên (membership tier)
CREATE TABLE membership_tiers (
    tier_id            INT PRIMARY KEY AUTO_INCREMENT,
    tier_name          VARCHAR(30) NOT NULL UNIQUE,     -- Silver, Gold, Platinum, Diamond
    min_points         INT NOT NULL DEFAULT 0,
    discount_percent   DECIMAL(5,2) NOT NULL DEFAULT 0, -- giảm giá mặc định cho thành viên
    benefits           TEXT
) ENGINE=InnoDB;

-- Bảng người dùng
CREATE TABLE users (
    user_id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(100) NOT NULL UNIQUE,
    phone           VARCHAR(15)  UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    date_of_birth   DATE,
    gender          ENUM('male','female','other'),
    avatar_url      VARCHAR(500),
    role_id         INT NOT NULL,
    tier_id         INT,
    loyalty_points  INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (tier_id) REFERENCES membership_tiers(tier_id),
    INDEX idx_user_email (email),
    INDEX idx_user_phone (phone)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. NHÓM BẢNG RẠP CHIẾU, PHÒNG CHIẾU, GHẾ
-- ============================================================================

-- Bảng rạp chiếu phim (cụm rạp)
CREATE TABLE cinemas (
    cinema_id      INT PRIMARY KEY AUTO_INCREMENT,
    name           VARCHAR(150) NOT NULL,               -- VD: CGV Vincom Bà Triệu
    address        VARCHAR(300) NOT NULL,
    city           VARCHAR(50)  NOT NULL,
    district       VARCHAR(50),
    phone          VARCHAR(15),
    email          VARCHAR(100),
    latitude       DECIMAL(10,7),
    longitude      DECIMAL(10,7),
    image_url      VARCHAR(500),
    opening_time   TIME,
    closing_time   TIME,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cinema_city (city)
) ENGINE=InnoDB;

-- Bảng loại phòng chiếu (2D, 3D, IMAX, 4DX, Dolby...)
CREATE TABLE room_types (
    room_type_id      INT PRIMARY KEY AUTO_INCREMENT,
    code              VARCHAR(20) NOT NULL UNIQUE,      -- 2D, 3D, IMAX, 4DX, DOLBY, SCREENX
    name              VARCHAR(50) NOT NULL,             -- Phòng 2D tiêu chuẩn, IMAX, 4DX...
    description       TEXT,
    price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.0,-- hệ số nhân giá (2D=1.0, IMAX=1.5)
    extra_fee         DECIMAL(10,2) NOT NULL DEFAULT 0  -- phụ thu cố định (nếu có)
) ENGINE=InnoDB;

-- Bảng phòng chiếu
CREATE TABLE rooms (
    room_id         INT PRIMARY KEY AUTO_INCREMENT,
    cinema_id       INT NOT NULL,
    room_type_id    INT NOT NULL,
    room_name       VARCHAR(50) NOT NULL,               -- VD: Room 1, Room IMAX
    total_rows      INT NOT NULL,                       -- Số hàng ghế
    total_columns   INT NOT NULL,                       -- Số cột ghế
    total_seats     INT NOT NULL,                       -- Tổng số ghế thực tế
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (cinema_id)    REFERENCES cinemas(cinema_id),
    FOREIGN KEY (room_type_id) REFERENCES room_types(room_type_id),
    UNIQUE KEY uk_room_cinema (cinema_id, room_name)
) ENGINE=InnoDB;

-- Bảng loại ghế (Thường, VIP, Couple, Sweetbox...)
CREATE TABLE seat_types (
    seat_type_id      INT PRIMARY KEY AUTO_INCREMENT,
    code              VARCHAR(20) NOT NULL UNIQUE,      -- STANDARD, VIP, COUPLE, SWEETBOX, DISABLED
    name              VARCHAR(50) NOT NULL,             -- Ghế thường, Ghế VIP, Ghế đôi, Sweetbox
    description       TEXT,
    capacity          TINYINT NOT NULL DEFAULT 1,       -- 1 với ghế đơn, 2 với ghế đôi
    price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.0,-- hệ số nhân giá
    color_code        VARCHAR(7)                          -- mã màu hiển thị trên sơ đồ (#FF5733)
) ENGINE=InnoDB;

-- Bảng ghế (mỗi ghế thuộc 1 phòng, có loại ghế)
CREATE TABLE seats (
    seat_id        INT PRIMARY KEY AUTO_INCREMENT,
    room_id        INT NOT NULL,
    seat_type_id   INT NOT NULL,
    row_label      CHAR(3) NOT NULL,                    -- A, B, C, ... hoặc AA, BB
    column_number  INT NOT NULL,                        -- 1, 2, 3, ...
    seat_code      VARCHAR(10) NOT NULL,                -- VD: A1, B12, AA5
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (room_id)      REFERENCES rooms(room_id),
    FOREIGN KEY (seat_type_id) REFERENCES seat_types(seat_type_id),
    UNIQUE KEY uk_seat_position (room_id, row_label, column_number),
    INDEX idx_seat_room (room_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 3. NHÓM BẢNG PHIM
-- ============================================================================

-- Bảng phim
CREATE TABLE movies (
    movie_id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    title             VARCHAR(200) NOT NULL,            -- tên tiếng Việt
    original_title    VARCHAR(200),                     -- tên gốc
    description       TEXT,
    duration_minutes  INT NOT NULL,
    release_date      DATE NOT NULL,
    end_date          DATE,                             -- ngày kết thúc chiếu
    director          VARCHAR(150),
    country           VARCHAR(50),
    language          VARCHAR(30),
    subtitle          VARCHAR(50),                      -- Phụ đề: Việt, Anh, Việt-Anh
    age_rating        VARCHAR(10) NOT NULL,             -- P, K, T13, T16, T18, C
    poster_url        VARCHAR(500),
    trailer_url       VARCHAR(500),
    banner_url        VARCHAR(500),
    status            ENUM('coming_soon','now_showing','ended') NOT NULL DEFAULT 'coming_soon',
    rating_avg        DECIMAL(3,2) DEFAULT 0,           -- điểm đánh giá TB
    rating_count      INT NOT NULL DEFAULT 0,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_movie_status (status),
    INDEX idx_movie_release (release_date)
) ENGINE=InnoDB;

-- Bảng thể loại phim
CREATE TABLE genres (
    genre_id    INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(50) NOT NULL UNIQUE             -- Hành động, Kinh dị, Tình cảm...
) ENGINE=InnoDB;

-- Bảng n-n: Phim — Thể loại
CREATE TABLE movie_genres (
    movie_id    BIGINT NOT NULL,
    genre_id    INT NOT NULL,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(genre_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Bảng diễn viên
CREATE TABLE actors (
    actor_id    INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(150) NOT NULL,
    avatar_url  VARCHAR(500),
    biography   TEXT
) ENGINE=InnoDB;

-- Bảng n-n: Phim — Diễn viên
CREATE TABLE movie_actors (
    movie_id       BIGINT NOT NULL,
    actor_id       INT NOT NULL,
    character_name VARCHAR(100),                        -- vai diễn
    is_lead        BOOLEAN DEFAULT FALSE,               -- vai chính
    PRIMARY KEY (movie_id, actor_id),
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES actors(actor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. NHÓM BẢNG SUẤT CHIẾU & QUY TẮC GIÁ
-- ============================================================================

-- Bảng suất chiếu
CREATE TABLE showtimes (
    showtime_id    BIGINT PRIMARY KEY AUTO_INCREMENT,
    movie_id       BIGINT NOT NULL,
    room_id        INT NOT NULL,
    start_time     DATETIME NOT NULL,
    end_time       DATETIME NOT NULL,
    base_price     DECIMAL(10,2) NOT NULL,              -- giá gốc suất chiếu này
    language_option VARCHAR(30),                        -- Phụ đề / Lồng tiếng
    status         ENUM('scheduled','on_sale','sold_out','cancelled','finished')
                    NOT NULL DEFAULT 'on_sale',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (movie_id) REFERENCES movies(movie_id),
    FOREIGN KEY (room_id)  REFERENCES rooms(room_id),
    INDEX idx_showtime_movie (movie_id),
    INDEX idx_showtime_start (start_time),
    INDEX idx_showtime_room_time (room_id, start_time)
) ENGINE=InnoDB;

-- Bảng ngày lễ (để tăng giá)
CREATE TABLE holidays (
    holiday_id        INT PRIMARY KEY AUTO_INCREMENT,
    name              VARCHAR(100) NOT NULL,            -- Tết Nguyên Đán, Quốc Khánh...
    holiday_date      DATE NOT NULL,
    price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.5,
    description       VARCHAR(200),
    UNIQUE KEY uk_holiday_date (holiday_date)
) ENGINE=InnoDB;

-- Bảng quy tắc giá theo ngày trong tuần & khung giờ
CREATE TABLE price_rules (
    rule_id           INT PRIMARY KEY AUTO_INCREMENT,
    rule_name         VARCHAR(100) NOT NULL,            -- Cuối tuần tối, Ngày thường sáng...
    day_type          ENUM('weekday','weekend','holiday','all') NOT NULL,
    -- bitmask thứ: 1=T2, 2=T3, 4=T4, 8=T5, 16=T6, 32=T7, 64=CN (kết hợp bằng OR)
    day_of_week_mask  INT,
    time_slot         ENUM('morning','afternoon','evening','latenight','all')
                      NOT NULL DEFAULT 'all',
    start_time        TIME,
    end_time          TIME,
    price_multiplier  DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    priority          INT NOT NULL DEFAULT 0,           -- ưu tiên (lớn hơn áp dụng trước)
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. NHÓM BẢNG KHUYẾN MÃI & COUPON
-- ============================================================================

-- Bảng coupon / voucher
CREATE TABLE coupons (
    coupon_id        INT PRIMARY KEY AUTO_INCREMENT,
    code             VARCHAR(50) NOT NULL UNIQUE,       -- U22, STUDENT10, BIRTHDAY, HAPPYDAY
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    discount_type    ENUM('percentage','fixed') NOT NULL, -- giảm %, giảm số tiền cố định
    discount_value   DECIMAL(10,2) NOT NULL,            -- 10 (%) hoặc 50000 (VND)
    max_discount     DECIMAL(10,2),                     -- giá trị giảm tối đa (nếu là %)
    min_order_value  DECIMAL(10,2) DEFAULT 0,           -- đơn hàng tối thiểu
    target_type      ENUM('all','u22','student','member','birthday','new_user','first_order')
                     NOT NULL DEFAULT 'all',
    target_tier_id   INT,                               -- chỉ dành cho hạng thành viên nào
    valid_from       DATETIME NOT NULL,
    valid_to         DATETIME NOT NULL,
    max_uses_total   INT,                               -- tổng số lần dùng tối đa
    max_uses_per_user INT DEFAULT 1,                    -- mỗi user dùng tối đa bao nhiêu lần
    used_count       INT NOT NULL DEFAULT 0,
    -- các ngày trong tuần được áp dụng (bitmask giống price_rules); NULL = tất cả
    applicable_days_mask INT,
    applicable_room_types VARCHAR(100),                 -- "2D,3D"  (rỗng = tất cả)
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (target_tier_id) REFERENCES membership_tiers(tier_id),
    INDEX idx_coupon_code (code)
) ENGINE=InnoDB;

-- Bảng lịch sử sử dụng coupon
CREATE TABLE coupon_usages (
    usage_id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    coupon_id         INT NOT NULL,
    user_id           BIGINT NOT NULL,
    booking_id        BIGINT,
    discount_amount   DECIMAL(10,2) NOT NULL,
    used_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id)  REFERENCES coupons(coupon_id),
    FOREIGN KEY (user_id)    REFERENCES users(user_id),
    INDEX idx_usage_user (user_id),
    INDEX idx_usage_coupon (coupon_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 6. NHÓM BẢNG ĐẶT VÉ & THANH TOÁN
-- ============================================================================

-- Bảng phương thức thanh toán
CREATE TABLE payment_methods (
    method_id     INT PRIMARY KEY AUTO_INCREMENT,
    code          VARCHAR(30) NOT NULL UNIQUE,          -- VNPAY, MOMO, ZALOPAY, VISA, BANK
    name          VARCHAR(100) NOT NULL,
    icon_url      VARCHAR(500),
    fee_percent   DECIMAL(5,2) DEFAULT 0,               -- phí phụ thu (nếu có)
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT DEFAULT 0
) ENGINE=InnoDB;

-- Bảng đơn đặt vé
CREATE TABLE bookings (
    booking_id        BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_code      VARCHAR(20) NOT NULL UNIQUE,      -- mã đơn hiển thị cho KH: BK2026041700001
    user_id           BIGINT NOT NULL,
    showtime_id       BIGINT NOT NULL,
    coupon_id         INT,
    subtotal          DECIMAL(10,2) NOT NULL,           -- tổng tiền ghế
    discount_amount   DECIMAL(10,2) NOT NULL DEFAULT 0, -- số tiền được giảm từ coupon
    service_fee       DECIMAL(10,2) NOT NULL DEFAULT 0, -- phí dịch vụ
    final_amount      DECIMAL(10,2) NOT NULL,           -- số tiền phải trả
    points_earned     INT NOT NULL DEFAULT 0,           -- điểm tích lũy thưởng
    status            ENUM('pending','awaiting_payment','paid','cancelled','refunded','used','expired')
                      NOT NULL DEFAULT 'pending',
    qr_code           VARCHAR(500),                     -- đường dẫn/chuỗi QR
    note              TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    expired_at        DATETIME,                         -- hết hạn giữ chỗ (thường 10-15 phút)
    paid_at           DATETIME,
    cancelled_at      DATETIME,
    FOREIGN KEY (user_id)     REFERENCES users(user_id),
    FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id),
    FOREIGN KEY (coupon_id)   REFERENCES coupons(coupon_id),
    INDEX idx_booking_user (user_id),
    INDEX idx_booking_showtime (showtime_id),
    INDEX idx_booking_status (status),
    INDEX idx_booking_created (created_at)
) ENGINE=InnoDB;

-- Bảng ghế được đặt trong đơn
CREATE TABLE booking_seats (
    booking_seat_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id        BIGINT NOT NULL,
    seat_id           INT NOT NULL,
    seat_price        DECIMAL(10,2) NOT NULL,           -- giá cuối đã tính multipliers
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id)    REFERENCES seats(seat_id),
    UNIQUE KEY uk_booking_seat (booking_id, seat_id),
    INDEX idx_bs_seat (seat_id)
) ENGINE=InnoDB;

-- Bảng thanh toán
CREATE TABLE payments (
    payment_id         BIGINT PRIMARY KEY AUTO_INCREMENT,
    booking_id         BIGINT NOT NULL,
    method_id          INT NOT NULL,
    amount             DECIMAL(10,2) NOT NULL,
    transaction_id     VARCHAR(100),                    -- mã giao dịch từ cổng thanh toán
    status             ENUM('pending','processing','success','failed','refunded','cancelled')
                       NOT NULL DEFAULT 'pending',
    gateway_response   TEXT,                            -- raw response từ cổng (JSON)
    initiated_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at       DATETIME,
    refunded_at        DATETIME,
    refund_amount      DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    FOREIGN KEY (method_id)  REFERENCES payment_methods(method_id),
    INDEX idx_payment_booking (booking_id),
    INDEX idx_payment_status (status),
    INDEX idx_payment_transaction (transaction_id)
) ENGINE=InnoDB;

-- ============================================================================
-- 7. NHÓM BẢNG ĐÁNH GIÁ & THÔNG BÁO
-- ============================================================================

-- Bảng đánh giá phim
CREATE TABLE reviews (
    review_id     BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id       BIGINT NOT NULL,
    movie_id      BIGINT NOT NULL,
    booking_id    BIGINT,                               -- liên kết vé (để đảm bảo đã xem)
    rating        TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 10),
    comment       TEXT,
    is_approved   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)    REFERENCES users(user_id),
    FOREIGN KEY (movie_id)   REFERENCES movies(movie_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id),
    UNIQUE KEY uk_user_movie_review (user_id, movie_id),
    INDEX idx_review_movie (movie_id)
) ENGINE=InnoDB;

-- Bảng thông báo cho người dùng
CREATE TABLE notifications (
    notification_id   BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id           BIGINT NOT NULL,
    title             VARCHAR(200) NOT NULL,
    message           TEXT NOT NULL,
    type              ENUM('booking','payment','promotion','system') NOT NULL,
    reference_id      BIGINT,                           -- ID của đối tượng liên quan
    is_read           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX idx_noti_user (user_id, is_read)
) ENGINE=InnoDB;

-- ============================================================================
-- 8. DỮ LIỆU MẪU (SEED DATA)
-- ============================================================================

-- Roles
INSERT INTO roles (role_name, description) VALUES
('customer', 'Khách hàng thông thường'),
('staff',    'Nhân viên rạp chiếu'),
('admin',    'Quản trị viên hệ thống');

-- Membership tiers
INSERT INTO membership_tiers (tier_name, min_points, discount_percent, benefits) VALUES
('Silver',   0,    0,  'Thành viên mới'),
('Gold',     500,  5,  'Giảm 5% các suất chiếu, tích điểm x1.2'),
('Platinum', 2000, 10, 'Giảm 10%, tích điểm x1.5, ưu tiên đặt vé sớm'),
('Diamond',  5000, 15, 'Giảm 15%, tích điểm x2, tặng bắp nước sinh nhật');

-- Room types
INSERT INTO room_types (code, name, description, price_multiplier, extra_fee) VALUES
('2D',      'Phòng 2D tiêu chuẩn',  'Chiếu phim 2D thông thường', 1.00, 0),
('3D',      'Phòng 3D',              'Chiếu 3D, có kính 3D',        1.25, 20000),
('IMAX',    'Phòng IMAX',            'Màn hình siêu lớn, âm thanh vòm IMAX', 1.50, 40000),
('4DX',     'Phòng 4DX',             'Ghế chuyển động, hiệu ứng môi trường', 1.60, 60000),
('DOLBY',   'Phòng Dolby Atmos',     'Âm thanh vòm Dolby Atmos',    1.35, 30000),
('SCREENX', 'Phòng ScreenX',         'Màn hình 270 độ bao quanh',   1.45, 35000),
('GOLD',    'Phòng Gold Class',      'Phòng hạng sang, ghế giường', 1.80, 80000);

-- Seat types
INSERT INTO seat_types (code, name, description, capacity, price_multiplier, color_code) VALUES
('STANDARD', 'Ghế thường',  'Ghế đơn thông thường',               1, 1.00, '#3498DB'),
('VIP',      'Ghế VIP',     'Ghế đơn hạng sang, rộng rãi hơn',    1, 1.30, '#E74C3C'),
('COUPLE',   'Ghế đôi',     'Ghế đôi dành cho 2 người',           2, 2.40, '#E91E63'),
('SWEETBOX', 'Ghế Sweetbox','Ghế giường đôi nằm, có bàn',         2, 2.80, '#9C27B0'),
('DISABLED', 'Ghế KT',      'Ghế dành cho người khuyết tật',      1, 0.80, '#95A5A6');

-- Payment methods
INSERT INTO payment_methods (code, name, fee_percent, display_order) VALUES
('VNPAY',   'VNPay',             0,    1),
('MOMO',    'Ví MoMo',           0,    2),
('ZALOPAY', 'ZaloPay',           0,    3),
('VISA',    'Thẻ Visa/Master',   1.5,  4),
('BANK',    'Chuyển khoản ngân hàng', 0, 5);

-- Price rules ví dụ
-- Ngày thường buổi sáng (T2-T5, trước 12h): giảm 20%
INSERT INTO price_rules (rule_name, day_type, day_of_week_mask, time_slot, start_time, end_time, price_multiplier, priority) VALUES
('Sáng ngày thường', 'weekday', 15,       'morning',   '06:00:00', '12:00:00', 0.80, 10),
('Chiều ngày thường','weekday', 15,       'afternoon', '12:00:00', '17:00:00', 1.00, 10),
('Tối ngày thường',  'weekday', 15,       'evening',   '17:00:00', '22:00:00', 1.10, 10),
('Khuya ngày thường','weekday', 15,       'latenight', '22:00:00', '23:59:59', 1.00, 10),
-- Cuối tuần (T6 tối, T7, CN): tăng giá
('Cuối tuần sáng',   'weekend', 112,      'morning',   '06:00:00', '12:00:00', 1.10, 20),
('Cuối tuần chiều',  'weekend', 112,      'afternoon', '12:00:00', '17:00:00', 1.20, 20),
('Cuối tuần tối',    'weekend', 112,      'evening',   '17:00:00', '22:00:00', 1.30, 20),
-- Ngày lễ: áp dụng toàn ngày
('Ngày lễ',          'holiday', NULL,     'all',        NULL,        NULL,       1.50, 30);
-- Ghi chú bitmask: T2=1, T3=2, T4=4, T5=8, T6=16, T7=32, CN=64 → T2-T5=15, T6+T7+CN=112

-- Holidays ví dụ
INSERT INTO holidays (name, holiday_date, price_multiplier) VALUES
('Tết Dương lịch',        '2026-01-01', 1.30),
('Mồng 1 Tết Âm lịch',    '2026-02-17', 1.50),
('Mồng 2 Tết Âm lịch',    '2026-02-18', 1.50),
('Mồng 3 Tết Âm lịch',    '2026-02-19', 1.50),
('Giỗ Tổ Hùng Vương',     '2026-04-16', 1.30),
('30/4 - Giải phóng',     '2026-04-30', 1.30),
('1/5 - Quốc tế LĐ',      '2026-05-01', 1.30),
('2/9 - Quốc khánh',      '2026-09-02', 1.30);

-- Coupons ví dụ
INSERT INTO coupons (code, name, description, discount_type, discount_value, max_discount, min_order_value, target_type, valid_from, valid_to, max_uses_total, max_uses_per_user, is_active) VALUES
('U22',        'Ưu đãi U22',           'Giảm 20% cho khách dưới 22 tuổi, tối đa 50k',
               'percentage', 20, 50000, 0,       'u22',        '2026-01-01 00:00:00','2026-12-31 23:59:59', NULL, 5, TRUE),
('STUDENT10',  'Học sinh - sinh viên', 'Giảm 10% cho HSSV có thẻ',
               'percentage', 10, 30000, 0,       'student',    '2026-01-01 00:00:00','2026-12-31 23:59:59', NULL, 10, TRUE),
('BIRTHDAY',   'Sinh nhật vui vẻ',     'Giảm 30% nhân ngày sinh nhật',
               'percentage', 30, 100000, 0,      'birthday',   '2026-01-01 00:00:00','2026-12-31 23:59:59', NULL, 1, TRUE),
('NEWUSER50',  'Khách mới',            'Giảm 50k cho đơn đầu tiên',
               'fixed', 50000, NULL, 100000,     'new_user',   '2026-01-01 00:00:00','2026-12-31 23:59:59', 10000, 1, TRUE),
('HAPPYDAY',   'Happy Day thứ 3',      'Giảm 25% các suất chiếu thứ 3 hàng tuần',
               'percentage', 25, 80000, 0,       'all',        '2026-01-01 00:00:00','2026-12-31 23:59:59', NULL, 4, TRUE);

-- Riêng HAPPYDAY chỉ áp dụng thứ 3 (mask = 2)
UPDATE coupons SET applicable_days_mask = 2 WHERE code = 'HAPPYDAY';

-- Genres
INSERT INTO genres (name) VALUES
('Hành động'),('Phiêu lưu'),('Hài'),('Tình cảm'),('Kinh dị'),
('Khoa học viễn tưởng'),('Hoạt hình'),('Tâm lý'),('Gia đình'),('Hình sự');

-- ============================================================================
-- 9. VIEW & PROCEDURE HỮU ÍCH
-- ============================================================================

-- View: các suất chiếu đang mở bán
CREATE OR REPLACE VIEW v_showtimes_on_sale AS
SELECT
    s.showtime_id, s.start_time, s.end_time, s.base_price, s.status,
    m.title AS movie_title, m.duration_minutes, m.age_rating, m.poster_url,
    r.room_name, rt.name AS room_type, rt.price_multiplier AS room_multiplier,
    c.name AS cinema_name, c.city
FROM showtimes s
JOIN movies  m  ON s.movie_id = m.movie_id
JOIN rooms   r  ON s.room_id  = r.room_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
JOIN cinemas c  ON r.cinema_id = c.cinema_id
WHERE s.status = 'on_sale' AND s.start_time > NOW();

-- View: tồn ghế theo suất chiếu
CREATE OR REPLACE VIEW v_seat_availability AS
SELECT
    s.showtime_id, se.seat_id, se.seat_code, se.row_label, se.column_number,
    st.code AS seat_type, st.name AS seat_type_name, st.price_multiplier AS seat_mult,
    CASE WHEN bs.booking_seat_id IS NULL THEN 'available' ELSE 'booked' END AS availability
FROM showtimes s
JOIN rooms r     ON s.room_id = r.room_id
JOIN seats se    ON se.room_id = r.room_id AND se.is_active = TRUE
JOIN seat_types st ON se.seat_type_id = st.seat_type_id
LEFT JOIN booking_seats bs ON bs.seat_id = se.seat_id
  AND bs.booking_id IN (
      SELECT booking_id FROM bookings
      WHERE showtime_id = s.showtime_id
        AND status IN ('pending','awaiting_payment','paid','used')
  );

-- Procedure: tính giá vé cuối cùng của 1 ghế trong 1 suất chiếu
DELIMITER //
CREATE PROCEDURE sp_calculate_seat_price(
    IN p_showtime_id BIGINT,
    IN p_seat_id     INT,
    OUT p_final_price DECIMAL(10,2)
)
BEGIN
    DECLARE v_base       DECIMAL(10,2);
    DECLARE v_room_mult  DECIMAL(4,2);
    DECLARE v_seat_mult  DECIMAL(4,2);
    DECLARE v_day_mult   DECIMAL(4,2) DEFAULT 1.0;
    DECLARE v_start_time DATETIME;
    DECLARE v_is_holiday INT;

    -- Lấy thông tin cơ bản
    SELECT s.base_price, rt.price_multiplier, s.start_time
    INTO v_base, v_room_mult, v_start_time
    FROM showtimes s
    JOIN rooms r      ON s.room_id = r.room_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    WHERE s.showtime_id = p_showtime_id;

    SELECT st.price_multiplier INTO v_seat_mult
    FROM seats se JOIN seat_types st ON se.seat_type_id = st.seat_type_id
    WHERE se.seat_id = p_seat_id;

    -- Kiểm tra ngày lễ
    SELECT COUNT(*) INTO v_is_holiday
    FROM holidays WHERE holiday_date = DATE(v_start_time);

    IF v_is_holiday > 0 THEN
        SELECT price_multiplier INTO v_day_mult
        FROM holidays WHERE holiday_date = DATE(v_start_time);
    ELSE
        -- Tìm price rule khớp với ngày & khung giờ (đơn giản hoá)
        SELECT COALESCE(MAX(price_multiplier),1.0) INTO v_day_mult
        FROM price_rules
        WHERE is_active = TRUE
          AND TIME(v_start_time) BETWEEN COALESCE(start_time,'00:00') AND COALESCE(end_time,'23:59')
          AND (day_of_week_mask IS NULL
                OR (day_of_week_mask & (1 << (WEEKDAY(v_start_time)))) > 0);
    END IF;

    SET p_final_price = ROUND(v_base * v_room_mult * v_seat_mult * v_day_mult, -2);
END //
DELIMITER ;

-- ============================================================================
-- HẾT SCRIPT
-- ============================================================================
