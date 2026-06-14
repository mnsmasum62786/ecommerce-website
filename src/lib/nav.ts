// Central place for category slugs used in seed + navigation so storefront and
// seed stay in sync.
export const CATEGORY_SEED = [
  { name: "Fruits & Vegetables", slug: "fruits-vegetables", description: "Crisp, seasonal, certified-organic produce harvested at peak ripeness." },
  { name: "Grains & Cereals", slug: "grains-cereals", description: "Whole grains, ancient cereals, and breakfast staples grown without synthetic inputs." },
  { name: "Dairy & Eggs", slug: "dairy-eggs", description: "Pasture-raised eggs and small-farm dairy from animals raised on organic feed." },
  { name: "Beverages", slug: "beverages", description: "Cold-pressed juices, herbal teas, and organic coffee." },
  { name: "Snacks", slug: "snacks", description: "Wholesome, better-for-you snacks with clean ingredient lists." },
  { name: "Pantry Staples", slug: "pantry-staples", description: "Oils, sweeteners, beans, and essentials for a well-stocked organic kitchen." },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "name-asc", label: "Name: A to Z" },
] as const;

export const FOOTER_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
  { href: "/shipping-returns", label: "Shipping & Returns" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];
