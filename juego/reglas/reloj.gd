class_name Reloj
extends RefCounted
# Hora del juego. Escala por defecto de PZ B42 (Apocalypse, DayLength 4): 90 minutos reales = 1 día
# (1 s real = 16 s de juego).
# segundos_juego cuenta desde el 9 de julio de 1993 a las 00:00.

const ESCALA := 16.0
const DIA := 86400.0
const MESES := ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const DIAS_MES := [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

var segundos_juego: float = 9.0 * 3600.0


func avanzar(delta_real: float) -> void:
	segundos_juego += delta_real * ESCALA


func horas_desde(seg: float) -> float:
	return (segundos_juego - seg) / 3600.0


func dias_y_horas_sobrevividos(inicio: float) -> Vector2i:
	var horas := int(floor(horas_desde(inicio)))
	return Vector2i(horas / 24, horas % 24)


func hora_del_dia() -> float:
	return fmod(segundos_juego, DIA) / 3600.0


func texto() -> String:
	var dia := 9 + int(floor(segundos_juego / DIA))
	var mes := 6
	var anio := 1993
	while dia > DIAS_MES[mes]:
		dia -= DIAS_MES[mes]
		mes += 1
		if mes == 12:
			mes = 0
			anio += 1
	var resto := int(fmod(segundos_juego, DIA))
	return "%d %s %d %02d:%02d" % [dia, MESES[mes], anio, resto / 3600, (resto % 3600) / 60]
