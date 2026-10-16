class_name Caminos
extends RefCounted
# A* sobre la grilla 3D: 8 direcciones por piso más escaleras (sube y baja).
# AStarGrid2D no sirve porque los bloqueos están en los bordes, no en las casillas.
# Lista abierta en montículo binario y conjunto cerrado; tope de nodos por búsqueda.
# Modo "rompible": puertas y ventanas cerradas cuentan como pasables con costo extra (así un zombie
# encuentra qué romper y llega a su lado).

const MAX_NODOS := 600   # un zombie no planea más lejos que esto (≈ un radio de 14 casillas)
const COSTO_ROMPER := 8.0
const VECINOS := [Vector3i(1, 0, 0), Vector3i(-1, 0, 0), Vector3i(0, 1, 0), Vector3i(0, -1, 0),
	Vector3i(1, 1, 0), Vector3i(1, -1, 0), Vector3i(-1, 1, 0), Vector3i(-1, -1, 0)]

var g: Grilla
var _bajadas: Dictionary = {}   # destino de escalera -> casilla de la escalera
var _cache: Dictionary = {}     # [casilla, abrir, trepar, rompible] -> vecinos (se vacía si cambia la grilla)
var _version := -1


func _init(grilla: Grilla) -> void:
	g = grilla
	for z in g.pisos:
		for y in g.alto:
			for x in g.ancho:
				var p := Vector3i(x, y, z)
				if g.es_escalera(p):
					_bajadas[g.destino_escalera(p)] = p


func _vecinos(p: Vector3i, abrir: bool, trepar: bool, rompible: bool) -> Array:
	if _version != g.version:
		_cache.clear()
		_version = g.version
	var clave := Vector4i(p.x, p.y, p.z, int(abrir) | int(trepar) << 1 | int(rompible) << 2)
	var hecho: Variant = _cache.get(clave)
	if hecho != null:
		return hecho
	var r := _calcular_vecinos(p, abrir, trepar, rompible)
	_cache[clave] = r
	return r


func _calcular_vecinos(p: Vector3i, abrir: bool, trepar: bool, rompible: bool) -> Array:
	var r := []
	for d: Vector3i in VECINOS:
		var n := p + d
		if g.puede_pasar(p, n, abrir, trepar):
			r.append([n, 1.414 if d.x != 0 and d.y != 0 else 1.0])
		elif rompible and (d.x == 0 or d.y == 0) and g.pisable(n) and g.rompible_entre(p, n):
			r.append([n, COSTO_ROMPER])
	if g.es_escalera(p):
		r.append([g.destino_escalera(p), 2.0])
	if _bajadas.has(p):
		r.append([_bajadas[p], 2.0])
	return r


func buscar(a: Vector3i, b: Vector3i, puede_abrir_puertas: bool, puede_trepar: bool, rompible: bool = false) -> Array[Vector3i]:
	var vacio: Array[Vector3i] = []
	if a == b:
		return [a] as Array[Vector3i]
	if not g.dentro(b) or g.suelo(b) == &"":
		return vacio
	var monticulo: Array = [[_h(a, b), a]]
	var desde := {}
	var costo := {a: 0.0}
	var cerrados := {}
	while not monticulo.is_empty() and cerrados.size() < MAX_NODOS:
		var actual: Vector3i = _sacar(monticulo)[1]
		if cerrados.has(actual):
			continue
		if actual == b:
			var camino: Array[Vector3i] = [b]
			while desde.has(camino[0]):
				camino.push_front(desde[camino[0]])
			return camino
		cerrados[actual] = true
		for v in _vecinos(actual, puede_abrir_puertas, puede_trepar, rompible):
			var n: Vector3i = v[0]
			if cerrados.has(n):
				continue
			var c: float = costo[actual] + v[1]
			if c < costo.get(n, INF):
				costo[n] = c
				desde[n] = actual
				_meter(monticulo, [c + _h(n, b), n])
	return vacio


func _h(a: Vector3i, b: Vector3i) -> float:
	return Vector2(a.x - b.x, a.y - b.y).length() + absi(a.z - b.z) * 2.0


static func _meter(m: Array, item: Array) -> void:
	m.append(item)
	var i := m.size() - 1
	while i > 0:
		var padre := (i - 1) / 2
		if m[padre][0] <= m[i][0]:
			break
		var tmp: Array = m[padre]
		m[padre] = m[i]
		m[i] = tmp
		i = padre


static func _sacar(m: Array) -> Array:
	var arriba: Array = m[0]
	var ultimo: Array = m.pop_back()
	if m.is_empty():
		return arriba
	m[0] = ultimo
	var i := 0
	while true:
		var izq := 2 * i + 1
		var der := izq + 1
		var menor := i
		if izq < m.size() and m[izq][0] < m[menor][0]:
			menor = izq
		if der < m.size() and m[der][0] < m[menor][0]:
			menor = der
		if menor == i:
			break
		var tmp: Array = m[menor]
		m[menor] = m[i]
		m[i] = tmp
		i = menor
	return arriba


# Primer paso de un camino que hay que romper: {casilla, lado, junto} con la casilla de este lado
# ("junto") desde donde se golpea. Vacío si el camino no cruza nada cerrado.
func primer_obstaculo(camino: Array[Vector3i]) -> Dictionary:
	for i in range(1, camino.size()):
		var p := camino[i - 1]
		var n := camino[i]
		if p.z == n.z and g.rompible_entre(p, n) and not g.puede_pasar(p, n, false, true):
			var bl := g.borde_entre(p, n)
			return {"casilla": bl[0], "lado": bl[1], "junto": p}
	return {}


# Puerta o ventana que habría que romper para llegar de a a b. Vacío si ni así hay camino.
func obstaculo_mas_cercano(a: Vector3i, b: Vector3i) -> Dictionary:
	return primer_obstaculo(buscar(a, b, false, true, true))
