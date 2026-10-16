class_name Partida
extends RefCounted
# Una partida: junta grilla, reloj, ruido, jugador, zombies y combate. No dibuja nada;
# los nodos de escenas/ leen este estado. Posiciones continuas en Vector3(x, piso, y) de la grilla.

const PASO_MENTE := 0.25          # segundos reales entre decisiones de cada zombie
const CADA_PASO_RUIDO := 0.4      # segundos reales entre ruidos de pasos
const ATAQUE_ZOMBIE_CD := 1.5
const GOLPE_OBSTACULO_CD := 1.5
const DAÑO_OBSTACULO := {Grilla.B_VENTANA: 0.03, Grilla.B_PUERTA: 0.007}   # por golpe (ventana ≈ 20 min de juego)
const TIEMPO_CAIDO := 2.5
const TIEMPO_TUMBADO := 1.5
const RADIO_SPAWN_LIBRE := 15.0
const RECUPERA_PANICO := 1.75     # % por segundo real (día 1 de PZ)

var grilla: Grilla
var reloj := Reloj.new()
var ruido := Ruido.new()
var caminos: Caminos
var rng := RandomNumberGenerator.new()
var movimiento := Movimiento.new()
var cuerpo: Cuerpo
var inventario := Inventario.new()

var ruta_mapa := ""
var profesion: StringName = &""
var rasgos_elegidos: Array = []
var rasgos: Array = []
var habilidades: Dictionary = {}
var fuerza := 5
var forma_fisica := 5

var jugador_pos := Vector3.ZERO
var jugador_mirando := Vector2(0, 1)
var postura: int = Movimiento.Postura.CAMINAR
var moviendose := false
var tumbado := 0.0
var panico := 0.0
var condicion_armas: Dictionary = {}   # id -> condición actual del arma equipada

var zombies: Array[Dictionary] = []
var zombies_matados := 0
var objetos_en_suelo: Dictionary = {}   # Vector3i -> Array[StringName]
var inicio_seg := 0.0
var eventos: Array[Dictionary] = []     # para la pantalla: golpes, heridas, roturas (se vacía en cada tick)

var _bajadas: Dictionary = {}
var _cd_ataque := 0.0
var _t_pasos := 0.0
var _t_mente := 0.0
var _vistos: Dictionary = {}
var _reanimar_en := -1.0
var _siguiente_id := 1


static func nueva(ruta_mapa: String, p_profesion: StringName, p_rasgos: Array, semilla: int) -> Partida:
	var texto := FileAccess.get_file_as_string(ruta_mapa)
	var l := Mapa.leer(texto)
	var inicios: Array[Vector3i] = l.inicios
	var p := nueva_en(l.grilla, inicios[0] if not inicios.is_empty() else Vector3i(1, 1, 0), p_rasgos, semilla, p_profesion)
	p.ruta_mapa = ruta_mapa
	for o in l.objetos:
		p.soltar_en(o.pos, StringName(o.id))
	p.poblar()
	return p


static func nueva_en(g: Grilla, inicio: Vector3i, p_rasgos: Array, semilla: int, p_profesion: StringName = &"personalizada") -> Partida:
	var p := Partida.new()
	p.grilla = g
	p.caminos = Caminos.new(g)
	p.rng.seed = semilla
	p.profesion = p_profesion
	p._armar_personaje(p_rasgos)
	p.jugador_pos = Vector3(inicio.x + 0.5, inicio.z, inicio.y + 0.5)
	p.inicio_seg = p.reloj.segundos_juego
	for z in g.pisos:
		for y in g.alto:
			for x in g.ancho:
				var c := Vector3i(x, y, z)
				if g.es_escalera(c):
					p._bajadas[g.destino_escalera(c)] = c
	return p


func _armar_personaje(p_rasgos: Array) -> void:
	var prof: Dictionary = DatosJuego.cargar_json("res://datos/profesiones.json").get(String(profesion), {})
	var tabla_rasgos := DatosJuego.cargar_json("res://datos/rasgos.json")
	rasgos_elegidos = p_rasgos.duplicate()
	rasgos = []
	for r in p_rasgos:
		rasgos.append(StringName(r))
	for r in prof.get("rasgos", []):
		rasgos.append(StringName(r))
	habilidades = {}
	var fuentes: Array = [prof.get("habilidades", {})]
	for r in rasgos:
		fuentes.append(tabla_rasgos.get(String(r), {}).get("habilidades", {}))
	for f: Dictionary in fuentes:
		for h in f:
			habilidades[h] = int(habilidades.get(h, 0)) + int(f[h])
	fuerza = clampi(5 + int(habilidades.get("fuerza", 0)), 0, 10)
	forma_fisica = clampi(5 + int(habilidades.get("forma_fisica", 0)), 0, 10)
	cuerpo = Cuerpo.new(rasgos)


func casilla_jugador() -> Vector3i:
	return Vector3i(floori(jugador_pos.x), floori(jugador_pos.z), int(jugador_pos.y))


func termino() -> bool:
	return cuerpo.muerto


func capacidad() -> float:
	return Inventario.capacidad(fuerza)


# --- población ------------------------------------------------------------------------

func poblar() -> void:
	var lore := DatosJuego.cargar_json("res://datos/lore.json")
	var densidad := float(lore.poblacion_por_casilla_exterior.valor) * float(lore.poblacion_mult.normal) / 0.65
	var j := casilla_jugador()
	for y in grilla.alto:
		for x in grilla.ancho:
			var c := Vector3i(x, y, 0)
			if grilla.suelo(c) == &"" or grilla.mueble(c) != &"":
				continue
			if Vector2(x - j.x, y - j.y).length() < RADIO_SPAWN_LIBRE:
				continue
			var prob := densidad if not grilla.adentro(c) else densidad * 0.3
			if rng.randf() < prob:
				agregar_zombie(c)


func agregar_zombie(c: Vector3i) -> Dictionary:
	var z := {"id": _siguiente_id, "pos": Vector3(c.x + 0.5, c.z, c.y + 0.5), "casilla": c, "mente": MenteZombie.new(),
		"vida": Combate.vida_zombie(rng), "caido": false, "t_caido": 0.0, "cd_ataque": 0.0, "cd_golpe": 0.0,
		"mirando": Vector2(rng.randf_range(-1, 1), rng.randf_range(-1, 1)).normalized(), "orden": {"accion": &"esperar"},
		"muerto": false, "t_mente": rng.randf() * PASO_MENTE}
	_siguiente_id += 1
	zombies.append(z)
	return z


func zombies_vivos() -> Array[Dictionary]:
	var r: Array[Dictionary] = []
	for z in zombies:
		if not z.muerto:
			r.append(z)
	return r


# --- objetos --------------------------------------------------------------------------

func soltar_en(c: Vector3i, id: StringName) -> void:
	if not objetos_en_suelo.has(c):
		objetos_en_suelo[c] = []
	objetos_en_suelo[c].append(id)


func _agarrar(c: Vector3i, id: StringName) -> void:
	var lista: Array = objetos_en_suelo.get(c, [])
	var i := lista.find(id)
	if i < 0:
		return
	lista.remove_at(i)
	if lista.is_empty():
		objetos_en_suelo.erase(c)
	inventario.agregar(id)
	if Inventario.es_arma(id) and inventario.equipada == &"":
		_equipar(id)


func _equipar(id: StringName) -> void:
	var a: Dictionary = DatosJuego.cargar_json("res://datos/armas.json").get(String(id), {})
	inventario.equipar(id, bool(a.get("dos_manos", false)))
	if not a.is_empty() and not condicion_armas.has(id):
		condicion_armas[id] = int(a.condicion_max)


# --- tick -----------------------------------------------------------------------------

func tick(delta: float, entrada: Dictionary) -> void:
	eventos = []
	reloj.avanzar(delta)
	if cuerpo.muerto:
		_tick_muerto(delta)
		_tick_zombies(delta)
		return
	_accion_contextual(entrada.get("accion_contextual", {}))
	_mover_jugador(delta, entrada)
	_ataque_jugador(delta, entrada.get("atacar", false))
	_tick_zombies(delta)
	_tick_panico(delta)
	cuerpo.avanzar(delta * Reloj.ESCALA / 3600.0)
	if cuerpo.muerto:
		eventos.append({"tipo": &"muerte", "causa": cuerpo.causa_muerte})
		if cuerpo.infectado_knox or cuerpo.causa_muerte == &"infeccion":
			_reanimar_en = rng.randf_range(60.0, 120.0) / Reloj.ESCALA


func _tick_muerto(delta: float) -> void:
	if _reanimar_en < 0.0:
		return
	_reanimar_en -= delta
	if _reanimar_en <= 0.0:
		_reanimar_en = -1.0
		agregar_zombie(casilla_jugador())
		eventos.append({"tipo": &"reanimado"})


func _accion_contextual(a: Dictionary) -> void:
	if a.is_empty():
		return
	var c: Vector3i = a.get("casilla", Vector3i.ZERO)
	var lado: int = a.get("lado", 0)
	match a.get("tipo", &""):
		&"abrir":
			grilla.abrir(c, lado, true)
			eventos.append({"tipo": &"abertura", "casilla": c, "lado": lado})
		&"cerrar":
			grilla.abrir(c, lado, false)
			eventos.append({"tipo": &"abertura", "casilla": c, "lado": lado})
		&"romper":
			grilla.romper(c, lado)
			var r: Dictionary = DatosJuego.cargar_json("res://datos/ruidos.json").romper_ventana
			ruido.emitir(casilla_jugador(), r.radio, r.volumen)
			eventos.append({"tipo": &"abertura", "casilla": c, "lado": lado})
		&"trepar":
			_trepar(c, lado)
		&"agarrar":
			_agarrar(c, a.get("id", &""))
			eventos.append({"tipo": &"objetos"})
		&"soltar":
			if inventario.quitar(a.get("id", &"")):
				soltar_en(casilla_jugador(), a.get("id", &""))
				eventos.append({"tipo": &"objetos"})
		&"equipar":
			_equipar(a.get("id", &""))
		&"vendar":
			var id: StringName = a.get("id", &"venda")
			if inventario.quitar(id):
				var tipo := String(DatosJuego.cargar_json("res://datos/objetos.json").get(String(id), {}).get("tipo", "venda_limpia"))
				cuerpo.vendar(a.get("parte", &""), tipo == "venda_limpia")


func _trepar(c: Vector3i, lado: int) -> void:
	var otra := c - (Vector3i(0, 1, 0) if lado == Grilla.NORTE else Vector3i(1, 0, 0))
	var j := casilla_jugador()
	var destino := otra if j == c else c
	if grilla.puede_pasar(j, destino, false, true):
		jugador_pos = Vector3(destino.x + 0.5, destino.z, destino.y + 0.5)


func _mover_jugador(delta: float, entrada: Dictionary) -> void:
	var dir: Vector2 = entrada.get("mover", Vector2.ZERO)
	var carga := inventario.nivel_carga(capacidad())
	postura = movimiento.postura_posible(entrada.get("postura", Movimiento.Postura.CAMINAR), carga)
	if tumbado > 0.0:
		tumbado -= delta
		dir = Vector2.ZERO
	moviendose = dir.length() > 0.05
	movimiento.avanzar(delta, postura, moviendose, rasgos)
	if not moviendose:
		return
	dir = dir.limit_length(1.0)
	jugador_mirando = dir.normalized()
	var v := movimiento.velocidad(postura, carga, rasgos) * dir.length()
	var paso := dir.normalized() * v * delta
	var antes := casilla_jugador()
	for intento in [paso, Vector2(paso.x, 0), Vector2(0, paso.y)]:
		var nueva := Vector3(jugador_pos.x + intento.x, jugador_pos.y, jugador_pos.z + intento.y)
		var c := Vector3i(floori(nueva.x), floori(nueva.z), int(nueva.y))
		if c == antes or grilla.puede_pasar(antes, c, false, false):
			jugador_pos = nueva
			break
		if _escalera(antes, c):
			break
	_t_pasos -= delta
	if _t_pasos <= 0.0:
		_t_pasos = CADA_PASO_RUIDO
		var r := movimiento.ruido_paso(postura, rasgos)
		ruido.emitir(casilla_jugador(), r, r)


# Sube o baja si el jugador empuja contra el final de una escalera.
func _escalera(desde: Vector3i, hacia: Vector3i) -> bool:
	if grilla.es_escalera(desde):
		var dest := grilla.destino_escalera(desde)
		if Vector2i(hacia.x, hacia.y) == Vector2i(dest.x, dest.y):
			jugador_pos = Vector3(dest.x + 0.5, dest.z, dest.y + 0.5)
			return true
	if _bajadas.has(desde):
		var abajo: Vector3i = _bajadas[desde]
		if Vector2i(hacia.x, hacia.y) == Vector2i(abajo.x, abajo.y):
			jugador_pos = Vector3(abajo.x + 0.5, abajo.z, abajo.y + 0.5)
			return true
	return false


func _ataque_jugador(delta: float, atacar: bool) -> void:
	_cd_ataque -= delta
	if not atacar or _cd_ataque > 0.0 or tumbado > 0.0:
		return
	var id := inventario.equipada
	var armas := DatosJuego.cargar_json("res://datos/armas.json")
	var arma: Dictionary = armas.get(String(id), armas["_mano"])
	_cd_ataque = 1.0 / maxf(float(arma.velocidad), 0.1)
	movimiento.gastar_golpe(float(arma.peso) if id != &"" else 0.5, float(arma.endurance_mod), rasgos)
	var lore_c: Dictionary = DatosJuego.cargar_json("res://datos/lore.json").combate
	var alcance := maxf(float(arma.alcance_max), float(lore_c.alcance_empujon))
	var blanco := _zombie_al_frente(alcance)
	eventos.append({"tipo": &"swing", "blanco": blanco.get("id", -1)})
	if blanco.is_empty():
		return
	var dist := Vector2(blanco.pos.x - jugador_pos.x, blanco.pos.z - jugador_pos.z).length()
	if blanco.caido:
		_dañar(blanco, Combate.pisoton(fuerza, rng) * float(lore_c.multiplicador_caido) / 5.0)
		return
	if id == &"" or dist < float(arma.alcance_min):
		if Combate.empujon_tira(fuerza, rng):
			_tirar(blanco)
		return
	var nivel := int(habilidades.get(_habilidad_de(String(arma.categoria)), 0))
	var g := Combate.golpe(arma, dist, nivel, fuerza, bool(arma.dos_manos) and not inventario.dos_manos,
		Moodles.calcular(cuerpo, movimiento, inventario, panico, capacidad())[&"panico"], rng)
	_dañar(blanco, g["daño"])
	if Combate.pierde_condicion(arma, int(habilidades.get("mantenimiento", 0)), nivel, rng):
		condicion_armas[id] = int(condicion_armas.get(id, arma.condicion_max)) - 1
		if condicion_armas[id] <= 0:
			inventario.quitar(id)
			condicion_armas.erase(id)
			eventos.append({"tipo": &"arma_rota", "id": id})


func _habilidad_de(categoria: String) -> String:
	return {"axe": "hacha", "long_blunt": "contundente_larga", "short_blunt": "contundente_corta",
		"long_blade": "filo_largo", "short_blade": "filo_corto", "spear": "lanza"}.get(categoria, "")


func _zombie_al_frente(alcance: float) -> Dictionary:
	var mejor := {}
	var mejor_d := INF
	for z in zombies:
		if z.muerto or int(z.pos.y) != int(jugador_pos.y):
			continue
		var d := Vector2(z.pos.x - jugador_pos.x, z.pos.z - jugador_pos.z)
		if d.length() > alcance or d.length() >= mejor_d:
			continue
		if d.length() > 0.3 and absf(rad_to_deg(jugador_mirando.angle_to(d))) > 60.0:
			continue
		mejor = z
		mejor_d = d.length()
	return mejor


func _dañar(z: Dictionary, daño: float) -> void:
	z.vida -= daño
	eventos.append({"tipo": &"golpe", "id": z.id, "daño": daño})
	if z.vida <= 0.0:
		z.muerto = true
		z.mente.estado = MenteZombie.MUERTO
		zombies_matados += 1
		eventos.append({"tipo": &"zombie_muerto", "id": z.id})


func _tirar(z: Dictionary) -> void:
	z.caido = true
	z.t_caido = TIEMPO_CAIDO
	z.mente.estado = MenteZombie.CAIDO


func _tick_panico(delta: float) -> void:
	var j := casilla_jugador()
	var nuevos := 0
	var visibles := 0
	for z in zombies:
		if z.muerto:
			continue
		if Vision.ve(grilla, j, jugador_mirando, z.casilla, 20.0, 144.0):
			visibles += 1
			if not _vistos.has(z.id):
				_vistos[z.id] = true
				nuevos += 1
	if visibles > 0:
		panico = Moodles.panico_siguiente(panico, nuevos, delta * Reloj.ESCALA / 60.0, rasgos, true)
	else:
		panico = maxf(panico - RECUPERA_PANICO * delta, 0.0)


func _tick_zombies(delta: float) -> void:
	var lore := DatosJuego.cargar_json("res://datos/lore.json")
	var vel := float(lore.velocidad_mps.shambler)
	var vista := float(lore.vista_casillas.get(lore.vista, 20))
	if rasgos.has(&"discreto"):
		vista *= 0.5
	if rasgos.has(&"llamativo"):
		vista *= 2.0
	if postura == Movimiento.Postura.AGACHADO:
		vista *= 0.5
	var ruidos := ruido.tomar()
	var j := casilla_jugador()
	for z in zombies:
		if z.muerto:
			continue
		if z.caido:
			z.t_caido -= delta
			if z.t_caido <= 0.0:
				z.caido = false
				z.mente.estado = MenteZombie.DEAMBULAR
			continue
		z.cd_ataque -= delta
		z.cd_golpe -= delta
		z.t_mente -= delta
		if z.t_mente <= 0.0:
			z.t_mente = PASO_MENTE
			var ve := not cuerpo.muerto and Vision.ve(grilla, z.casilla, z.mirando, j, vista, 180.0)
			z.orden = z.mente.pensar({"grilla": grilla, "caminos": caminos, "pos": z.casilla, "mirando": z.mirando,
				"jugador_pos": j, "jugador_visible_desde_aqui": ve, "ruidos": ruidos}, rng)
		_ejecutar_orden(z, delta, vel)


func _ejecutar_orden(z: Dictionary, delta: float, vel: float) -> void:
	var o: Dictionary = z.orden
	match o.accion:
		&"mover":
			var dest: Vector3i = o.destino
			var meta := Vector3(dest.x + 0.5, dest.z, dest.y + 0.5)
			var d := Vector2(meta.x - z.pos.x, meta.z - z.pos.z)
			if d.length() > 0.01:
				z.mirando = d.normalized()
			var paso := minf(vel * delta, d.length())
			var nueva := Vector3(z.pos.x + z.mirando.x * paso, meta.y, z.pos.z + z.mirando.y * paso)
			var c := Vector3i(floori(nueva.x), floori(nueva.z), int(nueva.y))
			if c != z.casilla:
				if grilla.puede_pasar(z.casilla, c, false, true) or c.z != z.casilla.z:
					var borde := grilla.entre(z.casilla, c)
					z.casilla = c
					z.pos = nueva
					if borde == Grilla.B_CERCO_BAJO or borde == Grilla.B_VENTANA:
						_tirar(z)
						if borde == Grilla.B_CERCO_BAJO and _cerca_del_jugador(z, 3.9) and Combate.lunge_tira_jugador(forma_fisica, rng):
							tumbado = TIEMPO_TUMBADO
							eventos.append({"tipo": &"tumbado"})
			else:
				z.pos = nueva
		&"golpear":
			if z.cd_golpe <= 0.0:
				z.cd_golpe = GOLPE_OBSTACULO_CD
				var est := grilla.estado_abertura(o.casilla, o.lado)
				if not est.is_empty() and not est.rota:
					est.vida -= float(DAÑO_OBSTACULO.get(grilla.borde(o.casilla, o.lado), 0.01))
					var r: Dictionary = DatosJuego.cargar_json("res://datos/ruidos.json").zombie_golpea_puerta
					ruido.emitir(z.casilla, r.radio, r.volumen)
					eventos.append({"tipo": &"golpe_obstaculo", "casilla": o.casilla, "lado": o.lado})
					if est.vida <= 0.0:
						grilla.romper(o.casilla, o.lado)
						eventos.append({"tipo": &"abertura", "casilla": o.casilla, "lado": o.lado})
		&"atacar":
			if z.cd_ataque <= 0.0 and not cuerpo.muerto:
				z.cd_ataque = ATAQUE_ZOMBIE_CD
				var tipo := Combate.ataque_zombie(_atacantes_alrededor(), {}, rng)
				eventos.append({"tipo": &"ataque_zombie", "id": z.id, "resultado": tipo})
				if tipo != &"nada":
					var parte: StringName = Cuerpo.PARTES[rng.randi() % Cuerpo.PARTES.size()]
					cuerpo.herir(parte, tipo, rng)
					eventos.append({"tipo": &"herida", "parte": parte, "herida": tipo})


func _cerca_del_jugador(z: Dictionary, dist: float) -> bool:
	return Vector2(z.pos.x - jugador_pos.x, z.pos.z - jugador_pos.z).length() <= dist


func _atacantes_alrededor() -> int:
	var n := 0
	for z in zombies:
		if not z.muerto and not z.caido and _cerca_del_jugador(z, 1.6):
			n += 1
	return n


# --- menú contextual (mantener apretado) ----------------------------------------------

func opciones_contextuales(c: Vector3i) -> Array[Dictionary]:
	var r: Array[Dictionary] = []
	var j := casilla_jugador()
	if c.z != j.z or maxi(absi(c.x - j.x), absi(c.y - j.y)) > 1:
		return r
	var bordes := [[c, Grilla.NORTE], [c, Grilla.OESTE], [c + Vector3i(0, 1, 0), Grilla.NORTE], [c + Vector3i(1, 0, 0), Grilla.OESTE]]
	for b in bordes:
		var casilla: Vector3i = b[0]
		var lado: int = b[1]
		var tipo := grilla.borde(casilla, lado)
		var est := grilla.estado_abertura(casilla, lado)
		var acc := func(t: StringName) -> Dictionary: return {"tipo": t, "casilla": casilla, "lado": lado}
		match tipo:
			Grilla.B_PUERTA:
				if not est.rota:
					r.append({"texto": "Cerrar puerta" if est.abierta else "Abrir puerta", "accion": acc.call(&"cerrar" if est.abierta else &"abrir")})
			Grilla.B_VENTANA:
				if not est.rota:
					r.append({"texto": "Cerrar ventana" if est.abierta else "Abrir ventana", "accion": acc.call(&"cerrar" if est.abierta else &"abrir")})
					r.append({"texto": "Romper ventana", "accion": acc.call(&"romper")})
				if est.abierta or est.rota:
					r.append({"texto": "Trepar por la ventana", "accion": acc.call(&"trepar")})
			Grilla.B_CERCO_BAJO:
				r.append({"texto": "Saltar el cerco", "accion": acc.call(&"trepar")})
	var nombres := DatosJuego.cargar_json("res://datos/armas.json")
	var objs := DatosJuego.cargar_json("res://datos/objetos.json")
	for id in objetos_en_suelo.get(c, []):
		var nombre: String = nombres.get(String(id), objs.get(String(id), {})).get("nombre", String(id))
		r.append({"texto": "Agarrar " + nombre, "accion": {"tipo": &"agarrar", "casilla": c, "id": id}})
	if c == j:
		for h in cuerpo.heridas:
			if not h.vendada:
				for v in [&"venda", &"trapo", &"venda_sucia"]:
					if inventario.items.has(v):
						r.append({"texto": "Vendar %s (%s)" % [String(h.parte).replace("_", " "), objs[String(v)].nombre],
							"accion": {"tipo": &"vendar", "parte": h.parte, "id": v}})
						break
	return r
