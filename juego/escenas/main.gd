extends Node3D
# Escena del juego: dibuja la Partida y le pasa la entrada (teclado o, desde la Tarea 15, el HUD táctil).

const RADIO_NIEBLA := 22
const CADA_NIEBLA := 0.25

var partida: Partida
var mundo: Mundo3D
var camara: Camara
var jugador: JugadorNodo
var zombies: Dictionary = {}       # id -> ZombieNodo
var objetos: Node3D
var niebla: MultiMeshInstance3D
var hud: Node = null               # lo pone la Tarea 15
var _t_niebla := 0.0
var _visibles: Dictionary = {}


func _ready() -> void:
	if partida == null:
		iniciar(Partida.nueva("res://datos/mapas/muldraugh.txt", &"bombero", [], randi()))


func iniciar(p: Partida) -> void:
	partida = p
	for h in get_children():
		h.queue_free()
	zombies.clear()
	var sol := DirectionalLight3D.new()
	sol.rotation_degrees = Vector3(-55, 30, 0)
	sol.shadow_enabled = true
	sol.light_energy = 1.1
	add_child(sol)
	var amb := WorldEnvironment.new()
	amb.environment = Environment.new()
	amb.environment.background_mode = Environment.BG_COLOR
	amb.environment.background_color = Color(0.08, 0.08, 0.09)
	amb.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	amb.environment.ambient_light_color = Color(0.55, 0.55, 0.6)
	add_child(amb)
	mundo = Mundo3D.new()
	add_child(mundo)
	mundo.cargar(p.grilla)
	objetos = Node3D.new()
	add_child(objetos)
	_dibujar_objetos()
	jugador = JugadorNodo.new()
	add_child(jugador)
	camara = Camara.new()
	add_child(camara)
	var j := p.jugador_pos
	camara.enfocar(Vector3(j.x, j.y * ArmadoChunk.ALTO_PISO, j.z), true)
	niebla = MultiMeshInstance3D.new()
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	var quad := PlaneMesh.new()
	quad.size = Vector2(1, 1)
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0, 0, 0, 0.55)
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	quad.material = mat
	mm.mesh = quad
	mm.instance_count = (RADIO_NIEBLA * 2 + 1) * (RADIO_NIEBLA * 2 + 1)
	mm.visible_instance_count = 0
	niebla.multimesh = mm
	add_child(niebla)


func entrada_teclado() -> Dictionary:
	var mover := Vector2.ZERO
	if Input.is_physical_key_pressed(KEY_W): mover += Vector2(-1, -1)
	if Input.is_physical_key_pressed(KEY_S): mover += Vector2(1, 1)
	if Input.is_physical_key_pressed(KEY_A): mover += Vector2(-1, 1)
	if Input.is_physical_key_pressed(KEY_D): mover += Vector2(1, -1)
	var postura := Movimiento.Postura.CAMINAR
	if Input.is_physical_key_pressed(KEY_SHIFT): postura = Movimiento.Postura.CORRER
	if Input.is_physical_key_pressed(KEY_ALT): postura = Movimiento.Postura.ESPRINTAR
	if Input.is_physical_key_pressed(KEY_C): postura = Movimiento.Postura.AGACHADO
	return {"mover": mover.normalized(), "postura": postura, "atacar": Input.is_physical_key_pressed(KEY_SPACE),
		"accion_contextual": {}}


func _process(delta: float) -> void:
	if partida == null:
		return
	var e: Dictionary = hud.entrada() if hud != null else entrada_teclado()
	partida.tick(minf(delta, 0.1), e)
	_aplicar_eventos()
	jugador.sincronizar(partida, delta)
	var j := partida.jugador_pos
	camara.enfocar(Vector3(j.x, j.y * ArmadoChunk.ALTO_PISO, j.z))
	var c := partida.casilla_jugador()
	var v := Vision.pisos_visibles(c.z, partida.grilla.es_escalera(c), partida.grilla.adentro(c))
	mundo.mostrar(v.max_piso, v.techos)
	mundo.recortar(Vision.paredes_a_recortar(partida.grilla, c))
	_t_niebla -= delta
	if _t_niebla <= 0.0:
		_t_niebla = CADA_NIEBLA
		_actualizar_niebla()
	_sincronizar_zombies(delta, v.max_piso)


func _aplicar_eventos() -> void:
	for ev in partida.eventos:
		match ev.tipo:
			&"abertura":
				mundo.actualizar_abertura(ev.casilla, ev.lado)
			&"swing":
				jugador.golpear()
	if partida.eventos.any(func(e): return e.tipo == &"agarrar" or e.tipo == &"objetos"):
		_dibujar_objetos()


func _sincronizar_zombies(delta: float, max_piso: int) -> void:
	for z in partida.zombies:
		var n: ZombieNodo = zombies.get(z.id)
		if n == null:
			n = ZombieNodo.new()
			n.preparar(z.id)
			add_child(n)
			zombies[z.id] = n
		n.visible = _visibles.has(z.casilla) and int(z.pos.y) <= max_piso
		n.sincronizar(z, delta)


# Oscurece las casillas que el jugador no ve y guarda cuáles sí (para mostrar zombies).
func _actualizar_niebla() -> void:
	var g := partida.grilla
	var c := partida.casilla_jugador()
	var mm := niebla.multimesh
	var n := 0
	_visibles.clear()
	var base := c.z * ArmadoChunk.ALTO_PISO + 0.03
	for y in range(c.y - RADIO_NIEBLA, c.y + RADIO_NIEBLA + 1):
		for x in range(c.x - RADIO_NIEBLA, c.x + RADIO_NIEBLA + 1):
			var p := Vector3i(x, y, c.z)
			if g.suelo(p) == &"":
				continue
			if Vision.ve(g, c, partida.jugador_mirando, p, float(RADIO_NIEBLA), 144.0):
				_visibles[p] = true
			else:
				mm.set_instance_transform(n, Transform3D(Basis(), Vector3(x + 0.5, base, y + 0.5)))
				n += 1
	mm.visible_instance_count = n


func _dibujar_objetos() -> void:
	for h in objetos.get_children():
		h.queue_free()
	for c: Vector3i in partida.objetos_en_suelo:
		var mi := MeshInstance3D.new()
		var m := BoxMesh.new()
		m.size = Vector3(0.35, 0.08, 0.2)
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color(0.9, 0.75, 0.3)
		m.material = mat
		mi.mesh = m
		mi.position = Vector3(c.x + 0.5, c.z * ArmadoChunk.ALTO_PISO + 0.05, c.y + 0.5)
		objetos.add_child(mi)
