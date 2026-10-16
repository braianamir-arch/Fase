extends RefCounted
var t

const PRUEBA := "res://tests/mapas/prueba.txt"

func test_carga_casa_de_prueba() -> void:
	var g := Mapa.cargar(PRUEBA)
	t.igual(g.ancho, 6); t.igual(g.alto, 5); t.igual(g.pisos, 2)
	t.igual(g.borde(Vector3i(2, 4, 0), Grilla.NORTE), Grilla.B_PUERTA)
	t.igual(g.borde(Vector3i(1, 2, 0), Grilla.OESTE), Grilla.B_VENTANA)
	t.igual(g.borde(Vector3i(3, 1, 0), Grilla.NORTE), Grilla.B_VENTANA)
	t.igual(g.borde(Vector3i(1, 1, 0), Grilla.NORTE), Grilla.B_PARED)
	t.igual(g.borde(Vector3i(5, 3, 0), Grilla.OESTE), Grilla.B_PARED)
	t.verdad(g.adentro(Vector3i(2, 2, 0)))
	t.verdad(not g.adentro(Vector3i(0, 0, 0)))
	t.igual(g.suelo(Vector3i(0, 0, 0)), &"pasto")
	t.igual(g.mueble(Vector3i(3, 2, 0)), &"heladera")
	t.verdad(g.es_escalera(Vector3i(4, 3, 0)))
	t.igual(g.destino_escalera(Vector3i(4, 3, 0)), Vector3i(4, 2, 1))
	t.igual(g.suelo(Vector3i(0, 0, 1)), &"")

func test_puntos_de_inicio() -> void:
	var texto := FileAccess.get_file_as_string(PRUEBA)
	t.igual(Mapa.puntos_inicio(texto), [Vector3i(1, 1, 0)])

func test_objetos() -> void:
	var l := Mapa.leer(FileAccess.get_file_as_string(PRUEBA))
	t.igual(l.objetos, [{"pos": Vector3i(2, 2, 0), "id": "bate"}, {"pos": Vector3i(3, 3, 0), "id": "venda"}])

func test_casa_de_prueba_valida() -> void:
	var l := Mapa.leer(FileAccess.get_file_as_string(PRUEBA))
	t.igual(l.errores.size(), 0, str(l.errores))
	t.igual(Mapa.validar(l.grilla).size(), 0, str(Mapa.validar(l.grilla)))

func test_puerta_en_la_nada() -> void:
	var texto := "# 2 1 1\n== piso 0\n+ + +\n  D  \n+ + +\n"
	t.igual(Mapa.validar(Mapa.desde_texto(texto)).size(), 1)

func test_escalera_sin_piso_arriba() -> void:
	var texto := "# 2 1 2\n== piso 0\n+ + +\n . S \n+ + +\n== piso 1\n+ + +\n     \n+ + +\n"
	t.igual(Mapa.validar(Mapa.desde_texto(texto)).size(), 1)

func test_fila_demasiado_larga() -> void:
	var texto := "# 2 1 1\n== piso 0\n+ + +\n . .  x\n+ + +\n"
	var l := Mapa.leer(texto)
	t.igual(l.errores.size(), 1)
	t.verdad(l.errores[0].contains("línea 4"), str(l.errores))
