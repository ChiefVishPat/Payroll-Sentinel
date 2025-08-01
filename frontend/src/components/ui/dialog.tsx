import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@frontend/lib/utils'

/** Simple wrapper around Radix Dialog used throughout the demo */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 bg-[var(--c-overlay)]" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border border-[var(--c-border)] bg-[var(--c-surface-2)] p-6 shadow-[0_2px_8px_rgba(13,17,23,.60)]',
        'focus:outline-none',
        className
      )}
      {...props}
    />
  </DialogPrimitive.Portal>
))
DialogContent.displayName = 'DialogContent'
