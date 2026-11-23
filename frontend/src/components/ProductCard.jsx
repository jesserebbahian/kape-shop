import { Link } from 'react-router-dom';
import CoffeeImage from './CoffeeImage.jsx';
import { peso } from '../utils/format.js';

export default function ProductCard({ product, featured }) {
  const Title = featured ? 'h3' : 'h2';
  return (
    <article className="card">
      <CoffeeImage product={product} />
      <div className="body">
        <Title>{product.name}</Title>
        <span className="muted">{product.origin}, {product.roastLevel} roast</span>
        <span>{product.tastingNotes}</span>
        <span className="price">from {peso(product.basePriceCents)}</span>
        <Link className="btn coffee-link" to={`/products/${product.id}`} aria-label={`View coffee: ${product.name}`}>View coffee <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
