import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@iconify/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NameCombobox, type NameOption } from '@/components/ui/name-combobox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Segmented } from '@/shared/report/report-ui'
import { extractApiErrorMessage } from '@/api/client'
import { useEmpresas } from '@/hooks/useCompanyCatalogos'
import { useCatalogosActualizacionMasiva } from '@/hooks/useEmpleados'
import {
  CAMPO_DEPARTAMENTO,
  CAMPO_PUESTO,
  catalogoDeCampo,
  reemplazarReferencias,
  type ReferenciasNuevas,
} from '@/lib/catalogosMasiva'
import { cn } from '@/lib/utils'
import type { CampoActualizacionMasiva, CatalogosMasivaInput, FilaActualizacionMasiva } from '@/types'

/** Largo máximo de tDepartamentos.departamento. */
const MAX_DEPARTAMENTO = 25

type Accion = 'crear' | 'existente'

interface DecisionDepto {
  accion: Accion
  nombre: string
  empresaId: number | null
  /** accion = existente */
  id: number | null
}

interface DecisionPuesto {
  accion: Accion
  /** accion = crear: > 0 departamento existente; < 0 departamento nuevo (-(índice + 1)). */
  departamento: number | null
  /** accion = existente */
  id: number | null
}

const listaFilas = (filas: number[]) =>
  filas.length > 6 ? `${filas.slice(0, 6).join(', ')} y ${filas.length - 6} más` : filas.join(', ')

interface Props {
  nuevos: ReferenciasNuevas
  campos: CampoActualizacionMasiva[]
  filas: FilaActualizacionMasiva[]
  /** Filas con los nombres ya reemplazados por IDs: el padre las valida. */
  onResuelto: (filas: FilaActualizacionMasiva[]) => void
  onCancelar: () => void
}

/**
 * Paso intermedio de la carga masiva: previsualiza los departamentos y puestos del Excel que no
 * existen en el catálogo y pide crearlos (atando cada puesto a un departamento) o asociarlos a uno
 * existente. Al confirmar se crean en BD y se reemplazan los nombres por sus IDs en las filas.
 */
export function CatalogosNuevosMasiva({ nuevos, campos, filas, onResuelto, onCancelar }: Props) {
  const empresas = useEmpresas()
  const crearMut = useCatalogosActualizacionMasiva()

  const deptosExistentes = useMemo<NameOption[]>(
    () => catalogoDeCampo(campos, CAMPO_DEPARTAMENTO).map((d) => ({ id: d.id, nombre: `${d.id} - ${d.nombre}` })),
    [campos],
  )
  const puestosExistentes = useMemo<NameOption[]>(
    () => catalogoDeCampo(campos, CAMPO_PUESTO).map((p) => ({ id: p.id, nombre: `${p.id} - ${p.nombre}` })),
    [campos],
  )

  const indiceDepto = useMemo(() => new Map(nuevos.departamentos.map((d, i) => [d.clave, -(i + 1)])), [nuevos])

  const [deptos, setDeptos] = useState<DecisionDepto[]>(() =>
    nuevos.departamentos.map((d) => ({
      accion: 'crear',
      nombre: d.nombre.slice(0, MAX_DEPARTAMENTO),
      empresaId: null,
      id: null,
    })),
  )
  const [puestos, setPuestos] = useState<DecisionPuesto[]>(() =>
    nuevos.puestos.map((p) => ({
      accion: 'crear',
      departamento: !p.sugerencia
        ? null
        : 'id' in p.sugerencia
          ? p.sugerencia.id
          : (indiceDepto.get(p.sugerencia.clave) ?? null),
      id: null,
    })),
  )

  // Una sola empresa: se preselecciona.
  const empresaUnica = empresas.data?.length === 1 ? empresas.data[0].id : null
  const empresaDe = (d: DecisionDepto) => d.empresaId ?? empresaUnica

  /** Departamento efectivo de un puesto: un depto "nuevo" que se asoció a uno existente → ese ID. */
  function deptoEfectivo(v: number | null): number | null {
    if (v === null || v > 0) return v
    const d = deptos[-v - 1]
    return d.accion === 'existente' ? d.id : v
  }

  const opcionesDeptoPuesto = useMemo<NameOption[]>(
    () => [
      ...nuevos.departamentos
        .map((d, i) => ({ id: -(i + 1), nombre: `★ ${deptos[i].nombre || d.nombre} (nuevo)`, accion: deptos[i].accion }))
        .filter((o) => o.accion === 'crear')
        .map(({ id, nombre }) => ({ id, nombre })),
      ...deptosExistentes,
    ],
    [nuevos, deptos, deptosExistentes],
  )

  const errores = useMemo(() => {
    const out: string[] = []
    deptos.forEach((d, i) => {
      const n = nuevos.departamentos[i].nombre
      if (d.accion === 'existente') {
        if (!d.id) out.push(`Departamento «${n}»: elija el departamento existente`)
      } else {
        if (!d.nombre.trim()) out.push(`Departamento «${n}»: escriba el nombre`)
        if (!empresaDe(d)) out.push(`Departamento «${n}»: elija la empresa`)
      }
    })
    puestos.forEach((p, i) => {
      const n = nuevos.puestos[i].nombre
      if (p.accion === 'existente') {
        if (!p.id) out.push(`Puesto «${n}»: elija el puesto existente`)
      } else if (deptoEfectivo(p.departamento) === null) {
        out.push(`Puesto «${n}»: elija el departamento`)
      }
    })
    return out
  }, [deptos, puestos, nuevos, empresaUnica])

  const aCrear = {
    deptos: deptos.filter((d) => d.accion === 'crear').length,
    puestos: puestos.filter((p) => p.accion === 'crear').length,
  }

  async function confirmar() {
    if (errores.length) {
      toast.error(errores[0])
      return
    }
    const mapaDeptos = new Map<string, number>()
    const mapaPuestos = new Map<string, number>()
    const claveNueva = (v: number) => nuevos.departamentos[-v - 1].clave

    const input: CatalogosMasivaInput = {
      departamentos: deptos.flatMap((d, i) =>
        d.accion === 'crear'
          ? [{ clave: nuevos.departamentos[i].clave, nombre: d.nombre.trim(), empresaId: empresaDe(d)! }]
          : [],
      ),
      puestos: [],
    }
    const puestosCrear: number[] = []
    puestos.forEach((p, i) => {
      if (p.accion !== 'crear') return
      const dep = deptoEfectivo(p.departamento)!
      puestosCrear.push(i)
      input.puestos.push(
        dep > 0
          ? { nombre: nuevos.puestos[i].nombre, idDepartamento: dep }
          : { nombre: nuevos.puestos[i].nombre, claveDepartamento: claveNueva(dep) },
      )
    })

    try {
      if (input.departamentos.length || input.puestos.length) {
        const r = await crearMut.mutateAsync(input)
        for (const d of r.departamentos) mapaDeptos.set(d.clave, d.id)
        r.puestos.forEach((p, k) => mapaPuestos.set(nuevos.puestos[puestosCrear[k]].clave, p.id))
        toast.success(
          [
            r.departamentos.length ? `${r.departamentos.length} departamento${r.departamentos.length === 1 ? '' : 's'}` : '',
            r.puestos.length ? `${r.puestos.length} puesto${r.puestos.length === 1 ? '' : 's'}` : '',
          ].filter(Boolean).join(' y ') + ' listos en el catálogo',
        )
      }
      deptos.forEach((d, i) => d.accion === 'existente' && d.id && mapaDeptos.set(nuevos.departamentos[i].clave, d.id))
      puestos.forEach((p, i) => p.accion === 'existente' && p.id && mapaPuestos.set(nuevos.puestos[i].clave, p.id))
      onResuelto(reemplazarReferencias(filas, mapaDeptos, mapaPuestos))
    } catch (err) {
      toast.error(extractApiErrorMessage(err))
    }
  }

  const ocupado = crearMut.isPending
  const opcionesEmpresa: NameOption[] = (empresas.data ?? []).map((e) => ({ id: e.id, nombre: e.nombre }))

  return (
    <div className="space-y-5" data-testid="rh-actualizacion-masiva__catalogos">
      <Alert variant="warning">
        <Icon icon="solar:buildings-2-bold" width={18} />
        <AlertTitle>El archivo trae puestos o departamentos que no existen</AlertTitle>
        <AlertDescription>
          Revise la lista: puede <b>crearlos</b> (cada puesto debe quedar atado a un departamento) o <b>asociarlos a uno
          existente</b> si es el mismo con otro nombre. Al continuar se crean en el catálogo y luego se valida el archivo.
        </AlertDescription>
      </Alert>

      {nuevos.departamentos.length > 0 && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 font-semibold text-slate-800">
            <Icon icon="solar:buildings-2-linear" width={18} className="text-cyan-600" />
            Departamentos nuevos ({nuevos.departamentos.length})
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="min-w-[160px]">En el Excel</TableHead>
                  <TableHead className="w-[230px]">Acción</TableHead>
                  <TableHead className="min-w-[320px]">Datos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nuevos.departamentos.map((d, i) => {
                  const dec = deptos[i]
                  const set = (cambio: Partial<DecisionDepto>) =>
                    setDeptos((prev) => prev.map((x, j) => (j === i ? { ...x, ...cambio } : x)))
                  return (
                    <TableRow key={d.clave} className="align-top">
                      <TableCell>
                        <div className="font-medium">{d.nombre}</div>
                        <div className="text-xs text-slate-500">
                          {d.filas.length} fila{d.filas.length === 1 ? '' : 's'}: {listaFilas(d.filas)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Segmented<Accion>
                          value={dec.accion}
                          onChange={(accion) => set({ accion })}
                          disabled={ocupado}
                          options={[
                            { value: 'crear', label: 'Crear' },
                            { value: 'existente', label: 'Usar existente' },
                          ]}
                        />
                      </TableCell>
                      <TableCell>
                        {dec.accion === 'crear' ? (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div>
                              <Input
                                value={dec.nombre}
                                maxLength={MAX_DEPARTAMENTO}
                                disabled={ocupado}
                                onChange={(e) => set({ nombre: e.target.value })}
                                placeholder="Nombre"
                              />
                              {d.nombre.length > MAX_DEPARTAMENTO && (
                                <p className="mt-1 text-xs text-amber-700">Recortado a {MAX_DEPARTAMENTO} caracteres.</p>
                              )}
                            </div>
                            <NameCombobox
                              options={opcionesEmpresa}
                              value={empresaDe(dec)}
                              onChange={(empresaId) => set({ empresaId })}
                              placeholder={empresas.isLoading ? 'Cargando empresas…' : 'Empresa'}
                              disabled={ocupado}
                            />
                          </div>
                        ) : (
                          <NameCombobox
                            options={deptosExistentes}
                            value={dec.id}
                            onChange={(id) => set({ id })}
                            placeholder="Departamento existente"
                            disabled={ocupado}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {nuevos.puestos.length > 0 && (
        <section className="space-y-2">
          <h4 className="flex items-center gap-2 font-semibold text-slate-800">
            <Icon icon="solar:case-round-linear" width={18} className="text-cyan-600" />
            Puestos nuevos ({nuevos.puestos.length})
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="min-w-[180px]">En el Excel</TableHead>
                  <TableHead className="w-[230px]">Acción</TableHead>
                  <TableHead className="min-w-[320px]">Departamento / puesto existente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nuevos.puestos.map((p, i) => {
                  const dec = puestos[i]
                  const set = (cambio: Partial<DecisionPuesto>) =>
                    setPuestos((prev) => prev.map((x, j) => (j === i ? { ...x, ...cambio } : x)))
                  const sinDepto = dec.accion === 'crear' && deptoEfectivo(dec.departamento) === null
                  return (
                    <TableRow key={p.clave} className={cn('align-top', sinDepto && 'bg-amber-50/60')}>
                      <TableCell>
                        <div className="font-medium">{p.nombre}</div>
                        <div className="text-xs text-slate-500">
                          {p.filas.length} fila{p.filas.length === 1 ? '' : 's'}: {listaFilas(p.filas)}
                        </div>
                        {p.departamentosExcel && p.departamentosExcel.length > 0 && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            Departamento en el Excel: {p.departamentosExcel.join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Segmented<Accion>
                          value={dec.accion}
                          onChange={(accion) => set({ accion })}
                          disabled={ocupado}
                          options={[
                            { value: 'crear', label: 'Crear' },
                            { value: 'existente', label: 'Usar existente' },
                          ]}
                        />
                      </TableCell>
                      <TableCell>
                        {dec.accion === 'crear' ? (
                          <NameCombobox
                            options={opcionesDeptoPuesto}
                            value={deptoEfectivo(dec.departamento)}
                            onChange={(departamento) => set({ departamento })}
                            placeholder="Atar al departamento…"
                            searchPlaceholder="Buscar departamento…"
                            disabled={ocupado}
                          />
                        ) : (
                          <NameCombobox
                            options={puestosExistentes}
                            value={dec.id}
                            onChange={(id) => set({ id })}
                            placeholder="Puesto existente"
                            searchPlaceholder="Buscar puesto…"
                            disabled={ocupado}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-slate-500">
            El puesto se guarda en el sub-departamento del departamento elegido (el que se llama igual o el único que
            tenga; si no hay, se crea uno con el nombre del departamento). Queda sin código de BioTime: asígnelo en
            Estructura si lo necesita.
          </p>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <Button variant="outline" onClick={onCancelar} disabled={ocupado}>
          Cancelar
        </Button>
        <div className="flex items-center gap-3">
          {errores.length > 0 && (
            <span className="text-xs text-slate-500">
              {errores.length} pendiente{errores.length === 1 ? '' : 's'}: {errores[0]}
            </span>
          )}
          <Button
            onClick={confirmar}
            disabled={ocupado || errores.length > 0}
            data-testid="rh-actualizacion-masiva__btn-catalogos"
          >
            <Icon icon={ocupado ? 'svg-spinners:180-ring' : 'solar:check-circle-bold'} />
            {aCrear.deptos + aCrear.puestos > 0
              ? `Crear ${[
                  aCrear.deptos ? `${aCrear.deptos} departamento${aCrear.deptos === 1 ? '' : 's'}` : '',
                  aCrear.puestos ? `${aCrear.puestos} puesto${aCrear.puestos === 1 ? '' : 's'}` : '',
                ]
                  .filter(Boolean)
                  .join(' y ')} y validar`
              : 'Continuar y validar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
