-- Datos de prueba (5 solicitudes en borrador). Ejecutar UNA vez en Supabase > SQL Editor.
-- 1) El usuario debe existir en Authentication > Users.
-- 2) Cambia el correo de abajo y ejecuta todo el script.
-- Si el usuario ya tiene perfil (gerente, analista...) se respeta; si no, se crea como analista.
-- Para borrar estos datos después (en el SQL Editor):
--   delete from public.evaluaciones_historial where solicitud_id in (select id from public.solicitudes where cultivo like 'PRUEBA%');
--   delete from public.bitacora where solicitud_id in (select id from public.solicitudes where cultivo like 'PRUEBA%');
--   delete from public.decisiones where solicitud_id in (select id from public.solicitudes where cultivo like 'PRUEBA%');
--   delete from public.solicitudes where cultivo like 'PRUEBA%';
--   delete from public.acreditados where rfc like 'TEST%';

do $$
declare
  v_email text := 'CAMBIA-ESTE-CORREO@supera.com.mx';
  v_id uuid;
  base jsonb := '{"antecedente_fraude":false,"ingresos_actividad":true,"ingresos_anuales":1000000,"costos_anuales":400000,"pago_anual_credito":300000,"pagos_deuda_anual":300000,"pasivos_totales":300000,"activos_totales":1000000,"dias_desfase":0,"zona_climatica":"Baja","fuente_agua":"Riego seguro","forma_venta":"Contrato con precio pactado","cultivo_riesgo":false,"seguro_cobertura_pct":1.0,"seguro_vigente":true,"seguro_endosado":true,"garantia_liquida":800000,"fega_pct":0,"avaluo_hipoteca":0,"score_buro":720,"atrasos_buro_12m":0,"max_dias_atraso_buro":0,"quebranto_buro":false,"ciclos_puntuales_supera":3,"atrasos_supera_12m":0,"max_dias_atraso_supera":0,"reestructura_previa":false,"quebranto_supera":false,"pct_cartera_cultivo_region":0.05,"foco_rojo":false,"evidencia_juicio":"Visita de campo y estados de cuenta (dato de prueba)"}';
  casos jsonb := '[
    {"nombre":"Prueba 1 - Aprobada","rfc":"TEST00000001","o":{}},
    {"nombre":"Prueba 2 - Condicional (73 pts)","rfc":"TEST00000002","o":{"zona_climatica":"Moderada","fuente_agua":"Riego variable","forma_venta":"Comprador recurrente sin contrato","costos_anuales":833333.33,"pago_anual_credito":50000,"seguro_cobertura_pct":0}},
    {"nombre":"Prueba 3 - Pasa a Comite","rfc":"TEST00000003","o":{"costos_anuales":700000,"dias_desfase":45}},
    {"nombre":"Prueba 4 - Rechazada por fraude","rfc":"TEST00000004","o":{"antecedente_fraude":true}},
    {"nombre":"Prueba 5 - Rechazada por veto","rfc":"TEST00000005","o":{"score_buro":590,"quebranto_supera":true}}
  ]';
  c jsonb; aid uuid; sid uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(v_email);
  if v_id is null then
    raise exception 'No existe un usuario con el correo %. Créalo primero en Authentication > Users.', v_email;
  end if;
  insert into public.perfiles (id, nombre, rol) values (v_id, 'Analista de prueba', 'analista')
    on conflict (id) do nothing;

  for c in select * from jsonb_array_elements(casos) loop
    insert into public.acreditados (nombre, rfc, analista_id)
      values (c->>'nombre', c->>'rfc', v_id)
      on conflict (rfc) do nothing
      returning id into aid;
    if aid is null then continue; end if;  -- ya existía: no se duplica
    insert into public.solicitudes (acreditado_id, analista_id, monto, cultivo)
      values (aid, v_id, 500000, 'PRUEBA maíz') returning id into sid;
    insert into public.evaluaciones
      select * from jsonb_populate_record(null::public.evaluaciones,
        (base || (c->'o')) || jsonb_build_object('solicitud_id', sid));
  end loop;
end $$;
