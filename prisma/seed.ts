/**
 * Database seed for Verdant Organic Market.
 * Run with: npm run seed
 *
 * Idempotent: uses upserts keyed on slug/email/id so it can be re-run safely.
 * Seeds: store settings, script settings, an admin user, 6 categories,
 * 24 organic products with images, and a few sample coupons.
 */
import { PrismaClient, Role, DiscountType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper: dollars -> integer cents.
const c = (dollars: number) => Math.round(dollars * 100);

const CATEGORIES = [
  { name: "Fruits & Vegetables", slug: "fruits-vegetables", description: "Crisp, seasonal, certified-organic produce harvested at peak ripeness.", imageUrl: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&q=80", sortOrder: 1 },
  { name: "Grains & Cereals", slug: "grains-cereals", description: "Whole grains, ancient cereals, and breakfast staples grown without synthetic inputs.", imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80", sortOrder: 2 },
  { name: "Dairy & Eggs", slug: "dairy-eggs", description: "Pasture-raised eggs and small-farm dairy from animals raised on organic feed.", imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&q=80", sortOrder: 3 },
  { name: "Beverages", slug: "beverages", description: "Cold-pressed juices, herbal teas, and organic coffee.", imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80", sortOrder: 4 },
  { name: "Snacks", slug: "snacks", description: "Wholesome, better-for-you snacks with clean ingredient lists.", imageUrl: "https://images.unsplash.com/photo-1599629954294-14df9ec8bc05?w=600&q=80", sortOrder: 5 },
  { name: "Pantry Staples", slug: "pantry-staples", description: "Oils, sweeteners, beans, and essentials for a well-stocked organic kitchen.", imageUrl: "https://images.unsplash.com/photo-1584473457406-6240486418e9?w=600&q=80", sortOrder: 6 },
];

type SeedProduct = {
  name: string;
  slug: string;
  category: string; // slug
  price: number;
  compareAt?: number;
  unit: string;
  stock: number;
  shortDesc: string;
  description: string;
  certification: string;
  tags: string[];
  image: string;
  featured?: boolean;
  bestSeller?: boolean;
};

const PRODUCTS: SeedProduct[] = [
  // Fruits & Vegetables
  { name: "Organic Hass Avocados", slug: "organic-hass-avocados", category: "fruits-vegetables", price: 1.49, unit: "each", stock: 120, shortDesc: "Creamy, ripe-and-ready Hass avocados.", description: "Buttery, nutrient-dense Hass avocados grown on certified-organic groves. Picked at the perfect stage so they ripen beautifully on your counter — ideal for toast, salads, and guacamole.", certification: "USDA Organic", tags: ["fresh", "keto", "vegan"], image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&q=80", featured: true, bestSeller: true },
  { name: "Organic Baby Spinach", slug: "organic-baby-spinach", category: "fruits-vegetables", price: 3.99, unit: "5 oz bag", stock: 80, shortDesc: "Tender, triple-washed baby spinach.", description: "Sweet, tender baby spinach leaves grown without synthetic pesticides. Triple-washed and ready to eat — perfect for salads, smoothies, and sautés.", certification: "USDA Organic", tags: ["leafy-greens", "vegan", "salad"], image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80", featured: true },
  { name: "Organic Rainbow Carrots", slug: "organic-rainbow-carrots", category: "fruits-vegetables", price: 2.79, unit: "bunch", stock: 60, shortDesc: "Sweet heirloom carrots in vibrant colors.", description: "A colorful bunch of heirloom carrots — purple, yellow, and classic orange. Crisp, sweet, and packed with beta-carotene. Roast, juice, or snack raw.", certification: "USDA Organic", tags: ["root-veg", "vegan", "fresh"], image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&q=80", bestSeller: true },
  { name: "Organic Strawberries", slug: "organic-strawberries", category: "fruits-vegetables", price: 4.99, compareAt: 5.99, unit: "1 lb", stock: 45, shortDesc: "Sun-ripened, intensely sweet berries.", description: "Plump, fragrant strawberries grown on family farms using organic practices. Bursting with natural sweetness — wonderful fresh, in desserts, or blended into smoothies.", certification: "USDA Organic", tags: ["berries", "vegan", "fresh"], image: "https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=800&q=80", featured: true },
  { name: "Organic Roma Tomatoes", slug: "organic-roma-tomatoes", category: "fruits-vegetables", price: 2.49, unit: "1 lb", stock: 70, shortDesc: "Meaty Roma tomatoes for sauces & salads.", description: "Vine-ripened Roma tomatoes with rich flavor and few seeds — the gold standard for sauces, salsa, and roasting. Certified organic and non-GMO.", certification: "Non-GMO Project Verified", tags: ["vegan", "fresh", "cooking"], image: "https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=800&q=80" },
  { name: "Organic Gala Apples", slug: "organic-gala-apples", category: "fruits-vegetables", price: 3.49, unit: "2 lb bag", stock: 90, shortDesc: "Crisp, honeyed Gala apples.", description: "Crunchy, mildly sweet Gala apples grown in organic orchards. A lunchbox favorite and great for baking. Each apple is hand-selected for quality.", certification: "USDA Organic", tags: ["fruit", "vegan", "snack"], image: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80", bestSeller: true },

  // Grains & Cereals
  { name: "Organic Rolled Oats", slug: "organic-rolled-oats", category: "grains-cereals", price: 5.49, unit: "32 oz", stock: 110, shortDesc: "Hearty whole-grain rolled oats.", description: "Wholesome, stone-rolled oats milled from organic whole-grain oats. High in fiber and perfect for overnight oats, porridge, granola, and baking.", certification: "USDA Organic", tags: ["breakfast", "whole-grain", "vegan"], image: "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=800&q=80", featured: true },
  { name: "Organic Quinoa", slug: "organic-quinoa", category: "grains-cereals", price: 7.99, unit: "16 oz", stock: 75, shortDesc: "Protein-rich, pre-rinsed white quinoa.", description: "A complete plant protein, our organic quinoa is pre-rinsed and ready to cook in 15 minutes. Light, fluffy, and versatile for bowls, salads, and sides.", certification: "USDA Organic", tags: ["protein", "gluten-free", "vegan"], image: "https://images.unsplash.com/photo-1612257999756-9e1b3c6c0a7c?w=800&q=80", bestSeller: true },
  { name: "Organic Brown Basmati Rice", slug: "organic-brown-basmati-rice", category: "grains-cereals", price: 6.49, unit: "32 oz", stock: 65, shortDesc: "Aromatic long-grain brown basmati.", description: "Nutty, aromatic brown basmati rice grown using organic methods. Retains the bran for extra fiber and a satisfying chew. Pairs with curries and stir-fries.", certification: "USDA Organic", tags: ["whole-grain", "gluten-free", "vegan"], image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80" },
  { name: "Organic Whole Wheat Flour", slug: "organic-whole-wheat-flour", category: "grains-cereals", price: 4.99, unit: "5 lb", stock: 50, shortDesc: "Stone-ground whole wheat flour.", description: "Freshly stone-ground from organic hard red wheat. Ideal for rustic breads, pancakes, and baked goods with a wholesome, nutty flavor.", certification: "USDA Organic", tags: ["baking", "whole-grain", "vegan"], image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80" },

  // Dairy & Eggs
  { name: "Organic Pasture-Raised Eggs", slug: "organic-pasture-raised-eggs", category: "dairy-eggs", price: 6.99, unit: "dozen", stock: 95, shortDesc: "Rich, golden-yolk pasture-raised eggs.", description: "Eggs from hens that roam open pastures and eat a certified-organic diet. Deep golden yolks and exceptional flavor — the difference is unmistakable.", certification: "USDA Organic", tags: ["protein", "breakfast"], image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80", featured: true, bestSeller: true },
  { name: "Organic Whole Milk", slug: "organic-whole-milk", category: "dairy-eggs", price: 5.49, unit: "half gallon", stock: 60, shortDesc: "Creamy grass-fed whole milk.", description: "Smooth, creamy whole milk from grass-fed cows on organic family farms. Non-homogenized and gently pasteurized for fresh-from-the-farm taste.", certification: "USDA Organic", tags: ["dairy", "grass-fed"], image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&q=80" },
  { name: "Organic Greek Yogurt", slug: "organic-greek-yogurt", category: "dairy-eggs", price: 5.99, unit: "32 oz", stock: 70, shortDesc: "Thick, protein-packed plain Greek yogurt.", description: "Strained the traditional way for a thick, luscious texture and 17g of protein per serving. Made with organic milk and live active cultures. Unsweetened.", certification: "USDA Organic", tags: ["protein", "probiotic", "breakfast"], image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80", featured: true },
  { name: "Organic Aged Cheddar", slug: "organic-aged-cheddar", category: "dairy-eggs", price: 8.49, unit: "8 oz", stock: 40, shortDesc: "Sharp, hand-cut aged cheddar.", description: "Aged twelve months for a bold, sharp bite and crystalline texture. Made from the milk of organically raised cows. Wonderful on boards or melted.", certification: "USDA Organic", tags: ["cheese", "dairy"], image: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800&q=80" },

  // Beverages
  { name: "Organic Cold Brew Coffee", slug: "organic-cold-brew-coffee", category: "beverages", price: 9.99, unit: "32 oz", stock: 55, shortDesc: "Smooth, low-acid cold brew concentrate.", description: "Slow-steeped for 18 hours from organic, fair-trade beans. Smooth, naturally sweet, and low in acid. Dilute to taste over ice or with milk.", certification: "Fair Trade Certified", tags: ["coffee", "vegan", "caffeine"], image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&q=80", featured: true, bestSeller: true },
  { name: "Organic Green Tea", slug: "organic-green-tea", category: "beverages", price: 6.49, unit: "20 bags", stock: 85, shortDesc: "Delicate, antioxidant-rich green tea.", description: "Hand-picked organic green tea leaves with a smooth, grassy sweetness and gentle lift. Individually wrapped pyramid sachets to preserve freshness.", certification: "USDA Organic", tags: ["tea", "vegan", "antioxidant"], image: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=800&q=80" },
  { name: "Organic Orange Juice", slug: "organic-orange-juice", category: "beverages", price: 5.99, unit: "52 oz", stock: 48, shortDesc: "Not-from-concentrate, cold-pressed OJ.", description: "Pure cold-pressed orange juice from organic Valencia oranges. Never from concentrate, no added sugar — just bright, fresh citrus in every glass.", certification: "USDA Organic", tags: ["juice", "vegan", "vitamin-c"], image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80" },
  { name: "Organic Kombucha — Ginger", slug: "organic-kombucha-ginger", category: "beverages", price: 3.99, unit: "16 oz", stock: 90, shortDesc: "Fizzy, gut-friendly ginger kombucha.", description: "Living, raw kombucha fermented with organic green tea and a kick of fresh ginger. Lightly effervescent with billions of probiotics per bottle.", certification: "USDA Organic", tags: ["probiotic", "vegan", "fermented"], image: "https://images.unsplash.com/photo-1596803244618-8dc77deb7ca3?w=800&q=80" },

  // Snacks
  { name: "Organic Mixed Nuts", slug: "organic-mixed-nuts", category: "snacks", price: 11.99, unit: "16 oz", stock: 65, shortDesc: "Lightly salted organic nut medley.", description: "A premium mix of organic almonds, cashews, walnuts, and pecans, dry-roasted and lightly sea-salted. A satisfying, protein-rich snack on the go.", certification: "USDA Organic", tags: ["nuts", "vegan", "protein"], image: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=800&q=80", bestSeller: true },
  { name: "Organic Dark Chocolate Bar", slug: "organic-dark-chocolate-bar", category: "snacks", price: 4.49, unit: "3.5 oz", stock: 100, shortDesc: "72% fair-trade dark chocolate.", description: "Rich, smooth 72% dark chocolate crafted from organic, fair-trade cacao. Deep cocoa notes with a clean finish — indulgence you can feel good about.", certification: "Fair Trade Certified", tags: ["chocolate", "vegan", "treat"], image: "https://images.unsplash.com/photo-1623660053975-cf75a8be0908?w=800&q=80", featured: true },
  { name: "Organic Sweet Potato Chips", slug: "organic-sweet-potato-chips", category: "snacks", price: 4.99, unit: "5 oz", stock: 75, shortDesc: "Crunchy kettle-cooked sweet potato chips.", description: "Thinly sliced organic sweet potatoes, kettle-cooked in sunflower oil and finished with sea salt. Naturally sweet, crispy, and irresistible.", certification: "USDA Organic", tags: ["chips", "vegan", "gluten-free"], image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&q=80" },
  { name: "Organic Trail Mix", slug: "organic-trail-mix", category: "snacks", price: 7.49, unit: "12 oz", stock: 58, shortDesc: "Energy-packed fruit & nut trail mix.", description: "An adventure-ready blend of organic raisins, cranberries, almonds, pumpkin seeds, and dark chocolate chips. The perfect trail companion.", certification: "USDA Organic", tags: ["snack", "vegan", "energy"], image: "https://images.unsplash.com/photo-1606914469633-bd39206ea739?w=800&q=80" },

  // Pantry Staples
  { name: "Organic Extra Virgin Olive Oil", slug: "organic-extra-virgin-olive-oil", category: "pantry-staples", price: 14.99, compareAt: 17.99, unit: "16.9 oz", stock: 70, shortDesc: "Cold-pressed, single-origin EVOO.", description: "First cold-pressed from organic olives within hours of harvest. Fruity, peppery, and robust — finish dishes or use for everyday cooking.", certification: "USDA Organic", tags: ["oil", "vegan", "cooking"], image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80", featured: true, bestSeller: true },
  { name: "Organic Raw Honey", slug: "organic-raw-honey", category: "pantry-staples", price: 9.49, unit: "16 oz", stock: 80, shortDesc: "Unfiltered, single-source raw honey.", description: "Pure, unheated raw honey from organic wildflower apiaries. Retains natural pollen and enzymes with a complex floral sweetness. Liquid gold.", certification: "USDA Organic", tags: ["sweetener", "raw"], image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&q=80" },
  { name: "Organic Black Beans", slug: "organic-black-beans", category: "pantry-staples", price: 2.29, unit: "15 oz can", stock: 140, shortDesc: "Creamy, no-salt-added black beans.", description: "Tender organic black beans in a BPA-free can with no added salt. A versatile pantry hero for tacos, soups, salads, and bowls.", certification: "USDA Organic", tags: ["beans", "vegan", "protein"], image: "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=800&q=80" },
  { name: "Organic Marinara Sauce", slug: "organic-marinara-sauce", category: "pantry-staples", price: 5.99, unit: "24 oz", stock: 62, shortDesc: "Slow-simmered tomato basil marinara.", description: "Vine-ripened organic tomatoes slow-simmered with garlic, basil, and a touch of olive oil. No added sugar — just honest, homestyle flavor.", certification: "USDA Organic", tags: ["sauce", "vegan", "cooking"], image: "https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800&q=80" },
];

async function main() {
  console.log("🌱 Seeding Verdant Organic Market...");

  // --- Store settings ---
  await prisma.storeSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Verdant Organic Market",
      currency: "USD",
      currencySymbol: "$",
      supportEmail: "hello@verdantmarket.com",
      supportPhone: "+1 (555) 010-2345",
      addressLine: "142 Meadowbrook Lane, Portland, OR 97204",
      shippingFlatCents: 599,
      freeShippingThreshold: 7500,
      taxRatePercent: 0,
      facebookUrl: "https://facebook.com/verdantmarket",
      instagramUrl: "https://instagram.com/verdantmarket",
      twitterUrl: "https://twitter.com/verdantmarket",
      announcement:
        "Free shipping on orders over $75 — fresh, certified-organic groceries delivered to your door.",
    },
  });

  // --- Script settings (single row, all off by default) ---
  await prisma.scriptSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  // --- Admin user ---
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@verdantmarket.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, passwordHash },
    create: {
      email: adminEmail,
      name: process.env.ADMIN_NAME || "Store Admin",
      role: Role.ADMIN,
      passwordHash,
    },
  });
  console.log(`👤 Admin user: ${adminEmail}`);

  // --- Categories ---
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const row = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryIdBySlug.set(cat.slug, row.id);
  }
  console.log(`📂 ${CATEGORIES.length} categories`);

  // --- Products ---
  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.category)!;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        shortDesc: p.shortDesc,
        priceCents: c(p.price),
        compareAtCents: p.compareAt ? c(p.compareAt) : null,
        stock: p.stock,
        unit: p.unit,
        certification: p.certification,
        tags: p.tags,
        isFeatured: !!p.featured,
        isBestSeller: !!p.bestSeller,
        categoryId,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDesc: p.shortDesc,
        priceCents: c(p.price),
        compareAtCents: p.compareAt ? c(p.compareAt) : null,
        sku: p.slug.toUpperCase().replace(/-/g, "").slice(0, 12),
        stock: p.stock,
        lowStockAt: 10,
        unit: p.unit,
        isOrganic: true,
        certification: p.certification,
        isFeatured: !!p.featured,
        isBestSeller: !!p.bestSeller,
        isActive: true,
        tags: p.tags,
        categoryId,
      },
    });

    // Reset images to a single primary image (idempotent).
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: { productId: product.id, url: p.image, alt: p.name, sortOrder: 0 },
    });
  }
  console.log(`🥬 ${PRODUCTS.length} products`);

  // --- Coupons ---
  const coupons = [
    { code: "WELCOME15", description: "15% off your first order", type: DiscountType.PERCENT, value: 15, minSpendCents: 0, maxUses: null as number | null, expiresAt: null as Date | null },
    { code: "FRESH10", description: "$10 off orders over $60", type: DiscountType.FIXED, value: 1000, minSpendCents: 6000, maxUses: 500, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60) },
    { code: "GREEN20", description: "20% off, limited time", type: DiscountType.PERCENT, value: 20, minSpendCents: 3000, maxUses: 200, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14) },
  ];
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {},
      create: coupon,
    });
  }
  console.log(`🎟️  ${coupons.length} coupons`);

  console.log("✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
