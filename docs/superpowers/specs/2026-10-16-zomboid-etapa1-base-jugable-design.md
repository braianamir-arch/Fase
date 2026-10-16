# Copia de Project Zomboid para Android — Etapa 1: base jugable

Fecha: 2026-10-16 · Estado: esperando la revisión del autor

## Para qué es

El autor quiere una **copia fiel de Project Zomboid** (PZ) para jugar en el celular, él y un amigo, cada uno
su propia partida. Es de uso privado: el APK se pasa a mano, no se publica en tiendas y el repositorio debe
quedar privado. Más adelante el juego podría elegirse desde URBANA, el city builder del autor (también Godot).

**Fidelidad:** reglas, números, ambientación, textos, interfaz y forma de jugar iguales a PZ. Lo único que
cambia es cómo se dibuja: en 3D en vez de sprites 2D. No se usa ningún archivo del juego original (código,
gráficos ni sonidos); todo se rehace imitándolo.

**Versión de referencia:** Build 42 estable (42.20), que es la actual. Cuando un dato de B42 no está
confirmado, se usa el de B41. Los números salen de `reports/Project Zomboid listado completo.md` y de
`research_notes/Project Zomboid listado completo/`.

## Lo que dijo el autor y lo que se supone

| Dijo el autor | Se supone (corregir si no) |
|---|---|
| Android, Godot (como URBANA) | Godot 4.7, renderizador Mobile, arm64, como URBANA |
| 3D, que se vea como PZ | Cámara ortográfica fija en diagonal, como la isométrica de PZ |
| Copia 100 % fiel | Base Build 42; textos en español como la traducción oficial |
| Un jugador, cada uno en su celular | Sin multijugador |
| Muldraugh igual al original | Se copia del mapa público (map.projectzomboid.com) |
| Controles táctiles que imitan PZ | Joystick + botones + menú contextual al mantener apretado; joystick Bluetooth también |
| Mundo en cuadrícula | Casillas de 1 × 1 m y pisos apilados, como PZ |

**Cómo saber que la etapa 1 salió bien:** en el celular se puede crear un personaje, aparecer en Muldraugh,
recorrer las casas, encontrar un arma, pelear con zombies, ser mordido, vendarse, morir por la infección
(o comido) y ver "This is how you died". Y todo se siente como PZ: mismos ruidos, mismas distancias, mismas
probabilidades.

## Las etapas (esta es la 1)

1. **Base jugable** (este documento).
2. Supervivencia: hambre, sed, sueño, temperatura, todos los moodles.
3. Saqueo e inventario completos: botín por habitación, contenedores, bolsas.
4. Mundo vivo: día y noche, clima, cortes de luz y agua, radio y tele, helicóptero, meta-eventos.
5. Construcción y crafteo (sistema de B42).
6. Habilidades completas, libros, autos, el resto del mapa de Knox Country.

Cada etapa tiene su propio diseño, plan y prueba en el celular.

## Qué entra en la etapa 1

1. **Inicio:** menú principal, elegir profesión y rasgos con el sistema de puntos de B42 (todas las
   profesiones y rasgos aparecen; en esta etapa solo hacen efecto los que tocan sistemas que ya existen:
   velocidad, sigilo, fuerza, combate, heridas). Se empieza en Muldraugh el 9 de julio de 1993 a las 9:00.
2. **Mundo:** unas 6–9 manzanas de Muldraugh alrededor de un punto de inicio del original, con sus casas de
   1 y 2 pisos, calles, veredas, cercos y árboles. Puertas y ventanas que se abren, cierran, rompen y trepan.
   Escaleras. Al entrar a un edificio se ocultan techo y pisos de arriba, y las paredes que tapan al jugador
   se recortan, como en PZ.
3. **Personaje:** caminar, correr, esprintar, agacharse (sigilo), cono de visión (lo que no se ve se oscurece
   y no muestra zombies), resistencia (endurance) que baja al correr y pelear.
4. **Zombies:** deambulan, te ven y te oyen con las reglas de PZ (prioridad vista > sonido > deambular; ruido
   con radio y volumen en casillas: caminar 7, esprintar 14, agachado 3,5, gritar 30), te persiguen hasta
   que se les acaba la memoria, golpean puertas y ventanas (ventana en ~20 min de juego), trepan cercos,
   se tiran sobre vos (lunge), te agarran y muerden. Valores del Zombie Lore por defecto. Shamblers.
5. **Pelea cuerpo a cuerpo:** empujar (shove), pisotón (stomp) a los caídos, golpe con arma, crítico,
   empujón automático si el zombie está demasiado cerca, durabilidad del arma. Unas 10 armas del original
   (bate, palo de amasar, sartén, cuchillo de cocina, martillo, hacha, palanca, palo de golf, destornillador,
   pala).
6. **Heridas e infección:** 17 partes del cuerpo; arañazo (7 % de contagio), laceración (25 %),
   mordida (100 %); sangrado; vendas (limpia/sucia); infección Knox con sus síntomas por horas y muerte
   a las 72 h; reanimación como zombie.
7. **Inventario básico:** levantar y soltar objetos, peso y capacidad (con el moodle de carga), equipar
   arma en una o dos manos. Algunos objetos ya colocados en las casas (sin el sistema de botín completo).
8. **Pantalla de salud y moodles:** los moodles de esta etapa (dolor, pánico, sangrado, herido, cansancio
   físico, carga, enfermo/infectado), con sus iconos y umbrales del original.
9. **Muerte:** permanente. "This is how you died" con días y horas sobrevividos y zombies matados.
10. **Tiempo:** reloj de juego con la escala por defecto de PZ (1 hora real = 1 día). Sin noche todavía:
    la luz queda en horario de día.
11. **Guardado:** se guarda solo y al salir; una partida por personaje.

**Fuera de la etapa 1:** hambre, sed, sueño, temperatura, clima, noche, saqueo completo, crafteo,
construcción, armas de fuego, autos, radio/TV, helicóptero, meta-eventos, hordas migrando, multijugador.

## Cómo está armado

Proyecto de Godot 4.7 nuevo en `juego/` dentro de este repositorio. El código de `link_indexer/` no se toca.

### Piezas y responsabilidad de cada una

| Pieza | Qué hace | Depende de |
|---|---|---|
| `datos/` (JSON) | Profesiones, rasgos, armas, objetos, ruidos, Zombie Lore: todos los números del original en un solo lugar, sin código | — |
| `mundo/grilla` | Guarda qué hay en cada casilla (x, y, piso): suelo, paredes en cada borde, puertas, ventanas, muebles, escaleras. Responde "¿se puede pasar de A a B?", "¿esto tapa la vista?" | — |
| `mundo/mapa` | Lee el archivo del mapa de Muldraugh y llena la grilla | grilla |
| `mundo/armado3d` | Convierte la grilla en modelos 3D por trozos de 10 × 10 casillas (los "chunks" de PZ), como URBANA arma sus edificios: paredes, techos, pisos, muebles simples | grilla |
| `mundo/vista` | Cámara ortográfica fija, zoom con pellizco, ocultar techos y pisos de arriba, recortar paredes, oscurecer lo que el jugador no ve | grilla, jugador |
| `sim/reloj` | Hora del juego y escala de tiempo | — |
| `sim/ruido` | Emite ruidos con radio y volumen; avisa a los zombies que los oyen; las paredes amortiguan | grilla |
| `sim/caminos` | Pathfinding por pisos con escaleras (AStarGrid2D por piso) | grilla |
| `personaje/` | Movimiento, posturas, endurance, rasgos activos | grilla, ruido |
| `cuerpo/` | 17 partes, heridas, sangrado, vendas, infección, moodles de esta etapa | reloj, datos |
| `zombies/` | Estados: deambular, investigar ruido, perseguir, golpear obstáculo, atacar, caído, muerto. Solo los cercanos se simulan completos; los lejanos se mueven barato | grilla, caminos, ruido, datos |
| `combate/` | Golpe, empujón, pisotón, crítico, daño por arma y fuerza, durabilidad | datos, cuerpo |
| `inventario/` | Objetos, peso, capacidad, equipar | datos |
| `ui/` | Controles táctiles, menú contextual, ventanas de inventario y salud, moodles, creación de personaje, pantalla de muerte | todo lo anterior, solo para leer y mandar acciones |
| `guardado/` | Guardar y cargar la partida (estado del jugador, zombies, puertas y objetos cambiados) | todo |

La regla del juego vive en `datos/` + las piezas de simulación; `ui/` y `mundo/armado3d` solo muestran.
Así se pueden probar las reglas sin abrir la pantalla.

### El mapa de Muldraugh

- Se copia del mapa público de PZ (map.projectzomboid.com), mirándolo, casilla por casilla, a un archivo de
  texto propio (`datos/mapas/muldraugh_*.json`): suelo, paredes, puertas, ventanas, muebles y escaleras.
- Se arma con una herramienta chica (script) que ayuda a pasar la imagen de referencia a la grilla, y a mano
  donde haga falta.
- Si la página del mapa no se puede leer desde este entorno, el autor manda capturas de esas manzanas.
- El formato admite agregar más manzanas después sin cambiar el código.

### Controles táctiles

- **Izquierda:** joystick para caminar (empujarlo a fondo = correr).
- **Derecha:** botón de atacar (tocar = golpe; si no hay arma, empujón; sobre un caído, pisotón), mantener
  para apuntar (modo combate, como el clic derecho de PZ), botones de agacharse y esprintar.
- **Mantener apretado sobre algo** (puerta, ventana, objeto, uno mismo): abre el menú contextual de PZ con
  las mismas opciones.
- **Arriba:** reloj, moodles; botones de inventario y salud que abren las ventanas al estilo PZ, más grandes
  para el dedo.
- Un joystick Bluetooth funciona con el mismo mapeo que PZ con mando.

### Rendimiento en el celular

- Objetivo: 30 cuadros por segundo estables en un celular de gama media.
- Modelos simples por chunk (una malla por chunk), sombras solo del sol.
- Hasta ~50 zombies simulados completos cerca del jugador; el resto, simulación barata.
- Se mide en el celular con un contador en pantalla (activable en opciones).

## Errores y casos raros

- **Partida guardada rota o de otra versión:** se avisa y no se carga; nunca se borra sola.
- **Mapa con un error** (puerta sin pared, escalera sin piso arriba): la herramienta del mapa lo detecta antes
  de entrar al juego.
- **Zombie atascado** sin camino: vuelve a deambular en vez de quedarse trabado.
- **Celular lento:** si baja de 25 cuadros, se reduce la cantidad de zombies simulados completos.

## Pruebas

- **Reglas sin pantalla:** pruebas automáticas que corren con Godot sin ventana (como hace URBANA) y
  comparan con los números del original: probabilidad de contagio, radios de ruido, daño, durabilidad,
  costos de rasgos, pasar o no pasar entre casillas, pathfinding.
- **Capturas automáticas:** escenas de prueba (afuera de una casa, adentro con techo oculto, pelea, pantalla
  de muerte) que se guardan como imagen para revisar.
- **En el celular:** el autor instala el APK y juega una partida completa hasta morir; si algo no se siente
  como PZ, se anota y se corrige.

## Preguntas abiertas

- Ninguna que bloquee. El punto exacto de inicio en Muldraugh se elige al armar el mapa (uno de los del
  original).
