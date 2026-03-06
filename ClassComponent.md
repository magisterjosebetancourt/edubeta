# EduBeta Component Classes Reference

Este archivo contiene las reglas base y clases de Tailwind CSS para los componentes globales de EduBeta. Estas clases deben aplicarse consistentemente en toda la aplicaciÃ³n para mantener la coherencia visual.

## Reglas Basales Globales

### Radio de Borde (Border Radius)
**Todos los elementos curvos (botones, inputs, cards) usarÃ¡n:**
```text
rounded-[5px]
```

### Tipografía (Typography)
**Regla OBLIGATORIA para pesos de fuente:**
- **NO usar** `font-bold`.
- **SI usar** `font-semibold` para enfatizar textos importantes.
- Mantener `font-black` solo para títulos de nivel superior (h1) o identificadores muy críticos donde ya se esté usando.
```

### Contenedor de Vista Principal
**Clase para el wrapper de pÃ¡gina:**
```text
className="bg-background-light dark:bg-background-dark min-h-screen text-slate-800 dark:text-slate-100 pb-24"
```

### Texto Descriptivo de Vista
**PÃ¡rrafo informativo al inicio de cada pÃ¡gina:**
```text
className="text-sm text-slate-500 dark:text-slate-400"
```

## Componentes de Formulario y NavegaciÃ³n

### Campos de Entrada (Inputs)
**Campo de bÃºsqueda:**
```text
className="w-full bg-slate-100 dark:bg-[#1e2536] border rounded-lg py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
```

### Selectores (Selects)
**Selector estÃ¡ndar:**
```text
className="col-span-2 w-full bg-slate-100 dark:bg-[#1e2536] border dark:border-slate-800 rounded-lg py-3 px-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 transition-all outline-none appearance-none"
```

## Botones y Acciones

className="flex flex-col gap-2 w-full"
```

### Botones de Acción Formulario (Orden Vertical)
**Regla OBLIGATORIA**: Los botones se apilan verticalmente **SIN contenedor de fondo ni sombras en el wrapper**.
1. **Primario (Arriba)**: Acción principal (Guardar/Crear).
2. **Secundario (Abajo)**: Cancelar.
```

### Botones de AcciÃ³n Horizontal
**BotÃ³n Secundario / Ghost:**
```text
className="rounded-lg h-auto py-3 gap-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e2536] text-slate-700 dark:text-slate-200"
```

**BotÃ³n Primario / AcciÃ³n:**
```text
className="bg-primary hover:bg-primary/90 text-white rounded-lg h-auto py-3 gap-2 shadow-lg shadow-primary/20"
```

### Avatares (Jerarquía Imagen > Iniciales)
**Regla OBLIGATORIA**: Los avatares deben mostrar la foto de perfil si existe.
```tsx
<div className="h-10 w-10 rounded-full bg-[#C6E7FC] overflow-hidden flex items-center justify-center text-[#0099FE] font-bold text-sm shrink-0 border border-primary/10">
  {user.avatar_url ? (
    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
  ) : (
    user.full_name?.charAt(0) || "?"
  )}
</div>
```

## Componentes de Estudiantes (Cards)

### Tarjeta de Estudiante (Container)
```text
className="group relative bg-white dark:bg-[#151b2d] rounded-[5px] p-4 border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all"
```

### Formato de Nombres (JerarquÃ­a)
**Apellido (Principal):**
```text
className="font-semibold text-slate-900 dark:text-white leading-tight uppercase tracking-tight"
```
**Nombre (Secundario):**
```text
className="text-xs font-medium text-slate-500 dark:text-slate-400"
```

### Botones de AcciÃ³n Internos (Tarjetas)
**Regla OBLIGATORIA**: EstarÃ¡n posicionados por debajo de una lÃ­nea suave separadora. El contenedor permite scroll horizontal en mÃ³vil si es necesario.
```text
className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-nowrap items-center justify-end w-full gap-1 overflow-x-auto"
```

**BotÃ³n Observador / AnotaciÃ³n (Destacado):**
```text
className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/20"
```
**BotÃ³n Editar / AcciÃ³n (EstÃ¡ndar):**
```text
className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all"
```

### Regla Universal de Botones de AcciÃ³n
**Todos los botones de acciÃ³n deben cumplir:**
1. **Borde suave**: Definido por `border` con colores sutiles (`slate-200`, `primary/20`, etc.).
2. **Icono**: Siempre presente a la izquierda del texto.
3. **Texto**: Siempre presente (en Sentence Case o Uppercase segÃºn el contexto).

## Componentes de Feedback

### Indicador de Carga (Spinner)
**Regla OBLIGATORIA**: Todos los estados de carga asÃ­ncrona deben usar el componente `<LoadingSpinner />` con un mensaje descriptivo.
```tsx
<LoadingSpinner message="Cargando datos..." />
```

---
> [!NOTE]
> Estas clases estÃ¡n diseÃ±adas para funcionar con el sistema de diseÃ±o de EduBeta y deben actualizarse aquÃ­ antes de aplicarse masivamente si hay cambios en el branding.
