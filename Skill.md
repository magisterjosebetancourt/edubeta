# EduBeta Design System & Skills

## Normas de UI y UX
- **Formularios**: Usar el componente `FormView` para todas las páginas principales del dashboard. No usar la prop `exiting` (depreciada).
- **Inputs y Selects (`EduInput`, `EduSelect`)**: 
  - **Inputs**: Usar siempre el componente `<EduInput />`. Altura estándar `h-12`, bordes `rounded-lg`, y fondos coherentes con el tema.
  - **Selects**: Usar siempre el componente `<EduSelect />`. Altura estándar `h-12`, bordes `rounded-lg`.
- **Botones de Formulario (`EduButton`)**: 
  - **Acción Principal (Guardar/Registrar/Nuevo)**: Usar `<EduButton />`. Por defecto ocupa el `fullWidth` en móvil. Mantener icono a la izquierda.
  - **Acción Secundaria**: Los botones "Cancelar" se han eliminado. El usuario debe usar la navegación nativa o los breadcrumbs para volver.
  - **Estilo**: Bordes `rounded-lg`, fuente `font-semibold`, rastreo `tracking-widest`.
- **Texto Descriptivo (p)**: Usar la clase estándar para párrafos informativos al inicio de los formularios.

## Estándares de UI/UX
- **Indicadores de Carga**: Siempre usar el componente `<LoadingSpinner />` en lugar de textos planos como "Cargando...". Este componente incluye el logotipo institucional animado y un mensaje descriptivo.
- **Navegación Instantánea**: No usar retardos artificiales (`setTimeout`) ni efectos de transición laterales en los formularios. La navegación debe ser inmediata tras completar una acción exitosa.

## Estructura y Orden de Elementos por Página
### PÁGINAS PRINCIPALES (Con acceso desde menú)
- **Texto descriptivo**: Breve párrafo informativo al inicio de la página.
- **Campo de búsqueda**: Si aplica o es necesario para localizar registros.
- **Filtros**: Selectores o toggles para refinar la vista si aplica.
- **Botón de acción**: Botón "Nuevo" o "Agregar" si el módulo lo permite.
- **Lista de datos**: Visualización principal mediante tarjetas o listas normales.

### PÁGINAS SECUNDARIAS (Formularios y procesos)
- **Texto descriptivo**: Explicación del propósito de la vista o formulario.
- **Campo de búsqueda/Filtros**: Si es necesario buscar información previa para el proceso.
- **Botón de carga**: Acciones como "Cargar" o "Mostrar" resultados previos.
- **Cuerpo del proceso**: Formulario con los campos necesarios. **Importante**: El contenedor del formulario no debe tener color de fondo.
- **Lista complementaria**: Si aplica, mostrar tarjetas con datos relacionados al proceso.
- **Acciones finales**: Botón de "Guardar", "Actualizar" o "Comenzar" al final de la vista.

## Reglas de Identidad Visual
- **Avatares de Usuarios**: 
  - **Prioridad**: Siempre mostrar la foto de perfil (`avatar_url`) si está disponible.
  - **Fallback**: Si no hay foto, mostrar la inicial del nombre.
  - **Estilo**: Círculo perfecto (`rounded-full`), borde sutil (`border-primary/10`), ajuste de imagen `object-cover`.
  - **Colores Fallback**: Fondo `#C6E7FC`, Texto `#0099FE` (Bold).

## Estándares de Documentos PDF
- **Tipografía**: Usar `helvetica`.
- **Encabezado Institucional**:
  - Logo: `20x20` mm en la esquina superior izquierda.
  - Nombre del Colegio: Fuente `14`, Negrita, Mayúsculas, Centrado.
  - Lema: Fuente `9`, Cursiva, Mayúsculas, Centrado.
  - TÃ­tulo: Fuente `11`, Negrita, Centrado.
  - LÃ­nea de separaciÃ³n: `margin + 25` mm.
  - LÃ­nea de Info (Grado/AÃ±o): Fuente `9`, Negrita.
- **Tablas (jspdf-autotable)**:
  - Tema: `grid`.
  - Encabezados: `fillColor: [51, 65, 85]`, `textColor: [255, 255, 255]`, tamaÃ±o `8`.
  - Cuerpo: TamaÃ±o `8`, `cellPadding: 1`.
- **Pie de Página**:
  - Izquierda: `DiseÃ±o: Edubeta | Empresa: Betasoft (c)`.
  - Derecha: `Fecha de impresiÃ³n: [DD/MM/YYYY HH:mm]`.
  - Fuente: `7`, normal.
