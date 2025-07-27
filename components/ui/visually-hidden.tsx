import * as React from "react"
import { cn } from "@/lib/utils"

const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "absolute h-px w-px -m-px overflow-hidden whitespace-nowrap border-0 p-0",
      "clip-path-[inset(50%)]",
      // Fallback for older browsers
      "clip-[rect(0,0,0,0)]",
      className
    )}
    {...props}
  />
))
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }