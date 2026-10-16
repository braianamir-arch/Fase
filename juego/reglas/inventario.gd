class_name Inventario
extends RefCounted
# Inventario por peso, como PZ: capacidad según Fuerza, lo equipado cuenta el 30 %.

static var _armas: Dictionary = {}
static var _objetos: Dictionary = {}

var items: Array[StringName] = []
var equipada: StringName = &""
var dos_manos: bool = false
var extra_peso: float = 0.0   # bolsas y ropa (etapas siguientes); también lo usan las pruebas


static func _cargar() -> void:
	if _objetos.is_empty():
		_armas = DatosJuego.cargar_json("res://datos/armas.json")
		_objetos = DatosJuego.cargar_json("res://datos/objetos.json")


static func peso_de(id: StringName) -> float:
	_cargar()
	if _armas.has(id):
		return float(_armas[id].peso)
	return float(_objetos.get(id, {}).get("peso", 0.1))


static func es_arma(id: StringName) -> bool:
	_cargar()
	return _armas.has(id) and not String(id).begins_with("_")


static func capacidad(fuerza: int) -> float:
	_cargar()
	var t: Array = _objetos._capacidad_por_fuerza
	return float(t[clampi(fuerza, 0, t.size() - 1)])


func agregar(id: StringName) -> void:
	items.append(id)


func quitar(id: StringName) -> bool:
	var i := items.find(id)
	if i < 0:
		return false
	items.remove_at(i)
	if equipada == id and not items.has(id):
		equipada = &""
		dos_manos = false
	return true


func equipar(id: StringName, a_dos_manos: bool) -> void:
	if items.has(id) or id == &"":
		equipada = id
		dos_manos = a_dos_manos and id != &""


func peso_total() -> float:
	_cargar()
	var p := extra_peso
	var equipada_contada := false
	for id in items:
		var w := peso_de(id)
		if id == equipada and not equipada_contada:
			w *= float(_objetos._equipado_cuenta)
			equipada_contada = true
		p += w
	return p


func nivel_carga(cap: float) -> int:
	var r := peso_total() / cap
	var n := 0
	# Nivel 1 apenas pasa el 100 %; los siguientes desde el 125, 150 y 175 %.
	for u in [1.0, 1.25, 1.5, 1.75]:
		if r >= u and r > 1.0:
			n += 1
	return n
