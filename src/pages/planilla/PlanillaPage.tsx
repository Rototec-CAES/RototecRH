import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { FieldLabel, FilterCard, FilterRow } from '@/shared/report/report-ui'
import { useEmpresas } from '@/hooks/useCompanyCatalogos'
import type { PeriodoPlanilla, QuincenaNum, TipoPlanilla } from '@/types/nomina'
import { DescuentosTab } from './DescuentosTab'
import { ParametrosTab } from './ParametrosTab'
import { PlanillaTab } from './PlanillaTab'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Empresa por defecto: Rototec, S.A. (tEmpresas.Id = 1). */
const EMPRESA_DEFAULT = 1

function quincenaDeHoy(): { anio: number; mes: number; quincena: 1 | 2 } {
  const hoy = new Date()
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, quincena: hoy.getDate() <= 15 ? 1 : 2 }
}

export default function PlanillaPage() {
  const hoy = quincenaDeHoy()
  const [empresaId, setEmpresaId] = useState(EMPRESA_DEFAULT)
  const [anio, setAnio] = useState(hoy.anio)
  const [mes, setMes] = useState(hoy.mes)
  const [tipo, setTipo] = useState<TipoPlanilla>('QUINCENAL')
  const [quincena, setQuincena] = useState<1 | 2>(hoy.quincena)
  const { data: empresas } = useEmpresas()

  // La planilla mensual se identifica con quincena = 0 (incluye solo colaboradores con pago mensual).
  const periodo = useMemo<PeriodoPlanilla>(
    () => ({ empresaId, anio, mes, quincena: (tipo === 'MENSUAL' ? 0 : quincena) as QuincenaNum }),
    [empresaId, anio, mes, quincena, tipo],
  )
  const empresa = empresas?.find((e) => e.id === empresaId)?.nombre ?? 'ROTOTEC, S.A.'

  return (
    <div className="space-y-5">
      <FilterCard>
        <PageHeader
          titulo="Planilla"
          icono="solar:wallet-money-bold"
          descripcion="Genera, revisa y cierra la planilla del período. Elige la empresa y el período a trabajar."
        />
        <FilterRow>
          <Selector label="Empresa" value={String(empresaId)} onChange={(v) => setEmpresaId(Number(v))} width="w-52">
            {(empresas ?? [{ id: EMPRESA_DEFAULT, nombre: 'Rototec' }]).map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.nombre}
              </SelectItem>
            ))}
          </Selector>
          <Selector label="Año" value={String(anio)} onChange={(v) => setAnio(Number(v))} width="w-24">
            {[hoy.anio - 1, hoy.anio, hoy.anio + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </Selector>
          <Selector label="Mes" value={String(mes)} onChange={(v) => setMes(Number(v))} width="w-36">
            {MESES.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </Selector>
          <Selector label="Tipo de nómina" value={tipo} onChange={(v) => setTipo(v as TipoPlanilla)} width="w-32">
            <SelectItem value="QUINCENAL">Quincenal</SelectItem>
            <SelectItem value="MENSUAL">Mensual</SelectItem>
          </Selector>
          {tipo === 'QUINCENAL' && (
            <Selector label="Quincena" value={String(quincena)} onChange={(v) => setQuincena(Number(v) as 1 | 2)} width="w-32">
              <SelectItem value="1">1ª (1–15)</SelectItem>
              <SelectItem value="2">2ª (16–fin)</SelectItem>
            </Selector>
          )}
          <p className="flex items-center gap-1.5 pb-2.5 text-xs text-slate-500">
            <Icon icon="solar:info-circle-linear" width={14} className="shrink-0 text-sky-500" />
            {tipo === 'MENSUAL'
              ? 'Incluye a los colaboradores con tipo de nómina mensual.'
              : 'Incluye a los colaboradores con tipo de nómina quincenal.'}
          </p>
        </FilterRow>
      </FilterCard>

      <Tabs defaultValue="planilla">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="planilla" data-testid="rh-planilla__tab-planilla">
            <Icon icon="solar:wallet-money-bold" width={16} />
            Planilla
          </TabsTrigger>
          <TabsTrigger value="descuentos" data-testid="rh-planilla__tab-descuentos">
            <Icon icon="solar:hand-money-bold" width={16} />
            Préstamos y embargos
          </TabsTrigger>
          <TabsTrigger value="parametros" data-testid="rh-planilla__tab-parametros">
            <Icon icon="solar:tuning-2-bold" width={16} />
            Parámetros
          </TabsTrigger>
        </TabsList>
        <TabsContent value="planilla">
          <PlanillaTab periodo={periodo} empresa={empresa} />
        </TabsContent>
        <TabsContent value="descuentos">
          <DescuentosTab empresaId={empresaId} />
        </TabsContent>
        <TabsContent value="parametros">
          <ParametrosTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function Selector({
  label,
  value,
  onChange,
  width,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  width: string
  children: React.ReactNode
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={width} data-testid={`rh-planilla__filtro-${label.toLowerCase()}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
