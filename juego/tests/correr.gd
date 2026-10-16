extends SceneTree
# Runner de pruebas: carga res://tests/test_*.gd y corre cada método test_*.
# Uso: godot --headless --path juego -s res://tests/correr.gd [-- filtro]

class Prueba:
	var arbol: SceneTree   # para las pruebas que necesitan nodos en el árbol
	var fallas: int = 0
	var actual: String = ""

	func _falla(msg: String) -> void:
		fallas += 1
		print("FALLA ", actual, ": ", msg)

	func igual(a: Variant, b: Variant, msg: String = "") -> void:
		if typeof(a) != typeof(b) and not (typeof(a) in [TYPE_INT, TYPE_FLOAT] and typeof(b) in [TYPE_INT, TYPE_FLOAT]):
			_falla("%s != %s %s" % [var_to_str(a), var_to_str(b), msg])
		elif a != b:
			_falla("%s != %s %s" % [var_to_str(a), var_to_str(b), msg])

	func cerca(a: float, b: float, tol: float, msg: String = "") -> void:
		if absf(a - b) > tol:
			_falla("%f no está cerca de %f (±%f) %s" % [a, b, tol, msg])

	func verdad(c: bool, msg: String = "") -> void:
		if not c:
			_falla("se esperaba verdadero " + msg)


func _init() -> void:
	var filtro := ""
	var args := OS.get_cmdline_user_args()
	if args.size() > 0:
		filtro = args[0]
	var t := Prueba.new()
	t.arbol = self
	var corridas := 0
	var dir := DirAccess.open("res://tests")
	var archivos := Array(dir.get_files())
	archivos.sort()
	for f: String in archivos:
		if not (f.begins_with("test_") and f.ends_with(".gd")):
			continue
		if filtro != "" and not f.contains(filtro):
			continue
		var script: GDScript = load("res://tests/" + f)
		if script == null or not script.can_instantiate():
			t.actual = f
			t._falla("no se pudo cargar")
			continue
		for m in script.get_script_method_list():
			var nombre: String = m.name
			if not nombre.begins_with("test_"):
				continue
			var obj: Object = script.new()
			obj.set("t", t)
			t.actual = f + "::" + nombre
			obj.call(nombre)
			corridas += 1
	if t.fallas == 0:
		print("OK ", corridas)
	else:
		print("FALLAS ", t.fallas, " de ", corridas)
	quit(1 if t.fallas > 0 else 0)
