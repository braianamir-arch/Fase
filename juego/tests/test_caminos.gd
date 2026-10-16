extends RefCounted
var t

func _abierto() -> Grilla:
	var g := Grilla.new(15, 15, 1)
	for x in 15:
		for y in 15:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	return g

func test_camino_recto() -> void:
	var c := Caminos.new(_abierto())
	var r := c.buscar(Vector3i(1, 1, 0), Vector3i(5, 1, 0), false, false)
	t.igual(r.size(), 5)
	t.igual(r[0], Vector3i(1, 1, 0))
	t.igual(r[-1], Vector3i(5, 1, 0))

func test_rodea_una_pared() -> void:
	var g := _abierto()
	for y in range(0, 8):
		g.poner_borde(Vector3i(5, y, 0), Grilla.OESTE, Grilla.B_PARED)
	var r := Caminos.new(g).buscar(Vector3i(3, 2, 0), Vector3i(7, 2, 0), false, false)
	t.verdad(r.size() > 5)
	for i in range(1, r.size()):
		t.verdad(g.puede_pasar(r[i - 1], r[i], false, false) or g.es_escalera(r[i - 1]), "paso %d" % i)

func test_sube_por_la_escalera() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var r := Caminos.new(g).buscar(Vector3i(1, 1, 0), Vector3i(1, 1, 1), true, false)
	t.verdad(r.size() > 0)
	t.verdad(r.has(Vector3i(4, 3, 0)))
	t.verdad(r.has(Vector3i(4, 2, 1)))

func test_puerta_cerrada_sin_saber_abrir() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var c := Caminos.new(g)
	t.igual(c.buscar(Vector3i(2, 4, 0), Vector3i(2, 2, 0), false, false).size(), 0)
	var o := c.obstaculo_mas_cercano(Vector3i(2, 4, 0), Vector3i(2, 2, 0))
	t.igual(o.casilla, Vector3i(2, 4, 0))
	t.igual(o.lado, Grilla.NORTE)

func test_trepa_ventana_rota() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	g.romper(Vector3i(1, 2, 0), Grilla.OESTE)
	var r := Caminos.new(g).buscar(Vector3i(0, 2, 0), Vector3i(1, 2, 0), false, true)
	t.igual(r, [Vector3i(0, 2, 0), Vector3i(1, 2, 0)])

func test_sin_camino_ni_obstaculo() -> void:
	var g := _abierto()
	for x in 15:
		g.poner_borde(Vector3i(x, 7, 0), Grilla.NORTE, Grilla.B_PARED)
	var c := Caminos.new(g)
	t.igual(c.buscar(Vector3i(1, 1, 0), Vector3i(1, 12, 0), true, true).size(), 0)
	t.verdad(c.obstaculo_mas_cercano(Vector3i(1, 1, 0), Vector3i(1, 12, 0)).is_empty())

func test_sin_camino_es_rapido() -> void:
	var g := Grilla.new(60, 60, 1)
	for x in 60:
		for y in 60:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	for x in 60:
		g.poner_borde(Vector3i(x, 30, 0), Grilla.NORTE, Grilla.B_PARED)
	var c := Caminos.new(g)
	var t0 := Time.get_ticks_usec()
	c.buscar(Vector3i(5, 5, 0), Vector3i(5, 50, 0), true, true, true)
	var ms := (Time.get_ticks_usec() - t0) / 1000.0
	t.verdad(ms < 60.0, "primera vez %.1f ms" % ms)
	t0 = Time.get_ticks_usec()
	c.buscar(Vector3i(6, 5, 0), Vector3i(5, 50, 0), true, true, true)
	ms = (Time.get_ticks_usec() - t0) / 1000.0
	t.verdad(ms < 25.0, "con caché %.1f ms" % ms)

func test_modo_rompible_pasa_por_ventana_cerrada() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var c := Caminos.new(g)
	t.igual(c.buscar(Vector3i(0, 2, 0), Vector3i(1, 2, 0), false, true).size(), 0)
	t.igual(c.buscar(Vector3i(0, 2, 0), Vector3i(1, 2, 0), false, true, true), [Vector3i(0, 2, 0), Vector3i(1, 2, 0)])
