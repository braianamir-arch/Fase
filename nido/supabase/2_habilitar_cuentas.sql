-- NIDO · Paso 2 de 2: correr DESPUÉS de crear las dos cuentas en
-- Authentication → Users → Add user (con "Auto Confirm User" tildado).
-- Habilita a todas las cuentas que existen en ese momento. Nadie más puede ver nada.
insert into public.members (user_id)
select id from auth.users
on conflict (user_id) do nothing;

select u.email, m.user_id is not null as habilitada
from auth.users u left join public.members m on m.user_id = u.id;
