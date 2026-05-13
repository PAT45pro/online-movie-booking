import CachedImage from '../components/CachedImage';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { contentApi } from '../api/client';

export default function NewsDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState(null);
  const [relatedNews, setRelatedNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      contentApi.newsDetail(id),
      contentApi.news({ limit: 5 }),
    ])
      .then(([detail, related]) => {
        setArticle(detail);
        setRelatedNews(related.filter(n => n.news_id !== parseInt(id)).slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!article) return (
    <div className="container page">
      <div className="empty">
        <div className="empty-icon">📰</div>
        <div>Không tìm thấy bài viết</div>
        <Link to="/news" className="btn btn-primary mt-md">Quay về danh sách</Link>
      </div>
    </div>
  );

  return (
    <div className="container page">
      <Link to="/news" className="btn btn-ghost btn-sm mb-md">← Quay lại</Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 32 }}>
        <div>
          <CachedImage src={article.thumbnail} alt={article.title} className="news-detail-hero" priority="high" width={1200} />

          <div className="flex gap-sm mb-md flex-wrap">
            {article.category && <span className="badge badge-primary">{article.category}</span>}
            <span className="text-muted text-sm">
              📅 {new Date(article.published_at).toLocaleDateString('vi-VN', {
                weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </span>
            <span className="text-muted text-sm">✍️ {article.author}</span>
            <span className="text-muted text-sm">👁 {article.view_count} lượt xem</span>
          </div>

          <h1 className="text-3xl font-bold mb-lg">{article.title}</h1>

          {article.summary && (
            <p
              className="text-lg text-secondary mb-lg"
              style={{ fontStyle: 'italic', lineHeight: 1.6, borderLeft: '3px solid var(--primary)', paddingLeft: 16 }}
            >
              {article.summary}
            </p>
          )}

          <div
            className="text-secondary"
            style={{ lineHeight: 1.9, fontSize: 16, whiteSpace: 'pre-line' }}
          >
            {article.content}
          </div>
        </div>

        {/* Sidebar: related news */}
        <div>
          <div className="card">
            <h3 className="text-lg font-bold mb-md">Bài viết khác</h3>
            {relatedNews.length === 0 ? (
              <p className="text-muted text-sm">Chưa có bài viết khác</p>
            ) : (
              <div className="news-list">
                {relatedNews.map(n => (
                  <Link key={n.news_id} to={`/news/${n.news_id}`} className="news-item">
                    <CachedImage src={n.thumbnail} alt={n.title} width={400} />
                    <div>
                      <div className="news-item-title">{n.title}</div>
                      <div className="text-muted text-xs">
                        {new Date(n.published_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
