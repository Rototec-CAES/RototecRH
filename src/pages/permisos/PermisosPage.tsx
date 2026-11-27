import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/DataTable'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { FilterCard, Panel } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import type { PaginaPermisos, RolPermisos } from '@/api/permisos'
import {
  useAsignarRol,
  useCatalogoPermisos,
  useCrearRol,
  useGuardarPermisosDeRol,
  usePermisos,
  usePermisosDeRol,
  useQuitarRol,
  useRolesPermisos,
  useUsuariosPermisos,
} from '@/hooks/usePermisos'
import { notify } from '@/lib/notify'
import { cn } from '@/lib/utils'

const TID = 'rh-permisos'

/** Columnas de la matriz (en este orden). Una pantalla solo muestra las acciones que tiene. */
const COLUMNAS: { codigo: string; etiqueta: string }[] = [
  { codigo: 'leer', etiqueta: 'Ver' },
  { codigo: 'crear', etiqueta: 'Crear' },
  { codigo: 'editar', etiqueta: 'Editar' },
  { codigo: 'eliminar', etiqueta: 'Eliminar' },
  { codigo: 'aprobar', etiqueta: 'Aprobar' },
  { codigo: 'exportar', etiqueta: 'Exportar' },
  { codigo: 'ver_salarios', etiqueta: 'Sueldos' },
]

export default function PermisosPage() {
  const { puede } = usePermisos()
  const editable = puede('rrhh.permisos', 'editar')
  const { data: roles, isLoading } = useRolesPermisos()
  const [rolId, setRolId] = useState<number | undefined>()
  const [buscar, setBuscar] = useState('')
  const [nuevoRol, setNuevoRol] = useState(false)

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (roles ?? []).filter((r) => !q || r.nombre.toLowerCase().includes(q) || r.codigo.includes(q))
  }, [roles, buscar])

  // Por defecto: el primer rol que no es superadmin.
  useEffect(() => {
    if (rolId == null && roles?.length) setRolId((roles.find((r) => !r.esSuperadmin) ?? roles[0]).id)
  }, [roles, rolId])

  const rol = roles?.find((r) => r.id === rolId)

  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          titulo="Permisos"
          icono="solar:shield-user-bold"
          descripcion="Elige un rol y marca qué puede ver y hacer en cada pantalla. Los roles son los mismos de la Intranet; a cada usuario se le asignan uno o varios."
        >
          {editable && (
            <Button onClick={() => setNuevoRol(true)} data-testid={`${TID}__btn-nuevo-rol`}>
              <Icon icon="solar:add-circle-bold" width={16} />
              Nuevo rol
            </Button>
          )}
        </PageHeader>
      </FilterCard>

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {/* Roles */}
        <Panel title="Roles" subtitle="Usuarios y permisos de cada uno en esta app." flush>
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Icon icon="solar:magnifer-linear" width={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                placeholder="Buscar rol"
                className="h-9 pl-8"
                data-testid={`${TID}__buscar-rol`}
              />
            </div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-2">
            {isLoading ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : !filtrados.length ? (
              <p className="p-4 text-center text-sm text-slate-400">Sin roles</p>
            ) : (
              filtrados.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRolId(r.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                    r.id === rolId ? 'bg-sky-50 ring-1 ring-sky-200' : 'hover:bg-slate-50',
                  )}
                  data-testid={`${TID}__rol-${r.id}`}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      r.esSuperadmin ? 'bg-amber-50 text-amber-600' : r.permisos ? 'bg-sky-50 text-sky-600' : 'bg-slate-100 text-slate-400',
                    )}
                  >
                    <Icon icon={r.esSuperadmin ? 'solar:crown-bold' : 'solar:shield-user-bold'} width={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{r.nombre}</span>
                    <span className="block text-[11px] text-slate-400 tabular-nums">
                      {r.esSuperadmin ? 'Acceso total' : `${r.permisos} permisos`} · {r.usuarios} {r.usuarios === 1 ? 'usuario' : 'usuarios'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </Panel>

        {/* Detalle del rol */}
        {rol ? (
          <DetalleRol key={rol.id} rol={rol} editable={editable} />
        ) : (
          <Panel>
            <EmptyState icon="solar:shield-user-bold" title="Elige un rol" description="Selecciona un rol a la izquierda." />
          </Panel>
        )}
      </div>

      <NuevoRolDialog open={nuevoRol} onOpenChange={setNuevoRol} onCreado={setRolId} />
    </div>
  )
}

// ───────────────────────── Detalle ─────────────────────────

function DetalleRol({ rol, editable }: { rol: RolPermisos; editable: boolean }) {
  return (
    <Panel
      title={rol.nombre}
      subtitle={rol.descripcion ?? `Código: ${rol.codigo}`}
      icon={rol.esSuperadmin ? 'solar:crown-bold' : 'solar:shield-user-bold'}
    >
      <Tabs defaultValue="permisos">
        <TabsList>
          <TabsTrigger value="permisos" data-testid={`${TID}__tab-permisos`}>
            Permisos
          </TabsTrigger>
          <TabsTrigger value="usuarios" data-testid={`${TID}__tab-usuarios`}>
            Usuarios ({rol.usuarios})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="permisos" className="mt-4">
          {rol.esSuperadmin ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
              <Icon icon="solar:crown-bold" width={18} className="mt-0.5 shrink-0" />
              Este rol es superadmin: tiene todos los permisos de la app y no se pueden quitar desde aquí.
            </div>
          ) : (
            <MatrizPermisos rolId={rol.id} editable={editable} />
          )}
        </TabsContent>
        <TabsContent value="usuarios" className="mt-4">
          <UsuariosDeRol rol={rol} editable={editable} />
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function MatrizPermisos({ rolId, editable }: { rolId: number; editable: boolean }) {
  const { data: catalogo, isLoading: cargandoCat } = useCatalogoPermisos()
  const { data: actuales, isLoading: cargandoRol } = usePermisosDeRol(rolId)
  const guardar = useGuardarPermisosDeRol()
  const [sel, setSel] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (actuales) setSel(new Set(actuales))
  }, [actuales])

  const sucio = useMemo(() => {
    const a = new Set(actuales ?? [])
    return a.size !== sel.size || [...sel].some((id) => !a.has(id))
  }, [actuales, sel])

  /** Marcar cualquier acción incluye "Ver"; quitar "Ver" quita el resto de la fila. */
  function toggle(pagina: PaginaPermisos, accionId: number) {
    const leer = pagina.acciones.find((a) => a.codigo === 'leer')
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(accionId)) {
        next.delete(accionId)
        if (leer && accionId === leer.id) for (const a of pagina.acciones) next.delete(a.id)
      } else {
        next.add(accionId)
        if (leer) next.add(leer.id)
      }
      return next
    })
  }

  function toggleFila(pagina: PaginaPermisos) {
    const todas = pagina.acciones.every((a) => sel.has(a.id))
    setSel((prev) => {
      const next = new Set(prev)
      for (const a of pagina.acciones) (todas ? next.delete(a.id) : next.add(a.id))
      return next
    })
  }

  async function onGuardar() {
    try {
      await guardar.mutateAsync({ rolId, accionIds: [...sel] })
      notify('success', 'Permisos guardados', 'Los usuarios con este rol los verán en menos de un minuto.')
    } catch (err) {
      notify('error', 'No se pudieron guardar', extractApiErrorMessage(err))
    }
  }

  if (cargandoCat || cargandoRol) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">Pantalla</th>
              {COLUMNAS.map((c) => (
                <th key={c.codigo} className="px-2 py-2.5 text-center font-semibold">
                  {c.etiqueta}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center font-semibold">Todo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(catalogo ?? []).map((pag) => {
              const todas = pag.acciones.every((a) => sel.has(a.id))
              const alguna = pag.acciones.some((a) => sel.has(a.id))
              return (
                <tr key={pag.id} className={cn('transition-colors', alguna ? 'bg-white' : 'bg-slate-50/40')}>
                  <td className="px-3 py-2">
                    <span className={cn('font-medium', alguna ? 'text-slate-800' : 'text-slate-500')}>{pag.nombre}</span>
                  </td>
                  {COLUMNAS.map((c) => {
                    const accion = pag.acciones.find((a) => a.codigo === c.codigo)
                    return (
                      <td key={c.codigo} className="px-2 py-2 text-center">
                        {accion ? (
                          <span className="inline-flex" title={accion.nombre}>
                            <Checkbox
                              checked={sel.has(accion.id)}
                              onCheckedChange={() => toggle(pag, accion.id)}
                              disabled={!editable}
                              aria-label={`${pag.nombre}: ${accion.nombre}`}
                              data-testid={`${TID}__chk-${pag.codigo}-${accion.codigo}`}
                            />
                          </span>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleFila(pag)}
                      disabled={!editable}
                      className={cn(
                        'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors disabled:opacity-40',
                        todas ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
                      )}
                    >
                      {todas ? 'Quitar' : 'Todo'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-slate-500">
        <Icon icon="solar:info-circle-linear" width={14} className="mt-0.5 shrink-0" />
        "Sueldos" permite ver y cambiar salario y bonificación en Empleados y en la actualización masiva. La planilla muestra montos a
        quien tenga "Ver" en Planilla.
      </p>

      {editable && (
        <div className="flex items-center justify-end gap-2">
          {sucio && <span className="text-xs font-medium text-amber-600">Hay cambios sin guardar</span>}
          <Button variant="outline" disabled={!sucio || guardar.isPending} onClick={() => setSel(new Set(actuales ?? []))}>
            Descartar
          </Button>
          <Button disabled={!sucio || guardar.isPending} onClick={onGuardar} data-testid={`${TID}__btn-guardar`}>
            {guardar.isPending ? <Icon icon="svg-spinners:180-ring" width={16} /> : <Icon icon="solar:diskette-bold" width={16} />}
            Guardar permisos
          </Button>
        </div>
      )}
    </div>
  )
}

function UsuariosDeRol({ rol, editable }: { rol: RolPermisos; editable: boolean }) {
  const { data: miembros, isLoading } = useUsuariosPermisos({ rolId: rol.id })
  const [buscar, setBuscar] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(buscar.trim()), 300)
    return () => clearTimeout(t)
  }, [buscar])
  const { data: resultados, isFetching } = useUsuariosPermisos({ buscar: debounced }, editable && debounced.length >= 2)
  const asignar = useAsignarRol()
  const quitar = useQuitarRol()

  const idsMiembros = new Set((miembros ?? []).map((m) => m.id))

  async function onAsignar(usuarioId: number) {
    try {
      await asignar.mutateAsync({ usuarioId, rolId: rol.id })
      notify('success', 'Rol asignado')
    } catch (err) {
      notify('error', 'No se pudo asignar', extractApiErrorMessage(err))
    }
  }

  async function onQuitar(usuarioId: number, nombre: string) {
    const ok = await confirmar({
      titulo: `¿Quitar el rol a ${nombre}?`,
      mensaje: `Perderá los permisos de "${rol.nombre}" (también en la Intranet).`,
      textoConfirmar: 'Quitar',
      peligro: true,
    })
    if (!ok) return
    try {
      await quitar.mutateAsync({ usuarioId, rolId: rol.id })
      notify('success', 'Rol quitado')
    } catch (err) {
      notify('error', 'No se pudo quitar', extractApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div>
          <Label className="mb-1.5 block text-xs text-slate-500">Agregar usuario a este rol</Label>
          <div className="relative">
            <Icon icon="solar:magnifer-linear" width={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Usuario o nombre (mínimo 2 letras)"
              className="pl-8"
              data-testid={`${TID}__buscar-usuario`}
            />
            {isFetching && (
              <Icon icon="svg-spinners:180-ring" width={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
          </div>
          {debounced.length >= 2 && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
              {!resultados?.length ? (
                <p className="p-3 text-center text-xs text-slate-400">{isFetching ? 'Buscando…' : 'Sin resultados'}</p>
              ) : (
                resultados.map((u) => (
                  <FilaUsuario key={u.id} usuario={u}>
                    {idsMiembros.has(u.id) ? (
                      <span className="text-xs font-medium text-emerald-600">Ya lo tiene</span>
                    ) : (
                      <Button size="sm" variant="outline" disabled={asignar.isPending} onClick={() => onAsignar(u.id)}>
                        <Icon icon="solar:add-circle-linear" width={14} />
                        Agregar
                      </Button>
                    )}
                  </FilaUsuario>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : !miembros?.length ? (
          <EmptyState icon="solar:users-group-rounded-bold" title="Sin usuarios" description="Nadie tiene este rol todavía." />
        ) : (
          miembros.map((u) => (
            <FilaUsuario key={u.id} usuario={u} mostrarRoles>
              {editable && (
                <button
                  type="button"
                  onClick={() => onQuitar(u.id, u.nombre || u.username)}
                  title="Quitar el rol"
                  aria-label={`Quitar el rol a ${u.username}`}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <Icon icon="solar:user-minus-rounded-bold" width={16} />
                </button>
              )}
            </FilaUsuario>
          ))
        )}
      </div>
      <p className="text-xs text-slate-400">
        Solo se listan usuarios con el rol asignado directamente. Los roles del usuario también se ven y cambian en la Intranet (IT › Usuarios).
      </p>
    </div>
  )
}

function FilaUsuario({
  usuario,
  mostrarRoles,
  children,
}: {
  usuario: { id: number; username: string; nombre: string | null; puesto: string | null; roles: { id: number; nombre: string }[] }
  mostrarRoles?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
        {(usuario.nombre || usuario.username).slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-800">
          {usuario.nombre || usuario.username}
          <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400">{usuario.username}</span>
        </div>
        <div className="truncate text-[11px] text-slate-400">
          {usuario.puesto ?? 'Sin puesto'}
          {mostrarRoles && usuario.roles.length > 1 && ` · también: ${usuario.roles.length - 1} rol(es) más`}
        </div>
      </div>
      {children}
    </div>
  )
}

function NuevoRolDialog({
  open,
  onOpenChange,
  onCreado,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreado: (id: number) => void
}) {
  const crear = useCrearRol()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    if (open) {
      setNombre('')
      setDescripcion('')
    }
  }, [open])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { id } = await crear.mutateAsync({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined })
      notify('success', 'Rol creado', 'Ahora márcale sus permisos.')
      onCreado(id)
      onOpenChange(false)
    } catch (err) {
      notify('error', 'No se pudo crear', extractApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
            <DialogDescription>
              Por ejemplo "Asistente de RH" o "Consulta de planilla". También aparecerá en la Intranet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rol-nombre">Nombre</Label>
            <Input id="rol-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rol-desc">Descripción (opcional)</Label>
            <Input id="rol-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={nombre.trim().length < 2 || crear.isPending} data-testid={`${TID}__btn-crear-rol`}>
              Crear rol
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
