import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@frontend/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-accent)/60] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--c-accent)] text-white hover:bg-[var(--c-accent-hover)]",
        destructive:
          "bg-[var(--c-error)] text-white hover:bg-[var(--c-error-hover)]",
        outline:
          "border border-[var(--c-border)] bg-[var(--c-surface-1)] hover:bg-[var(--c-surface-3)] text-[var(--c-text)]",
        secondary:
          "bg-[var(--c-surface-2)] text-[var(--c-text)] hover:bg-[var(--c-surface-3)]",
        ghost: "hover:bg-[var(--c-surface-3)] text-[var(--c-text)]",
        link: "text-[var(--c-accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "span" : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
