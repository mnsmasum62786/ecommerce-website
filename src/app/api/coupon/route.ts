import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/coupon";

const schema = z.object({
  code: z.string().trim().min(1, "Enter a coupon code."),
  subtotalCents: z.number().int().nonnegative(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const result = await validateCoupon(parsed.data.code, parsed.data.subtotalCents);
  return NextResponse.json(result);
}
