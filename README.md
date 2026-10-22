# SUPERA PRÉSTAMOS - Matriz de riesgo (app)

Pantallas por rol:

- Analista: Capturar, Evaluar, Solicitudes
- Gerente de crédito: Evaluar, Solicitudes, Parámetros
- Comité: Solicitudes (dictamina las que le llegan)

## Para publicarla (GitHub + Vercel)
Todos los archivos van sueltos en la raíz del repositorio (sin carpetas).
En Vercel agrega estas dos variables (solo la llave publishable, NUNCA la service_role):
VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.

## Para correrla en tu computadora
Instala Node.js LTS y haz doble clic en iniciar.bat (Windows) o iniciar.sh (Mac/Linux).
No abras index.html con doble clic: necesita el servidor de Vite.
