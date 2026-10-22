import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export const FECHA = (iso) =>
  iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '';

// Cada estatus lleva color Y texto (y un símbolo) para no depender solo del color.
export const ESTATUS = {
  borrador: { texto: 'Borrador', simbolo: '·', clase: 'gris', nota: 'Pendiente de evaluar.' },
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
  cancelada: { texto: 'Cancelada', simbolo: '–', clase: 'gris', nota: 'El solicitante desistió o no completó el trámite.' },
};

export const ROLES = { analista: 'Analista', gerente: 'Gerente de crédito', comite: 'Comité' };

export const lista = (texto) => (texto ? String(texto).split(';').map((t) => t.trim()).filter(Boolean) : []);
export const uno = (x) => (Array.isArray(x) ? x[0] : x) || null; // PostgREST: objeto o arreglo

// Mensajes de error entendibles
export function mensajeError(error) {
  if (!error) return '';
  const m = error.message || String(error);
  if (error.code === '23505') return 'Ese RFC ya está registrado (puede pertenecer a otro analista).';
  if (error.code === '42501' || /permission denied|row-level security/i.test(m))
    return 'No tienes permiso para esta acción.';
  return m;
}

// Valores de la tabla parametros, como {clave: número}
export function useParametros() {
  const [parametros, setParametros] = useState({});
  useEffect(() => {
    let vivo = true;
    supabase
      .from('parametros')
      .select('clave, valor')
      .then(({ data }) => {
        if (vivo) setParametros(Object.fromEntries((data || []).map((p) => [p.clave, Number(p.valor)])));
      });
    return () => {
      vivo = false;
    };
  }, []);
  return parametros;
}
