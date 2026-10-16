extends RefCounted
var t

func _rng(s: int = 11) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = s
	return r

func _arma(id: String) -> Dictionary:
	return DatosJuego.cargar_json("res://datos/armas.json")[id]

func test_muy_cerca_es_empujon() -> void:
	var r := Combate.golpe(_arma("bate"), 0.3, 0, 5, false, 0, _rng())
	t.igual(r.tipo, &"empujon")
	t.cerca(r["daño"], 0.0, 0.001)

func test_daño_del_bate_en_rango() -> void:
	var a := _arma("bate")
	var rng := _rng()
	for i in 3000:
		var r := Combate.golpe(a, 1.0, 0, rng.randi_range(0, 10), false, 0, rng)
		t.igual(r.tipo, &"golpe")
		if r["daño"] < 0.8 * 0.75 - 1e-6 or r["daño"] > 1.1 * 1.25 * 2.0 + 1e-6:
			t.verdad(false, "daño fuera de rango: %f" % r["daño"])
			return

func test_dos_manos_con_una_hace_la_mitad() -> void:
	var a := _arma("bate")
	var rng := _rng()
	var normal := 0.0
	var una := 0.0
	for i in 5000:
		normal += Combate.golpe(a, 1.0, 0, 5, false, 0, rng)["daño"]
		una += Combate.golpe(a, 1.0, 0, 5, true, 0, rng)["daño"]
	t.cerca(una / normal, 0.5, 0.03)

func test_critico_limitado_entre_10_y_90() -> void:
	var a := _arma("bate")
	t.cerca(Combate.prob_critico(a, 30, 0), 0.9, 1e-6)
	var sin_crit := a.duplicate()
	sin_crit.crit = 0.0
	t.cerca(Combate.prob_critico(sin_crit, 0, 4), 0.1, 1e-6)
	t.cerca(Combate.prob_critico(a, 2, 0), 0.46, 1e-6)

func test_habilidad_suma_daño() -> void:
	t.cerca(Combate.bonus_habilidad("long_blunt", 3), 1.1, 1e-6)
	t.cerca(Combate.bonus_habilidad("axe", 7), 1.2, 1e-6)
	t.cerca(Combate.bonus_habilidad("short_blunt", 7), 1.0, 1e-6)

func test_palanca_se_gasta_1_en_71() -> void:
	var a := _arma("palanca")
	var rng := _rng()
	var gastos := 0
	for i in 71000:
		if Combate.pierde_condicion(a, 0, 0, rng):
			gastos += 1
	t.cerca(gastos / 71000.0, 1.0 / 71.0, 0.003)

func test_mantenimiento_lo_hace_durar_mas() -> void:
	t.igual(Combate.mod_mantenimiento(4, 2), 2)
	t.igual(Combate.mod_mantenimiento(0, 0), 0)

func test_ataque_zombie_mas_mordidas_si_te_rodean() -> void:
	var rng := _rng()
	var solo := 0
	var rodeado := 0
	for i in 10000:
		if Combate.ataque_zombie(1, {}, rng) == &"mordida":
			solo += 1
		if Combate.ataque_zombie(4, {}, rng) == &"mordida":
			rodeado += 1
	t.verdad(rodeado > solo * 2, "%d vs %d" % [rodeado, solo])

func test_ropa_protege() -> void:
	var rng := _rng()
	var heridas := 0
	for i in 2000:
		if Combate.ataque_zombie(1, {"arañazo": 1.0, "laceracion": 1.0, "mordida": 1.0}, rng) != &"nada":
			heridas += 1
	t.igual(heridas, 0)

func test_vida_zombie_b42_random() -> void:
	var rng := _rng()
	for i in 500:
		var v := Combate.vida_zombie(rng)
		t.verdad(v >= 0.5 and v <= 3.8, str(v))

func test_empujon_tira_45_por_ciento_con_fuerza_5() -> void:
	var rng := _rng()
	var n := 0
	for i in 10000:
		if Combate.empujon_tira(5, rng):
			n += 1
	t.cerca(n / 10000.0, 0.45, 0.015)

func test_pisoton_con_fuerza() -> void:
	var rng := _rng()
	for i in 200:
		var d := Combate.pisoton(5, rng)
		t.verdad(d >= 1.7 - 1e-6 and d <= 2.0 + 1e-6, str(d))

func test_lunge_tira_al_jugador() -> void:
	var rng := _rng()
	var n := 0
	for i in 10000:
		if Combate.lunge_tira_jugador(5, rng):
			n += 1
	t.cerca(n / 10000.0, 0.667 * 0.20, 0.015)
