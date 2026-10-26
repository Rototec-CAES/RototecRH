import { useEffect, useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
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
import { useDeleteDocumento, useDocumentos, useUpdateDocumento } from '@/hooks/useCapacitaciones'
import { notify } from '@/lib/notify'
import { formatDate } from '@/lib/utils'
import type { DocumentoBiblioteca, DocumentoCap } from '@/types'
import { DocumentoVisorDialog, SubirDocumentoDialog, formatTamano, iconoDocumento } from './MaterialDocumentos'

const TID = 'rh-capacitaciones'

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Biblioteca de material: se sube una vez y se reutiliza en los módulos de cualquier pensum. */
export default function BibliotecaTab() {
  const { data, isLoading, isError, isFetching, refetch } = useDocumentos()
  const deleteMut = useDeleteDocumento()
  const [search, setSearch] = useState('')
  const [subirOpen, setSubirOpen] = useState(false)
  const [viendo, setViendo] = useState<DocumentoCap | null>(null)
  const [editando, setEditando] = useState<DocumentoBiblioteca | null>(null)

  const docs = data ?? []
  const filtered = useMemo(() => {
    const q = norm(search.trim())
    if (!q) return docs
    return docs.filter((d) => norm(d.nombre).includes(q) || norm(d.nombreArchivo).includes(q) || norm(d.descripcion ?? '').includes(q))
  }, [docs, search])

  async function onDelete(d: DocumentoBiblioteca) {
    const ok = await confirmar({
      titulo: `¿Eliminar "${d.nombre}" de la biblioteca?`,
      mensaje: d.modulos
        ? `Se quitará también de ${d.modulos} módulo(s) que lo usan.`
        : 'Ningún módulo lo usa.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    })
    if (!ok) return
    try {
      await deleteMut.mutateAsync(d.id)
      notify('success', 'Material eliminado')
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
          placeholder="Buscar material por nombre o archivo"
          className="w-full sm:w-72"
          testId={`${TID}__filtro-busqueda-material`}
        />
        <div className="flex items-center gap-2">
          <TableResultCount total={docs.length} filtered={filtered.length} label="archivo" />
          <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Actualizar" title="Actualizar" disabled={isFetching}>
            <Icon icon={isFetching ? 'svg-spinners:180-ring' : 'solar:refresh-bold'} width={16} />
          </Button>
          <Button onClick={() => setSubirOpen(true)} data-testid={`${TID}__btn-subir-material`}>
            <Icon icon="solar:upload-bold" width={16} />
            Subir material
          </Button>
        </div>
      </TableToolbar>

      <p className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon icon="solar:info-circle-linear" width={14} />
        Los archivos se suben una vez y se agregan a los módulos desde el detalle del pensum (sección Material).
      </p>

      <DataTable>
        <DataTableHead>
          <DataTableHeadCell>Nombre</DataTableHeadCell>
          <DataTableHeadCell>Archivo</DataTableHeadCell>
          <DataTableHeadCell className="w-28 text-center">Módulos</DataTableHeadCell>
          <DataTableHeadCell className="w-28">Subido</DataTableHeadCell>
          <DataTableHeadCell className="w-40 text-right">Acciones</DataTableHeadCell>
        </DataTableHead>
        <DataTableBody>
          {isLoading ? (
            <DataTableSkeleton rows={4} cols={5} />
          ) : isError ? (
            <DataTableEmpty
              icon="solar:danger-triangle-bold"
              title="No se pudo cargar la biblioteca"
              description="Revisa la conexión y presiona el botón Actualizar."
              colSpan={5}
            />
          ) : filtered.length === 0 ? (
            <DataTableEmpty
              icon="solar:folder-with-files-bold"
              title={search ? 'Ningún archivo coincide con la búsqueda' : 'La biblioteca está vacía'}
              description={search ? 'Prueba con otro nombre.' : 'Sube PDF, presentaciones u otros archivos con el botón Subir material.'}
              colSpan={5}
            />
          ) : (
            filtered.map((d) => {
              const ic = iconoDocumento(d)
              return (
                <DataTableRow key={d.id} onClick={() => setViendo(d)}>
                  <DataTableCell className="font-medium text-slate-900">
                    <span className="flex items-center gap-2">
                      <Icon icon={ic.icon} width={18} className={`shrink-0 ${ic.color}`} />
                      <span className="min-w-0">
                        <span className="block truncate">{d.nombre}</span>
                        {d.descripcion && <span className="block truncate text-xs font-normal text-slate-500">{d.descripcion}</span>}
                      </span>
                    </span>
                  </DataTableCell>
                  <DataTableCell className="text-slate-600">
                    <span className="block max-w-xs truncate text-xs">{d.nombreArchivo}</span>
                    {d.tamano != null && <span className="text-xs text-slate-400">{formatTamano(d.tamano)}</span>}
                  </DataTableCell>
                  <DataTableCell className="text-center text-slate-700">{d.modulos}</DataTableCell>
                  <DataTableCell className="text-slate-600">{formatDate(d.creadoEn)}</DataTableCell>
                  <DataTableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setViendo(d)} title="Ver" aria-label="Ver">
                        <Icon icon="solar:eye-bold" width={15} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditando(d)} title="Cambiar nombre o descripción" aria-label="Editar">
                        <Icon icon="solar:pen-bold" width={15} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(d)}
                        disabled={deleteMut.isPending}
                        title="Eliminar de la biblioteca"
                        aria-label="Eliminar"
                        className="hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" width={15} />
                      </Button>
                    </div>
                  </DataTableCell>
                </DataTableRow>
              )
            })
          )}
        </DataTableBody>
      </DataTable>

      <SubirDocumentoDialog open={subirOpen} onOpenChange={setSubirOpen} />
      <DocumentoVisorDialog doc={viendo} onOpenChange={(o) => !o && setViendo(null)} />
      <EditarDocumentoDialog doc={editando} onOpenChange={(o) => !o && setEditando(null)} />
    </div>
  )
}

function EditarDocumentoDialog({
  doc,
  onOpenChange,
}: {
  doc: DocumentoBiblioteca | null
  onOpenChange: (open: boolean) => void
}) {
  const updateMut = useUpdateDocumento()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')

  useEffect(() => {
    if (!doc) return
    setNombre(doc.nombre)
    setDescripcion(doc.descripcion ?? '')
  }, [doc])

  async function onGuardar() {
    if (!doc || !nombre.trim()) return
    try {
      await updateMut.mutateAsync({ id: doc.id, nombre: nombre.trim(), descripcion: descripcion.trim() || null })
      notify('success', 'Material actualizado')
      onOpenChange(false)
    } catch (err) {
      notify('error', 'No se pudo guardar', err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <Dialog open={doc !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar material</DialogTitle>
          <DialogDescription className="truncate">{doc?.nombreArchivo}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre <span className="text-rose-500">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={255} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Descripción</Label>
            <Textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onGuardar} disabled={!nombre.trim() || updateMut.isPending}>
            <Icon icon={updateMut.isPending ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} width={16} />
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
