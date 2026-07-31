import crypto from "crypto";
import { getScriptSettings } from "@/lib/settings";

// Meta Conversions API (server-side) integration. Sends ecommerce events
// directly from our server to Meta so tracking works without (or alongside) the
// browser pixel. Reads the Pixel ID + access token configured in the admin
// Script Manager.

const GRAPH_VERSION = "v21.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type MetaUserData = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null; // _fbp cookie
  fbc?: string | null; // _fbc cookie (from fbclid)
};

export type MetaCustomData = {
  currency?: string;
  value?: number;
  content_ids?: string[];
  content_type?: string;
  content_name?: string;
  contents?: { id: string; quantity: number; item_price: number }[];
  num_items?: number;
  search_string?: string;
};

export type MetaEventInput = {
  eventName: string; // e.g. "Purchase", "AddToCart"
  eventId?: string; // for dedup with the browser pixel
  eventSourceUrl?: string;
  actionSource?: "website" | "system_generated";
  userData?: MetaUserData;
  customData?: MetaCustomData;
};

// Build the hashed/normalized user_data block Meta expects.
function buildUserData(u: MetaUserData = {}) {
  const out: Record<string, unknown> = {};
  if (u.email) out.em = [sha256(u.email)];
  if (u.phone) out.ph = [sha256(u.phone.replace(/[^0-9]/g, ""))];
  if (u.firstName) out.fn = [sha256(u.firstName)];
  if (u.lastName) out.ln = [sha256(u.lastName)];
  if (u.city) out.ct = [sha256(u.city)];
  if (u.state) out.st = [sha256(u.state)];
  if (u.zip) out.zp = [sha256(u.zip)];
  if (u.country) out.country = [sha256(u.country)];
  // These are sent un-hashed per Meta spec.
  if (u.clientIp) out.client_ip_address = u.clientIp;
  if (u.userAgent) out.client_user_agent = u.userAgent;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

/**
 * Send a single event to the Meta Conversions API. No-ops (returns false) when
 * CAPI isn't configured/enabled. Never throws into the caller.
 */
export async function sendMetaCapiEvent(input: MetaEventInput): Promise<boolean> {
  let settings;
  try {
    settings = await getScriptSettings();
  } catch {
    return false;
  }
  if (!settings?.metaCapiEnabled || !settings.metaPixelId || !settings.metaAccessToken) {
    return false;
  }

  const payload = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl,
        action_source: input.actionSource ?? "website",
        user_data: buildUserData(input.userData),
        custom_data: input.customData ?? {},
      },
    ],
    ...(settings.metaTestEventCode ? { test_event_code: settings.metaTestEventCode } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${settings.metaPixelId}/events?access_token=${encodeURIComponent(
        settings.metaAccessToken,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[meta-capi] Non-OK response:", res.status, body.slice(0, 500));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[meta-capi] Failed to send event:", err);
    return false;
  }
}
