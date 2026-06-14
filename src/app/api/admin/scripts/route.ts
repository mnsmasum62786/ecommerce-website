import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const scriptSchema = z.object({
  gtmId: z.string().trim().optional().nullable(),
  gtmEnabled: z.boolean().default(false),
  ga4Id: z.string().trim().optional().nullable(),
  ga4Enabled: z.boolean().default(false),
  metaPixelId: z.string().trim().optional().nullable(),
  metaPixelEnabled: z.boolean().default(false),
  tiktokPixelId: z.string().trim().optional().nullable(),
  tiktokEnabled: z.boolean().default(false),
  headScripts: z.string().optional().nullable(),
  headEnabled: z.boolean().default(true),
  bodyStartScripts: z.string().optional().nullable(),
  bodyStartEnabled: z.boolean().default(true),
  footerScripts: z.string().optional().nullable(),
  footerEnabled: z.boolean().default(true),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const settings = await prisma.scriptSettings.findUnique({ where: { id: "default" } });
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body.", 400);
  }

  const parsed = scriptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Invalid script settings.", 400);
  }
  const d = parsed.data;

  const data = {
    gtmId: d.gtmId?.trim() || null,
    gtmEnabled: d.gtmEnabled,
    ga4Id: d.ga4Id?.trim() || null,
    ga4Enabled: d.ga4Enabled,
    metaPixelId: d.metaPixelId?.trim() || null,
    metaPixelEnabled: d.metaPixelEnabled,
    tiktokPixelId: d.tiktokPixelId?.trim() || null,
    tiktokEnabled: d.tiktokEnabled,
    headScripts: d.headScripts?.trim() ? d.headScripts : null,
    headEnabled: d.headEnabled,
    bodyStartScripts: d.bodyStartScripts?.trim() ? d.bodyStartScripts : null,
    bodyStartEnabled: d.bodyStartEnabled,
    footerScripts: d.footerScripts?.trim() ? d.footerScripts : null,
    footerEnabled: d.footerEnabled,
  };

  const settings = await prisma.scriptSettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...data },
    update: data,
  });

  return NextResponse.json({ settings });
}
