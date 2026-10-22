// App SUPERA PRÉSTAMOS: inicio de sesión + pestañas según el rol.
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import CSS from './estilos';
import { ROLES, mensajeError } from './util';
import Capturar from './Capturar';
import Evaluar from './Evaluar';
import Solicitudes from './Solicitudes';
import Parametros from './Parametros';

// Qué pestañas ve cada rol
const PESTANAS = {
  analista: ['capturar', 'evaluar', 'solicitudes'],
  gerente: ['evaluar', 'solicitudes', 'parametros'],
  comite: ['solicitudes'],
};
const TITULOS = { capturar: 'Capturar', evaluar: 'Evaluar', solicitudes: 'Solicitudes', parametros: 'Parámetros' };

function Login({ onEntrar }) {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (err) setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : err.message);
    else onEntrar();
    setEnviando(false);
  }

  return (
    <form className="pantalla" onSubmit={entrar} style={{ maxWidth: 380, marginTop: 40 }}>
      <h1>SUPERA PRÉSTAMOS</h1>
      <p className="sub">Matriz de riesgo de crédito. Inicia sesión.</p>
      <label htmlFor="lg-correo">Correo</label>
      <input id="lg-correo" type="email" autoComplete="username" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
      <label htmlFor="lg-clave" style={{ marginTop: 10 }}>
        Contraseña
      </label>
      <input id="lg-clave" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
      {error && (
        <div className="aviso" role="alert">
          {error}
        </div>
      )}
      <div className="fila">
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    </form>
  );
}

function Principal({ perfil, onSalir }) {
  const pestanas = PESTANAS[perfil.rol] || ['solicitudes'];
  const [pestana, setPestana] = useState(pestanas[0]);
  const [enfoque, setEnfoque] = useState(null); // solicitud a mostrar al saltar entre pantallas

  const ir = (p, id = null) => {
    setEnfoque(id);
    setPestana(p);
  };

  return (
    <>
      <div className="barra-sup">
        <strong>SUPERA PRÉSTAMOS</strong>
        <span className="info">
          {perfil.nombre} · {ROLES[perfil.rol] || perfil.rol}{' '}
          <button type="button" className="btn2" onClick={onSalir} style={{ padding: '4px 12px', marginLeft: 8 }}>
            Salir
          </button>
        </span>
      </div>
      <nav className="tabs" aria-label="Secciones">
        {pestanas.map((p) => (
          <button key={p} type="button" className="tab" aria-current={pestana === p ? 'page' : undefined} onClick={() => ir(p)}>
            {TITULOS[p]}
          </button>
        ))}
      </nav>
      {pestana === 'capturar' && <Capturar onListo={(id) => ir('evaluar', id)} />}
      {pestana === 'evaluar' && <Evaluar key={enfoque || 'x'} inicial={enfoque} onVer={() => ir('solicitudes')} />}
      {pestana === 'solicitudes' && <Solicitudes perfil={perfil} inicial={null} />}
      {pestana === 'parametros' && <Parametros />}
    </>
  );
}

export default function App() {
  const [estado, setEstado] = useState({ cargando: true, sesion: null, perfil: null, error: '' });

  async function revisar() {
    const { data } = await supabase.auth.getSession();
    const sesion = data.session;
    if (!sesion) return setEstado({ cargando: false, sesion: null, perfil: null, error: '' });
    const r = await supabase.from('perfiles').select('id, nombre, rol').eq('id', sesion.user.id).maybeSingle();
    if (r.error || !r.data)
      return setEstado({
        cargando: false,
        sesion,
        perfil: null,
        error: r.error ? mensajeError(r.error) : 'Tu usuario no tiene perfil asignado. Pide al administrador que te dé de alta.',
      });
    setEstado({ cargando: false, sesion, perfil: r.data, error: '' });
  }

  useEffect(() => {
    revisar();
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') setEstado({ cargando: false, sesion: null, perfil: null, error: '' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const salir = async () => {
    await supabase.auth.signOut();
    setEstado({ cargando: false, sesion: null, perfil: null, error: '' });
  };

  return (
    <div className="ev">
      <style>{CSS}</style>
      {estado.cargando ? (
        <div className="pantalla">Cargando…</div>
      ) : !estado.sesion ? (
        <Login onEntrar={revisar} />
      ) : !estado.perfil ? (
        <div className="pantalla">
          <div className="aviso" role="alert">
            {estado.error}
          </div>
          <div className="fila">
            <button type="button" className="btn2" onClick={salir}>
              Salir
            </button>
          </div>
        </div>
      ) : (
        <Principal perfil={estado.perfil} onSalir={salir} />
      )}
    </div>
  );
}
