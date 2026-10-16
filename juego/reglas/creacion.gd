class_name Creacion
extends RefCounted
# Creación de personaje con el sistema de puntos de PZ: la profesión da o quita puntos, los rasgos
# positivos cuestan (costo negativo) y los negativos dan; al final tiene que quedar ≥ 0.

static func _rasgos() -> Dictionary:
	return DatosJuego.cargar_json("res://datos/rasgos.json")


static func puntos(profesion: StringName, rasgos: Array) -> int:
	var p := int(DatosJuego.cargar_json("res://datos/profesiones.json").get(String(profesion), {}).get("puntos", 0))
	var tabla := _rasgos()
	for r in rasgos:
		p += int(tabla.get(String(r), {}).get("costo", 0))
	return p


static func excluido(rasgo: StringName, elegidos: Array) -> bool:
	var tabla := _rasgos()
	var ex: Array = tabla.get(String(rasgo), {}).get("excluye", [])
	for e in elegidos:
		if ex.has(String(e)) or (tabla.get(String(e), {}).get("excluye", []) as Array).has(String(rasgo)):
			return true
	return false


static func elegibles() -> Array[StringName]:
	var r: Array[StringName] = []
	var tabla := _rasgos()
	for k in tabla:
		if not tabla[k].get("solo_profesion", false):
			r.append(StringName(k))
	return r


static func valido(profesion: StringName, rasgos: Array) -> bool:
	if puntos(profesion, rasgos) < 0:
		return false
	var ok := elegibles()
	for i in rasgos.size():
		if not ok.has(StringName(rasgos[i])):
			return false
		if excluido(StringName(rasgos[i]), rasgos.slice(i + 1)):
			return false
	return true


static func texto_muerte(dias_horas: Vector2i, matados: int) -> String:
	var d := "%d día%s" % [dias_horas.x, "" if dias_horas.x == 1 else "s"]
	var h := "%d hora%s" % [dias_horas.y, "" if dias_horas.y == 1 else "s"]
	return "Sobreviviste %s, %s.\nMataste %d zombie%s." % [d, h, matados, "" if matados == 1 else "s"]
