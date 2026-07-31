import { NextResponse } from "next/server";

// Public, self-serve API reference for third-party integrators.
// Returns HTML for browsers and JSON (machine-readable endpoint list) when the
// client asks for JSON via Accept or ?format=json. No API key required.
export const dynamic = "force-dynamic";

type Endpoint = { method: string; path: string; scope: "read" | "write"; summary: string };

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/v1", scope: "read", summary: "API index and the identity of the calling key." },

  { method: "GET", path: "/api/v1/products", scope: "read", summary: "List products. Filters: search, category, tag, active, inStock, sort, page, limit." },
  { method: "POST", path: "/api/v1/products", scope: "write", summary: "Create a product." },
  { method: "GET", path: "/api/v1/products/{idOrSlug}", scope: "read", summary: "Retrieve a single product by id or slug." },
  { method: "PATCH", path: "/api/v1/products/{idOrSlug}", scope: "write", summary: "Update a product (partial)." },
  { method: "DELETE", path: "/api/v1/products/{idOrSlug}", scope: "write", summary: "Delete a product." },

  { method: "GET", path: "/api/v1/categories", scope: "read", summary: "List categories. Filters: search, parent, sort, page, limit." },
  { method: "POST", path: "/api/v1/categories", scope: "write", summary: "Create a category." },
  { method: "GET", path: "/api/v1/categories/{idOrSlug}", scope: "read", summary: "Retrieve a category." },
  { method: "PATCH", path: "/api/v1/categories/{idOrSlug}", scope: "write", summary: "Update a category." },
  { method: "DELETE", path: "/api/v1/categories/{idOrSlug}", scope: "write", summary: "Delete a category (must be empty)." },

  { method: "GET", path: "/api/v1/inventory", scope: "read", summary: "Stock levels with low/out-of-stock summary. Filters: status, search." },
  { method: "POST", path: "/api/v1/inventory", scope: "write", summary: "Bulk set or adjust stock levels." },

  { method: "GET", path: "/api/v1/orders", scope: "read", summary: "List orders. Filters: status, paymentStatus, email, search, since, until, sort." },
  { method: "POST", path: "/api/v1/orders", scope: "write", summary: "Create an order (validates stock and prices server-side)." },
  { method: "GET", path: "/api/v1/orders/{idOrNumber}", scope: "read", summary: "Retrieve an order by id or order number." },
  { method: "PATCH", path: "/api/v1/orders/{idOrNumber}", scope: "write", summary: "Update status, payment status, refund flag, or shipping address." },
  { method: "DELETE", path: "/api/v1/orders/{idOrNumber}", scope: "write", summary: "Cancel an order (restores stock); orders are never hard-deleted." },

  { method: "GET", path: "/api/v1/customers", scope: "read", summary: "List customers with order counts and lifetime spend." },
  { method: "POST", path: "/api/v1/customers", scope: "write", summary: "Create a customer." },
  { method: "GET", path: "/api/v1/customers/{idOrEmail}", scope: "read", summary: "Retrieve a customer with addresses and recent orders." },
  { method: "PATCH", path: "/api/v1/customers/{idOrEmail}", scope: "write", summary: "Update a customer." },
  { method: "DELETE", path: "/api/v1/customers/{idOrEmail}", scope: "write", summary: "Delete a customer (orders are preserved)." },

  { method: "GET", path: "/api/v1/coupons", scope: "read", summary: "List discount coupons." },
  { method: "POST", path: "/api/v1/coupons", scope: "write", summary: "Create a coupon." },
  { method: "GET", path: "/api/v1/coupons/{idOrCode}", scope: "read", summary: "Retrieve a coupon." },
  { method: "PATCH", path: "/api/v1/coupons/{idOrCode}", scope: "write", summary: "Update a coupon." },
  { method: "DELETE", path: "/api/v1/coupons/{idOrCode}", scope: "write", summary: "Delete a coupon." },

  { method: "GET", path: "/api/v1/store", scope: "read", summary: "Store configuration: currency, shipping rates, tax, contact details." },
  { method: "PATCH", path: "/api/v1/store", scope: "write", summary: "Update store settings." },
];

function baseUrlFrom(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    (req.headers.get("accept") ?? "").includes("application/json");
  const base = baseUrlFrom(req);

  if (wantsJson) {
    return NextResponse.json({
      name: "Verdant Organic Market API",
      version: "1.0.0",
      baseUrl: `${base}/api/v1`,
      authentication: {
        type: "api_key",
        headers: ["Authorization: Bearer <key>", "X-API-Key: <key>"],
        scopes: ["READ", "WRITE"],
      },
      conventions: {
        success: '{ "data": ..., "meta"?: ... }',
        error: '{ "error": { "code": "...", "message": "...", "details"?: [...] } }',
        money: "All amounts are integer cents, echoed as { cents, amount }.",
        pagination: "?page=1&limit=25 (max 100); meta contains page, limit, total, totalPages, hasMore.",
      },
      endpoints: ENDPOINTS,
    });
  }

  const rows = ENDPOINTS.map(
    (e) => `<tr>
      <td><span class="m m-${e.method.toLowerCase()}">${e.method}</span></td>
      <td><code>${e.path}</code></td>
      <td><span class="s s-${e.scope}">${e.scope}</span></td>
      <td>${e.summary}</td>
    </tr>`,
  ).join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>Verdant Organic Market — REST API v1</title>
<style>
  :root{--bg:#fbfdfa;--fg:#223c20;--muted:#5c6b58;--line:#dfe8dc;--brand:#3a7033;--code:#f2f6f0}
  @media (prefers-color-scheme:dark){:root{--bg:#111713;--fg:#e8f0e6;--muted:#9db396;--line:#25302410;--code:#1a221b}}
  *{box-sizing:border-box}
  body{margin:0;padding:2rem 1rem 4rem;background:var(--bg);color:var(--fg);
       font:15px/1.6 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:960px;margin:0 auto}
  h1{font-size:1.9rem;margin:0 0 .25rem} h2{margin:2.5rem 0 .75rem;font-size:1.2rem}
  .lede{color:var(--muted);margin:0 0 2rem}
  code{background:var(--code);padding:.15em .4em;border-radius:4px;font-size:.9em;
       font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
  pre{background:var(--code);padding:1rem;border-radius:8px;overflow-x:auto;border:1px solid var(--line)}
  pre code{background:none;padding:0}
  table{width:100%;border-collapse:collapse;font-size:.92rem}
  th,td{text-align:left;padding:.55rem .5rem;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-weight:600;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
  .tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
  .m{font:600 .75rem ui-monospace,monospace;padding:.15em .45em;border-radius:4px;color:#fff;white-space:nowrap}
  .m-get{background:#3a7033}.m-post{background:#1d6ea8}.m-patch{background:#b07d10}.m-delete{background:#a83232}
  .s{font-size:.75rem;padding:.1em .45em;border-radius:99px;border:1px solid var(--line);color:var(--muted)}
  .s-write{border-color:#b07d10;color:#b07d10}
  .note{border-left:3px solid var(--brand);padding:.6rem 0 .6rem 1rem;color:var(--muted);margin:1rem 0}
</style></head><body><div class="wrap">
<h1>Verdant Organic Market — REST API</h1>
<p class="lede">Version 1.0.0 · Base URL <code>${base}/api/v1</code></p>

<h2>Authentication</h2>
<p>Every request needs an API key, issued in the admin panel under <strong>API Keys</strong>. Send it as a bearer token:</p>
<pre><code>curl "${base}/api/v1/products?limit=5" \\
  -H "Authorization: Bearer YOUR_API_KEY"</code></pre>
<p>The header <code>X-API-Key: YOUR_API_KEY</code> works too. Keys carry a <code>READ</code> or <code>WRITE</code> scope;
write operations require a write-scoped key.</p>

<h2>Conventions</h2>
<div class="note">
  Successful responses are wrapped as <code>{ "data": … }</code>, with <code>meta</code> added for paginated lists.<br/>
  Errors return <code>{ "error": { "code", "message", "details"? } }</code> with a matching HTTP status.<br/>
  All money is integer <strong>cents</strong>, echoed as <code>{ "cents": 1499, "amount": "14.99" }</code>.<br/>
  Lists accept <code>?page=1&amp;limit=25</code> (limit max 100).
</div>

<h2>Endpoints</h2>
<div class="tablewrap"><table>
<thead><tr><th>Method</th><th>Path</th><th>Scope</th><th>Description</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>

<h2>Example: create a product</h2>
<pre><code>curl -X POST "${base}/api/v1/products" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Organic Ginger Root",
    "description": "Fresh, pungent organic ginger.",
    "priceCents": 499,
    "stock": 40,
    "unit": "lb",
    "categorySlug": "fruits-vegetables"
  }'</code></pre>

<h2>Example: fulfil an order</h2>
<pre><code>curl -X PATCH "${base}/api/v1/orders/VRD-20260615-A1B2C3" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"SHIPPED"}'</code></pre>

<h2>Webhooks</h2>
<p>Rather than polling, subscribe to <code>order.created</code>, <code>order.paid</code>,
<code>order.status_changed</code>, and <code>order.cancelled</code> in the admin panel under
<strong>Webhooks</strong>. Payloads are signed with HMAC-SHA256 in the
<code>X-Verdant-Signature</code> header.</p>

<p class="lede" style="margin-top:2.5rem">Machine-readable version of this page:
<code>${base}/api/v1/docs?format=json</code></p>
</div></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
