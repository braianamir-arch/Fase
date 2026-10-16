extends RefCounted
var t

func _rng(s: int = 3) -> RandomNumberGenerator:
	var r := RandomNumberGenerator.new()
	r.seed = s
	return r

func test_17_partes() -> void:
	t.igual(Cuerpo.PARTES.size(), 17)
	t.verdad(Cuerpo.PARTES.has(&"cuello"))

func test_tasa_de_contagio_por_arañazo() -> void:
	var rng := _rng()
	var contagios := 0
	for i in 10000:
		var c := Cuerpo.new()
		if c.herir(&"antebrazo_izq", &"arañazo", rng):
			contagios += 1
	t.cerca(contagios / 10000.0, 0.07, 0.01)

func test_tasa_de_contagio_por_laceracion() -> void:
	var rng := _rng()
	var contagios := 0
	for i in 10000:
		if Cuerpo.new().herir(&"mano_der", &"laceracion", rng):
			contagios += 1
	t.cerca(contagios / 10000.0, 0.25, 0.015)

func test_mordida_siempre_contagia() -> void:
	var rng := _rng()
	for i in 200:
		var c := Cuerpo.new()
		t.verdad(c.herir(&"antebrazo_der", &"mordida", rng))
		t.verdad(c.infectado_knox)

func test_infectado_muere_a_las_72_horas() -> void:
	var c := Cuerpo.new()
	c.herir(&"antebrazo_der", &"mordida", _rng())
	c.vendar(&"antebrazo_der", true)
	for i in 71:
		c.avanzar(1.0)
	t.verdad(not c.muerto, "a las 71 h sigue vivo")
	c.avanzar(1.0)
	t.verdad(c.muerto)
	t.igual(c.causa_muerte, &"infeccion")

func test_resistente_tarda_mas() -> void:
	var c := Cuerpo.new([&"resistente"])
	c.herir(&"antebrazo_der", &"mordida", _rng())
	c.vendar(&"antebrazo_der", true)
	c.avanzar(80.0)
	t.verdad(not c.muerto, "×0,75: muere a las 96 h")

func test_sin_vendar_sangra() -> void:
	var c := Cuerpo.new()
	c.herir(&"muslo_izq", &"laceracion", _rng(99))
	t.verdad(c.sangrando())
	var antes := c.salud
	c.avanzar(1.0)
	t.verdad(c.salud < antes)

func test_vendada_no_sangra_y_cura() -> void:
	var c := Cuerpo.new()
	c.herir(&"muslo_izq", &"arañazo", _rng(99))
	c.vendar(&"muslo_izq", true)
	t.verdad(not c.sangrando())
	var antes := c.salud
	c.avanzar(1.0)
	t.verdad(c.salud >= antes)
	c.avanzar(16.0)
	t.igual(c.heridas.size(), 0, "a las 17 h el arañazo ya curó")

func test_sin_vendar_no_cura() -> void:
	var c := Cuerpo.new()
	c.herir(&"pie_izq", &"arañazo", _rng(99))
	c.salud = 100.0
	c.avanzar(20.0)
	t.igual(c.heridas.size(), 1)

func test_mordida_en_el_cuello_mata_rapido() -> void:
	var c := Cuerpo.new()
	c.herir(&"cuello", &"mordida", _rng())
	for i in 60:
		c.avanzar(1.0 / 60.0)
	t.verdad(c.muerto)
	t.igual(c.causa_muerte, &"desangrado")

func test_dolor() -> void:
	var c := Cuerpo.new()
	t.cerca(c.dolor(), 0.0, 0.001)
	c.herir(&"mano_izq", &"laceracion", _rng())
	t.verdad(c.dolor() > 0.0)
