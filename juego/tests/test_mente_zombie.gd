extends RefCounted
var t

func _abierto() -> Grilla:
	var g := Grilla.new(30, 30, 1)
	for x in 30:
		for y in 30:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	return g

func _ctx(g: Grilla, pos: Vector3i, jugador: Vector3i, visible: bool, ruidos: Array = []) -> Dictionary:
	return {"grilla": g, "caminos": Caminos.new(g), "pos": pos, "mirando": Vector2(1, 0),
		"jugador_pos": jugador, "jugador_visible_desde_aqui": visible, "ruidos": ruidos}

func _rng() -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = 7
	return r

func test_ve_al_jugador_y_persigue() -> void:
	var g := _abierto()
	var m := MenteZombie.new()
	var o := m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(10, 5, 0), true), _rng())
	t.igual(m.estado, MenteZombie.PERSEGUIR)
	t.igual(o.accion, &"mover")
	t.igual(o.destino, Vector3i(6, 5, 0))
	t.igual(m.memoria, 800)

func test_al_lado_ataca() -> void:
	var g := _abierto()
	var m := MenteZombie.new()
	var o := m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(6, 5, 0), true), _rng())
	t.igual(m.estado, MenteZombie.ATACAR)
	t.igual(o.accion, &"atacar")

func test_pared_entre_medio_no_ataca() -> void:
	var g := _abierto()
	g.poner_borde(Vector3i(6, 5, 0), Grilla.OESTE, Grilla.B_PARED)
	var m := MenteZombie.new()
	var o := m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(6, 5, 0), true), _rng())
	t.verdad(o.accion != &"atacar")

func test_memoria_se_agota() -> void:
	var g := _abierto()
	var m := MenteZombie.new()
	var rng := _rng()
	m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(10, 5, 0), true), rng)
	for i in 799:
		m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(25, 25, 0), false), rng)
	t.igual(m.estado, MenteZombie.PERSEGUIR)
	t.igual(m.objetivo, Vector3i(10, 5, 0), "va a la última posición conocida")
	m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(25, 25, 0), false), rng)
	t.igual(m.memoria, 0)
	t.igual(m.estado, MenteZombie.DEAMBULAR)

func test_oye_y_elige_el_mas_fuerte() -> void:
	var g := _abierto()
	var m := MenteZombie.new()
	var ruidos := [{"origen": Vector3i(8, 5, 0), "radio": 7.0, "volumen": 7.0},
		{"origen": Vector3i(5, 20, 0), "radio": 30.0, "volumen": 30.0}]
	m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(25, 25, 0), false, ruidos), _rng())
	t.igual(m.estado, MenteZombie.INVESTIGAR)
	t.igual(m.objetivo, Vector3i(5, 20, 0))

func test_no_oye_lo_que_esta_lejos() -> void:
	var g := _abierto()
	var m := MenteZombie.new()
	m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(25, 25, 0), false, [{"origen": Vector3i(25, 5, 0), "radio": 7.0, "volumen": 7.0}]), _rng())
	t.igual(m.estado, MenteZombie.DEAMBULAR)

func test_puerta_cerrada_la_golpea() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var m := MenteZombie.new()
	var o := m.pensar(_ctx(g, Vector3i(2, 4, 0), Vector3i(2, 2, 0), true), _rng())
	t.igual(m.estado, MenteZombie.GOLPEAR)
	t.igual(o.accion, &"golpear")
	t.igual(o.casilla, Vector3i(2, 4, 0))
	t.igual(o.lado, Grilla.NORTE)

func test_casa_sellada_vuelve_a_deambular() -> void:
	var g := _abierto()
	for x in 30:
		g.poner_borde(Vector3i(x, 10, 0), Grilla.NORTE, Grilla.B_PARED)
	var m := MenteZombie.new()
	var o := m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(5, 15, 0), true), _rng())
	t.igual(m.estado, MenteZombie.DEAMBULAR)
	t.verdad(o.accion == &"mover" or o.accion == &"esperar")
	var movio := false
	var rng := _rng()
	for i in 50:
		if m.pensar(_ctx(g, Vector3i(5, 5, 0), Vector3i(5, 15, 0), true), rng).accion == &"mover":
			movio = true
	t.verdad(movio, "deambulando se mueve alguna vez")
