// Pantalla "Evaluar": elegir solicitante -> Evaluar -> estatus, monto autorizado y puntos por criterio.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { ESTATUS, MXN, lista, mensajeError, uno, useParametros } from './util';
import TablaPuntos from './Puntos';

export default function Evaluar({ inicial, onVer }) {
  const parametros = useParametros();
  const [solicitudes, setSolicitudes] = useState([]);
  const [seleccion, setSeleccion] = useState(inicial || '');
  const [cargando, setCargando] = useState(true);
  const [evaluando, setEvaluando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    const sol = await supabase
      .from('solicitudes')
      .select('id, monto, cultivo, creado_en, acreditados(nombre, rfc)')
      .eq('estatus', 'borrador')
      .order('creado_en', { ascending: false });
    if (sol.error) setError('No se pudieron cargar las solicitudes: ' + mensajeError(sol.error));
    else setSolicitudes(sol.data || []);
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
      setError(mensajeError(errRpc));
      setEvaluando(false);
      return;
    }
    const fila = Array.isArray(data) ? data[0] : data;

    const det = await supabase
      .from('evaluaciones')
      .select('puntos, puntos_total, version_reglas')
      .eq('solicitud_id', elegida.id)
      .maybeSingle();

    setResultado({ fila, puntos: det.data?.puntos || null, version: det.data?.version_reglas ?? null, solicitud: elegida });
    setSolicitudes((prev) => prev.filter((s) => s.id !== elegida.id));
    setSeleccion('');
    setEvaluando(false);
  }

  const etiqueta = (s) =>
    [uno(s.acreditados)?.nombre || 'Sin nombre', uno(s.acreditados)?.rfc, MXN.format(s.monto), s.cultivo].filter(Boolean).join(' · ');

  return (
    <div className="pantalla">
      <h1>Evaluar solicitud</h1>
      <p className="sub">Elige al solicitante y evalúa con la matriz de riesgo vigente.</p>

      <label htmlFor="ev-sel">Solicitante</label>
      <select id="ev-sel" value={seleccion} onChange={(e) => setSeleccion(e.target.value)} disabled={cargando || evaluando || solicitudes.length === 0}>
        <option value="">
          {cargando ? 'Cargando…' : solicitudes.length === 0 ? 'No hay solicitudes en borrador' : 'Selecciona una solicitud'}
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

      {resultado && <Resultado r={resultado} parametros={parametros} onOtra={() => setResultado(null)} onVer={onVer} />}
    </div>
  );
}

export function montoAutorizado(estatus, solicitado, reduccion, sugerido) {
  const red = Number(reduccion || 0);
  if (estatus === 'aprobada') return { texto: MXN.format(solicitado), nota: 'Monto solicitado completo.' };
  if (estatus === 'aprobada_condicional')
    return {
      texto: MXN.format(Number(sugerido)),
      nota: red > 0 ? `Reducción de ${Math.round(red * 100)}% sobre ${MXN.format(solicitado)}.` : 'Sin reducción de monto.',
    };
  if (estatus === 'pre_aprobada_comite')
    return { texto: 'Pendiente de Comité', nota: `El Comité decidirá sobre ${MXN.format(solicitado)}.` };
  return { texto: 'No aplica', nota: 'La solicitud no se autoriza.' };
}

function Resultado({ r, parametros, onOtra, onVer }) {
  const { fila, puntos, version, solicitud } = r;
  const est = ESTATUS[fila.estatus] || { texto: fila.estatus, simbolo: '?', clase: 'comite', nota: '' };
  const m = montoAutorizado(fila.estatus, Number(solicitud.monto), fila.reduccion, fila.monto_sugerido);
  const motivos = lista(fila.motivos);

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
        <div className="n">{m.texto}</div>
        <div className="info">{m.nota}</div>
      </div>

      {motivos.length > 0 && (
        <>
          <h3>{fila.estatus === 'aprobada' ? 'Observaciones' : 'Motivos'}</h3>
          <ul>
            {motivos.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </>
      )}

      <h3>Puntos por criterio</h3>
      {puntos ? (
        <TablaPuntos puntos={puntos} total={fila.puntos} parametros={parametros} />
      ) : (
        <p className="info">
          {fila.estatus === 'rechazada_fraude'
            ? 'No se calcularon puntos porque el antecedente de fraude se revisa primero.'
            : 'No hay desglose disponible.'}
        </p>
      )}

      <div className="fila">
        <button type="button" className="btn2" onClick={onOtra}>
          Evaluar otra solicitud
        </button>
        {onVer && (
          <button type="button" className="btn2" onClick={onVer}>
            Ver en Solicitudes
          </button>
        )}
        {version != null && <span className="info">Reglas versión {version}</span>}
      </div>
    </section>
  );
}
