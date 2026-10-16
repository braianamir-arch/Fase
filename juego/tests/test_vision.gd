extends RefCounted
var t

func _abierto() -> Grilla:
	var g := Grilla.new(20, 20, 2)
	for x in 20:
		for y in 20:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	return g

func test_pisos_afuera() -> void:
	var v := Vision.pisos_visibles(0, false, false)
	t.verdad(v.techos)
	t.verdad(v.max_piso >= 1)

func test_pisos_adentro() -> void:
	var v := Vision.pisos_visibles(0, false, true)
	t.igual(v.max_piso, 0)
	t.verdad(not v.techos)
	t.igual(Vision.pisos_visibles(1, false, true).max_piso, 1)

func test_pisos_en_escalera() -> void:
	var v := Vision.pisos_visibles(0, true, true)
	t.igual(v.max_piso, 1)
	t.verdad(not v.techos)

func test_ve_de_frente() -> void:
	var g := _abierto()
	t.verdad(Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(12, 5, 0), 20.0, 120.0))

func test_pared_tapa() -> void:
	var g := _abierto()
	g.poner_borde(Vector3i(8, 5, 0), Grilla.OESTE, Grilla.B_PARED)
	t.verdad(not Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(12, 5, 0), 20.0, 120.0))

func test_ventana_no_tapa() -> void:
	var g := _abierto()
	g.poner_borde(Vector3i(8, 5, 0), Grilla.OESTE, Grilla.B_VENTANA)
	t.verdad(Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(12, 5, 0), 20.0, 120.0))

func test_fuera_del_cono() -> void:
	var g := _abierto()
	t.verdad(not Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(5, 12, 0), 20.0, 120.0))
	t.verdad(not Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(1, 5, 0), 20.0, 120.0))

func test_detras_muy_cerca() -> void:
	var g := _abierto()
	t.verdad(Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(4, 5, 0), 20.0, 120.0))

func test_fuera_de_radio() -> void:
	var g := _abierto()
	t.verdad(not Vision.ve(g, Vector3i(0, 5, 0), Vector2(1, 0), Vector3i(19, 5, 0), 10.0, 120.0))

func test_otro_piso_no_se_ve() -> void:
	var g := _abierto()
	t.verdad(not Vision.ve(g, Vector3i(5, 5, 0), Vector2(1, 0), Vector3i(7, 5, 1), 20.0, 120.0))

func test_paredes_a_recortar() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var r := Vision.paredes_a_recortar(g, Vector3i(2, 3, 0))
	t.verdad(r.has(Vector3i(2, 4, 0)), str(r))
	t.verdad(not r.has(Vector3i(2, 1, 0)), "la pared de atrás no se recorta")
