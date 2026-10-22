// Pantalla "Capturar solicitud" (solo analistas).
// Guarda acreditado + solicitud + datos de evaluación. NO calcula nada: eso lo hace Evaluar.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MXN, mensajeError, uno } from './util';

const SN = [
  { v: '', t: '— Sin capturar —' },
  { v: 'si', t: 'Sí' },
  { v: 'no', t: 'No' },
];

// t: bool | dinero | entero | pct | enum | texto.  pct se escribe en % (12.5) y se guarda como fracción (0.125).
const BLOQUES = [
  {
    titulo: 'Antecedentes y actividad',
    campos: [
      { k: 'antecedente_fraude', t: 'bool', etq: '¿Tiene antecedente de fraude?', ayuda: 'Si es Sí, la solicitud se rechaza por fraude sin calcular puntos.' },
      { k: 'ingresos_actividad', t: 'bool', etq: '¿Tiene ingresos actuales de la actividad relacionada?' },
    ],
  },
  {
    titulo: 'Cifras financieras (anuales, en pesos)',
    campos: [
      { k: 'ingresos_anuales', t: 'dinero', etq: 'Ingresos anuales', ayuda: 'Con rendimiento y precio conservadores.' },
      { k: 'costos_anuales', t: 'dinero', etq: 'Costos anuales' },
      { k: 'pago_anual_credito', t: 'dinero', etq: 'Pago anual del crédito solicitado', mayorCero: true },
      { k: 'pagos_deuda_anual', t: 'dinero', etq: 'Pagos anuales de deuda', ayuda: 'Incluye el crédito solicitado.' },
      { k: 'pasivos_totales', t: 'dinero', etq: 'Pasivos totales' },
      { k: 'activos_totales', t: 'dinero', etq: 'Activos totales' },
      { k: 'dias_desfase', t: 'entero', etq: 'Días de desfase', ayuda: 'Días que el pago vence antes de cobrar. 0 si está alineado.' },
    ],
  },
  {
    titulo: 'Clima y comercialización',
    campos: [
      { k: 'zona_climatica', t: 'enum', etq: 'Zona de exposición climática', op: ['Baja', 'Moderada', 'Alta'] },
      { k: 'fuente_agua', t: 'enum', etq: 'Fuente de agua', op: ['Riego seguro', 'Riego variable', 'Temporal'] },
      {
        k: 'forma_venta',
        t: 'enum',
        etq: 'Forma de venta',
        op: ['Contrato con precio pactado', 'Comprador recurrente sin contrato', 'Venta libre a precio spot'],
      },
      { k: 'cultivo_riesgo', t: 'bool', etq: '¿Es cultivo de riesgo?' },
      { k: 'pct_cultivo_riesgo', t: 'pct', etq: '% del ingreso en cultivo de riesgo', solo: (f) => f.cultivo_riesgo === 'si' },
      { k: 'diversificacion_verificada', t: 'bool', etq: '¿Diversificación verificada?', solo: (f) => f.cultivo_riesgo === 'si' },
    ],
  },
  {
    titulo: 'Seguro agrícola',
    campos: [
      { k: 'seguro_cobertura_pct', t: 'pct', etq: 'Cobertura del seguro (% del monto)', ayuda: '0 si no tiene seguro. 100 = cubre todo el monto.', sinTope: true },
      { k: 'seguro_vigente', t: 'bool', etq: '¿Vigente todo el plazo?' },
      { k: 'seguro_endosado', t: 'bool', etq: '¿Endosado a Supera?' },
    ],
  },
  {
    titulo: 'Garantías',
    campos: [
      { k: 'garantia_liquida', t: 'dinero', etq: 'Garantía líquida (pesos)' },
      { k: 'fega_pct', t: 'pct', etq: 'Cobertura FEGA (% del monto)' },
      { k: 'avaluo_hipoteca', t: 'dinero', etq: 'Avalúo de la hipoteca (pesos)', ayuda: 'El sistema aplica el factor computable de la matriz.' },
    ],
  },
  {
    titulo: 'Buró de crédito',
    campos: [
      { k: 'score_buro', t: 'entero', etq: 'Score de Buró', ayuda: 'Déjalo vacío si el productor no tiene Buró.', sinTope: true },
      {
        k: 'evidencia_alternativa',
        t: 'bool',
        etq: '¿Hay evidencia alternativa?',
        ayuda: 'Referencias comerciales, proveedores, compradores.',
        solo: (f) => f.score_buro === '',
      },
      { k: 'atrasos_buro_12m', t: 'entero', etq: 'Atrasos en Buró (últimos 12 meses)' },
      { k: 'max_dias_atraso_buro', t: 'entero', etq: 'Máximo de días de atraso en Buró' },
      { k: 'quebranto_buro', t: 'bool', etq: '¿Quebranto en Buró?' },
    ],
  },
  {
    titulo: 'Historial con Supera',
    campos: [
      { k: 'ciclos_puntuales_supera', t: 'entero', etq: 'Ciclos puntuales con Supera', ayuda: '0 si es cliente nuevo.' },
      { k: 'atrasos_supera_12m', t: 'entero', etq: 'Atrasos con Supera (últimos 12 meses)' },
      { k: 'max_dias_atraso_supera', t: 'entero', etq: 'Máximo de días de atraso con Supera' },
      { k: 'reestructura_previa', t: 'bool', etq: '¿Reestructura previa?' },
      { k: 'quebranto_supera', t: 'bool', etq: '¿Quebranto con Supera?' },
    ],
  },
  {
    titulo: 'Concentración de cartera',
    campos: [
      { k: 'pct_cartera_cultivo_region', t: 'pct', etq: '% de la cartera en este cultivo y región' },
      { k: 'foco_rojo', t: 'bool', etq: '¿Foco rojo?' },
    ],
  },
];
const TODOS = BLOQUES.flatMap((b) => b.campos);

const vacio = () => ({ ...Object.fromEntries(TODOS.map((c) => [c.k, ''])), evidencia_juicio: '' });
const RFC_OK = /^[A-Z&Ñ0-9]{12,13}$/;
const limpio = (n) => String(Number(Number(n).toFixed(6)));

// Valores de la base -> texto del formulario
function aFormulario(ev) {
  const f = vacio();
  if (!ev) return f;
  for (const c of TODOS) {
    const v = ev[c.k];
    if (v === null || v === undefined) continue;
    if (c.t === 'bool') f[c.k] = v ? 'si' : 'no';
    else if (c.t === 'pct') f[c.k] = limpio(Number(v) * 100);
    else f[c.k] = String(v);
  }
  f.evidencia_juicio = ev.evidencia_juicio || '';
  return f;
}

// Formulario -> valores para la base (vacío = null). Devuelve { datos, errores }
function aBase(f) {
  const datos = {};
  const errores = [];
  for (const c of TODOS) {
    const visible = !c.solo || c.solo(f);
    const t = (f[c.k] ?? '').toString().trim();
    if (!visible || t === '') {
      datos[c.k] = null;
      continue;
    }
    if (c.t === 'bool') datos[c.k] = t === 'si';
    else if (c.t === 'enum') datos[c.k] = t;
    else {
      const n = Number(t.replace(/,/g, ''));
      if (!Number.isFinite(n) || n < 0) {
        errores.push(`${c.etq}: escribe un número válido (0 o mayor).`);
        continue;
      }
      if (c.t === 'entero' && !Number.isInteger(n)) {
        errores.push(`${c.etq}: debe ser un número entero.`);
        continue;
      }
      if (c.mayorCero && n <= 0) {
        errores.push(`${c.etq}: debe ser mayor que 0.`);
        continue;
      }
      if (c.t === 'pct') {
        if (!c.sinTope && n > 100) {
          errores.push(`${c.etq}: debe estar entre 0 y 100.`);
          continue;
        }
        datos[c.k] = Number((n / 100).toFixed(6));
      } else datos[c.k] = n;
    }
  }
  datos.evidencia_juicio = f.evidencia_juicio.trim() || null;
  return { datos, errores };
}

function Campo({ c, valor, onChange }) {
  const id = 'cap-' + c.k;
  let control;
  if (c.t === 'bool')
    control = (
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        {SN.map((o) => (
          <option key={o.v} value={o.v}>
            {o.t}
          </option>
        ))}
      </select>
    );
  else if (c.t === 'enum')
    control = (
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Sin capturar —</option>
        {c.op.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  else
    control = (
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={c.t === 'entero' ? '1' : 'any'}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  return (
    <div>
      <label htmlFor={id}>
        {c.etq}
        {c.t === 'pct' ? ' (%)' : ''}
      </label>
      {control}
      {c.ayuda && <div className="ayuda">{c.ayuda}</div>}
    </div>
  );
}

export default function Capturar({ onListo }) {
  const [borradores, setBorradores] = useState([]);
  const [acreditados, setAcreditados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [solId, setSolId] = useState(null); // solicitud que se está editando
  const [tieneEval, setTieneEval] = useState(false);
  const [acId, setAcId] = useState(''); // '' = nuevo acreditado
  const [nombre, setNombre] = useState('');
  const [rfc, setRfc] = useState('');
  const [grupo, setGrupo] = useState('');
  const [monto, setMonto] = useState('');
  const [cultivo, setCultivo] = useState('');
  const [f, setF] = useState(vacio());

  const cargar = useCallback(async () => {
    setCargando(true);
    const [b, a] = await Promise.all([
      supabase
        .from('solicitudes')
        .select('id, monto, cultivo, creado_en, acreditado_id, acreditados(id, nombre, rfc, grupo_riesgo), evaluaciones(*)')
        .eq('estatus', 'borrador')
        .order('creado_en', { ascending: false }),
      supabase.from('acreditados').select('id, nombre, rfc, grupo_riesgo').order('nombre'),
    ]);
    if (b.error || a.error) setError('No se pudieron cargar los datos: ' + mensajeError(b.error || a.error));
    setBorradores(b.data || []);
    setAcreditados(a.data || []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function nueva() {
    setSolId(null);
    setTieneEval(false);
    setAcId('');
    setNombre('');
    setRfc('');
    setGrupo('');
    setMonto('');
    setCultivo('');
    setF(vacio());
    setError('');
    setExito('');
  }

  function editar(s) {
    const ac = uno(s.acreditados);
    const ev = uno(s.evaluaciones);
    setSolId(s.id);
    setTieneEval(!!ev);
    setAcId(ac?.id || s.acreditado_id);
    setNombre(ac?.nombre || '');
    setRfc(ac?.rfc || '');
    setGrupo(ac?.grupo_riesgo || '');
    setMonto(String(s.monto));
    setCultivo(s.cultivo || '');
    setF(aFormulario(ev));
    setError('');
    setExito('');
  }

  function elegirAcreditado(id) {
    setAcId(id);
    const ac = acreditados.find((x) => x.id === id);
    setNombre(ac?.nombre || '');
    setRfc(ac?.rfc || '');
    setGrupo(ac?.grupo_riesgo || '');
  }

  const cambiar = (k) => (v) => setF((prev) => ({ ...prev, [k]: v }));

  async function guardar() {
    if (guardando) return null;
    setError('');
    setExito('');
    const rfcN = rfc.trim().toUpperCase();
    const montoN = Number(String(monto).replace(/,/g, ''));
    const problemas = [];
    if (!nombre.trim()) problemas.push('Escribe el nombre del acreditado.');
    if (!acId && !RFC_OK.test(rfcN)) problemas.push('El RFC debe tener 12 o 13 caracteres (letras mayúsculas y números, sin espacios).');
    if (!Number.isFinite(montoN) || montoN <= 0) problemas.push('El monto solicitado debe ser mayor que 0.');
    const { datos, errores } = aBase(f);
    problemas.push(...errores);
    if (problemas.length) {
      setError(problemas.join(' '));
      return null;
    }

    setGuardando(true);
    try {
      // 1) acreditado
      let acreditadoId = acId;
      if (!acId) {
        const r = await supabase
          .from('acreditados')
          .insert({ nombre: nombre.trim(), rfc: rfcN, grupo_riesgo: grupo.trim() || null })
          .select('id')
          .single();
        if (r.error) throw r.error;
        acreditadoId = r.data.id;
        setAcId(acreditadoId);
      } else {
        const r = await supabase
          .from('acreditados')
          .update({ nombre: nombre.trim(), grupo_riesgo: grupo.trim() || null })
          .eq('id', acId)
          .select('id');
        if (r.error) throw r.error;
        if (!r.data || r.data.length === 0) throw new Error('No tienes permiso para modificar a este acreditado.');
      }

      // 2) solicitud
      let sid = solId;
      if (!sid) {
        const r = await supabase
          .from('solicitudes')
          .insert({ acreditado_id: acreditadoId, monto: montoN, cultivo: cultivo.trim() || null })
          .select('id')
          .single();
        if (r.error) throw r.error;
        sid = r.data.id;
        setSolId(sid);
      } else {
        const r = await supabase
          .from('solicitudes')
          .update({ monto: montoN, cultivo: cultivo.trim() || null })
          .eq('id', sid)
          .select('id');
        if (r.error) throw r.error;
        if (!r.data || r.data.length === 0) throw new Error('La solicitud ya no se puede editar (ya fue evaluada o no es tuya).');
      }

      // 3) datos de evaluación
      if (tieneEval) {
        const r = await supabase.from('evaluaciones').update(datos).eq('solicitud_id', sid).select('solicitud_id');
        if (r.error) throw r.error;
        if (!r.data || r.data.length === 0) throw new Error('No se pudieron actualizar los datos de evaluación.');
      } else {
        const r = await supabase.from('evaluaciones').insert({ solicitud_id: sid, ...datos });
        if (r.error) throw r.error;
        setTieneEval(true);
      }

      setExito('Solicitud guardada como borrador. Ya puedes evaluarla.');
      await cargar();
      return sid;
    } catch (e) {
      setError(mensajeError(e));
      await cargar();
      return null;
    } finally {
      setGuardando(false);
    }
  }

  async function guardarYEvaluar() {
    const sid = await guardar();
    if (sid && onListo) onListo(sid);
  }

  const editando = !!solId;

  return (
    <div className="pantalla">
      <h1>Capturar solicitud</h1>
      <p className="sub">
        Registra al acreditado, el monto y los datos de la matriz. Puedes guardar incompleto y terminar después: al evaluar,
        el sistema te dice qué falta.
      </p>

      <div className="bloque">
        <h3>Borradores pendientes</h3>
        {cargando ? (
          <p className="info">Cargando…</p>
        ) : borradores.length === 0 ? (
          <p className="info">No tienes borradores. Captura una solicitud nueva abajo.</p>
        ) : (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Acreditado</th>
                  <th className="num">Monto</th>
                  <th>Cultivo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {borradores.map((s) => (
                  <tr key={s.id} className={s.id === solId ? 'sel' : ''}>
                    <td>
                      {uno(s.acreditados)?.nombre} <span className="info">{uno(s.acreditados)?.rfc}</span>
                    </td>
                    <td className="num">{MXN.format(s.monto)}</td>
                    <td>{s.cultivo}</td>
                    <td>
                      <button type="button" className="btn2" onClick={() => editar(s)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="fila">
          <button type="button" className="btn2" onClick={nueva}>
            Nueva solicitud
          </button>
          {editando && <span className="info">Estás editando una solicitud en borrador.</span>}
        </div>
      </div>

      <div className="bloque">
        <h3>Acreditado y solicitud</h3>
        <div className="grid2">
          <div>
            <label htmlFor="cap-ac">Acreditado</label>
            <select id="cap-ac" value={acId} onChange={(e) => elegirAcreditado(e.target.value)} disabled={editando}>
              <option value="">Nuevo acreditado</option>
              {acreditados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} · {a.rfc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cap-nombre">Nombre o razón social</label>
            <input id="cap-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cap-rfc">RFC</label>
            <input
              id="cap-rfc"
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase().replace(/\s/g, ''))}
              disabled={!!acId}
              maxLength={13}
            />
            <div className="ayuda">12 o 13 caracteres. No se puede cambiar después de guardarlo.</div>
          </div>
          <div>
            <label htmlFor="cap-grupo">Grupo de riesgo</label>
            <input id="cap-grupo" value={grupo} onChange={(e) => setGrupo(e.target.value)} />
            <div className="ayuda">Mismo texto = mismo grupo económico (familiares, aval, mismas parcelas).</div>
          </div>
          <div>
            <label htmlFor="cap-monto">Monto solicitado (pesos)</label>
            <input id="cap-monto" type="number" inputMode="decimal" min="0" step="any" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cap-cultivo">Cultivo</label>
            <input id="cap-cultivo" value={cultivo} onChange={(e) => setCultivo(e.target.value)} />
          </div>
        </div>
      </div>

      {BLOQUES.map((b) => (
        <div className="bloque" key={b.titulo}>
          <h3>{b.titulo}</h3>
          <div className="grid2">
            {b.campos
              .filter((c) => !c.solo || c.solo(f))
              .map((c) => (
                <Campo key={c.k} c={c} valor={f[c.k]} onChange={cambiar(c.k)} />
              ))}
          </div>
        </div>
      ))}

      <div className="bloque">
        <h3>Evidencia de los criterios de juicio</h3>
        <label htmlFor="cap-evid">Evidencia que respalda zona, fuente de agua, forma de venta, seguro y concentración</label>
        <textarea id="cap-evid" value={f.evidencia_juicio} onChange={(e) => cambiar('evidencia_juicio')(e.target.value)} />
        <div className="ayuda">Obligatoria para evaluar (mínimo 10 caracteres).</div>
      </div>

      {error && (
        <div className="aviso" role="alert">
          {error}
        </div>
      )}
      {exito && (
        <div className="exito" role="status">
          {exito}
        </div>
      )}

      <div className="fila">
        <button type="button" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar borrador'}
        </button>
        <button type="button" className="btn2" onClick={guardarYEvaluar} disabled={guardando}>
          Guardar e ir a evaluar
        </button>
        <button type="button" className="btn2" onClick={nueva} disabled={guardando}>
          Limpiar formulario
        </button>
      </div>
    </div>
  );
}
