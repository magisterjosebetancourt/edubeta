import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormViewProps {
  children: ReactNode
  className?: string
}

/**
 * FormView — Contenedor scroll-friendly para formularios mobile-first.
 * 
 * REGLA DE ORO:
 * La aplicación tiene un Header de navegación global (DashboardLayout).
 * Las vistas FormView NO deben renderizar un segundo header.
 * El header global ya gestiona: título de página, botón ←, branding BETASOFT.
 */
export function FormView({ children, className }: FormViewProps) {
  return (
    <div
      className={cn(
        'flex flex-col min-h-[100dvh] overflow-x-hidden',
        'bg-background-light dark:bg-background-dark',
        className
      )}
    >
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 lg:p-8 space-y-5 pb-10">
          {children}
        </div>
      </main>
    </div>
  )
}
