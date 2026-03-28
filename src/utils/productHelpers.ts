import { Product, SizeAndColorSelection } from '@/@types/product';

/**
 * Get the effective price for a product.
 *
 * The application historically stored a simple `price` property on the
 * `Product` object.  To support volume pricing we introduced `priceTiers`
 * which is an array of `{minQuantity, price}` entries.  In practice the
 * first tier corresponds to the base price so we treat that as the
 * canonical number when rendering the UI.
 *
 * This helper centralises the logic so that the rest of the codebase can
 * continue calling it and not worry about whether the product has a
 * legacy `price` value or a more modern `priceTiers` list.
 *
 * If neither field is defined the function returns 0.
 */
export function getProductBasePrice(product: Product): number {
  if (product.priceTiers && product.priceTiers.length > 0) {
    return product.priceTiers[0].price;
  }

  // `price` is kept around for compatibility with the backend schema;
  // when the API is updated this can eventually be removed.
  return product.price || 0;
}

export function getProductPriceForQuantity(
  product: Product,
  quantity: number
): number {
  if (product.priceTiers && product.priceTiers.length > 0) {
    // Find the most appropriate price tier for the given quantity
    const applicableTier = [...product.priceTiers]
      .sort((a, b) => b.minQuantity - a.minQuantity) // Sort tiers in descending order
      .find((tier) => quantity >= tier.minQuantity); // Find the first tier that applies

    if (applicableTier) {
      return applicableTier.price;
    }
  }

  // Fallback to base price if no tiers apply
  return getProductBasePrice(product);
}

export function getProductPriceForSizeAndColors(
  product: Product,
  sizeAndColors: SizeAndColorSelection[]
): number {
  const totalQuantity = sizeAndColors.reduce(
    (amount, { quantity }) => amount + quantity,
    0
  );

  return getProductPriceForQuantity(product, totalQuantity);
}

/**
 * Compute the savings percentage compared to the public catalog price.
 * Returns null when no catalog price is set or when there is no saving.
 */
export function getCatalogSavingsPercent(
  product: Product,
  quantity: number = 1
): number | null {
  if (!product.catalogPrice || product.catalogPrice <= 0) return null;
  const currentPrice = getProductPriceForQuantity(product, quantity);
  if (currentPrice >= product.catalogPrice) return null;
  return Math.round(
    ((product.catalogPrice - currentPrice) / product.catalogPrice) * 100
  );
}

export function getTotalPriceForCartItem(
  product: Product,
  sizeAndColors: SizeAndColorSelection[]
): number {
  const totalQuantity = sizeAndColors.reduce(
    (amount, { quantity }) => amount + quantity,
    0
  );
  const pricePerUnit = getProductPriceForQuantity(product, totalQuantity);
  
  return pricePerUnit * totalQuantity;
}
