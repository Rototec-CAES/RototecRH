import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { toast } from '@/components/ui/sonner'
import { extractApiErrorMessage } from '@/api/client'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useDocumentos, useSubirDocumento, useVincularDocumento } from '@/hooks/useCapacitaciones'
import type { DocumentoCap } from '@/types'

/** Mismo tope que el multipart de cloudflare-service-layer (600 MB); para documentos basta menos. */
export const MAX_DOCUMENTO_BYTES = 200 * 1024 * 1024

const OFFICE = new Set(['ppt', 'pptx', 'pps', 'ppsx', 'doc', 'docx', 'xls', 'xlsx'])
const IMAGEN = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'])
const VIDEO = new Set(['mp4', 'webm', 'mov', 'm4v'])

export type TipoVista = 'pdf' | 'office' | 'imagen' | 'video' | 'otro'

export function tipoVista(doc: Pick<DocumentoCap, 'extension' | 'tipoMime'>): TipoVista {
  const ext = (doc.extension ?? '').toLowerCase()
  if (ext === 'pdf' || doc.tipoMime === 'application/pdf') return 'pdf'
  if (OFFICE.has(ext)) return 'office'
  if (IMAGEN.has(ext) || doc.tipoMime?.startsWith('image/')) return 'imagen'
  if (VIDEO.has(ext) || doc.tipoMime?.startsWith('video/')) return 'video'
  return 'otro'
}

export function iconoDocumento(doc: Pick<DocumentoCap, 'extension' | 'tipoMime'>): { icon: string; color: string } {
  const ext = (doc.extension ?? '').toLowerCase()
  if (ext.startsWith('ppt') || ext.startsWith('pps')) return { icon: 'solar:presentation-graph-bold', color: 'text-orange-500' }
  if (ext.startsWith('doc')) return { icon: 'solar:document-text-bold', color: 'text-sky-600' }
  if (ext.startsWith('xls')) return { icon: 'solar:chart-square-bold', color: 'text-emerald-600' }
  switch (tipoVista(doc)) {
    case 'pdf': return { icon: 'solar:file-text-bold', color: 'text-rose-500' }
    case 'imagen': return { icon: 'solar:gallery-bold', color: 'text-violet-500' }
    case 'video': return { icon: 'solar:videocamera-record-bold', color: 'text-slate-700' }
    default: return { icon: 'solar:file-bold', color: 'text-slate-500' }
  }
}

export function formatTamano(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** "Manual EPP v2.pdf" → "Manual EPP v2". */
function nombreSinExtension(archivo: string): string {
  const i = archivo.lastIndexOf('.')
  return i > 0 ? archivo.slice(0, i) : archivo
}

// ------------------------------------------------------------------------------------------
// Visor
// ------------------------------------------------------------------------------------------

/**
 * PDF, imágenes y video se ven directo en el navegador. PPTX/DOCX/XLSX se ven con el visor de
 * Office Online, que descarga el archivo desde su URL pública de R2.
 */
export function DocumentoVisorDialog({
  doc,
  onOpenChange,
}: {
  doc: DocumentoCap | null
  onOpenChange: (open: boolean) => void
}) {
  const tipo = doc ? tipoVista(doc) : 'otro'
  return (
    <Dialog open={doc !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-5xl flex-col gap-3">
        {doc && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 pr-6">
                <Icon icon={iconoDocumento(doc).icon} width={20} className={iconoDocumento(doc).color} />
                <span className="truncate">{doc.nombre}</span>
              </DialogTitle>
              <DialogDescription className="truncate">
                {doc.nombreArchivo}
                {doc.tamano != null && ` · ${formatTamano(doc.tamano)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              {tipo === 'pdf' && <iframe title={doc.nombre} src={doc.url} className="h-full w-full" />}
              {tipo === 'office' && (
                <iframe
                  title={doc.nombre}
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc.url)}`}
                  className="h-full w-full"
                />
              )}
              {tipo === 'imagen' && (
                <div className="grid h-full place-items-center p-4">
                  <img src={doc.url} alt={doc.nombre} className="max-h-full max-w-full object-contain" />
                </div>
              )}
              {tipo === 'video' && (
                <video src={doc.url} controls className="h-full w-full bg-black" />
              )}
              {tipo === 'otro' && (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500">
                  <Icon icon="solar:file-bold" width={40} className="text-slate-400" />
                  Este tipo de archivo no se puede previsualizar. Descárgalo para abrirlo.
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <p className="self-center text-xs text-slate-400">
                {tipo === 'office' && 'Vista previa con Office Online; si no carga, descarga el archivo.'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    <Icon icon="solar:square-top-down-linear" width={16} />
                    Abrir en otra pestaña
                  </a>
                </Button>
                <Button asChild>
                  <a href={doc.url} download={doc.nombreArchivo} target="_blank" rel="noreferrer">
                    <Icon icon="solar:download-minimalistic-bold" width={16} />
                    Descargar
                  </a>
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ------------------------------------------------------------------------------------------
// Subir a la biblioteca
// ------------------------------------------------------------------------------------------

export function SubirDocumentoDialog({
  open,
  onOpenChange,
  idModulo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Si viene, el documento queda ligado a este módulo además de entrar a la biblioteca. */
  idModulo?: number
}) {
  const subir = useSubirDocumento()
  const inputRef = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [progreso, setProgreso] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setArchivo(null)
    setNombre('')
    setDescripcion('')
    setProgreso(null)
  }, [open])

  function onFile(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    if (file.size > MAX_DOCUMENTO_BYTES) {
      toast.error('El archivo no puede pesar más de 200 MB')
      return
    }
    setArchivo(file)
    if (!nombre.trim()) setNombre(nombreSinExtension(file.name))
  }

  async function onSubir() {
    if (!archivo || !nombre.trim()) return
    setProgreso(0)
    try {
      await subir.mutateAsync({
        file: archivo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        idModulo,
        onProgress: setProgreso,
      })
      toast.success(idModulo ? 'Material subido y agregado al módulo' : 'Material subido a la biblioteca')
      onOpenChange(false)
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    } finally {
      setProgreso(null)
    }
  }

  const ocupado = progreso !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !ocupado && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir material</DialogTitle>
          <DialogDescription>
            PDF, presentaciones, documentos, hojas de cálculo, imágenes o videos (máx. 200 MB). Queda en la biblioteca para usarlo en otros módulos.
          </DialogDescription>
        </DialogHeader>
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={ocupado}
            className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-left text-sm transition-colors hover:border-sky-400 hover:bg-sky-50/50"
          >
            <Icon
              icon={archivo ? iconoDocumento({ extension: archivo.name.split('.').pop() ?? null, tipoMime: archivo.type }).icon : 'solar:upload-bold'}
              width={28}
              className={archivo ? iconoDocumento({ extension: archivo.name.split('.').pop() ?? null, tipoMime: archivo.type }).color : 'text-slate-400'}
            />
            <span className="min-w-0">
              <span className="block truncate font-medium text-slate-800">{archivo ? archivo.name : 'Elegir archivo'}</span>
              <span className="text-xs text-slate-500">{archivo ? formatTamano(archivo.size) : 'Haz clic para buscarlo en tu equipo'}</span>
            </span>
          </button>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Nombre <span className="text-rose-500">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={255} disabled={ocupado} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Descripción</Label>
            <Textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} disabled={ocupado} />
          </div>
          {progreso !== null && (
            <div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all" style={{ width: `${progreso}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{progreso < 100 ? `Subiendo… ${progreso}%` : 'Guardando…'}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={ocupado}>Cancelar</Button>
          <Button onClick={onSubir} disabled={!archivo || !nombre.trim() || ocupado}>
            <Icon icon={ocupado ? 'svg-spinners:180-ring' : 'solar:upload-bold'} width={16} />
            Subir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ------------------------------------------------------------------------------------------
// Agregar material de la biblioteca a un módulo
// ------------------------------------------------------------------------------------------

export function AgregarMaterialDialog({
  idPensum,
  idModulo,
  yaLigados,
  open,
  onOpenChange,
}: {
  idPensum: number
  idModulo: number | null
  yaLigados: number[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading } = useDocumentos(open)
  const vincular = useVincularDocumento(idPensum)
  const [buscar, setBuscar] = useState('')
  const [subirOpen, setSubirOpen] = useState(false)
  const [viendo, setViendo] = useState<DocumentoCap | null>(null)
  const ligados = useMemo(() => new Set(yaLigados), [yaLigados])

  useEffect(() => {
    if (open) setBuscar('')
  }, [open])

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return (data ?? []).filter(
      (d) => !q || d.nombre.toLowerCase().includes(q) || d.nombreArchivo.toLowerCase().includes(q),
    )
  }, [data, buscar])

  async function onAgregar(idDocumento: number) {
    if (idModulo === null) return
    try {
      await vincular.mutateAsync({ idModulo, idDocumento })
      toast.success('Material agregado al módulo')
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Agregar material al módulo</DialogTitle>
            <DialogDescription>Elige de la biblioteca o sube un archivo nuevo.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Icon icon="solar:magnifer-linear" width={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input className="pl-9" placeholder="Buscar en la biblioteca" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
            <Button onClick={() => setSubirOpen(true)}>
              <Icon icon="solar:upload-bold" width={16} />
              Subir nuevo
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : filtrados.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
              {data?.length ? 'Nada coincide con la búsqueda.' : 'La biblioteca está vacía. Sube el primer archivo.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {filtrados.map((d) => {
                const ic = iconoDocumento(d)
                const yaEsta = ligados.has(d.id)
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <Icon icon={ic.icon} width={22} className={ic.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{d.nombre}</p>
                      <p className="truncate text-xs text-slate-500">
                        {d.nombreArchivo}{d.tamano != null && ` · ${formatTamano(d.tamano)}`} · en {d.modulos} módulo(s)
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setViendo(d)} title="Ver" aria-label="Ver">
                      <Icon icon="solar:eye-bold" width={15} />
                    </Button>
                    <Button
                      size="sm"
                      variant={yaEsta ? 'outline' : 'default'}
                      onClick={() => onAgregar(d.id)}
                      disabled={yaEsta || vincular.isPending}
                    >
                      {yaEsta ? 'Agregado' : 'Agregar'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      <SubirDocumentoDialog open={subirOpen} onOpenChange={setSubirOpen} idModulo={idModulo ?? undefined} />
      <DocumentoVisorDialog doc={viendo} onOpenChange={(o) => !o && setViendo(null)} />
    </>
  )
}
