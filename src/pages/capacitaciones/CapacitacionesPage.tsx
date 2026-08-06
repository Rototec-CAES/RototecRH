import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PensumsTab from './PensumsTab'
import AsignarTab from './AsignarTab'
import AsignadosTab from './AsignadosTab'
import CarnetTab from './CarnetTab'

export default function CapacitacionesPage() {
  return (
    <Tabs defaultValue="pensums" className="space-y-4">
      <TabsList>
        <TabsTrigger value="pensums">Pensums</TabsTrigger>
        <TabsTrigger value="asignar">Asignar</TabsTrigger>
        <TabsTrigger value="asignados">Asignados</TabsTrigger>
        <TabsTrigger value="carnets">Carnets</TabsTrigger>
      </TabsList>
      <TabsContent value="pensums"><PensumsTab /></TabsContent>
      <TabsContent value="asignar"><AsignarTab /></TabsContent>
      <TabsContent value="asignados"><AsignadosTab /></TabsContent>
      <TabsContent value="carnets"><CarnetTab /></TabsContent>
    </Tabs>
  )
}
