extends RefCounted
var t

func _hud() -> Hud:
	var h := Hud.new()
	h.tamaño = Vector2(1280, 720)
	h.armar()
	h.consultar_casilla = func(_pos: Vector2) -> Vector3i: return Vector3i(2, 4, 0)
	h.opciones_para = func(c: Vector3i) -> Array: return [{"texto": "Abrir puerta", "accion": {"tipo": &"abrir", "casilla": c, "lado": Grilla.NORTE}}]
	return h

func _toque(i: int, pos: Vector2, apretado: bool) -> InputEventScreenTouch:
	var e := InputEventScreenTouch.new()
	e.index = i
	e.position = pos
	e.pressed = apretado
	return e

func _arrastre(i: int, pos: Vector2) -> InputEventScreenDrag:
	var e := InputEventScreenDrag.new()
	e.index = i
	e.position = pos
	return e

func test_joystick_y_atacar_a_la_vez() -> void:
	var h := _hud()
	var centro := h.centro_joystick()
	h.procesar(_toque(0, centro, true))
	h.procesar(_arrastre(0, centro + Vector2(0, -60)))
	h.procesar(_toque(1, h.centro_boton(&"atacar"), true))
	var e := h.entrada()
	t.verdad((e.mover as Vector2).length() > 0.3, str(e.mover))
	t.verdad(e.atacar)

func test_soltar_un_dedo_no_suelta_el_otro() -> void:
	var h := _hud()
	var centro := h.centro_joystick()
	h.procesar(_toque(0, centro, true))
	h.procesar(_arrastre(0, centro + Vector2(60, 0)))
	h.procesar(_toque(1, h.centro_boton(&"atacar"), true))
	h.procesar(_toque(1, h.centro_boton(&"atacar"), false))
	var e := h.entrada()
	t.verdad(not e.atacar)
	t.verdad((e.mover as Vector2).length() > 0.3)
	h.procesar(_toque(0, centro + Vector2(60, 0), false))
	t.verdad((h.entrada().mover as Vector2).length() < 0.01)

func test_arriba_en_pantalla_es_noroeste_en_la_grilla() -> void:
	var h := _hud()
	var centro := h.centro_joystick()
	h.procesar(_toque(0, centro, true))
	h.procesar(_arrastre(0, centro + Vector2(0, -80)))
	var m: Vector2 = h.entrada().mover
	t.verdad(m.x < 0 and m.y < 0, str(m))

func test_joystick_a_fondo_corre() -> void:
	var h := _hud()
	var centro := h.centro_joystick()
	h.procesar(_toque(0, centro, true))
	h.procesar(_arrastre(0, centro + Vector2(0, -30)))
	t.igual(h.entrada().postura, Movimiento.Postura.CAMINAR)
	h.procesar(_arrastre(0, centro + Vector2(0, -200)))
	t.igual(h.entrada().postura, Movimiento.Postura.CORRER)

func test_mantener_apretado_abre_el_menu() -> void:
	var h := _hud()
	h.procesar(_toque(2, Vector2(700, 300), true))
	h.avanzar(0.2)
	t.verdad(not h.menu_abierto())
	h.avanzar(0.25)
	t.verdad(h.menu_abierto())
	t.igual(h.opciones_menu(), ["Abrir puerta"])
	h.procesar(_toque(2, Vector2(700, 300), false))
	h.elegir_opcion(0)
	var e := h.entrada()
	t.igual(e.accion_contextual.tipo, &"abrir")
	t.igual(h.entrada().accion_contextual, {}, "la acción se manda una sola vez")
	t.verdad(not h.menu_abierto())

func test_agacharse_es_un_interruptor() -> void:
	var h := _hud()
	var b := h.centro_boton(&"agacharse")
	h.procesar(_toque(3, b, true))
	h.procesar(_toque(3, b, false))
	t.igual(h.entrada().postura, Movimiento.Postura.AGACHADO)
	h.procesar(_toque(3, b, true))
	h.procesar(_toque(3, b, false))
	t.igual(h.entrada().postura, Movimiento.Postura.CAMINAR)
