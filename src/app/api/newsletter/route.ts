import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    });
  } catch {
    // Ignore duplicates / transient errors gracefully.
  }

  return NextResponse.json({ ok: true });
}
