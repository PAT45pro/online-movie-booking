import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { movieApi, cinemaApi } from '../api/client';

export default function QuickBooking() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [cities, setCities] = useState([]);
  const [cinemas, setCinemas] = useState([]);

  const [selMovie, setSelMovie] = useState('');
  const [selCity, setSelCity] = useState('');
  const [selCinema, setSelCinema] = useState('');
  const [selDate, setSelDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    movieApi.list({ status: 'now_showing' }).then(setMovies).catch(() => {});
    cinemaApi.cities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    if (selCity) {
      cinemaApi.list({ city: selCity }).then(setCinemas).catch(() => {});
    } else {
      setCinemas([]);
      setSelCinema('');
    }
  }, [selCity]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selMovie) {
      navigate(`/movies/${selMovie}`);
    }
  };

  return (
    <div className="container">
      <form onSubmit={handleSubmit} className="quick-booking">
        <div className="quick-booking-title">🎟 ĐẶT VÉ NHANH</div>
        <div className="quick-booking-row">
          <div className="quick-booking-field">
            <label>Phim</label>
            <select value={selMovie} onChange={(e) => setSelMovie(e.target.value)}>
              <option value="">-- Chọn phim --</option>
              {movies.map(m => (
                <option key={m.movie_id} value={m.movie_id}>{m.title}</option>
              ))}
            </select>
          </div>

          <div className="quick-booking-field">
            <label>Tỉnh / Thành</label>
            <select value={selCity} onChange={(e) => setSelCity(e.target.value)}>
              <option value="">-- Chọn thành phố --</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="quick-booking-field">
            <label>Rạp chiếu</label>
            <select value={selCinema} onChange={(e) => setSelCinema(e.target.value)} disabled={!cinemas.length}>
              <option value="">-- Chọn rạp --</option>
              {cinemas.map(c => <option key={c.cinema_id} value={c.cinema_id}>{c.name}</option>)}
            </select>
          </div>

          <div className="quick-booking-field">
            <label>Ngày</label>
            <input
              type="date"
              value={selDate}
              onChange={(e) => setSelDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={!selMovie}>
            Đặt vé →
          </button>
        </div>
      </form>
    </div>
  );
}
