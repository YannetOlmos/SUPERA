# Matriz de riesgo · Supera Préstamos (app mínima)

Pantallas: acceso con correo y contraseña, y **Evaluar** (elegir solicitante, evaluar, ver estatus, monto autorizado y puntos por criterio).

## Correr en tu computadora (primera vez)
1. Instala **Node.js LTS** desde https://nodejs.org (solo una vez).
2. Descomprime la carpeta.
3. **Windows:** doble clic en `iniciar.bat`. **Mac/Linux:** en una terminal dentro de la carpeta, `./iniciar.sh`.
   (O manualmente: `npm install` y luego `npm run dev`.)
4. Se abre http://localhost:5173. Para detenerla, cierra la ventana o pulsa Ctrl+C.

El archivo `.env` ya trae la URL y la llave **pública** de tu proyecto de Supabase; si se pierde (es un archivo oculto), la app usa los mismos valores de respaldo.

**Importante:** no abras `index.html` con doble clic. La app solo funciona a través de `iniciar.bat` / `iniciar.sh` (o `npm run dev`); abierta como archivo se ve en blanco.

## Ver algo en la pantalla
1. En Supabase > Authentication > Users crea tu usuario (correo y contraseña; marca "Auto Confirm User").
2. En Supabase > SQL Editor abre `datos_prueba.sql`, cambia el correo por el tuyo y ejecútalo: te da perfil de analista y 5 solicitudes de prueba (aprobada, condicional, Comité, fraude y veto).
3. Entra a la app con ese correo y evalúa.

## Publicar en Vercel (después)
Importa la carpeta, deja la configuración que detecta para Vite y agrega en Settings > Environment Variables las dos variables de `.env`.

## Seguridad
La app solo usa la llave pública. Los permisos los aplica la base (políticas por fila y funciones). Nunca pongas la llave secreta (service_role) en la app ni en Vercel. No subas `.env` a un repositorio público (ya está en `.gitignore`).
