// node seed-demo.js — mỗi rạp có kích thước phòng và layout ghế khác nhau
require('dotenv').config();
const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

// ============================================================================
// CẤU HÌNH RẠP — mỗi rạp có đặc trưng riêng
// ============================================================================
// Mỗi rạp định nghĩa các phòng (room_types), kích thước phòng, và
// "layout" — hàm nhận (row, col) trả về loại ghế ('STANDARD'|'VIP'|'COUPLE'|'SWEETBOX'|'DISABLED'|null)
// null = không có ghế tại vị trí đó (lối đi, cột)
// ============================================================================

// Helper: các pattern layout
const layouts = {
  // Rạp CGV Vincom: phòng cao cấp, nhiều VIP giữa, sweetbox cuối
  cgv2D: { rows: 10, cols: 14, layout: (r, c, rowLabel) => {
    // Hàng đầu (A): toàn ghế thường, có 1 ghế khuyết tật đầu
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    // Bỏ cột lối đi ở giữa
    if (c === 7 || c === 8) return null;
    // Hàng cuối (J): sweetbox đôi
    if (rowLabel === 'J') return c % 2 === 1 ? 'SWEETBOX' : null;
    // Hàng gần cuối (H, I): hầu hết VIP
    if (['H', 'I'].includes(rowLabel) && c >= 3 && c <= 12) return 'VIP';
    // Hàng giữa (E, F, G): VIP ở giữa
    if (['E', 'F', 'G'].includes(rowLabel) && c >= 5 && c <= 10) return 'VIP';
    return 'STANDARD';
  }},

  cgv3D: { rows: 9, cols: 12, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 6 || c === 7) return null;  // lối đi
    if (rowLabel === 'I') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['F', 'G', 'H'].includes(rowLabel) && c >= 3 && c <= 10) return 'VIP';
    return 'STANDARD';
  }},

  cgvIMAX: { rows: 12, cols: 16, layout: (r, c, rowLabel) => {
    // Phòng IMAX lớn nhất
    if (rowLabel === 'A' && (c === 1 || c === 16)) return 'DISABLED';
    if (c === 8 || c === 9) return null;
    if (rowLabel === 'L') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['I', 'J', 'K'].includes(rowLabel) && c >= 4 && c <= 13) return 'VIP';
    if (['F', 'G', 'H'].includes(rowLabel) && c >= 6 && c <= 11) return 'VIP';
    return 'STANDARD';
  }},

  // Rạp Lotte: phòng nhỏ hơn, có couple seats
  lotte2D: { rows: 8, cols: 12, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 6 || c === 7) return null;
    // Hàng cuối: couple
    if (rowLabel === 'H') return c % 2 === 1 ? 'COUPLE' : null;
    if (['E', 'F', 'G'].includes(rowLabel) && c >= 3 && c <= 10) return 'VIP';
    return 'STANDARD';
  }},

  lotte3D: { rows: 8, cols: 10, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 5 || c === 6) return null;
    if (['D', 'E'].includes(rowLabel) && c >= 3 && c <= 8) return 'VIP';
    if (rowLabel === 'H') return c % 2 === 1 ? 'COUPLE' : null;
    return 'STANDARD';
  }},

  lotteIMAX: { rows: 10, cols: 14, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 7 || c === 8) return null;
    if (rowLabel === 'J') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['G', 'H', 'I'].includes(rowLabel) && c >= 3 && c <= 12) return 'VIP';
    return 'STANDARD';
  }},

  // Rạp Galaxy: phòng nhỏ gọn, nhiều hàng nhưng ít cột
  galaxy2D: { rows: 9, cols: 10, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 5 || c === 6) return null;
    if (rowLabel === 'I') return c % 2 === 1 ? 'COUPLE' : null;
    if (['F', 'G', 'H'].includes(rowLabel) && c >= 2 && c <= 9) return 'VIP';
    return 'STANDARD';
  }},

  galaxy3D: { rows: 8, cols: 12, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 6 || c === 7) return null;
    if (rowLabel === 'H') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['E', 'F', 'G'].includes(rowLabel) && c >= 3 && c <= 10) return 'VIP';
    return 'STANDARD';
  }},

  galaxyIMAX: { rows: 11, cols: 14, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 7 || c === 8) return null;
    if (rowLabel === 'K') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['H', 'I', 'J'].includes(rowLabel) && c >= 3 && c <= 12) return 'VIP';
    return 'STANDARD';
  }},

  // BHD Star: nhỏ gọn, bố trí đơn giản
  bhd2D: { rows: 7, cols: 10, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 5 || c === 6) return null;
    if (rowLabel === 'G') return c % 2 === 1 ? 'COUPLE' : null;
    if (['D', 'E', 'F'].includes(rowLabel) && c >= 3 && c <= 8) return 'VIP';
    return 'STANDARD';
  }},

  bhd3D: { rows: 8, cols: 11, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    // Không có lối đi
    if (rowLabel === 'H') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['E', 'F', 'G'].includes(rowLabel) && c >= 3 && c <= 9) return 'VIP';
    return 'STANDARD';
  }},

  bhdIMAX: { rows: 9, cols: 12, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 6 || c === 7) return null;
    if (rowLabel === 'I') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['F', 'G', 'H'].includes(rowLabel) && c >= 2 && c <= 11) return 'VIP';
    return 'STANDARD';
  }},

  // Beta Cinemas: phòng nhỏ, bình dân, ít VIP
  beta2D: { rows: 6, cols: 9, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 5) return null;  // 1 lối đi giữa
    if (rowLabel === 'F') return c % 2 === 1 ? 'COUPLE' : null;
    if (['D', 'E'].includes(rowLabel) && c >= 3 && c <= 7) return 'VIP';
    return 'STANDARD';
  }},

  beta3D: { rows: 7, cols: 10, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 5 || c === 6) return null;
    if (rowLabel === 'G') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['D', 'E', 'F'].includes(rowLabel) && c >= 3 && c <= 8) return 'VIP';
    return 'STANDARD';
  }},

  betaIMAX: { rows: 8, cols: 11, layout: (r, c, rowLabel) => {
    if (rowLabel === 'A' && c === 1) return 'DISABLED';
    if (c === 6) return null;
    if (rowLabel === 'H') return c % 2 === 1 ? 'SWEETBOX' : null;
    if (['F', 'G'].includes(rowLabel) && c >= 3 && c <= 9) return 'VIP';
    return 'STANDARD';
  }},
};

// Mỗi cinema mapping tới layouts riêng
const cinemaConfigs = [
  { key: 'cgv', name: 'CGV Vincom Bà Triệu', addr: '191 Bà Triệu, Hai Bà Trưng', city: 'Hà Nội', district: 'Hai Bà Trưng',
    phone: '1900-6017',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80&auto=format&fit=crop',
    rooms: [
      { name: 'Phòng CGV 2D-1', type: '2D', layout: 'cgv2D', basePrice: 90000 },
      { name: 'Phòng CGV 2D-2', type: '2D', layout: 'cgv2D', basePrice: 90000 },
      { name: 'Phòng CGV 3D',   type: '3D', layout: 'cgv3D', basePrice: 100000 },
      { name: 'Phòng CGV IMAX', type: 'IMAX', layout: 'cgvIMAX', basePrice: 120000 },
    ]},
  { key: 'lotte', name: 'Lotte Cinema Landmark', addr: 'Keangnam Landmark, Phạm Hùng', city: 'Hà Nội', district: 'Nam Từ Liêm',
    phone: '1900-2220',
    image: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80&auto=format&fit=crop',
    rooms: [
      { name: 'Phòng Lotte 2D-A', type: '2D', layout: 'lotte2D', basePrice: 85000 },
      { name: 'Phòng Lotte 2D-B', type: '2D', layout: 'lotte2D', basePrice: 85000 },
      { name: 'Phòng Lotte 3D',   type: '3D', layout: 'lotte3D', basePrice: 95000 },
      { name: 'Phòng Lotte IMAX', type: 'IMAX', layout: 'lotteIMAX', basePrice: 115000 },
    ]},
  { key: 'galaxy', name: 'Galaxy Nguyễn Du', addr: '116 Nguyễn Du, Q.1', city: 'Hồ Chí Minh', district: 'Quận 1',
    phone: '1900-2224',
    image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80&auto=format&fit=crop',
    rooms: [
      { name: 'Phòng Galaxy 2D-1', type: '2D', layout: 'galaxy2D', basePrice: 80000 },
      { name: 'Phòng Galaxy 2D-2', type: '2D', layout: 'galaxy2D', basePrice: 80000 },
      { name: 'Phòng Galaxy 3D',   type: '3D', layout: 'galaxy3D', basePrice: 90000 },
      { name: 'Phòng Galaxy IMAX', type: 'IMAX', layout: 'galaxyIMAX', basePrice: 110000 },
    ]},
  { key: 'bhd', name: 'BHD Star Phạm Ngọc Thạch', addr: '2 Phạm Ngọc Thạch, Đống Đa', city: 'Hà Nội', district: 'Đống Đa',
    phone: '1900-6969',
    image: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800&q=80&auto=format&fit=crop',
    rooms: [
      { name: 'Phòng BHD 2D',   type: '2D', layout: 'bhd2D', basePrice: 75000 },
      { name: 'Phòng BHD 3D',   type: '3D', layout: 'bhd3D', basePrice: 85000 },
      { name: 'Phòng BHD IMAX', type: 'IMAX', layout: 'bhdIMAX', basePrice: 100000 },
    ]},
  { key: 'beta', name: 'Beta Cinemas Thanh Xuân', addr: '447 Nguyễn Trãi, Thanh Xuân', city: 'Hà Nội', district: 'Thanh Xuân',
    phone: '024-6664-2020',
    image: 'https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=800&q=80&auto=format&fit=crop',
    rooms: [
      { name: 'Phòng Beta 2D-1', type: '2D', layout: 'beta2D', basePrice: 60000 },
      { name: 'Phòng Beta 2D-2', type: '2D', layout: 'beta2D', basePrice: 60000 },
      { name: 'Phòng Beta 3D',   type: '3D', layout: 'beta3D', basePrice: 70000 },
      { name: 'Phòng Beta IMAX', type: 'IMAX', layout: 'betaIMAX', basePrice: 85000 },
    ]},
];

// Label các hàng A, B, C, ...
const rowLabelOf = (i) => String.fromCharCode('A'.charCodeAt(0) + i);

async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu demo...');

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of ['booking_seats', 'payments', 'coupon_usages', 'bookings',
                   'reviews', 'notifications', 'showtimes', 'seats', 'rooms',
                   'movie_actors', 'movie_genres', 'movies', 'cinemas', 'users']) {
    await db.query(`DELETE FROM ${t}`);
    await db.query(`ALTER TABLE ${t} AUTO_INCREMENT = 1`);
  }
  await db.query('SET FOREIGN_KEY_CHECKS = 1');

  // ---- 1. RẠP ----
  for (const c of cinemaConfigs) {
    await db.query(
      `INSERT INTO cinemas (name, address, city, district, phone, opening_time, closing_time, image_url)
       VALUES (?, ?, ?, ?, ?, '09:00:00', '23:30:00', ?)`,
      [c.name, c.addr, c.city, c.district, c.phone, c.image]
    );
  }
  console.log(`  ✔ Đã thêm ${cinemaConfigs.length} rạp`);

  // ---- 2. PHÒNG ----
  const [roomTypes] = await db.query('SELECT * FROM room_types');
  const rtMap = Object.fromEntries(roomTypes.map(rt => [rt.code, rt.room_type_id]));

  let roomsPlan = []; // { cinemaIdx, roomIdx, room, layoutConf }
  for (let ci = 0; ci < cinemaConfigs.length; ci++) {
    const cinemaConfig = cinemaConfigs[ci];
    const [[cinema]] = await db.query('SELECT cinema_id FROM cinemas WHERE name = ?', [cinemaConfig.name]);

    for (const roomSpec of cinemaConfig.rooms) {
      const layoutConf = layouts[roomSpec.layout];

      // Build layout_json + đếm ghế từ cùng nguồn
      const layoutJson = { rows: layoutConf.rows, cols: layoutConf.cols, cells: [] };
      let totalSeats = 0;

      for (let r = 0; r < layoutConf.rows; r++) {
        const rowLabel = rowLabelOf(r);
        const rowCells = [];
        for (let c = 1; c <= layoutConf.cols; c++) {
          const type = layoutConf.layout(r, c, rowLabel);
          if (type === null) {
            // null = AISLE / lối đi
            rowCells.push({ type: 'AISLE' });
          } else if (typeof type === 'object' && type._special) {
            // Trường hợp đặc biệt nếu layout function trả về meta object
            rowCells.push(type._cell);
          } else {
            // Loại ghế thường
            rowCells.push({
              type,
              label: rowLabel + c,
              price_tier: type === 'VIP' ? 2 : type === 'COUPLE' || type === 'SWEETBOX' ? 3 : 1,
            });
            totalSeats++;
          }
        }
        layoutJson.cells.push(rowCells);
      }

      const [res] = await db.query(
        `INSERT INTO rooms (cinema_id, room_type_id, room_name, total_rows, total_columns, total_seats, layout_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cinema.cinema_id, rtMap[roomSpec.type], roomSpec.name,
         layoutConf.rows, layoutConf.cols, totalSeats, JSON.stringify(layoutJson)]
      );
      roomsPlan.push({
        room_id: res.insertId,
        cinema_id: cinema.cinema_id,
        basePrice: roomSpec.basePrice,
        layoutConf,
      });
    }
  }
  console.log(`  ✔ Đã thêm ${roomsPlan.length} phòng (kích thước khác nhau, có layout_json)`);

  // ---- 3. GHẾ - mỗi phòng có layout riêng ----
  const [seatTypes] = await db.query('SELECT * FROM seat_types');
  const stMap = Object.fromEntries(seatTypes.map(s => [s.code, s.seat_type_id]));
  let totalSeatsInserted = 0;

  for (const rp of roomsPlan) {
    const { room_id, layoutConf } = rp;
    for (let r = 0; r < layoutConf.rows; r++) {
      const rowLabel = rowLabelOf(r);
      for (let c = 1; c <= layoutConf.cols; c++) {
        const typeCode = layoutConf.layout(r, c, rowLabel);
        if (!typeCode) continue;  // null = không có ghế

        await db.query(
          `INSERT INTO seats (room_id, seat_type_id, row_label, column_number, seat_code)
           VALUES (?, ?, ?, ?, ?)`,
          [room_id, stMap[typeCode], rowLabel, c, rowLabel + c]);
        totalSeatsInserted++;
      }
    }
  }
  console.log(`  ✔ Đã sinh ${totalSeatsInserted} ghế cho tất cả phòng`);

  // ---- 4. PHIM (URL ảnh đã verify hoạt động + phim hot 2026) ----
  await db.query(`
    INSERT INTO movies
      (title, original_title, description, duration_minutes, release_date, director,
       country, language, subtitle, age_rating, poster_url, banner_url, trailer_url,
       status, rating_avg, rating_count) VALUES
    ('Moana 2: Vượt Sóng Đại Dương',
     'Moana 2',
     'Sau cuộc gọi bất ngờ từ tổ tiên đi biển, Moana phải vượt biển vào vùng nước nguy hiểm xa xôi để có một cuộc phiêu lưu chưa từng có. Cô tái hợp với Maui và đội thủy thủ mới để khám phá những hòn đảo bí ẩn.',
     100, '2024-11-27', 'David Derrick Jr.', 'Mỹ', 'Tiếng Anh', 'Việt', 'P',
     'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg',
     'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg',
     'https://www.youtube.com/embed/hDZHfDiyZX8',
     'now_showing', 8.5, 1250),

    ('Nàng Tiên Cá',
     'The Little Mermaid',
     'Câu chuyện về Ariel - nàng tiên cá dũng cảm, khao khát khám phá thế giới con người và tìm kiếm tình yêu đích thực với hoàng tử Eric.',
     135, '2026-05-26', 'Rob Marshall', 'Mỹ', 'Tiếng Anh', 'Việt',
     'P',
     'https://image.tmdb.org/t/p/w500/ym1dxyOk4jFcSl4Q2zmRrA5BEEN.jpg',
     'https://image.tmdb.org/t/p/w500/ym1dxyOk4jFcSl4Q2zmRrA5BEEN.jpg',
     'https://www.youtube.com/embed/kpGo2_d3oYE',
     'now_showing', 7.8, 890),

    ('Người Nhện: Du hành vũ trụ Nhện',
     'Spider-Man: Across the Spider-Verse',
     'Miles Morales trở lại trong cuộc phiêu lưu mới xuyên qua đa vũ trụ, gặp gỡ nhiều phiên bản Spider-Man khác nhau để chống lại kẻ thù đáng sợ nhất.',
     140, '2026-06-02', 'Joaquim Dos Santos', 'Mỹ', 'Tiếng Anh', 'Việt',
     'T13',
     'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
     'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg',
     'https://www.youtube.com/embed/cqGjhVJWtEg',
     'now_showing', 9.0, 2100),

    ('Fast & Furious 10',
     'Fast X',
     'Dom Toretto và gia đình đối đầu với kẻ thù đáng sợ nhất - Dante Reyes, con trai của tên tội phạm cũ tìm cách trả thù cho cha mình.',
     141, '2026-05-19', 'Louis Leterrier', 'Mỹ', 'Tiếng Anh', 'Việt',
     'T16',
     'https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclSiC.jpg',
     'https://image.tmdb.org/t/p/original/4XM8DUTQb3lhLemJC51Jx4a2EuA.jpg',
     'https://www.youtube.com/embed/32RAq6E3545',
     'now_showing', 8.2, 1680),

    ('Wicked: Phù Thủy Xứ Oz',
     'Wicked',
     'Câu chuyện về tình bạn không tưởng giữa hai phù thủy trẻ tuổi - Elphaba có làn da xanh đặc biệt và Galinda xinh đẹp, học cùng nhau tại Đại học Shiz và sau này trở thành Phù Thủy Tốt và Phù Thủy Xấu của xứ Oz.',
     160, '2024-11-22', 'Jon M. Chu', 'Mỹ', 'Tiếng Anh', 'Việt',
     'P',
     'https://image.tmdb.org/t/p/w500/c5Tqxeo1UpBvnAc3csUm7j3hlQl.jpg',
     'https://image.tmdb.org/t/p/w500/c5Tqxeo1UpBvnAc3csUm7j3hlQl.jpg',
     'https://www.youtube.com/embed/QDltY8gNEt4',
     'now_showing', 8.7, 980),

    ('Thỏ Ơi!!',
     'Tho Oi!!',
     'Phim Tết của đạo diễn Trấn Thành về talkshow "Chị Bờ Vai" do Hải Linh (LyLy) dẫn dắt - nơi những góc khuất đời tư và bí mật xã hội được phơi bày. Trấn Thành vào vai nam chính có tâm lý phức tạp, khai thác sâu chủ đề thao túng tâm lý trong kỷ nguyên mạng xã hội.',
     128, '2026-02-17', 'Trấn Thành', 'Việt Nam', 'Việt Nam', NULL,
     'T16',
     'https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg',
     'https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg',
     'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'now_showing', 9.1, 4500),

    ('Báu Vật Trời Cho',
     'Bau Vat Troi Cho',
     'Phim Tết 2026 lấy chủ đề về gia đình, hài hước và tình cảm. Hành trình đầy ấm áp tôn vinh giá trị của sự gắn kết giữa các thành viên trong gia đình giữa bối cảnh ngày Tết nhộn nhịp.',
     115, '2026-02-17', 'Lý Hải', 'Việt Nam', 'Việt Nam', NULL,
     'T13',
     'https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg',
     'https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg',
     'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'now_showing', 8.4, 2200),

    ('Avatar: Dòng Chảy Của Nước',
     'Avatar: The Way of Water',
     'Jake Sully và Neytiri bảo vệ gia đình khỏi mối đe dọa mới từ thế giới bên ngoài, khám phá thế giới dưới nước tuyệt đẹp của hành tinh Pandora.',
     192, '2026-12-16', 'James Cameron', 'Mỹ', 'Tiếng Anh', 'Việt',
     'T13',
     'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
     'https://image.tmdb.org/t/p/original/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
     'https://www.youtube.com/embed/d9MyW72ELq0',
     'coming_soon', 9.5, 3200),

    ('Quỷ Nhập Tràng 2',
     'Quy Nhap Trang 2',
     'Phim kinh dị Việt Nam phần 2 với tình tiết rùng rợn, khai thác tâm linh dân gian Việt. Một lễ "nhập tràng" cổ xưa bị lật ngược, kéo theo chuỗi sự kiện ma quái khó lý giải.',
     108, '2026-03-13', 'Lưu Thành Luân', 'Việt Nam', 'Việt Nam', NULL,
     'T18',
     'https://image.tmdb.org/t/p/w500/hU42CRk14JuPEdqZG3AWmagiPAP.jpg',
     'https://image.tmdb.org/t/p/w500/hU42CRk14JuPEdqZG3AWmagiPAP.jpg',
     'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'now_showing', 7.9, 1320),

    ('Deadpool và Wolverine',
     'Deadpool & Wolverine',
     'Người lính đánh thuê có miệng lưỡi đáng yêu Deadpool buộc phải hợp tác với Wolverine bất đắc dĩ để cứu vũ trụ Marvel khỏi mối đe dọa lớn nhất từ trước đến nay.',
     127, '2024-07-26', 'Shawn Levy', 'Mỹ', 'Tiếng Anh', 'Việt', 'T18',
     'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
     'https://image.tmdb.org/t/p/original/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg',
     'https://www.youtube.com/embed/73_1biulkYk',
     'now_showing', 8.4, 4500),

    ('Inside Out 2: Những Mảnh Ghép Cảm Xúc 2',
     'Inside Out 2',
     'Riley bước vào tuổi dậy thì và trụ sở cảm xúc trong tâm trí cô gặp phải sự đột phá lớn. Niềm Vui, Buồn Bã, Giận Dữ, Sợ Hãi và Chán Ghét phải nhường chỗ cho những cảm xúc mới: Lo Âu, Ghen Tị, Xấu Hổ và Buồn Chán.',
     96, '2024-06-14', 'Kelsey Mann', 'Mỹ', 'Tiếng Anh', 'Việt', 'P',
     'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
     'https://image.tmdb.org/t/p/original/stKGOm8UyhuLPR9sZLjs5AkmncA.jpg',
     'https://www.youtube.com/embed/LEjhY15eCx0',
     'now_showing', 8.6, 5200),

    ('Mufasa: Vua Sư Tử',
     'Mufasa: The Lion King',
     'Câu chuyện về thời thơ ấu của Mufasa - chú sư tử mồ côi đã trở thành vị vua huyền thoại. Hành trình từ chú sư tử lạc đường đến nhà lãnh đạo vĩ đại của vùng đồng cỏ.',
     118, '2024-12-20', 'Barry Jenkins', 'Mỹ', 'Tiếng Anh', 'Việt', 'P',
     'https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg',
     'https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg',
     'https://www.youtube.com/embed/o18g4LIWtJk',
     'coming_soon', 7.0, 320),

    ('Bố Già Trở Lại',
     'Bo Gia Tro Lai',
     'Phim Tết 2026 về người cha đơn thân và hành trình tái hợp với gia đình sau bao năm xa cách. Những tình huống cười ra nước mắt khi ông bố vụng về cố gắng làm hòa với con cái mình.',
     112, '2026-01-30', 'Trấn Thành', 'Việt Nam', 'Việt Nam', NULL,
     'T13',
     'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg',
     'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYgO6L.jpg',
     'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'coming_soon', 8.0, 450),

    ('Tử Chiến Trên Không',
     'Tu Chien Tren Khong',
     'Phim hành động Việt Nam 2026. Một chuyến bay chở khách bị bọn không tặc khống chế, cơ trưởng và một hành khách bí ẩn phải hợp tác để cứu cả máy bay khỏi thảm họa.',
     130, '2026-04-25', 'Hàm Trần', 'Việt Nam', 'Việt Nam', NULL,
     'T16',
     'https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclSiC.jpg',
     'https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclSiC.jpg',
     'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'coming_soon', 7.5, 280)
  `);
  console.log('  ✔ Đã thêm 14 phim (URL ảnh ổn định + phim Tết 2026 + phim Việt mới)');

  // ---- 5. SUẤT CHIẾU - dùng basePrice theo rạp ----
  const [movies] = await db.query('SELECT movie_id FROM movies WHERE status = "now_showing"');
  const times = ['09:30', '13:00', '16:30', '20:00'];
  const today = new Date(); today.setHours(0, 0, 0, 0);

  for (const m of movies) {
    for (let d = 0; d < 7; d++) {
      for (let t = 0; t < times.length; t++) {
        const date = new Date(today);
        date.setDate(today.getDate() + d);
        const [h, mm] = times[t].split(':');
        date.setHours(parseInt(h), parseInt(mm), 0, 0);

        const rp = roomsPlan[(m.movie_id + d + t) % roomsPlan.length];
        const endTime = new Date(date.getTime() + 120 * 60 * 1000);
        await db.query(
          `INSERT INTO showtimes (movie_id, room_id, start_time, end_time, base_price, language_option, status)
           VALUES (?, ?, ?, ?, ?, 'Phụ đề', 'on_sale')`,
          [m.movie_id, rp.room_id, date, endTime, rp.basePrice]);
      }
    }
  }
  console.log('  ✔ Đã sinh suất chiếu 7 ngày');

  // ---- 6. THỂ LOẠI cho phim ----
  const [genres] = await db.query('SELECT * FROM genres');
  const gMap = Object.fromEntries(genres.map(g => [g.name, g.genre_id]));
  const movieGenres = {
    1: ['Hoạt hình', 'Gia đình', 'Phiêu lưu'],
    2: ['Gia đình', 'Tình cảm'],
    3: ['Hành động', 'Hoạt hình', 'Khoa học viễn tưởng'],
    4: ['Hành động'],
    5: ['Hành động'],
    6: ['Hài', 'Tình cảm'],
    7: ['Hoạt hình', 'Hành động'],
    8: ['Khoa học viễn tưởng', 'Phiêu lưu'],
    9: ['Tình cảm'],
    10: ['Hoạt hình', 'Gia đình'],
  };
  for (const [mid, gNames] of Object.entries(movieGenres)) {
    for (const gn of gNames) {
      if (gMap[gn]) {
        await db.query('INSERT IGNORE INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
          [mid, gMap[gn]]);
      }
    }
  }

  // ---- 7. USER DEMO ----
  const pass = await bcrypt.hash('123456', 10);
  await db.query(`
    INSERT INTO users (email, password_hash, full_name, phone, date_of_birth, role_id, tier_id, email_verified, gender)
    VALUES
    ('demo@cinema.vn', ?, 'Khách Demo', '0901234567', '2005-01-15', 1, 1, 1, 'male'),
    ('admin@cinema.vn', ?, 'Quản trị viên', '0909999999', '1990-01-01', 3, 4, 1, 'female')
  `, [pass, pass]);
  console.log('  ✔ Đã thêm 2 user demo (mật khẩu: 123456)');

  // ---- 8. BANNERS, PROMOTIONS, NEWS (optional) ----
  try {
    const [[t]] = await db.query(
      `SELECT COUNT(*) AS n FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'banners'`);

    if (t.n > 0) {
      await db.query('DELETE FROM banners');
      await db.query('ALTER TABLE banners AUTO_INCREMENT = 1');
      await db.query('DELETE FROM promotions');
      await db.query('ALTER TABLE promotions AUTO_INCREMENT = 1');
      await db.query('DELETE FROM news');
      await db.query('ALTER TABLE news AUTO_INCREMENT = 1');

      await db.query(`
        INSERT INTO banners (title, subtitle, image_url, link_type, display_order) VALUES
        ('Thỏ Ơi!! — Phim Tết hot nhất 2026',
         'Trấn Thành đạo diễn — Đang chiếu rạp toàn quốc',
         'https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg', 'movie', 1),
        ('Fast & Furious 10 — Hành trình cuối cùng',
         'Bom tấn hành động mùa hè 2026',
         'https://image.tmdb.org/t/p/original/4XM8DUTQb3lhLemJC51Jx4a2EuA.jpg', 'movie', 2),
        ('Spider-Man: Du hành vũ trụ Nhện',
         'Trở lại với phiên bản IMAX đặc biệt',
         'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg', 'movie', 3)
      `);

      await db.query(`
        INSERT INTO promotions (title, short_desc, full_content, image_url, category, coupon_code, valid_from, valid_to, display_order) VALUES
        ('THỨ 3 VUI VẺ - 50K/VÉ',
         'Giảm giá siêu hấp dẫn mỗi thứ 3 hàng tuần, chỉ 50.000đ/vé cho mọi suất chiếu',
         'Chương trình "Thứ 3 Vui Vẻ" áp dụng cho tất cả các suất chiếu trong ngày thứ 3 hàng tuần. Giá vé đồng giá 50.000đ cho ghế thường, 70.000đ cho ghế VIP. Không áp dụng cho phòng IMAX và 4DX. Áp dụng mã HAPPYDAY tại bước thanh toán.',
         'https://i.imgur.com/0Eeq3Ym.jpg', 'event', 'HAPPYDAY', '2026-01-01', '2026-12-31', 1),
        ('NGÀY TRI ÂN - GIẢM 45K/VÉ',
         'Tri ân khách hàng thân thiết, vé chỉ từ 45.000đ cho tất cả suất chiếu',
         'Chương trình tri ân khách hàng diễn ra định kỳ hàng tháng. Khách hàng có thể mua vé với giá ưu đãi 45.000đ/vé cho tất cả các suất chiếu trong ngày tri ân. Mỗi khách được mua tối đa 4 vé/lần.',
         'https://i.imgur.com/7JJmQUM.jpg', 'event', NULL, '2026-01-01', '2026-12-31', 2),
        ('ZALOPAY - GIẢM 9K/VÉ',
         'Giảm 9K cho đơn từ 69K khi thanh toán qua ZaloPay',
         'Thanh toán qua ZaloPay nhận ưu đãi đặc biệt: giảm 9.000đ cho mọi đơn hàng từ 69.000đ. Chương trình áp dụng cho tất cả khách hàng mới sử dụng ZaloPay lần đầu.',
         'https://i.imgur.com/3fQbkHt.jpg', 'payment', NULL, '2026-01-01', '2026-12-31', 3),
        ('U22 - ƯU ĐÃI CHO NGƯỜI TRẺ',
         'Giảm 20% cho khách hàng dưới 22 tuổi, áp dụng mọi suất chiếu',
         'Dành riêng cho các bạn trẻ dưới 22 tuổi. Giảm ngay 20% giá vé (tối đa 50.000đ/lần) khi xuất trình CMND/CCCD tại quầy hoặc nhập mã U22 khi đặt online. Mỗi khách được dùng tối đa 5 lần/tháng.',
         'https://i.imgur.com/hWF2xJv.jpg', 'member', 'U22', '2026-01-01', '2026-12-31', 4),
        ('MEMBER GOLD - GIẢM 5% MỌI ĐƠN',
         'Thành viên Gold được giảm 5% cho tất cả đơn hàng, không giới hạn số lần',
         'Đặc quyền dành riêng cho thành viên hạng Gold trở lên. Giảm 5% trên tổng đơn hàng, không giới hạn số lần sử dụng. Tích lũy điểm nhanh gấp 1.2 lần so với thành viên Silver.',
         'https://i.imgur.com/kG5fEtL.jpg', 'member', 'MEMBER_GOLD', '2026-01-01', '2026-12-31', 5),
        ('COMBO BẮP NƯỚC GIẢM 10K',
         'Mua combo bắp + nước giảm ngay 10.000đ khi đặt vé online',
         'Khi đặt vé online kèm combo bắp + nước, khách hàng được giảm ngay 10.000đ trên tổng đơn hàng. Áp dụng cho đơn từ 300.000đ trở lên.',
         'https://i.imgur.com/vXrR8qz.jpg', 'combo', 'COMBO_100K', '2026-01-01', '2026-12-31', 6)
      `);

      await db.query(`
        INSERT INTO news (title, slug, summary, content, thumbnail, category) VALUES
        ('Thỏ Ơi!! của Trấn Thành cán mốc 450 tỷ doanh thu',
         'tho-oi-doanh-thu-450-ty',
         'Phim Tết của Trấn Thành lập kỷ lục doanh thu phòng vé Việt Nam đầu năm 2026.',
         'Phim Tết mới nhất của đạo diễn Trấn Thành "Thỏ Ơi!!" được xem là tác phẩm bùng nổ nhất màn ảnh rộng trong Quý 1 năm 2026. Câu chuyện nhuốm màu giật gân, bí ẩn và tình yêu xoay quanh Hải Linh - nữ MC nổi tiếng của chương trình "Chị Bờ Vai" khiến khán giả bất ngờ, thích thú đến tận phút cuối.\n\nDoanh thu Thỏ Ơi!! chạm gần con số 450 tỷ đồng (tính đến 30/3/2026), trở thành phim ăn khách thứ 3 mà Trấn Thành từng làm ra (sau Mai và Nhà Bà Nữ).',
         'https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg', 'Giới thiệu phim'),
        ('Người Nhện trở lại với phiên bản IMAX',
         'spider-man-imax-2026',
         'Spider-Man: Du hành vũ trụ Nhện công chiếu phiên bản IMAX với chất lượng hình ảnh đỉnh cao.',
         'Sony Pictures vừa công bố lịch chiếu phiên bản IMAX của "Spider-Man: Du hành vũ trụ Nhện" tại các rạp Việt Nam. Bộ phim đã thu về hơn 700 triệu USD trên toàn cầu và được đánh giá là một trong những phim hoạt hình hay nhất 2026.\n\nMiles Morales trở lại trong cuộc phiêu lưu mới xuyên qua đa vũ trụ, gặp gỡ nhiều phiên bản Spider-Man khác nhau.',
         'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 'Giới thiệu phim'),
        ('Avatar 3 dự kiến công chiếu cuối năm 2026',
         'avatar-3-release-date',
         'James Cameron xác nhận phần 3 của Avatar sẽ ra mắt vào tháng 12/2026.',
         'Trong cuộc phỏng vấn gần đây, đạo diễn James Cameron đã xác nhận phần 3 của Avatar sẽ chính thức công chiếu vào tháng 12 năm 2026 với nhiều công nghệ điện ảnh đột phá.\n\nJake Sully và Neytiri sẽ tiếp tục cuộc hành trình bảo vệ gia đình khỏi mối đe dọa mới từ thế giới bên ngoài.',
         'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg', 'Sự kiện'),
        ('Top 5 phim đáng xem nhất tháng 4/2026',
         'top-5-phim-thang-4',
         'Danh sách 5 bộ phim bom tấn đang "gây sốt" phòng vé tháng 4, không thể bỏ lỡ.',
         'Tháng 4 này, các rạp chiếu đã đón nhận nhiều bộ phim chất lượng. Dưới đây là top 5 phim đáng xem nhất:\n\n1. Thỏ Ơi!!\n2. Người Nhện: Du hành vũ trụ Nhện\n3. Fast & Furious 10\n4. Nàng Tiên Cá\n5. Quỷ Nhập Tràng 2',
         'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 'Review')
      `);
      console.log('  ✔ Đã thêm banners, promotions, news');
    }
  } catch (e) {
    console.log('  ⚠ Bỏ qua banners/promotions/news:', e.message);
  }

  console.log('\n🎉 Seed hoàn tất!');
  console.log(`   → ${cinemaConfigs.length} rạp, ${roomsPlan.length} phòng, ${totalSeatsInserted} ghế`);
  console.log('   → Đăng nhập: demo@cinema.vn / 123456');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
