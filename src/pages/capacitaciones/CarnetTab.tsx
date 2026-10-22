import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import JsBarcode from 'jsbarcode'
import { Icon } from '@iconify/react'

import { Button } from '@/components/ui/button'
import { EmpleadoCombobox } from '@/components/ui/employee-combobox'
import { toast } from '@/components/ui/sonner'
import { EmptyState } from '@/components/shared/DataTable'
import { FieldLabel, Panel, Segmented } from '@/shared/report/report-ui'
import { useEmpleadosBackendList } from '@/hooks/useEmpleados'
import { usePuestoOptions } from '@/hooks/usePuestoOptions'

interface CarnetData {
  nombre: string
  puesto: string | null
  codigo: number
}

export default function CarnetTab() {
  const [empleadoId, setEmpleadoId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [conFoto, setConFoto] = useState(false)
  const [foto, setFoto] = useState<string | null>(null)
  const carnetRef = useRef<HTMLDivElement>(null)
  const barcodeRef = useRef<SVGSVGElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: empleados, isLoading: loadingEmpleados, isError } = useEmpleadosBackendList()
  const { options: puestoOptions } = usePuestoOptions()

  useEffect(() => {
    if (isError) toast.error('Error obteniendo empleados')
  }, [isError])

  // idPuesto → nombre del puesto (tPuestos). Reemplaza al puesto_fh de tEmpleados.
  const puestoMap = useMemo(() => {
    const m = new Map<number, string>()
    for (const p of puestoOptions) m.set(p.id, p.nombre)
    return m
  }, [puestoOptions])

  const opcionesEmpleados = useMemo(
    () =>
      (empleados ?? [])
        .filter((e) => e.estaActivo)
        .map((e) => ({
          id: e.id,
          nombre: `${e.nombre ?? ''} ${e.apellido ?? ''}`.trim(),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empleados],
  )

  const empleadoSeleccionado: CarnetData | null = useMemo(() => {
    const emp = (empleados ?? []).find((e) => e.id === empleadoId)
    if (!emp) return null
    return {
      nombre: `${emp.nombre ?? ''} ${emp.apellido ?? ''}`.trim(),
      puesto: emp.idPuesto !== null ? (puestoMap.get(emp.idPuesto) ?? null) : null,
      codigo: emp.id,
    }
  }, [empleados, empleadoId, puestoMap])

  useEffect(() => {
    if (empleadoSeleccionado && barcodeRef.current) {
      JsBarcode(barcodeRef.current, empleadoSeleccionado.codigo.toString(), {
        format: 'CODE128',
        width: 3,
        height: 60,
        displayValue: false,
      })
    }
  }, [empleadoSeleccionado, conFoto])

  async function handleGenerarCarnet() {
    if (!empleadoSeleccionado || !carnetRef.current) return

    setLoading(true)
    try {
      const canvas = await html2canvas(carnetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Error generando carnet')
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `carnet_${empleadoSeleccionado.nombre.replace(/\s+/g, '_')}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('Carnet generado correctamente')
      }, 'image/png')
    } catch (err) {
      console.error(err)
      toast.error('Error generando carnet')
    } finally {
      setLoading(false)
    }
  }

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => setFoto(typeof ev.target?.result === 'string' ? ev.target.result : null)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      {/* Panel de selección */}
      <Panel
        icon="solar:card-2-bold"
        title="Generador de carnés"
        subtitle="Elige un empleado activo, decide si lleva foto y descarga el carné como imagen."
      >
        <div className="space-y-5">
          <div className="w-full">
            <FieldLabel>Empleado</FieldLabel>
            <EmpleadoCombobox
              empleados={opcionesEmpleados}
              value={empleadoId}
              onChange={(id) => setEmpleadoId(id)}
              placeholder={loadingEmpleados ? 'Cargando empleados…' : 'Seleccione un empleado'}
              searchPlaceholder="Buscar por nombre"
              disabled={loadingEmpleados}
              className="w-full"
            />
          </div>

          {empleadoSeleccionado && (
            <div className="flex w-full flex-col gap-4">
              <div>
                <FieldLabel>Tipo de carné</FieldLabel>
                <Segmented
                  value={conFoto ? 'con' : 'sin'}
                  onChange={(v) => {
                    if (v === 'sin') {
                      setConFoto(false)
                      setFoto(null)
                    } else {
                      setConFoto(true)
                    }
                  }}
                  options={[
                    { value: 'sin', label: <><Icon icon="solar:gallery-remove-bold" width={15} />Sin foto</> },
                    { value: 'con', label: <><Icon icon="solar:camera-bold" width={15} />Con foto</> },
                  ]}
                  testId="rh-capacitaciones__carnet-tipo"
                />
              </div>

              {conFoto && (
                <div className="w-full">
                  <FieldLabel>Foto del empleado</FieldLabel>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                  />
                  {!foto && (
                    <p className="mt-1.5 text-xs text-amber-600">Sube una foto para poder descargar el carné.</p>
                  )}
                </div>
              )}

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading || (conFoto && !foto)}
                onClick={handleGenerarCarnet}
                data-testid="rh-capacitaciones__btn-descargar-carnet"
              >
                <Icon icon={loading ? 'svg-spinners:180-ring' : 'solar:download-minimalistic-bold'} width={16} />
                {loading ? 'Generando…' : 'Descargar carné'}
              </Button>
            </div>
          )}
        </div>
      </Panel>

      {/* Preview del carnet */}
      {empleadoSeleccionado ? (
        <Panel title="Vista previa" subtitle="Así se verá el carné descargado." className="flex flex-col">
          <div className="flex justify-center rounded-xl bg-slate-50 p-6">
          <div ref={carnetRef} className="shadow-2xl" style={{ width: '250px', height: '350px' }}>
            {conFoto ? (
              <>
                {/* Body azul con foto y datos */}
                <div
                  className="flex flex-col items-center justify-center border-[12px] border-b-0 border-white p-[15px]"
                  style={{
                    background: 'linear-gradient(135deg, #1e4db7 0%, #2563eb 100%)',
                    height: '260px',
                  }}
                >
                  {/* Foto circular */}
                  <div className="mb-3 h-[100px] w-[100px] overflow-hidden rounded-full border-[3px] border-white bg-slate-200">
                    {foto && <img src={foto} alt="Foto" className="h-full w-full object-cover" />}
                  </div>

                  {/* Card blanca con logo y datos */}
                  <div className="flex w-full items-center gap-2 rounded-lg border-2 border-blue-600 bg-white px-2.5 py-2">
                    <img src="/logo_rototec.png" alt="Logo" className="h-12 shrink-0" />

                    <div className="flex-1 text-center">
                      {/* NOMBRE */}
                      <div className="mb-1 text-[10px] font-medium leading-snug tracking-[0.08em] text-slate-800">
                        {empleadoSeleccionado.nombre.toUpperCase()}
                      </div>

                      {/* PUESTO */}
                      <div className="text-[8px] font-bold tracking-[0.12em] text-slate-600">
                        {empleadoSeleccionado.puesto?.toUpperCase() || 'SIN PUESTO'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer con código de barras */}
                <div className="flex h-[90px] flex-col items-center justify-center bg-white p-2.5 text-center">
                  <svg ref={barcodeRef}></svg>
                  <div className="mt-1 text-[12px] font-semibold text-slate-800">
                    {empleadoSeleccionado.codigo}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Header con logo */}
                <div className="flex h-[100px] items-center justify-center bg-white p-2.5">
                  <img src="/logo_rototec.png" alt="Logo" className="max-h-[80px]" />
                </div>

                {/* Body con info */}
                <div
                  className="flex h-[160px] flex-1 items-center justify-center p-5"
                  style={{
                    background: 'linear-gradient(135deg, #1e4db7 0%, #2563eb 100%)',
                  }}
                >
                  <div className="w-full rounded-lg bg-white p-5 text-center">
                    {/* NOMBRE */}
                    <div className="mb-5 text-[14px] font-medium leading-snug tracking-[0.08em] text-slate-800">
                      {empleadoSeleccionado.nombre.toUpperCase()}
                    </div>

                    {/* PUESTO */}
                    <div className="text-[11px] font-bold tracking-[0.12em] text-slate-600">
                      {empleadoSeleccionado.puesto?.toUpperCase() || 'SIN PUESTO'}
                    </div>
                  </div>
                </div>

                {/* Footer con código de barras */}
                <div className="flex h-[90px] flex-col items-center justify-center bg-white p-4 text-center">
                  <svg ref={barcodeRef}></svg>
                  <div className="mt-1 text-[12px] font-semibold text-slate-800">
                    {empleadoSeleccionado.codigo}
                  </div>
                </div>
              </>
            )}
          </div>
          </div>
        </Panel>
      ) : (
        <Panel>
          <EmptyState
            icon="solar:card-2-bold"
            title="Elige un empleado"
            description="La vista previa del carné aparece aquí en cuanto selecciones un empleado."
          />
        </Panel>
      )}
    </div>
  )
}
