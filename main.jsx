import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Si algo falla al dibujar, se muestra el mensaje en pantalla en lugar de dejarla en blanco.
class ErrorPantalla extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 640, margin: '60px auto', padding: 16, font: '15px system-ui' }}>
        <h1 style={{ fontSize: 20 }}>La app tuvo un error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#fee2e2', color: '#7f1d1d', padding: 12, borderRadius: 8 }}>
          {String(this.state.error?.message || this.state.error)}
        </pre>
        <p>Recarga la página (Ctrl+F5). Si sigue igual, envía este mensaje al equipo.</p>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorPantalla>
      <App />
    </ErrorPantalla>
  </StrictMode>
);
