extends RefCounted
var t

func test_personalizada_sin_rasgos_tiene_8() -> void:
	t.igual(Creacion.puntos(&"personalizada", []), 8)
	t.verdad(Creacion.valido(&"personalizada", []))

func test_rasgos_suman_y_restan() -> void:
	t.igual(Creacion.puntos(&"personalizada", [&"valiente"]), 4)
	t.igual(Creacion.puntos(&"veterano", [&"sordo"]), 4)
	t.verdad(not Creacion.valido(&"veterano", []), "veterano solo queda en −8")

func test_excluyentes() -> void:
	t.verdad(not Creacion.valido(&"personalizada", [&"valiente", &"cobarde"]))
	t.verdad(Creacion.excluido(&"cobarde", [&"valiente"]))

func test_rasgos_de_profesion_no_se_eligen() -> void:
	t.verdad(not Creacion.valido(&"personalizada", [&"insensibilizado"]))
	t.verdad(not Creacion.elegibles().has(&"insensibilizado"))
	t.verdad(Creacion.elegibles().has(&"valiente"))

func test_texto_de_muerte() -> void:
	var s := Creacion.texto_muerte(Vector2i(2, 5), 14)
	t.verdad(s.contains("2 días, 5 horas"), s)
	t.verdad(s.contains("14"), s)
	t.verdad(Creacion.texto_muerte(Vector2i(1, 1), 1).contains("1 día, 1 hora"))
