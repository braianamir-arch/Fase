extends RefCounted
var t

const RUTA := "user://prueba_guardado.json"

func _partida() -> Partida:
	var p := Partida.nueva("res://tests/mapas/prueba.txt", &"bombero", [&"valiente"], 9)
	p.agregar_zombie(Vector3i(0, 0, 0))
	p.zombies[0].vida = 0.7
	p.jugador_pos = Vector3(3.2, 0, 2.7)
	p.reloj.avanzar(1000.0)
	p.cuerpo.herir(&"mano_izq", &"mordida", p.rng)
	p.cuerpo.vendar(&"mano_izq", true)
	p.inventario.agregar(&"bate")
	p._equipar(&"bate")
	p.grilla.abrir(Vector3i(2, 4, 0), Grilla.NORTE, true)
	p.grilla.romper(Vector3i(1, 2, 0), Grilla.OESTE)
	p.zombies_matados = 3
	return p

func test_ida_y_vuelta() -> void:
	var p := _partida()
	var r := Guardado.desde_texto(Guardado.a_texto(p))
	t.verdad(r.ok, r.get("error", ""))
	var q: Partida = r.partida
	t.cerca(q.jugador_pos.x, 3.2, 1e-4)
	t.cerca(q.reloj.segundos_juego, p.reloj.segundos_juego, 1e-3)
	t.cerca(q.cuerpo.salud, p.cuerpo.salud, 1e-4)
	t.verdad(q.cuerpo.infectado_knox)
	t.igual(q.cuerpo.heridas.size(), 1)
	t.verdad(q.cuerpo.heridas[0].vendada)
	t.verdad(q.inventario.items.has(&"bate"))
	t.igual(q.inventario.equipada, &"bate")
	t.verdad(q.grilla.estado_abertura(Vector3i(2, 4, 0), Grilla.NORTE).abierta)
	t.verdad(q.grilla.estado_abertura(Vector3i(1, 2, 0), Grilla.OESTE).rota)
	t.igual(q.zombies.size(), p.zombies.size())
	t.cerca(q.zombies[0].vida, 0.7, 1e-4)
	t.igual(q.zombies_matados, 3)
	t.igual(q.profesion, &"bombero")
	t.verdad(q.rasgos.has(&"valiente"))
	t.igual(q.objetos_en_suelo.size(), p.objetos_en_suelo.size())

func test_guardar_y_cargar_archivo() -> void:
	var p := _partida()
	Guardado.guardar(p, RUTA)
	var r := Guardado.cargar(RUTA)
	t.verdad(r.ok, r.get("error", ""))
	t.verdad(not FileAccess.file_exists(RUTA + ".tmp"))
	DirAccess.remove_absolute(ProjectSettings.globalize_path(RUTA))

func test_archivo_cortado_no_se_carga_y_no_se_borra() -> void:
	var texto := Guardado.a_texto(_partida())
	var f := FileAccess.open(RUTA, FileAccess.WRITE)
	f.store_string(texto.substr(0, texto.length() / 2))
	f.close()
	var r := Guardado.cargar(RUTA)
	t.verdad(not r.ok)
	t.verdad(FileAccess.file_exists(RUTA), "el archivo sigue ahí")
	DirAccess.remove_absolute(ProjectSettings.globalize_path(RUTA))

func test_otra_version() -> void:
	var texto := Guardado.a_texto(_partida()).replace('"version": %d' % Guardado.VERSION, '"version": 999')
	var r := Guardado.desde_texto(texto)
	t.verdad(not r.ok)
	t.verdad(String(r.error).contains("otra versión"), r.error)

func test_pausar_guarda_y_pausa() -> void:
	var main: Node3D = load("res://escenas/main.gd").new()
	main.ruta_guardado = RUTA
	main.partida = _partida()
	t.arbol.root.add_child(main)
	main.al_pausar()
	t.verdad(FileAccess.file_exists(RUTA))
	t.verdad(main.pausado, "la partida queda en pausa")
	main.queue_free()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(RUTA))

func test_al_volver_sigue_en_pausa_hasta_tocar() -> void:
	var main: Node3D = load("res://escenas/main.gd").new()
	main.ruta_guardado = RUTA
	main.partida = _partida()
	t.arbol.root.add_child(main)
	main.al_pausar()
	main._notification(Node.NOTIFICATION_APPLICATION_RESUMED)
	main._notification(Node.NOTIFICATION_APPLICATION_FOCUS_IN)
	t.verdad(main.pausado, "sigue en pausa al volver")
	main.reanudar()
	t.verdad(not main.pausado)
	main.queue_free()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(RUTA))
