"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        setSubmitting(false);
        return;
      }

      const signInRes = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      if (!signInRes || signInRes.error) {
        // Account was created; send them to log in manually.
        router.push("/login");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="container flex justify-center py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand-600">
          <Leaf className="h-6 w-6" />
          <span className="font-serif text-xl font-bold text-brand-900">Create your account</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6">
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <div>
            <Label className="mb-1.5 block">Full name</Label>
            <Input required value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Password</Label>
            <Input
              type="password"
              required
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Confirm password</Label>
            <Input
              type="password"
              required
              value={form.confirm}
              onChange={(e) => update("confirm", e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
