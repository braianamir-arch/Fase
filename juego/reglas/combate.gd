class_name Combate
extends RefCounted
# Fórmulas de cuerpo a cuerpo de PZ (B41, guía de Steam que cita las clases Java; ver zombies_combate.md).

const PANICO_CRIT := [0.0, 0.013, 0.026, 0.039, 0.052]
const PANICO_DAÑO := [0.0, 0.0, 0.2, 0.3, 0.4]
const CON_BONUS := ["axe", "long_blunt", "spear"]

static var _lore: Dictionary = {}


static func _l() -> Dictionary:
	if _lore.is_empty():
		_lore = DatosJuego.cargar_json("res://datos/lore.json")
	return _lore


static func bonus_habilidad(categoria: String, nivel: int) -> float:
	if not categoria in CON_BONUS:
		return 1.0
	if nivel >= 7:
		return 1.2
	if nivel >= 3:
		return 1.1
	return 1.0


static func prob_critico(arma: Dictionary, nivel: int, panico_nivel: int) -> float:
	var p: float = float(arma.crit) + 0.03 * nivel - PANICO_CRIT[clampi(panico_nivel, 0, 4)]
	return clampf(p, 0.1, 0.9)


# Fuerza 0–10 escala el daño del 75 % al 125 %.
static func golpe(arma: Dictionary, distancia: float, nivel_habilidad: int, fuerza: int, una_mano_con_arma_de_dos: bool,
		panico_nivel: int, rng: RandomNumberGenerator) -> Dictionary:
	if distancia < float(arma.alcance_min):
		return {"tipo": &"empujon", "daño": 0.0, "critico": false}
	var d := rng.randf_range(float(arma["daño_min"]), float(arma["daño_max"]))
	d *= 0.75 + 0.05 * clampi(fuerza, 0, 10)
	d *= bonus_habilidad(arma.categoria, nivel_habilidad)
	if una_mano_con_arma_de_dos:
		d *= 0.5
	d = maxf(d - PANICO_DAÑO[clampi(panico_nivel, 0, 4)], 0.1)
	var critico := rng.randf() < prob_critico(arma, nivel_habilidad, panico_nivel)
	if critico:
		d *= float(arma.crit_mult)
	return {"tipo": &"golpe", "daño": d, "critico": critico}


static func mod_mantenimiento(mantenimiento: int, nivel_arma: int) -> int:
	return int(floor((mantenimiento + floor(nivel_arma / 2.0)) / 2.0))


static func pierde_condicion(arma: Dictionary, mantenimiento: int, nivel_arma: int, rng: RandomNumberGenerator) -> bool:
	var tope := int(arma.condicion_baja_uno_en) + mod_mantenimiento(mantenimiento, nivel_arma) * 2
	return rng.randi_range(0, tope) == 0


# Pisotón: rand(0,7–1,0) + 0,2 × Fuerza (código B42; descalzo o con otro calzado cambia, etapa 2).
static func pisoton(fuerza: int, rng: RandomNumberGenerator) -> float:
	var c: Dictionary = _l().combate
	var r: Array = c["pisoton_daño"]
	return rng.randf_range(r[0], r[1]) + float(c.pisoton_por_fuerza) * fuerza


# Empujón: 35 % + 2 % por nivel de Fuerza de tirar al zombie.
static func empujon_tira(fuerza: int, rng: RandomNumberGenerator) -> bool:
	var c: Dictionary = _l().combate
	return rng.randf() < float(c.empujon_tira_base) + float(c.empujon_tira_por_fuerza) * fuerza


# Zombie que salta un cerco bajo cerca del jugador: se abalanza 2/3 de las veces y tira al
# jugador el 30 % − 2 % por nivel de Forma física.
static func lunge_tira_jugador(forma_fisica: int, rng: RandomNumberGenerator) -> bool:
	var c: Dictionary = _l().combate
	if not bool(_l().fence_lunge) or rng.randf() >= float(c.lunge_prob):
		return false
	return rng.randf() < float(c.lunge_tira_jugador) - float(c.lunge_tira_por_forma) * forma_fisica


static func vida_zombie(rng: RandomNumberGenerator) -> float:
	var v: Dictionary = _l().vida
	var base := 0.0
	if _l().dureza == "random":
		base = rng.randf_range(v.random[0], v.random[1])
	else:
		base = float(v.get(_l().dureza, v.normal))
	return base + rng.randf_range(0.0, float(v.extra_azar))


# Resultado de que un zombie te alcance. Más atacantes alrededor = más mordidas.
# defensa_ropa: {tipo: 0..1} de la parte golpeada.
static func ataque_zombie(atacantes_alrededor: int, defensa_ropa: Dictionary, rng: RandomNumberGenerator) -> StringName:
	var a: Dictionary = _l().ataque
	var extra := maxi(atacantes_alrededor - 1, 0)
	if rng.randf() < maxf(float(a.prob_nada) + float(a.nada_por_atacante) * extra, 0.0):
		return &"nada"
	var mordida := minf(float(a.mordida_base) + float(a.mordida_por_atacante) * extra, float(a.mordida_max))
	var laceracion := minf(float(a.laceracion) + float(a.laceracion_por_atacante) * extra, 1.0 - mordida)
	var x := rng.randf()
	var tipo := &"arañazo"
	if x < mordida:
		tipo = &"mordida"
	elif x < mordida + laceracion:
		tipo = &"laceracion"
	if rng.randf() < float(defensa_ropa.get(String(tipo), 0.0)):
		return &"nada"
	return tipo
