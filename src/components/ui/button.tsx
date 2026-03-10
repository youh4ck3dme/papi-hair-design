import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-touch min-w-touch sm:min-h-0 sm:min-w-0",
  {
    variants: {
      variant: {
        default:
          "relative overflow-hidden border border-zinc-300/80 dark:border-zinc-600/70 bg-[linear-gradient(180deg,rgba(250,250,250,0.98)_0%,rgba(226,232,240,0.96)_52%,rgba(203,213,225,0.92)_100%)] dark:bg-[linear-gradient(180deg,rgba(82,82,91,0.96)_0%,rgba(63,63,70,0.94)_50%,rgba(39,39,42,0.96)_100%)] text-zinc-900 dark:text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_14px_rgba(15,23,42,0.12)] hover:brightness-[1.02] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_6px_18px_rgba(15,23,42,0.18)] before:content-[''] before:absolute before:inset-y-0 before:-left-1/3 before:w-1/3 before:rotate-[22deg] before:bg-white/35 dark:before:bg-white/20 before:opacity-0 before:blur-sm before:transition-all before:duration-500 hover:before:opacity-100 hover:before:left-[115%]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline min-h-0 min-w-0",
      },
      size: {
        default: "h-9 min-h-[44px] sm:min-h-9 px-3.5 py-1.5",
        sm: "h-8 min-h-[44px] sm:min-h-8 rounded-md px-3",
        lg: "h-10 min-h-[44px] sm:min-h-10 rounded-md px-4.5 sm:px-6",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] sm:min-h-10 sm:min-w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
