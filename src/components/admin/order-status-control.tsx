"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export function OrderStatusControl({
  orderId,
  status,
  refundFlag,
}: {
  orderId: string;
  status: string;
  refundFlag: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [refunded, setRefunded] = useState(refundFlag);

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Update failed.");
    }
    return true;
  }

  async function saveStatus() {
    if (value === status) return;
    setSavingStatus(true);
    try {
      await patch({ status: value });
      toast({ title: `Order marked ${value.toLowerCase()}.` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
      setValue(status);
    } finally {
      setSavingStatus(false);
    }
  }

  async function toggleRefund() {
    const next = !refunded;
    setRefunding(true);
    try {
      // Marking refunded also sets paymentStatus to REFUNDED on the server.
      await patch(
        next
          ? { refundFlag: true, paymentStatus: "REFUNDED" }
          : { refundFlag: false },
      );
      setRefunded(next);
      toast({ title: next ? "Order marked refunded." : "Refund flag cleared." });
      router.refresh();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setRefunding(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Order status</Label>
        <div className="flex gap-2">
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={saveStatus} disabled={savingStatus || value === status}>
            {savingStatus && <Loader2 className="h-4 w-4 animate-spin" />}
            Update
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Refund</Label>
        <Button
          variant={refunded ? "outline" : "destructive"}
          className="w-full"
          onClick={toggleRefund}
          disabled={refunding}
        >
          {refunding && <Loader2 className="h-4 w-4 animate-spin" />}
          {refunded ? "Clear refund flag" : "Mark refunded"}
        </Button>
      </div>
    </div>
  );
}
