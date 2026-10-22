#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Instala Node.js LTS desde https://nodejs.org y vuelve a ejecutar."; exit 1; }
[ -d node_modules ] || { echo "Instalando dependencias (solo la primera vez)..."; npm install; }
(sleep 3; (open http://localhost:5173 || xdg-open http://localhost:5173) >/dev/null 2>&1) &
npm run dev
