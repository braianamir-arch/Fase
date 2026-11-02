# NIDO

App privada para una pareja que convive: horarios, compras, comida, tareas, pagos, gym y toques.
PWA sin frameworks (HTML + CSS + JS), datos en Supabase por fetch directo.

## Puesta en marcha (una sola vez)
1. Supabase → **SQL Editor**: pegar `supabase/1_base.sql` y **Run**.
2. Supabase → **Authentication → Users → Add user**: crear las dos cuentas con "Auto Confirm User".
3. SQL Editor: pegar `supabase/2_habilitar_cuentas.sql` y **Run**.
4. Authentication → Sign In / Providers: apagar **Allow new users to sign up**.

## Seguridad
- Sin iniciar sesión no se puede leer ni escribir nada (RLS con `es_miembro()`).
- Solo las cuentas en la tabla `members` ven datos; una cuenta nueva no ve nada.
- Ningún dato personal va en este repo: nombres, horarios y lugares viven solo en la base.

## Pruebas
`npm test` (lógica de turnos, tareas, pagos, gym, compras).
