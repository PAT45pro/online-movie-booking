import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomApi } from '../api/client';
import Loading from '../components/Loading';

/**
 * Trang admin quản lý layout phòng chiếu
 *
 * Flow:
 *   1. Load danh sách TẤT CẢ phòng của tất cả rạp qua API GET /admin/rooms
 *   2. Group theo rạp + filter theo rạp + room_type
 *   3. Click 1 phòng → navigate /admin/rooms/:id/layout (AdminLayoutEditor)
 */
export default function AdminRoomsPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('all');
  const [selectedRoomType, setSelectedRoomType] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const data = await roomApi.listForAdmin();
        setRooms(data.rooms || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Group cinemas
  const cinemas = useMemo(() => {
    const map = {};
    rooms.forEach(r => {
      if (!map[r.cinema_id]) {
        map[r.cinema_id] = { cinema_id: r.cinema_id, cinema_name: r.cinema_name, room_count: 0 };
      }
      map[r.cinema_id].room_count++;
    });
    return Object.values(map).sort((a, b) => a.cinema_name.localeCompare(b.cinema_name));
  }, [rooms]);

  // Group room types
  const roomTypes = useMemo(() => {
    const set = new Set(rooms.map(r => r.room_type_code));
    return Array.from(set).sort();
  }, [rooms]);

  // Filter
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => {
      if (selectedCinemaId !== 'all' && r.cinema_id !== parseInt(selectedCinemaId)) return false;
      if (selectedRoomType !== 'all' && r.room_type_code !== selectedRoomType) return false;
      return true;
    });
  }, [rooms, selectedCinemaId, selectedRoomType]);

  // Group filtered rooms theo rạp để hiển thị section
  const grouped = useMemo(() => {
    const map = {};
    filteredRooms.forEach(r => {
      if (!map[r.cinema_id]) {
        map[r.cinema_id] = { cinema_name: r.cinema_name, rooms: [] };
      }
      map[r.cinema_id].rooms.push(r);
    });
    return Object.values(map);
  }, [filteredRooms]);

  if (loading) return <Loading text="Đang tải danh sách phòng..." />;

  return (
    <div className="container page">
      {/* Header */}
      <div className="mb-lg">
        <h1 className="text-2xl font-bold">🏛 Quản lý layout phòng chiếu</h1>
        <div className="text-muted text-sm mt-xs">
          Chọn rạp và phòng để chỉnh sửa sơ đồ ghế
        </div>
      </div>

      {error && (
        <div className="mb-md" style={{ padding: 12, background: 'var(--error)', borderRadius: 8, color: 'white' }}>
          ⚠ {error}
        </div>
      )}

      {/* Filter bar */}
      <div className="card mb-lg" style={{ padding: 16 }}>
        <div className="flex gap-md flex-wrap items-end">
          {/* Filter by cinema */}
          <div style={{ minWidth: 240, flex: 1 }}>
            <label className="text-xs text-muted">Rạp chiếu</label>
            <select
              className="input"
              value={selectedCinemaId}
              onChange={e => setSelectedCinemaId(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            >
              <option value="all">— Tất cả {cinemas.length} rạp ({rooms.length} phòng) —</option>
              {cinemas.map(c => (
                <option key={c.cinema_id} value={c.cinema_id}>
                  {c.cinema_name} ({c.room_count} phòng)
                </option>
              ))}
            </select>
          </div>

          {/* Filter by room type */}
          <div style={{ minWidth: 180 }}>
            <label className="text-xs text-muted">Loại phòng</label>
            <select
              className="input"
              value={selectedRoomType}
              onChange={e => setSelectedRoomType(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
            >
              <option value="all">Tất cả loại</option>
              {roomTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Stats */}
          <div className="text-sm text-muted" style={{ paddingBottom: 8 }}>
            Hiển thị <strong style={{ color: 'var(--primary)' }}>{filteredRooms.length}</strong> phòng
          </div>
        </div>
      </div>

      {/* Empty */}
      {filteredRooms.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🏛</div>
          <div>Không có phòng nào phù hợp bộ lọc</div>
        </div>
      )}

      {/* Rooms grouped by cinema */}
      {grouped.map(group => (
        <div key={group.cinema_name} className="mb-lg">
          <h3 className="text-lg font-bold mb-sm" style={{ color: 'var(--primary)' }}>
            📍 {group.cinema_name}
            <span className="text-muted text-sm" style={{ marginLeft: 8, fontWeight: 400 }}>
              ({group.rooms.length} phòng)
            </span>
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {group.rooms.map(r => (
              <RoomCard key={r.room_id} room={r}
                onClick={() => navigate(`/admin/rooms/${r.room_id}/layout`)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ Room Card ============ */
function RoomCard({ room, onClick }) {
  const typeColor = {
    '2D':   { bg: '#3498DB', label: '2D' },
    '3D':   { bg: '#9B59B6', label: '3D' },
    'IMAX': { bg: '#E67E22', label: 'IMAX' },
    '4DX':  { bg: '#E74C3C', label: '4DX' },
  }[room.room_type_code] || { bg: '#95A5A6', label: room.room_type_code };

  return (
    <div className="card" onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: '2px solid var(--border)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = '';
      }}>
      <div className="flex justify-between items-start mb-sm">
        <div className="font-bold text-lg" style={{ flex: 1 }}>{room.room_name}</div>
        <span style={{
          padding: '4px 10px', borderRadius: 6,
          background: typeColor.bg, color: 'white',
          fontSize: 11, fontWeight: 700,
        }}>{typeColor.label}</span>
      </div>

      <div className="text-sm text-muted mb-sm">
        Sơ đồ: <strong>{room.total_rows} hàng × {room.total_columns} cột</strong>
      </div>

      <div className="flex justify-between items-center mt-md" style={{
        paddingTop: 12, borderTop: '1px solid var(--border)',
      }}>
        <div className="text-sm">
          <strong style={{ color: 'var(--success)' }}>{room.total_seats}</strong>
          <span className="text-muted"> ghế</span>
        </div>
        <div className="text-xs" style={{
          color: room.has_layout ? 'var(--success)' : 'var(--warning)',
        }}>
          {room.has_layout ? '✓ Đã có layout' : '⚠ Chưa có layout JSON'}
        </div>
      </div>

      <button className="btn btn-primary btn-sm mt-md" style={{ width: '100%' }}>
        ✏️ Chỉnh sửa layout
      </button>
    </div>
  );
}
