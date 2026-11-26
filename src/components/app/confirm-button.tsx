"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

/** כפתור submit שמבקש אישור (confirm) לפני שליחת הטופס — לפעולות הרסניות */
export function ConfirmButton({
  confirmMessage,
  ...props
}: Omit<ComponentProps<"button">, "onClick" | "type"> & {
  confirmMessage: string;
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
}) {
  return (
    <Button
      {...props}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    />
  );
}
