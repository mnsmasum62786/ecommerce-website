export type DemoRating = {
  rating: number;
  reviewCount: number;
};

// Stable demo values make the CRO layout feel realistic without adding a
// reviews table yet. Keep the visible "demo reviews" label until real review
// data replaces this helper.
export function getDemoRating(productId: string, slug = ""): DemoRating {
  const hash = hashString(`${productId}:${slug}`);
  const rating = 4.6 + (hash % 4) / 10;
  const reviewCount = 42 + (hash % 187);

  return { rating, reviewCount };
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
