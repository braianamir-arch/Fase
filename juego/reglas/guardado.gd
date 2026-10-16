class_name Guardado
extends RefCounted
# Guarda la partida en JSON. Se escribe a un .tmp y después se renombra, así nunca queda un
# archivo cortado. Una partida que no se puede leer se informa y no se borra.

const VERSION := 1
const RUTA := "user://partida.json"


static func _v3(v: Vector3) -> Array:
	return [v.x, v.y, v.z]


static func _v3i(v: Vector3i) -> Array:
	return [v.x, v.y, v.z]


static func _a3(a: Array) -> Vector3:
	return Vector3(a[0], a[1], a[2])


static func _a3i(a: Array) -> Vector3i:
	return Vector3i(int(a[0]), int(a[1]), int(a[2]))


static func a_texto(p: Partida) -> String:
	var g := p.grilla
	var aberturas := []
	for z in g.pisos:
		for y in g.alto:
			for x in g.ancho:
				for lado in [Grilla.NORTE, Grilla.OESTE]:
					var e := g.estado_abertura(Vector3i(x, y, z), lado)
					if not e.is_empty() and (e.abierta or e.rota or e.vida < 1.0 or e.tablas > 0):
						aberturas.append({"c": [x, y, z], "lado": lado, "abierta": e.abierta, "rota": e.rota, "vida": e.vida, "tablas": e.tablas})
	var zombies := []
	for z in p.zombies:
		zombies.append({"id": z.id, "pos": _v3(z.pos), "casilla": _v3i(z.casilla), "vida": z.vida, "muerto": z.muerto,
			"caido": z.caido, "t_caido": z.t_caido, "mirando": [z.mirando.x, z.mirando.y],
			"estado": z.mente.estado, "objetivo": _v3i(z.mente.objetivo), "memoria": z.mente.memoria})
	var objetos := []
	for c: Vector3i in p.objetos_en_suelo:
		objetos.append({"c": _v3i(c), "ids": p.objetos_en_suelo[c]})
	var heridas := []
	for h in p.cuerpo.heridas:
		heridas.append(h.duplicate())
	var d := {
		"version": VERSION, "mapa": p.ruta_mapa, "semilla": p.rng.seed, "profesion": p.profesion,
		"rasgos": p.rasgos_elegidos, "reloj": p.reloj.segundos_juego, "inicio": p.inicio_seg,
		"jugador": {"pos": _v3(p.jugador_pos), "mirando": [p.jugador_mirando.x, p.jugador_mirando.y],
			"endurance": p.movimiento.endurance, "panico": p.panico},
		"cuerpo": {"salud": p.cuerpo.salud, "infectado": p.cuerpo.infectado_knox, "horas": p.cuerpo.horas_infectado,
			"muerto": p.cuerpo.muerto, "causa": p.cuerpo.causa_muerte, "heridas": heridas},
		"inventario": {"items": p.inventario.items, "equipada": p.inventario.equipada, "dos_manos": p.inventario.dos_manos,
			"condicion": p.condicion_armas},
		"zombies": zombies, "matados": p.zombies_matados, "objetos": objetos, "aberturas": aberturas,
	}
	return JSON.stringify(d, "\t")


static func desde_texto(s: String) -> Dictionary:
	var json := JSON.new()
	if json.parse(s) != OK or not json.data is Dictionary:
		return {"ok": false, "error": "la partida guardada está dañada"}
	var d: Dictionary = json.data
	if int(d.get("version", -1)) != VERSION:
		return {"ok": false, "error": "partida de otra versión del juego"}
	if not FileAccess.file_exists(String(d.mapa)):
		return {"ok": false, "error": "no se encontró el mapa " + String(d.mapa)}
	var l := Mapa.leer(FileAccess.get_file_as_string(String(d.mapa)))
	var p := Partida.nueva_en(l.grilla, Vector3i.ZERO, d.rasgos, int(d.semilla), StringName(d.profesion))
	p.ruta_mapa = d.mapa
	p.reloj.segundos_juego = float(d.reloj)
	p.inicio_seg = float(d.inicio)
	var j: Dictionary = d.jugador
	p.jugador_pos = _a3(j.pos)
	p.jugador_mirando = Vector2(j.mirando[0], j.mirando[1])
	p.movimiento.endurance = float(j.endurance)
	p.panico = float(j.panico)
	var c: Dictionary = d.cuerpo
	p.cuerpo.salud = float(c.salud)
	p.cuerpo.infectado_knox = bool(c.infectado)
	p.cuerpo.horas_infectado = float(c.horas)
	p.cuerpo.muerto = bool(c.muerto)
	p.cuerpo.causa_muerte = StringName(c.causa)
	for h: Dictionary in c.heridas:
		h.parte = StringName(h.parte)
		h.tipo = StringName(h.tipo)
		p.cuerpo.heridas.append(h)
	var inv: Dictionary = d.inventario
	for id in inv.items:
		p.inventario.items.append(StringName(id))
	p.inventario.equipada = StringName(inv.equipada)
	p.inventario.dos_manos = bool(inv.dos_manos)
	for id in inv.condicion:
		p.condicion_armas[StringName(id)] = int(inv.condicion[id])
	for zd: Dictionary in d.zombies:
		var z := p.agregar_zombie(_a3i(zd.casilla))
		z.id = int(zd.id)
		z.pos = _a3(zd.pos)
		z.vida = float(zd.vida)
		z.muerto = bool(zd.muerto)
		z.caido = bool(zd.caido)
		z.t_caido = float(zd.t_caido)
		z.mirando = Vector2(zd.mirando[0], zd.mirando[1])
		z.mente.estado = int(zd.estado)
		z.mente.objetivo = _a3i(zd.objetivo)
		z.mente.memoria = int(zd.memoria)
	p.zombies_matados = int(d.matados)
	for o: Dictionary in d.objetos:
		for id in o.ids:
			p.soltar_en(_a3i(o.c), StringName(id))
	for a: Dictionary in d.aberturas:
		var e := p.grilla.estado_abertura(_a3i(a.c), int(a.lado))
		if not e.is_empty():
			e.abierta = bool(a.abierta)
			e.rota = bool(a.rota)
			e.vida = float(a.vida)
			e.tablas = int(a.tablas)
	return {"ok": true, "partida": p, "error": ""}


static func guardar(p: Partida, ruta: String = RUTA) -> bool:
	var tmp := ruta + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(a_texto(p))
	f.close()
	return DirAccess.rename_absolute(ProjectSettings.globalize_path(tmp), ProjectSettings.globalize_path(ruta)) == OK


static func cargar(ruta: String = RUTA) -> Dictionary:
	if not FileAccess.file_exists(ruta):
		return {"ok": false, "error": "no hay partida guardada"}
	return desde_texto(FileAccess.get_file_as_string(ruta))


static func borrar(ruta: String = RUTA) -> void:
	if FileAccess.file_exists(ruta):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(ruta))
