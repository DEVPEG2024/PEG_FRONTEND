// Sélection du catalogue affichée sous les états vides de « Mes offres ».
// ⚠️ Passe UNIQUEMENT par apiGetSuggestedProducts() (filtre serveur
// inCatalogue: true → Imbretex exclu). Jamais apiGetProducts, jamais une
// requête « même catégorie ». Le parent ne la monte que si catalogAccess !== false.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiOutlineSparkles } from 'react-icons/hi';
import { Product } from '@/@types/product';
import { apiGetSuggestedProducts } from '@/services/ProductServices';
import CustomerProductCard from '../CustomerProductCard';
import {
  PREMIUM_PCT,
  PRODUCT_GRID_STYLE,
  SECTION_TITLE_STYLE,
  SELECTION_GRID_CLASS,
  SkeletonCard,
} from './offersUi';

const MAX_PRODUCTS = 8;

type CatalogueSelectionProps = {
  title: string;
  /** Ajoute la mention de la remise Premium au sous-titre. */
  premiumNote?: boolean;
  /** documentId déjà affichés dans les offres : jamais rendus deux fois. */
  excludeIds: string[];
};

const CatalogueSelection = ({
  title,
  premiumNote = false,
  excludeIds,
}: CatalogueSelectionProps) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [curated, setCurated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGetSuggestedProducts()
      .then((result) => {
        if (cancelled) return;
        setProducts(Array.isArray(result?.products) ? result.products : []);
        setCurated(!!result?.curated);
      })
      .catch((error) => {
        // Section masquée sans message en cas d'erreur.
        console.warn(
          '[Mes offres] Sélection du catalogue indisponible :',
          error
        );
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const excluded = new Set(excludeIds);
  const visible = products
    .filter((p) => p?.documentId && !excluded.has(p.documentId))
    .slice(0, MAX_PRODUCTS);

  if (!loading && visible.length === 0) return null;

  const subtitle = curated
    ? 'Sélection choisie pour vous par l’équipe PEG'
    : 'Les dernières nouveautés du catalogue';

  return (
    <section style={{ marginTop: '32px' }} aria-busy={loading || undefined}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineSparkles aria-hidden="true" size={18} color="#a99bff" />
            <h2 style={SECTION_TITLE_STYLE}>{title}</h2>
          </div>
          <p
            className="peg-text-caption"
            style={{ margin: '4px 0 0', fontSize: '12.5px', lineHeight: 1.5 }}
          >
            {subtitle}
            {premiumNote &&
              ` · Votre remise Premium de -${PREMIUM_PCT} % s’y applique automatiquement.`}
          </p>
        </div>
        <Link
          to="/customer/catalogue"
          className="peg-tap-target"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#a99bff',
            fontSize: '12.5px',
            fontWeight: 600,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Voir le catalogue
          <HiArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>

      {/* Limitée à 4 cartes sur téléphone (SELECTION_GRID_CLASS) : 8 cartes
          pleine largeur repoussaient le bandeau d'aide à ~3 400 px. */}
      <div className={SELECTION_GRID_CLASS} style={PRODUCT_GRID_STYLE}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : // Sous le panneau principal : images en chargement différé.
            visible.map((product) => (
              <CustomerProductCard key={product.documentId} product={product} />
            ))}
      </div>
    </section>
  );
};

export default CatalogueSelection;
