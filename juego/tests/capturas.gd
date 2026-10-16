extends SceneTree
# Escenas de prueba que se guardan como PNG en juego/capturas/ (no van al repo).
# Uso: xvfb-run -a godot --rendering-driver opengl3 --path juego -s res://tests/capturas.gd -- afuera

var _frames := 0
var _nombre := ""


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	_nombre = args[0] if args.size() > 0 else "afuera"
	if _nombre in ["inicio", "creacion", "muerte"]:
		process_frame.connect(_pantallas, CONNECT_ONE_SHOT)
		process_frame.connect(_cuadro)
		return
	if _nombre in ["pelea", "hud", "inventario", "salud"]:
		process_frame.connect(_pelea, CONNECT_ONE_SHOT)
		process_frame.connect(_cuadro)
		return
	var raiz := Node3D.new()
	root.add_child(raiz)
	var mundo := Mundo3D.new()
	raiz.add_child(mundo)
	var g := Mapa.cargar("res://datos/mapas/muldraugh.txt")
	mundo.cargar(g)
	var inicio: Vector3i = Mapa.puntos_inicio(FileAccess.get_file_as_string("res://datos/mapas/muldraugh.txt"))[0]
	var foco := Vector3(inicio.x + 0.5, 0, inicio.y + 0.5)
	var sol := DirectionalLight3D.new()
	sol.rotation_degrees = Vector3(-55, 30, 0)
	sol.shadow_enabled = true
	raiz.add_child(sol)
	var amb := WorldEnvironment.new()
	amb.environment = Environment.new()
	amb.environment.background_mode = Environment.BG_COLOR
	amb.environment.background_color = Color(0.1, 0.1, 0.1)
	amb.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	amb.environment.ambient_light_color = Color(0.55, 0.55, 0.6)
	raiz.add_child(amb)
	var cam := Camara.new()
	raiz.add_child(cam)
	cam.enfocar(foco, true)
	match _nombre:
		"afuera":
			cam.size = 30
		"adentro", "escalera":
			var v := Vision.pisos_visibles(0, _nombre == "escalera", true)
			mundo.mostrar(v.max_piso, v.techos)
			mundo.recortar(Vision.paredes_a_recortar(g, inicio))
	process_frame.connect(_cuadro)


func _cuadro() -> void:
	_frames += 1
	if _frames == (40 if _nombre in ["pelea", "hud", "inventario", "salud", "inicio", "creacion", "muerte"] else 5):
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://capturas"))
		var img := root.get_viewport().get_texture().get_image()
		img.save_png("res://capturas/%s.png" % _nombre)
		print("captura ", _nombre)
		quit()


# Escena de juego real (main.gd) con unos zombies cerca del jugador.
func _pelea() -> void:
	var main: Node3D = load("res://escenas/main.gd").new()
	var p := Partida.nueva("res://datos/mapas/muldraugh.txt", &"bombero", [], 2)
	var j := p.casilla_jugador()
	p.jugador_pos = Vector3(j.x + 0.5, j.z, j.y + 0.5)
	for d in [Vector3i(2, 0, 0), Vector3i(0, 2, 0), Vector3i(2, 2, 0)]:
		if p.grilla.suelo(j + d) != &"":
			p.agregar_zombie(j + d)
	p.inventario.agregar(&"bate")
	p._equipar(&"bate")
	main.partida = p
	root.add_child(main)
	main.iniciar(p)
	p.cuerpo.herir(&"antebrazo_izq", &"laceracion", p.rng)
	p.panico = 40.0
	if _nombre == "inventario":
		main._mostrar_ventana(main.ventana_inv, true)
	elif _nombre == "salud":
		main._mostrar_ventana(main.ventana_salud, true)


func _pantallas() -> void:
	var main: Node3D = load("res://escenas/main.gd").new()
	root.add_child(main)
	match _nombre:
		"creacion":
			main.mostrar_creacion()
		"muerte":
			var p := Partida.nueva("res://datos/mapas/muldraugh.txt", &"bombero", [], 2)
			main.iniciar(p)
			p.reloj.avanzar(5400.0 * 2 + 225.0 * 5)
			p.zombies_matados = 14
			p.cuerpo.salud = 0.0
			p.cuerpo.muerto = true
			main._t_muerto = 5.0
