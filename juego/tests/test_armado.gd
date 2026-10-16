extends RefCounted
var t

func test_chunk_vacio_sin_superficies() -> void:
	var g := Grilla.new(10, 10, 1)
	var m := ArmadoChunk.construir(g, Vector2i(0, 0), 0)
	for capa in ["paredes", "suelo", "techo", "muebles"]:
		t.igual((m[capa] as ArrayMesh).get_surface_count(), 0, capa)

func test_una_pared_alta_2_7() -> void:
	var g := Grilla.new(10, 10, 1)
	g.poner_borde(Vector3i(2, 3, 0), Grilla.NORTE, Grilla.B_PARED)
	var m := ArmadoChunk.construir(g, Vector2i(0, 0), 0)
	var paredes: ArrayMesh = m.paredes
	t.igual(paredes.get_surface_count(), 1)
	var caja := paredes.get_aabb()
	t.cerca(caja.size.y, 2.7, 0.01)
	t.cerca(caja.position.x, 2.0, 0.01)
	t.cerca(caja.size.x, 1.0, 0.11)
	t.cerca(caja.get_center().z, 3.0, 0.01)

func test_segundo_piso_mas_alto() -> void:
	var g := Grilla.new(10, 10, 2)
	g.poner_borde(Vector3i(2, 3, 1), Grilla.OESTE, Grilla.B_PARED)
	var caja := (ArmadoChunk.construir(g, Vector2i(0, 0), 1).paredes as ArrayMesh).get_aabb()
	t.cerca(caja.position.y, 2.7, 0.01)

func test_casa_de_prueba_techo_solo_adentro() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var m := ArmadoChunk.construir(g, Vector2i(0, 0), 0)
	t.igual((m.techo as ArrayMesh).get_surface_count(), 0, "la planta baja tiene otro piso encima")
	var techo: ArrayMesh = ArmadoChunk.construir(g, Vector2i(0, 0), 1).techo
	t.igual(techo.get_surface_count(), 1)
	var caja := techo.get_aabb()
	t.cerca(caja.position.x, 1.0, 0.11)
	t.cerca(caja.end.x, 5.0, 0.11)
	t.cerca(caja.position.z, 1.0, 0.11)
	t.cerca(caja.end.z, 4.0, 0.11)
	t.verdad((m.suelo as ArrayMesh).get_surface_count() > 0)
	t.verdad((m.muebles as ArrayMesh).get_surface_count() > 0)

func test_puerta_abierta_cambia_la_malla() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	g.abrir(Vector3i(2, 4, 0), Grilla.NORTE, true)
	var hoja := ArmadoChunk.hoja_puerta(g, Vector3i(2, 4, 0), Grilla.NORTE)
	t.verdad(hoja.size.z > hoja.size.x, "abierta queda perpendicular a la pared")
	g.abrir(Vector3i(2, 4, 0), Grilla.NORTE, false)
	hoja = ArmadoChunk.hoja_puerta(g, Vector3i(2, 4, 0), Grilla.NORTE)
	t.verdad(hoja.size.x > hoja.size.z, "cerrada queda a lo largo de la pared")
