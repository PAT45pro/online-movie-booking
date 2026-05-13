export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="navbar-logo mb-md" style={{ fontSize: 24 }}>
              🎬 Cinema<span className="navbar-logo-accent">Booking</span>
            </div>
            <p className="text-secondary text-sm" style={{ lineHeight: 1.6 }}>
              Hệ thống đặt vé xem phim trực tuyến với đầy đủ rạp chiếu, phim bom tấn,
              suất chiếu đa dạng và nhiều ưu đãi hấp dẫn.
            </p>
          </div>

          <div className="footer-col">
            <h4>Giới thiệu</h4>
            <ul>
              <li><a href="#">Về chúng tôi</a></li>
              <li><a href="#">Quy chế hoạt động</a></li>
              <li><a href="#">Hợp tác</a></li>
              <li><a href="#">Điều khoản</a></li>
              <li><a href="#">Nội quy</a></li>
              <li><a href="#">Chính sách</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Góc điện ảnh</h4>
            <ul>
              <li><a href="#">Điện ảnh</a></li>
              <li><a href="#">Bài viết</a></li>
              <li><a href="#">Bình chọn phim</a></li>
              <li><a href="#">Bình luận phim</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a href="#">Góp ý</a></li>
              <li><a href="#">Tuyển dụng</a></li>
              <li><a href="#">Hỗ trợ thành viên</a></li>
              <li><a href="#">Liên hệ</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 Cinema Booking. Đồ án sinh viên — Tất cả các quyền được bảo lưu.
        </div>
      </div>
    </footer>
  );
}
