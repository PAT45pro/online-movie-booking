const db = require('../config/db');
const { asyncHandler, httpError } = require('../middleware/errorHandler');

/**
 * Cấu trúc layout JSON chuẩn
 *
 * {
 *   "rows": 8,
 *   "cols": 12,
 *   "cells": [
 *     // 2D array [rows][cols], mỗi cell là object hoặc null
 *     [
 *       { "type": "STANDARD", "label": "A1", "price_tier": 1 },
 *       { "type": "STANDARD", "label": "A2", "price_tier": 1 },
 *       { "type": "AISLE" },                    // lối đi
 *       ...
 *     ],
 *     [
 *       { "type": "STANDARD", "label": "B1", "price_tier": 1 },
 *       null,                                    // ô trống không xác định
 *       { "type": "COLUMN" },                    // cột trụ phòng
 *       { "type": "VIP", "label": "B4", "price_tier": 2 },
 *       ...
 *     ],
 *     ...
 *     [
 *       { "type": "COUPLE", "label": "G1", "price_tier": 3, "width_span": 2 },
 *       { "type": "EMPTY" },  // phần thứ 2 của ghế đôi G1
 *       ...
 *     ]
 *   ]
 * }
 *
 * Type values:
 *   STANDARD, VIP, COUPLE, SWEETBOX, DISABLED  - các loại ghế
 *   AISLE  - lối đi
 *   COLUMN - cột trụ phòng (không click được)
 *   EMPTY  - ô trống (vd: phần 2 của ghế đôi)
 */

// GET /api/rooms/:id/layout - admin/public đọc layout
exports.getRoomLayout = asyncHandler(async (req, res) => {
  const roomId = parseInt(req.params.id, 10);
  const [[room]] = await db.query(
    `SELECT r.room_id, r.room_name, r.total_rows, r.total_columns, r.total_seats,
            r.layout_json, r.cinema_id, r.room_type_id,
            rt.code AS room_type_code, rt.name AS room_type_name
     FROM rooms r JOIN room_types rt ON r.room_type_id = rt.room_type_id
     WHERE r.room_id = ?`, [roomId]);
  if (!room) throw httpError(404, 'Không tìm thấy phòng');

  let layout = null;
  if (room.layout_json) {
    try { layout = JSON.parse(room.layout_json); }
    catch (e) { layout = null; }
  }

  res.json({
    room_id: room.room_id,
    room_name: room.room_name,
    cinema_id: room.cinema_id,
    room_type: { code: room.room_type_code, name: room.room_type_name },
    total_rows: room.total_rows,
    total_columns: room.total_columns,
    total_seats: room.total_seats,
    layout,
  });
});

/**
 * POST /api/admin/rooms/:id/layout
 * Body: { rows, cols, cells: [[{type, label?, price_tier?, width_span?}, ...]] }
 *
 * Admin save layout. Hệ thống TỰ ĐỘNG:
 *   1. Validate layout structure
 *   2. UPDATE rooms.layout_json
 *   3. DELETE seats cũ (chỉ những seat KHÔNG có booking)
 *   4. INSERT seats mới từ layout (chỉ các cell có type là loại ghế)
 *   5. UPDATE rooms.total_seats
 */
exports.saveRoomLayout = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw httpError(403, 'Chỉ admin được sửa layout');
  }
  const roomId = parseInt(req.params.id, 10);
  const layout = req.body;

  // ===== Validate layout =====
  if (!layout || typeof layout !== 'object') {
    throw httpError(400, 'Layout phải là object JSON');
  }
  const { rows, cols, cells } = layout;
  if (!Number.isInteger(rows) || rows < 1 || rows > 30) {
    throw httpError(400, 'rows phải là số 1-30');
  }
  if (!Number.isInteger(cols) || cols < 1 || cols > 30) {
    throw httpError(400, 'cols phải là số 1-30');
  }
  if (!Array.isArray(cells) || cells.length !== rows) {
    throw httpError(400, `cells phải là mảng có ${rows} hàng`);
  }
  for (let r = 0; r < rows; r++) {
    if (!Array.isArray(cells[r]) || cells[r].length !== cols) {
      throw httpError(400, `Hàng ${r + 1} phải có ${cols} cột`);
    }
  }

  const SEAT_TYPES = ['STANDARD', 'VIP', 'COUPLE', 'SWEETBOX', 'DISABLED'];
  const NON_SEAT_TYPES = ['AISLE', 'COLUMN', 'EMPTY'];
  const VALID_TYPES = [...SEAT_TYPES, ...NON_SEAT_TYPES];

  // Validate từng cell + đảm bảo label unique
  const labels = new Set();
  let seatCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      if (cell === null) continue;
      if (typeof cell !== 'object') {
        throw httpError(400, `Cell [${r},${c}] phải là object hoặc null`);
      }
      if (!VALID_TYPES.includes(cell.type)) {
        throw httpError(400, `Cell [${r},${c}] type không hợp lệ: ${cell.type}`);
      }
      if (SEAT_TYPES.includes(cell.type)) {
        if (!cell.label || typeof cell.label !== 'string') {
          throw httpError(400, `Cell ghế [${r},${c}] phải có label`);
        }
        if (labels.has(cell.label)) {
          throw httpError(400, `Label trùng: ${cell.label}`);
        }
        labels.add(cell.label);
        seatCount++;
      }
    }
  }

  // ===== Lấy seat_type_id mapping =====
  const [seatTypes] = await db.query('SELECT seat_type_id, code FROM seat_types');
  const seatTypeMap = {};
  seatTypes.forEach(st => { seatTypeMap[st.code] = st.seat_type_id; });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verify room tồn tại
    const [[room]] = await conn.query(
      'SELECT room_id FROM rooms WHERE room_id = ? FOR UPDATE', [roomId]);
    if (!room) throw httpError(404, 'Không tìm thấy phòng');

    // Check có seat nào đã có booking đang active không
    const [activeBookings] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM booking_seats bs
       JOIN bookings b ON bs.booking_id = b.booking_id
       JOIN seats s ON bs.seat_id = s.seat_id
       WHERE s.room_id = ?
         AND b.status IN ('paid','used','pending','awaiting_payment')`,
      [roomId]);
    if (activeBookings[0].cnt > 0) {
      throw httpError(409,
        `Phòng đang có ${activeBookings[0].cnt} booking active - không thể đổi layout. ` +
        `Hủy/chờ các booking xong trước.`);
    }

    // 1. UPDATE layout_json
    await conn.query(
      `UPDATE rooms SET layout_json = ?, total_rows = ?, total_columns = ?, total_seats = ?
       WHERE room_id = ?`,
      [JSON.stringify(layout), rows, cols, seatCount, roomId]);

    // 2. XÓA seats cũ (cascade: holds + booking_seats expired/inactive cũng xóa)
    await conn.query('DELETE FROM seat_holds WHERE seat_id IN (SELECT seat_id FROM seats WHERE room_id = ?)', [roomId]);
    await conn.query('DELETE FROM seats WHERE room_id = ?', [roomId]);

    // 3. INSERT seats mới từ layout
    let inserted = 0;
    for (let r = 0; r < rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);  // A, B, C...
      for (let c = 0; c < cols; c++) {
        const cell = cells[r][c];
        if (!cell || !SEAT_TYPES.includes(cell.type)) continue;

        const typeId = seatTypeMap[cell.type];
        if (!typeId) continue;

        await conn.query(
          `INSERT INTO seats (room_id, seat_type_id, seat_code, row_label, column_number, is_active)
           VALUES (?, ?, ?, ?, ?, 1)`,
          [roomId, typeId, cell.label, rowLabel, c + 1]);
        inserted++;
      }
    }

    await conn.commit();
    res.json({
      message: 'Đã lưu layout',
      room_id: roomId,
      total_seats: inserted,
      total_rows: rows,
      total_cols: cols,
    });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    throw err;
  } finally {
    conn.release();
  }
});

// GET /api/admin/rooms - danh sách phòng để admin chọn
exports.listRoomsForAdmin = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') throw httpError(403, 'Chỉ admin');
  const [rooms] = await db.query(`
    SELECT r.room_id, r.room_name, r.total_rows, r.total_columns, r.total_seats,
           c.cinema_id, c.name AS cinema_name,
           rt.code AS room_type_code, rt.name AS room_type_name,
           r.layout_json IS NOT NULL AS has_layout
    FROM rooms r
    JOIN cinemas c ON r.cinema_id = c.cinema_id
    JOIN room_types rt ON r.room_type_id = rt.room_type_id
    ORDER BY c.name, r.room_name`);
  res.json({ rooms });
});
