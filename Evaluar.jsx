// Pantalla "Evaluar" - SUPERA PRÉSTAMOS
// Elegir solicitante -> botón Evaluar -> estatus, monto autorizado y puntos por criterio.
//
// Requisitos: React 18+, @supabase/supabase-js, y un usuario con sesión iniciada.
// AJUSTA SOLO ESTA LÍNEA a la ruta donde exportas tu cliente de Supabase:
import { supabase } from '../supabaseClient';
import { useCallback, useEffect, useMemo, useState } from 'react';

const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

// Los puntos máximos se calculan desde la tabla parametros (no se escriben aquí),
// así que si el gerente cambia un valor, la pantalla lo refleja sola.
const CRITERIOS = [
  { clave: 'clima', nombre: 'Exposición climática', max: ['pt_zona_baja', 'pt_agua_seguro'] },
  { clave: 'capacidad', nombre: 'Capacidad de pago', max: ['pt_cap_a', 'pt_ali_0'] },
  { clave: 'precio', nombre: 'Precio y comercialización', max: ['pt_venta_contrato', 'pt_margen_a'] },
  { clave: 'seguro', nombre: 'Seguro agrícola', max: ['pt_seguro_full'] },
  { clave: 'garantias', nombre: 'Garantías', max: ['pt_aforo_a'] },
  { clave: 'buro', nombre: 'Buró + MOP', max: ['pt_buro_a'] },
  { clave: 'concentracion', nombre: 'Concentración de cartera', max: ['pt_conc_a'] },
  { clave: 'historial', nombre: 'Historial interno', max: ['pt_hist_a'] },
];

// Cada estatus lleva color Y texto (y un símbolo) para no depender solo del color.
const ESTATUS = {
  aprobada: { texto: 'Aprobada', simbolo: '✔', clase: 'ok', nota: 'Cumple la matriz sin topes ni vetos.' },
  aprobada_condicional: {
    texto: 'Aprobada condicional',
    simbolo: '!',
    clase: 'cond',
    nota: 'Se autoriza con condiciones y, en su caso, con reducción de monto.',
  },
  pre_aprobada_comite: {
    texto: 'Pre-aprobada: pasa a Comité',
    simbolo: '…',
    clase: 'comite',
    nota: 'Queda pendiente de la decisión del Comité de Riesgo.',
  },
  rechazada: { texto: 'Rechazada', simbolo: '✕', clase: 'rech', nota: 'No cumple la matriz.' },
  rechazada_fraude: {
    texto: 'Rechazada por fraude',
    simbolo: '✕',
    clase: 'fraude',
    nota: 'Antecedente de fraude. No se calcularon puntos.',
  },
};

const CSS = `
.ev{--ev-bg:#fff;--ev-fg:#1f2937;--ev-mut:#6b7280;--ev-line:#e5e7eb;--ev-card:#f9fafb;--ev-acc:#1f4e3d;
  --ok-bg:#dcfce7;--ok-fg:#14532d;--cond-bg:#fef3c7;--cond-fg:#78350f;--comite-bg:#dbeafe;--comite-fg:#1e3a8a;
  --rech-bg:#fee2e2;--rech-fg:#7f1d1d;--fraude-bg:#450a0a;--fraude-fg:#fff;
  color:var(--ev-fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:760px;margin:0 auto;padding:16px}
@media (prefers-color-scheme:dark){.ev{--ev-bg:#111827;--ev-fg:#f3f4f6;--ev-mut:#9ca3af;--ev-line:#374151;--ev-card:#1f2937;--ev-acc:#6ee7b7;
  --ok-bg:#14532d;--ok-fg:#dcfce7;--cond-bg:#78350f;--cond-fg:#fef3c7;--comite-bg:#1e3a8a;--comite-fg:#dbeafe;
  --rech-bg:#7f1d1d;--rech-fg:#fee2e2;--fraude-bg:#000;--fraude-fg:#fecaca}}
.ev h1{font-size:22px;margin:0 0 4px}
.ev .sub{color:var(--ev-mut);margin:0 0 16px}
.ev label{display:block;font-weight:600;margin-bottom:6px}
.ev select{width:100%;padding:10px;border:1px solid var(--ev-line);border-radius:8px;background:var(--ev-bg);color:var(--ev-fg);font:inherit}
.ev .fila{display:flex;gap:12px;align-items:center;margin-top:12px;flex-wrap:wrap}
.ev button{padding:10px 20px;border:0;border-radius:8px;background:var(--ev-acc);color:#fff;font:inherit;font-weight:600;cursor:pointer}
@media (prefers-color-scheme:dark){.ev button{color:#064e3b}}
.ev button:disabled{opacity:.5;cursor:not-allowed}
.ev button.sec{background:transparent;color:var(--ev-fg);border:1px solid var(--ev-line)}
.ev .info{color:var(--ev-mut);font-size:14px}
.ev .aviso{margin-top:12px;padding:12px;border-radius:8px;background:var(--rech-bg);color:var(--rech-fg)}
.ev .estatus{margin-top:20px;padding:16px;border-radius:12px;display:flex;gap:14px;align-items:center}
.ev .estatus .sim{font-size:28px;font-weight:700;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.55);flex:none}
.ev .estatus h2{margin:0;font-size:20px}
.ev .estatus p{margin:2px 0 0}
.ev .ok{background:var(--ok-bg);color:var(--ok-fg)}
.ev .cond{background:var(--cond-bg);color:var(--cond-fg)}
.ev .comite{background:var(--comite-bg);color:var(--comite-fg)}
.ev .rech{background:var(--rech-bg);color:var(--rech-fg)}
.ev .fraude{background:var(--fraude-bg);color:var(--fraude-fg)}
.ev .monto{margin-top:16px;padding:14px 16px;border:1px solid var(--ev-line);border-radius:12px;background:var(--ev-card)}
.ev .monto .n{font-size:26px;font-weight:700}
.ev table{width:100%;border-collapse:collapse;margin-top:8px}
.ev th,.ev td{text-align:left;padding:8px;border-bottom:1px solid var(--ev-line)}
.ev td.num,.ev th.num{text-align:right;font-variant-numeric:tabular-nums}
.ev tfoot td{font-weight:700;border-bottom:0}
.ev .barra{height:8px;border-radius:4px;background:var(--ev-line);overflow:hidden;min-width:70px}
.ev .barra i{display:block;height:100%;background:var(--ev-acc)}
.ev ul{margin:6px 0 0;padding-left:20px}
.ev h3{margin:20px 0 4px;font-size:16px}
.ev .scroll{overflow-x:auto}
`;

const sumaMax = (parametros, claves) => claves.reduce((t, k) => t + Number(parametros[k] ?? 0), 0);
const lista = (texto) => (texto ? texto.split(';').map((t) => t.trim()).filter(Boolean) : []);

export default function Evaluar() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [parametros, setParametros] = useState({});
  const [seleccion, setSeleccion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const [sol, par] = await Promise.all([
      supabase
        .from('solicitudes')
        .select('id, monto, cultivo, creado_en, acreditados(nombre, rfc)')
        .eq('estatus', 'borrador')
        .order('creado_en', { ascending: false }),
      supabase.from('parametros').select('clave, valor'),
    ]);
    if (sol.error || par.error) {
      setError('No se pudieron cargar los datos: ' + (sol.error || par.error).message);
    } else {
      setSolicitudes(sol.data || []);
      setParametros(Object.fromEntries((par.data || []).map((p) => [p.clave, Number(p.valor)])));
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const elegida = useMemo(() => solicitudes.find((s) => s.id === seleccion), [solicitudes, seleccion]);

  async function evaluar() {
    if (!elegida || evaluando) return;
    const ok = window.confirm(
      'Al evaluar, la solicitud cambia de estatus y el analista ya no podrá editarla. ' +
        'Solo el gerente puede reabrirla. ¿Evaluar ahora?'
    );
    if (!ok) return;

    setEvaluando(true);
    setError('');
    setResultado(null);

    const { data, error: errRpc } = await supabase.rpc('evaluar_solicitud', { p_solicitud_id: elegida.id });
    if (errRpc) {
      setError(errRpc.message);
      setEvaluando(false);
      return;
    }
    const fila = Array.isArray(data) ? data[0] : data;

    // Desglose guardado por la función en la evaluación
    const det = await supabase
      .from('evaluaciones')
      .select('puntos, puntos_total, version_reglas')
      .eq('solicitud_id', elegida.id)
      .maybeSingle();

    setResultado({
      fila,
      puntos: det.data?.puntos || null,
      version: det.data?.version_reglas ?? null,
      solicitud: elegida,
    });
    setSolicitudes((prev) => prev.filter((s) => s.id !== elegida.id));
    setSeleccion('');
    setEvaluando(false);
  }

  const etiqueta = (s) =>
    [s.acreditados?.nombre || 'Sin nombre', s.acreditados?.rfc, MXN.format(s.monto), s.cultivo]
      .filter(Boolean)
      .join(' · ');

  return (
    <div className="ev">
      <style>{CSS}</style>
      <h1>Evaluar solicitud</h1>
      <p className="sub">Elige al solicitante y evalúa con la matriz de riesgo vigente.</p>

      <label htmlFor="ev-sel">Solicitante</label>
      <select
        id="ev-sel"
        value={seleccion}
        onChange={(e) => setSeleccion(e.target.value)}
        disabled={cargando || evaluando || solicitudes.length === 0}
      >
        <option value="">
          {cargando
            ? 'Cargando…'
            : solicitudes.length === 0
              ? 'No hay solicitudes en borrador'
              : 'Selecciona una solicitud'}
        </option>
        {solicitudes.map((s) => (
          <option key={s.id} value={s.id}>
            {etiqueta(s)}
          </option>
        ))}
      </select>

      <div className="fila">
        <button type="button" onClick={evaluar} disabled={!elegida || evaluando}>
          {evaluando ? 'Evaluando…' : 'Evaluar'}
        </button>
        {elegida && <span className="info">Monto solicitado: {MXN.format(elegida.monto)}</span>}
      </div>

      {error && (
        <div className="aviso" role="alert">
          {error}
        </div>
      )}

      {resultado && <Resultado r={resultado} parametros={parametros} onOtra={() => setResultado(null)} />}
    </div>
  );
}

function Resultado({ r, parametros, onOtra }) {
  const { fila, puntos, version, solicitud } = r;
  const est = ESTATUS[fila.estatus] || { texto: fila.estatus, simbolo: '?', clase: 'comite', nota: '' };
  const solicitado = Number(solicitud.monto);
  const reduccion = Number(fila.reduccion || 0);

  let montoTexto;
  let montoNota;
  if (fila.estatus === 'aprobada') {
    montoTexto = MXN.format(solicitado);
    montoNota = 'Monto solicitado completo.';
  } else if (fila.estatus === 'aprobada_condicional') {
    montoTexto = MXN.format(Number(fila.monto_sugerido));
    montoNota =
      reduccion > 0
        ? `Reducción de ${Math.round(reduccion * 100)}% sobre ${MXN.format(solicitado)}.`
        : 'Sin reducción de monto.';
  } else if (fila.estatus === 'pre_aprobada_comite') {
    montoTexto = 'Pendiente de Comité';
    montoNota = `El Comité decidirá sobre ${MXN.format(solicitado)}.`;
  } else {
    montoTexto = 'No aplica';
    montoNota = 'La solicitud no se autoriza.';
  }

  const motivos = lista(fila.motivos);
  const total = fila.puntos;
  const maxTotal = CRITERIOS.reduce((t, c) => t + sumaMax(parametros, c.max), 0);

  return (
    <section aria-live="polite">
      <div className={`estatus ${est.clase}`}>
        <div className="sim" aria-hidden="true">
          {est.simbolo}
        </div>
        <div>
          <h2>{est.texto}</h2>
          <p>{est.nota}</p>
        </div>
      </div>

      <div className="monto">
        <div className="info">Monto autorizado</div>
        <div className="n">{montoTexto}</div>
        <div className="info">{montoNota}</div>
      </div>

      {motivos.length > 0 && (
        <>
          <h3>{fila.estatus === 'aprobada' ? 'Observaciones' : 'Motivos'}</h3>
          <ul>
            {motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Puntos por criterio</h3>
      {puntos ? (
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>Criterio</th>
                <th className="num">Puntos</th>
                <th className="num">Máximo</th>
                <th aria-label="Avance" />
              </tr>
            </thead>
            <tbody>
              {CRITERIOS.map((c) => {
                const max = sumaMax(parametros, c.max);
                const val = Number(puntos[c.clave] ?? 0);
                return (
                  <tr key={c.clave}>
                    <td>{c.nombre}</td>
                    <td className="num">{val}</td>
                    <td className="num">{max || '—'}</td>
                    <td>
                      <div className="barra" aria-hidden="true">
                        <i style={{ width: max ? `${Math.min(100, (val / max) * 100)}%` : 0 }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{total != null ? Number(total) : '—'}</td>
                <td className="num">{maxTotal || '—'}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="info">
          {fila.estatus === 'rechazada_fraude'
            ? 'No se calcularon puntos porque el antecedente de fraude se revisa primero.'
            : 'No hay desglose disponible.'}
        </p>
      )}

      <div className="fila">
        <button type="button" className="sec" onClick={onOtra}>
          Evaluar otra solicitud
        </button>
        {version != null && <span className="info">Reglas versión {version}</span>}
      </div>
    </section>
  );
}
