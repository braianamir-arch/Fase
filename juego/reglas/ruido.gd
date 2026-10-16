class_name Ruido
extends RefCounted
# Ruidos con radio (hasta dónde se oyen) y volumen (cuánto atraen), en casillas.
# Paredes, puertas y ventanas cerradas en la línea recta achican el radio (ruidos.json: atenuacion).

var _pendientes: Array[Dictionary] = []
static var _atenuacion: Dictionary = {}


func emitir(origen: Vector3i, radio: float, volumen: float) -> void:
	_pendientes.append({"origen": origen, "radio": radio, "volumen": volumen})


func pendientes() -> Array[Dictionary]:
	return _pendientes


# Devuelve los ruidos de este tick y vacía la lista.
func tomar() -> Array[Dictionary]:
	var r := _pendientes
	_pendientes = []
	return r


static func _factores() -> Dictionary:
	if _atenuacion.is_empty():
		_atenuacion = DatosJuego.cargar_json("res://datos/ruidos.json").get("atenuacion", {})
	return _atenuacion


static func radio_efectivo(g: Grilla, origen: Vector3i, oyente: Vector3i, radio: float) -> float:
	var f := _factores()
	var r := radio
	if origen.z != oyente.z:
		r *= f.get("pared", 0.5)
	var x := origen.x
	var y := origen.y
	var dx := absi(oyente.x - origen.x)
	var dy := absi(oyente.y - origen.y)
	var sx := 1 if oyente.x > origen.x else -1
	var sy := 1 if oyente.y > origen.y else -1
	var err := dx - dy
	while x != oyente.x or y != oyente.y:
		var e2 := 2 * err
		var a := Vector3i(x, y, origen.z)
		if e2 > -dy:
			err -= dy
			x += sx
			r *= _factor_borde(g, a, Vector3i(x, a.y, a.z), f)
			a = Vector3i(x, a.y, a.z)
		if e2 < dx:
			err += dx
			y += sy
			r *= _factor_borde(g, a, Vector3i(a.x, y, a.z), f)
	return r


static func _factor_borde(g: Grilla, a: Vector3i, b: Vector3i, f: Dictionary) -> float:
	match g.entre(a, b):
		Grilla.B_PARED:
			return f.get("pared", 0.5)
		Grilla.B_PUERTA:
			var bl := b if b.y > a.y or b.x > a.x else a
			var lado := Grilla.NORTE if a.y != b.y else Grilla.OESTE
			var e := g.estado_abertura(bl, lado)
			return 1.0 if e.get("abierta", false) or e.get("rota", false) else f.get("puerta_cerrada", 0.5)
		Grilla.B_VENTANA:
			var bl := b if b.y > a.y or b.x > a.x else a
			var lado := Grilla.NORTE if a.y != b.y else Grilla.OESTE
			var e := g.estado_abertura(bl, lado)
			return 1.0 if e.get("abierta", false) or e.get("rota", false) else f.get("ventana_cerrada", 0.75)
	return 1.0


static func oye(g: Grilla, origen: Vector3i, oyente: Vector3i, radio: float) -> bool:
	var d := Vector2(oyente.x - origen.x, oyente.y - origen.y).length()
	return d <= radio_efectivo(g, origen, oyente, radio)
