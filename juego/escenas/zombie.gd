class_name ZombieNodo
extends Persona
# Un zombie: piel gris verdosa, ropa gastada de colores al azar.

const ROPAS := [Color(0.45, 0.30, 0.25), Color(0.30, 0.35, 0.30), Color(0.55, 0.52, 0.45), Color(0.25, 0.28, 0.40),
	Color(0.50, 0.20, 0.20), Color(0.35, 0.30, 0.45)]

var id := 0
var _antes := Vector3.ZERO


func preparar(p_id: int) -> void:
	id = p_id
	es_zombie = true
	var r := RandomNumberGenerator.new()
	r.seed = p_id
	piel = Color(0.55, 0.62, 0.50).lerp(Color(0.6, 0.55, 0.5), r.randf())
	remera = ROPAS[r.randi() % ROPAS.size()].darkened(r.randf() * 0.3)
	pantalon = ROPAS[r.randi() % ROPAS.size()].darkened(0.3 + r.randf() * 0.3)
	armar()


func sincronizar(z: Dictionary, delta: float) -> void:
	var meta := Vector3(z.pos.x, z.pos.y * ArmadoChunk.ALTO_PISO, z.pos.z)
	var vel := (meta - _antes).length() / maxf(delta, 0.001)
	_antes = meta
	position = meta
	rotation.y = atan2(z.mirando.x, z.mirando.y)
	caido = z.caido or z.muerto
	animar(delta, vel / 0.9)
