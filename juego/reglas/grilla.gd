class_name Grilla
extends RefCounted
# El mundo en casillas de 1 × 1 m y pisos apilados, como Project Zomboid.
# Cada casilla guarda solo sus bordes NORTE y OESTE: el sur de (x,y) es el norte de (x,y+1)
# y el este de (x,y) es el oeste de (x+1,y).

const NORTE := 0
const OESTE := 1

const B_NADA := 0
const B_PARED := 1
const B_PUERTA := 2
const B_VENTANA := 3
const B_CERCO_BAJO := 4
const B_CERCO_ALTO := 5

var ancho: int
var alto: int
var pisos: int

var _suelo: Array[StringName] = []
var _techo: PackedByteArray
var _bordes: PackedByteArray          # 2 por casilla: [norte, oeste]
var _aberturas: Dictionary = {}       # clave índice*2+lado -> {abierta, rota, tablas, vida}
var _muebles: Dictionary = {}         # índice -> {id, solido, tapa_vista}
var _escaleras: Dictionary = {}       # índice -> Vector2i dirección
var version: int = 0                  # sube con cada cambio (Caminos lo usa para su caché)


func _init(p_ancho: int, p_alto: int, p_pisos: int) -> void:
	ancho = p_ancho
	alto = p_alto
	pisos = p_pisos
	var n := ancho * alto * pisos
	_suelo.resize(n)
	_suelo.fill(&"")
	_techo = PackedByteArray()
	_techo.resize(n)
	_bordes = PackedByteArray()
	_bordes.resize(n * 2)


func dentro(p: Vector3i) -> bool:
	return p.x >= 0 and p.y >= 0 and p.z >= 0 and p.x < ancho and p.y < alto and p.z < pisos


func _i(p: Vector3i) -> int:
	return p.x + p.y * ancho + p.z * ancho * alto


func poner_suelo(p: Vector3i, tipo: StringName, con_techo: bool = false) -> void:
	version += 1
	if dentro(p):
		_suelo[_i(p)] = tipo
		_techo[_i(p)] = 1 if con_techo else 0


func suelo(p: Vector3i) -> StringName:
	return _suelo[_i(p)] if dentro(p) else &""


func adentro(p: Vector3i) -> bool:
	return dentro(p) and _techo[_i(p)] == 1


func poner_borde(p: Vector3i, lado: int, tipo: int) -> void:
	version += 1
	if not dentro(p):
		return
	_bordes[_i(p) * 2 + lado] = tipo
	if tipo == B_PUERTA or tipo == B_VENTANA:
		_aberturas[_i(p) * 2 + lado] = {"abierta": false, "rota": false, "tablas": 0, "vida": 1.0}


func borde(p: Vector3i, lado: int) -> int:
	return _bordes[_i(p) * 2 + lado] if dentro(p) else B_NADA


func estado_abertura(p: Vector3i, lado: int) -> Dictionary:
	return _aberturas.get(_i(p) * 2 + lado, {}) if dentro(p) else {}


func abrir(p: Vector3i, lado: int, abierta: bool) -> void:
	version += 1
	var e := estado_abertura(p, lado)
	if not e.is_empty():
		e.abierta = abierta


func romper(p: Vector3i, lado: int) -> void:
	version += 1
	var e := estado_abertura(p, lado)
	if not e.is_empty():
		e.rota = true
		e.abierta = true
		e.vida = 0.0


func poner_mueble(p: Vector3i, id: StringName, solido: bool, tapa: bool) -> void:
	version += 1
	if dentro(p):
		_muebles[_i(p)] = {"id": id, "solido": solido, "tapa_vista": tapa}


func mueble(p: Vector3i) -> StringName:
	return _muebles.get(_i(p), {}).get("id", &"") if dentro(p) else &""


func poner_escalera(p: Vector3i, direccion: Vector2i) -> void:
	version += 1
	if dentro(p):
		_escaleras[_i(p)] = direccion


func es_escalera(p: Vector3i) -> bool:
	return dentro(p) and _escaleras.has(_i(p))


func destino_escalera(p: Vector3i) -> Vector3i:
	var d: Vector2i = _escaleras[_i(p)]
	return p + Vector3i(d.x, d.y, 1)


# Borde que separa dos casillas vecinas ortogonales del mismo piso.
func _borde_entre(a: Vector3i, b: Vector3i) -> Array:
	var d := b - a
	if d == Vector3i(0, 1, 0):
		return [b, NORTE]
	if d == Vector3i(0, -1, 0):
		return [a, NORTE]
	if d == Vector3i(1, 0, 0):
		return [b, OESTE]
	if d == Vector3i(-1, 0, 0):
		return [a, OESTE]
	return []


func entre(a: Vector3i, b: Vector3i) -> int:
	var bl := _borde_entre(a, b)
	return B_NADA if bl.is_empty() else borde(bl[0], bl[1])


func _cruza_borde(a: Vector3i, b: Vector3i, puede_abrir: bool, puede_trepar: bool) -> bool:
	var bl := _borde_entre(a, b)
	var tipo := borde(bl[0], bl[1])
	match tipo:
		B_NADA:
			return true
		B_PARED, B_CERCO_ALTO:
			return false
		B_CERCO_BAJO:
			return puede_trepar
		B_PUERTA:
			var e := estado_abertura(bl[0], bl[1])
			return e.abierta or e.rota or puede_abrir
		B_VENTANA:
			var e := estado_abertura(bl[0], bl[1])
			return (e.abierta or e.rota) and puede_trepar
	return false


func pisable(p: Vector3i) -> bool:
	return _pisable(p)


# Puerta o ventana cerrada (sana) entre dos casillas vecinas ortogonales: un zombie puede romperla.
func rompible_entre(a: Vector3i, b: Vector3i) -> bool:
	var bl := _borde_entre(a, b)
	if bl.is_empty():
		return false
	var tipo := borde(bl[0], bl[1])
	if tipo != B_PUERTA and tipo != B_VENTANA:
		return false
	var e := estado_abertura(bl[0], bl[1])
	return not e.rota and not e.abierta


# [casilla, lado] del borde que separa dos casillas vecinas ortogonales (vacío si no son vecinas).
func borde_entre(a: Vector3i, b: Vector3i) -> Array:
	return _borde_entre(a, b)


func _pisable(p: Vector3i) -> bool:
	if not dentro(p) or suelo(p) == &"":
		return false
	return not _muebles.get(_i(p), {}).get("solido", false)


func puede_pasar(a: Vector3i, b: Vector3i, puede_abrir: bool, puede_trepar: bool) -> bool:
	if a.z != b.z or not _pisable(b) or not dentro(a):
		return false
	var d := b - a
	if absi(d.x) > 1 or absi(d.y) > 1 or d == Vector3i.ZERO:
		return false
	if d.x == 0 or d.y == 0:
		return _cruza_borde(a, b, puede_abrir, puede_trepar)
	# Diagonal: tienen que estar libres los dos caminos en L, sin abrir ni trepar (como PZ).
	var c1 := Vector3i(b.x, a.y, a.z)
	var c2 := Vector3i(a.x, b.y, a.z)
	for c in [c1, c2]:
		if not _pisable(c) or not _cruza_borde(a, c, false, false) or not _cruza_borde(c, b, false, false):
			return false
	return true


func tapa_vista(a: Vector3i, b: Vector3i) -> bool:
	if _muebles.get(_i(b), {}).get("tapa_vista", false) if dentro(b) else false:
		return true
	var bl := _borde_entre(a, b)
	if bl.is_empty():
		return false
	match borde(bl[0], bl[1]):
		B_PARED, B_CERCO_ALTO:
			return true
		B_PUERTA:
			var e := estado_abertura(bl[0], bl[1])
			return not (e.abierta or e.rota)
	return false
