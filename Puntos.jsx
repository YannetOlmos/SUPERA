// Tabla de puntos por criterio (la usan Evaluar y Solicitudes).
// Los máximos salen de la tabla parametros: si el gerente los cambia, se actualizan solos.
export const CRITERIOS = [
  { clave: 'clima', nombre: 'Exposición climática', max: ['pt_zona_baja', 'pt_agua_seguro'] },
  { clave: 'capacidad', nombre: 'Capacidad de pago', max: ['pt_cap_a', 'pt_ali_0'] },
  { clave: 'precio', nombre: 'Precio y comercialización', max: ['pt_venta_contrato', 'pt_margen_a'] },
  { clave: 'seguro', nombre: 'Seguro agrícola', max: ['pt_seguro_full'] },
  { clave: 'garantias', nombre: 'Garantías', max: ['pt_aforo_a'] },
  { clave: 'buro', nombre: 'Buró + MOP', max: ['pt_buro_a'] },
  { clave: 'concentracion', nombre: 'Concentración de cartera', max: ['pt_conc_a'] },
  { clave: 'historial', nombre: 'Historial interno', max: ['pt_hist_a'] },
];

export const sumaMax = (parametros, claves) => claves.reduce((t, k) => t + Number(parametros[k] ?? 0), 0);

export default function TablaPuntos({ puntos, total, parametros }) {
  const maxTotal = CRITERIOS.reduce((t, c) => t + sumaMax(parametros, c.max), 0);
  return (
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
            const val = Number(puntos?.[c.clave] ?? 0);
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
  );
}
