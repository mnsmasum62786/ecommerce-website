import { Resend } from "resend";
import { formatPrice } from "@/lib/utils";

// Email is best-effort: if Resend isn't configured we log and continue so that
// order placement never fails because of email delivery.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

type OrderEmailData = {
  orderNumber: string;
  customerName: string;
  email: string;
  items: { name: string; quantity: number; priceCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: string;
  shippingAddress: string;
};

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<void> {
  const resend = getResend();
  const from = process.env.EMAIL_FROM || "Verdant Market <orders@verdantmarket.com>";

  const rows = data.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0">${i.name} × ${i.quantity}</td><td style="padding:8px 0;text-align:right">${formatPrice(
          i.priceCents * i.quantity,
        )}</td></tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#223c20">
    <h1 style="color:#3a7033">Thank you for your order!</h1>
    <p>Hi ${data.customerName}, we've received your order <strong>${data.orderNumber}</strong> and are getting it ready.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      ${rows}
      <tr><td style="padding:8px 0;border-top:1px solid #ddd">Subtotal</td><td style="padding:8px 0;border-top:1px solid #ddd;text-align:right">${formatPrice(data.subtotalCents)}</td></tr>
      ${data.discountCents > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${formatPrice(data.discountCents)}</td></tr>` : ""}
      <tr><td>Shipping</td><td style="text-align:right">${data.shippingCents === 0 ? "Free" : formatPrice(data.shippingCents)}</td></tr>
      ${data.taxCents > 0 ? `<tr><td>Tax</td><td style="text-align:right">${formatPrice(data.taxCents)}</td></tr>` : ""}
      <tr><td style="padding-top:8px;font-weight:bold">Total</td><td style="padding-top:8px;text-align:right;font-weight:bold">${formatPrice(data.totalCents)}</td></tr>
    </table>
    <p><strong>Payment:</strong> ${data.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online"}</p>
    <p><strong>Shipping to:</strong><br/>${data.shippingAddress}</p>
    <p style="color:#6daa63">— The Verdant Organic Market team</p>
  </div>`;

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set; skipping confirmation for ${data.orderNumber}`);
    return;
  }

  try {
    await resend.emails.send({
      from,
      to: data.email,
      subject: `Order ${data.orderNumber} confirmed — Verdant Organic Market`,
      html,
    });
  } catch (err) {
    console.error("[email] Failed to send order confirmation:", err);
  }
}
