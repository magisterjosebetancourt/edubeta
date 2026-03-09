# EduBeta Design System & Skills

## Normas de UI y UX
- **Formularios**: Usar el componente `FormView` para todas las pÃ¡ginas principales del dashboard.
- **Inputs y Selects**: 
  - **Inputs**: `w-full h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50`.
  - **Selects**: `pl-9 h-10 w-full sm:w-auto min-w-[150px] bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg pr-8 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none appearance-none`.
- **Botones de Formulario**: 
  - **Acción Principal (Guardar/Registrar/Nuevo)**: `bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3.5 px-6 gap-2 shadow-xl shadow-primary/20 font-semibold text-xs tracking-widest w-full sm:w-auto transition-all active:scale-95 shrink-0`. Siempre con icono a la izquierda.
  - **Acción Secundaria (Cancelar/Eliminar)**: `w-full h-14 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 gap-2 rounded-lg font-semibold tracking-widest text-xs`. Siempre con icono.

## EstÃ¡ndares de UI/UX
- **Indicadores de Carga**: Siempre usar el componente `<LoadingSpinner />` en lugar de textos planos como "Cargando...". Este componente incluye el logotipo institucional animado y un mensaje descriptivo.

## Reglas de Identidad Visual
- **Avatares de Usuarios**: 
  - **Prioridad**: Siempre mostrar la foto de perfil (`avatar_url`) si está disponible.
  - **Fallback**: Si no hay foto, mostrar la inicial del nombre.
  - **Estilo**: Círculo perfecto (`rounded-full`), borde sutil (`border-primary/10`), ajuste de imagen `object-cover`.
  - **Colores Fallback**: Fondo `#C6E7FC`, Texto `#0099FE` (Bold).

## EstÃ¡ndares de Documentos PDF
- **TipografÃ­a**: Usar `helvetica`.
- **Encabezado Institucional**:
  - Logo: `20x20` mm en la esquina superior izquierda.
  - Nombre del Colegio: Fuente `14`, Negrita, MayÃºsculas, Centrado.
  - Lema: Fuente `9`, Cursiva, MayÃºsculas, Centrado.
  - TÃ­tulo: Fuente `11`, Negrita, Centrado.
  - LÃ­nea de separaciÃ³n: `margin + 25` mm.
  - LÃ­nea de Info (Grado/AÃ±o): Fuente `9`, Negrita.
- **Tablas (jspdf-autotable)**:
  - Tema: `grid`.
  - Encabezados: `fillColor: [51, 65, 85]`, `textColor: [255, 255, 255]`, tamaÃ±o `8`.
  - Cuerpo: TamaÃ±o `8`, `cellPadding: 1`.
- **Pie de PÃ¡gina**:
  - Izquierda: `DiseÃ±o: Edubeta | Empresa: Betasoft (c)`.
  - Derecha: `Fecha de impresiÃ³n: [DD/MM/YYYY HH:mm]`.
  - Fuente: `7`, normal.
