import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'
import { toast } from '@/components/ui/sonner'

import { Button } from '@/components/ui/button'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/shared/DataTable'
import { confirmar } from '@/components/shared/ConfirmDialog'
import { Tag } from '@/shared/report/report-ui'
import {
  useCreateModulo,
  useCreateTema,
  useDeleteModulo,
  useDeleteTema,
  usePensumArbol,
  useUpdateModulo,
} from '@/hooks/useCapacitaciones'
import {
  moduloSchema,
  temaSchema,
  type ModuloFormValues,
  type TemaFormValues,
} from '@/lib/validators'
import type { ModuloInput, PensumModuloArbol, TemaInput } from '@/types'
import { ModuloEvaluacionDialog } from './ModuloEvaluacionDialog'

interface Props {
  idPensum: number | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PensumEditor({ idPensum, open, onOpenChange }: Props) {
  const { data, isLoading, isError } = usePensumArbol(open ? idPensum : undefined)
  const [moduloDialog, setModuloDialog] = useState<{ mode: 'create' | 'edit'; modulo?: PensumModuloArbol } | null>(null)
  const [temaModuloId, setTemaModuloId] = useState<number | null>(null)
  const [evalModuloId, setEvalModuloId] = useState<number | null>(null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-900 text-white">
              <Icon icon="solar:book-bookmark-bold" width={16} />
            </span>
            {data?.nombre ?? 'Pensum'}
          </SheetTitle>
          <SheetDescription>
            {data?.puesto ? `Puesto: ${data.puesto}` : 'Edita módulos, temas y evaluaciones'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Módulos{data ? ` (${data.modulos.length})` : ''}
            </p>
            <Button
              size="sm"
              onClick={() => setModuloDialog({ mode: 'create' })}
              disabled={!idPensum}
              data-testid="rh-capacitaciones__btn-agregar-modulo"
            >
              <Icon icon="solar:add-circle-bold" width={15} />
              Agregar módulo
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : isError ? (
            <EmptyState icon="solar:danger-triangle-bold" title="No se pudo cargar el pensum" description="Cierra y vuelve a abrir." />
          ) : !data || data.modulos.length === 0 ? (
            <EmptyState
              icon="solar:layers-minimalistic-bold"
              title="Este pensum no tiene módulos todavía"
              description="Crea el primero con el botón Agregar módulo."
            />
          ) : (
            data.modulos.map((m) => (
              <ModuloCard
                key={m.id}
                idPensum={idPensum as number}
                modulo={m}
                onEdit={() => setModuloDialog({ mode: 'edit', modulo: m })}
                onAddTema={() => setTemaModuloId(m.id)}
                onEvaluacion={() => setEvalModuloId(m.id)}
              />
            ))
          )}
        </div>

        {idPensum !== undefined && moduloDialog && (
          <ModuloFormDialog
            idPensum={idPensum}
            open
            onOpenChange={(o) => !o && setModuloDialog(null)}
            mode={moduloDialog.mode}
            modulo={moduloDialog.modulo}
          />
        )}
        {idPensum !== undefined && temaModuloId !== null && (
          <TemaFormDialog
            idPensum={idPensum}
            idModulo={temaModuloId}
            open
            onOpenChange={(o) => !o && setTemaModuloId(null)}
          />
        )}
        <ModuloEvaluacionDialog
          idModulo={evalModuloId ?? undefined}
          open={evalModuloId !== null}
          onOpenChange={(o) => !o && setEvalModuloId(null)}
        />
      </SheetContent>
    </Sheet>
  )
}

function ModuloCard({
  idPensum,
  modulo,
  onEdit,
  onAddTema,
  onEvaluacion,
}: {
  idPensum: number
  modulo: PensumModuloArbol
  onEdit: () => void
  onAddTema: () => void
  onEvaluacion: () => void
}) {
  const deleteMod = useDeleteModulo(idPensum)
  const deleteTema = useDeleteTema(idPensum)

  async function onDeleteModulo() {
    const ok = await confirmar({
      titulo: `¿Eliminar el módulo "${modulo.modulo}"?`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await deleteMod.mutateAsync(modulo.id)
      toast.success('Módulo eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }
  async function onDeleteTema(id: number) {
    try {
      await deleteTema.mutateAsync(id)
      toast.success('Tema eliminado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 ring-1 ring-sky-100">
            <Icon icon="solar:layers-minimalistic-bold" width={15} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{modulo.modulo}</h3>
            {modulo.objetivo && (
              <p className="mt-0.5 text-sm text-slate-500">{modulo.objetivo}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modulo.duracionHoras != null && (
                <Tag severity="secondary" icon="solar:clock-circle-linear" value={`${modulo.duracionHoras} h`} />
              )}
              {modulo.tipoEvaluacion && <Tag severity="info" value={modulo.tipoEvaluacion} />}
              {modulo.porcentajeAprobacion != null && (
                <Tag severity="secondary" value={`Aprueba con ${modulo.porcentajeAprobacion}%`} />
              )}
              {modulo.bono && <Tag severity="success" icon="solar:star-bold" value="Bono" />}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} title="Editar módulo" aria-label="Editar módulo">
            <Icon icon="solar:pen-bold" width={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeleteModulo}
            disabled={deleteMod.isPending}
            title="Eliminar módulo"
            aria-label="Eliminar módulo"
            className="hover:bg-rose-50 hover:text-rose-600"
          >
            <Icon icon="solar:trash-bin-trash-bold" width={15} />
          </Button>
        </div>
      </div>
      <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Temas</span>
            <Button variant="ghost" size="sm" onClick={onAddTema} className="text-sky-600 hover:text-sky-700">
              <Icon icon="solar:add-circle-linear" width={15} />
              Tema
            </Button>
          </div>
          {modulo.temas.length === 0 ? (
            <p className="text-xs text-slate-400">Sin temas. Agrega uno con el botón + Tema.</p>
          ) : (
            <ul className="space-y-1">
              {modulo.temas.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-1.5 text-sm"
                >
                  <span className="text-slate-700">
                    {t.tema}
                    {t.modalidad && (
                      <span className="ml-2 text-xs text-slate-400">({t.modalidad})</span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTema(t.id)}
                    disabled={deleteTema.isPending}
                    title="Eliminar tema"
                    aria-label="Eliminar tema"
                    className="h-7 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Icon icon="solar:trash-bin-trash-linear" width={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onEvaluacion}>
          <Icon icon="solar:clipboard-list-bold" width={15} />
          Evaluación
        </Button>
      </div>
    </div>
  )
}

const moduloDefaults: ModuloFormValues = {
  modulo: '',
  objetivo: '',
  tipoEvaluacion: '',
  instrumentos: '',
}

function ModuloFormDialog({
  idPensum,
  open,
  onOpenChange,
  mode,
  modulo,
}: {
  idPensum: number
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  modulo?: PensumModuloArbol
}) {
  const createMut = useCreateModulo(idPensum)
  const updateMut = useUpdateModulo(idPensum)
  const isSubmitting = createMut.isPending || updateMut.isPending

  const form = useForm<ModuloFormValues>({
    resolver: zodResolver(moduloSchema),
    defaultValues: moduloDefaults,
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && modulo) {
      form.reset({
        modulo: modulo.modulo,
        objetivo: modulo.objetivo ?? '',
        duracionHoras: modulo.duracionHoras ?? undefined,
        capacitador: modulo.capacitador ?? undefined,
        tipoEvaluacion: modulo.tipoEvaluacion ?? '',
        instrumentos: modulo.instrumentos ?? '',
        porcentajeAprobacion: modulo.porcentajeAprobacion ?? undefined,
        vigencia: modulo.vigencia ?? undefined,
        bono: modulo.bono ?? false,
      })
    } else {
      form.reset(moduloDefaults)
    }
  }, [open, mode, modulo, form])

  async function onSubmit(values: ModuloFormValues) {
    const input: ModuloInput = {
      modulo: values.modulo,
      objetivo: values.objetivo || undefined,
      duracionHoras: values.duracionHoras,
      capacitador: values.capacitador,
      tipoEvaluacion: values.tipoEvaluacion || undefined,
      instrumentos: values.instrumentos || undefined,
      porcentajeAprobacion: values.porcentajeAprobacion,
      vigencia: values.vigencia,
      bono: values.bono,
    }
    try {
      if (mode === 'create') {
        await createMut.mutateAsync(input)
        toast.success('Módulo creado')
      } else if (modulo) {
        await updateMut.mutateAsync({ id: modulo.id, input })
        toast.success('Módulo actualizado')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo módulo' : 'Editar módulo'}</DialogTitle>
          <DialogDescription>Datos del módulo del pensum.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Módulo <span className="text-rose-500">*</span></Label>
            <Input {...form.register('modulo')} />
            {errors.modulo && (
              <p className="mt-1 text-xs text-red-600">{errors.modulo.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Objetivo</Label>
            <Textarea rows={2} {...form.register('objetivo')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Duración (horas)</Label>
              <Input type="number" step="any" {...form.register('duracionHoras')} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">% Aprobación</Label>
              <Input type="number" {...form.register('porcentajeAprobacion')} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Vigencia (meses)</Label>
              <Input type="number" {...form.register('vigencia')} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Capacitador (id)</Label>
              <Input type="number" {...form.register('capacitador')} />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Tipo de evaluación</Label>
            <Input {...form.register('tipoEvaluacion')} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Instrumentos</Label>
            <Input {...form.register('instrumentos')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 accent-sky-500"
              {...form.register('bono')}
            />
            Otorga bono
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Icon icon={isSubmitting ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
              {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear módulo' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const temaDefaults: TemaFormValues = { tema: '', modalidad: '', recursos: '' }

function TemaFormDialog({
  idPensum,
  idModulo,
  open,
  onOpenChange,
}: {
  idPensum: number
  idModulo: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createMut = useCreateTema(idPensum)
  const form = useForm<TemaFormValues>({
    resolver: zodResolver(temaSchema),
    defaultValues: temaDefaults,
  })

  useEffect(() => {
    if (open) form.reset(temaDefaults)
  }, [open, form])

  async function onSubmit(values: TemaFormValues) {
    const input: TemaInput = {
      tema: values.tema,
      modalidad: values.modalidad || undefined,
      recursos: values.recursos || undefined,
    }
    try {
      await createMut.mutateAsync({ idModulo, input })
      toast.success('Tema agregado')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo tema</DialogTitle>
          <DialogDescription>Agrega un tema al módulo.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Tema <span className="text-rose-500">*</span></Label>
            <Input {...form.register('tema')} />
            {errors.tema && (
              <p className="mt-1 text-xs text-red-600">{errors.tema.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Modalidad</Label>
            <Input {...form.register('modalidad')} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Recursos</Label>
            <Input {...form.register('recursos')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              <Icon icon={createMut.isPending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
              {createMut.isPending ? 'Guardando…' : 'Agregar tema'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
