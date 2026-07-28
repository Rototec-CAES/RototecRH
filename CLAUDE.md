# Rototec HR — Notas para Claude Code

Sistema web de Recursos Humanos para Rototec (empresa de producción en Guatemala). Sólo se construye el frontend; el backend (BD + microservicio REST) ya existe pero la URL aún no se proporciona.

El plan completo (alcance, tipos, reglas de negocio, fórmulas IGSS/ISR, preguntas pendientes) vive en `PLAN_HR_ROTOTEC.md` en la raíz. Es la fuente de verdad — antes de cambiar contratos de tipos, catálogos o reglas, revísalo.

## Flujo de trabajo con el usuario

El usuario pidió explícitamente: **mostrar resumen y esperar confirmación antes de iniciar cada fase del plan**. No encadenar fases automáticamente. Si el comando dice "ejecuta la siguiente fase" sin más detalle, confirmar el alcance brevemente antes de tocar código.

## Stack

- React 18 + Vite 5 + TypeScript (strict, `noUnusedLocals`, `noUnusedParameters`)
- Tailwind CSS v3 (NO v4) con CSS variables (zinc) + `tailwindcss-animate`
- shadcn/ui — componentes escritos a mano en `src/components/ui/` (NO usar `npx shadcn add` para evitar prompts/red; copiar del registro oficial)
- TanStack Query v5 + TanStack Table v8
- React Hook Form + Zod (`@hookform/resolvers`)
- React Router v6 con `createBrowserRouter`
- Axios para HTTP, `sonner` para toasts, `lucide-react` para iconos, `date-fns`, SheetJS (`xlsx`)
- Alias `@/*` → `src/*` configurado en `vite.config.ts` y `tsconfig.app.json`

## Estructura

```
src/
├── api/              client.ts (axios + USE_MOCK), employees.ts (mock+real)
├── components/
│   ├── layout/       AppShell.tsx, PlaceholderPage.tsx
│   └── ui/           Componentes shadcn (button, sheet, dialog, tabs, …)
├── constants/        guatemala.ts (bancos, jornadas, pueblos, etc.)
├── hooks/            useEmpleados.ts
├── lib/              utils.ts (cn, formatQ, formatDate), validators.ts (Zod)
├── pages/
│   ├── empleados/    EmpleadosListPage, EmpleadoFormSheet, EmpleadoDetailPage, BajaDialog, EmpleadoStatusBadge
│   ├── turnos/       (stub Fase 2)
│   ├── asistencias/  (stub Fase 4)
│   ├── ausencias/    (stub Fase 3)
│   ├── pre-planilla/ (stub Fase 5)
│   └── planilla-final/ (stub Fase 5)
├── types/            index.ts (Empleado, BajaInput, enums)
├── App.tsx           QueryClientProvider + RouterProvider + Toaster
├── main.tsx
├── router.tsx
└── index.css         Tailwind + CSS variables shadcn
```

## Convenciones de código

- **Componentes shadcn**: viven en `src/components/ui/`. Cuando se necesite uno nuevo, copiar del registro oficial de shadcn (no instalar via CLI). Recordar agregar la dependencia `@radix-ui/*` correspondiente a `package.json` y correr `npm install`.
- **Formularios**: `react-hook-form` + `zodResolver`. Schemas en `src/lib/validators.ts`. Para formularios largos en modal/sheet: split por tabs, función `jumpToFirstError` que cambia al primer tab que tenga errores tras `handleSubmit`.
- **Modals**: usar `Dialog` (`src/components/ui/dialog.tsx`). **Drawers** (formularios grandes): usar `Sheet` lateral derecho.
- **Estado servidor**: TanStack Query con `staleTime: 30s`, `refetchOnWindowFocus: false`. Hooks en `src/hooks/use<Recurso>.ts` con `QK` constantes para keys.
- **Mutaciones**: `onSuccess` invalida `QK.all` y actualiza `QK.one(id)` con `setQueryData` cuando aplique.
- **Notificaciones**: `import { toast } from '@/components/ui/sonner'` para éxito/error desde mutaciones; `<Toaster richColors position="top-right" />` ya montado en `App.tsx`.
- **Formato moneda**: `formatQ(n)` → `Q1,234.56` (GTQ via `Intl.NumberFormat('es-GT')`).
- **Fechas**: `formatDate(iso)` → `dd/mm/yyyy`. Almacenar ISO `YYYY-MM-DD` en estado.
- **Badges de estado**: `variant="success"` (verde), `variant="destructive"` (rojo), `variant="warning"` (amarillo). Definidos en `src/components/ui/badge.tsx`.
- **Tablas**: cuerpo con `Skeleton` mientras `isLoading`, mensaje centrado si vacío o error.

## Capa de API y mock

Cada módulo en `src/api/*.ts` exporta `<recurso>Api = USE_MOCK ? mockApi : realApi`. Los siete archivos (`client.ts`, `employees.ts`, `turnos.ts`, `ausencias.ts`, `asistencias.ts`, `bonificaciones.ts`, `planilla.ts`) ya tienen simetría completa mock ↔ real: cada método del mock tiene su contraparte en realApi con el mismo nombre y firma.

El mock seed de empleados está en `seedIfEmpty()` (3 empleados: María García, Juan Carlos Pérez, Ana Lucía Hernández — esta última de baja). Para reiniciar datos: borrar las claves `rototec.*` en localStorage (clave de empleados: `rototec.empleados.v2`).

### Interceptor de errores (`client.ts`)

- Toast genérico vía sonner solo para errores **red caída o 5xx** (los errores 4xx llegan al `onError` del componente con su mensaje específico, evitando dobles toasts).
- Helper `extractApiErrorMessage(err)` exportado: extrae `data.message` / `data.error` del payload o cae a `Error <status>: <message>`.
- En `DEV` se mantiene un `console.error` con status + payload.
- Gancho `TODO(auth)` para redirigir a `/login` en `401` cuando exista autenticación.

### Switch a backend real — checklist día 0

1. Copiar `.env.example` a `.env.local` y poner la URL real en `VITE_API_BASE_URL`.
2. Cambiar `VITE_USE_MOCK=false`.
3. Verificar contra el equipo backend que los endpoints listados abajo coinciden exactamente (paths, verbos, query params). Si difieren: ajustar solo el bloque `realApi` del archivo correspondiente.
4. Confirmar si hay autenticación. Si la hay: configurar interceptor de request para inyectar `Authorization: Bearer …` y activar la redirección en `401`.
5. Smoke test manual en `npm run dev`: listar empleados → crear uno → asignar turno → registrar marcaje → generar planilla → cerrar planilla.

### Contrato esperado del microservicio

Endpoints que `realApi` consume hoy. Cualquier diferencia con el backend real se ajusta en el bloque `realApi` del archivo correspondiente.

**Empleados** (`api/employees.ts`)
- `GET /empleados`
- `GET /empleados/:id`
- `POST /empleados` (body: `EmpleadoInput`)
- `PUT /empleados/:id` (body: `EmpleadoInput`)
- `POST /empleados/:id/baja` (body: `BajaInput`)
- `POST /empleados/:id/reactivar`

**Turnos y asignaciones** (`api/turnos.ts`)
- `GET /turnos` · `GET /turnos/:id` · `POST /turnos` · `PUT /turnos/:id`
- `POST /turnos/:id/desactivar` · `POST /turnos/:id/reactivar`
- `GET /asignaciones-turno` · `POST /asignaciones-turno`
- `GET /empleados/:id/asignaciones-turno`

**Ausencias y atrasos** (`api/ausencias.ts`)
- `GET /ausencias?desde=&hasta=` · `GET /empleados/:id/ausencias`
- `POST /ausencias` · `PUT /ausencias/:id` · `DELETE /ausencias/:id`
- `GET /atrasos?desde=&hasta=` · `GET /empleados/:id/atrasos`
- `POST /atrasos` · `PUT /atrasos/:id` · `DELETE /atrasos/:id`

**Asistencias** (`api/asistencias.ts`)
- `GET /asistencias?desde=&hasta=`
- `GET /empleados/:id/asistencias?desde=&hasta=`
- `POST /asistencias` (upsert por `empleadoId + fecha`)
- `DELETE /asistencias?empleadoId=&fecha=`

**Bonificaciones** (`api/bonificaciones.ts`)
- `GET /bonificaciones?periodo=` · `GET /empleados/:id/bonificaciones`
- `POST /bonificaciones` · `POST /bonificaciones/batch`
- `PUT /bonificaciones/:id` · `DELETE /bonificaciones/:id`

**Planilla** (`api/planilla.ts`)
- `GET /planillas` · `GET /planillas/:periodo`
- `POST /planillas/:periodo/generar` (body: `{ desde, hasta }`)
- `PATCH /planillas/:periodo/lineas/:empleadoId` (body: `Partial<LineaInputManual>`)
- `POST /planillas/:periodo/cerrar`

## Variables de entorno

```
VITE_API_BASE_URL=http://localhost:3000/api   # ajustar cuando llegue la URL real
VITE_USE_MOCK=true                            # 'true' = mock localStorage, 'false' = realApi
```

`src/vite-env.d.ts` tiene los tipos.

## Reglas de negocio Guatemala (resumen)

Definidas con más detalle en `PLAN_HR_ROTOTEC.md`. Cosas a recordar:

- **Horas extras**: diurnas > 44h/semana, nocturnas > 36h/semana, mixtas > 42h/semana. Pago 1.5× hora ordinaria.
- **Periodo de horas extra = CATORCENA anclada al rango** (no la quincena de calendario). La catorcena empieza en la fecha «Desde» que se elige en la pantalla, aunque en el calendario real no sea inicio de catorcena, y sus semanas son bloques de 7 días desde ese mismo día (no lunes–domingo), así que siempre son 2 semanas completas sin prorrateo. Un rango más largo se parte en catorcenas consecutivas y la última, si no llega a 14 días, se prorratea. Lo calcula el backend en `recursos-humanos/src/horas-extra/lib/` (`calendario.ts` + `motor.ts`); el `periodo` viaja como `"AAAA-MM-DD..AAAA-MM-DD"`. **La planilla y las bonificaciones siguen siendo quincenales** — este cambio es sólo del motor de horas extra.
- **Séptimo día**: si el empleado falta injustificadamente, pierde también el séptimo, pero sólo se descuenta una vez por semana aunque falte varios días.
- **Bonificación incentivo** Q250 mensuales fijos (Decreto 78-89). No es parte del salario para IGSS ni indemnización.
- **IGSS**: cuota laboral 4.83%, patronal 12.67%. Sólo sobre salario ordinario.
- **DPI**: 13 dígitos. **NIT**: dígitos opcionalmente terminados en K. (Validado en Zod.)
- **Salario base mínimo de validación**: Q2,500 (piso anti-error según el plan; el mínimo real es mayor).

## Decisiones tomadas con el usuario

- Proyecto creado directamente en `C:\Fuentes\RototecRH\` (sin subcarpeta `rototec-hr`).
- Backend en mock localStorage hasta tener URL real del microservicio.
- Formulario de alta de empleado en **drawer lateral** (no modal centrado), por ser largo.

## Estado de fases

- [x] **Fase 1** — Layout base + Módulo de Empleados (lista, alta/edición en drawer 4 tabs Personal/Cultural/Laboral/Bancario, detalle, baja, reactivar). Refactor aplicado con la spec real: nombres en partes, catálogos MINTRAB con códigos, departamento como catálogo cerrado, jornada mixta eliminada, bonificación de ley Q250 fija no editable.
- [x] **Fase 2** — Catálogo de Turnos (Diurno/Nocturno con cruce de medianoche). Asignación de turno a empleado en el detalle con historial. Soft delete bloqueado si tiene asignaciones vigentes.
- [x] **Fase 3** — Control de Ausencias y Atrasos (misma página, 2 tabs). Catálogo con tipos reales del archivo del cliente. Regla de séptimo aplicada una sola vez por semana. Selector por quincena.
- [x] **Fase 4** — Asistencias + cálculo de horas extras. Lista de empleados con resumen del período + detalle diario por empleado. `MarcajeDialog` con 5 tipos de registro. Cruce automático con Fase 3 (ausencias bloquean edición de marcaje). Cálculo semanal acumulado o por día si hay mezcla de turnos.
- [x] **Fase 5** — Planilla consolidada (BORRADOR/CERRADA en una sola página, NO dos como decía el plan). Generación auto desde empleados + asistencias + ausencias + atrasos. Edición inline de campos manuales. ISR régimen opcional simplificado con override. Export Excel con SheetJS (1 hoja con todas las columnas del Excel real del cliente).
- [x] **Fase 6** — Bonificaciones (módulo separado con captura previa por período). Tipos mapeados 1:1 a campos de `LineaPlanilla`. Captura individual y masiva (filtro por departamento). Al generar planilla los montos del catálogo sobreescriben los campos correspondientes.
- [ ] **Fase 7** — Detalle horas extras por empleado (formato imprimible para pre-boleta).
- [ ] **Fase 8** — QA/buffer + pendientes técnicos.

## Comandos

```powershell
npm run dev          # Vite dev server en http://localhost:5173
npm run build        # tsc -b && vite build
npm run typecheck    # tsc --noEmit
npm run preview      # Servir el build de producción
```

## Preguntas pendientes al cliente

Listadas al final del plan. Las más críticas para no avanzar a ciegas:

1. URL base del microservicio existente.
2. Endpoints disponibles y sus contratos exactos.
3. Columnas adicionales en el Excel de nómina actual de Contabilidad.
4. ¿Hay auth/roles en el microservicio o es acceso libre?
5. Formato específico requerido para los encriptados IGSS.
