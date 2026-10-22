import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Evaluar from './pantallas/Evaluar.jsx';

const ROLES = { analista: 'Analista', gerente: 'Gerente de crédito', comite: 'Comité' };

function Login() {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setCargando(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    if (err) setError('No se pudo iniciar sesión: ' + err.message);
    setCargando(false);
  }

  return (
    <form onSubmit={entrar} style={{ maxWidth: 360, margin: '80px auto', padding: 16, font: '15px system-ui' }}>
      <h1 style={{ fontSize: 22 }}>Matriz de riesgo · Supera Préstamos</h1>
      <label htmlFor="correo">Correo</label>
      <input id="correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 10, margin: '4px 0 12px', boxSizing: 'border-box' }} />
      <label htmlFor="clave">Contraseña</label>
      <input id="clave" type="password" required value={clave} onChange={(e) => setClave(e.target.value)}
        style={{ display: 'block', width: '100%', padding: 10, margin: '4px 0 12px', boxSizing: 'border-box' }} />
      <button type="submit" disabled={cargando} style={{ padding: '10px 20px' }}>
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>
      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
    </form>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(undefined); // undefined = cargando
  const [perfil, setPerfil] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sesion) {
      setPerfil(null);
      return;
    }
    supabase
      .from('perfiles')
      .select('nombre, rol')
      .eq('id', sesion.user.id)
      .maybeSingle()
      .then(({ data }) => setPerfil(data));
  }, [sesion]);

  if (sesion === undefined) return <p style={{ padding: 16 }}>Cargando…</p>;
  if (!sesion) return <Login />;

  const puedeEvaluar = perfil && (perfil.rol === 'analista' || perfil.rol === 'gerente');

  return (
    <div style={{ font: '15px system-ui' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <strong>Supera Préstamos · Matriz de riesgo</strong>
        <span>
          {perfil ? `${perfil.nombre} (${ROLES[perfil.rol]})` : sesion.user.email}{' '}
          <button type="button" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </span>
      </header>
      {!perfil && (
        <p style={{ padding: 16 }}>
          Tu usuario todavía no tiene perfil asignado. Pide al gerente que te dé de alta con tu rol.
        </p>
      )}
      {perfil && !puedeEvaluar && (
        <p style={{ padding: 16 }}>
          El rol de Comité no evalúa solicitudes. Las pre-aprobadas que esperan tu decisión se agregarán en otra pantalla.
        </p>
      )}
      {puedeEvaluar && <Evaluar />}
    </div>
  );
}
