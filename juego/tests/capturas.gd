extends SceneTree
# Escenas de prueba que se guardan como PNG en juego/capturas/ (no van al repo).
# Uso: xvfb-run -a godot --rendering-driver opengl3 --path juego -s res://tests/capturas.gd -- afuera

var _frames := 0
var _nombre := ""


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	_nombre = args[0] if args.size() > 0 else "afuera"
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
	var cam := Camera3D.new()
	raiz.add_child(cam)
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = 30
	cam.rotation_degrees = Vector3(-30, 45, 0)
	cam.position = foco + cam.transform.basis.z * 40
	process_frame.connect(_cuadro)


func _cuadro() -> void:
	_frames += 1
	if _frames == 5:
		DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://capturas"))
		var img := root.get_viewport().get_texture().get_image()
		img.save_png("res://capturas/%s.png" % _nombre)
		print("captura ", _nombre)
		quit()
