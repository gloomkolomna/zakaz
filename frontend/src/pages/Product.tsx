import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type ProductDetail } from '../api/endpoints';
import { formatPrice } from '../api/money';
import BackLink from '../components/BackLink';
import EarlyBadge, { EarlyNote } from '../components/EarlyBadge';
import ProductImage from '../components/ProductImage';
import Skeleton from '../components/Skeleton';
import VideoBlock from '../components/VideoBlock';
import { clearDraft } from '../api/draft';
import { useSession } from '../context/SessionContext';

export default function Product() {
  const { id } = useParams();
  const productId = Number(id);
  const navigate = useNavigate();
  const { user } = useSession();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.product(productId)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.status === 404 ? 'Товар недоступен' : 'Не удалось загрузить товар');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) return <Skeleton lines={4} />;

  if (error || !product) {
    return (
      <main className="page">
        <BackLink to="/">Каталог</BackLink>
        <h1>{error || 'Товар недоступен'}</h1>
        <p className="lede">Вернитесь в каталог и выберите другой набор.</p>
      </main>
    );
  }

  function start() {
    clearDraft(productId);
    navigate(`/product/${productId}/build`);
  }

  const hasSteps = product.steps.length > 0;

  return (
    <main className="page">
      <BackLink to="/">Каталог</BackLink>
      <div className="page-product">
        <ProductImage src={product.image_url} alt={product.title} className="hero" />
        <div className="product-head">
          <div className="legend-title">{product.section_title}</div>
          <h1>
            {product.title}
            {product.sold_out && <span className="sold-out-note"> (товар закончился)</span>}
            {product.is_early && <EarlyBadge until={product.early_until} />}
          </h1>
          <div className="price-row">
            <span className="price">
              {product.from_price == null ? 'Скоро' : `от ${formatPrice(product.from_price)}`}
            </span>
            {hasSteps && <span className="price-note">· собирается по шагам</span>}
          </div>
          {product.description && <p className="body-text">{product.description}</p>}
          <VideoBlock video={product.video} cover={product.image_url} />

          {product.is_early && <EarlyNote until={product.early_until} />}

          {!hasSteps ? (
            <div className="blocked-cta">
              <button className="btn block" type="button" disabled>
                Скоро в продаже
              </button>
              <div className="blocked-note">Товар ещё наполняется.</div>
            </div>
          ) : product.sold_out ? (
            <div className="blocked-cta">
              <button className="btn block" type="button" disabled>
                Собрать заказ
              </button>
              <div className="blocked-note">Товар закончился.</div>
            </div>
          ) : product.can_order ? (
            <div className="blocked-cta">
              <button className="btn block" type="button" onClick={start}>
                Собрать заказ
              </button>
              {product.is_early && <div className="blocked-note">До анонса — вам доступно.</div>}
            </div>
          ) : (
            <div className="blocked-cta">
              <button className="btn block" type="button" disabled>
                Собрать заказ
              </button>
              <div className="blocked-note">
                {product.early_reason === 'early_access'
                  ? 'Сейчас доступно донам сообщества.'
                  : 'Товар пока недоступен.'}
              </div>
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="page-actions">
              <Link className="btn secondary" to={`/admin/products/${product.id}`}>
                Редактировать товар
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
