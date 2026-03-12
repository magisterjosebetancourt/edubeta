import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

interface EduButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  icon?: LucideIcon
  children?: React.ReactNode
  fullWidth?: boolean
  distributed?: boolean
  loading?: boolean
}

const EduButton = React.forwardRef<HTMLButtonElement, EduButtonProps>(
  ({ className, variant = "primary", icon: Icon, children, fullWidth = true, distributed = false, loading = false, ...props }, ref) => {
    
    const variants = {
      primary: "bg-[#0099FE] hover:bg-[#0081D6] text-white",
      secondary: "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 border",
      ghost: "variant-ghost", // Fallback to shadcn ghost if needed
      outline: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e1e2d] hover:bg-slate-50",
    }

    const baseClasses = "h-12 rounded-lg font-semibold tracking-widest text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 px-6 overflow-hidden"
    
    const widthClasses = cn(
      fullWidth ? "w-full sm:w-auto" : "w-auto",
      distributed ? "flex-1 min-w-0" : ""
    )

    const variantClasses = variants[variant] || variants.primary

    return (
      <Button
        ref={ref}
        variant={variant === 'primary' ? 'default' : (variant === 'secondary' ? 'ghost' : variant)}
        disabled={props.disabled || loading}
        className={cn(
          baseClasses,
          variantClasses,
          widthClasses,
          className,
          loading && "opacity-80 cursor-not-allowed"
        )}
        {...props}
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        ) : (
          Icon && <Icon className={cn("w-4 h-4 shrink-0", !children && "m-0")} />
        )}
        {children && <span className="truncate">{children}</span>}
      </Button>
    )
  }
)

EduButton.displayName = "EduButton"

export { EduButton }
