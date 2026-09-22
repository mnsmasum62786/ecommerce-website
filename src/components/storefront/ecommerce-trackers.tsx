"use client";

import * as React from "react";
import { trackViewItem, type TrackItem } from "@/lib/analytics";

export function ViewItemTracker({ item }: { item: TrackItem }) {
  const fired = React.useRef(false);

  React.useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackViewItem(item);
  }, [item]);

  return null;
}
