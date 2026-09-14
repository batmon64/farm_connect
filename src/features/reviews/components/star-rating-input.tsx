"use client";

import { Star } from "lucide-react";
import { REVIEW_RATING_VALUES } from "@/types/marketplace";

/** A native radio group styled as stars — keyboard-navigable (Tab into
 * the group, arrow keys to move between options) and screen-reader
 * announced for free, rather than a div-based click target that would
 * need its own ARIA/keyboard handling reimplemented from scratch. */
export function StarRatingInput({
  value,
  onChange,
  name = "rating",
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="sr-only">Rating</legend>
      <div className="flex items-center gap-1">
        {REVIEW_RATING_VALUES.map((n) => {
          const filled = n <= value;
          return (
            <label
              key={n}
              className="has-[:focus-visible]:ring-ring cursor-pointer rounded-md p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2"
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              <Star
                className={`size-9 transition-colors ${
                  filled ? "fill-fc-star text-fc-star" : "fill-none text-muted-foreground"
                }`}
                aria-hidden
              />
              <span className="sr-only">
                {n} star{n > 1 ? "s" : ""}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
