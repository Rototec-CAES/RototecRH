import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Icon } from '@iconify/react'

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
import { NameCombobox } from '@/components/ui/name-combobox'
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeadCell,
  DataTableRow,
  DataTableSkeleton,
} from '@/components/shared/DataTable'
import { TableResultCount, TableSearch, TableToolbar } from '@/components/shared/TableToolbar'
import { confirmar } from '@/components/shared/ConfirmDialog'
import {
  useCreatePensum,
  useDeletePensum,
  usePensums,
  useUpdatePensum,
} from '@/hooks/useCapacitaciones'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'
import { notify } from '@/lib/notify'
import { pensumSchema, type PensumFormValues } from '@/lib/validators'
import type { Pensum, PensumInput } from '@/types'
import { PensumEditor } from './PensumEditor'

const TID = 'rh-capacitaciones'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function PensumsTab() {
  const { data, isLoading, isError, isFetching, refetch } = usePensums()
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Pensum | undefined>(undefined)
  const [editorId, setEditorId] = useState<number | undefined>(undefined)
  const deleteMut = useDeletePensum()

  const pensums = data ?? []

  const filtered = useMemo(() => {
    const q = norm(search.trim())
    if (!q) return pensums
    return pensums.filter((p) => norm(p.nombre).includes(q))
  }, [pensums, search])

  function openCreate() {
    setEditing(undefined)
    setFormOpen(true)
  }
  function openEdit(p: Pensum) {
    setEditing(p)
    setFormOpen(true)
  }
  async function onDelete(p: Pensum) {
    const ok = await confirmar({
      titulo: `¿Eliminar el pensum "${p.nombre}"?`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(p.id)
      notify('success', 'Pensum eliminado')
    } catch (err) {
      notify('error', 'No se pudo eliminar', err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <TableToolbar className="justify-between">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Buscar pensum por nombre"
          className="w-full sm:w-72"
          testId={`${TID}__filtro-busqueda-pensum`}
        />
        <div className="flex items-center gap-2">
          <TableResultCount total={pensums.length} filtered={filtered.length} label="pensum" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            aria-label="Actualizar"
            title="Actualizar"
            disabled={isFetching}
          >
            <Icon icon={isFetching ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={16} />
          </Button>
          <Button onClick={openCreate} data-testid={`${TID}__btn-nuevo-pensum`}>
            <Icon icon="solar:add-circle-bold" width={16} />
            Nuevo pensum
          </Button>
        </div>
      </TableToolbar>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon icon="solar:info-circle-linear" width={14} />
        Haz clic en un pensum para editar sus módulos y evaluaciones.
      </p>

      <DataTable>
        <DataTableHead>
          <DataTableHeadCell>Nombre</DataTableHeadCell>
          <DataTableHeadCell>Puesto</DataTableHeadCell>
          <DataTableHeadCell className="w-48 text-right">Acciones</DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={4} cols={3} />
          ) : isError ? (
            <DataTableEmpty
              icon="solar:danger-triangle-bold"
              title="No se pudieron cargar los pensums"
              description="Revisa la conexión y presiona el botón Actualizar."
              colSpan={3}
            />
          ) : filtered.length === 0 ? (
            <DataTableEmpty
              icon="solar:book-bookmark-bold"
              title={search ? 'Ningún pensum coincide con la búsqueda' : 'Aún no hay pensums'}
              description={search ? 'Prueba con otro nombre.' : 'Crea el primero con el botón Nuevo pensum.'}
              colSpan={3}
            />
          ) : (
            filtered.map((p) => (
              <DataTableRow key={p.id} onClick={() => setEditorId(p.id)}>
                <DataTableCell className="font-medium text-slate-900">
                  <span className="flex items-center gap-2">
                    <Icon icon="solar:book-bookmark-bold" width={16} className="shrink-0 text-sky-500" />
                    {p.nombre}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-slate-600">
                  {p.puesto ?? <span className="text-xs text-slate-400">—</span>}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Cambiar nombre o puesto">
                      <Icon icon="solar:pen-bold" width={15} />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(p)}
                      disabled={deleteMut.isPending}
                      title="Eliminar pensum"
                      aria-label="Eliminar pensum"
                      className="hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" width={15} />
                    </Button>
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>

      <PensumFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? 'edit' : 'create'}
        pensum={editing}
      />

      <PensumEditor
        idPensum={editorId}
        open={editorId !== undefined}
        onOpenChange={(o) => {
          if (!o) setEditorId(undefined)
        }}
      />
    </div>
  )
}

const defaultValues = { nombre: '', puesto: '' } as PensumFormValues

function PensumFormDialog({
  open,
  onOpenChange,
  mode,
  pensum,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  pensum?: Pensum
}) {
  const createMut = useCreatePensum()
  const updateMut = useUpdatePensum(pensum?.id ?? 0)
  const isSubmitting = createMut.isPending || updateMut.isPending
  const { options: puestoOptions, isLoading: puestosLoading } = usePuestoOptions()

  const [idPuesto, setIdPuesto] = useState<number | null>(null)

  const form = useForm<PensumFormValues>({
    resolver: zodResolver(pensumSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && pensum) {
      form.reset({ nombre: pensum.nombre, puesto: pensum.puesto ?? '', idPuesto: pensum.idPuesto ?? (undefined as unknown as number) })
      setIdPuesto(pensum.idPuesto ?? null)
    } else {
      form.reset(defaultValues)
      setIdPuesto(null)
    }
  }, [open, mode, pensum, form])

  async function onSubmit(values: PensumFormValues) {
    const selectedPuesto = puestoOptions.find((o) => o.id === idPuesto)
    const input: PensumInput = {
      nombre: values.nombre,
      idPuesto: idPuesto ?? undefined,
      puesto: (selectedPuesto?.nombre ?? values.puesto) || undefined,
    }
    try {
      if (mode === 'create') {
        await createMut.mutateAsync(input)
        notify('success', 'Pensum creado')
      } else if (pensum) {
        await updateMut.mutateAsync(input)
        notify('success', 'Pensum actualizado')
      }
      onOpenChange(false)
    } catch (err) {
      notify('error', 'No se pudo guardar', err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const errors = form.formState.errors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo pensum' : 'Editar pensum'}</DialogTitle>
          <DialogDescription>
            Ponle un nombre y elige el puesto al que corresponde.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Nombre <span className="text-rose-500">*</span>
            </Label>
            <Input placeholder="Ej: Inducción operario" {...form.register('nombre')} />
            {errors.nombre && (
              <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Puesto <span className="text-rose-500">*</span>
            </Label>
            <NameCombobox
              options={puestoOptions}
              value={idPuesto}
              onChange={(val) => {
                setIdPuesto(val)
                form.setValue('idPuesto', val as number, { shouldValidate: true })
              }}
              placeholder={puestosLoading ? 'Cargando puestos…' : 'Selecciona un puesto'}
              searchPlaceholder="Buscar puesto…"
              disabled={puestosLoading}
            />
            {errors.idPuesto && (
              <p className="mt-1 text-xs text-red-600">{errors.idPuesto.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid={`${TID}__btn-guardar-pensum`}>
              <Icon icon={isSubmitting ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
              {isSubmitting ? 'Guardando…' : mode === 'create' ? 'Crear pensum' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
