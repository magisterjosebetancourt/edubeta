import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormViewProps {
  children: ReactNode
  className?: string
  /** Cuando true aplica la animación de salida (slide-out-right) */
  exiting?: boolean
}

/**
 * FormView — Contenedor scroll-friendly para formularios mobile-first.
 *
 * REGLA DE ORO:
 * La aplicación tiene un Header de navegación global (DashboardLayout).
 * Las vistas FormView NO deben renderizar un segundo header.
 * El header global ya gestiona: título de página, botón ←, branding BETASOFT.
 *
 * Uso de animaciones:
 * - exiting=false (default) → animate-slide-in-right  (entrada)
 * - exiting=true            → animate-slide-out-right (salida al cancelar)
 */
export function FormView({ children, className, exiting = false }: FormViewProps) {
  return (
    <div
      className={cn(
        'flex flex-col min-h-[100dvh]',
        'bg-background-light dark:bg-background-dark',
        exiting ? 'animate-slide-out-right' : 'animate-slide-in-right',
        className
      )}
    >
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 lg:p-8 space-y-5 pb-24">
          {children}
        </div>
      </main>
    </div>
  )
}
