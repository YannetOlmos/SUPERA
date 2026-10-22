import { createClient } from '@supabase/supabase-js';

// Si el archivo .env no está (es un archivo oculto y se pierde fácil al copiar o descomprimir),
// se usan estos valores de respaldo. Ambos son PÚBLICOS por diseño: la seguridad la dan las
// políticas de la base. NUNCA pongas aquí la llave secreta (service_role).
const URL_RESPALDO = 'https://pctauwpxgbaufvdpcbfd.supabase.co';
const LLAVE_RESPALDO = 'sb_publishable_F1p3H9ITj5e5aBcSw7abyw_guKK5g7D';

const url = import.meta.env.VITE_SUPABASE_URL || URL_RESPALDO;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || LLAVE_RESPALDO;

export const supabase = createClient(url, key);
