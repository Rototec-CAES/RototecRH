// Empaqueta en la app SOLO los íconos Iconify que usa el código (Solar + spinners), para que se
// vean sin salida a internet. Busca nombres literales 'solar:…' / 'svg-spinners:…' en src/ y
// escribe src/lib/iconos.generated.json, que main.tsx registra con addCollection().
// Corre solo antes de `npm run dev` y `npm run build`; a mano: `npm run iconos`.
// Un ícono que no esté en el archivo (p. ej. nombre armado dinámicamente) se sigue pidiendo a la API.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getIcons } from '@iconify/utils'

const require = createRequire(import.meta.url)
const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(raiz, 'src')
const salida = join(src, 'lib', 'iconos.generated.json')

const SETS = {
  solar: require('@iconify-json/solar/icons.json'),
  'svg-spinners': require('@iconify-json/svg-spinners/icons.json'),
}

function archivos(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return archivos(p)
    return /\.(tsx?|jsx?)$/.test(n) ? [p] : []
  })
}

const usados = new Map(Object.keys(SETS).map((k) => [k, new Set()]))
const patron = /['"`](solar|svg-spinners):([a-z0-9-]+)['"`]/g
for (const f of archivos(src)) {
  for (const m of readFileSync(f, 'utf8').matchAll(patron)) usados.get(m[1]).add(m[2])
}

const colecciones = []
const faltantes = []
for (const [prefijo, nombres] of usados) {
  const lista = [...nombres].sort()
  const sub = getIcons(SETS[prefijo], lista)
  if (!sub) continue
  for (const n of lista) if (!sub.icons[n] && !sub.aliases?.[n]) faltantes.push(`${prefijo}:${n}`)
  colecciones.push(sub)
}

writeFileSync(salida, JSON.stringify(colecciones) + '\n')
const total = colecciones.reduce((a, c) => a + Object.keys(c.icons).length + Object.keys(c.aliases ?? {}).length, 0)
console.log(`iconos: ${total} íconos empaquetados en src/lib/iconos.generated.json`)
if (faltantes.length) console.warn(`iconos: no existen en el set (revisar nombre): ${faltantes.join(', ')}`)
