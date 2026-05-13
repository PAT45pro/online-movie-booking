import { Link } from 'react-router-dom';
import CachedImage from './CachedImage';

export default function MovieCard({ movie }) {
  const handleTrailer = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (movie.trailer_url) {
      window.open(movie.trailer_url.replace('/embed/', '/watch?v='), '_blank');
    }
  };

  return (
    <div className="movie-card">
      <Link to={`/movies/${movie.movie_id}`} style={{ display: 'block', color: 'inherit' }}>
        <div className="movie-poster-wrap">
          <CachedImage
            src={movie.poster_url}
            alt={movie.title}
            width={400}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <span className="movie-age-badge">{movie.age_rating || 'P'}</span>
          <div className="movie-hover-overlay">
            <div className="movie-hover-actions">
              {movie.trailer_url && (
                <button className="btn btn-outline" onClick={handleTrailer}>
                  ▶ Trailer
                </button>
              )}
              <Link to={`/movies/${movie.movie_id}`} className="btn btn-primary">
                Đặt vé
              </Link>
            </div>
          </div>
        </div>

        <div className="movie-title">{movie.title}</div>
        <div className="movie-meta">
          <span>{movie.duration_minutes}′ Hoạt hình</span>
          <span className="movie-rating">⭐ {Number(movie.rating_avg || 0).toFixed(1)}/5</span>
        </div>
      </Link>

      <div className="movie-card-footer">
        {movie.trailer_url && (
          <button className="btn btn-outline" onClick={handleTrailer}>Trailer</button>
        )}
        <Link to={`/movies/${movie.movie_id}`} className="btn btn-primary">Đặt vé</Link>
      </div>
    </div>
  );
}
