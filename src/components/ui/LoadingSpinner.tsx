import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  message = "Cargando...", 
  fullScreen = false 
}: LoadingSpinnerProps) {
  const containerClasses = fullScreen 
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 dark:bg-[#121022]/90 backdrop-blur-md transition-all duration-300"
    : "flex flex-col items-center justify-center py-16 w-full gap-5 animate-in fade-in duration-700 text-center";

  return (
    <div className={containerClasses}>
      <div className="relative flex items-center justify-center">
        {/* Aro base sutil */}
        <div className="h-14 w-14 rounded-full border-[3px] border-slate-100 dark:border-slate-800/40" />
        {/* Spinner activo con stroke de 2.5 para mejor visibilidad móvil */}
        <Loader2 className="h-14 w-14 animate-spin text-primary absolute stroke-[2.5]" />
      </div>
      <div className="flex flex-col gap-1.5 items-center">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-wide">
          {message}
        </p>
        {!fullScreen && (
          <span className="text-[9px] text-primary font-black uppercase tracking-[0.3em] opacity-40 animate-pulse">
            EduBeta
          </span>
        )}
      </div>
    </div>
  );
}
