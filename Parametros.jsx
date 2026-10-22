// Pantalla "Parámetros" (solo gerente): ver y cambiar puntos y umbrales de la matriz.
// Cada cambio exige un motivo, queda en el historial y sube el número de versión de reglas.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { FECHA, mensajeError } from './util';

// Los once puntos máximos de los ocho criterios deben sumar 100 (la base también lo valida).
const MAXIMOS = [
  'pt_zona_baja', 'pt_agua_seguro', 'pt_cap_a', 'pt_ali_0', 'pt_venta_contrato', 'pt_margen_a',
  'pt_seguro_full', 'pt_aforo_a', 'pt_buro_a', 'pt_conc_a', 'pt_hist_a',
];

const grupoDe = (clave) =>
  clave.startsWith('pt_') ? 'Puntos por criterio' : /^(pts_|red_)/.test(clave) ? 'Umbrales de la matriz' : 'Tramos y límites';
const ORDEN = ['Umbrales de la matriz', 'Tramos y límites', 'Puntos por criterio'];

export default function Parametros() {
  const [filas, setFilas] = useState([]);
  const [original, setOriginal] = useState({});
  const [valores, setValores] = useState({});
  const [motivo, setMotivo] = useState('');
  const [historial, setHistorial] = useState([]);
  const [version, setVersion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    const [p, h, v] = await Promise.all([
      supabase.from('parametros').select('clave, valor, descripcion').order('clave'),
      supabase.from('parametros_historial').select('id, clave, valor_anterior, valor_nuevo, motivo, fecha').order('fecha', { ascending: false }).limit(15),
      supabase.from('reglas_version').select('version').order('version', { ascending: false }).limit(1),
    ]);
    if (p.error) setError('No se pudieron cargar los parámetros: ' + mensajeError(p.error));
    else {
      const o = Object.fromEntries((p.data || []).map((x) => [x.clave, Number(x.valor)]));
      setFilas(p.data || []);
      setOriginal(o);
      setValores(Object.fromEntries(Object.entries(o).map(([k, n]) => [k, String(n)])));
    }
    setHistorial(h.data || []);
    setVersion(v.data?.[0]?.version ?? null);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambios = useMemo(() => {
    const c = {};
    for (const [k, t] of Object.entries(valores)) {
      if (t.trim() === '') continue;
      const n = Number(t);
      if (Number.isFinite(n) && n !== original[k]) c[k] = n;
    }
    return c;
  }, [valores, original]);

  const suma = MAXIMOS.reduce((t, k) => {
    const n = Number(valores[k]);
    return t + (Number.isFinite(n) ? n : 0);
  }, 0);
  const sumaMal = Math.abs(suma - 100) > 1e-9;
  const nCambios = Object.keys(cambios).length;

  async function guardar() {
    setError('');
    setExito('');
    for (const [k, t] of Object.entries(valores)) {
      const n = Number(t);
      if (t.trim() === '' || !Number.isFinite(n) || n < 0) return setError(`El valor de ${k} debe ser un número de 0 o mayor.`);
    }
    if (nCambios === 0) return setError('No hay cambios que guardar.');
    if (sumaMal) return setError(`Los puntos máximos de los ocho criterios deben sumar 100 (ahora suman ${suma}).`);
    if (motivo.trim().length < 10) return setError('Escribe el motivo del cambio (mínimo 10 caracteres).');
    if (!window.confirm(`Se cambiarán ${nCambios} parámetro(s) y subirá la versión de reglas. ¿Continuar?`)) return;

    setGuardando(true);
    const r = await supabase.rpc('actualizar_parametros', { p_cambios: cambios, p_motivo: motivo.trim() });
    if (r.error) setError(mensajeError(r.error));
    else {
      setExito('Parámetros actualizados. Las nuevas evaluaciones usarán la nueva versión de reglas.');
      setMotivo('');
      await cargar();
    }
    setGuardando(false);
  }

  return (
    <div className="pantalla">
      <h1>Parámetros de la matriz</h1>
      <p className="sub">
        Versión de reglas vigente: <strong>{version ?? '—'}</strong>. Las solicitudes ya evaluadas conservan la versión con la que
        se calcularon.
      </p>

      {cargando ? (
        <p className="info">Cargando…</p>
      ) : (
        <>
          <div className={sumaMal ? 'aviso' : 'exito'} role="status" style={{ marginTop: 0 }}>
            Suma de los puntos máximos de los ocho criterios: <strong>{suma}</strong> {sumaMal ? '(debe ser 100)' : '(correcto)'}
          </div>

          {ORDEN.map((g) => (
            <div className="bloque" key={g}>
              <h3>{g}</h3>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th style={{ width: 130 }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas
                      .filter((p) => grupoDe(p.clave) === g)
                      .map((p) => {
                        const cambio = cambios[p.clave] !== undefined;
                        return (
                          <tr key={p.clave}>
                            <td>
                              <label htmlFor={'par-' + p.clave} style={{ fontWeight: 400, margin: 0 }}>
                                {p.descripcion || p.clave}
                                {/^(PROPUESTA|PLACEHOLDER)/.test(p.descripcion || '') && <span className="etq">por confirmar</span>}
                              </label>
                              <div className="ayuda">{p.clave}</div>
                            </td>
                            <td>
                              <input
                                id={'par-' + p.clave}
                                type="number"
                                step="any"
                                min="0"
                                value={valores[p.clave] ?? ''}
                                onChange={(e) => setValores((prev) => ({ ...prev, [p.clave]: e.target.value }))}
                                style={cambio ? { borderColor: 'var(--ev-acc)', borderWidth: 2 } : undefined}
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="bloque">
            <h3>Guardar cambios</h3>
            <label htmlFor="par-motivo">Motivo del cambio (mínimo 10 caracteres)</label>
            <textarea id="par-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <div className="fila">
              <button type="button" onClick={guardar} disabled={guardando || nCambios === 0}>
                {guardando ? 'Guardando…' : `Guardar ${nCambios} cambio(s)`}
              </button>
              <button type="button" className="btn2" onClick={cargar} disabled={guardando}>
                Descartar cambios
              </button>
            </div>
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

          <div className="bloque">
            <h3>Últimos cambios</h3>
            {historial.length === 0 ? (
              <p className="info">Todavía no hay cambios registrados.</p>
            ) : (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Parámetro</th>
                      <th className="num">Antes</th>
                      <th className="num">Después</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((h) => (
                      <tr key={h.id}>
                        <td>{FECHA(h.fecha)}</td>
                        <td>{h.clave}</td>
                        <td className="num">{Number(h.valor_anterior)}</td>
                        <td className="num">{Number(h.valor_nuevo)}</td>
                        <td>{h.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
