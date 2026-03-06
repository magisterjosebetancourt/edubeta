# EduBeta Design System & Skills

## Normas de UI y UX
- **Formularios**: Usar el componente `FormView` para todas las pÃ¡ginas principales del dashboard.
- **Inputs y Selects**: Aplicar `fieldClass` estÃ¡ndar: `w-full bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 rounded-lg py-3 px-4 text-sm`.
- **Botones de Formulario**: 
  - **AcciÃ³n Principal (Guardar/Registrar)**: `bg-primary text-white rounded-2xl h-[60px] font-bold uppercase shadow-xl shadow-primary/30`. Siempre con icono.
  - **AcciÃ³n Secundaria (Cancelar)**: `bg-white border border-slate-200 text-slate-600 rounded-2xl h-[60px] font-semibold shadow-sm`. Siempre con icono `X`.

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
