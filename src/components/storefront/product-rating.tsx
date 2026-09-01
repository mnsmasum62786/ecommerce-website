import { Star } from "lucide-react";
import { getDemoRating } from "@/lib/demo-merchandising";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  slug?: string;
  className?: string;
  compact?: boolean;
};

export function ProductRating({ productId, slug, className, compact = false }: Props) {
  const { rating, reviewCount } = getDemoRating(productId, slug);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}
      aria-label={`Demo rating ${rating.toFixed(1)} out of 5 from ${reviewCount} reviews`}
    >
      <span className="flex items-center gap-0.5 text-amber-500" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className="h-3.5 w-3.5 fill-current" />
        ))}
      </span>
      <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
      <span className="text-muted-foreground">
        {compact ? `(${reviewCount} demo)` : `${reviewCount} demo reviews`}
      </span>
    </div>
  );
}
