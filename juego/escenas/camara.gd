class_name Camara
extends Camera3D
# Cámara ortográfica fija en diagonal (aspecto isométrico de PZ). Sigue al jugador y hace zoom
# con pellizco o rueda.

const YAW := 45.0
const PITCH := -30.0
const DISTANCIA := 60.0
const ZOOM_MIN := 8.0
const ZOOM_MAX := 40.0
const SUAVIZADO := 8.0

var objetivo: Vector3 = Vector3.ZERO
var _toques: Dictionary = {}
var _dist_pellizco := 0.0


func _init() -> void:
	projection = PROJECTION_ORTHOGONAL
	size = 18.0
	rotation_degrees = Vector3(PITCH, YAW, 0)
	near = 0.1
	far = 200.0


func enfocar(punto: Vector3, inmediato: bool = false) -> void:
	objetivo = punto
	if inmediato:
		position = punto + transform.basis.z * DISTANCIA


func _process(delta: float) -> void:
	var meta := objetivo + transform.basis.z * DISTANCIA
	position = position.lerp(meta, clampf(SUAVIZADO * delta, 0.0, 1.0))


func zoom(factor: float) -> void:
	size = clampf(size * factor, ZOOM_MIN, ZOOM_MAX)


func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventMouseButton and ev.pressed:
		if ev.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom(0.9)
		elif ev.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom(1.1)
	elif ev is InputEventMagnifyGesture:
		zoom(1.0 / ev.factor)
	elif ev is InputEventScreenTouch:
		if ev.pressed:
			_toques[ev.index] = ev.position
		else:
			_toques.erase(ev.index)
		_dist_pellizco = _distancia_toques()
	elif ev is InputEventScreenDrag and _toques.has(ev.index):
		_toques[ev.index] = ev.position
		var d := _distancia_toques()
		if _dist_pellizco > 0.0 and d > 0.0:
			zoom(_dist_pellizco / d)
		_dist_pellizco = d


func _distancia_toques() -> float:
	if _toques.size() != 2:
		return 0.0
	var v: Array = _toques.values()
	return (v[0] as Vector2).distance_to(v[1])
