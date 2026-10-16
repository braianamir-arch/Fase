extends RefCounted
var t

func _abierto(w: int = 30, h: int = 30) -> Grilla:
	var g := Grilla.new(w, h, 1)
	for x in w:
		for y in h:
			g.poner_suelo(Vector3i(x, y, 0), &"pasto")
	return g

func _entrada(mover := Vector2.ZERO, atacar := false, accion := {}) -> Dictionary:
	return {"mover": mover, "postura": Movimiento.Postura.CAMINAR, "atacar": atacar, "accion_contextual": accion}

func test_nueva_partida_en_muldraugh() -> void:
	var p := Partida.nueva("res://datos/mapas/muldraugh.txt", &"bombero", [], 1)
	t.verdad(p.zombies.size() > 10, "zombies: %d" % p.zombies.size())
	var j := p.casilla_jugador()
	for z in p.zombies:
		t.verdad(Vector2(z.casilla.x - j.x, z.casilla.y - j.y).length() >= 15.0, "zombie demasiado cerca del inicio")
	t.igual(p.reloj.texto(), "9 jul 1993 09:00")
	t.verdad(p.objetos_en_suelo.size() > 0)

func test_zombie_te_ve_y_persigue() -> void:
	var p := Partida.nueva_en(_abierto(), Vector3i(5, 5, 0), [], 3)
	p.agregar_zombie(Vector3i(15, 5, 0))
	for i in 600:
		p.tick(0.1, _entrada(Vector2(1, 0)))
		if p.zombies[0].mente.estado in [MenteZombie.PERSEGUIR, MenteZombie.ATACAR]:
			break
	t.verdad(p.zombies[0].mente.estado in [MenteZombie.PERSEGUIR, MenteZombie.ATACAR])

func test_matar_un_zombie_con_el_bate() -> void:
	var p := Partida.nueva_en(_abierto(), Vector3i(5, 5, 0), [], 4)
	p.inventario.agregar(&"bate")
	p.inventario.equipar(&"bate", true)
	p.agregar_zombie(Vector3i(6, 5, 0))
	p.zombies[0].pos = Vector3(6.6, 0, 5.5)   # a 1,1 m: dentro del alcance del bate
	p.jugador_mirando = Vector2(1, 0)
	for i in 400:
		p.tick(0.1, _entrada(Vector2.ZERO, true))
		p.zombies[0].pos = Vector3(6.6, 0, 5.5)
		if p.zombies_matados > 0:
			break
	t.igual(p.zombies_matados, 1)

func test_sin_defenderse_te_hieren_y_moris() -> void:
	var p := Partida.nueva_en(_abierto(), Vector3i(5, 5, 0), [], 5)
	for x in [4, 6]:
		for y in [4, 5, 6]:
			p.agregar_zombie(Vector3i(x, y, 0))
	var herido := false
	for i in 20000:
		p.tick(0.1, _entrada())
		if not p.cuerpo.heridas.is_empty():
			herido = true
		if p.termino():
			break
	t.verdad(herido)
	t.verdad(p.termino())

func test_abrir_una_puerta() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(2, 3, 0), [], 6)
	p.tick(0.1, _entrada(Vector2.ZERO, false, {"tipo": &"abrir", "casilla": Vector3i(2, 4, 0), "lado": Grilla.NORTE}))
	t.verdad(g.estado_abertura(Vector3i(2, 4, 0), Grilla.NORTE).abierta)

func test_puerta_cerrada_no_deja_pasar() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(2, 3, 0), [], 6)
	for i in 50:
		p.tick(0.1, _entrada(Vector2(0, 1)))
	t.igual(p.casilla_jugador(), Vector3i(2, 3, 0))

func test_agarrar_objeto() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(2, 2, 0), [], 6)
	p.objetos_en_suelo[Vector3i(2, 2, 0)] = [&"bate"]
	p.tick(0.1, _entrada(Vector2.ZERO, false, {"tipo": &"agarrar", "casilla": Vector3i(2, 2, 0), "id": &"bate"}))
	t.verdad(p.inventario.items.has(&"bate"))
	t.verdad(not p.objetos_en_suelo.has(Vector3i(2, 2, 0)))

func test_infectado_que_muere_se_levanta() -> void:
	var p := Partida.nueva_en(_abierto(), Vector3i(5, 5, 0), [], 7)
	p.cuerpo.herir(&"antebrazo_izq", &"mordida", p.rng)
	p.cuerpo.vendar(&"antebrazo_izq", true)
	p.cuerpo.horas_infectado = 71.99
	var antes := p.zombies.size()
	var segundos_juego := 0.0
	while segundos_juego < 200.0:
		p.tick(0.1, _entrada())
		segundos_juego += 0.1 * Reloj.ESCALA
	t.verdad(p.termino())
	t.igual(p.zombies.size(), antes + 1)
	t.igual(p.zombies[-1].casilla, Vector3i(5, 5, 0))

func test_zombie_que_salta_cerco_bajo_se_cae() -> void:
	var g := _abierto()
	for x in 30:
		g.poner_borde(Vector3i(x, 10, 0), Grilla.NORTE, Grilla.B_CERCO_BAJO)
	var p := Partida.nueva_en(g, Vector3i(5, 14, 0), [], 8)
	p.agregar_zombie(Vector3i(5, 7, 0))
	var cayo := false
	for i in 600:
		p.tick(0.1, _entrada())
		if p.zombies[0].caido:
			cayo = true
			break
	t.verdad(cayo)

func test_opciones_contextuales_de_una_puerta() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(2, 3, 0), [], 6)
	var textos := p.opciones_contextuales(Vector3i(2, 4, 0)).map(func(o): return o.texto)
	t.verdad(textos.has("Abrir puerta"), str(textos))
	g.abrir(Vector3i(2, 4, 0), Grilla.NORTE, true)
	textos = p.opciones_contextuales(Vector3i(2, 4, 0)).map(func(o): return o.texto)
	t.verdad(textos.has("Cerrar puerta"), str(textos))

func test_opciones_de_ventana_y_objeto() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(1, 2, 0), [], 6)
	var textos := p.opciones_contextuales(Vector3i(1, 2, 0)).map(func(o): return o.texto)
	t.verdad(textos.has("Abrir ventana"), str(textos))
	t.verdad(textos.has("Romper ventana"), str(textos))
	p.soltar_en(Vector3i(1, 2, 0), &"bate")
	textos = p.opciones_contextuales(Vector3i(1, 2, 0)).map(func(o): return o.texto)
	t.verdad(textos.has("Agarrar Bate de béisbol"), str(textos))

func test_lejos_no_hay_opciones() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(1, 1, 0), [], 6)
	t.igual(p.opciones_contextuales(Vector3i(4, 4, 0)).size(), 0)

func test_celular_lento_limita_zombies_completos() -> void:
	var p := Partida.nueva_en(_abierto(60, 60), Vector3i(30, 30, 0), [], 12)
	for i in 300:
		p.agregar_zombie(Vector3i(p.rng.randi_range(0, 59), p.rng.randi_range(0, 59), 0))
	p.cps_promedio = 20.0
	p.tick(0.1, _entrada())
	t.verdad(p.zombies_completos <= 50, str(p.zombies_completos))
	p.cps_promedio = 60.0
	p.tick(0.1, _entrada())
	t.verdad(p.zombies_completos > 50, str(p.zombies_completos))

func test_jugador_sube_y_baja_la_escalera() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(4, 3, 0), [], 6)
	for i in 30:
		p.tick(0.1, _entrada(Vector2(0, -1)))
		if p.casilla_jugador().z == 1:
			break
	t.igual(p.casilla_jugador(), Vector3i(4, 2, 1), "subió")
	for i in 30:
		p.tick(0.1, _entrada(Vector2(0, 1)))
		if p.casilla_jugador().z == 0:
			break
	t.igual(p.casilla_jugador(), Vector3i(4, 3, 0), "bajó")

func test_zombie_en_la_misma_casilla_ataca() -> void:
	var p := Partida.nueva_en(_abierto(), Vector3i(5, 5, 0), [], 13)
	p.agregar_zombie(Vector3i(5, 5, 0))
	var ataques := 0
	for i in 100:
		p.tick(0.1, _entrada())
		for e in p.eventos:
			if e.tipo == &"ataque_zombie":
				ataques += 1
	t.verdad(ataques > 0)

func test_zombie_sube_escalera_sin_atravesar_nada() -> void:
	var g := Mapa.cargar("res://tests/mapas/prueba.txt")
	var p := Partida.nueva_en(g, Vector3i(2, 2, 1), [], 14)
	p.agregar_zombie(Vector3i(3, 3, 0))
	# Lo oyó arriba: lo busca aunque no lo vea (otro piso).
	p.zombies[0].mente.estado = MenteZombie.PERSEGUIR
	p.zombies[0].mente.objetivo = Vector3i(2, 2, 1)
	p.zombies[0].mente.memoria = 800
	var pisos_vistos := {}
	for i in 600:
		p.tick(0.1, _entrada())
		var z: Dictionary = p.zombies[0]
		t.verdad(g.suelo(z.casilla) != &"", "zombie parado en el aire: %s" % str(z.casilla))
		pisos_vistos[z.casilla.z] = true
		if z.casilla.z == 1:
			break
	t.verdad(pisos_vistos.has(1), "llegó arriba")

func test_zombie_golpea_puerta_norte_solo_estando_al_lado() -> void:
	var g := _abierto()
	for x in 30:
		if x != 10:
			g.poner_borde(Vector3i(x, 15, 0), Grilla.NORTE, Grilla.B_PARED)
	g.poner_borde(Vector3i(10, 15, 0), Grilla.NORTE, Grilla.B_PUERTA)
	var p := Partida.nueva_en(g, Vector3i(10, 20, 0), [], 15)
	p.agregar_zombie(Vector3i(10, 7, 0))
	p.zombies[0].mirando = Vector2(0, 1)
	# Lo oyó del otro lado: va hacia donde está el jugador hasta que se le acabe la memoria.
	p.zombies[0].mente.estado = MenteZombie.PERSEGUIR
	p.zombies[0].mente.objetivo = Vector3i(10, 20, 0)
	p.zombies[0].mente.memoria = 800
	for i in 600:
		p.tick(0.1, _entrada())
		for e in p.eventos:
			if e.tipo == &"golpe_obstaculo":
				var zc: Vector3i = p.zombies[0].casilla
				t.verdad(zc == Vector3i(10, 14, 0) or zc == Vector3i(10, 15, 0), "golpeó desde %s" % str(zc))
				return
	t.verdad(false, "nunca golpeó la puerta")

func test_casa_con_ventana_cerrada_la_rompen() -> void:
	var g := _abierto()
	for x in range(8, 13):
		g.poner_borde(Vector3i(x, 8, 0), Grilla.NORTE, Grilla.B_PARED)
		g.poner_borde(Vector3i(x, 13, 0), Grilla.NORTE, Grilla.B_PARED)
	for y in range(8, 13):
		g.poner_borde(Vector3i(8, y, 0), Grilla.OESTE, Grilla.B_PARED)
		g.poner_borde(Vector3i(13, y, 0), Grilla.OESTE, Grilla.B_PARED)
	g.poner_borde(Vector3i(10, 8, 0), Grilla.NORTE, Grilla.B_VENTANA)
	var p := Partida.nueva_en(g, Vector3i(10, 10, 0), [], 16)
	p.agregar_zombie(Vector3i(10, 7, 0))
	p.zombies[0].mirando = Vector2(0, 1)
	var golpes := 0
	for i in 300:
		p.tick(0.1, _entrada())
		for e in p.eventos:
			if e.tipo == &"golpe_obstaculo":
				golpes += 1
	t.verdad(golpes > 0)
