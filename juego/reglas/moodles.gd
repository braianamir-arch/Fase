class_name Moodles
extends RefCounted
# Niveles (0–4) de los moodles de la etapa 1, con los umbrales de moodles.json.

static var _m: Dictionary = {}


static func _datos() -> Dictionary:
	if _m.is_empty():
		_m = DatosJuego.cargar_json("res://datos/moodles.json")
	return _m


static func _nivel(valor: float, umbrales: Array) -> int:
	var n := 0
	for u in umbrales:
		if valor >= float(u):
			n += 1
	return n


static func calcular(cuerpo: Cuerpo, mov: Movimiento, inv: Inventario, panico: float, capacidad: float) -> Dictionary:
	var d := _datos()
	var herido := 0
	for u in d.herido.umbrales_salud:
		if cuerpo.salud < float(u):
			herido += 1
	var enfermo := 0
	if cuerpo.infectado_knox:
		enfermo = _nivel(cuerpo.horas_infectado, [5.0, 13.0, 25.0, 49.0])
	return {
		&"dolor": _nivel(cuerpo.dolor(), d.dolor.umbrales),
		&"panico": _nivel(panico, d.panico.umbrales),
		&"sangrando": mini(cuerpo.partes_sangrando(), 4),
		&"herido": herido,
		&"cansancio_fisico": mov.nivel_cansancio(),
		&"carga": inv.nivel_carga(capacidad),
		&"enfermo": enfermo,
	}


# Pánico de PZ: ≈3 por zombie nuevo a la vista y +0,5 por minuto con zombies visibles.
# Valiente ×0,3, Cobarde ×2, Insensibilizado no gana pánico.
static func panico_siguiente(actual: float, zombies_nuevos: int, minutos: float, rasgos: Array, hay_visibles: bool = false) -> float:
	if rasgos.has(&"insensibilizado"):
		return actual
	var gana := 3.0 * zombies_nuevos + (0.5 * minutos if hay_visibles else 0.0)
	if rasgos.has(&"valiente"):
		gana *= 0.3
	if rasgos.has(&"cobarde"):
		gana *= 2.0
	return clampf(actual + gana, 0.0, 100.0)
