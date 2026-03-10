import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EduInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
}

const EduInput = React.forwardRef<HTMLInputElement, EduInputProps>(
  ({ className, type, icon: Icon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-12 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2536] px-4 py-2 text-sm shadow-sm transition-all focus:ring-2 focus:ring-primary/50 outline-none disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-slate-500 font-medium",
            Icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
EduInput.displayName = "EduInput"

export { EduInput }
