extends SceneTree
# Mide cuánto tarda la simulación (sin dibujo). Uso: godot --headless --path juego -s res://tests/medir.gd

func _init() -> void:
	var p := Partida.nueva("res://datos/mapas/muldraugh.txt", &"bombero", [], 3)
	print("zombies: ", p.zombies.size())
	var e := {"mover": Vector2(1, 0.3), "postura": Movimiento.Postura.CAMINAR, "atacar": false, "accion_contextual": {}}
	var t0 := Time.get_ticks_usec()
	var peor := 0
	for i in 600:
		var a := Time.get_ticks_usec()
		p.tick(1.0 / 30.0, e)
		peor = maxi(peor, Time.get_ticks_usec() - a)
	print("tick promedio: %.2f ms, peor: %.2f ms" % [(Time.get_ticks_usec() - t0) / 600.0 / 1000.0, peor / 1000.0])
	var g := p.grilla
	var c := p.casilla_jugador()
	t0 = Time.get_ticks_usec()
	var n := 0
	for y in range(c.y - 22, c.y + 23):
		for x in range(c.x - 22, c.x + 23):
			if Vision.ve(g, c, Vector2(1, 0), Vector3i(x, y, 0), 22.0, 144.0):
				n += 1
	print("niebla: %.2f ms (%d visibles)" % [(Time.get_ticks_usec() - t0) / 1000.0, n])
	quit()
