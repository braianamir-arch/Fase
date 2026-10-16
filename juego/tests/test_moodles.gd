extends RefCounted
var t

func _rng() -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = 5
	return r

func test_sano_sin_moodles() -> void:
	var m := Moodles.calcular(Cuerpo.new(), Movimiento.new(), Inventario.new(), 0.0, 12.0)
	for n in [&"dolor", &"panico", &"sangrando", &"herido", &"cansancio_fisico", &"carga", &"enfermo"]:
		t.igual(m.get(n, -1), 0, n)

func test_herido_y_sangrando() -> void:
	var c := Cuerpo.new()
	c.herir(&"mano_izq", &"laceracion", _rng())
	c.herir(&"pie_der", &"arañazo", _rng())
	c.salud = 55.0
	var m := Moodles.calcular(c, Movimiento.new(), Inventario.new(), 0.0, 12.0)
	t.igual(m[&"sangrando"], 2)
	t.igual(m[&"herido"], 2)
	t.verdad(m[&"dolor"] >= 1)

func test_carga_y_cansancio() -> void:
	var inv := Inventario.new()
	inv.extra_peso = 15.5
	var mov := Movimiento.new()
	mov.endurance = 0.3
	var m := Moodles.calcular(Cuerpo.new(), mov, inv, 0.0, 12.0)
	t.igual(m[&"carga"], 2)
	t.igual(m[&"cansancio_fisico"], 2)

func test_panico_e_infeccion() -> void:
	var c := Cuerpo.new()
	c.infectado_knox = true
	c.horas_infectado = 30.0
	var m := Moodles.calcular(c, Movimiento.new(), Inventario.new(), 70.0, 12.0)
	t.igual(m[&"panico"], 3)
	t.igual(m[&"enfermo"], 3)

func test_panico_sube_con_zombies() -> void:
	t.cerca(Moodles.panico_siguiente(0.0, 2, 0.0, []), 6.0, 0.001)
	t.cerca(Moodles.panico_siguiente(10.0, 0, 1.0, [], true), 10.5, 0.001)
	t.cerca(Moodles.panico_siguiente(0.0, 2, 0.0, [&"valiente"]), 1.8, 0.001)
	t.cerca(Moodles.panico_siguiente(0.0, 2, 0.0, [&"insensibilizado"]), 0.0, 0.001)
