// Helpers de semanas ISO (lunes–domingo) sobre fechas "YYYY-MM-DD" en el eje UTC.

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function aISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function sumarDias(iso: string, n: number): string {
  const d = aFecha(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return aISO(d)
}

export function lunesDe(iso: string): string {
  const dow = (aFecha(iso).getUTCDay() + 6) % 7
  return sumarDias(iso, -dow)
}

export function numeroSemanaISO(iso: string): number {
  const d = aFecha(iso)
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow + 3)
  const jueves1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  jueves1.setUTCDate(jueves1.getUTCDate() - ((jueves1.getUTCDay() + 6) % 7) + 3)
  return 1 + Math.round((d.getTime() - jueves1.getTime()) / (7 * 86400000))
}

export interface OpcionSemana {
  numero: number
  desde: string
  hasta: string
}

/** `antes` semanas previas al domingo de corte (inclusive) y `despues` posteriores. */
export function semanasAlrededor(corteDomingo: string, antes: number, despues = 0): OpcionSemana[] {
  const out: OpcionSemana[] = []
  const lunesCorte = lunesDe(corteDomingo)
  for (let i = -antes + 1; i <= despues; i++) {
    const desde = sumarDias(lunesCorte, i * 7)
    out.push({ numero: numeroSemanaISO(desde), desde, hasta: sumarDias(desde, 6) })
  }
  return out
}
