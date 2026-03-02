import { Product } from '@/@types/product';
import { PriceTier } from '@/@types/product';

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
