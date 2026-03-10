import * as React from "react"
import { LucideIcon, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface EduSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: LucideIcon
  containerClassName?: string
}

const EduSelect = React.forwardRef<HTMLSelectElement, EduSelectProps>(
  ({ className, children, icon: Icon, containerClassName, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", containerClassName)}>
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <select
          className={cn(
            "h-12 w-full bg-white dark:bg-[#1e2536] border border-slate-200 dark:border-slate-800 rounded-lg px-4 pr-10 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none transition-all disabled:opacity-50 font-medium cursor-pointer shadow-sm",
            Icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    )
  }
)
EduSelect.displayName = "EduSelect"

export { EduSelect }
