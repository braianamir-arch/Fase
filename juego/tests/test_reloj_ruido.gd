extends RefCounted
var t

func _abierto() -> Grilla:
	var g := Grilla.new(20, 20, 1)
	for x in 20:
		for y in 20:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	return g

func test_reloj_empieza_el_9_de_julio_a_las_9() -> void:
	var r := Reloj.new()
	t.igual(r.texto(), "9 jul 1993 09:00")

func test_una_hora_real_es_un_dia() -> void:
	var r := Reloj.new()
	r.avanzar(3600.0)
	t.igual(r.texto(), "10 jul 1993 09:00")
	r.avanzar(150.0)  # 150 s reales = 1 h de juego
	t.igual(r.texto(), "10 jul 1993 10:00")

func test_cambia_de_mes() -> void:
	var r := Reloj.new()
	r.avanzar(3600.0 * 23)
	t.igual(r.texto(), "1 ago 1993 09:00")

func test_sobrevivido() -> void:
	var r := Reloj.new()
	var inicio := r.segundos_juego
	r.avanzar(3600.0 * 2 + 150.0 * 5)
	t.igual(r.dias_y_horas_sobrevividos(inicio), Vector2i(2, 5))
	t.cerca(r.horas_desde(inicio), 53.0, 0.001)

func test_caminar_se_oye_a_6_no_a_8() -> void:
	var g := _abierto()
	var o := Vector3i(5, 5, 0)
	t.verdad(Ruido.oye(g, o, Vector3i(11, 5, 0), 7.0))
	t.verdad(not Ruido.oye(g, o, Vector3i(13, 5, 0), 7.0))

func test_pared_atenua_a_la_mitad() -> void:
	var g := _abierto()
	g.poner_borde(Vector3i(7, 5, 0), Grilla.OESTE, Grilla.B_PARED)
	var o := Vector3i(5, 5, 0)
	t.cerca(Ruido.radio_efectivo(g, o, Vector3i(9, 5, 0), 7.0), 3.5, 0.001)
	t.verdad(not Ruido.oye(g, o, Vector3i(9, 5, 0), 7.0))

func test_ventana_cerrada_atenua_menos() -> void:
	var g := _abierto()
	g.poner_borde(Vector3i(7, 5, 0), Grilla.OESTE, Grilla.B_VENTANA)
	t.cerca(Ruido.radio_efectivo(g, Vector3i(5, 5, 0), Vector3i(9, 5, 0), 8.0), 6.0, 0.001)

func test_pendientes_se_vacian() -> void:
	var r := Ruido.new()
	r.emitir(Vector3i(1, 1, 0), 7.0, 7.0)
	r.emitir(Vector3i(2, 2, 0), 30.0, 30.0)
	var lista := r.tomar()
	t.igual(lista.size(), 2)
	t.igual(lista[1].radio, 30.0)
	t.igual(r.tomar().size(), 0)
