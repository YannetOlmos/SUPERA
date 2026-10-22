// Pantalla "Solicitudes": lista, detalle con puntos y acciones (decidir, reabrir, cancelar) según el rol.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { ESTATUS, FECHA, MXN, ROLES, lista, mensajeError, uno, useParametros } from './util';
import TablaPuntos from './Puntos';
import { montoAutorizado } from './Evaluar';

const FILTROS = [
  { v: 'todas', t: 'Todas' },
  { v: 'borrador', t: 'Borrador' },
  { v: 'pre_aprobada_comite', t: 'Pasa a Comité' },
  { v: 'aprobada_condicional', t: 'Aprobada condicional' },
  { v: 'aprobada', t: 'Aprobada' },
  { v: 'rechazada', t: 'Rechazada' },
  { v: 'rechazada_fraude', t: 'Rechazada por fraude' },
  { v: 'cancelada', t: 'Cancelada' },
];

const Insignia = ({ estatus }) => {
  const e = ESTATUS[estatus] || { texto: estatus, simbolo: '?', clase: 'gris' };
  return (
    <span className={`insignia ${e.clase}`}>
      {e.simbolo} {e.texto}
    </span>
  );
};

export default function Solicitudes({ perfil, inicial }) {
  const rol = perfil.rol;
  const parametros = useParametros();
  const [filas, setFilas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(inicial || null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await supabase
      .from('solicitudes')
      .select('id, monto, cultivo, estatus, creado_en, analista_id, acreditados(nombre, rfc)')
      .order('creado_en', { ascending: false });
    if (r.error) setError('No se pudieron cargar las solicitudes: ' + mensajeError(r.error));
    else {
      setError('');
      setFilas(r.data || []);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => filas.filter((s) => filtro === 'todas' || s.estatus === filtro), [filas, filtro]);
  const actual = filas.find((s) => s.id === sel) || null;

  return (
    <div className="pantalla">
      <h1>Solicitudes</h1>
      <p className="sub">
        {rol === 'comite'
          ? 'Aquí ves las solicitudes que esperan tu decisión y las que ya dictaminaste.'
          : rol === 'analista'
            ? 'Tus solicitudes y su estatus.'
            : 'Todas las solicitudes.'}
      </p>

      <div className="grid2">
        <div>
          <label htmlFor="sol-filtro">Estatus</label>
          <select id="sol-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTROS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="aviso" role="alert">
          {error}
        </div>
      )}

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Acreditado</th>
              <th className="num">Monto</th>
              <th>Cultivo</th>
              <th>Estatus</th>
              <th>Creada</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan="5" className="info">
                  Cargando…
                </td>
              </tr>
            ) : visibles.length === 0 ? (
              <tr>
                <td colSpan="5" className="info">
                  No hay solicitudes con este filtro.
                </td>
              </tr>
            ) : (
              visibles.map((s) => (
                <tr
                  key={s.id}
                  className={`clic ${s.id === sel ? 'sel' : ''}`}
                  tabIndex={0}
                  onClick={() => setSel(s.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(s.id)}
                >
                  <td>
                    {uno(s.acreditados)?.nombre} <span className="info">{uno(s.acreditados)?.rfc}</span>
                  </td>
                  <td className="num">{MXN.format(s.monto)}</td>
                  <td>{s.cultivo}</td>
                  <td>
                    <Insignia estatus={s.estatus} />
                  </td>
                  <td>{FECHA(s.creado_en)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {actual && (
        <Detalle key={actual.id} s={actual} perfil={perfil} parametros={parametros} onCambio={cargar} onCerrar={() => setSel(null)} />
      )}
    </div>
  );
}

function Detalle({ s, perfil, parametros, onCambio, onCerrar }) {
  const rol = perfil.rol;
  const [ev, setEv] = useState(null);
  const [decs, setDecs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [accion, setAccion] = useState(''); // '', 'decidir', 'reabrir'
  const [decision, setDecision] = useState('');
  const [texto, setTexto] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const [e, d] = await Promise.all([
      supabase
        .from('evaluaciones')
        .select('puntos, puntos_total, banda, vetos, topes_comite, topes_condicional, reduccion_monto, monto_sugerido, version_reglas, evaluado_en')
        .eq('solicitud_id', s.id)
        .maybeSingle(),
      supabase.from('decisiones').select('id, rol, decision, comentario, fecha').eq('solicitud_id', s.id).order('fecha'),
    ]);
    setEv(e.data || null);
    setDecs(d.data || []);
    setCargando(false);
  }, [s.id]);

  useEffect(() => {
    cargar();
  }, [cargar, s.estatus]);

  const evaluada = ev && ev.evaluado_en && s.estatus !== 'borrador';
  const opcionesDecision =
    s.estatus === 'pre_aprobada_comite' && rol === 'comite'
      ? [
          ['aprobada', 'Aprobar'],
          ['aprobada_condicional', 'Aprobar con condiciones'],
          ['rechazada', 'Rechazar'],
        ]
      : s.estatus === 'aprobada_condicional' && rol === 'gerente'
        ? [
            ['aprobada', 'Condiciones cumplidas: aprobar'],
            ['rechazada', 'Condiciones no cumplidas: rechazar'],
          ]
        : [];
  const puedeReabrir =
    rol === 'gerente' && !['borrador', 'cancelada', 'rechazada_fraude'].includes(s.estatus);
  const puedeCancelar =
    ['borrador', 'pre_aprobada_comite', 'aprobada_condicional'].includes(s.estatus) &&
    (rol === 'gerente' || (rol === 'analista' && s.analista_id === perfil.id));

  async function ejecutar(fn, args, mensaje) {
    setTrabajando(true);
    setError('');
    setExito('');
    const r = await supabase.rpc(fn, args);
    if (r.error) setError(mensajeError(r.error));
    else {
      setExito(mensaje);
      setAccion('');
      setTexto('');
      setDecision('');
      await onCambio();
    }
    setTrabajando(false);
  }

  const enviarDecision = () => {
    if (!decision) return setError('Elige una decisión.');
    if (texto.trim().length < 10) return setError('Escribe un comentario de al menos 10 caracteres.');
    ejecutar('decidir_solicitud', { p_solicitud_id: s.id, p_decision: decision, p_comentario: texto.trim() }, 'Decisión registrada.');
  };
  const enviarReabrir = () => {
    if (texto.trim().length < 15) return setError('Escribe el motivo (mínimo 15 caracteres).');
    ejecutar('reabrir_solicitud', { p_solicitud_id: s.id, p_motivo: texto.trim() }, 'Solicitud reabierta: vuelve a borrador.');
  };
  const cancelar = () => {
    if (!window.confirm('¿Cancelar esta solicitud? Esta acción no se puede deshacer desde la app.')) return;
    ejecutar('cancelar_solicitud', { p_solicitud_id: s.id }, 'Solicitud cancelada.');
  };

  const est = ESTATUS[s.estatus] || { texto: s.estatus, simbolo: '?', clase: 'gris', nota: '' };
  const m = evaluada ? montoAutorizado(s.estatus, Number(s.monto), ev.reduccion_monto, ev.monto_sugerido) : null;

  return (
    <section className="bloque" aria-live="polite">
      <div className="fila" style={{ justifyContent: 'space-between', marginTop: 0 }}>
        <h3 style={{ margin: 0 }}>
          {uno(s.acreditados)?.nombre} · {MXN.format(s.monto)}
        </h3>
        <button type="button" className="btn2" onClick={onCerrar}>
          Cerrar
        </button>
      </div>

      <div className={`estatus ${est.clase}`} style={{ marginTop: 12 }}>
        <div className="sim" aria-hidden="true">
          {est.simbolo}
        </div>
        <div>
          <h2>{est.texto}</h2>
          <p>{est.nota}</p>
        </div>
      </div>

      {cargando ? (
        <p className="info">Cargando detalle…</p>
      ) : (
        <>
          {m && (
            <div className="monto">
              <div className="info">Monto autorizado</div>
              <div className="n">{m.texto}</div>
              <div className="info">{m.nota}</div>
            </div>
          )}

          {evaluada && (
            <>
              {ev.vetos && (
                <>
                  <h3>Vetos</h3>
                  <ul>
                    {lista(ev.vetos).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
              {ev.topes_comite && (
                <>
                  <h3>Topes que mandan a Comité</h3>
                  <ul>
                    {lista(ev.topes_comite).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
              {ev.topes_condicional && (
                <>
                  <h3>Topes que dejan en condicional</h3>
                  <ul>
                    {lista(ev.topes_condicional).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </>
              )}
              <h3>Puntos por criterio</h3>
              {ev.puntos ? (
                <TablaPuntos puntos={ev.puntos} total={ev.puntos_total} parametros={parametros} />
              ) : (
                <p className="info">No se calcularon puntos.</p>
              )}
              <p className="info">
                Evaluada el {FECHA(ev.evaluado_en)} con reglas versión {ev.version_reglas}.
              </p>
            </>
          )}
          {!evaluada && s.estatus === 'borrador' && <p className="info">Aún no se evalúa. Ve a la pestaña Evaluar.</p>}

          {decs.length > 0 && (
            <>
              <h3>Decisiones</h3>
              <ul>
                {decs.map((d) => (
                  <li key={d.id}>
                    <strong>{ROLES[d.rol] || d.rol}</strong> · {(ESTATUS[d.decision] || {}).texto || d.decision} · {FECHA(d.fecha)}
                    <br />
                    <span className="info">{d.comentario}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

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

      {accion === 'decidir' && (
        <div className="bloque">
          <label htmlFor="dec-sel">Decisión</label>
          <select id="dec-sel" value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="">Elige…</option>
            {opcionesDecision.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
          <label htmlFor="dec-txt" style={{ marginTop: 10 }}>
            Comentario (mínimo 10 caracteres)
          </label>
          <textarea id="dec-txt" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="fila">
            <button type="button" onClick={enviarDecision} disabled={trabajando}>
              Registrar decisión
            </button>
            <button type="button" className="btn2" onClick={() => setAccion('')} disabled={trabajando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {accion === 'reabrir' && (
        <div className="bloque">
          <label htmlFor="reab-txt">Motivo para reabrir (mínimo 15 caracteres)</label>
          <textarea id="reab-txt" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="ayuda">La solicitud vuelve a borrador. El resultado anterior queda en la bitácora.</div>
          <div className="fila">
            <button type="button" onClick={enviarReabrir} disabled={trabajando}>
              Reabrir
            </button>
            <button type="button" className="btn2" onClick={() => setAccion('')} disabled={trabajando}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!accion && (opcionesDecision.length > 0 || puedeReabrir || puedeCancelar) && (
        <div className="fila">
          {opcionesDecision.length > 0 && (
            <button type="button" onClick={() => { setAccion('decidir'); setTexto(''); setError(''); setExito(''); }} disabled={trabajando}>
              Dictaminar
            </button>
          )}
          {puedeReabrir && (
            <button type="button" className="btn2" onClick={() => { setAccion('reabrir'); setTexto(''); setError(''); setExito(''); }} disabled={trabajando}>
              Reabrir
            </button>
          )}
          {puedeCancelar && (
            <button type="button" className="peligro" onClick={cancelar} disabled={trabajando}>
              Cancelar solicitud
            </button>
          )}
        </div>
      )}
    </section>
  );
}
