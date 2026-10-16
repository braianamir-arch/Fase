class_name Caminos
extends RefCounted
# A* sobre la grilla 3D: 8 direcciones por piso más escaleras (sube y baja).
# AStarGrid2D no sirve porque los bloqueos están en los bordes, no en las casillas.

const MAX_NODOS := 2000
const VECINOS := [Vector3i(1, 0, 0), Vector3i(-1, 0, 0), Vector3i(0, 1, 0), Vector3i(0, -1, 0),
	Vector3i(1, 1, 0), Vector3i(1, -1, 0), Vector3i(-1, 1, 0), Vector3i(-1, -1, 0)]

var g: Grilla
var _bajadas: Dictionary = {}   # destino de escalera -> casilla de la escalera


func _init(grilla: Grilla) -> void:
	g = grilla
	for z in g.pisos:
		for y in g.alto:
			for x in g.ancho:
				var p := Vector3i(x, y, z)
				if g.es_escalera(p):
					_bajadas[g.destino_escalera(p)] = p


func _vecinos(p: Vector3i, abrir: bool, trepar: bool) -> Array:
	var r := []
	for d: Vector3i in VECINOS:
		var n := p + d
		if g.puede_pasar(p, n, abrir, trepar):
			r.append([n, 1.414 if d.x != 0 and d.y != 0 else 1.0])
	if g.es_escalera(p):
		r.append([g.destino_escalera(p), 2.0])
	if _bajadas.has(p):
		r.append([_bajadas[p], 2.0])
	return r


func buscar(a: Vector3i, b: Vector3i, puede_abrir_puertas: bool, puede_trepar: bool) -> Array[Vector3i]:
	var vacio: Array[Vector3i] = []
	if a == b:
		return [a] as Array[Vector3i]
	var abiertos := {a: true}
	var desde := {}
	var costo := {a: 0.0}
	var explorados := 0
	while not abiertos.is_empty() and explorados < MAX_NODOS:
		var actual: Vector3i = abiertos.keys()[0]
		var mejor := INF
		for n: Vector3i in abiertos:
			var f: float = costo[n] + _h(n, b)
			if f < mejor:
				mejor = f
				actual = n
		if actual == b:
			var camino: Array[Vector3i] = [b]
			while desde.has(camino[0]):
				camino.push_front(desde[camino[0]])
			return camino
		abiertos.erase(actual)
		explorados += 1
		for v in _vecinos(actual, puede_abrir_puertas, puede_trepar):
			var n: Vector3i = v[0]
			var c: float = costo[actual] + v[1]
			if c < costo.get(n, INF):
				costo[n] = c
				desde[n] = actual
				abiertos[n] = true
	return vacio


func _h(a: Vector3i, b: Vector3i) -> float:
	return Vector2(a.x - b.x, a.y - b.y).length() + absi(a.z - b.z) * 2.0


# Puerta o ventana que habría que romper para llegar de a a b. Vacío si ni así hay camino.
func obstaculo_mas_cercano(a: Vector3i, b: Vector3i) -> Dictionary:
	var camino := buscar(a, b, true, true)
	for i in range(1, camino.size()):
		var p := camino[i - 1]
		var n := camino[i]
		if p.z != n.z or g.puede_pasar(p, n, false, false):
			continue
		var tipo := g.entre(p, n)
		if tipo == Grilla.B_PUERTA or tipo == Grilla.B_VENTANA:
			var casilla := n if (n.y > p.y or n.x > p.x) else p
			var lado := Grilla.NORTE if p.y != n.y else Grilla.OESTE
			return {"casilla": casilla, "lado": lado}
	return {}
