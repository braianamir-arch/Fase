extends RefCounted
var t

func test_ruido_de_pasos() -> void:
	var m := Movimiento.new()
	t.cerca(m.ruido_paso(Movimiento.Postura.CAMINAR, []), 7.0, 0.001)
	t.cerca(m.ruido_paso(Movimiento.Postura.ESPRINTAR, []), 14.0, 0.001)
	t.cerca(m.ruido_paso(Movimiento.Postura.AGACHADO, []), 3.5, 0.001)
	t.cerca(m.ruido_paso(Movimiento.Postura.CAMINAR, [&"pies_ligeros_graceful"]), 4.2, 0.001)
	t.cerca(m.ruido_paso(Movimiento.Postura.CAMINAR, [&"torpe"]), 8.4, 0.001)

func test_esprintar_gasta_y_parado_recupera() -> void:
	var m := Movimiento.new()
	m.avanzar(10.0, Movimiento.Postura.ESPRINTAR, true)
	var gastada := m.endurance
	t.verdad(gastada < 1.0)
	m.avanzar(10.0, Movimiento.Postura.CAMINAR, false)
	t.verdad(m.endurance > gastada)

func test_cansado_no_esprinta() -> void:
	var m := Movimiento.new()
	m.endurance = 0.45  # High Exertion (gastado ≥ 50 %)
	t.igual(m.postura_posible(Movimiento.Postura.ESPRINTAR, 0), Movimiento.Postura.CORRER)
	m.endurance = 0.2   # Excessive (≥ 75 %): ni correr
	t.igual(m.postura_posible(Movimiento.Postura.CORRER, 0), Movimiento.Postura.CAMINAR)

func test_carga_frena() -> void:
	var m := Movimiento.new()
	var libre := m.velocidad(Movimiento.Postura.CAMINAR, 0, [])
	t.cerca(m.velocidad(Movimiento.Postura.CAMINAR, 2, []), libre * 0.63, 0.001)
	t.verdad(m.velocidad(Movimiento.Postura.ESPRINTAR, 0, []) > m.velocidad(Movimiento.Postura.CORRER, 0, []))
