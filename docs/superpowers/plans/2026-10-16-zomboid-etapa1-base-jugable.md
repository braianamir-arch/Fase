# Copia de Project Zomboid — Etapa 1: base jugable — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un proyecto Godot 4.7 para Android donde se crea un personaje, se recorre un pedazo de Muldraugh en 3D con vista isométrica, se pelea con zombies, uno se infecta o muere y ve "This is how you died", con las reglas y números de Project Zomboid.

**Architecture:** Mundo en grilla de casillas de 1 × 1 m con pisos apilados (como PZ). Las reglas son clases `RefCounted` puras en `juego/reglas/` que se prueban sin pantalla; los nodos de `juego/escenas/` solo leen el estado de las reglas y lo dibujan. Todos los números del original viven en `juego/datos/*.json`.

**Tech Stack:** Godot 4.7 (renderizador Mobile, Android arm64), GDScript con tipos estáticos, pruebas con un runner propio en modo `--headless`.

**Spec:** `docs/superpowers/specs/2026-10-16-zomboid-etapa1-base-jugable-design.md`. Números: `reports/Project Zomboid listado completo.md` y `research_notes/Project Zomboid listado completo/*.md`.

## Global Constraints

- Godot **4.7**, `config/features=PackedStringArray("4.7", "Mobile")`, `renderer/rendering_method="mobile"`, `textures/vram_compression/import_etc2_astc=true`, orientación horizontal (`window/handheld/orientation=6`), como URBANA.
- Export Android: solo `arm64-v8a`, `screen/immersive_mode=true`, `package/unique_name="com.braian.zomboid"`, nombre visible `"Zomboid"`.
- Todo el proyecto vive en `juego/`. No se toca `link_indexer/`, `tests/` ni `requirements.txt` de la raíz.
- Ningún archivo del juego original entra al repo (código, imágenes, sonidos, capturas). Las referencias visuales van al scratchpad de la sesión, nunca a git.
- Textos del juego en español, con los nombres de la traducción oficial de PZ; "This is how you died" se muestra como en el original en inglés, con subtítulo "Así moriste".
- Referencia de reglas: Build 42; si B42 no tiene dato confirmado, B41. Todo valor que no salga de las notas lleva `"verificar": true` en el JSON y se lista en `juego/datos/VERIFICAR.md`.
- Escala de tiempo: 1 hora real = 1 día de juego (1 s real = 24 s de juego). Inicio: 9 de julio de 1993, 09:00.
- Unidad de mundo: 1 casilla = 1 m; altura de piso = 2,7 m; chunk = 10 × 10 casillas.
- Código y nombres en español (como URBANA), tipos estáticos en GDScript, sin `class_name` repetidos.
- Cada tarea termina con `tools/probar.sh` en verde y un commit.

## Review Focus

- Tocar con dos dedos a la vez (joystick + atacar): ambos funcionan sin que uno robe el toque del otro → test en Tarea 15.
- Abrir una partida guardada cuyo archivo está cortado o es de otra versión: aviso y no se borra → test en Tarea 17.
- Zombie sin camino al jugador (casa cerrada con todas las ventanas con tabla): golpea el obstáculo más cercano o vuelve a deambular, nunca queda congelado → test en Tarea 10.
- Jugador en la escalera, entre dos pisos: se ven ambos pisos y no queda con el techo tapando → test en Tarea 7.
- App que se va a segundo plano (llamada, botón de inicio) en medio de una pelea: se guarda y el juego queda pausado al volver → test en Tarea 17.

---

## Estructura de archivos

```
tools/instalar_godot.sh        descarga Godot 4.7 headless a ~/.local/godot (para pruebas)
tools/probar.sh                corre todas las pruebas; sale con 1 si alguna falla
tools/mapa_desde_imagen.py     ayuda a pasar una captura del mapa a la grilla de texto
juego/project.godot
juego/export_presets.cfg
juego/LEEME.md                 cómo abrirlo y exportar el APK
juego/datos/                   *.json con los números del original + mapas/*.txt + VERIFICAR.md
juego/reglas/                  clases RefCounted puras (sin nodos)
  datos.gd  grilla.gd  mapa.gd  reloj.gd  ruido.gd  caminos.gd  vision.gd
  movimiento.gd  cuerpo.gd  moodles.gd  inventario.gd  combate.gd  mente_zombie.gd
  partida.gd  guardado.gd
juego/escenas/                 nodos que dibujan y reciben toques
  main.tscn/main.gd  mundo3d.gd  armado_chunk.gd  camara.gd  jugador.gd  zombie.gd
  ui/hud.gd  ui/joystick.gd  ui/menu_contextual.gd  ui/ventana_inventario.gd
  ui/ventana_salud.gd  ui/creacion.gd  ui/muerte.gd  ui/inicio.gd
juego/tests/correr.gd          runner: carga tests/test_*.gd y ejecuta los métodos test_*
juego/tests/test_*.gd          una por archivo de reglas
juego/tests/capturas.gd        escenas de prueba que guardan PNG (no van al repo)
```

---

### Task 1: Proyecto base y runner de pruebas

**Files:**
- Create: `tools/instalar_godot.sh`, `tools/probar.sh`, `juego/project.godot`, `juego/tests/correr.gd`, `juego/tests/test_runner.gd`, `juego/.gitignore` (`.godot/`, `capturas/`)

**Interfaces:**
- Produces: convención de pruebas. Cada `juego/tests/test_*.gd` hace `extends RefCounted`, define `func test_*() -> void` y usa `var t: Prueba` (inyectado por el runner) con `t.igual(a, b, msg := "")`, `t.cerca(a: float, b: float, tol: float, msg := "")`, `t.verdad(c: bool, msg := "")`. `Prueba` está definida en `correr.gd` como clase interna.
- Produces: `tools/probar.sh` → `~/.local/godot/godot --headless --path juego -s res://tests/correr.gd`; exit code 0 si todo pasa, 1 si algo falla; imprime `OK n` / `FALLA archivo::test: msg`.

- [ ] **Step 1:** `tools/instalar_godot.sh` baja el binario Linux headless de Godot 4.7 estable desde `https://github.com/godotengine/godot/releases` (la versión exacta la confirma con `godot --version` → empieza con `4.7`). Si 4.7 no existe en releases, parar y avisar.
- [ ] **Step 2: Test del runner**

```gdscript
# juego/tests/test_runner.gd
extends RefCounted
var t
func test_igual_pasa() -> void:
	t.igual(2 + 2, 4)
func test_cerca_pasa() -> void:
	t.cerca(0.1 + 0.2, 0.3, 0.0001)
```

- [ ] **Step 3:** Correr `tools/probar.sh` → falla (no hay runner). Escribir `correr.gd` (`extends SceneTree`, en `_init` recorre `res://tests/test_*.gd`, instancia, inyecta `t`, llama cada `test_*`, cuenta fallas, `quit(1 si fallas)`).
- [ ] **Step 4:** `tools/probar.sh` → `OK 2`. Agregar temporalmente un `t.igual(1, 2)` y verificar exit 1; sacarlo.
- [ ] **Step 5:** Commit `"Proyecto Godot base y runner de pruebas"`.

### Task 2: Referencias y datos del original

**Files:**
- Create: `juego/datos/ruidos.json`, `juego/datos/lore.json`, `juego/datos/infeccion.json`, `juego/datos/armas.json`, `juego/datos/profesiones.json`, `juego/datos/rasgos.json`, `juego/datos/objetos.json`, `juego/datos/moodles.json`, `juego/datos/VERIFICAR.md`, `juego/reglas/datos.gd`, `juego/tests/test_datos.gd`
- Scratchpad (no repo): carpeta `referencias/` con capturas de interfaz, moodles, pantalla de muerte, zombies, interiores.

**Interfaces:**
- Produces: `Datos` (autoload `res://reglas/datos.gd`, `extends Node`) con `func tabla(nombre: String) -> Dictionary` (lee `res://datos/<nombre>.json` una vez y cachea) y atajos `arma(id: String) -> Dictionary`, `rasgo(id) -> Dictionary`, `profesion(id) -> Dictionary`, `ruido(id) -> Dictionary` (`{radio: float, volumen: float}`), `lore(clave: String) -> Variant`.
- Para pruebas sin autoload: `static func cargar_json(ruta: String) -> Dictionary`.

- [ ] **Step 1:** Juntar referencias: buscar en la web (archivo de pzwiki vía `web.archive.org/web/2025id_/https://pzwiki.net/wiki/...`, Steam, Reddit) los valores que faltan en las notas: vida de zombie por Toughness, radios de vista y oído por nivel, velocidades de caminar/correr/esprintar del jugador y del shambler, alcance de empujón, tiempos de golpe. Lo que no aparezca → valor propio razonable con `"verificar": true`.
- [ ] **Step 2: Test de valores fijados por el spec**

```gdscript
func test_ruidos() -> void:
	var r := Datos.cargar_json("res://datos/ruidos.json")
	t.cerca(r.caminar.radio, 7.0, 0.001); t.cerca(r.esprintar.radio, 14.0, 0.001)
	t.cerca(r.agachado.radio, 3.5, 0.001); t.cerca(r.gritar.radio, 30.0, 0.001)
	t.cerca(r.zombie_golpea_puerta.radio, 20.0, 0.001)
func test_infeccion() -> void:
	var i := Datos.cargar_json("res://datos/infeccion.json")
	t.cerca(i.contagio.arañazo, 0.07, 1e-6); t.cerca(i.contagio.laceracion, 0.25, 1e-6)
	t.cerca(i.contagio.mordida, 1.0, 1e-6); t.igual(i.horas_hasta_muerte, 72)
func test_lore_por_defecto() -> void:
	var l := Datos.cargar_json("res://datos/lore.json")
	t.igual(l.velocidad, "shambler"); t.igual(l.memoria_ticks, 800); t.igual(l.cognicion, "navegacion_basica")
	t.verdad(l.fence_lunge)
func test_armas_etapa1() -> void:
	var a := Datos.cargar_json("res://datos/armas.json")
	for id in ["bate", "palo_amasar", "sarten", "cuchillo_cocina", "martillo", "hacha_bombero", "palanca", "palo_golf", "destornillador", "pala"]:
		t.verdad(a.has(id), id)
	t.cerca(a.bate.daño_min, 0.8, 1e-6); t.cerca(a.bate.daño_max, 1.1, 1e-6); t.igual(a.bate.condicion_max, 15)
	t.cerca(a.palanca.daño_min, 0.6, 1e-6); t.igual(a.palanca.condicion_baja_uno_en, 70)
	t.cerca(a.hacha_bombero.daño_max, 2.0, 1e-6)
func test_profesiones_y_rasgos_b42() -> void:
	var p := Datos.cargar_json("res://datos/profesiones.json")
	t.igual(p.size(), 24)
	t.igual(p.desempleado.puntos, 8)
```

Cada arma lleva: `categoria` (axe/long_blunt/short_blunt/long_blade/short_blade/spear/improvised), `dos_manos`, `daño_min`, `daño_max`, `alcance_min`, `alcance_max`, `crit`, `crit_mult`, `condicion_max`, `condicion_baja_uno_en`, `peso`, `endurance_mod`, `velocidad`. Profesiones y rasgos: las listas completas de B42 de `personaje_supervivencia.md` (nombre en español, costo, habilidades, rasgos que da, `etapa1: bool` si ya hace efecto).

- [ ] **Step 3:** Correr → FALLA. Escribir los JSON y `datos.gd`. Registrar `Datos` como autoload en `project.godot`.
- [ ] **Step 4:** `tools/probar.sh` → PASA. Revisar que todo valor con `"verificar": true` esté en `VERIFICAR.md` con la fuente que se buscó.
- [ ] **Step 5:** Commit `"Datos del original: ruidos, lore, infección, armas, profesiones y rasgos"`.

### Task 3: Grilla del mundo

**Files:** Create `juego/reglas/grilla.gd`, `juego/tests/test_grilla.gd`

**Interfaces:**
- Produces `class_name Grilla extends RefCounted`:
  - Constantes de borde: `NORTE := 0, OESTE := 1` (cada casilla guarda solo sus bordes norte y oeste; el sur de (x,y) es el norte de (x,y+1), como PZ).
  - Tipos de borde: `B_NADA, B_PARED, B_PUERTA, B_VENTANA, B_CERCO_BAJO, B_CERCO_ALTO`.
  - `func _init(ancho: int, alto: int, pisos: int)`
  - `func poner_suelo(p: Vector3i, tipo: StringName)`, `func suelo(p: Vector3i) -> StringName` (`&""` = sin suelo).
  - `func poner_borde(p: Vector3i, lado: int, tipo: int)`, `func borde(p: Vector3i, lado: int) -> int`
  - `func estado_abertura(p: Vector3i, lado: int) -> Dictionary` (`{abierta: bool, rota: bool, tablas: int, vida: float}`), `func abrir(p, lado, abierta: bool)`, `func romper(p, lado)`.
  - `func poner_mueble(p: Vector3i, id: StringName, solido: bool, tapa_vista: bool)`
  - `func poner_escalera(p: Vector3i, direccion: Vector2i)` (sube de `p` a `p + dir + (0,0,1)`)
  - `func entre(a: Vector3i, b: Vector3i) -> int` (tipo de borde entre dos casillas vecinas en el mismo piso)
  - `func puede_pasar(a: Vector3i, b: Vector3i, puede_abrir_puertas: bool, puede_trepar: bool) -> bool`
  - `func tapa_vista(a: Vector3i, b: Vector3i) -> bool`
  - `func adentro(p: Vector3i) -> bool` (hay suelo con techo arriba: marca `techo` al poner suelo interior)

- [ ] **Step 1: Tests**: pared bloquea en ambos sentidos (norte de (2,3) bloquea (2,2)↔(2,3)); puerta cerrada bloquea si `puede_abrir_puertas=false`, abierta deja pasar; ventana cerrada bloquea paso pero no vista; ventana rota y abierta solo deja pasar con `puede_trepar=true`; cerco bajo pasa trepando; cerco alto bloquea; diagonal bloqueada si cualquiera de los dos caminos en L está bloqueado; mueble sólido bloquea paso; fuera de límites → `false` sin error.
- [ ] **Step 2:** Correr → FALLA. **Step 3:** Implementar (arrays planos `PackedInt32Array` por capa, índice `x + y*ancho + z*ancho*alto`). **Step 4:** PASA. **Step 5:** Commit `"Grilla del mundo con bordes, aberturas y escaleras"`.

### Task 4: Formato de mapa y validación

**Files:** Create `juego/reglas/mapa.gd`, `juego/tests/test_mapa.gd`, `juego/tests/mapas/prueba.txt`

**Interfaces:**
- Consumes: `Grilla`.
- Produces `class_name Mapa extends RefCounted`: `static func cargar(ruta: String) -> Grilla`, `static func desde_texto(texto: String) -> Grilla`, `static func validar(g: Grilla) -> PackedStringArray` (errores legibles: `"(x,y,z): puerta sin pared a los lados"`), `static func puntos_inicio(texto: String) -> Array[Vector3i]`.

Formato de texto (decidido acá): encabezado `# ancho alto pisos`, luego un bloque por piso `== piso N`. Cada piso es una cuadrícula de doble resolución: fila/columna impar = casilla, par = borde.

```
caracteres de casilla: .=suelo interior(techo)  ,=pasto  _=vereda  ==calle  ~=tierra  T=árbol
  S/s=escalera hacia +y/-y  E/e=+x/-x  @=punto de inicio  letras minúsculas a-r = muebles (leyenda en datos/muebles.json)
caracteres de borde: #|-=pared  D=puerta  W=ventana  f=cerco bajo  F=cerco alto  espacio=nada  +=esquina (ignorado)
```

- [ ] **Step 1: Tests**: `prueba.txt` (una casa de 4×3 con una puerta, dos ventanas, una escalera y un punto de inicio) carga con las paredes, puerta y ventanas en los bordes esperados; `puntos_inicio` devuelve `[Vector3i(1,1,0)]`; `validar` de `prueba.txt` → vacío; un texto con puerta en medio de la nada → 1 error; escalera sin piso arriba → 1 error; fila de largo distinto → error con número de línea.
- [ ] **Step 2–4:** FALLA → implementar → PASA.
- [ ] **Step 5:** Commit `"Formato de mapa en texto y validador"`.

### Task 5: Muldraugh

**Files:** Create `juego/datos/mapas/muldraugh.txt`, `juego/datos/muebles.json`, `tools/mapa_desde_imagen.py`, `juego/tests/test_muldraugh.gd`

**Interfaces:**
- Consumes: `Mapa`.
- Produces: `res://datos/mapas/muldraugh.txt` con al menos 6 manzanas alrededor de un punto de inicio del original en Muldraugh, ≥ 20 edificios, ≥ 1 casa de 2 pisos con escalera, y objetos colocados (armas de la Tarea 2 y vendas) en una sección `== objetos` con líneas `x y z id`.

- [ ] **Step 1:** Abrir `https://map.projectzomboid.com/` (o capturas archivadas; si no se puede, **pedirle al autor capturas** de la zona de inicio de Muldraugh, con zoom a nivel de casilla). Guardar capturas en el scratchpad.
- [ ] **Step 2:** `tools/mapa_desde_imagen.py captura.png --x0 --y0 --casilla N` genera un borrador de la grilla de texto detectando colores de suelo/calle/pasto; las paredes, puertas, ventanas y muebles se completan a mano mirando la referencia.
- [ ] **Step 3: Test**: `Mapa.validar(Mapa.cargar("res://datos/mapas/muldraugh.txt"))` vacío; conteo de edificios (regiones conexas de `.`) ≥ 20; existe ≥ 1 escalera; `puntos_inicio` no vacío; todo id en `== objetos` existe en `armas.json` u `objetos.json`.
- [ ] **Step 4:** PASA. **Step 5:** Commit `"Mapa de Muldraugh (zona de inicio)"`.

### Task 6: Armado 3D por chunk

**Files:** Create `juego/escenas/armado_chunk.gd`, `juego/escenas/mundo3d.gd`, `juego/tests/test_armado.gd`, `juego/tests/capturas.gd`

**Interfaces:**
- Consumes: `Grilla`, `datos/muebles.json`.
- Produces `class_name ArmadoChunk extends RefCounted`: `static func construir(g: Grilla, chunk: Vector2i, piso: int) -> Dictionary` → `{paredes: ArrayMesh, suelo: ArrayMesh, techo: ArrayMesh, muebles: ArrayMesh}` (cada capa separada para poder ocultarla). Paredes de 0,1 m de espesor y 2,7 m de alto; puertas y ventanas con hueco y hoja/vidrio; materiales con colores y texturas propias imitando las referencias (revestimiento de madera, ladrillo, alfombra, baldosa).
- Produces `Mundo3D extends Node3D`: `func cargar(g: Grilla)`, `func actualizar_abertura(p: Vector3i, lado: int)` (rearma solo ese chunk), `func capa(chunk: Vector2i, piso: int, nombre: String) -> MeshInstance3D`.

- [ ] **Step 1: Tests**: chunk vacío → mallas sin superficies; una casilla con pared norte → `paredes.get_surface_count() == 1` y AABB de alto 2,7; casa de `prueba.txt` → techo presente sobre casillas `.` y no sobre `,`.
- [ ] **Step 2–4:** FALLA → implementar → PASA.
- [ ] **Step 5:** `capturas.gd` (`--captura=afuera`) renderiza Muldraugh desde la cámara de la Tarea 7 (o una provisoria) y guarda `juego/capturas/afuera.png`; mirarla y compararla con la referencia.
- [ ] **Step 6:** Commit `"Armado 3D del mapa por chunks"`.

### Task 7: Cámara, cortes y visión

**Files:** Create `juego/escenas/camara.gd`, `juego/reglas/vision.gd`, `juego/tests/test_vision.gd`

**Interfaces:**
- Produces `class_name Vision extends RefCounted`:
  - `static func pisos_visibles(piso_jugador: int, en_escalera: bool, adentro: bool) -> Dictionary` → `{max_piso: int, techos: bool}`. Afuera: todos los pisos y techos; adentro: hasta su piso, sin techo; en escalera: hasta `piso+1`, sin techo.
  - `static func ve(g: Grilla, desde: Vector3i, mirando: Vector2, hasta: Vector3i, radio: float, cono_grados: float) -> bool` (dentro del cono y con línea libre por `tapa_vista`, recorrido tipo Bresenham sobre casillas). Por detrás del cono ve solo a ≤ 1,5 casillas (como PZ).
  - `static func paredes_a_recortar(g: Grilla, jugador: Vector3i) -> Array[Vector3i]` (casillas al sur y este del jugador en las 3 casillas siguientes, cuyas paredes tapan al jugador desde la cámara).
- Produces `Camara extends Camera3D`: `PROJECTION_ORTHOGONAL`, rotación yaw 45°, pitch −30° (aspecto isométrico de PZ), `size` entre 8 y 40 con pellizco, sigue al jugador con suavizado.

- [ ] **Step 1: Tests**: los casos de `pisos_visibles` de arriba, **incluido escalera** (Review Focus); `ve` bloqueado por pared, no bloqueado por ventana, fuera de cono falso, detrás a 1 casilla verdadero; `paredes_a_recortar` en `prueba.txt` con el jugador detrás de la pared sur devuelve esa pared.
- [ ] **Step 2–4:** FALLA → implementar → PASA. La niebla de "lo que no ves" se dibuja oscureciendo las casillas no visibles (shader de suelo con una textura de visibilidad por chunk) y ocultando zombies no visibles.
- [ ] **Step 5:** Capturas `adentro.png` y `escalera.png`. Commit `"Cámara isométrica, cortes de techo y paredes, visión"`.

### Task 8: Reloj y ruido

**Files:** Create `juego/reglas/reloj.gd`, `juego/reglas/ruido.gd`, `juego/tests/test_reloj_ruido.gd`

**Interfaces:**
- Produces `class_name Reloj extends RefCounted`: `var segundos_juego: float` (desde 1993-07-09 00:00), `func avanzar(delta_real: float)` (×24), `func texto() -> String` (`"9 jul 1993 09:00"`), `func horas_desde(seg: float) -> float`, `func dias_y_horas_sobrevividos(inicio: float) -> Vector2i`.
- Produces `class_name Ruido extends RefCounted`: `func emitir(origen: Vector3i, radio: float, volumen: float) -> void`, `func pendientes() -> Array[Dictionary]` (`{origen, radio, volumen}`, se vacía cada tick), `static func radio_efectivo(g: Grilla, origen: Vector3i, oyente: Vector3i, radio: float) -> float` — cada pared o puerta cerrada en la línea recta reduce el radio a la mitad, cada ventana cerrada ×0,75 (valor propio, `"verificar": true` en `ruidos.json`).

- [ ] **Step 1: Tests**: inicio `texto() == "9 jul 1993 09:00"`; `avanzar(3600)` suma 1 día; zombie a 6 casillas oye caminar (7) y a 8 no; con una pared en medio a 4 casillas no oye caminar (7/2 = 3,5 < 4).
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Reloj del juego y ruido con atenuación"`.

### Task 9: Caminos

**Files:** Create `juego/reglas/caminos.gd`, `juego/tests/test_caminos.gd`

**Interfaces:**
- Consumes: `Grilla.puede_pasar`.
- Produces `class_name Caminos extends RefCounted`: `func _init(g: Grilla)`, `func buscar(a: Vector3i, b: Vector3i, puede_abrir_puertas: bool, puede_trepar: bool) -> Array[Vector3i]` (vacío si no hay camino; A* propio sobre la grilla 3D con vecinos 8-dir + escaleras, porque `AStarGrid2D` no modela bordes), `func obstaculo_mas_cercano(a: Vector3i, b: Vector3i) -> Dictionary` (`{casilla, lado}` de la puerta/ventana que un zombie debería golpear para llegar; vacío si no hay).
- Límite: 2000 nodos explorados por búsqueda.

- [ ] **Step 1: Tests**: camino rodeando una pared; sube por la escalera de `prueba.txt`; con puerta cerrada y `puede_abrir_puertas=false` → vacío, y `obstaculo_mas_cercano` devuelve esa puerta; trepando una ventana rota con `puede_trepar=true`.
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Pathfinding por pisos con escaleras y obstáculos"`.

### Task 10: Mente de zombie

**Files:** Create `juego/reglas/mente_zombie.gd`, `juego/tests/test_mente_zombie.gd`

**Interfaces:**
- Consumes: `Vision.ve`, `Ruido`, `Caminos`, `Datos.lore`.
- Produces `class_name MenteZombie extends RefCounted`: estados `DEAMBULAR, INVESTIGAR, PERSEGUIR, GOLPEAR, ATACAR, CAIDO, MUERTO`; `var estado: int`, `var objetivo: Vector3i`, `var memoria: int`; `func pensar(ctx: Dictionary, rng: RandomNumberGenerator) -> Dictionary` donde `ctx = {grilla, caminos, pos: Vector3i, mirando: Vector2, jugador_pos: Vector3i, jugador_visible_desde_aqui: bool, ruidos: Array}` y devuelve una orden `{accion: &"mover"|&"golpear"|&"atacar"|&"esperar", destino: Vector3i, casilla: Vector3i, lado: int}`.
- Reglas: si ve al jugador → PERSEGUIR (memoria = `lore.memoria_ticks`); si no ve pero memoria > 0 → sigue a la última posición conocida, memoria −1 por tick; si oye un ruido (radio efectivo ≥ distancia) → INVESTIGAR el de mayor volumen; si no → DEAMBULAR. Sin camino al objetivo → GOLPEAR `obstaculo_mas_cercano`; si tampoco hay obstáculo → DEAMBULAR (**Review Focus**). Adyacente al jugador → ATACAR.

- [ ] **Step 1: Tests**: cada transición de arriba con un `ctx` armado a mano; memoria baja a 0 tras 800 ticks sin ver y vuelve a DEAMBULAR; casa sellada sin obstáculos golpeables → DEAMBULAR, nunca `esperar` indefinido; dos ruidos → elige el de mayor volumen.
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Mente de zombie: vista, oído, memoria, golpear obstáculos"`.

### Task 11: Cuerpo, heridas e infección

**Files:** Create `juego/reglas/cuerpo.gd`, `juego/tests/test_cuerpo.gd`

**Interfaces:**
- Produces `class_name Cuerpo extends RefCounted`:
  - `const PARTES: Array[StringName]` — las 17 de PZ: `mano_izq, mano_der, antebrazo_izq, antebrazo_der, brazo_izq, brazo_der, torso_sup, torso_inf, cabeza, cuello, ingle, muslo_izq, muslo_der, canilla_izq, canilla_der, pie_izq, pie_der`.
  - `var salud: float` (0–100), `var infectado_knox: bool`, `var horas_infectado: float`, `var muerto: bool`, `var causa_muerte: StringName`.
  - `func herir(parte: StringName, tipo: StringName, rng: RandomNumberGenerator) -> void` (`tipo` ∈ `&"arañazo", &"laceracion", &"mordida"`; tira el contagio con `infeccion.json`; agrega sangrado).
  - `func vendar(parte: StringName, limpia: bool) -> void`, `func avanzar(horas_juego: float) -> void` (sangrado resta salud, heridas curan con la tabla de horas de las notas, Knox progresa: síntomas por horas y muerte a las 72 h → `causa_muerte = &"infeccion"`), `func dolor() -> float`, `func sangrando() -> bool`.
  - Mordida en cuello sin vendar mata en minutos (`causa_muerte = &"desangrado"`).

- [ ] **Step 1: Tests**: con RNG semilla fija, 10 000 arañazos → tasa de contagio 0,07 ± 0,01; mordida siempre contagia; infectado a 71 h vivo, a 72 h `muerto` con causa infección; herida sin vendar sangra y baja salud, vendada no; mordida en cuello sin vendar → muerto antes de 1 hora de juego.
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Cuerpo: 17 partes, heridas, vendas e infección Knox"`.

### Task 12: Movimiento, inventario y moodles

**Files:** Create `juego/reglas/movimiento.gd`, `juego/reglas/inventario.gd`, `juego/reglas/moodles.gd`, `juego/tests/test_movimiento.gd`, `juego/tests/test_inventario.gd`, `juego/tests/test_moodles.gd`

**Interfaces:**
- Produces `class_name Movimiento extends RefCounted`: `enum Postura {CAMINAR, CORRER, ESPRINTAR, AGACHADO}`; `var endurance: float` (0–1); `func velocidad(p: Postura, carga_nivel: int, rasgos: Array) -> float` (m/s, de `Datos`); `func ruido_paso(p: Postura, rasgos: Array) -> float` (7/7/14/3,5 con Lightfooted ×0,2 y Nimble ×0,5 sobre agachado, según notas); `func avanzar(segundos: float, p: Postura)` (correr y esprintar gastan endurance; parado recupera).
- Produces `class_name Inventario extends RefCounted`: `var capacidad_base: float = 8.0`; `func agregar(id: StringName) -> void`, `func quitar(id) -> bool`, `func equipar(id, dos_manos: bool) -> void`, `func peso_total() -> float` (equipado cuenta 30 %), `func nivel_carga(capacidad: float) -> int` (0 hasta 100 %; 1/2/3/4 a >100/125/150/175 %).
- Produces `class_name Moodles extends RefCounted`: `static func calcular(cuerpo: Cuerpo, mov: Movimiento, inv: Inventario, panico: float) -> Dictionary` → `{&"dolor": n, &"panico": n, &"sangrando": n, &"herido": n, &"cansancio_fisico": n, &"carga": n, &"enfermo": n}` con niveles 0–4 y los umbrales de `moodles.json`. `panico` sube ~3 % por zombie visto y +0,5 %/min con zombies a la vista (de las notas).

- [ ] **Step 1: Tests**: ruido de cada postura con y sin rasgos; endurance baja esprintando y sube parado; 10 de peso con capacidad 8 → nivel 2 (125 %); arma equipada de 2 pesa 0,6; moodles devuelven los 7 nombres y sus niveles según umbrales.
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Movimiento, inventario por peso y moodles de la etapa 1"`.

### Task 13: Combate cuerpo a cuerpo

**Files:** Create `juego/reglas/combate.gd`, `juego/tests/test_combate.gd`

**Interfaces:**
- Consumes: `Datos.arma`, `Cuerpo`.
- Produces `class_name Combate extends RefCounted`:
  - `static func golpe(arma: Dictionary, distancia: float, nivel_habilidad: int, fuerza: int, una_mano_con_arma_de_dos: bool, panico_nivel: int, rng: RandomNumberGenerator) -> Dictionary` → `{tipo: &"golpe"|&"empujon", daño: float, critico: bool}`. Si `distancia < alcance_min` → empujón. Daño = rand(min,max) × fuerza (75 %–125 % lineal 0–10) × bonus de habilidad (+10 % niveles 3–6, +20 % 7+ en axe/long_blunt/spear) × 0,5 si `una_mano_con_arma_de_dos`, menos penalidad de pánico. Crítico: `crit + 3 %·nivel − pánico`, limitado a 10–90 %; crítico multiplica por `crit_mult`.
  - `static func pierde_condicion(arma: Dictionary, mantenimiento: int, nivel_arma: int, rng) -> bool` → `rng.randi_range(0, uno_en + mod*2) == 0`, con `mod = floor((mantenimiento + floor(nivel_arma/2)) / 2)`.
  - `static func pisoton(rng) -> float`, `static func empujon_tira(fuerza: int, rng) -> bool`.
  - Vida del zombie por Toughness: de `lore.json`.
  - `static func ataque_zombie(atacantes_alrededor: int, defensa_ropa: Dictionary, rng) -> StringName` → `&"nada"|&"arañazo"|&"laceracion"|&"mordida"`; la probabilidad de herida y de mordida sube con los zombies alrededor (proporciones de las notas o, si faltan, propias con `"verificar": true`); la ropa resta según `defensa_ropa` de la parte golpeada.
  - `static func lunge_tira(rng) -> bool` para el zombie que salta un cerco bajo (si `lore.fence_lunge`).

- [ ] **Step 1: Tests**: distancia 0,3 con bate → empujón; daño del bate siempre en `[0.8×0.75, 1.1×1.25×crit_mult]`; con arma de dos a una mano el promedio de 5000 golpes ≈ mitad; crítico nunca < 10 % ni > 90 % en 10 000 tiradas; palanca con mantenimiento 0 pierde condición ≈ 1/71 de las veces.
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Combate cuerpo a cuerpo con fórmulas del original"`.

### Task 14: Partida: todo junto y jugable con teclado

**Files:** Create `juego/reglas/partida.gd`, `juego/escenas/main.tscn`, `juego/escenas/main.gd`, `juego/escenas/jugador.gd`, `juego/escenas/zombie.gd`, `juego/tests/test_partida.gd`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces `class_name Partida extends RefCounted`: `var grilla, reloj, ruido, caminos, jugador_pos: Vector3, jugador_mirando: Vector2, movimiento, cuerpo, inventario, zombies: Array[Dictionary]` (`{pos: Vector3, mente: MenteZombie, vida: float, caido: bool}`), `var zombies_matados: int`, `var inicio_seg: float`; `static func nueva(mapa: String, profesion: StringName, rasgos: Array, semilla: int) -> Partida`; `func tick(delta_real: float, entrada: Dictionary) -> void` (`entrada = {mover: Vector2, postura: int, atacar: bool, accion_contextual: Dictionary}`); `func termino() -> bool`.
- Población inicial: densidad del lore por defecto aplicada a las casillas de calle/pasto del mapa (valor exacto en `lore.json`), sin zombies a < 15 casillas del inicio.
- Los nodos `jugador.gd`/`zombie.gd` interpolan posiciones de `Partida` y animan cuerpos 3D simples (personas de bloques redondeados, mismo esqueleto para jugador y zombie, ropa con colores tomados de las referencias). Teclado de escritorio: WASD, Shift, Ctrl, Espacio, clic derecho = apuntar, como PZ.

- Muerte: si `cuerpo.infectado_knox`, a los 60–120 s de juego el cadáver se convierte en un zombie más en `zombies`. Zombie caído + atacar encima = pisotón. Luz fija de día (sol a las 12:00) en esta etapa.

- [ ] **Step 1: Tests** (semilla fija, sin pantalla): jugador infectado que muere → aparece un zombie nuevo en su posición dentro de 120 s de juego; zombie que salta un cerco bajo pasa a CAIDO; 600 ticks de 0,1 s caminando hacia un zombie → el zombie pasa a PERSEGUIR; atacar con bate hasta que su vida ≤ 0 → `zombies_matados == 1`; dejar que un zombie ataque sin defenderse → el cuerpo recibe heridas y eventualmente `termino()`; abrir una puerta con `accion_contextual` cambia la grilla.
- [ ] **Step 2–4:** FALLA → implementar → PASA.
- [ ] **Step 5:** Captura `pelea.png`. Commit `"Partida jugable: jugador, zombies y combate en Muldraugh"`.

### Task 15: Controles táctiles y HUD

**Files:** Create `juego/escenas/ui/hud.gd`, `juego/escenas/ui/joystick.gd`, `juego/escenas/ui/menu_contextual.gd`, `juego/escenas/ui/ventana_inventario.gd`, `juego/escenas/ui/ventana_salud.gd`, `juego/tests/test_toques.gd`

**Interfaces:**
- Consumes: `Partida`, `Moodles`.
- Produces `Hud extends CanvasLayer` con `func entrada() -> Dictionary` (mismo formato que `Partida.tick`). Joystick a la izquierda (a fondo = correr), botones a la derecha (atacar, mantener = apuntar, agacharse, esprintar), barra superior con reloj y moodles (iconos redibujados imitando los originales, tooltip al mantener), botones de inventario y salud.
- Mantener apretado 0,4 s sobre una casilla → `MenuContextual` con las opciones de PZ para lo que hay ahí (Abrir/Cerrar puerta, Trepar ventana, Romper ventana, Agarrar objeto, Vendar…). Mando Bluetooth: mismo mapeo que PZ con mando (`InputMap`).
- Multitáctil: cada control guarda el `index` del toque que lo tomó y solo responde a ese índice.

- [ ] **Step 1: Tests** con `InputEventScreenTouch`/`ScreenDrag` simulados: joystick con índice 0 arrastrado + atacar con índice 1 tocado → `entrada()` tiene `mover != 0` y `atacar == true` a la vez (**Review Focus**); soltar el índice 1 no suelta el joystick; mantener 0,4 s sobre una puerta abre el menú con "Abrir puerta".
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Capturas `hud.png`, `inventario.png`, `salud.png`; comparar con las referencias. Commit `"Controles táctiles, menú contextual, ventanas de inventario y salud"`.

### Task 16: Inicio, creación de personaje y pantalla de muerte

**Files:** Create `juego/escenas/ui/inicio.gd`, `juego/escenas/ui/creacion.gd`, `juego/escenas/ui/muerte.gd`, `juego/tests/test_creacion.gd`

**Interfaces:**
- Consumes: `Datos.profesion/rasgo`, `Partida.nueva`, `Reloj.dias_y_horas_sobrevividos`.
- Produces: `class_name Creacion extends RefCounted` con `static func puntos(profesion: StringName, rasgos: Array) -> int` y `static func valido(profesion, rasgos) -> bool` (puntos ≥ 0 y sin rasgos excluyentes, según `rasgos.json`). Pantallas: menú (Nueva partida / Continuar), creación con la misma distribución que PZ (profesiones a la izquierda, rasgos positivos/negativos, puntos restantes), muerte con "This is how you died", "Así moriste", días y horas sobrevividos y zombies matados.

- [ ] **Step 1: Tests**: desempleado sin rasgos → 8 puntos; un rasgo excluyente con su opuesto → `valido == false`; texto de muerte para 2 días y 5 horas y 14 zombies contiene `"2 días, 5 horas"` y `"14"`.
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Capturas `inicio.png`, `creacion.png`, `muerte.png`. Commit `"Menú, creación de personaje y pantalla de muerte"`.

### Task 17: Guardado

**Files:** Create `juego/reglas/guardado.gd`, `juego/tests/test_guardado.gd`

**Interfaces:**
- Consumes: `Partida`.
- Produces `class_name Guardado extends RefCounted`: `const VERSION := 1`; `static func a_texto(p: Partida) -> String` (JSON con `version`, reloj, jugador, cuerpo, inventario, zombies, aberturas cambiadas, objetos movidos); `static func desde_texto(s: String) -> Dictionary` → `{ok: bool, partida: Partida, error: String}`; `static func guardar(p: Partida, ruta := "user://partida.json")` escribe a `ruta + ".tmp"` y renombra (nunca deja un archivo cortado); `static func cargar(ruta) -> Dictionary`.
- Se guarda cada 60 s reales, al salir y en `NOTIFICATION_APPLICATION_PAUSED` / `NOTIFICATION_APPLICATION_FOCUS_OUT`; al volver el juego queda en pausa.

- [ ] **Step 1: Tests**: ida y vuelta conserva posición, salud, heridas, infección, inventario, puertas abiertas y zombies; texto cortado a la mitad → `ok == false` y el archivo original sigue ahí (**Review Focus**); `version` distinta → `ok == false` con error "partida de otra versión"; la notificación de pausa dispara un guardado y deja `get_tree().paused == true` (**Review Focus**).
- [ ] **Step 2–4:** FALLA → implementar → PASA. **Step 5:** Commit `"Guardado automático y seguro de la partida"`.

### Task 18: Rendimiento, exportación y entrega

**Files:** Create `juego/export_presets.cfg`, `juego/LEEME.md`; Modify `juego/escenas/main.gd`

**Interfaces:**
- Produces: contador de cuadros activable en Opciones; si el promedio de 5 s baja de 25 cps, `Partida` simula completos solo los zombies a ≤ 20 casillas (el resto se mueve 1 vez por segundo); máximo 50 completos.
- `LEEME.md`: cómo abrir `juego/project.godot` en Godot 4.7 y exportar el APK (igual que URBANA), cómo instalarlo en otro celular pasando el archivo, y recordatorio de mantener el repo privado.

- [ ] **Step 1: Test**: `Partida` con 300 zombies y `cps_promedio = 20` → como máximo 50 con simulación completa.
- [ ] **Step 2–4:** FALLA → implementar → PASA.
- [ ] **Step 5:** Exportar con el Godot headless (`--export-release Android`) solo si están las plantillas de exportación; si no, dejarlo indicado en `LEEME.md` para que lo exporte el autor.
- [ ] **Step 6:** `tools/probar.sh` completo en verde; capturas finales revisadas. Commit `"Rendimiento, exportación a Android y LEEME"`.
- [ ] **Step 7:** El autor instala el APK y juega hasta morir; lo que no se sienta como PZ se anota para corregir.
