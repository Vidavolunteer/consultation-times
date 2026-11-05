/**
 * VIDA · Tiempos de atención — backend en Google Apps Script.
 *
 * Funciona como un Google Form: se publica como "Aplicación web" que se ejecuta
 * con TU cuenta y con acceso "Cualquier persona". Los intérpretes solo usan el enlace
 * de la app; nunca necesitan permiso de edición sobre la hoja.
 *
 * Pasos: ver README.md. Resumen:
 *   1) Crear un Google Sheet vacío → Extensiones → Apps Script → pegar este archivo.
 *   2) Ejecutar la función `configurar` una vez (crea pestañas, encabezados y ejemplos).
 *   3) Implementar → Nueva implementación → Aplicación web
 *        Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier persona
 *   4) Copiar la URL que termina en /exec y pegarla en index.html (API_URL).
 */

// Opcional: clave compartida. Si la usas, pon el mismo valor en TOKEN de index.html.
const TOKEN = '';
const TZ = 'America/Costa_Rica'; // UTC−6 sin horario de verano (igual que Guatemala)

const HOJA = {
  atenciones: 'Atenciones',
  historial: 'Historial_correcciones',
  giras: 'Giras',
  comunidades: 'Comunidades',
  medicos: 'Medicos',
  interpretes: 'Interpretes',
  resumen: 'Resumen'
};

const COLS = ['ID', 'Gira', 'País', 'Fecha', 'Comunidad', 'Intérprete', 'Pacientes',
  'Inicio atención', 'Fin intake', 'Llegada médico', 'Salida pacientes', 'Salida médico',
  'Médico', 'Comentarios',
  'Min inicio→fin intake', 'Min inicio→llegada médico', 'Min llegada médico→salida pacientes', 'Min total paciente', 'Min médico en grupo',
  'Alertas', 'Correcciones', 'Versión', 'Dispositivo', 'Creado', 'Finalizado', 'Recibido',
  'Motivo de consulta', 'Min duración total']; // AA y AB: se agregan al final para no mover las demás
const COLS_HIST = ['ID corrección', 'ID atención', 'Campo', 'Valor anterior', 'Valor nuevo', 'Motivo', 'Corregido por', 'Fecha de corrección', 'Recibido'];
const EVENTOS = ['inicio', 'intake', 'medicoLlega', 'pacientesSalen', 'medicoSale'];
const C_VERSION = COLS.indexOf('Versión') + 1;

/* ------------------------------------------------------------------ */
/* Configuración inicial: ejecutar UNA vez desde el editor             */
/* ------------------------------------------------------------------ */
function configurar() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(TZ);

  const at = hoja_(HOJA.atenciones, COLS);
  at.getRange('H:L').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  at.getRange('D:D').setNumberFormat('yyyy-mm-dd');
  at.getRange('O:S').setNumberFormat('0.0');
  at.getRange('AB:AB').setNumberFormat('0.0');
  at.getRange('Z:Z').setNumberFormat('yyyy-mm-dd hh:mm:ss');

  const hi = hoja_(HOJA.historial, COLS_HIST);
  hi.getRange('I:I').setNumberFormat('yyyy-mm-dd hh:mm:ss');

  const gi = hoja_(HOJA.giras, ['Código', 'País', 'Descripción', 'Activo']);
  const co = hoja_(HOJA.comunidades, ['Comunidad', 'País', 'Activo']);
  const me = hoja_(HOJA.medicos, ['Nombre', 'País', 'Activo']);
  const it = hoja_(HOJA.interpretes, ['Nombre', 'País', 'Activo']);
  if (gi.getLastRow() < 2) ejemplo_(gi, [['CR-2026-11', 'Costa Rica', 'Ejemplo · Guanacaste', true], ['GT-2026-12', 'Guatemala', 'Ejemplo · Sololá', true]]);
  if (co.getLastRow() < 2) ejemplo_(co, [['Santa Cruz', 'Costa Rica', true], ['Nicoya', 'Costa Rica', true], ['San Lucas Tolimán', 'Guatemala', true], ['Santiago Atitlán', 'Guatemala', true]]);
  if (me.getLastRow() < 2) ejemplo_(me, [['Dra. Ejemplo Solís', 'Costa Rica', true], ['Dra. Ejemplo Xocop', 'Guatemala', true]]);
  [gi, co, me, it].forEach(function (sh) {
    const col = sh.getLastColumn();
    const paisCol = sh.getRange(1, 1, 1, col).getValues()[0].indexOf('País') + 1;
    sh.getRange(2, col, 500, 1).insertCheckboxes();
    sh.getRange(2, paisCol, 500, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Costa Rica', 'Guatemala'], true).build());
  });

  let rs = ss.getSheetByName(HOJA.resumen);
  if (!rs) rs = ss.insertSheet(HOJA.resumen);
  rs.clear();
  rs.getRange('A1').setValue('Promedios en minutos por gira y comunidad (se actualiza solo)').setFontWeight('bold');
  rs.getRange('A3').setFormula(
    "=IFERROR(QUERY(Atenciones!A:Z,\"select B, C, E, count(A), sum(G), avg(O), avg(P), avg(Q), avg(R), avg(S) " +
    "where A is not null group by B, C, E " +
    "label B 'Gira', C 'País', E 'Comunidad', count(A) 'Atenciones', sum(G) 'Pacientes', avg(O) 'Prom. intake', " +
    "avg(P) 'Prom. espera médico', avg(Q) 'Prom. con médico', avg(R) 'Prom. total paciente', avg(S) 'Prom. médico en grupo'\",1),\"Sin datos\")");

  const def = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  Logger.log('Listo. Ahora implementa como aplicación web.');
}

function hoja_(nombre, cols) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getMaxColumns() < cols.length) sh.insertColumnsAfter(sh.getMaxColumns(), cols.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#dcefe8');
  sh.setFrozenRows(1);
  return sh;
}
function ejemplo_(sh, filas) { sh.getRange(2, 1, filas.length, filas[0].length).setValues(filas); }

/* ------------------------------------------------------------------ */
/* API pública                                                         */
/* ------------------------------------------------------------------ */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'catalogos') return json_(catalogos_());
  return json_({ ok: true, app: 'VIDA tiempos de atención', hora: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (TOKEN && body.token !== TOKEN) return json_({ ok: false, error: 'Clave inválida' });
    const regs = Array.isArray(body.registros) ? body.registros.slice(0, 200) : [];
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return json_({ ok: true, ids: guardar_(regs) });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* Lee los catálogos del Google Sheet. Las columnas se buscan por su encabezado,
   así que se pueden reordenar o agregar columnas sin romper la app.
   Solo se envían las filas con nombre/código y con «Activo» marcado (si la columna existe). */
function catalogos_() {
  const ss = SpreadsheetApp.getActive();
  const leer = function (nombre, campos) {
    const sh = ss.getSheetByName(nombre);
    if (!sh || sh.getLastRow() < 2) return [];
    const v = sh.getDataRange().getValues();
    const h = v.shift().map(function (x) { return norm_(x); });
    const col = {};
    Object.keys(campos).forEach(function (k) {
      col[k] = -1;
      campos[k].some(function (alias) { const i = h.indexOf(norm_(alias)); if (i >= 0) { col[k] = i; return true; } return false; });
    });
    const iAct = h.indexOf('activo');
    const vistos = {};
    const out = [];
    v.forEach(function (r) {
      const o = {};
      Object.keys(col).forEach(function (k) { o[k] = col[k] >= 0 ? String(r[col[k]]).replace(/\s+/g, ' ').trim() : ''; });
      const clave = o[Object.keys(campos)[0]];
      if (!clave || (iAct >= 0 && !activo_(r[iAct])) || vistos[clave + '|' + (o.pais || '')]) return;
      vistos[clave + '|' + (o.pais || '')] = true;
      out.push(o);
    });
    return out;
  };
  return {
    ok: true,
    giras: leer(HOJA.giras, { codigo: ['Código', 'Codigo', 'Código de gira'], pais: ['País', 'Pais'], nombre: ['Descripción', 'Descripcion', 'Nombre'] }),
    comunidades: leer(HOJA.comunidades, { nombre: ['Comunidad', 'Nombre'], pais: ['País', 'Pais'] }),
    medicos: leer(HOJA.medicos, { nombre: ['Nombre', 'Médico', 'Medico'], pais: ['País', 'Pais'] }),
    interpretes: leer(HOJA.interpretes, { nombre: ['Nombre', 'Intérprete', 'Interprete'], pais: ['País', 'Pais'] }),
    actualizado: Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ss") + '-06:00'
  };
}
function norm_(x) { return String(x).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function activo_(v) { return v === true || /^(s[ií]|x|true|1)$/i.test(String(v).trim()); }

/* ------------------------------------------------------------------ */
/* Guardado: una fila por atención, actualizada por ID (idempotente)   */
/* ------------------------------------------------------------------ */
function guardar_(regs) {
  const ss = SpreadsheetApp.getActive();
  const at = ss.getSheetByName(HOJA.atenciones);
  const hi = ss.getSheetByName(HOJA.historial);
  if (!at || !hi) throw new Error('Ejecuta la función configurar() primero');
  if (at.getMaxColumns() < COLS.length) {
    at.insertColumnsAfter(at.getMaxColumns(), COLS.length - at.getMaxColumns());
    at.getRange(1, 1, 1, COLS.length).setValues([COLS]);
  }
  const ahora = new Date();

  const n = at.getLastRow() - 1;
  const existentes = n > 0 ? at.getRange(2, 1, n, C_VERSION).getValues() : [];
  const filaDe = {};
  existentes.forEach(function (r, i) { filaDe[r[0]] = { fila: i + 2, version: Number(r[C_VERSION - 1]) || 0 }; });

  const nh = hi.getLastRow() - 1;
  const cidsHist = {};
  if (nh > 0) hi.getRange(2, 1, nh, 1).getValues().forEach(function (r) { cidsHist[r[0]] = true; });

  const nuevas = [], histNuevas = [], ids = [];
  regs.forEach(function (g) {
    const id = txt_(g.id, 64);
    if (!/^[0-9a-f-]{8,64}$/i.test(id)) return;
    const fila = filaAtencion_(g, ahora);
    const prev = filaDe[id];
    if (prev) {
      if ((Number(g.version) || 0) >= prev.version) at.getRange(prev.fila, 1, 1, fila.length).setValues([fila]);
    } else {
      nuevas.push(fila);
      filaDe[id] = { fila: -1, version: Number(g.version) || 0 };
    }
    (Array.isArray(g.historial) ? g.historial : []).forEach(function (h) {
      const cid = txt_(h.cid, 64);
      if (!cid || cidsHist[cid]) return;
      cidsHist[cid] = true;
      histNuevas.push([cid, id, txt_(h.campoN, 80), txt_(h.anterior, 40), txt_(h.nuevo, 40), txt_(h.motivo, 500), txt_(h.por, 120), txt_(h.en, 40), ahora]);
    });
    ids.push(id);
  });
  if (nuevas.length) at.getRange(at.getLastRow() + 1, 1, nuevas.length, COLS.length).setValues(nuevas);
  if (histNuevas.length) hi.getRange(hi.getLastRow() + 1, 1, histNuevas.length, COLS_HIST.length).setValues(histNuevas);
  return ids;
}

function filaAtencion_(g, ahora) {
  const t = {};
  EVENTOS.forEach(function (k) { const v = Number(g[k + '_ms']); t[k] = isFinite(v) && v > 0 ? v : null; });
  const fecha = function (ms) { return ms == null ? '' : new Date(ms); };
  const min = function (a, b) { return (t[a] == null || t[b] == null) ? '' : Math.round((t[b] - t[a]) / 6000) / 10; };
  const pac = Math.min(5, Math.max(1, parseInt(g.pacientes, 10) || 1));
  return [
    txt_(g.id, 64), txt_(g.gira, 60), txt_(g.pais, 40), txt_(g.fecha, 10), txt_(g.comunidad, 120), txt_(g.interprete, 120), pac,
    fecha(t.inicio), fecha(t.intake), fecha(t.medicoLlega), fecha(t.pacientesSalen), fecha(t.medicoSale),
    txt_(g.medico, 120), txt_(g.comentarios, 2000),
    min('inicio', 'intake'), min('inicio', 'medicoLlega'), min('medicoLlega', 'pacientesSalen'), min('inicio', 'pacientesSalen'), min('medicoLlega', 'medicoSale'),
    txt_(g.alertas, 1000), (Array.isArray(g.historial) ? g.historial.length : 0), Number(g.version) || 0,
    txt_(g.dispositivo, 40), txt_(g.creado, 40), txt_(g.finalizado, 40), ahora,
    txt_(g.complaint, 60),
    (t.inicio == null || t.pacientesSalen == null || t.medicoSale == null) ? '' : Math.round((Math.max(t.pacientesSalen, t.medicoSale) - t.inicio) / 6000) / 10
  ];
}

/* Texto seguro: recorta y evita que se interprete como fórmula. */
function txt_(v, max) {
  let s = v == null ? '' : String(v).slice(0, max || 500);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* Prueba manual desde el editor: inserta una atención de ejemplo. */
function probarEnvio() {
  const ms = Date.now();
  const r = guardar_([{ id: Utilities.getUuid(), gira: 'CR-2026-11', pais: 'Costa Rica', fecha: Utilities.formatDate(new Date(ms), TZ, 'yyyy-MM-dd'),
    comunidad: 'Santa Cruz', interprete: 'Prueba', pacientes: 2, medico: 'Dra. Ejemplo Solís', complaint: 'Revisión general', comentarios: 'Fila de prueba, puedes borrarla',
    inicio_ms: ms - 40 * 60000, intake_ms: ms - 28 * 60000, medicoLlega_ms: ms - 25 * 60000, pacientesSalen_ms: ms - 3 * 60000, medicoSale_ms: ms - 2 * 60000,
    version: 1, dispositivo: 'editor', historial: [] }]);
  Logger.log(r);
}
