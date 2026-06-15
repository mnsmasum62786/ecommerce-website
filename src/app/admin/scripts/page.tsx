import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { ScriptManagerForm } from "@/components/admin/script-manager-form";

export const dynamic = "force-dynamic";

// Defaults mirror the ScriptSettings model so the form renders before the
// single "default" row has ever been written.
const DEFAULT_SCRIPTS = {
  gtmId: "",
  gtmEnabled: false,
  ga4Id: "",
  ga4Enabled: false,
  metaPixelId: "",
  metaPixelEnabled: false,
  tiktokPixelId: "",
  tiktokEnabled: false,
  headScripts: "",
  headEnabled: true,
  bodyStartScripts: "",
  bodyStartEnabled: true,
  footerScripts: "",
  footerEnabled: true,
};

export default async function ScriptsPage() {
  const row = await prisma.scriptSettings.findUnique({ where: { id: "default" } });

  const initial = {
    gtmId: row?.gtmId ?? "",
    gtmEnabled: row?.gtmEnabled ?? DEFAULT_SCRIPTS.gtmEnabled,
    ga4Id: row?.ga4Id ?? "",
    ga4Enabled: row?.ga4Enabled ?? DEFAULT_SCRIPTS.ga4Enabled,
    metaPixelId: row?.metaPixelId ?? "",
    metaPixelEnabled: row?.metaPixelEnabled ?? DEFAULT_SCRIPTS.metaPixelEnabled,
    metaAccessToken: row?.metaAccessToken ?? "",
    metaTestEventCode: row?.metaTestEventCode ?? "",
    metaCapiEnabled: row?.metaCapiEnabled ?? false,
    tiktokPixelId: row?.tiktokPixelId ?? "",
    tiktokEnabled: row?.tiktokEnabled ?? DEFAULT_SCRIPTS.tiktokEnabled,
    headScripts: row?.headScripts ?? "",
    headEnabled: row?.headEnabled ?? DEFAULT_SCRIPTS.headEnabled,
    bodyStartScripts: row?.bodyStartScripts ?? "",
    bodyStartEnabled: row?.bodyStartEnabled ?? DEFAULT_SCRIPTS.bodyStartEnabled,
    footerScripts: row?.footerScripts ?? "",
    footerEnabled: row?.footerEnabled ?? DEFAULT_SCRIPTS.footerEnabled,
  };

  return (
    <div>
      <PageHeader
        title="Script Manager"
        description="Connect analytics and marketing tools, or inject your own custom code site-wide."
      />
      <ScriptManagerForm initial={initial} />
    </div>
  );
}
