import { cn } from "@/lib/utils";

// InsuranceMarket.ae brand blue (sampled from the logo wordmark).
export const BRAND_BLUE = "#1e8fce";

/**
 * Brand lockup: the Alfred mascot + the "insuranceMARKET.ae" wordmark.
 *
 * The mascot is clipped out of the full logo PNG (public/im-logo.png). The
 * image's Google-rating strip sits under the wordmark on the right, so a box
 * cropped to the mascot's width on the left excludes it. The wordmark is drawn
 * as text (crisp, theme-aware) rather than from the raster.
 */
export function Logo({
  size = 32,
  wordmark = true,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className="relative shrink-0 overflow-hidden"
        style={{ height: size, width: Math.round(size * 0.86) }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/im-logo.png"
          alt=""
          className="block max-w-none"
          style={{ height: size, width: "auto" }}
        />
      </span>
      {wordmark && (
        <span
          className="font-bold leading-none tracking-tight"
          style={{ fontSize: Math.round(size * 0.5) }}
        >
          <span className="text-foreground">insurance</span>
          <span style={{ color: BRAND_BLUE }}>MARKET.ae</span>
        </span>
      )}
    </span>
  );
}
