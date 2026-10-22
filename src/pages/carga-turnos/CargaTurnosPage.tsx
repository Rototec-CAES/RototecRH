import { useRef, useState, type ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/PageHeader'
import { FieldLabel, FilterCard, Segmented } from '@/shared/report/report-ui'
import { cn } from '@/lib/utils'
import { cargaTurnosApi } from '@/api/cargaTurnos'
import type { PreviewTurnos } from '@/types'
import PreviewTurnosDialog from './PreviewTurnosDialog'

const TID = 'rh-carga-turnos'

const AREAS: { value: '1' | '2' | '3'; label: string }[] = [
  { value: '1', label: 'Acabados' },
  { value: '2', label: 'Máquinas' },
  { value: '3', label: 'General' },
]

function Paso({
  n,
  titulo,
  descripcion,
  listo,
  children,
}: {
  n: number
  titulo: string
  descripcion: string
  listo?: boolean
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            listo ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white',
          )}
        >
          {listo ? <Icon icon="solar:check-read-linear" width={16} /> : n}
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{descripcion}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function CargaTurnosPage() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [area, setArea] = useState<1 | 2 | 3>(2)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewTurnos | null>(null)
  const [cargando, setCargando] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [resultado, setResultado] = useState<{ acabados: number; maquinas: number; generales: number; avisos: number } | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const rangoOk = Boolean(desde && hasta && desde <= hasta)

  const descargar = async () => {
    const blob = await cargaTurnosApi.descargarPlantilla(desde, hasta, area)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla_turnos_${area === 1 ? 'acabados' : area === 3 ? 'general' : 'maquinas'}_${desde}_a_${hasta}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const limpiar = () => {
    setPreview(null)
    setArchivo(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onArchivo = async (f: File) => {
    setArchivo(f)
    setCargando(true)
    setPreview(null)
    setResultado(null)
    try {
      setPreview(await cargaTurnosApi.preview(f, desde, hasta, area))
    } finally {
      setCargando(false)
    }
  }

  const aplicar = async () => {
    if (!archivo) return
    setAplicando(true)
    try {
      const r = await cargaTurnosApi.aplicar(archivo, desde, hasta, area)
      setResultado(r)
      limpiar()
    } finally {
      setAplicando(false)
    }
  }

  const subidaHabilitada = rangoOk && !cargando

  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          icono="solar:upload-square-bold"
          titulo="Carga de turnos"
          descripcion="Programa los turnos de varios empleados a la vez: elige el período, descarga la plantilla de Excel, llénala y súbela. El sistema se infiere de los días."
        />
      </FilterCard>

      {resultado && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Icon icon="solar:check-circle-bold" width={18} className="text-emerald-600" />
          <span className="font-semibold">Turnos aplicados:</span>
          <span className="tabular-nums">
            <b>{resultado.acabados}</b> acabados · <b>{resultado.maquinas}</b> máquinas · <b>{resultado.generales}</b> generales · {resultado.avisos} avisos
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Paso n={1} titulo="Período y área" descripcion="Fechas que cubre la plantilla y a qué área pertenecen los turnos." listo={rangoOk}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor={`${TID}-desde`}>Desde</FieldLabel>
                <Input
                  id={`${TID}-desde`}
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  data-testid={`${TID}__desde`}
                />
              </div>
              <div>
                <FieldLabel htmlFor={`${TID}-hasta`}>Hasta</FieldLabel>
                <Input
                  id={`${TID}-hasta`}
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  data-testid={`${TID}__hasta`}
                />
              </div>
            </div>
            {desde && hasta && desde > hasta && (
              <p className="flex items-center gap-1.5 text-xs text-red-600">
                <Icon icon="solar:danger-triangle-bold" width={14} />
                La fecha «Desde» no puede ser posterior a «Hasta».
              </p>
            )}
            <div>
              <FieldLabel>Área</FieldLabel>
              <Segmented<'1' | '2' | '3'>
                value={String(area) as '1' | '2' | '3'}
                onChange={(v) => setArea(Number(v) as 1 | 2 | 3)}
                options={AREAS}
                testId={`${TID}__area`}
              />
            </div>
          </div>
        </Paso>

        <Paso n={2} titulo="Descargar plantilla" descripcion="Excel con los empleados y los días del período, listo para llenar.">
          <div className="flex h-full flex-col gap-3">
            <Button
              onClick={descargar}
              disabled={!rangoOk}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              data-testid={`${TID}__btn-plantilla`}
            >
              <Icon icon="solar:file-download-bold" width={16} />
              Descargar plantilla
            </Button>
            {!rangoOk && (
              <p className="text-xs text-slate-400">Primero elige el período en el paso 1.</p>
            )}
          </div>
        </Paso>

        <Paso n={3} titulo="Subir Excel lleno" descripcion="Antes de guardar verás una vista previa para revisar los turnos.">
          <button
            type="button"
            disabled={!subidaHabilitada}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              if (!subidaHabilitada) return
              e.preventDefault()
              setArrastrando(true)
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastrando(false)
              const f = e.dataTransfer.files?.[0]
              if (subidaHabilitada && f) onArchivo(f)
            }}
            data-testid={`${TID}__zona-subida`}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              arrastrando ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50/50',
            )}
          >
            <Icon
              icon={cargando ? 'svg-spinners:180-ring' : 'solar:upload-square-bold'}
              width={28}
              className={cargando ? 'text-sky-500' : 'text-slate-400'}
            />
            <span className="text-sm font-semibold text-slate-700">
              {cargando ? 'Leyendo archivo…' : 'Haz clic o arrastra el Excel aquí'}
            </span>
            <span className="text-xs text-slate-400">
              {archivo ? (
                <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                  <Icon icon="solar:file-text-bold" width={13} />
                  {archivo.name}
                </span>
              ) : (
                'Solo archivos .xlsx'
              )}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onArchivo(e.target.files[0])}
          />
        </Paso>
      </div>

      <PreviewTurnosDialog
        open={!!preview}
        preview={preview}
        area={(preview?.idArea ?? area) as 1 | 2 | 3}
        desde={desde}
        hasta={hasta}
        aplicando={aplicando}
        onCancel={limpiar}
        onConfirm={aplicar}
      />
    </div>
  )
}
