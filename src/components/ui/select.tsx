import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-500/15",
        className,
      )}
      {...props}
    />
  );
}
