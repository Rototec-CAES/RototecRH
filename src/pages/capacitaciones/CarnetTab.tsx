import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import JsBarcode from 'jsbarcode'
import { Camera, Download, IdCard, Image as ImageIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmpleadoCombobox } from '@/components/ui/employee-combobox'
import { toast } from '@/components/ui/sonner'
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
    <div className="flex flex-col items-center justify-center gap-8 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:flex-row lg:items-start">
      {/* Panel de selección */}
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <div className="flex flex-col items-center gap-6 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <IdCard className="h-10 w-10 text-white" />
          </div>

          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-slate-800">Generador de Carnets</h1>
            <p className="text-sm text-slate-500">Seleccione un empleado para generar su carnet</p>
          </div>

          <div className="w-full">
            <label className="mb-2 block text-sm font-medium text-slate-700">Empleado</label>
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
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConFoto(false)
                    setFoto(null)
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border-0 p-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl ${
                    !conFoto ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-slate-400'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Sin Foto
                </button>
                <button
                  type="button"
                  onClick={() => setConFoto(true)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md border-0 p-2 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl ${
                    conFoto ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-slate-400'
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  Con Foto
                </button>
              </div>

              {conFoto && (
                <div className="w-full">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Foto del empleado
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}

              <Button
                className="w-full border-0 bg-gradient-to-r from-green-500 to-green-600 p-2 text-white shadow-lg transition-all hover:shadow-xl"
                disabled={loading || (conFoto && !foto)}
                onClick={handleGenerarCarnet}
              >
                <Download className="mr-2 h-4 w-4" />
                {loading ? 'Generando…' : 'Descargar Carnet'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Preview del carnet */}
      {empleadoSeleccionado && (
        <div className="flex flex-col items-center gap-4">
          <p className="font-medium text-slate-600">Vista previa</p>

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
      )}
    </div>
  )
}
