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
var hud: Hud
var vista_hud: HudVista
var ventana_inv: VentanaInventario
var ventana_salud: VentanaSalud
var _t_niebla := 0.0
var _visibles: Dictionary = {}


const MAPA := "res://datos/mapas/muldraugh.txt"

const CADA_GUARDADO := 60.0

var ruta_guardado := Guardado.RUTA
var pausado := false   # la partida no avanza (app en segundo plano)
var _t_muerto := 0.0
var _t_guardado := 0.0
var _pantalla: CanvasLayer


func _ready() -> void:
	if partida == null:
		mostrar_inicio()


func _limpiar() -> void:
	partida = null
	for h in get_children():
		h.queue_free()
	zombies.clear()
	_pantalla = null


func mostrar_inicio() -> void:
	_limpiar()
	var ini := PantallaInicio.new()
	ini.nueva.connect(mostrar_creacion)
	ini.continuar.connect(_continuar)
	add_child(ini)
	_pantalla = ini


func mostrar_creacion() -> void:
	_limpiar()
	var cre := PantallaCreacion.new()
	cre.empezar.connect(func(prof: StringName, rasgos: Array): iniciar(Partida.nueva(MAPA, prof, rasgos, randi())))
	add_child(cre)
	_pantalla = cre


func _continuar() -> void:
	var r := Guardado.cargar(ruta_guardado)
	if r.ok:
		iniciar(r.partida)
	else:
		var aviso := AcceptDialog.new()
		aviso.dialog_text = "No se pudo cargar la partida: %s.\nEl archivo no se borró." % r.error
		add_child(aviso)
		aviso.popup_centered()


# Se guarda cada minuto, al salir y cuando la app se va a segundo plano (llamada, botón de inicio).
func al_pausar() -> void:
	if partida != null and not partida.termino():
		Guardado.guardar(partida, ruta_guardado)
		pausado = true


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_PAUSED, NOTIFICATION_APPLICATION_FOCUS_OUT:
			al_pausar()
		NOTIFICATION_APPLICATION_RESUMED, NOTIFICATION_APPLICATION_FOCUS_IN:
			pausado = false
		NOTIFICATION_WM_CLOSE_REQUEST:
			if partida != null and not partida.termino():
				Guardado.guardar(partida, ruta_guardado)


func iniciar(p: Partida) -> void:
	_limpiar()
	partida = p
	_t_muerto = 0.0
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
	_armar_hud()


func _armar_hud() -> void:
	hud = Hud.new()
	hud.tamaño = get_viewport().get_visible_rect().size
	hud.armar()
	hud.consultar_casilla = _casilla_en_pantalla
	hud.opciones_para = func(c: Vector3i) -> Array: return partida.opciones_contextuales(c)
	add_child(hud)
	vista_hud = HudVista.new()
	vista_hud.hud = hud
	vista_hud.partida = partida
	hud.vista = vista_hud
	hud.add_child(vista_hud)
	ventana_inv = VentanaInventario.new()
	ventana_inv.partida = partida
	ventana_inv.mandar = _mandar
	ventana_salud = VentanaSalud.new()
	ventana_salud.partida = partida
	ventana_salud.mandar = _mandar
	for v: Ventana in [ventana_inv, ventana_salud]:
		v.visible = false
		v.position = Vector2(hud.tamaño.x * 0.5 - 280, 90)
		v.cerrada.connect(func(): _mostrar_ventana(v, false))
		hud.add_child(v)
	hud.boton_tocado.connect(func(n: StringName):
		if n == &"inventario": _mostrar_ventana(ventana_inv, not ventana_inv.visible)
		elif n == &"salud": _mostrar_ventana(ventana_salud, not ventana_salud.visible))


func _mostrar_ventana(v: Ventana, si: bool) -> void:
	for otra in [ventana_inv, ventana_salud]:
		otra.visible = false
	v.visible = si
	hud.bloqueos.clear()
	if si:
		v.refrescar()
		hud.bloqueos.append(Rect2(v.position, v.get_combined_minimum_size()))


func _mandar(accion: Dictionary) -> void:
	hud.mandar(accion)


# Casilla del piso del jugador que está bajo ese punto de la pantalla.
func _casilla_en_pantalla(pos: Vector2) -> Vector3i:
	var piso := int(partida.jugador_pos.y)
	var o := camara.project_ray_origin(pos)
	var n := camara.project_ray_normal(pos)
	var h := piso * ArmadoChunk.ALTO_PISO
	if absf(n.y) < 1e-4:
		return partida.casilla_jugador()
	var p := o + n * ((h - o.y) / n.y)
	return Vector3i(floori(p.x), floori(p.z), piso)


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
	var atacar := Input.is_physical_key_pressed(KEY_SPACE)
	# Mando (Bluetooth o USB): stick izquierdo camina, gatillo derecho o A ataca, gatillo izquierdo esprinta.
	var stick := Vector2(Input.get_joy_axis(0, JOY_AXIS_LEFT_X), Input.get_joy_axis(0, JOY_AXIS_LEFT_Y))
	if stick.length() > 0.2:
		mover = Vector2(1, -1).normalized() * stick.x - Vector2(-1, -1).normalized() * stick.y
		if stick.length() > 0.9:
			postura = Movimiento.Postura.CORRER
	if Input.get_joy_axis(0, JOY_AXIS_TRIGGER_LEFT) > 0.5:
		postura = Movimiento.Postura.ESPRINTAR
	if Input.get_joy_axis(0, JOY_AXIS_TRIGGER_RIGHT) > 0.5 or Input.is_joy_button_pressed(0, JOY_BUTTON_A):
		atacar = true
	return {"mover": mover.limit_length(1.0) if stick.length() > 0.2 else mover.normalized(), "postura": postura,
		"atacar": atacar, "accion_contextual": {}}


func _process(delta: float) -> void:
	if partida == null or pausado:
		return
	var e: Dictionary = hud.entrada()
	var tec := entrada_teclado()
	if (e.mover as Vector2) == Vector2.ZERO:
		e.mover = tec.mover
		if tec.postura != Movimiento.Postura.CAMINAR:
			e.postura = tec.postura
	e.atacar = e.atacar or tec.atacar
	partida.tick(minf(delta, 0.1), e)
	_aplicar_eventos()
	if not partida.eventos.is_empty():
		for v: Ventana in [ventana_inv, ventana_salud]:
			if v.visible:
				v.refrescar()
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
	_t_guardado += delta
	if _t_guardado >= CADA_GUARDADO and not partida.termino():
		_t_guardado = 0.0
		Guardado.guardar(partida, ruta_guardado)
	if partida.termino():
		if _t_muerto == 0.0:
			Guardado.borrar(ruta_guardado)   # la muerte es permanente
		_t_muerto += delta
		if _t_muerto > 4.0 and _pantalla == null:
			var m := PantallaMuerte.new()
			m.resumen = Creacion.texto_muerte(partida.reloj.dias_y_horas_sobrevividos(partida.inicio_seg), partida.zombies_matados)
			m.volver.connect(mostrar_inicio)
			add_child(m)
			_pantalla = m


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
