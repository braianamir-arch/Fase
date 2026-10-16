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


func _al_lado(g: Grilla, a: Vector3i, b: Vector3i) -> bool:
	if a.z != b.z or maxi(absi(a.x - b.x), absi(a.y - b.y)) != 1:
		return false
	return g.puede_pasar(a, b, false, false)


func _ir_a(ctx: Dictionary, meta: Vector3i, rng: RandomNumberGenerator) -> Dictionary:
	var caminos: Caminos = ctx.caminos
	var pos: Vector3i = ctx.pos
	var camino := caminos.buscar(pos, meta, false, true)
	if camino.size() >= 2:
		return _orden(&"mover", camino[1])
	if camino.size() == 1:
		return _orden(&"esperar")
	var obstaculo := caminos.obstaculo_mas_cercano(pos, meta)
	if not obstaculo.is_empty():
		estado = GOLPEAR
		var paso := caminos.buscar(pos, obstaculo.casilla, false, true)
		var junto: bool = pos == obstaculo.casilla or pos == obstaculo.casilla - (Vector3i(0, 1, 0) if obstaculo.lado == Grilla.NORTE else Vector3i(1, 0, 0))
		if junto or paso.size() < 2:
			return _orden(&"golpear", Vector3i.ZERO, obstaculo.casilla, obstaculo.lado)
		return _orden(&"mover", paso[1])
	# Ni camino ni obstáculo que romper: se olvida y deambula.
	estado = DEAMBULAR
	memoria = 0
	return _deambular(ctx.grilla, pos, rng)


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
