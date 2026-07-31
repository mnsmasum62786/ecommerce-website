import { NextResponse } from "next/server";
import { z } from "zod";
import { sendMetaCapiEvent, type MetaCustomData } from "@/lib/meta-capi";

// Bridges client-originated ecommerce events to the Meta Conversions API
// (server-side). The browser calls this for ViewContent / AddToCart /
// InitiateCheckout / Search; Purchase is sent server-side at checkout.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  eventName: z.enum(["ViewContent", "AddToCart", "InitiateCheckout", "Search", "PageView", "AddPaymentInfo"]),
  eventId: z.string().optional(),
  eventSourceUrl: z.string().optional(),
  customData: z
    .object({
      currency: z.string().optional(),
      value: z.number().optional(),
      content_ids: z.array(z.string()).optional(),
      content_type: z.string().optional(),
      content_name: z.string().optional(),
      contents: z
        .array(z.object({ id: z.string(), quantity: z.number(), item_price: z.number() }))
        .optional(),
      num_items: z.number().optional(),
      search_string: z.string().optional(),
    })
    .optional(),
});

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const cookieHeader = req.headers.get("cookie");
  const fbp = readCookie(cookieHeader, "_fbp");
  const fbc = readCookie(cookieHeader, "_fbc");
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent");

  // Fire-and-forget so the UI is never blocked by tracking.
  await sendMetaCapiEvent({
    eventName: parsed.data.eventName,
    eventId: parsed.data.eventId,
    eventSourceUrl: parsed.data.eventSourceUrl,
    actionSource: "website",
    userData: { fbp, fbc, clientIp, userAgent },
    customData: parsed.data.customData as MetaCustomData,
  });

  return NextResponse.json({ ok: true });
}
