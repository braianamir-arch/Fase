class_name Hud
extends CanvasLayer
# Controles táctiles que imitan PZ: joystick a la izquierda, atacar/agacharse/esprintar a la derecha,
# mantener apretado sobre el mundo abre el menú contextual (el clic derecho de PZ).
# Cada control recuerda el índice del dedo que lo tomó y solo responde a ese dedo.

const RADIO_JOY := 110.0
const A_FONDO := 0.85
const MANTENER := 0.4
const TAM_BOTON := 70.0

var tamaño := Vector2(1280, 720)
var mostrar_cps := false            # contador de cuadros: tocar el reloj lo prende y apaga
var consultar_casilla: Callable     # (posición en pantalla) -> Vector3i
var opciones_para: Callable         # (Vector3i) -> Array de {texto, accion}

var _dedo_joy := -1
var _joy := Vector2.ZERO
var _dedo_atacar := -1
var _dedo_esprint := -1
var _agachado := false
var _botones: Dictionary = {}       # nombre -> Rect2
var _dedo_mundo := -1
var _pos_mundo := Vector2.ZERO
var _t_mantener := 0.0
var _menu: Array = []
var _accion_pendiente: Dictionary = {}

var vista: Control                  # dibujo (solo si está en pantalla)
var bloqueos: Array[Rect2] = []     # ventanas abiertas: ahí el toque es de la ventana
var rects_menu: Array[Rect2] = []
var pos_menu := Vector2.ZERO


func armar() -> void:
	var b := tamaño - Vector2(40, 40)
	_botones = {
		&"atacar": Rect2(b - Vector2(TAM_BOTON * 2, TAM_BOTON * 2), Vector2(TAM_BOTON * 2, TAM_BOTON * 2)),
		&"agacharse": Rect2(b - Vector2(TAM_BOTON * 3.4, TAM_BOTON * 1.2), Vector2(TAM_BOTON, TAM_BOTON)),
		&"esprintar": Rect2(b - Vector2(TAM_BOTON * 1.6, TAM_BOTON * 3.4), Vector2(TAM_BOTON, TAM_BOTON)),
		&"inventario": Rect2(Vector2(tamaño.x - 200, 20), Vector2(80, 60)),
		&"salud": Rect2(Vector2(tamaño.x - 110, 20), Vector2(80, 60)),
		&"reloj": Rect2(Vector2(10, 5), Vector2(240, 50)),
	}


func centro_joystick() -> Vector2:
	return Vector2(40 + RADIO_JOY * 1.3, tamaño.y - 40 - RADIO_JOY * 1.3)


func centro_boton(nombre: StringName) -> Vector2:
	return _botones[nombre].get_center()


func _boton_en(pos: Vector2) -> StringName:
	for n in _botones:
		if (_botones[n] as Rect2).grow(10).has_point(pos):
			return n
	return &""


func _input(ev: InputEvent) -> void:
	if procesar(ev):
		get_viewport().set_input_as_handled()


# Devuelve true si el evento lo usó el HUD.
func procesar(ev: InputEvent) -> bool:
	if ev is InputEventScreenTouch:
		return _toque(ev)
	if ev is InputEventScreenDrag:
		return _arrastre(ev)
	return false


signal boton_tocado(nombre: StringName)


func _toque(ev: InputEventScreenTouch) -> bool:
	for r: Rect2 in bloqueos:
		if r.has_point(ev.position) and ev.index != _dedo_joy and ev.index != _dedo_atacar:
			return false
	if ev.pressed:
		if not _menu.is_empty():
			for i in rects_menu.size():
				if (rects_menu[i] as Rect2).has_point(ev.position):
					elegir_opcion(i)
					return true
			cerrar_menu()
			return true
		var b := _boton_en(ev.position)
		match b:
			&"atacar":
				_dedo_atacar = ev.index
				return true
			&"esprintar":
				_dedo_esprint = ev.index
				return true
			&"agacharse", &"inventario", &"salud", &"reloj":
				return true
		if ev.position.x < tamaño.x * 0.4 and ev.position.y > tamaño.y * 0.35 and _dedo_joy < 0:
			_dedo_joy = ev.index
			_joy = Vector2.ZERO
			return true
		if _dedo_mundo < 0:
			_dedo_mundo = ev.index
			_pos_mundo = ev.position
			_t_mantener = 0.0
		return false
	# Soltar
	if ev.index == _dedo_joy:
		_dedo_joy = -1
		_joy = Vector2.ZERO
	elif ev.index == _dedo_atacar:
		_dedo_atacar = -1
	elif ev.index == _dedo_esprint:
		_dedo_esprint = -1
	elif ev.index == _dedo_mundo:
		_dedo_mundo = -1
	else:
		var b := _boton_en(ev.position)
		if b == &"agacharse":
			_agachado = not _agachado
		elif b == &"reloj":
			mostrar_cps = not mostrar_cps
		elif b != &"":
			boton_tocado.emit(b)
	return true


func _arrastre(ev: InputEventScreenDrag) -> bool:
	if ev.index == _dedo_joy:
		_joy = ((ev.position - centro_joystick()) / RADIO_JOY).limit_length(1.0)
		return true
	if ev.index == _dedo_mundo and ev.position.distance_to(_pos_mundo) > 30.0:
		_dedo_mundo = -1   # se movió: no es "mantener apretado"
	return false


func avanzar(delta: float) -> void:
	if _dedo_mundo >= 0 and _menu.is_empty():
		_t_mantener += delta
		if _t_mantener >= MANTENER:
			var c: Vector3i = consultar_casilla.call(_pos_mundo)
			_menu = opciones_para.call(c)
			pos_menu = _pos_mundo
			rects_menu.clear()
			for i in _menu.size():
				rects_menu.append(Rect2(pos_menu + Vector2(10, 10 + i * 64), Vector2(340, 58)))
			_dedo_mundo = -1


func _process(delta: float) -> void:
	avanzar(delta)
	if vista:
		vista.queue_redraw()


func menu_abierto() -> bool:
	return not _menu.is_empty()


func opciones_menu() -> Array[String]:
	var r: Array[String] = []
	for o in _menu:
		r.append(o.texto)
	return r


func elegir_opcion(i: int) -> void:
	if i >= 0 and i < _menu.size():
		_accion_pendiente = _menu[i].accion
	_menu = []


# Suelta todos los dedos (al pausar: ningún toque queda "apretado" al volver).
func soltar_todo() -> void:
	_dedo_joy = -1
	_joy = Vector2.ZERO
	_dedo_atacar = -1
	_dedo_esprint = -1
	_dedo_mundo = -1
	_menu = []


func mandar(accion: Dictionary) -> void:
	_accion_pendiente = accion


func cerrar_menu() -> void:
	_menu = []


func entrada() -> Dictionary:
	# Pantalla arriba = noroeste de la grilla (cámara a 45°), pantalla derecha = noreste.
	var arriba := Vector2(-1, -1).normalized()
	var derecha := Vector2(1, -1).normalized()
	var mover := (derecha * _joy.x - arriba * _joy.y)
	var postura := Movimiento.Postura.CAMINAR
	if _agachado:
		postura = Movimiento.Postura.AGACHADO
	elif _dedo_esprint >= 0:
		postura = Movimiento.Postura.ESPRINTAR
	elif _joy.length() >= A_FONDO:
		postura = Movimiento.Postura.CORRER
	var accion := _accion_pendiente
	_accion_pendiente = {}
	return {"mover": mover if _joy.length() > 0.15 else Vector2.ZERO, "postura": postura,
		"atacar": _dedo_atacar >= 0, "accion_contextual": accion}


func joystick() -> Vector2:
	return _joy


func agachado() -> bool:
	return _agachado


func botones() -> Dictionary:
	return _botones
