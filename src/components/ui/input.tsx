import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-500",
        className,
      )}
      {...props}
    />
  );
}
