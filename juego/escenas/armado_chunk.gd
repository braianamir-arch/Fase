class_name ArmadoChunk
extends RefCounted
# Convierte un trozo de 10 × 10 casillas de la Grilla en mallas 3D, una por capa
# (paredes, suelo, techo, muebles) para poder ocultar cada una por separado.
# Casilla (x,y) del piso z ocupa en el mundo x..x+1, z..z+1 (eje Z de Godot = y de la grilla),
# a la altura piso*ALTO_PISO.

const CHUNK := 10
const ALTO_PISO := 2.7
const ESPESOR := 0.1
const ALTO_PUERTA := 2.05
const ANTEPECHO := 0.9
const DINTEL_VENTANA := 2.05
const ALTO_CERCO_BAJO := 0.9
const ALTO_CERCO_ALTO := 1.9
const ALTO_RECORTE := 0.35   # paredes recortadas delante del jugador

const COLOR_SUELO := {
	&"madera": Color(0.55, 0.40, 0.26), &"pasto": Color(0.33, 0.45, 0.22), &"vereda": Color(0.62, 0.61, 0.57),
	&"calle": Color(0.22, 0.22, 0.23), &"tierra": Color(0.45, 0.36, 0.25)}
const COLOR_PARED := Color(0.86, 0.84, 0.78)
const COLOR_PUERTA := Color(0.42, 0.27, 0.16)
const COLOR_CERCO := Color(0.55, 0.45, 0.32)
const COLOR_VIDRIO := Color(0.55, 0.70, 0.78, 0.35)
const COLOR_TECHO := Color(0.30, 0.27, 0.26)
const COLOR_MUEBLE := {
	&"heladera": Color(0.92, 0.92, 0.90), &"cocina": Color(0.85, 0.85, 0.83), &"cama": Color(0.55, 0.62, 0.75),
	&"sillon": Color(0.48, 0.30, 0.25), &"mesa": Color(0.50, 0.36, 0.22), &"inodoro": Color(0.95, 0.95, 0.95),
	&"bañera": Color(0.95, 0.95, 0.95), &"lavatorio": Color(0.95, 0.95, 0.95), &"tele": Color(0.15, 0.15, 0.15),
	&"arbol": Color(0.20, 0.35, 0.15)}
const ALTO_MUEBLE := {&"heladera": 1.8, &"ropero": 2.0, &"estanteria": 1.8, &"cama": 0.55, &"inodoro": 0.45,
	&"bañera": 0.6, &"silla": 0.9, &"tele": 0.9, &"arbol": 5.0, &"estante_negocio": 1.6}

static var _materiales: Dictionary = {}


static func material(transparente: bool = false) -> StandardMaterial3D:
	if not _materiales.has(transparente):
		var m := StandardMaterial3D.new()
		m.vertex_color_use_as_albedo = true
		m.roughness = 0.9
		if transparente:
			m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		_materiales[transparente] = m
	return _materiales[transparente]


static func construir(g: Grilla, chunk: Vector2i, piso: int, recortes: Dictionary = {}) -> Dictionary:
	var capas := {"paredes": SurfaceTool.new(), "suelo": SurfaceTool.new(), "techo": SurfaceTool.new(),
		"muebles": SurfaceTool.new(), "vidrio": SurfaceTool.new()}
	var usadas := {}
	for st: SurfaceTool in capas.values():
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		st.set_smooth_group(-1)   # caras planas: cada caja con sus normales propias
	var base := piso * ALTO_PISO
	for y in range(chunk.y * CHUNK, mini((chunk.y + 1) * CHUNK, g.alto)):
		for x in range(chunk.x * CHUNK, mini((chunk.x + 1) * CHUNK, g.ancho)):
			var p := Vector3i(x, y, piso)
			var s := g.suelo(p)
			if s != &"":
				_quad_suelo(capas.suelo, x, y, base + 0.001, COLOR_SUELO.get(s, Color.MAGENTA))
				usadas["suelo"] = true
			if g.adentro(p) and (piso + 1 >= g.pisos or g.suelo(p + Vector3i(0, 0, 1)) == &""):
				_caja(capas.techo, Vector3(x, base + ALTO_PISO, y), Vector3(x + 1, base + ALTO_PISO + 0.15, y + 1), COLOR_TECHO)
				usadas["techo"] = true
			var m := g.mueble(p)
			if m != &"":
				var alto: float = ALTO_MUEBLE.get(m, 0.8)
				var margen := 0.3 if m == &"arbol" else 0.08
				_caja(capas.muebles, Vector3(x + margen, base, y + margen), Vector3(x + 1 - margen, base + alto, y + 1 - margen),
					COLOR_MUEBLE.get(m, Color(0.5, 0.42, 0.33)))
				usadas["muebles"] = true
			if g.es_escalera(p):
				_escalera(capas.muebles, g, p, base)
				usadas["muebles"] = true
			for lado in [Grilla.NORTE, Grilla.OESTE]:
				if _borde(capas, g, p, lado, base, recortes.has(p)):
					usadas["paredes"] = true
					if g.borde(p, lado) == Grilla.B_VENTANA and not g.estado_abertura(p, lado).get("rota", true):
						usadas["vidrio"] = true
	var resultado := {}
	for nombre in ["paredes", "suelo", "techo", "muebles"]:
		var mesh := ArrayMesh.new()
		if usadas.has(nombre):
			var st: SurfaceTool = capas[nombre]
			st.generate_normals()
			st.set_material(material())
			st.commit(mesh)
		resultado[nombre] = mesh
	if usadas.has("vidrio"):
		var stv: SurfaceTool = capas.vidrio
		stv.generate_normals()
		stv.set_material(material(true))
		stv.commit(resultado.paredes)
	return resultado


# Caja de la hoja de una puerta (cerrada a lo largo de la pared, abierta girada 90° hacia adentro).
static func hoja_puerta(g: Grilla, p: Vector3i, lado: int) -> AABB:
	var base := p.z * ALTO_PISO
	var abierta: bool = g.estado_abertura(p, lado).get("abierta", false)
	var e := ESPESOR * 0.5
	if lado == Grilla.NORTE:
		if abierta:
			return AABB(Vector3(p.x, base, p.y), Vector3(e, ALTO_PUERTA, 0.9))
		return AABB(Vector3(p.x + 0.05, base, p.y - e * 0.5), Vector3(0.9, ALTO_PUERTA, e))
	if abierta:
		return AABB(Vector3(p.x, base, p.y), Vector3(0.9, ALTO_PUERTA, e))
	return AABB(Vector3(p.x - e * 0.5, base, p.y + 0.05), Vector3(e, ALTO_PUERTA, 0.9))


static func _borde(capas: Dictionary, g: Grilla, p: Vector3i, lado: int, base: float, recortada: bool = false) -> bool:
	var tipo := g.borde(p, lado)
	if tipo == Grilla.B_NADA:
		return false
	if recortada and tipo != Grilla.B_CERCO_BAJO:
		var e0 := ESPESOR * 0.5
		if lado == Grilla.NORTE:
			_caja(capas.paredes, Vector3(p.x, base, p.y - e0), Vector3(p.x + 1, base + ALTO_RECORTE, p.y + e0), COLOR_PARED)
		else:
			_caja(capas.paredes, Vector3(p.x - e0, base, p.y), Vector3(p.x + e0, base + ALTO_RECORTE, p.y + 1), COLOR_PARED)
		return true
	var st: SurfaceTool = capas.paredes
	var e := ESPESOR * 0.5
	# Tramo de pared entre a y b (en el plano), de altura h0..h1.
	var tramo := func(h0: float, h1: float, color: Color, desde: float = 0.0, hasta: float = 1.0) -> void:
		if lado == Grilla.NORTE:
			_caja(st, Vector3(p.x + desde, base + h0, p.y - e), Vector3(p.x + hasta, base + h1, p.y + e), color)
		else:
			_caja(st, Vector3(p.x - e, base + h0, p.y + desde), Vector3(p.x + e, base + h1, p.y + hasta), color)
	match tipo:
		Grilla.B_PARED:
			tramo.call(0.0, ALTO_PISO, COLOR_PARED)
		Grilla.B_CERCO_BAJO:
			tramo.call(0.0, ALTO_CERCO_BAJO, COLOR_CERCO)
		Grilla.B_CERCO_ALTO:
			tramo.call(0.0, ALTO_CERCO_ALTO, COLOR_CERCO)
		Grilla.B_PUERTA:
			tramo.call(ALTO_PUERTA, ALTO_PISO, COLOR_PARED)
			tramo.call(0.0, ALTO_PUERTA, COLOR_PARED, 0.0, 0.05)
			tramo.call(0.0, ALTO_PUERTA, COLOR_PARED, 0.95, 1.0)
			if not g.estado_abertura(p, lado).get("rota", false):
				var h := hoja_puerta(g, p, lado)
				_caja(st, h.position, h.end, COLOR_PUERTA)
		Grilla.B_VENTANA:
			tramo.call(0.0, ANTEPECHO, COLOR_PARED)
			tramo.call(DINTEL_VENTANA, ALTO_PISO, COLOR_PARED)
			tramo.call(ANTEPECHO, DINTEL_VENTANA, COLOR_PARED, 0.0, 0.08)
			tramo.call(ANTEPECHO, DINTEL_VENTANA, COLOR_PARED, 0.92, 1.0)
			var est := g.estado_abertura(p, lado)
			if not est.get("rota", false) and not est.get("abierta", false):
				var v: SurfaceTool = capas.vidrio
				if lado == Grilla.NORTE:
					_caja(v, Vector3(p.x + 0.08, base + ANTEPECHO, p.y - 0.01), Vector3(p.x + 0.92, base + DINTEL_VENTANA, p.y + 0.01), COLOR_VIDRIO)
				else:
					_caja(v, Vector3(p.x - 0.01, base + ANTEPECHO, p.y + 0.08), Vector3(p.x + 0.01, base + DINTEL_VENTANA, p.y + 0.92), COLOR_VIDRIO)
	return true


static func _escalera(st: SurfaceTool, g: Grilla, p: Vector3i, base: float) -> void:
	var destino := g.destino_escalera(p)
	var d := Vector2(destino.x - p.x, destino.y - p.y)
	var escalones := 8
	for i in escalones:
		var t0 := float(i) / escalones
		var t1 := float(i + 1) / escalones
		var h := (i + 1) * ALTO_PISO / escalones
		var a := Vector2(p.x, p.y) + Vector2(0.5, 0.5) + d * (t0 - 0.5)
		var b := Vector2(p.x, p.y) + Vector2(0.5, 0.5) + d * (t1 - 0.5)
		var lo := Vector2(minf(a.x, b.x), minf(a.y, b.y))
		var hi := Vector2(maxf(a.x, b.x), maxf(a.y, b.y))
		if d.x == 0:
			lo.x = p.x + 0.1
			hi.x = p.x + 0.9
		else:
			lo.y = p.y + 0.1
			hi.y = p.y + 0.9
		_caja(st, Vector3(lo.x, base, lo.y), Vector3(hi.x, base + h, hi.y), COLOR_PUERTA)


static func _quad_suelo(st: SurfaceTool, x: float, y: float, h: float, c: Color) -> void:
	st.set_color(c)
	var a := Vector3(x, h, y)
	var b := Vector3(x + 1, h, y)
	var cc := Vector3(x + 1, h, y + 1)
	var d := Vector3(x, h, y + 1)
	for v in [a, b, cc, a, cc, d]:
		st.add_vertex(v)


static func _caja(st: SurfaceTool, lo: Vector3, hi: Vector3, c: Color) -> void:
	st.set_color(c)
	var v := [Vector3(lo.x, lo.y, lo.z), Vector3(hi.x, lo.y, lo.z), Vector3(hi.x, lo.y, hi.z), Vector3(lo.x, lo.y, hi.z),
		Vector3(lo.x, hi.y, lo.z), Vector3(hi.x, hi.y, lo.z), Vector3(hi.x, hi.y, hi.z), Vector3(lo.x, hi.y, hi.z)]
	var caras := [[4, 5, 6, 7], [3, 2, 1, 0], [0, 1, 5, 4], [2, 3, 7, 6], [3, 0, 4, 7], [1, 2, 6, 5]]
	for f in caras:
		for i in [0, 1, 2, 0, 2, 3]:
			st.add_vertex(v[f[i]])
