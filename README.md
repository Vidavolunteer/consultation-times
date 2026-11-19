# Tic Tac · VIDA Consultation Times

Tic Tac es el nombre de la app; el logo de Vida aparece en la esquina derecha del encabezado.


App web instalable en el celular que registra los tiempos de atención de cada familia, funciona **sin internet** y envía los datos a **Google Sheets** cuando hay conexión.

Funciona como un Google Form: los intérpretes solo abren un enlace. No necesitan cuenta de Google ni permiso sobre la hoja, porque la escritura la hace un script que corre con la cuenta de VIDA.

```
Celular del intérprete (app offline, guarda en el dispositivo)
        │  cuando hay internet: POST con las atenciones finalizadas
        ▼
Apps Script "Aplicación web"  (Ejecutar como: Yo · Acceso: Cualquier persona)
        │
        ▼
Google Sheet: Atenciones · Historial_correcciones · Giras · Comunidades · Medicos · Resumen
```

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa. Aquí se pega la URL de Apps Script (`API_URL`). |
| `sw.js` | Permite abrir la app sin internet (service worker). |
| `manifest.webmanifest`, `icon*.png`, `icon.svg` | Permiten instalarla en la pantalla de inicio. |
| `Code.gs` | Backend de Google Apps Script que escribe en la hoja. |

---

## Paso 1. Crear la hoja y el backend (10 minutos)

1. Con la cuenta de Google de VIDA, crea un **Google Sheet vacío**. Ponle de nombre, por ejemplo, *VIDA – Tiempos de atención*.
2. Abre **Extensiones → Apps Script**. Borra el contenido de `Código.gs` y pega todo el contenido de `Code.gs`. Guarda.
3. En la barra superior, elige la función **`configurar`** y pulsa **Ejecutar**. Acepta los permisos (Google mostrará "app no verificada": entra en *Configuración avanzada → Ir a…*; es tu propio script).
   Esto crea las pestañas, los encabezados, los formatos de hora de 24 h y algunos catálogos de ejemplo.
4. Opcional: ejecuta `probarEnvio` y revisa que aparezca una fila en **Atenciones**. Después bórrala.

## Paso 2. Publicar el backend como un formulario

1. En Apps Script: **Implementar → Nueva implementación**.
2. Tipo: **Aplicación web**.
   - **Ejecutar como:** *Yo (tu cuenta)*
   - **Quién tiene acceso:** *Cualquier persona*
3. Pulsa **Implementar** y copia la **URL que termina en `/exec`**.

> Esta configuración hace que la app funcione como un Google Form. Cualquiera con la app puede *enviar* atenciones, pero nadie puede *leer ni editar* la hoja. La hoja sigue siendo privada.

Para comprobarlo, abre la URL en el navegador. Debe responder `{"ok":true,...}`.

**Si cambias `Code.gs` después:** usa *Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión*. Así la URL no cambia.

## Paso 3. Conectar la app

Abre `index.html` con un editor de texto (Bloc de notas sirve) y cambia la parte de configuración:

```js
window.VIDA_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
  TOKEN: ''
};
```

`TOKEN` es opcional. Es una clave sencilla contra envíos accidentales: si la usas, pon el mismo texto en `const TOKEN` de `Code.gs` y vuelve a implementar.

## Paso 4. Publicar la app (GitHub Pages, gratis, con HTTPS)

**Dirección actual de la app:** https://vidavolunteer.github.io/consultation-times/
(repositorio `consultation-times` de la cuenta de GitHub `vidavolunteer`).

> No uses Netlify con esta cuenta: su asistente («Dropped files» / «Agent runs») publica solo `index.html` y descarta `sw.js`, los íconos y el manifest, y sin `sw.js` la app no abre sin internet.

**Para publicar una versión nueva:**
1. Entra a github.com → repositorio **consultation-times**.
2. Haz clic en **Add file → Upload files**.
3. Arrastra **los archivos** de la carpeta (no la carpeta). Los que tienen el mismo nombre se reemplazan.
4. Haz clic en **Commit changes**. En 1 o 2 minutos la versión nueva está publicada.
5. Comprueba que https://vidavolunteer.github.io/consultation-times/sw.js muestre código.

Los teléfonos reciben la versión nueva la próxima vez que abren la app con internet.

## Paso 5. Instrucciones para los intérpretes

1. **Con internet**, abre el enlace una vez. La app y los catálogos quedan guardados en el teléfono.
2. Instálala en la pantalla de inicio:
   - Android/Chrome: menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.
   - iPhone/Safari: botón Compartir → *Agregar a inicio*.
3. En la clínica funciona sin señal. Las atenciones finalizadas quedan **«Por enviar»** y se envían solas al recuperar internet (también con el botón *Por enviar* de la barra superior).
4. No borres los datos del navegador ni desinstales la app mientras haya atenciones por enviar. Como respaldo: *Ajustes → Descargar CSV*.

---

**¿Está lista para usarse sin internet?** En la pantalla principal aparece un aviso:
- Verde **«✓ Ready to work without internet on this phone»**: el teléfono ya guardó la app.
- Amarillo **«⚠ Not ready to work offline yet…»**: hay que dejarla abierta unos segundos con internet, cerrarla y volver a abrirla.

Cada dirección se guarda por separado: si cambias el nombre del sitio en Netlify, los teléfonos deben abrir la dirección nueva con internet al menos una vez.

**Limpieza automática de los teléfonos:** las consultas ya enviadas («Sent») se borran solas del teléfono al día siguiente; quedan guardadas en el Google Sheet. Las que están en curso o esperando envío («To send») nunca se borran. Por eso, para corregir una consulta de un día anterior, se corrige directamente en la hoja.

## Administrar catálogos (giras, comunidades, médicos e intérpretes)

Todo se administra en el Google Sheet; no hace falta tocar la app ni volver a publicarla.

| Pestaña | Columnas | En la app |
|---|---|---|
| **Giras** | Código · País · Descripción · Activo | Lista de «Código de la gira» |
| **Comunidades** | Comunidad · País · Activo | Lista de «Comunidad» (filtrada por el país de la gira) |
| **Medicos** | Nombre · País · Activo | Lista de «Nombre del médico» (filtrada por país) |
| **Interpretes** | Nombre · País · Activo | Sugerencias al escribir el nombre (opcional; se puede escribir otro) |

- **Para agregar:** escribe una fila nueva y **marca la casilla «Activo»**. Las filas sin marcar no aparecen en la app.
- **Para quitar sin borrar:** desmarca «Activo». Las atenciones ya registradas con ese valor se conservan.
- Las columnas se reconocen por su encabezado, así que puedes reordenarlas o agregar columnas propias. Los espacios sobrantes y las filas repetidas se ignoran.

**Cuándo se actualiza el teléfono:** la app revisa el Google Sheet sola al abrirse, al volver a ella, al recuperar internet y cada 10 minutos mientras tenga conexión. También se puede forzar con el botón **«Actualizar»** de la pantalla principal. Sin internet, usa la última copia guardada en el teléfono. Si un catálogo cambia mientras alguien está escribiendo, la lista se actualiza al terminar de escribir, sin perder lo que ya llenó.

**Si actualizas `Code.gs`:** pega la versión nueva en Apps Script y ve a *Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar*. La URL no cambia.

## Formulario (igual al formato en papel «Consultation Time Form»)

La app está en inglés y sigue el orden del formato en papel:

1. Trip Code · 2. Date · 3. Community · 4. Interpreter's name · 5. Number of patients · 6. Consultation start time · 7. Intake form ready time · 8. Doctor's name · 9. Doctor start time · 10. Last patient dispatch time · 11. Doctor leaving time · 12. Main complaint · 13. Observations

- **Main complaint** es obligatorio, con las opciones *Problema de salud*, *Revisión general* y *Otro*.
- **Calculated times** incluye **Total duration**: desde *Consultation start* hasta la última salida (*Last patient dispatch* o *Doctor leaving*, la que ocurra después). Aparece cuando ambas horas están registradas.
- En la hoja Atenciones se agregaron al final, sin mover las demás columnas: **AA «Motivo de consulta»** y **AB «Min duración total»**. El Google Sheet y el tablero siguen en español.

## Qué se guarda en la hoja

**Atenciones:** una fila por atención familiar con:
- ID único
- Gira, país, fecha, comunidad, intérprete, pacientes (1–5)
- Las 5 horas completas (fecha y hora, 24 h, UTC−6)
- Médico y comentarios
- Minutos calculados: intake, espera del médico, consulta, total del paciente y tiempo del médico en el grupo
- Alertas, número de correcciones, versión, dispositivo y fecha de recepción

Si una atención se corrige después de enviarla, **se actualiza la misma fila** (por ID). Nunca se duplica.

**Historial_correcciones:** cada corrección queda como una fila nueva con el valor anterior, el nuevo, el motivo, quién y cuándo.

**Resumen:** promedios por gira y comunidad, calculados automáticamente.

## Reglas implementadas

- Las horas se toman al pulsar cada botón. Siempre se usa UTC−6, aunque el teléfono tenga otra zona horaria, y siempre en formato de 24 h con segundos. No hay selector a. m./p. m.
- Una hora registrada no se puede sobrescribir con otra pulsación. Para cambiarla hay que usar **Corregir**, que pide un motivo y lo guarda en el historial. También se puede anotar a mano una hora que se olvidó, o borrar una que se pulsó por error.
- La salida del médico y la de los pacientes son independientes. Que el médico llegue antes de terminar el intake está permitido.
- Las horas incoherentes generan **alertas**, por ejemplo: salida antes de la llegada, horas en el futuro, otra fecha o más de 4 horas de atención. Nunca se modifica nada en silencio. Las alertas también se anotan en la hoja.
- Para enviar sin todas las horas hay que explicar el motivo en Comentarios.
- Una atención finalizada se puede corregir con **Corregir datos**, que pide un motivo. Los cambios se registran y se reenvían.

## Límites a tener en cuenta

- Apps Script admite unos 30 envíos simultáneos. Para varias brigadas con decenas de intérpretes es suficiente, porque cada envío dura menos de un segundo y la app reintenta sola.
- Los datos sin enviar viven en el navegador de cada teléfono. Por eso es importante el paso 5.4.
- La clave `TOKEN` va dentro de la app, así que no es seguridad fuerte. La hoja sigue siendo privada de todos modos.
