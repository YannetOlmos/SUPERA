// Estilos de toda la app (un solo lugar). Soporta modo claro y oscuro.
export default `
.ev{--ev-bg:#fff;--ev-fg:#1f2937;--ev-mut:#6b7280;--ev-line:#e5e7eb;--ev-card:#f9fafb;--ev-acc:#1f4e3d;--ev-accfg:#fff;
  --ok-bg:#dcfce7;--ok-fg:#14532d;--cond-bg:#fef3c7;--cond-fg:#78350f;--comite-bg:#dbeafe;--comite-fg:#1e3a8a;
  --rech-bg:#fee2e2;--rech-fg:#7f1d1d;--fraude-bg:#450a0a;--fraude-fg:#fff;--gris-bg:#e5e7eb;--gris-fg:#374151;
  color:var(--ev-fg);background:var(--ev-bg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;min-height:100vh}
@media (prefers-color-scheme:dark){.ev{--ev-bg:#111827;--ev-fg:#f3f4f6;--ev-mut:#9ca3af;--ev-line:#374151;--ev-card:#1f2937;--ev-acc:#6ee7b7;--ev-accfg:#064e3b;
  --ok-bg:#14532d;--ok-fg:#dcfce7;--cond-bg:#78350f;--cond-fg:#fef3c7;--comite-bg:#1e3a8a;--comite-fg:#dbeafe;
  --rech-bg:#7f1d1d;--rech-fg:#fee2e2;--fraude-bg:#000;--fraude-fg:#fecaca;--gris-bg:#374151;--gris-fg:#e5e7eb}}
.ev *{box-sizing:border-box}
.ev .barra-sup{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--ev-line)}
.ev .tabs{display:flex;gap:4px;flex-wrap:wrap;padding:8px 16px 0;border-bottom:1px solid var(--ev-line)}
.ev .tab{background:transparent;color:var(--ev-fg);border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;padding:8px 16px;font:inherit;font-weight:600;cursor:pointer}
.ev .tab[aria-current=page]{background:var(--ev-card);border-color:var(--ev-line);color:var(--ev-acc)}
.ev .pantalla{max-width:900px;margin:0 auto;padding:16px}
.ev h1{font-size:22px;margin:0 0 4px}
.ev h2{margin:0;font-size:20px}
.ev h3{margin:20px 0 4px;font-size:16px}
.ev .sub{color:var(--ev-mut);margin:0 0 16px}
.ev .info{color:var(--ev-mut);font-size:14px}
.ev label{display:block;font-weight:600;margin-bottom:4px;font-size:14px}
.ev input,.ev select,.ev textarea{width:100%;padding:9px 10px;border:1px solid var(--ev-line);border-radius:8px;background:var(--ev-bg);color:var(--ev-fg);font:inherit}
.ev textarea{min-height:80px;resize:vertical}
.ev button{padding:10px 18px;border:0;border-radius:8px;background:var(--ev-acc);color:var(--ev-accfg);font:inherit;font-weight:600;cursor:pointer}
.ev button:disabled{opacity:.5;cursor:not-allowed}
.ev button.btn2{background:transparent;color:var(--ev-fg);border:1px solid var(--ev-line)}
.ev button.peligro{background:#b91c1c;color:#fff}
.ev .fila{display:flex;gap:12px;align-items:center;margin-top:12px;flex-wrap:wrap}
.ev .grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.ev .bloque{border:1px solid var(--ev-line);border-radius:12px;padding:14px 16px;margin-top:14px;background:var(--ev-card)}
.ev .bloque>h3{margin-top:0}
.ev .ayuda{color:var(--ev-mut);font-size:13px;margin-top:2px}
.ev .aviso{margin-top:12px;padding:12px;border-radius:8px;background:var(--rech-bg);color:var(--rech-fg)}
.ev .exito{margin-top:12px;padding:12px;border-radius:8px;background:var(--ok-bg);color:var(--ok-fg)}
.ev .estatus{margin-top:20px;padding:16px;border-radius:12px;display:flex;gap:14px;align-items:center}
.ev .estatus .sim{font-size:28px;font-weight:700;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.55);flex:none}
.ev .estatus p{margin:2px 0 0}
.ev .ok{background:var(--ok-bg);color:var(--ok-fg)}
.ev .cond{background:var(--cond-bg);color:var(--cond-fg)}
.ev .comite{background:var(--comite-bg);color:var(--comite-fg)}
.ev .rech{background:var(--rech-bg);color:var(--rech-fg)}
.ev .fraude{background:var(--fraude-bg);color:var(--fraude-fg)}
.ev .gris{background:var(--gris-bg);color:var(--gris-fg)}
.ev .insignia{display:inline-block;padding:2px 10px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap}
.ev .monto{margin-top:16px;padding:14px 16px;border:1px solid var(--ev-line);border-radius:12px;background:var(--ev-card)}
.ev .monto .n{font-size:26px;font-weight:700}
.ev table{width:100%;border-collapse:collapse;margin-top:8px}
.ev th,.ev td{text-align:left;padding:8px;border-bottom:1px solid var(--ev-line);vertical-align:top}
.ev td.num,.ev th.num{text-align:right;font-variant-numeric:tabular-nums}
.ev tfoot td{font-weight:700;border-bottom:0}
.ev tr.clic{cursor:pointer}
.ev tr.sel{background:var(--ev-card)}
.ev .barra{height:8px;border-radius:4px;background:var(--ev-line);overflow:hidden;min-width:70px}
.ev .barra i{display:block;height:100%;background:var(--ev-acc)}
.ev ul{margin:6px 0 0;padding-left:20px}
.ev .scroll{overflow-x:auto}
.ev .etq{display:inline-block;font-size:11px;font-weight:700;padding:1px 6px;border-radius:4px;background:var(--cond-bg);color:var(--cond-fg);margin-left:6px}
`;
