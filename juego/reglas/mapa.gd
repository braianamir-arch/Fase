class_name Mapa
extends RefCounted
# Mapas en texto. Encabezado "# ancho alto pisos", un bloque "== piso N" por piso y "== objetos".
# Cada piso es una cuadrícula de doble resolución: la casilla (x,y) está en la columna 2x+1 de la
# línea 2y+1; su borde norte en (2x+1, 2y) y su borde oeste en (2x, 2y+1). Las esquinas se ignoran.
# Líneas que empiezan con ";" son comentarios.

const SUELOS := {".": &"madera", ",": &"pasto", "_": &"vereda", "=": &"calle", "~": &"tierra", "T": &"pasto", "@": &"madera"}
const INTERIOR := [".", "@", "S", "s", "E", "e"]
const ESCALERAS := {"S": Vector2i(0, 1), "s": Vector2i(0, -1), "E": Vector2i(1, 0), "e": Vector2i(-1, 0)}
const BORDES := {"-": Grilla.B_PARED, "|": Grilla.B_PARED, "#": Grilla.B_PARED, "D": Grilla.B_PUERTA,
	"W": Grilla.B_VENTANA, "f": Grilla.B_CERCO_BAJO, "F": Grilla.B_CERCO_ALTO}

static var _muebles: Dictionary = {}


static func _tabla_muebles() -> Dictionary:
	if _muebles.is_empty():
		_muebles = DatosJuego.cargar_json("res://datos/muebles.json")
	return _muebles


static func cargar(ruta: String) -> Grilla:
	return desde_texto(FileAccess.get_file_as_string(ruta))


static func desde_texto(texto: String) -> Grilla:
	return leer(texto).grilla


static func puntos_inicio(texto: String) -> Array[Vector3i]:
	return leer(texto).inicios


# Devuelve {grilla: Grilla, errores: PackedStringArray, inicios: Array[Vector3i], objetos: Array}.
static func leer(texto: String) -> Dictionary:
	var errores := PackedStringArray()
	var inicios: Array[Vector3i] = []
	var objetos: Array = []
	var lineas := texto.split("\n")
	var g: Grilla = null
	var piso := -1
	var fila := 0
	var en_objetos := false
	for n in lineas.size():
		var linea := lineas[n].trim_suffix("\r")
		var num := n + 1
		if linea.begins_with(";"):
			continue
		if linea.begins_with("# "):
			var p := linea.substr(2).split(" ", false)
			g = Grilla.new(int(p[0]), int(p[1]), int(p[2]))
			continue
		if linea.begins_with("== piso "):
			piso = int(linea.substr(8))
			fila = 0
			en_objetos = false
			continue
		if linea.begins_with("== objetos"):
			en_objetos = true
			continue
		if g == null:
			if linea.strip_edges() != "":
				errores.append("línea %d: falta el encabezado '# ancho alto pisos'" % num)
			continue
		if en_objetos:
			var o := linea.split(" ", false)
			if o.size() == 4:
				objetos.append({"pos": Vector3i(int(o[0]), int(o[1]), int(o[2])), "id": o[3]})
			elif linea.strip_edges() != "":
				errores.append("línea %d: objeto mal escrito" % num)
			continue
		if piso < 0:
			continue
		var largo := 2 * g.ancho + 1
		if linea.length() > largo:
			errores.append("línea %d: tiene %d caracteres y el máximo es %d" % [num, linea.length(), largo])
			continue
		if fila >= 2 * g.alto + 1:
			if linea.strip_edges() != "":
				errores.append("línea %d: sobran filas en el piso %d" % [num, piso])
			continue
		linea = linea.rpad(largo)
		_leer_fila(g, piso, fila, linea, inicios)
		fila += 1
	if g == null:
		g = Grilla.new(1, 1, 1)
		errores.append("el mapa no tiene encabezado")
	return {"grilla": g, "errores": errores, "inicios": inicios, "objetos": objetos}


static func _leer_fila(g: Grilla, piso: int, fila: int, linea: String, inicios: Array[Vector3i]) -> void:
	var y := fila / 2
	for col in linea.length():
		var c := linea[col]
		if c == " " or c == "+":
			continue
		var x := col / 2
		if fila % 2 == 1 and col % 2 == 1:
			_leer_casilla(g, Vector3i(x, y, piso), c, inicios)
		elif fila % 2 == 0 and col % 2 == 1 and BORDES.has(c):
			g.poner_borde(Vector3i(x, y, piso), Grilla.NORTE, BORDES[c])
		elif fila % 2 == 1 and col % 2 == 0 and BORDES.has(c):
			g.poner_borde(Vector3i(x, y, piso), Grilla.OESTE, BORDES[c])


static func _leer_casilla(g: Grilla, p: Vector3i, c: String, inicios: Array[Vector3i]) -> void:
	var muebles := _tabla_muebles()
	if SUELOS.has(c):
		g.poner_suelo(p, SUELOS[c], c in INTERIOR)
	elif ESCALERAS.has(c):
		g.poner_suelo(p, &"madera", true)
		g.poner_escalera(p, ESCALERAS[c])
	elif muebles.has(c):
		g.poner_suelo(p, &"madera", true)
	if c == "@":
		inicios.append(p)
	if muebles.has(c):
		var m: Dictionary = muebles[c]
		g.poner_mueble(p, StringName(m.id), m.solido, m.tapa_vista)


# Errores de estructura: aberturas sin suelo a los dos lados, escaleras que no llegan a un piso.
static func validar(g: Grilla) -> PackedStringArray:
	var errores := PackedStringArray()
	for z in g.pisos:
		for y in g.alto:
			for x in g.ancho:
				var p := Vector3i(x, y, z)
				for lado in [Grilla.NORTE, Grilla.OESTE]:
					var b := g.borde(p, lado)
					if b == Grilla.B_PUERTA or b == Grilla.B_VENTANA:
						var otro := p - (Vector3i(0, 1, 0) if lado == Grilla.NORTE else Vector3i(1, 0, 0))
						if g.suelo(p) == &"" or g.suelo(otro) == &"":
							errores.append("(%d,%d,%d): %s sin suelo a los dos lados" % [x, y, z, "puerta" if b == Grilla.B_PUERTA else "ventana"])
				if g.es_escalera(p) and g.suelo(g.destino_escalera(p)) == &"":
					errores.append("(%d,%d,%d): escalera sin piso arriba" % [x, y, z])
	return errores
