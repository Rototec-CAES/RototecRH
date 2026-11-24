/**
 * Separa "nombre" y "apellido" completos (como los deja la carga masiva) en las partes que usa el formulario.
 * - Nombres: el 1.º y el 2.º; si hay más palabras, van al tercer nombre.
 * - Apellidos: respeta partículas (DE, DEL, LA, LAS, LOS, SAN, Y…), p. ej. "DE LEÓN CASTAÑEDA" → "DE LEÓN" + "CASTAÑEDA".
 * Es una SUGERENCIA: el usuario debe revisarla antes de guardar.
 */
const PARTICULAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'SAN', 'SANTA', 'Y', 'DA', 'DI', 'VAN', 'VON'])

function palabras(s: string | null | undefined) {
  const t = (s ?? '').trim()
  return /^(null|undefined)$/i.test(t) ? [] : t.split(/\s+/).filter(Boolean)
}

/** Une cada partícula con la palabra que le sigue: ["DE","LEÓN","PÉREZ"] → ["DE LEÓN","PÉREZ"]. */
function agruparParticulas(ws: string[]) {
  const out: string[] = []
  let pend: string[] = []
  for (const w of ws) {
    pend.push(w)
    if (!PARTICULAS.has(w.toUpperCase())) {
      out.push(pend.join(' '))
      pend = []
    }
  }
  if (pend.length) out.length ? (out[out.length - 1] += ' ' + pend.join(' ')) : out.push(pend.join(' '))
  return out
}

export function separarNombreCompleto(nombre: string | null | undefined, apellido: string | null | undefined) {
  const n = palabras(nombre)
  const a = agruparParticulas(palabras(apellido))
  return {
    primer_nombre: n[0] ?? '',
    segundo_nombre: n[1] ?? '',
    tercer_nombre: n.slice(2).join(' '),
    primer_apellido: a[0] ?? '',
    segundo_apellido: a.slice(1).join(' '),
  }
}
