extends RefCounted
var t

func test_ruidos() -> void:
	var r := DatosJuego.cargar_json("res://datos/ruidos.json")
	t.cerca(r.caminar.radio, 7.0, 0.001)
	t.cerca(r.esprintar.radio, 14.0, 0.001)
	t.cerca(r.agachado.radio, 3.5, 0.001)
	t.cerca(r.gritar.radio, 30.0, 0.001)
	t.cerca(r.zombie_golpea_puerta.radio, 20.0, 0.001)

func test_infeccion() -> void:
	var i := DatosJuego.cargar_json("res://datos/infeccion.json")
	t.cerca(i.contagio["arañazo"], 0.07, 1e-6)
	t.cerca(i.contagio.laceracion, 0.25, 1e-6)
	t.cerca(i.contagio.mordida, 1.0, 1e-6)
	t.igual(i.horas_hasta_muerte, 72)

func test_lore_por_defecto() -> void:
	var l := DatosJuego.cargar_json("res://datos/lore.json")
	t.igual(l.velocidad, "shambler")
	t.igual(l.memoria_ticks, 800)
	t.igual(l.cognicion, "navegacion_basica")
	t.verdad(l.fence_lunge)

func test_armas_etapa1() -> void:
	var a := DatosJuego.cargar_json("res://datos/armas.json")
	for id in ["bate", "palo_amasar", "sarten", "cuchillo_cocina", "martillo", "hacha_bombero", "palanca", "palo_golf", "destornillador", "pala"]:
		t.verdad(a.has(id), id)
		for campo in ["categoria", "dos_manos", "daño_min", "daño_max", "alcance_min", "alcance_max", "crit", "crit_mult", "condicion_max", "condicion_baja_uno_en", "peso", "endurance_mod", "velocidad"]:
			t.verdad(a.get(id, {}).has(campo), id + "." + campo)
	t.cerca(a.bate["daño_min"], 0.8, 1e-6)
	t.cerca(a.bate["daño_max"], 1.1, 1e-6)
	t.igual(a.bate.condicion_max, 15)
	t.cerca(a.palanca["daño_min"], 0.6, 1e-6)
	t.igual(a.palanca.condicion_baja_uno_en, 70)
	t.cerca(a.hacha_bombero["daño_max"], 2.0, 1e-6)

func test_profesiones_b42() -> void:
	var p := DatosJuego.cargar_json("res://datos/profesiones.json")
	t.igual(p.size(), 25)
	t.igual(p.personalizada.puntos, 8)
	t.igual(p.veterano.puntos, -8)
	t.verdad(p.veterano.rasgos.has("insensibilizado"))
	t.igual(p.bombero.habilidades.hacha, 1)

func test_rasgos_b42() -> void:
	var r := DatosJuego.cargar_json("res://datos/rasgos.json")
	t.igual(r.valiente.costo, -4)
	t.igual(r.sordo.costo, 12)
	t.igual(r.pies_ligeros_graceful.costo, -4)
	t.verdad(r.sordo.excluye.has("duro_de_oido"))
	t.verdad(r.has("insensibilizado") and r.insensibilizado.solo_profesion)

func test_moodles_umbrales() -> void:
	var m := DatosJuego.cargar_json("res://datos/moodles.json")
	for n in ["dolor", "panico", "sangrando", "herido", "cansancio_fisico", "carga", "enfermo"]:
		t.verdad(m.has(n), n)
	t.igual(m.carga.umbrales, [1.0, 1.25, 1.5, 1.75])
	t.igual(m.cansancio_fisico.umbrales, [0.25, 0.5, 0.75, 0.9])

func test_capacidad_por_fuerza() -> void:
	var o := DatosJuego.cargar_json("res://datos/objetos.json")
	t.igual(o._capacidad_por_fuerza, [6.0, 7.0, 8.0, 9.0, 11.0, 12.0, 14.0, 15.0, 16.0, 18.0, 20.0])

func test_verificar_listado() -> void:
	# Todo valor marcado "verificar" en un JSON tiene que figurar en VERIFICAR.md.
	var lista := FileAccess.get_file_as_string("res://datos/VERIFICAR.md")
	for nombre in ["ruidos", "lore", "infeccion", "armas", "profesiones", "rasgos", "objetos", "moodles"]:
		var d := DatosJuego.cargar_json("res://datos/%s.json" % nombre)
		for clave in d:
			if d[clave] is Dictionary and d[clave].get("verificar", false):
				t.verdad(lista.contains("%s.%s" % [nombre, clave]), "%s.%s falta en VERIFICAR.md" % [nombre, clave])
