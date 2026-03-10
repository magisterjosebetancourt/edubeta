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
className="w-full h-6 dark:border-slate-800 bg-slate-100 dark:bg-[#1e2536] px-1 text-sm outline-none focus:ring-2 focus:ring-primary/50 flex items-center mb-1"
```

## Componentes de Formulario y Navegación

### Campos de Entrada y Selectores (`EduInput`, `EduSelect`)
**Regla OBLIGATORIA**: Usar los componentes reutilizables en lugar de clases manuales.
```tsx
<EduInput label="Nombre" placeholder="Ingrese..." />
<EduSelect label="Grado">
  <option>...</option>
</EduSelect>
```

## Botones y Acciones

className="flex flex-col gap-2 w-full"
```

### Botones de Acción (`EduButton`)
**Regla OBLIGATORIA**: Usar `<EduButton />` para todas las acciones.
- **Primario**: Por defecto (azul), sombra `shadow-primary/20`.
- **Ancho**: Usar la prop `fullWidth` para botones que deben ocupar toda la base del formulario (estándar en móvil).

```tsx
<EduButton icon={Save} fullWidth>Guardar cambios</EduButton>
```

### Eliminación del Botón Cancelar
**Regla OBLIGATORIA**: No incluir botones de "Cancelar" dentro del flujo del formulario. Se espera que el usuario use el botón de retroceso del navegador, el menú o los breadcrumbs.

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

### Botones de Acción Internos (Tarjetas)
**Regla OBLIGATORIA**: Estarán posicionados por debajo de una línea suave separadora. El contenedor permite scroll horizontal en móvil si es necesario.
```text
className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-nowrap items-center justify-end w-full gap-1 overflow-x-auto"
```

**Botón Observador / Anotación (Destacado):**
```text
className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/20"
```
**Botón Editar / Acción (Estándar):**
```text
className="flex flex-1 min-w-0 items-center justify-center gap-2 px-2 py-2 rounded-[5px] text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all"
```

### Regla Universal de Botones de Acción
**Todos los botones de acción deben cumplir:**
1. **Borde suave**: Definido por `border` con colores sutiles (`slate-200`, `primary/20`, etc.).
2. **Icono**: Siempre presente a la izquierda del texto.
3. **Texto**: Siempre presente (en Sentence Case o Uppercase según el contexto).

## Componentes de Layout

### FormView
**Regla OBLIGATORIA**: Todas las páginas de formulario deben estar envueltas en `<FormView />`.
- **No usar `exiting`**: La lógica de transiciones ha sido eliminada para mejorar el rendimiento.
- **Navegación**: Utilizar `navigate()` directamente sin retardos artificiales.

---
> [!NOTE]
> Estas clases están diseñadas para funcionar con el sistema de diseño de EduBeta y deben actualizarse aquí antes de aplicarse masivamente si hay cambios en el branding.
