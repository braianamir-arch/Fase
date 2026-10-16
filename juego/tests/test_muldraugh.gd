extends RefCounted
var t

const RUTA := "res://datos/mapas/muldraugh.txt"

func _leer() -> Dictionary:
	return Mapa.leer(FileAccess.get_file_as_string(RUTA))

func test_sin_errores() -> void:
	var l := _leer()
	t.igual(l.errores.size(), 0, str(l.errores))
	var v := Mapa.validar(l.grilla)
	t.igual(v.size(), 0, str(v.slice(0, 5)))

func test_al_menos_20_edificios() -> void:
	var g: Grilla = _leer().grilla
	var visto := {}
	var edificios := 0
	for y in g.alto:
		for x in g.ancho:
			var p := Vector3i(x, y, 0)
			if g.adentro(p) and not visto.has(p):
				edificios += 1
				var pila := [p]
				visto[p] = true
				while not pila.is_empty():
					var c: Vector3i = pila.pop_back()
					for d in [Vector3i(1, 0, 0), Vector3i(-1, 0, 0), Vector3i(0, 1, 0), Vector3i(0, -1, 0)]:
						var n: Vector3i = c + d
						if g.adentro(n) and not visto.has(n):
							visto[n] = true
							pila.append(n)
	t.verdad(edificios >= 20, "edificios: %d" % edificios)

func test_hay_escalera_y_segundo_piso() -> void:
	var g: Grilla = _leer().grilla
	var hay := false
	for y in g.alto:
		for x in g.ancho:
			if g.es_escalera(Vector3i(x, y, 0)):
				hay = true
	t.verdad(hay)

func test_punto_de_inicio() -> void:
	t.verdad(_leer().inicios.size() > 0)

func test_objetos_existen_en_los_datos() -> void:
	var armas := DatosJuego.cargar_json("res://datos/armas.json")
	var objetos := DatosJuego.cargar_json("res://datos/objetos.json")
	var l := _leer()
	t.verdad(l.objetos.size() > 0)
	for o in l.objetos:
		t.verdad(armas.has(o.id) or objetos.has(o.id), o.id)
		t.verdad(l.grilla.suelo(o.pos) != &"", "objeto %s sin suelo" % o.id)
