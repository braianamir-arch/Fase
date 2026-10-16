extends RefCounted
var t

func _g() -> Grilla:
	var g := Grilla.new(10, 10, 2)
	for x in 10:
		for y in 10:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	return g

func test_pared_bloquea_en_ambos_sentidos() -> void:
	var g := _g()
	g.poner_borde(Vector3i(2, 3, 0), Grilla.NORTE, Grilla.B_PARED)
	t.verdad(not g.puede_pasar(Vector3i(2, 2, 0), Vector3i(2, 3, 0), true, true))
	t.verdad(not g.puede_pasar(Vector3i(2, 3, 0), Vector3i(2, 2, 0), true, true))
	t.verdad(g.puede_pasar(Vector3i(3, 2, 0), Vector3i(3, 3, 0), false, false))
	t.igual(g.entre(Vector3i(2, 2, 0), Vector3i(2, 3, 0)), Grilla.B_PARED)

func test_pared_oeste() -> void:
	var g := _g()
	g.poner_borde(Vector3i(5, 5, 0), Grilla.OESTE, Grilla.B_PARED)
	t.verdad(not g.puede_pasar(Vector3i(4, 5, 0), Vector3i(5, 5, 0), true, true))
	t.verdad(g.tapa_vista(Vector3i(5, 5, 0), Vector3i(4, 5, 0)))

func test_puerta() -> void:
	var g := _g()
	var p := Vector3i(4, 4, 0)
	g.poner_borde(p, Grilla.NORTE, Grilla.B_PUERTA)
	t.verdad(not g.puede_pasar(Vector3i(4, 3, 0), p, false, true), "cerrada sin abrir")
	t.verdad(g.puede_pasar(Vector3i(4, 3, 0), p, true, false), "cerrada pero sabe abrir")
	t.verdad(g.tapa_vista(Vector3i(4, 3, 0), p), "cerrada tapa vista")
	g.abrir(p, Grilla.NORTE, true)
	t.verdad(g.puede_pasar(Vector3i(4, 3, 0), p, false, false), "abierta")
	t.verdad(not g.tapa_vista(Vector3i(4, 3, 0), p))
	t.verdad(g.estado_abertura(p, Grilla.NORTE).abierta)

func test_ventana() -> void:
	var g := _g()
	var p := Vector3i(6, 6, 0)
	g.poner_borde(p, Grilla.OESTE, Grilla.B_VENTANA)
	var a := Vector3i(5, 6, 0)
	t.verdad(not g.puede_pasar(a, p, true, true), "cerrada no se pasa")
	t.verdad(not g.tapa_vista(a, p), "vidrio deja ver")
	g.romper(p, Grilla.OESTE)
	t.verdad(g.estado_abertura(p, Grilla.OESTE).rota)
	t.verdad(not g.puede_pasar(a, p, true, false), "rota sin trepar")
	t.verdad(g.puede_pasar(a, p, false, true), "rota trepando")

func test_cercos() -> void:
	var g := _g()
	g.poner_borde(Vector3i(1, 1, 0), Grilla.NORTE, Grilla.B_CERCO_BAJO)
	g.poner_borde(Vector3i(3, 1, 0), Grilla.NORTE, Grilla.B_CERCO_ALTO)
	t.verdad(g.puede_pasar(Vector3i(1, 0, 0), Vector3i(1, 1, 0), false, true))
	t.verdad(not g.puede_pasar(Vector3i(1, 0, 0), Vector3i(1, 1, 0), true, false))
	t.verdad(not g.puede_pasar(Vector3i(3, 0, 0), Vector3i(3, 1, 0), true, true))

func test_diagonal_bloqueada_por_esquina() -> void:
	var g := _g()
	g.poner_borde(Vector3i(5, 5, 0), Grilla.NORTE, Grilla.B_PARED)
	t.verdad(not g.puede_pasar(Vector3i(5, 4, 0), Vector3i(6, 5, 0), true, true))
	t.verdad(not g.puede_pasar(Vector3i(4, 4, 0), Vector3i(5, 5, 0), true, true))
	t.verdad(g.puede_pasar(Vector3i(6, 4, 0), Vector3i(7, 5, 0), true, true))

func test_mueble_solido() -> void:
	var g := _g()
	g.poner_mueble(Vector3i(2, 2, 0), &"heladera", true, true)
	t.verdad(not g.puede_pasar(Vector3i(1, 2, 0), Vector3i(2, 2, 0), true, true))
	t.verdad(g.tapa_vista(Vector3i(1, 2, 0), Vector3i(2, 2, 0)))
	t.igual(g.mueble(Vector3i(2, 2, 0)), &"heladera")

func test_fuera_de_limites() -> void:
	var g := _g()
	t.verdad(not g.puede_pasar(Vector3i(0, 0, 0), Vector3i(-1, 0, 0), true, true))
	t.igual(g.suelo(Vector3i(50, 50, 0)), &"")
	t.igual(g.borde(Vector3i(-3, 0, 0), Grilla.NORTE), Grilla.B_NADA)

func test_sin_suelo_no_se_pisa() -> void:
	var g := _g()
	t.verdad(not g.puede_pasar(Vector3i(1, 1, 1), Vector3i(2, 1, 1), true, true))

func test_escalera() -> void:
	var g := _g()
	g.poner_suelo(Vector3i(3, 1, 1), &"madera")
	g.poner_escalera(Vector3i(3, 3, 0), Vector2i(0, -1))
	t.verdad(g.es_escalera(Vector3i(3, 3, 0)))
	t.igual(g.destino_escalera(Vector3i(3, 3, 0)), Vector3i(3, 2, 1))

func test_adentro() -> void:
	var g := _g()
	g.poner_suelo(Vector3i(7, 7, 0), &"madera", true)
	t.verdad(g.adentro(Vector3i(7, 7, 0)))
	t.verdad(not g.adentro(Vector3i(1, 1, 0)))
