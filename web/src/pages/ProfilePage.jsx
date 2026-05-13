import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="container page">
      <h1 className="text-3xl font-bold mb-lg">👤 Tài khoản</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 24 }}>
        {/* Left: avatar + points */}
        <div>
          <div className="card text-center">
            <div
              style={{
                width: 100, height: 100, borderRadius: 50,
                background: 'var(--primary)', color: 'white',
                fontSize: 48, fontWeight: 'bold',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              {user?.full_name?.charAt(0)?.toUpperCase() || '👤'}
            </div>
            <h2 className="text-xl font-bold mt-md">{user?.full_name}</h2>
            <div className="text-secondary text-sm">{user?.email}</div>

            {user?.tier_name && (
              <div className="badge badge-warning mt-md" style={{ fontSize: 13, padding: '6px 14px' }}>
                ⭐ Thành viên {user.tier_name}
              </div>
            )}
          </div>

          {/* Points card */}
          <div
            className="card mt-md text-center"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            <div className="text-sm" style={{ opacity: 0.9 }}>Điểm tích lũy</div>
            <div style={{ fontSize: 48, fontWeight: 'bold', marginTop: 4 }}>
              {user?.loyalty_points || 0}
            </div>
            <div className="text-sm" style={{ opacity: 0.85, marginTop: 4 }}>
              10.000đ = 1 điểm
            </div>
          </div>
        </div>

        {/* Right: info */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-md">Thông tin cá nhân</h3>
          <InfoRow label="📧 Email" value={user?.email} />
          <InfoRow label="📱 Số điện thoại" value={user?.phone || 'Chưa cập nhật'} />
          <InfoRow label="🎂 Ngày sinh" value={user?.date_of_birth || 'Chưa cập nhật'} />
          <InfoRow label="⚧ Giới tính" value={user?.gender || 'Chưa cập nhật'} />
          <InfoRow label="👤 Vai trò" value={user?.role_name || 'customer'} />
          <InfoRow label="✉️ Email xác minh" value={user?.email_verified ? '✅ Đã xác minh' : '⚠️ Chưa xác minh'} />

          <div className="divider" />

          <h3 className="text-lg font-semibold mb-md">Mã giảm giá có sẵn</h3>
          <div className="text-secondary text-sm mb-sm">
            Áp dụng các mã sau tại bước thanh toán:
          </div>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            {['U22', 'STUDENT10', 'HAPPYDAY', 'NEWUSER50', 'BIRTHDAY', 'COMBO_100K'].map(c => (
              <code
                key={c}
                style={{
                  padding: '6px 12px',
                  background: 'var(--surface-light)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >{c}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span className="text-secondary" style={{ width: 180 }}>{label}</span>
      <span style={{ flex: 1 }}>{value}</span>
    </div>
  );
}
