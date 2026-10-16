class_name Persona
extends Node3D
# Cuerpo de bloques (jugador y zombies usan el mismo): torso, cabeza, brazos y piernas que se
# mueven al caminar. Los zombies llevan los brazos hacia adelante y caminan más torpe.

var piel := Color(0.85, 0.68, 0.55)
var remera := Color(0.25, 0.35, 0.55)
var pantalon := Color(0.20, 0.22, 0.28)
var es_zombie := false

var _piernas: Array[Node3D] = []
var _brazos: Array[Node3D] = []
var _t := 0.0
var _swing := 0.0
var caido := false


func armar() -> void:
	for h in get_children():
		h.queue_free()
	_piernas.clear()
	_brazos.clear()
	_caja(Vector3(0.42, 0.55, 0.24), Vector3(0, 1.12, 0), remera, self)            # torso
	_caja(Vector3(0.24, 0.26, 0.24), Vector3(0, 1.55, 0), piel, self)              # cabeza
	_caja(Vector3(0.44, 0.16, 0.26), Vector3(0, 0.80, 0), pantalon, self)          # cadera
	for s in [-1, 1]:
		var pierna := Node3D.new()
		pierna.position = Vector3(0.11 * s, 0.80, 0)
		add_child(pierna)
		_caja(Vector3(0.17, 0.78, 0.2), Vector3(0, -0.39, 0), pantalon, pierna)
		_piernas.append(pierna)
		var brazo := Node3D.new()
		brazo.position = Vector3(0.28 * s, 1.36, 0)
		add_child(brazo)
		_caja(Vector3(0.13, 0.6, 0.14), Vector3(0, -0.3, 0), remera.darkened(0.1), brazo)
		_caja(Vector3(0.12, 0.12, 0.12), Vector3(0, -0.64, 0), piel, brazo)
		_brazos.append(brazo)


func _caja(tam: Vector3, pos: Vector3, color: Color, padre: Node3D) -> void:
	var mi := MeshInstance3D.new()
	var m := BoxMesh.new()
	m.size = tam
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = 0.9
	m.material = mat
	mi.mesh = m
	mi.position = pos
	padre.add_child(mi)


func golpear() -> void:
	_swing = 0.35


func animar(delta: float, velocidad: float) -> void:
	_t += delta * (6.0 if es_zombie else 9.0) * clampf(velocidad, 0.0, 2.0)
	var amp := 0.5 * clampf(velocidad, 0.0, 1.0)
	for i in _piernas.size():
		_piernas[i].rotation.x = sin(_t + PI * i) * amp
	for i in _brazos.size():
		if es_zombie:
			_brazos[i].rotation.x = -1.4 + sin(_t * 0.5 + i) * 0.1
		else:
			_brazos[i].rotation.x = -sin(_t + PI * i) * amp * 0.8
	if _swing > 0.0:
		_swing -= delta
		_brazos[1].rotation.x = -2.2 + (0.35 - _swing) * 6.0
	rotation.x = -PI / 2 if caido else 0.0
