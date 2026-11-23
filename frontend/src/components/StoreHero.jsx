import { Link } from 'react-router-dom';

export default function StoreHero() {
  return (
    <section className="store-hero" aria-labelledby="hero-title">
      <picture className="store-hero-photo">
        <source media="(max-width: 640px)" srcSet="/coffee-hero-mobile.webp" />
        <img src="/coffee-hero.webp" alt="" fetchPriority="high" />
      </picture>
      <div className="wrap store-hero-content">
        <p className="store-kicker">Philippine coffee · Roasted to order</p>
        <h1 id="hero-title">Good mornings<br />start with <em>Kape.</em></h1>
        <p>Discover locally sourced beans, roasted in small batches for a fresher cup.</p>
        <Link className="btn hero-button" to="/products">Shop coffee <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
  );
}
