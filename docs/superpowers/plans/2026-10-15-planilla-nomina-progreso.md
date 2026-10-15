# Planilla / Nómina — progreso al 2026-10-15

Estado: **funcional en local, sin commit y sin desplegar.** Los cambios están en dos repos:

- `C:\Fuentes\RototecRH` (rama `dev-steven`): frontend
- `C:\Fuentes\Microservicios` (rama `docker-steven`): backend, en `apps/domains/global/recursos-humanos`

Ninguno de los dos tiene commits; los commits y los push los hace el usuario.

---

## 1. Por qué la pantalla se quedaba en "Cargando datos"

La pantalla vieja de Planilla esperaba datos de `/rrhh/turnos` y `/rrhh/asignaciones-turno`, y **esos endpoints nunca existieron** en el microservicio de RRHH. Tampoco existían `/planillas`, `/bonificaciones` ni `/atrasos`. La pantalla se construyó con datos de prueba y nunca se conectó al backend.

---

## 2. Base de datos (`INTRA_ROTOTEC`, ya aplicado)

- **Script:** `Microservicios/apps/domains/global/recursos-humanos/src/planilla/sql/001-tablas-planilla.sql`. Es idempotente, así que se puede volver a correr sin problema.
- **Alcance:** solo se tocó `INTRA_ROTOTEC`; las bases `SBO_*` de SAP no se tocaron.

| Tabla | Para qué |
|---|---|
| `tNominaParametros` | 22 parámetros editables: divisor 30, bonificación 250, HE 8/6/7 × 1.5, IGSS 4.83 % laboral y 10.67 % patronal, IRTRA 1 %, INTECAP 1 %, provisión de vacaciones 4.17 %, Bono 14 y aguinaldo 8.3333 %, indemnización 9.72 %, ISR 48000/300000/5 %/7 %, 24 quincenas. |
| `tPlanillas` | Cabecera, única por empresa + año + mes + quincena. Guarda las semanas de HE (desde/hasta), el estado (BORRADOR o CERRADA) y los avisos en JSON. |
| `tPlanillaLineas` | Una fila por empleado con las columnas A–AL de "04 Calculo Nomina", más un snapshot de los datos, los overrides manuales y los avisos. |
| `tPlanillaHESemana` | Desglose semanal de horas extra, para auditoría. |
| `tDescuentosEmpleado` | Préstamos y embargos con cuota y saldo. Un saldo NULL significa indefinido. |
| `tPlanillaDescuentos` | Qué descuentos se aplicaron en cada planilla. |

Las tablas están vacías; solo `tNominaParametros` tiene datos. Los datos de prueba se borraron y los identity se reiniciaron.

---

## 3. Backend: módulo `src/planilla/`

### Archivos

- `lib/calculo.ts`
  - `calcularLinea` arma la línea del empleado.
  - El IGSS se calcula sobre F+G+O+T: salario, vacaciones, total de horas extra y comisiones.
  - `isrQuincenal`: proyecta el ingreso anual, resta el IGSS y Q48k, aplica 5 % o 7 %, lo divide entre 24 y lo prorratea por días pagados.
  - Provisiones de vacaciones, Bono 14, aguinaldo, indemnización, IGSS patronal, IRTRA e INTECAP.
- `lib/periodo.ts`
  - `rangoQuincena`.
  - `propuestaSemanasHE` propone las semanas ISO no pagadas, desde la última pagada hasta el domingo de la semana del día 1 de la quincena.
  - `diasDelPeriodo` cuenta 15 días por quincena, prorratea altas y bajas, y separa los días de vacaciones (`VACACIONES`, `VACACIONES_TURNO_SUSPENDIDO`).
- Tests de las dos librerías, más `dto/planilla.dto.ts`, `planilla.service.ts`, `planilla.controller.ts` y `planilla.module.ts`. El módulo importa `HorasExtraModule` y quedó registrado en `app.module.ts`.

### Rutas (prefijo `/rrhh`)

```
GET    planillas?empresaId
GET    planillas/parametros            PUT planillas/parametros/:clave
GET    planillas/propuesta
GET    planillas/periodo?empresaId&anio&mes&quincena   (null si no existe)
POST   planillas/generar  {empresaId,anio,mes,quincena,semanaHEDesde,semanaHEHasta}
GET    planillas/:id
GET    planillas/:id/horas-extra/:idEmpleado
PATCH  planillas/:id/lineas/:idEmpleado
POST   planillas/:id/cerrar     (baja el saldo de préstamos; se desactivan al llegar a 0)
DELETE planillas/:id            (solo BORRADOR)
GET/POST/PUT descuentos-empleado
```

### Reglas de generación

- **Quién entra:** empleados de la empresa que no están eliminados, con `habilitar_nomina=1`, cuyo `tipo_contrato` no es SERVICIOS, y que están activos o con baja dentro de la quincena.
- **Sin salario:** quedan fuera y salen como aviso.
- **Semanas de HE:** se rechazan las que ya pertenecen a otra planilla y los rangos de más de 6 semanas.
- **Regenerar:** se conservan las capturas manuales (bonos, anticipos, otros descuentos y overrides).
- **Horas extra:** **siempre comparan el turno programado contra el biométrico.** El ingreso es el más tarde entre turno y marca, la salida es la más temprana entre fin de turno y salida real, y un turno sin marcas cuenta como ausente. No existe un modo que use solo lo programado.
- **Avisos:** días con marcaje inconsistente, empleados con turno que no marcaron, y empleados con HE que no tienen `habilitar_horas_extra`. A estos últimos se les paga igual y solo se avisa.

### Corrección del motor de horas extra (`src/horas-extra`)

- `lib/sistemas.ts`: la proporción día/noche ahora se calcula con la fórmula D/(D+N). Antes salía de un catálogo fijo e incompleto, que ya se quitó. Se agregaron tests para los sistemas 3-2-2 y 5-1-1.
- `horas-extra.service.ts`: se agregó `desgloseTodos()`.

### Pruebas

- **Jest:** 11 suites y 156 tests pasan.
- **Build de producción:** `tsc -p tsconfig.build.json` compila sin errores. Los errores de tipos de `grano.spec.ts` ya existían antes de estos cambios.
- **Prueba E2E local contra la BD real** (puerto 4107), 1ª quincena de octubre 2026 con semanas 38–40:
  - 159 empleados, líquido total Q359,706.27, unos 39 s.
  - También se probaron editar una línea, reiniciar un override, préstamos, cerrar la planilla y el rechazo de semanas traslapadas.

### Cómo correrlo en local

Estos ajustes solo se hicieron en la máquina local; no quedaron guardados en el repo.

- `npm install --no-package-lock` y luego `npm install mssql --no-save`. **`mssql` no está en `package.json`**: falta revisar cómo lo obtiene la imagen de Docker.
- No hay broker de Kafka local, así que se corre con `NODE_OPTIONS=--unhandled-rejections=warn`.

---

## 4. Frontend (RototecRH)

### Nuevos

- `src/types/nomina.ts`, `src/api/nomina.ts` (solo API real, sin mock) y `src/hooks/useNomina.ts`.
- `src/lib/exportNomina.ts`: exporta a Excel con exceljs la hoja "04 Calculo Nomina" (columnas A–AL con totales SUM) y una hoja "Pago bancario".
- `src/pages/planilla/`:
  - `PlanillaPage.tsx`: selectores de Empresa, Año, Mes y Quincena, y las pestañas Planilla, Préstamos y embargos, y Parámetros.
  - `PlanillaTab.tsx`, `GenerarPlanillaDialog.tsx`, `SemanasHEDialog.tsx`, `DescuentosTab.tsx`, `ParametrosTab.tsx` y `semanas.ts`.
  - `EditableCell` recibió la prop `step`.

### Eliminados

- El stack viejo de planilla con mock: `api/planilla.ts`, `hooks/usePlanilla.ts`, `lib/planilla.ts` y `lib/exportPlanilla.ts`.
- La pantalla de Bonificaciones completa (página, api, hooks y constants), porque su backend nunca existió. Los bonos ahora se capturan en las columnas P–U de la planilla.
- Las secciones de Bonificaciones y Planilla viejas en `endpoints.ts`, y su item de nav y su ruta en `AppShell.tsx` y `router.tsx`.

### Verificación

- `tsc -b` y `vite build` pasan.
- **No se probó en el navegador**, porque el login pasa por el gateway y el backend nuevo no está desplegado.

---

## 5. Problemas de datos encontrados

- **Turnos:** para las semanas 38–40, solo 29 empleados tienen turnos cargados. Los 58 del Excel nunca se subieron por "Carga de turnos". Por eso solo 18 personas salen con HE (368 h, contra 1,428 h del Excel).
- **Salarios:** 241 empleados activos no tienen `salario_base_contrato`, así que quedan fuera de la planilla.
- **Datos bancarios e IGSS:** a 111 de los 159 de la planilla les falta cuenta bancaria o número de afiliación IGSS.
- **Códigos de banco:** `tEmpleados.codigo_banco` (105, 107…) no coincide con `tBancos.CodigoBanco`.
- **Permiso de horas extra:** 13 empleados tienen HE pero no tienen `habilitar_horas_extra`.
- **Error del Excel de horas extra:** el sistema "3-2-2" no estaba en el catálogo de "Resumen v2", así que todas sus horas se iban a noche. Los totales correctos de las semanas 38–40 son Día 784.38, Noche 644.60 y Total **1,428.98** (el Excel dice 1,469.78). El multiplicador nocturno del Excel no cambia las horas, porque se aplica y luego se divide.

---

## 6. Supuestos tomados (confirmar)

1. **Provisión de vacaciones:** se usó 4.17 %; el Excel dice 4.17 % en un lugar y 4.47 % en otro. Se cambia en la pestaña Parámetros.
2. **Base del IGSS:** salario + vacaciones + HE + comisiones (F+G+O+T). Los bonos no la afectan.
3. **ISR:** se prorratea por días pagados y se puede corregir por empleado.
4. **HE mixta:** el motor no la calcula; se captura a mano.
5. **`habilitar_horas_extra`:** solo genera aviso, no bloquea el pago.
6. **Inconsistencias corregidas del Excel:** la columna V ahora incluye G, y la columna AC incluye IGSS e ISR en todas las filas.
7. **Primera planilla sin historial:** el sistema propone las semanas 39–40 para la 1ª quincena de octubre (el Excel usó 38–40). Se ajusta en el diálogo de generar.

---

## 7. Pendientes / siguiente paso

- [ ] El usuario revisa y hace commit de los dos repos.
- [ ] Agregar `mssql` al `package.json` de RRHH, o confirmar cómo llega al contenedor.
- [ ] Desplegar el microservicio de RRHH con el módulo `planilla`.
- [ ] Probar la pantalla en el navegador contra el gateway.
- [ ] Cargar los turnos faltantes por "Carga de turnos" y completar salarios, cuentas bancarias e IGSS.
- [ ] Opcional: pasar a `tNominaParametros` los valores que hoy están fijos en el código del motor de HE (44/36 h semanales, almuerzo de 1 h, asueto 8/6).
- [ ] Opcional: corregir el mapeo `codigo_banco` ↔ `tBancos` para la hoja "Pago bancario".
- [ ] Las pantallas viejas de Turnos y Asignaciones (`/turnos` y `/asignaciones-turno`) siguen apuntando a endpoints que no existen; hay que revisarlas o quitarlas.
- [ ] La carpeta `recursos/` (Excel de referencia y archivos `~$`) no está en git; decidir si se ignora.

## Referencias

- **Análisis del Excel de nómina y del de horas extra, y survey de la BD:** en el scratchpad de la sesión (`excel_nomina/`, `horas_extra/` y `db_survey.md`). Son temporales; lo importante quedó resumido aquí.
- **Excel originales:** `C:\Fuentes\RototecRH\recursos\`.
