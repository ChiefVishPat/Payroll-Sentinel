import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@frontend/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#0077FF] text-white hover:bg-[#005BB5]",
        destructive: "bg-[#FF5733] text-white hover:bg-[#FF5733]/90",
        outline:
          "border border-[#444444] bg-[#2C2C2C] hover:bg-[#2C2C2C]/80 text-[#EAEAEA]",
        secondary:
          "bg-[#2C2C2C] text-[#EAEAEA] hover:bg-[#2C2C2C]/80",
        ghost: "hover:bg-[#2C2C2C] text-[#EAEAEA]",
        link: "text-[#0077FF] underline-offset-4 hover:underline",
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
