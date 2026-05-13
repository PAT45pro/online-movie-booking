import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomApi } from '../api/client';
import Loading from '../components/Loading';

/**
 * AdminLayoutEditor
 *
 * Visual editor cho admin quản lý layout phòng:
 *   - Input rows × cols
 *   - Toolbar chọn type: STANDARD/VIP/COUPLE/SWEETBOX/DISABLED/AISLE/COLUMN/EMPTY
 *   - Click vào ô để paint (với type đang chọn)
 *   - Drag để paint nhiều ô (mousedown + mouseover)
 *   - Hỗ trợ "tô cả hàng" "tô vùng" qua menu nhanh
 *   - Save → POST /api/admin/rooms/:id/layout
 */

const TYPES = [
  { code: 'STANDARD', name: 'Thường',    color: '#5dade2', label: 'S' },
  { code: 'VIP',      name: 'VIP',       color: '#e74c3c', label: 'V' },
  { code: 'COUPLE',   name: 'Đôi',       color: '#f1948a', label: 'C' },
  { code: 'SWEETBOX', name: 'Sweetbox',  color: '#a569bd', label: 'B' },
  { code: 'DISABLED', name: 'Khuyết tật',color: '#5d6d7e', label: 'D' },
  { code: 'AISLE',    name: 'Lối đi',    color: 'transparent', label: '·' },
  { code: 'COLUMN',   name: 'Cột phòng', color: '#2c3e50', label: '▣' },
  { code: 'EMPTY',    name: 'Trống',     color: '#1a1f2e', label: '×' },
];

const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.code, t]));

// Tạo cells trống ban đầu
function createEmptyCells(rows, cols) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: 'STANDARD' }))
  );
}

// Resize cells khi rows/cols thay đổi
function resizeCells(oldCells, newRows, newCols) {
  return Array.from({ length: newRows }, (_, r) =>
    Array.from({ length: newCols }, (_, c) => {
      if (oldCells[r] && oldCells[r][c]) return oldCells[r][c];
      return { type: 'STANDARD' };
    })
  );
}

// Auto-generate label "A1", "B5"... cho ghế
function autoLabel(rows, cols, cells) {
  return cells.map((row, r) => {
    const rowLabel = String.fromCharCode(65 + r);
    return row.map((cell, c) => {
      if (!cell) return { type: 'EMPTY' };
      const isRealSeat = ['STANDARD', 'VIP', 'COUPLE', 'SWEETBOX', 'DISABLED'].includes(cell.type);
      if (isRealSeat) {
        return { ...cell, label: `${rowLabel}${c + 1}` };
      }
      // Bỏ label cho cell không phải ghế
      const { label, ...rest } = cell;
      return rest;
    });
  });
}

export default function AdminLayoutEditor() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [cells, setCells] = useState(() => createEmptyCells(8, 12));
  const [activeType, setActiveType] = useState('STANDARD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isPainting, setIsPainting] = useState(false);

  // Load layout hiện có
  useEffect(() => {
    (async () => {
      try {
        const data = await roomApi.getLayout(roomId);
        setRoom(data);
        if (data.layout && data.layout.cells) {
          setRows(data.layout.rows);
          setCols(data.layout.cols);
          setCells(data.layout.cells);
        } else {
          // Init từ total_rows/cols
          setRows(data.total_rows || 8);
          setCols(data.total_columns || 12);
          setCells(createEmptyCells(data.total_rows || 8, data.total_columns || 12));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  // Resize khi thay đổi rows/cols
  const handleRowsChange = (newRows) => {
    if (newRows < 1 || newRows > 30) return;
    setRows(newRows);
    setCells(resizeCells(cells, newRows, cols));
  };
  const handleColsChange = (newCols) => {
    if (newCols < 1 || newCols > 30) return;
    setCols(newCols);
    setCells(resizeCells(cells, rows, newCols));
  };

  // Paint 1 ô
  const paintCell = (r, c) => {
    setCells(prev => {
      const next = prev.map(row => row.slice());
      if (activeType === 'AISLE' || activeType === 'COLUMN' || activeType === 'EMPTY') {
        next[r][c] = { type: activeType };
      } else {
        next[r][c] = { type: activeType, label: `${String.fromCharCode(65 + r)}${c + 1}` };
      }
      return next;
    });
  };

  // Tô cả hàng
  const fillRow = (r) => {
    setCells(prev => {
      const next = prev.map(row => row.slice());
      for (let c = 0; c < cols; c++) {
        next[r][c] = activeType === 'AISLE' || activeType === 'COLUMN' || activeType === 'EMPTY'
          ? { type: activeType }
          : { type: activeType, label: `${String.fromCharCode(65 + r)}${c + 1}` };
      }
      return next;
    });
  };

  // Tô cả cột
  const fillCol = (c) => {
    setCells(prev => {
      const next = prev.map(row => row.slice());
      for (let r = 0; r < rows; r++) {
        next[r][c] = activeType === 'AISLE' || activeType === 'COLUMN' || activeType === 'EMPTY'
          ? { type: activeType }
          : { type: activeType, label: `${String.fromCharCode(65 + r)}${c + 1}` };
      }
      return next;
    });
  };

  // Reset
  const resetLayout = () => {
    if (!confirm('Reset toàn bộ layout về STANDARD?')) return;
    setCells(createEmptyCells(rows, cols));
  };

  // Save
  const saveLayout = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const finalCells = autoLabel(rows, cols, cells);
      await roomApi.saveLayout(roomId, {
        rows,
        cols,
        cells: finalCells,
      });
      setSuccess('Đã lưu layout thành công!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const counts = {};
    cells.forEach(row => row.forEach(cell => {
      if (!cell) return;
      counts[cell.type] = (counts[cell.type] || 0) + 1;
    }));
    return counts;
  }, [cells]);

  if (loading) return <Loading />;
  if (!room) return (
    <div className="container page">
      <div className="empty">
        <div className="empty-icon">⚠️</div>
        <div>{error || 'Không tìm thấy phòng'}</div>
      </div>
    </div>
  );

  return (
    <div className="container page">
      <div className="flex justify-between items-center mb-md">
        <div>
          <button onClick={() => navigate('/admin/rooms')} className="btn btn-secondary btn-sm">
            ← Danh sách phòng
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-sm">Layout Editor</h1>
      <div className="text-muted mb-md">
        Phòng <strong>{room.room_name}</strong> ({room.room_type?.name})
      </div>

      {error && (
        <div className="mb-md" style={{ padding: 12, background: 'var(--error)', borderRadius: 8, color: 'white' }}>
          ⚠ {error}
        </div>
      )}
      {success && (
        <div className="mb-md" style={{ padding: 12, background: 'var(--success)', borderRadius: 8, color: 'white' }}>
          ✓ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 24 }}>
        {/* MAIN - Grid editor */}
        <div className="card">
          {/* Inputs rows × cols */}
          <div className="flex gap-md items-center mb-md">
            <label>
              <div className="text-xs text-muted">Số hàng</div>
              <input type="number" min={1} max={30} value={rows}
                onChange={e => handleRowsChange(parseInt(e.target.value) || 1)}
                className="input" style={{ width: 80 }} />
            </label>
            <label>
              <div className="text-xs text-muted">Số cột</div>
              <input type="number" min={1} max={30} value={cols}
                onChange={e => handleColsChange(parseInt(e.target.value) || 1)}
                className="input" style={{ width: 80 }} />
            </label>
            <button onClick={resetLayout} className="btn btn-secondary btn-sm">↻ Reset</button>
          </div>

          {/* Toolbar - chọn type */}
          <div className="text-xs text-muted mb-xs">Loại để paint:</div>
          <div className="flex gap-sm flex-wrap mb-md">
            {TYPES.map(t => (
              <button key={t.code}
                onClick={() => setActiveType(t.code)}
                className={`btn btn-sm ${activeType === t.code ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: activeType === t.code ? '2px solid var(--primary)' : '',
                }}>
                <span style={{
                  width: 16, height: 16, background: t.color, borderRadius: 3,
                  display: 'inline-block', textAlign: 'center', fontSize: 10, color: 'white',
                  border: t.color === 'transparent' ? '1px dashed #ccc' : 'none',
                }}>
                  {t.code === 'COLUMN' ? '▣' : ''}
                </span>
                {t.name}
              </button>
            ))}
          </div>

          {/* Màn hình */}
          <div style={{
            background: 'linear-gradient(180deg, #2c3e50, transparent)',
            color: 'white', textAlign: 'center', padding: 8,
            borderRadius: '50% 50% 0 0 / 30% 30% 0 0',
            marginBottom: 16, fontWeight: 'bold', letterSpacing: 4,
          }}>
            MÀN HÌNH
          </div>

          {/* Grid */}
          <div
            style={{ overflowX: 'auto', userSelect: 'none' }}
            onMouseUp={() => setIsPainting(false)}
            onMouseLeave={() => setIsPainting(false)}
          >
            {/* Header cột (1, 2, 3, ...) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `30px repeat(${cols}, 30px)`,
              gap: 4, marginBottom: 4,
            }}>
              <div />
              {Array.from({ length: cols }).map((_, c) => (
                <button key={c} onClick={() => fillCol(c)}
                  title={`Tô cả cột ${c + 1}`}
                  style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>
                  {c + 1}
                </button>
              ))}
            </div>

            {/* Rows */}
            {cells.map((row, r) => {
              const rowLabel = String.fromCharCode(65 + r);
              return (
                <div key={r} style={{
                  display: 'grid',
                  gridTemplateColumns: `30px repeat(${cols}, 30px)`,
                  gap: 4, marginBottom: 4,
                }}>
                  {/* Row label (A, B, ...) - click để fill row */}
                  <button onClick={() => fillRow(r)}
                    title={`Tô cả hàng ${rowLabel}`}
                    style={{
                      fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    }}>
                    {rowLabel}
                  </button>
                  {row.map((cell, c) => {
                    const t = TYPE_MAP[cell?.type] || TYPE_MAP['STANDARD'];
                    return (
                      <div key={c}
                        onMouseDown={() => { setIsPainting(true); paintCell(r, c); }}
                        onMouseEnter={() => { if (isPainting) paintCell(r, c); }}
                        title={`${rowLabel}${c + 1} - ${t.name}`}
                        style={{
                          width: 30, height: 30,
                          background: t.color === 'transparent' ? '#11151f' : t.color,
                          borderRadius: 4,
                          border: t.code === 'AISLE' ? '1px dashed #444' : 'none',
                          color: 'white', fontSize: 10, fontWeight: 'bold',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'transform 0.1s',
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {t.label}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="text-xs text-muted mt-md">
            💡 Mẹo: Click + kéo để paint nhiều ô. Click chữ A/B/C để tô cả hàng. Click số 1/2/3 để tô cả cột.
          </div>
        </div>

        {/* SIDEBAR - stats + save */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 88 }}>
            <h3 className="text-lg font-bold mb-md">📊 Thống kê</h3>
            <div className="text-sm mb-md">
              {TYPES.filter(t => stats[t.code]).map(t => (
                <div key={t.code} className="flex justify-between" style={{ padding: '4px 0' }}>
                  <span className="flex items-center gap-sm">
                    <span style={{
                      width: 12, height: 12, background: t.color, borderRadius: 2,
                      border: t.color === 'transparent' ? '1px dashed #ccc' : 'none',
                    }} />
                    {t.name}
                  </span>
                  <strong>{stats[t.code]}</strong>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 8 }}
                className="flex justify-between">
                <span>Tổng ghế thực:</span>
                <strong style={{ color: 'var(--primary)' }}>
                  {(stats.STANDARD || 0) + (stats.VIP || 0) + (stats.COUPLE || 0) + (stats.SWEETBOX || 0) + (stats.DISABLED || 0)}
                </strong>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" style={{ width: '100%' }}
              onClick={saveLayout} disabled={saving}>
              {saving ? 'Đang lưu...' : '💾 Lưu layout'}
            </button>

            <div className="text-muted text-xs mt-sm">
              ⚠ Khi save, tất cả ghế cũ sẽ bị xóa và tạo lại từ layout mới. KHÔNG thực hiện được nếu phòng đang có booking active.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
