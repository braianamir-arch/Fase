class_name DatosJuego
extends Node
# Números del original (Project Zomboid B42) leídos de res://datos/*.json.
# Autoload "Datos": Datos.arma("bate"), Datos.ruido("caminar"), Datos.lore("memoria_ticks")...

var _cache: Dictionary = {}


static func cargar_json(ruta: String) -> Dictionary:
	var texto := FileAccess.get_file_as_string(ruta)
	if texto == "":
		push_error("No se pudo leer " + ruta)
		return {}
	var d: Variant = JSON.parse_string(texto)
	if d is Dictionary:
		return d
	push_error("JSON inválido en " + ruta)
	return {}


func tabla(nombre: String) -> Dictionary:
	if not _cache.has(nombre):
		_cache[nombre] = cargar_json("res://datos/%s.json" % nombre)
	return _cache[nombre]


func arma(id: String) -> Dictionary:
	return tabla("armas").get(id, {})


func rasgo(id: String) -> Dictionary:
	return tabla("rasgos").get(id, {})


func profesion(id: String) -> Dictionary:
	return tabla("profesiones").get(id, {})


func ruido(id: String) -> Dictionary:
	return tabla("ruidos").get(id, {})


func lore(clave: String) -> Variant:
	return tabla("lore").get(clave)
