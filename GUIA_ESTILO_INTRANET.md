# Guía para acoplar Rototec HR al diseño de la Intranet Rototec v2

> **Para el agente que ejecute esta guía.** El objetivo es que Rototec HR (`C:\Fuentes\RototecRH`) se vea y se comporte como la Intranet Rototec v2 (`C:\Fuentes\IntranetRototec`): mismos colores, mismo layout, mismas tablas, mismos reportes y mismo Excel. La intranet es la **referencia de solo lectura**: no la modifiques. Copia de ella lo que se indica abajo y adáptalo al stack de RH.
>
> **Reglas:**
> - No hagas `git commit`; el usuario commitea.
> - No cambies lógica de negocio, endpoints, hooks de datos ni cálculos (nómina, horas extra, etc.). Solo presentación, componentes compartidos y exportaciones.
> - Trabaja por fases (sección 10) y deja `npm run typecheck` y `npm run build` en verde al final de cada fase.

---

## 1. Diferencias de stack (importante)

| | Intranet (referencia) | Rototec HR (destino) | Qué hacer |
|---|---|---|---|
| React | 19 | 18.3 | **No actualizar.** Todo lo de abajo funciona en 18. |
| Tailwind | v4 (`@import "tailwindcss"` + `@theme inline`, variables en hex) | v3.4 (`tailwind.config.ts` + variables HSL `H S% L%`) | **No migrar a v4.** Traducir los tokens a HSL (sección 2). Las clases utilitarias (`bg-slate-50`, `rounded-2xl`, `bg-white/[0.06]`, etc.) son iguales en v3. |
| Íconos | `@iconify/react`, set **Solar** (`solar:*-bold`), spinner `svg-spinners:180-ring` | `lucide-react` | Instalar `@iconify/react` y usar Solar en los componentes nuevos o migrados. Lucide puede quedar en los componentes shadcn internos (X del dialog, Check del checkbox, chevrons del select). |
| Gráficas | `echarts` + `echarts-for-react` | ninguna | Instalar ambos si se agregan gráficas/dashboards. |
| Animación | `framer-motion` (sidebar colapsable, loader) | ninguna | Instalar `framer-motion`. |
| Estado global | `zustand` (ui store, confirm dialog) | ninguno | Instalar `zustand`. |
| Toasts | `sonner` `<Toaster richColors position="top-right" closeButton />` + helper `notify()` | `sonner` | Igualar la configuración del Toaster y agregar `notify()`. |
| Excel | `exceljs` + `file-saver` (import dinámico) | `exceljs`, `file-saver` **y** `xlsx` | Unificar en `exceljs` con el helper `descargarExcel` (sección 7). |
| Data fetching | `@tanstack/react-query` | `@tanstack/react-query` | Sin cambio. |
| Select | `<select>` nativo estilizado | shadcn/Radix `Select` | Se puede conservar el de Radix, restyleado con los tokens. Para filtros de tabla usar el nativo (`TableFilterSelect`). |

Instalación sugerida:

```bash
npm i @iconify/react echarts echarts-for-react framer-motion zustand
```

---

## 2. Paleta y tokens

La intranet es **solo modo claro**, con base `slate`, acento **sky/cyan** y sidebar oscuro. Fuente **Inter**.

### 2.1 Tokens (reemplazar el `:root` de `src/index.css` de RH)

Valores de la intranet traducidos al formato HSL que usa Tailwind v3 en RH:

| Token | Hex en la intranet | Equivalente Tailwind | HSL para RH |
|---|---|---|---|
| `--background` | `#ffffff` | white | `0 0% 100%` |
| `--foreground` | `#0f172a` | slate-900 | `222.2 47.4% 11.2%` |
| `--card` / `--popover` | `#ffffff` | white | `0 0% 100%` |
| `--card-foreground` / `--popover-foreground` | `#0f172a` | slate-900 | `222.2 47.4% 11.2%` |
| `--primary` | `#0ea5e9` | **sky-500** | `198.6 88.7% 48.4%` |
| `--primary-foreground` | `#ffffff` | white | `0 0% 100%` |
| `--secondary` / `--muted` | `#f1f5f9` | slate-100 | `210 40% 96.1%` |
| `--secondary-foreground` | `#0f172a` | slate-900 | `222.2 47.4% 11.2%` |
| `--muted-foreground` | `#64748b` | slate-500 | `215.4 16.3% 46.9%` |
| `--accent` | `#e0f2fe` | sky-100 | `204 93.8% 93.7%` |
| `--accent-foreground` | `#0369a1` | sky-700 | `201.3 96.3% 32.2%` |
| `--destructive` | `#ef4444` | red-500 | `0 84.2% 60.2%` |
| `--destructive-foreground` | `#ffffff` | white | `0 0% 100%` |
| `--border` / `--input` | `#e2e8f0` | slate-200 | `214.3 31.8% 91.4%` |
| `--ring` | `#0ea5e9` | sky-500 | `198.6 88.7% 48.4%` |
| `--radius` | `0.5rem` | | `0.5rem` |
| fondo de página | `#f8fafc` | slate-50 | usar `bg-slate-50` en el shell / `body` |
| fondo sidebar | `#0f172a` | slate-900 | usar `bg-slate-900` |

Eliminar el bloque `.dark` (la intranet no tiene modo oscuro) o dejarlo sin uso.

Agregar al final de `index.css` (igual que la intranet):

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..800;1,14..32,300..700&display=swap');
/* (el @import de la fuente va ANTES de @tailwind base) */

@layer base {
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    @apply bg-slate-50 text-foreground antialiased;
    line-height: 1.5;
  }
}

/* Scrollbar sutil */
::-webkit-scrollbar          { width: 5px; height: 5px; }
::-webkit-scrollbar-track    { background: transparent; }
::-webkit-scrollbar-thumb    { background: #cbd5e1; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
```

En `tailwind.config.ts` ampliar `borderRadius` para que `rounded-xl`/`rounded-2xl` sigan siendo los de Tailwind por defecto (no sobreescribirlos). Los de la intranet son: `sm = radius-2px`, `md = radius`, `lg = radius+4px`; en la práctica las pantallas usan directamente `rounded-lg`, `rounded-xl` y `rounded-2xl` de Tailwind.

### 2.2 Uso de color por rol (copiar estos patrones)

| Rol | Clases |
|---|---|
| Texto principal / títulos | `text-slate-900` (títulos), `text-slate-800`, `text-slate-700` (cuerpo fuerte) |
| Texto secundario | `text-slate-500`; terciario / hints `text-slate-400` |
| Bordes | `border-slate-200` (cards), `border-slate-100` (separadores internos y filas) |
| Acento primario / links / foco | `sky-500` (`focus:ring-2 focus:ring-sky-500`), links `text-sky-500 hover:text-sky-600` |
| Acento de reportes | `cyan-600` (botón **Aplicar**, segmented activo, icono de orden activo, modal de carga) |
| Botón **Excel** | `bg-emerald-600 hover:bg-emerald-700` |
| Gradiente de marca (avatar, logo del loader) | `linear-gradient(135deg, #0ea5e9, #06b6d4)` |
| Fila seleccionada | `bg-indigo-50/60` |
| Fila resaltada | `bg-amber-50/50 hover:bg-amber-50` |
| Hover de fila | `hover:bg-slate-50/80`; zebra `bg-slate-50/40` en filas impares |
| Cerrar sesión | `text-red-400 hover:bg-red-500/10` |

**Tags / badges de estado** (`Tag` con `severity`, siempre `rounded-full px-2.5 py-0.5 text-xs font-semibold`):

| severity | Clases | Uso típico en RH |
|---|---|---|
| `success` | `bg-emerald-100 text-emerald-700` | Activo, Aprobado, Pagado |
| `info` | `bg-sky-100 text-sky-700` | En proceso, Programado |
| `warning` | `bg-amber-100 text-amber-700` | Pendiente, Por vencer |
| `danger` | `bg-rose-100 text-rose-700` | Baja, Rechazado, Ausencia injustificada |
| `secondary` | `bg-slate-100 text-slate-600` | Neutro / sin dato |
| `primary` | `bg-indigo-100 text-indigo-700` | Destacado |

**Acentos de KPI** (barra superior de 4px con gradiente): `slate`, `rose`, `emerald`, `amber`, `cyan`, `violet` → `from-{c}-500 to-{c}-600`.

**Paleta para gráficas (ECharts)**: verde `#10b981`, amarillo `#facc15`, naranja `#fb923c`, rosa `#f43f5e`, vino `#9f1239`, azul `#38bdf8`, violeta `#8b5cf6`. Escalas de gravedad van de verde → amarillo → naranja → rosa → vino.

---

## 3. Tipografía y espaciado

- Título de página: `text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight`.
- Descripción de página: `mt-1 text-sm text-slate-500`.
- Título de panel: `text-base font-semibold text-slate-900`; subtítulo `mt-0.5 text-xs text-slate-500`.
- Encabezado de columna: `text-xs font-semibold uppercase tracking-wide text-slate-500`.
- Etiquetas pequeñas tipo "eyebrow": `text-[10px]`/`text-[11px] font-semibold uppercase tracking-widest`.
- Valor de KPI: `text-2xl font-semibold tracking-tight text-slate-900`.
- Contenedor de página: `space-y-5` entre bloques; grids con `gap-4`/`gap-5`.
- Cards / paneles: `rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`.
- Inputs y botones: alto `h-10`; inputs de toolbar `rounded-xl py-2.5`.
- Modales: `rounded-2xl border-slate-200 p-6 shadow-xl`, overlay `bg-slate-900/50 backdrop-blur-[2px]`.

---

## 4. Layout (AppShell)

Reemplazar `src/components/layout/AppShell.tsx` de RH siguiendo **`C:\Fuentes\IntranetRototec\src\layouts\AppShell\`** (`AppShell.tsx`, `Sidebar.tsx`, `TopBar.tsx`).

Estructura:

```
┌──────────────┬───────────────────────────────────────────────┐
│ Sidebar      │ TopBar  h-14 bg-white border-b border-slate-100│
│ bg-slate-900 │  breadcrumb (RH › Página)        avatar+nombre │
│ 264px / 72px ├───────────────────────────────────────────────┤
│ (colapsable, │ <main class="flex-1 overflow-y-auto p-6">      │
│  framer)     │    <Outlet/>                                   │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
contenedor: flex h-screen overflow-hidden bg-slate-50
```

**Sidebar** (`motion.aside`, ancho animado 264 ↔ 72 px, estado persistido con zustand `persist` en `localStorage` clave `rototec-ui`):
- Header: logo `/logo_rototec.png` (RH ya lo tiene en `public/`) con `filter: brightness(0) invert(1); opacity: .88`, altura 26px; a la derecha `RECURSOS HUMANOS` en `text-[11px] font-bold text-white tracking-widest` y debajo `v2.0 · Rototec` en `text-[10px] text-slate-500`. Botón colapsar `w-8 h-8 rounded-lg text-slate-600 hover:bg-white/8 hover:text-slate-300` con `solar:alt-arrow-left-bold`.
- Tarjeta de usuario: `mx-3 mb-3 p-3 rounded-xl bg-slate-800 border border-slate-700/50`, avatar con iniciales `w-8 h-8 rounded-lg` y fondo `linear-gradient(135deg,#0ea5e9,#06b6d4)`; nombre `text-sm font-semibold text-slate-100`, puesto `text-[11px] text-slate-500`.
- Secciones con rótulo `px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600`.
- Ítem de navegación: `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all`. Activo `bg-sky-500/15 text-sky-400`; inactivo `text-slate-400 hover:bg-white/5 hover:text-slate-200`. Icono Solar `width={18}`.
- Si se agrupan menús (p. ej. "Personal", "Tiempo", "Nómina", "Desarrollo"), usar el `DomainGroup` de la intranet: botón de grupo + submenú animado con `ml-4 pl-3 border-l border-slate-700/60`.
- Pie: botón "Cerrar sesión" `text-red-400 hover:bg-red-500/10` con `solar:logout-2-bold`, separado por `border-t border-slate-800`.

Mapeo sugerido de íconos Solar para el NAV actual de RH:

| Ruta | Icono |
|---|---|
| Empleados | `solar:users-group-rounded-bold` |
| Carga de turnos | `solar:upload-square-bold` |
| Asistencias | `solar:calendar-mark-bold` |
| Ausencias | `solar:calendar-minimalistic-bold` |
| Organización | `solar:structure-bold` |
| Planilla | `solar:wallet-money-bold` |
| Horas Extra | `solar:clock-circle-bold` |
| Capacitaciones | `solar:diploma-bold` |

**TopBar**: breadcrumb (`RH` como raíz en `font-semibold text-sky-500`, separador `solar:alt-arrow-right-bold` 10px `text-slate-300`, página actual `font-medium text-slate-800`) y a la derecha avatar + nombre (`text-sm font-semibold text-slate-800`) + puesto (`text-xs text-slate-400`). El título grande deja de estar en el header: va en cada página con `PageHeader`.

**Login**: replicar `C:\Fuentes\IntranetRototec\src\features\auth\pages\LoginPage.tsx`: panel izquierdo de 520px (solo `lg:`) con fondo `linear-gradient(160deg,#0c1628 0%,#0f172a 40%,#0c1e35 100%)`, cuadrícula sutil y halos radiales sky/cyan; panel derecho `bg-slate-50` con card `max-w-[420px] rounded-2xl border-slate-200 shadow-xl shadow-slate-200/60`; botón con gradiente `#0ea5e9 → #0284c7`. Conservar la lógica de auth actual de RH.

**Loader de arranque**: copiar `src/components/shared/RototecLoader.tsx` (anillos orbitales con framer-motion). Cambiar el ícono central a `solar:users-group-rounded-bold` y usarlo en `RequireAuth` mientras se valida la sesión.

---

## 5. Componentes compartidos a copiar

Copiar desde la intranet a RH (rutas sugeridas en RH). Son archivos chicos y autocontenidos; solo cambian imports.

| Origen (IntranetRototec) | Destino (RototecRH) | Qué es |
|---|---|---|
| `src/components/shared/PageHeader.tsx` | `src/components/shared/PageHeader.tsx` | Ícono en cuadro `h-10 w-10 rounded-2xl bg-slate-900` + título + descripción + acciones a la derecha |
| `src/components/shared/DataTable.tsx` | `src/components/shared/DataTable.tsx` | Primitivos de tabla: `DataTable`, `DataTableHead`, `DataTableHeadCell`, `DataTableBody`, `DataTableRow`, `DataTableCell`, `DataTableEmpty`, `DataTableSkeleton` |
| `src/components/shared/Pagination.tsx` | `src/components/shared/Pagination.tsx` | Paginador "Mostrar N por página · 1–20 de 340" + botones primera/anterior/siguiente/última, y hook `usePagination` |
| `src/components/shared/TableToolbar.tsx` | `src/components/shared/TableToolbar.tsx` | `TableToolbar`, `TableSearch`, `TableFilterSelect`, `TableResultCount`, `ActiveFilterChip` |
| `src/components/shared/Modal.tsx` | `src/components/shared/Modal.tsx` | Modal con tamaños `sm/md/lg/xl/full` y `persistente` |
| `src/components/shared/ConfirmDialog.tsx` | `src/components/shared/ConfirmDialog.tsx` | `await confirmar({ titulo, mensaje, peligro })` + `<ConfirmDialogHost/>` (montar una vez en `App.tsx`) |
| `src/components/shared/DetailHeader.tsx` | `src/components/shared/DetailHeader.tsx` | Encabezado oscuro para vistas de detalle (ideal para `EmpleadoDetailPage`) con `DetailAction` |
| `src/components/shared/RototecLoader.tsx` | `src/components/shared/RototecLoader.tsx` | Loader de pantalla completa |
| `src/shared/report/*` | `src/shared/report/*` | Kit de reportes (sección 6) |
| `src/shared/utils/notify.ts` | `src/lib/notify.ts` | `notify('success'|'info'|'warn'|'error', titulo, detalle?)` sobre sonner |
| `src/shared/utils/formatters.ts` | `src/lib/formatters.ts` | `fmt.num`, `fmt.int`, `fmt.pct`, `fmt.fecha`, `fmt.fechaCorta`, `fmt.hora`, `fmt.horario`, `fmt.duracion`, `fmt.timestamp` (zona `America/Guatemala`). Coexistir con `formatQ`/`formatDate` existentes de RH; no romperlos. |

Restylear también los shadcn de RH con los mismos valores que la intranet (`C:\Fuentes\IntranetRototec\src\components\ui\`):
- `button`: `transition-all duration-150`, `active:scale-[0.98]` en default/destructive, `shadow-sm`, `[&_svg]:size-4`.
- `dialog`: overlay `bg-slate-900/50 backdrop-blur-[2px]`; contenido `rounded-2xl border-slate-200 bg-white p-6 shadow-xl max-h-[calc(100vh-2rem)] overflow-y-auto`; título `text-lg font-bold text-slate-900`; descripción `text-sm text-slate-500`.
- `tabs`: lista `h-10 rounded-xl bg-slate-100 p-1 text-slate-500`; trigger `rounded-lg px-3 py-1.5` activo `bg-white text-slate-900 shadow-sm`.
- `checkbox`/`switch`: marcado en `sky-500`.
- `card`: `rounded-2xl border-slate-200 bg-white shadow-sm`.
- `table` (shadcn) de RH: o se reemplaza por `DataTable`, o se ajusta para que `TableHead` use `bg-slate-50/70 px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500` y `TableCell` `px-5 py-3.5`, filas `divide-y divide-slate-100 hover:bg-slate-50/80`.

Adaptaciones al copiar: `import { Icon } from '@iconify/react'`, alias `@/` igual; en React 18 `React.ComponentRef` funciona con `@types/react` 18.3 (si no, usar `React.ElementRef`).

---

## 6. Cómo se arma un reporte en la intranet

Referencia completa: `C:\Fuentes\IntranetRototec\src\features\comercial\cartera-vencida\` (página `CarteraVencidaPage.tsx`, cálculos en `hooks/useCarteraCalculos.ts`, gráficas en `components/carteraCharts.ts`, tabla en `components/CarteraClientesTabla.tsx`, Excel en `components/exportarCartera.ts`). Otras: `score-cartera`, `cobertura-perfecta`, `ventas-producto`.

### 6.1 Estructura de carpetas por pantalla

```
src/features/<area>/<pantalla>/
  pages/       XxxPage.tsx            ← solo composición y estado de filtros
  components/  XxxTabla.tsx, xxxCharts.ts (opciones ECharts), exportarXxx.ts
  hooks/       useXxxCalculos.ts      ← useMemo: filtros, KPIs, agregaciones
  services/    xxx.service.ts         ← llamadas HTTP + tipos de respuesta
```

En RH (que usa `pages/`, `hooks/`, `api/`, `lib/`) se puede mantener su estructura actual; lo importante es separar **página / cálculos / opciones de gráfica / export** en archivos distintos.

### 6.2 Kit `src/shared/report/`

| Archivo | Contenido |
|---|---|
| `useConsulta.ts` | Hook sobre React Query para reportes "con botón Aplicar": `const { data, loading, ejecutar } = useConsulta(clave, paramsIniciales, fn, { onError })`. Cada `ejecutar(params)` fuerza una consulta nueva, conserva los datos anteriores mientras carga (`keepPreviousData`) y no cachea entre montajes. |
| `ModalCargaPasos.tsx` | Modal no cerrable con barra de progreso (`from-cyan-500 to-teal-500`), cronómetro y lista de pasos con check verde / spinner cyan. Los pasos avanzan por tiempo estimado (`ms`); a los 15 s muestra aviso ámbar "está tardando más de lo normal". Al terminar marca todo en verde y cierra a los 700 ms. |
| `report-ui.tsx` | `KpiCard` (label uppercase, valor grande, hint, barra de acento, skeleton), `Panel` (card con título/subtítulo/acciones a la derecha), `Tag`, `Segmented` (botones tipo SelectButton, activo `bg-cyan-600 text-white`), `EChart` (wrapper con estado vacío "Sin datos para graficar"), `GuiaLectura` (caja `bg-cyan-50 border-cyan-200` "Cómo leer este reporte", ocultable y recordada en localStorage), `RangoFechas` (dos `input type=date` que nunca dejan un rango invertido), `Skeleton`. |
| `ReportTable.tsx` | Tabla genérica declarativa: `columns: { key, header, field?, sortable?, align?, body?, minWidth? }[]`, orden asc/desc por clic en encabezado (ícono `cyan-600` cuando está activo), paginación opcional con `pageSizeOptions`, filas expandibles (`expansion={row => <Detalle/>}`), `footer` de totales (`tfoot bg-slate-50 font-semibold`), `compact`, `maxHeight` (scroll interno), zebra, skeleton de carga y estado vacío. |
| `report-excel.ts` | `descargarExcel(nombreArchivo, hojas[])` (sección 7). |
| `report-utils.ts` | `toISO`, `fechaCorta` (parte el string `YYYY-MM-DD` para no correr un día por UTC-6), `num`, `money` (es-GT, 2 decimales), `moneyCompact` (`Q1.2K`, `Q3.45M`), `hoy`, `diasAtras`, `primerDiaDelMes`, `stamp()` (`yyyyMMdd-HHmm` para nombres de archivo), `usePreferenciaVisible`. |

### 6.3 Anatomía visual de una página de reporte (de arriba hacia abajo)

```tsx
<div className="space-y-5">
  <ModalCargaPasos cargando={loading} pasos={PASOS} titulo="Cargando planilla"
                   tituloListo="Planilla lista" icono="solar:wallet-money-bold" subtitulo="..." />

  {/* (opcional) Tabs de nivel superior, p. ej. empresa / catorcena */}
  <Tabs>…</Tabs>

  {/* 1. Card de encabezado + filtros */}
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <PageHeader titulo="…" icono="solar:…-bold" descripcion="Qué muestra · rango seleccionado">
      <RangoFechas … />
      <Segmented … />
      <Button className="bg-cyan-600 hover:bg-cyan-700">
        <Icon icon={loading ? 'svg-spinners:180-ring' : 'solar:magnifer-linear'} /> Aplicar
      </Button>
      <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={exportando || !filas.length}>
        <Icon icon={exportando ? 'svg-spinners:180-ring' : 'solar:file-download-linear'} /> Excel
      </Button>
    </PageHeader>
    {/* filtros locales (no consultan al backend), separados por línea punteada */}
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-4">
      <Input placeholder="Nombre, código o DPI" className="w-full sm:w-72" />
      <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-64">…</select>
      <Segmented … />
    </div>
  </div>

  {/* 2. Fila de KPIs */}
  <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <KpiCard label="Total líquido" value={q(kpis.liquido)} hint="124 empleados" accent="emerald" loading={loading} />
    …
  </section>

  {/* 3. Gráficas en Panels */}
  <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
    <Panel title="…" subtitle="…"><EChart option={opt} height={280} empty={!datos.length} /></Panel>
    <Panel title="…" className="xl:col-span-2">…</Panel>
  </section>

  {/* 4. Tabla de detalle en Panel, con contador a la derecha */}
  <Panel title="Detalle por empleado" subtitle="Expandí una fila para ver el desglose"
         right={<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{n} empleados</span>}>
    <ReportTable rows={…} columns={…} dataKey={r => String(r.id)} paginator pageSizeOptions={[15, 30, 50]}
                 expansion={r => <Desglose row={r} />} footer={<tr>…totales…</tr>} />
  </Panel>
</div>
```

Reglas de comportamiento:
- **Filtros de servidor** (fechas, empresa, periodo) se aplican solo con el botón **Aplicar** (`ejecutar(params)`); **filtros locales** (búsqueda, selects, segmented) recalculan en memoria con `useMemo` dentro de un hook `useXxxCalculos`.
- Errores de consulta: `notify('error', 'Error', 'No se pudo cargar …')`. Validaciones: `notify('warn', 'Rango incompleto', 'Seleccioná fecha inicial y final')`.
- Botón Excel deshabilitado si no hay filas; muestra spinner mientras exporta; `try/catch` con `notify('error', …)`.
- Montos: `Q${money(n)}`; ejes de gráfica con `moneyCompact`. Fechas del backend con `fechaCorta` (nunca `new Date()` sobre `YYYY-MM-DD`).
- Las opciones de ECharts se construyen en funciones puras (`opcionXxx(datos): EChartsOption`) en un archivo aparte y se memorizan en la página. Estilo base: `legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } }`, `grid: { left: 8, right: 24, top: 10, bottom: 30, containLabel: true }`, tooltips HTML con `<b>` y `money()`, donas `radius: ['52%','76%']` con `borderRadius: 6, borderColor: '#fff', borderWidth: 2`, barras horizontales con `borderRadius: [0,4,4,0]`.
- Cada elemento interactivo lleva `data-testid` con prefijo de pantalla: `const TID = 'rh-planilla'` → `${TID}__btn-aplicar`, `${TID}__kpi-liquido`, `${TID}__filtro-busqueda`.
- Listados simples (CRUD, sin KPIs ni gráficas) usan `PageHeader` + `TableToolbar` (`TableSearch`, `TableFilterSelect`, `TableResultCount`) + `DataTable` + `Pagination`, sin `ModalCargaPasos`.

---

## 7. Exportación a Excel

Estándar de la intranet: **ExcelJS cargado con `import()` dinámico** + `file-saver`. Nombre de archivo en minúsculas con guiones y timestamp: `planilla-catorcena-<n>-${stamp()}.xlsx`.

### 7.1 Export estándar (la mayoría de reportes)

`src/shared/report/report-excel.ts`:

```ts
import { saveAs } from 'file-saver';
import type { Worksheet } from 'exceljs';

export interface ColumnaExcel { header: string; key: string; width: number }
export interface HojaExcel {
    nombre: string;
    columnas: ColumnaExcel[];
    filas: Record<string, unknown>[];
    /** Ajustes extra después de agregar las filas (numFmt, filas de total, ...). */
    ajustar?: (ws: Worksheet) => void;
}

export function estilizarEncabezado(ws: Worksheet) {
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: 'FF0F172A' } };                       // slate-900
    head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // slate-200
    ws.views = [{ state: 'frozen', ySplit: 1 }];
}

export async function descargarExcel(nombreArchivo: string, hojas: HojaExcel[]) {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    for (const hoja of hojas) {
        const ws = wb.addWorksheet(hoja.nombre);
        ws.columns = hoja.columnas.map(c => ({ header: c.header, key: c.key, width: c.width }));
        hoja.filas.forEach(f => ws.addRow(f));
        hoja.ajustar?.(ws);
        estilizarEncabezado(ws);
    }
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), nombreArchivo);
}
```

Uso (un archivo `exportarXxx.ts` por pantalla, varias hojas si hay resumen + detalle):

```ts
await descargarExcel(`empleados-${estado.toLowerCase()}-${stamp()}.xlsx`, [{
    nombre: 'Empleados',
    columnas: [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Nombre completo', key: 'nombre', width: 40 },
        { header: 'Salario base', key: 'salario', width: 14 },
        …
    ],
    filas,
    ajustar: ws => { ws.getColumn('salario').numFmt = '"Q" #,##0.00'; },
}]);
```

Formatos numéricos usados: montos `'#,##0.00'` o `'"Q" #,##0.00'`, porcentaje `'0.00"%"'`, decimales `'0.00'`. Las fechas se exportan ya formateadas como texto `dd/mm/aaaa` con `fechaCorta`.

### 7.2 Export "bonito" (reportes formales)

Para reportes que se entregan tal cual (bonificación, y en RH: planilla, horas extra), la intranet usa encabezado oscuro y zebra (`C:\Fuentes\IntranetRototec\src\features\graficas\bonificacion\utils\exportBonificacion.ts`): encabezado `font bold blanco`, fondo de color, centrado; filas impares con relleno claro; fila 1 congelada; `numFmt` por columna; columnas cortas centradas.

RH ya tiene esto bien resuelto en `src/lib/exportHorasExtra.ts` (paleta slate-900/800, zebra slate-50, totales slate-100) y `src/lib/exportNomina.ts` (grupos de columnas coloreados como el machote). **Conservarlos**; solo:
- Cargar ExcelJS con `await import('exceljs')` en vez de import estático (menos peso inicial).
- Usar `stamp()` en el nombre del archivo si no rompe un formato que RH ya pida.

### 7.3 Lo que hay que migrar en RH

- `src/pages/empleados/EmpleadosListPage.tsx` usa `xlsx` (`json_to_sheet` + `writeFile`) sin estilos → migrar a `descargarExcel` con anchos de columna y `numFmt` para salario.
- Buscar cualquier otro `import * as XLSX from 'xlsx'` usado para **exportar** y migrarlo igual. Si `xlsx` se usa para **leer** archivos (carga de turnos, actualización masiva), dejarlo.

---

## 8. Impresión / PDF

La intranet no genera PDF con librería: arma un **HTML autocontenido con CSS inline**, lo abre en ventana/iframe y llama `window.print()` (el usuario guarda como PDF). Referencia: `C:\Fuentes\IntranetRototec\src\features\pvc\boletas\lib\imprimirBoleta.ts`.

Patrón del documento:
- `body{font-family:Arial,sans-serif;font-size:11pt;color:#1a1a1a;padding:20px 24px}`.
- Encabezado con borde inferior de 3px del color de acento, título `ROTOTEC — <Documento>` en 15pt/900 y "badge" de fecha a la derecha (`background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px`).
- Bloque destacado de identidad (empleado) en caja azul clara.
- Títulos de sección `8.5pt uppercase letter-spacing:.08em color:#64748b` con barrita de 4×14px del color de acento.
- Grilla de datos `grid-template-columns:repeat(3,1fr)` con celdas `background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px` (label 7.5pt gris uppercase, valor 10.5pt bold).
- Badges de estado: verde `#dcfce7/#166534`, amarillo `#fef9c3/#854d0e`, rojo `#fee2e2/#991b1b`.
- Pie con `border-top:1px solid #e2e8f0; font-size:8pt; color:#94a3b8` (generado por / fecha).
- `@media print{body{padding:8px 10px}@page{margin:1cm}}`; imprimir con `setTimeout(() => win.print(), 300)` tras `load`.
- Escapar siempre los valores interpolados (`escHtml`, ver `src/features/bodega/reimpresion/lib/print.tsx`).

Aplicarlo en RH a: constancias, boletas de pago por empleado, ficha del empleado. Los diplomas de capacitación (`docxtemplater`) se quedan como están.

---

## 9. Vistas de detalle

Para `EmpleadoDetailPage` y similares usar `DetailHeader`:
- Card oscura `rounded-2xl border-slate-800/80 shadow-2xl bg-gradient-to-br from-[#0c1628] via-[#0f172a] to-[#0c1e35]` con línea de acento superior de 2px (`#0ea5e9 → #38bdf8 → transparente`).
- Fila superior: botón "← Volver a empleados" (pill translúcida) y acciones `DetailAction` (`default` gris, `primary` verde esmeralda, `danger` rojo).
- Eyebrow (`text-[11px] font-bold uppercase tracking-[0.22em] text-sky-400/70`, p. ej. "Ficha de empleado"), título blanco `text-xl sm:text-2xl font-extrabold`, subtítulo `text-slate-400` (puesto · empresa · código).
- Footer opcional con chips (estado, turno actual, antigüedad).
- Debajo, el contenido en `Tabs` + `Panel`s blancos.

---

## 10. Plan de trabajo por fases

1. **Base visual**: dependencias (sección 1), tokens HSL + Inter + scrollbar (2.1), restyle de `button`, `card`, `dialog`, `tabs`, `checkbox`, `badge`, `table`, `input`, `select`. Toaster `richColors position="top-right" closeButton` + `ConfirmDialogHost` en `App.tsx`.
2. **Layout**: `AppShell` con `Sidebar` oscuro colapsable + `TopBar` con breadcrumb; store `ui` con zustand persist; `RototecLoader`; login.
3. **Componentes compartidos**: copiar los de la sección 5 y el kit `src/shared/report/`.
4. **Migrar pantallas** (sin tocar lógica de datos), en este orden: Empleados (lista + detalle con `DetailHeader`) → Asistencias → Ausencias → Horas Extra → Planilla → Carga de turnos → Organización → Capacitaciones. En cada una: `PageHeader` con ícono Solar, filtros en card, `DataTable`/`ReportTable`, `Tag` para estados, `notify` para mensajes, `confirmar()` en vez de `window.confirm` o diálogos ad hoc.
5. **Exportaciones**: migrar exports `xlsx` a `descargarExcel`; import dinámico de ExcelJS en los exports "bonitos" existentes.
6. **Verificación**: `npm run typecheck` y `npm run build` sin errores; recorrer cada pantalla en `npm run dev` comparando con la intranet (fondo slate-50, cards blancas `rounded-2xl`, encabezados de tabla uppercase gris, botones Aplicar cyan / Excel esmeralda, sidebar oscuro con activo sky).

---

## 11. Checklist rápido de "se ve como la intranet"

- [ ] Fondo de app `bg-slate-50`, sidebar `bg-slate-900`, topbar blanca `h-14`.
- [ ] Primario sky-500; foco `ring-sky-500`.
- [ ] Todas las cards: `rounded-2xl border-slate-200 bg-white shadow-sm`.
- [ ] Cada página arranca con `PageHeader` (ícono en cuadro slate-900 `rounded-2xl`).
- [ ] Tablas: encabezado `bg-slate-50/70` uppercase `text-xs text-slate-500`, celdas `px-5 py-3.5`, divisores slate-100, hover slate-50, estado vacío con ícono `solar:inbox-bold`, skeleton al cargar.
- [ ] Paginador "Mostrar N por página · X–Y de Z".
- [ ] Estados con `Tag` pill (emerald/sky/amber/rose/slate/indigo).
- [ ] Reportes: card de filtros → KPIs → gráficas en `Panel` → tabla en `Panel`; modal de carga por pasos.
- [ ] Botones: Aplicar `bg-cyan-600`, Excel `bg-emerald-600`, spinners `svg-spinners:180-ring`.
- [ ] Excel con ExcelJS: encabezado bold sobre slate-200 (o oscuro en reportes formales), fila 1 congelada, anchos y `numFmt` definidos, nombre `xxx-${stamp()}.xlsx`.
- [ ] Toasts sonner arriba a la derecha con colores; confirmaciones con `confirmar()`.
- [ ] Íconos Solar (`@iconify/react`).
