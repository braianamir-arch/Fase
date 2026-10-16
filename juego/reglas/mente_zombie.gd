class_name MenteZombie
extends RefCounted
# Lo que decide un zombie en cada tick. Prioridad de PZ: lo que ve > lo que oye > deambular.
# pensar() devuelve una orden {accion, destino, casilla, lado}; el que la ejecuta es Partida.

enum { DEAMBULAR, INVESTIGAR, PERSEGUIR, GOLPEAR, ATACAR, CAIDO, MUERTO }

const PROB_PASO_DEAMBULANDO := 0.3

static var _memoria_max: int = -1

var estado: int = DEAMBULAR
var objetivo: Vector3i = Vector3i.ZERO
var memoria: int = 0


static func memoria_max() -> int:
	if _memoria_max < 0:
		_memoria_max = int(DatosJuego.cargar_json("res://datos/lore.json").get("memoria_ticks", 800))
	return _memoria_max


func pensar(ctx: Dictionary, rng: RandomNumberGenerator) -> Dictionary:
	if estado == CAIDO or estado == MUERTO:
		return _orden(&"esperar")
	var g: Grilla = ctx.grilla
	var pos: Vector3i = ctx.pos
	var jugador: Vector3i = ctx.jugador_pos
	if ctx.jugador_visible_desde_aqui:
		objetivo = jugador
		memoria = memoria_max()
		if _al_lado(g, pos, jugador):
			estado = ATACAR
			return _orden(&"atacar")
		estado = PERSEGUIR
		return _ir_a(ctx, jugador, rng)
	if estado == PERSEGUIR or estado == ATACAR or estado == GOLPEAR:
		memoria -= 1
		if memoria > 0:
			estado = PERSEGUIR
			return _ir_a(ctx, objetivo, rng)
		memoria = 0
		estado = DEAMBULAR
	var ruido := _ruido_mas_atractivo(g, pos, ctx.get("ruidos", []))
	if not ruido.is_empty():
		estado = INVESTIGAR
		objetivo = ruido.origen
	if estado == INVESTIGAR:
		if pos == objetivo:
			estado = DEAMBULAR
		else:
			return _ir_a(ctx, objetivo, rng)
	return _deambular(g, pos, rng)


const REPLANEAR_CADA := 8        # pensadas: se rehace el camino aunque la meta no cambie
const OLVIDAR_INALCANZABLE := 12  # pensadas (≈3 s) sin volver a buscar una meta imposible

var _camino: Array[Vector3i] = []
var _meta_camino := Vector3i(-1, -1, -1)
var _edad_camino := 0
var _inalcanzables: Dictionary = {}   # meta -> pensadas que faltan para volver a intentar


# Al lado (o en la misma casilla) y sin nada en medio.
func _al_lado(g: Grilla, a: Vector3i, b: Vector3i) -> bool:
	if a.z != b.z:
		return false
	var d := maxi(absi(a.x - b.x), absi(a.y - b.y))
	return d == 0 or (d == 1 and g.puede_pasar(a, b, false, false))


func _ir_a(ctx: Dictionary, meta: Vector3i, rng: RandomNumberGenerator) -> Dictionary:
	var g: Grilla = ctx.grilla
	var pos: Vector3i = ctx.pos
	for k in _inalcanzables.keys():
		_inalcanzables[k] -= 1
		if _inalcanzables[k] <= 0:
			_inalcanzables.erase(k)
	if _inalcanzables.has(meta):
		return _olvidar(g, pos, rng)
	var camino := _camino_hacia(ctx.caminos, pos, meta)
	if camino.is_empty():
		_inalcanzables[meta] = OLVIDAR_INALCANZABLE
		return _olvidar(g, pos, rng)
	if camino.size() == 1:
		return _orden(&"esperar")
	var sig := camino[1]
	# El paso siguiente cruza una puerta o ventana cerrada: se golpea desde este lado.
	if sig.z == pos.z and g.rompible_entre(pos, sig) and not g.puede_pasar(pos, sig, false, true):
		estado = GOLPEAR
		var bl := g.borde_entre(pos, sig)
		return _orden(&"golpear", Vector3i.ZERO, bl[0], bl[1])
	return _orden(&"mover", sig)


# Camino (en modo rompible) desde pos; reutiliza el anterior si la meta no cambió.
func _camino_hacia(caminos: Caminos, pos: Vector3i, meta: Vector3i) -> Array[Vector3i]:
	_edad_camino += 1
	var i := _camino.find(pos)
	if meta == _meta_camino and i >= 0 and _edad_camino < REPLANEAR_CADA:
		_camino = _camino.slice(i)
		return _camino
	_camino = caminos.buscar(pos, meta, false, true, true)
	_meta_camino = meta
	_edad_camino = 0
	return _camino


# Ni camino ni obstáculo que romper: se olvida y deambula.
func _olvidar(g: Grilla, pos: Vector3i, rng: RandomNumberGenerator) -> Dictionary:
	estado = DEAMBULAR
	memoria = 0
	_camino = []
	return _deambular(g, pos, rng)


func _ruido_mas_atractivo(g: Grilla, pos: Vector3i, ruidos: Array) -> Dictionary:
	var mejor := {}
	for r: Dictionary in ruidos:
		if Ruido.oye(g, r.origen, pos, r.radio) and (mejor.is_empty() or r.volumen > mejor.volumen):
			mejor = r
	return mejor


func _deambular(g: Grilla, pos: Vector3i, rng: RandomNumberGenerator) -> Dictionary:
	estado = DEAMBULAR
	if rng.randf() < PROB_PASO_DEAMBULANDO:
		var opciones := []
		for d in Caminos.VECINOS:
			if g.puede_pasar(pos, pos + d, false, false):
				opciones.append(pos + d)
		if not opciones.is_empty():
			return _orden(&"mover", opciones[rng.randi() % opciones.size()])
	return _orden(&"esperar")


func _orden(accion: StringName, destino: Vector3i = Vector3i.ZERO, casilla: Vector3i = Vector3i.ZERO, lado: int = 0) -> Dictionary:
	return {"accion": accion, "destino": destino, "casilla": casilla, "lado": lado}
