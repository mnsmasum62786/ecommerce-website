"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

export type ScriptSettingsForm = {
  gtmId: string;
  gtmEnabled: boolean;
  ga4Id: string;
  ga4Enabled: boolean;
  metaPixelId: string;
  metaPixelEnabled: boolean;
  tiktokPixelId: string;
  tiktokEnabled: boolean;
  headScripts: string;
  headEnabled: boolean;
  bodyStartScripts: string;
  bodyStartEnabled: boolean;
  footerScripts: string;
  footerEnabled: boolean;
};

function IntegrationRow({
  title,
  helper,
  idLabel,
  placeholder,
  idValue,
  onIdChange,
  enabled,
  onToggle,
}: {
  title: string;
  helper: string;
  idLabel: string;
  placeholder: string;
  idValue: string;
  onIdChange: (v: string) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-medium">{title}</h3>
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={onToggle} />
              <span className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{idLabel}</Label>
            <Input
              value={idValue}
              placeholder={placeholder}
              onChange={(e) => onIdChange(e.target.value)}
              className="max-w-sm font-mono text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomCodeBlock({
  title,
  helper,
  value,
  onChange,
  enabled,
  onToggle,
}: {
  title: string;
  helper: string;
  value: string;
  onChange: (v: string) => void;
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">{title}</h3>
            <p className="text-xs text-muted-foreground">{helper}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={enabled} onCheckedChange={onToggle} />
            <span className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="<!-- Paste your HTML / script tags here -->"
          className="font-mono text-xs"
        />
      </CardContent>
    </Card>
  );
}

export function ScriptManagerForm({ initial }: { initial: ScriptSettingsForm }) {
  const { toast } = useToast();
  const [form, setForm] = useState<ScriptSettingsForm>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ScriptSettingsForm>(key: K, value: ScriptSettingsForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/scripts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save script settings.");
      }
      toast({ title: "Saved", description: "Script settings updated." });
    } catch (err) {
      toast({
        title: "Could not save",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="managed">
        <TabsList>
          <TabsTrigger value="managed">Managed Integrations</TabsTrigger>
          <TabsTrigger value="custom">Custom Code</TabsTrigger>
        </TabsList>

        <TabsContent value="managed" className="mt-4 space-y-4">
          <IntegrationRow
            title="Google Tag Manager"
            idLabel="Container ID"
            placeholder="GTM-XXXXXXX"
            helper="Injects the GTM head snippet plus the body noscript fallback automatically."
            idValue={form.gtmId}
            onIdChange={(v) => set("gtmId", v)}
            enabled={form.gtmEnabled}
            onToggle={(v) => set("gtmEnabled", v)}
          />
          <IntegrationRow
            title="Google Analytics 4"
            idLabel="Measurement ID"
            placeholder="G-XXXXXXXXXX"
            helper="Loads gtag.js and configures your GA4 property."
            idValue={form.ga4Id}
            onIdChange={(v) => set("ga4Id", v)}
            enabled={form.ga4Enabled}
            onToggle={(v) => set("ga4Enabled", v)}
          />
          <IntegrationRow
            title="Meta Pixel"
            idLabel="Pixel ID"
            placeholder="123456789012345"
            helper="Adds the Meta (Facebook) Pixel base code and tracks PageView events."
            idValue={form.metaPixelId}
            onIdChange={(v) => set("metaPixelId", v)}
            enabled={form.metaPixelEnabled}
            onToggle={(v) => set("metaPixelEnabled", v)}
          />
          <IntegrationRow
            title="TikTok Pixel"
            idLabel="Pixel ID"
            placeholder="CXXXXXXXXXXXXXXXXXXX"
            helper="Adds the TikTok Pixel base code and tracks page views."
            idValue={form.tiktokPixelId}
            onIdChange={(v) => set("tiktokPixelId", v)}
            enabled={form.tiktokEnabled}
            onToggle={(v) => set("tiktokEnabled", v)}
          />
        </TabsContent>

        <TabsContent value="custom" className="mt-4 space-y-4">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Custom code is injected verbatim on every page of the storefront. Only trusted
              administrators should edit these fields — a malformed or malicious snippet can break
              the site or expose customer data.
            </p>
          </div>
          <CustomCodeBlock
            title="Head"
            helper="Injected inside the <head> tag on every page."
            value={form.headScripts}
            onChange={(v) => set("headScripts", v)}
            enabled={form.headEnabled}
            onToggle={(v) => set("headEnabled", v)}
          />
          <CustomCodeBlock
            title="Body start"
            helper="Injected immediately after the opening <body> tag."
            value={form.bodyStartScripts}
            onChange={(v) => set("bodyStartScripts", v)}
            enabled={form.bodyStartEnabled}
            onToggle={(v) => set("bodyStartEnabled", v)}
          />
          <CustomCodeBlock
            title="Footer"
            helper="Injected at the end of the page, before the closing </body> tag."
            value={form.footerScripts}
            onChange={(v) => set("footerScripts", v)}
            enabled={form.footerEnabled}
            onToggle={(v) => set("footerEnabled", v)}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  );
}
