import CachedImage from '../components/CachedImage';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { contentApi } from '../api/client';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.news()
      .then(setNews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="container page">
      <h1 className="section-title mb-lg">
        <span className="section-title-bar" />
        Tin tức / Giới thiệu
      </h1>

      {news.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📰</div>
          <div>Chưa có bài viết nào</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {news.map(n => (
            <Link key={n.news_id} to={`/news/${n.news_id}`} className="news-featured">
              <CachedImage src={n.thumbnail} alt={n.title} width={400} />
              <div className="news-featured-body">
                <div className="flex gap-sm mb-sm">
                  {n.category && <span className="badge badge-muted">{n.category}</span>}
                  <span className="text-muted text-xs">
                    {new Date(n.published_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="text-lg font-bold mb-sm" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>{n.title}</div>
                <div className="text-secondary text-sm" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>{n.summary}</div>
                <div className="text-muted text-xs mt-md">👁 {n.view_count} lượt xem</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
