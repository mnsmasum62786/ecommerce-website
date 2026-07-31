import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Public API response shapes. Keeping serialization in one place means the
// internal database schema can evolve without breaking third-party consumers.
// All monetary values are exposed both in cents (authoritative) and as a
// decimal string for convenience.
// ---------------------------------------------------------------------------

function money(cents: number) {
  return { cents, amount: (cents / 100).toFixed(2) };
}

export const productInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ProductInclude;

type ProductPayload = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

export function serializeProduct(p: ProductPayload) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    shortDescription: p.shortDesc,
    price: money(p.priceCents),
    compareAtPrice: p.compareAtCents === null ? null : money(p.compareAtCents),
    unit: p.unit,
    inventory: {
      stock: p.stock,
      lowStockThreshold: p.lowStockAt,
      inStock: p.stock > 0,
      isLowStock: p.stock > 0 && p.stock <= p.lowStockAt,
    },
    organic: { isOrganic: p.isOrganic, certification: p.certification },
    flags: { isActive: p.isActive, isFeatured: p.isFeatured, isBestSeller: p.isBestSeller },
    tags: p.tags,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,
    images: p.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt, position: img.sortOrder })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const categoryInclude = {
  parent: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true, children: true } },
} satisfies Prisma.CategoryInclude;

type CategoryPayload = Prisma.CategoryGetPayload<{ include: typeof categoryInclude }>;

export function serializeCategory(c: CategoryPayload) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    position: c.sortOrder,
    parent: c.parent ? { id: c.parent.id, name: c.parent.name, slug: c.parent.slug } : null,
    counts: { products: c._count.products, children: c._count.children },
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export const orderInclude = {
  items: true,
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.OrderInclude;

type OrderPayload = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function serializeOrder(o: OrderPayload) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    refundFlag: o.refundFlag,
    customer: {
      id: o.userId,
      name: o.customerName,
      email: o.email,
      phone: o.phone,
      isRegistered: Boolean(o.userId),
    },
    shippingAddress: {
      fullName: o.shipFullName,
      line1: o.shipLine1,
      line2: o.shipLine2,
      city: o.shipCity,
      state: o.shipState,
      postalCode: o.shipPostalCode,
      country: o.shipCountry,
    },
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: money(i.priceCents),
      lineTotal: money(i.priceCents * i.quantity),
      imageUrl: i.imageUrl,
    })),
    totals: {
      subtotal: money(o.subtotalCents),
      shipping: money(o.shippingCents),
      tax: money(o.taxCents),
      discount: money(o.discountCents),
      total: money(o.totalCents),
    },
    couponCode: o.couponCode,
    deliveryOption: o.deliveryOption,
    customerNote: o.customerNote,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

type CustomerPayload = Prisma.UserGetPayload<{
  include: { addresses: true; _count: { select: { orders: true } } };
}>;

export function serializeCustomer(u: CustomerPayload, totalSpentCents = 0) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    orderCount: u._count.orders,
    totalSpent: money(totalSpentCents),
    addresses: u.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault,
    })),
    createdAt: u.createdAt.toISOString(),
  };
}

export function serializeCoupon(c: Prisma.CouponGetPayload<object>) {
  return {
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    // PERCENT -> percentage points; FIXED -> amount in cents.
    value: c.value,
    minSpend: money(c.minSpendCents),
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    isActive: c.isActive,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}
