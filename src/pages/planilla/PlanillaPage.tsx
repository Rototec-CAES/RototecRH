import { useMemo, useState } from 'react'

import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmpresas } from '@/hooks/useCompanyCatalogos'
import type { PeriodoPlanilla, QuincenaNum } from '@/types/nomina'
import { DescuentosTab } from './DescuentosTab'
import { ParametrosTab } from './ParametrosTab'
import { PlanillaTab } from './PlanillaTab'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** Empresa por defecto: Rototec, S.A. (tEmpresas.Id = 1). */
const EMPRESA_DEFAULT = 1

function quincenaDeHoy(): { anio: number; mes: number; quincena: QuincenaNum } {
  const hoy = new Date()
  return { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1, quincena: hoy.getDate() <= 15 ? 1 : 2 }
}

export default function PlanillaPage() {
  const hoy = quincenaDeHoy()
  const [empresaId, setEmpresaId] = useState(EMPRESA_DEFAULT)
  const [anio, setAnio] = useState(hoy.anio)
  const [mes, setMes] = useState(hoy.mes)
  const [quincena, setQuincena] = useState<QuincenaNum>(hoy.quincena)
  const { data: empresas } = useEmpresas()

  const periodo = useMemo<PeriodoPlanilla>(() => ({ empresaId, anio, mes, quincena }), [empresaId, anio, mes, quincena])
  const empresa = empresas?.find((e) => e.id === empresaId)?.nombre ?? 'ROTOTEC, S.A.'

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
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
        <Selector label="Quincena" value={String(quincena)} onChange={(v) => setQuincena(Number(v) as QuincenaNum)} width="w-32">
          <SelectItem value="1">1ª (1–15)</SelectItem>
          <SelectItem value="2">2ª (16–fin)</SelectItem>
        </Selector>
      </Card>

      <Tabs defaultValue="planilla">
        <TabsList>
          <TabsTrigger value="planilla">Planilla</TabsTrigger>
          <TabsTrigger value="descuentos">Préstamos y embargos</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros</TabsTrigger>
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
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={width}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
