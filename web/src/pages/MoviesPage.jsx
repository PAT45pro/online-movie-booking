import { useEffect, useState, useCallback } from 'react';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { movieApi } from '../api/client';

export default function MoviesPage() {
  const [tab, setTab] = useState('now_showing');
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMovies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await movieApi.list({
        status: tab,
        search: search.trim() || undefined,
      });
      setMovies(data);
    } catch (e) { console.warn(e); }
    finally { setLoading(false); }
  }, [tab, search]);

  useEffect(() => {
    const t = setTimeout(fetchMovies, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchMovies, search]);

  return (
    <div className="container page">
      <div className="section-header">
        <h1 className="section-title">
          <span className="section-title-bar" />
          Danh sách phim
        </h1>
        <input
          type="search"
          placeholder="🔍 Tìm phim..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="section-tabs mb-lg">
        <div
          className={'section-tab' + (tab === 'now_showing' ? ' active' : '')}
          onClick={() => setTab('now_showing')}
        >🎞 Đang chiếu</div>
        <div
          className={'section-tab' + (tab === 'coming_soon' ? ' active' : '')}
          onClick={() => setTab('coming_soon')}
        >📅 Sắp chiếu</div>
      </div>

      {loading ? (
        <Loading />
      ) : movies.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🎭</div>
          <div>Không tìm thấy phim nào</div>
        </div>
      ) : (
        <div className="movie-grid-5">
          {movies.map(m => <MovieCard key={m.movie_id} movie={m} />)}
        </div>
      )}
    </div>
  );
}
