class_name Vision
extends RefCounted
# Qué se ve: pisos y techos a mostrar, cono de visión con línea libre, paredes que tapan al jugador.

const DETRAS := 1.5   # casillas que se perciben por detrás del cono (como PZ)
const RECORTE := 3    # casillas delante de la cámara cuyas paredes se recortan


static func pisos_visibles(piso_jugador: int, en_escalera: bool, adentro: bool) -> Dictionary:
	if en_escalera:
		return {"max_piso": piso_jugador + 1, "techos": false}
	if adentro:
		return {"max_piso": piso_jugador, "techos": false}
	return {"max_piso": 99, "techos": true}


static func ve(g: Grilla, desde: Vector3i, mirando: Vector2, hasta: Vector3i, radio: float, cono_grados: float) -> bool:
	if desde.z != hasta.z:
		return false
	var d := Vector2(hasta.x - desde.x, hasta.y - desde.y)
	var dist := d.length()
	if dist > radio:
		return false
	if dist > DETRAS and mirando != Vector2.ZERO:
		if absf(rad_to_deg(mirando.angle_to(d))) > cono_grados * 0.5:
			return false
	return linea_libre(g, desde, hasta)


# Recorre las casillas entre a y b (paso a paso, sin saltar esquinas) y mira si algo tapa.
static func linea_libre(g: Grilla, a: Vector3i, b: Vector3i) -> bool:
	var x := a.x
	var y := a.y
	var dx := absi(b.x - a.x)
	var dy := absi(b.y - a.y)
	var sx := 1 if b.x > a.x else -1
	var sy := 1 if b.y > a.y else -1
	var err := dx - dy
	while x != b.x or y != b.y:
		var e2 := 2 * err
		var nx := x
		var ny := y
		if e2 > -dy:
			err -= dy
			nx += sx
		if e2 < dx:
			err += dx
			ny += sy
		var actual := Vector3i(x, y, a.z)
		var sig := Vector3i(nx, ny, a.z)
		if nx != x and ny != y:
			# Diagonal: tapa solo si están tapados los dos caminos en L.
			var c1 := Vector3i(nx, y, a.z)
			var c2 := Vector3i(x, ny, a.z)
			var libre1 := not g.tapa_vista(actual, c1) and not g.tapa_vista(c1, sig)
			var libre2 := not g.tapa_vista(actual, c2) and not g.tapa_vista(c2, sig)
			if not libre1 and not libre2:
				return false
		elif g.tapa_vista(actual, sig):
			return false
		x = nx
		y = ny
	return true


# Casillas delante del jugador (hacia la cámara, que mira desde el sureste) cuyas paredes norte u
# oeste lo taparían. Mundo3D las baja de altura.
static func paredes_a_recortar(g: Grilla, jugador: Vector3i) -> Array[Vector3i]:
	var r: Array[Vector3i] = []
	for y in range(jugador.y, jugador.y + RECORTE + 1):
		for x in range(jugador.x, jugador.x + RECORTE + 1):
			var p := Vector3i(x, y, jugador.z)
			if p == jugador:
				continue
			var norte := g.borde(p, Grilla.NORTE) != Grilla.B_NADA and y > jugador.y
			var oeste := g.borde(p, Grilla.OESTE) != Grilla.B_NADA and x > jugador.x
			if norte or oeste:
				r.append(p)
	return r
