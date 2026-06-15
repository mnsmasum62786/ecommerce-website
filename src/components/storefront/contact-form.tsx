"use client";

import * as React from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export function ContactForm() {
  const { toast } = useToast();
  const [form, setForm] = React.useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: form.subject || undefined,
          message: form.message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Could not send message",
          description: data.error ?? "Please try again.",
        });
        return;
      }
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "" });
      toast({ title: "Message sent", description: "Thanks for reaching out — we'll be in touch soon." });
    } catch {
      toast({ variant: "destructive", title: "Something went wrong", description: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-semibold">Thank you!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ve received your message and will reply soon.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block">Subject</Label>
        <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} />
      </div>
      <div>
        <Label className="mb-1.5 block">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send message"
        )}
      </Button>
    </form>
  );
}
