# Project Zomboid: personaje y sistemas de supervivencia (Build 41 vs Build 42)

> Nota de método: la fuente principal es la PZwiki oficial (pzwiki.net, "official site of The Indie Stone"). El sitio bloquea el acceso directo (Cloudflare), así que las páginas se leyeron a través de copias de Wayback Machine de 2026 (versiones de las páginas B42: 42.12–42.20) y de noviembre de 2024 (versiones B41.78.16, antes de B42). Las URLs citadas son las canónicas de pzwiki; las de B41 apuntan al snapshot archivado. Muchas páginas de la wiki B42 dicen expresamente "needs verification" / "may be outdated", así que hay que tomar los números como aproximados. B42 sigue siendo inestable (unstable): las cifras cambian entre parches.

## 1. ¿Cuáles son todos los moodles, qué los dispara y qué hacen? (incluye necesidades: hambre, sed, fatiga, resistencia, aburrimiento, infelicidad, estrés, pánico, temperatura, humedad, alcohol, tabaco, nutrición/peso)

### Takeaway
PZ representa el estado del personaje con unos 22 moodles activos. Casi todos tienen 4 niveles, ligados a umbrales de una variable de 0–100 % (p. ej. hambre >15/25/45/70 %), y cada nivel aplica penalizaciones concretas: capacidad de carga, daño cuerpo a cuerpo, velocidad, cono de visión, curación, velocidad de acciones. Las variables se encadenan entre sí: aburrimiento→infelicidad, estrés→infelicidad, incomodidad (discomfort)→infelicidad, cansancio↔resistencia, mojado→frío→resfriado, enfermedad→fiebre→calor. B42 renombró niveles, quitó el bonus de carga del hambre positiva, añadió los moodles Discomfort y Noxious Smell (vapores tóxicos) y dejó iconos sin usar para moodles futuros (Concentrating, Dizzy, Exhausted, Happy, Scared, HearingImpaired, Sedated, VisionImpaired, Wired).

### Cited Findings

**Lista general (B42)**
- Moodles activos en B42: Hungry, Thirsty, Panic, Bored, Stressed, Unhappy, Drunk, Heavy load, Endurance, Tired, Hyperthermia, Hypothermia, Windchill, Wet, Injured, Pain, Bleeding, Restricted movement, Has a cold, Sick, Noxious smell, Discomfort, Dead, Zombie. Están eliminados, son futuros o no se pueden obtener: Angry (es para NPCs; sin efecto), Hungover, Fear, Morale, Sanity (valores visibles en debug, sin efecto). Hay iconos B42 "currently unavailable": Concentrating, Dizzy, Exhausted, Happy, Scared, HearingImpaired, Sedated, VisionImpaired, Wired. — [PZwiki: Moodle](https://pzwiki.net/wiki/Moodles)
- Los moodles se muestran arriba a la derecha y el tooltip da más información. Algunos tienen fondo "positivo" verde (p. ej. hambre saciada) y la mayoría fondo "negativo" rojo, con 4 intensidades. — [PZwiki: Moodle](https://pzwiki.net/wiki/Moodles)

**Hambre (Hungry)**
- Tasa base: 0.00032 % por tick, unos 4.32 % por hora de juego en Apocalypse. Light Eater ×0.75 y Hearty Appetite ×1.5. Mientras está activo un moodle positivo de hambre, el hambre no sube. — [PZwiki: Hungry](https://pzwiki.net/wiki/Hungry)
- Niveles negativos (B42):
  - Peckish >15 %: regeneración de salud −25 %.
  - Hungry >25 %: carga −1, menos generación de calor, regeneración −25 %.
  - Very Hungry >45 %: carga −2, regeneración −55 %.
  - Starving to Death >70 %: carga −2, regeneración −100 %, pierde un 4.4 % de salud por hora hasta morir o comer.
  
  El hambre también amplía el radio de forrajeo de comida hasta un +50 %. — [PZwiki: Hungry](https://pzwiki.net/wiki/Hungry)
- Niveles positivos (Satiated, Well Fed, Stuffed, Full to Bursting): curación "750 % más rápida" y el veneno baja un 15/30/45/60 % más rápido. En Stuffed y Full to Bursting no se puede comer más. — [PZwiki: Hungry](https://pzwiki.net/wiki/Hungry)
- Cambio B41→B42: en B41 cualquier moodle positivo de hambre daba +2 de capacidad de carga. En B42 ya no. Además, en B41 los textos y efectos de los niveles negativos eran: Hungry con curación −35 %, Very Hungry con −60 %. Dormir con hambre positiva podía provocar pesadillas. — [PZwiki: Hungry](https://pzwiki.net/wiki/Hungry); [snapshot B41 de la página de moodles](https://pzwiki.net/wiki/Fatigue)
- El hambre y la nutrición (calorías) son sistemas totalmente separados: un personaje emaciado puede estar "Full to Bursting" y uno con sobrepeso puede morir de hambre. — [PZwiki: Moodle](https://pzwiki.net/wiki/Moodles)

**Sed (Thirsty)**
- Tasa base: 0.000213 %/tick, unos 2.875 %/hora. Multiplicadores según acción: quieto o caminando ×1.0, corriendo o esprintando ×1.2, durmiendo ×0.125. También influyen la temperatura de piel y núcleo y el aislamiento. La sed alimenta el sistema de "body fluids": con menos fluidos se suda menos, lo que sube la temperatura y la sed (bucle potencialmente fatal). Low Thirst ×0.5 y High Thirst ×2. — [PZwiki: Thirsty](https://pzwiki.net/wiki/Thirsty)
- Niveles:
  - Slightly Thirsty >13 %: disipación de calor −10 %.
  - Thirsty >25 %: carga −1, disipación −20 %, regeneración −35 %.
  - Parched >70 %: carga −2, disipación −60 %, regeneración −60 %.
  - Dying of Thirst >85 %: carga −2, disipación −70 %, regeneración −100 %, pierde un 22 % de salud por hora.
  
  Con sed ≥10 % el personaje bebe automáticamente de contenedores con ≥120 mL de agua. El agua contaminada (tainted) enferma si no se hierve. — [PZwiki: Thirsty](https://pzwiki.net/wiki/Thirsty)

**Pánico (Panic)**
- Ganancia de pánico:
  - ≈3 % por zombi visto y ≈0.5 % por minuto de juego mientras haya zombis visibles. Sube más rápido con zombis detectados por la espalda.
  - Solo cuentan los zombis visibles en pantalla: hacer zoom reduce la ganancia.
  
  Recuperación:
  - La velocidad de recuperación crece cada día sobrevivido hasta el día 150: el día 1 baja ≈1.75 %/s (≈56 s de 100 a 0) y al máximo ≈50 %/s.
  - Los beta blockers y el alcohol aceleran mucho la bajada (−0.6 pánico/tick). Dormir también acelera la recuperación, pero puede haber pesadillas.
  
  Traits:
  - Brave reduce un 70 % el pánico por zombis y Cowardly lo duplica. Desensitized nunca gana pánico por zombis.
  - Agoraphobic y Claustrophobic ganan pánico según los tiles visibles.
  - Adrenaline Junkie gana +10 %/+25 % de velocidad con pánico fuerte/extremo. — [PZwiki: Panic](https://pzwiki.net/wiki/Panic)
- Niveles B42: Nervous, Alarmed, Frightened, Terrified. Todos impiden dormir, eliminan el aburrimiento y lo congelan.
  - Crítico cuerpo a cuerpo: −1.3 / −2.6 / −3.9 / −5.2 %.
  - Daño cuerpo a cuerpo: 0 / −0.2 / −0.3 / −0.4.
  - Probabilidad de desatascar un arma de fuego: −3 / −6 / −9 / −12 %.
  - Penalización de precisión a distancia: nivel × (4 + distancia_en_tiles × 0.5). A 10 tiles: −9 / −18 / −27 / −36.
  - Terrified además estrecha el cono de visión (−36 de radio) y lo oscurece (−0.2 de luz).
  
  El daño del arma nunca baja de 0.1. — [PZwiki: Panic](https://pzwiki.net/wiki/Panic)
- En B41 los niveles se llamaban Slight Panic, Panic, Strong Panic y Extreme Panic. Daño melee −0.1/−0.2/−0.3 y armas de fuego −0.4/−0.6 (penalización eliminada con Aiming 6). — [snapshot B41 moodles](https://pzwiki.net/wiki/Fatigue)

**Aburrimiento (Bored)**
- Sube ≈0.0010/tick (≈0.05 %/s) por inactividad, por estar en interiores, leer libros de habilidad o comer comida mala o rancia.
- Baja con: literatura, TV, CDs y radio, pánico (lo borra), ir en un vehículo en marcha, estar al aire libre, hablar en MP, tener supervivientes cerca, estar borracho, craftear o construir.
- Niveles: Getting Bored >25 % (sin efecto), Bored >50 % (infelicidad +0.048 %/s), Very Bored >75 % (+0.072 %/s), Extremely Bored >90 % (+0.096 %/s). — [PZwiki: Bored](https://pzwiki.net/wiki/Bored)

**Estrés (Stressed)**
- Fuentes: posible infección (Knox), zombis golpeando puertas, ventanas o vallas, sangre con Fear of Blood, pesadillas, incomodidad de la ropa o dormir sin cama, y falta de nicotina en Smoker.
- El estrés por nicotina se registra por separado y solo se quita fumando. Su tope es 51 %, así que el estrés total puede llegar al 150 %.
- Se reduce con: matar zombis, fumar, leer, lavarse, acariciar animales (B42), ciertos alimentos, recoger flores. — [PZwiki: Stressed](https://pzwiki.net/wiki/Stress)
- Niveles B42: Tense >25 %, Agitated >50 %, Stressed Out >75 %, At Breaking Point >90 %.
  - Infelicidad: +0 / 0.024 / 0.036 / 0.048 %/s.
  - Daño melee: 0 / −0.2 / −0.3 / −0.4.
  - Mismas penalizaciones a distancia y de atascos que el pánico.
  - Con estrés y pánico a la vez, la reducción se duplica.
  
  En B41: Anxious, Agitated, Stressed, Nervous Wreck, con daño −0.1/−0.2/−0.3. — [PZwiki: Stressed](https://pzwiki.net/wiki/Stress); [snapshot B41](https://pzwiki.net/wiki/Fatigue)

**Infelicidad (Unhappy)**
- Hace más lentas todas las acciones temporizadas. Niveles B42: Sad >20 % (≈+7.4 %), Weepy >45 % (≈+13.7 %), Miserable >60 % (≈+19.6 %), Hopeless >80 % (≈+26.5 %). Se reduce con literatura, dulces, sopas, alcohol, antidepresivos y acariciar animales. En B41 los niveles eran Feeling a little sad, Getting a tad weepy, Depressed y Severely Depressed. — [PZwiki: Unhappy](https://pzwiki.net/wiki/Unhappiness); [snapshot B41](https://pzwiki.net/wiki/Fatigue)
- Antidepressants: reducen la infelicidad durante un periodo largo, pero tardan 2 horas en hacer efecto. Repetir la dosis no acumula, solo reinicia el temporizador. — [PZwiki: Antidepressants](https://pzwiki.net/wiki/Antidepressants)

**Incomodidad (Discomfort, nuevo en B42)**
- Escala de 0 a 100 que alimenta la infelicidad: UnhappinessPerTick = (BaseUnhappinessRate/2) × (Discomfort/100) × TimeFactor × GameSpeed.
- Niveles: 20–40, 40–60, 60–80 (el personaje emite quejidos) y >80.
- Wet, Hypothermia e Hyperthermia suman +10 % de incomodidad por nivel.
- Valores de incomodidad de prendas: Hockey Mask 5 %, cascos de bateo 10 %, Hard Hat y casco de bombero 15 %, Dust Mask y casco militar 20 %, chalecos antibalas y cascos de moto 25–35 %, Hazmat 50 %, Gas Mask 60 %, NBC mask 75 %. — [PZwiki: Discomfort](https://pzwiki.net/wiki/Discomfort)

**Borrachera (Drunk)**
- Visión doble y pantalla que se tambalea. Más fatiga y sueño menos eficaz: eficacia × (1 − ebriedad × 0.005), es decir hasta −50 % al 100 % de ebriedad.
- Las pastillas para dormir causan sobredosis con la mitad de dosis.
- Menos calor corporal, controles de vehículo con retraso, más probabilidad de caerse al saltar o trepar, peor búsqueda (forrajeo) y peor visión.
- Baja 0.252 %/s, más rápido descansando o durmiendo. — [PZwiki: Drunk](https://pzwiki.net/wiki/Drunk)
- Niveles:
  - Tipsy >10 %: −50 % de efecto de beta blockers, antidepresivos, analgésicos y cafeína. Al 20 % el aburrimiento baja al 200 %.
  - Inebriated >30 %: oculta la hipotermia hasta 36.5 °C. Penalización a distancia de nivel 2.
  - Plastered >50 %: penalización de nivel 3.
  - Utterly Shit-faced >70 %: oculta la hipotermia hasta 35 °C. Penalización de nivel 4.
  
  En B41 existían Light Drinker (×4 ebriedad) y Hardened Drinker (×0.3), ya eliminados. — [PZwiki: Drunk](https://pzwiki.net/wiki/Drunk); [PZwiki: Traits](https://pzwiki.net/wiki/Traits)

**Carga (Heavy load)**
- Fairly Heavy >100 % de capacidad:
  - −19 % de velocidad, −7 % de velocidad de ataque, −5 % de crítico.
  - +13 % de tropiezo al saltar vallas bajas, −8 % para trepar vallas altas, −2 % de bloqueo.
- Heavy >125 %: −37 % de velocidad, sin sprint, −14 % de ataque, −10 % de crítico, +26 % de tropiezo, −4 % de bloqueo.
- Very Heavy >150 %:
  - −56 % de velocidad, sin carrera, −21 % de ataque, −15 % de crítico, −6 % de bloqueo.
  - La resistencia no se recupera y baja al moverse.
  - Daño continuo hasta el 75 % de salud (la "back injury"), que también se aplica como tensión muscular.
- Extremely Heavy >175 %: −75 % de velocidad al caminar, −28 % de ataque, −20 % de crítico, −8 % de bloqueo.

Sentarse detiene el daño. — [PZwiki: Heavy load](https://pzwiki.net/wiki/Heavy_load); [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Capacidad de carga base según Strength 0–10: 6, 7, 8, 9, 11, 12, 14, 15, 16, 18, 20 (12 en el nivel 5 por defecto). Weak la deja en 9. Los moodles restan "puntos" a esta capacidad. — [PZwiki: Strength](https://pzwiki.net/wiki/Strength); [PZwiki: Traits](https://pzwiki.net/wiki/Traits)

**Resistencia (Endurance / exertion)**
- Niveles según la resistencia gastada:
  - Out of Breath (B42; "Moderate Exertion" en B41), ≥25 %: −50 % de daño melee, −7 % de velocidad de ataque, −19 % de velocidad, +10 % de tropiezo, −2 % de bloqueo.
  - High Exertion ≥50 %: −80 % de daño, −14 % de ataque, −37 % de velocidad, sin sprint.
  - Excessive Exertion ≥75 %: −90 % de daño, −21 % de ataque, −56 % de velocidad, sin correr y sin ejercicio.
  - Exhausted ≥90 %: −95 % de daño, −28 % de ataque, −75 % de velocidad, no puede usar el mazo (sledgehammer).
- La recuperación es más rápida sentado, en un vehículo, descansando en muebles, con ginseng o con Fitness alta. Caminar o agacharse la anula casi del todo.
- El cansancio ralentiza o detiene la recuperación. A su vez, el esfuerzo acelera el cansancio hasta ≈70 %. — [PZwiki: Endurance](https://pzwiki.net/wiki/Endurance)
- Multiplicadores por Fitness 0–10:
  - Pérdida de resistencia: 90 %, 80, 75, 70, 65, 60, 57, 53, 49, 46, 43 %.
  - Recuperación: 70 % a 160 %.
  - Ganancia de fatiga: 100 % a 75 %.
  - Velocidad de ataque y reducción de tropiezo: +0 a +20 %.
  - Bloqueo: +0 a +20 %.

  Cifras de B41.78.16 que la wiki marca como "por verificar en B42". — [PZwiki: Fitness](https://pzwiki.net/wiki/Fitness)

**Cansancio y sueño (Tired / fatigue)**
- Solo se puede dormir con fatiga ≥60 %, cuando aparece el primer nivel.
- Sin resistencia, la fatiga sube ≈3 veces más rápido. Sentado o descansando sube un 33 % menos.
- Wakeful: −30 % de fatiga y +10 % de eficacia de sueño. Sleepyhead: +30 % y −10 %.
- No se puede desmayar por falta de sueño. — [PZwiki: Tired](https://pzwiki.net/wiki/Tired)
- Niveles:
  - Drowsy >60 %: −50 % de daño melee, penalización plana a distancia de 2.5, cono de visión más estrecho, resistencia muy reducida, menos forrajeo, peor empuje.
  - Tired >70 %: −80 % de daño, −5 a distancia.
  - Very Tired >80 %: −90 % de daño, −7.5 a distancia.
  - Ridiculously Tired >90 %: −95 % de daño, −10 a distancia, la resistencia no se regenera. Permite dormir con dolor y en el suelo. — [PZwiki: Tired](https://pzwiki.net/wiki/Tired)
- Sueño:
  - Duración típica ≈9 h (≈6 h con Wakeful, ≈12 h con Sleepyhead). Mínimo 3 h, máximo 16 h.
  - Una cama mala o el suelo reducen la recuperación y pueden dejar el cuello dolorido. Una almohada mejora la cama.
  - Probabilidad base de pesadilla del 5 %, que sube con el estrés. La pesadilla añade estrés.
  - Opción sandbox de "sleeping event": los zombis pueden despertar al jugador con pánico. Es más probable con puertas o ventanas abiertas, luces encendidas, nevera encendida o aparatos en marcha.
  - Dormir quita el pánico y anula los beta blockers y las pastillas para dormir. — [PZwiki: Sleep](https://pzwiki.net/wiki/Sleep)
- En B42 las "Vitamins" pasaron a llamarse Caffeine Pills (reducen fatiga). — [PZwiki: Caffeine Pills](https://pzwiki.net/wiki/Vitamins)

**Temperatura corporal (Hyperthermia / Hypothermia / Windchill)**
- Hyperthermia (temperatura del núcleo):
  - Unpleasantly Hot >37.5 °C: más sed y cansancio.
  - Overheated >39 °C: −33 % de velocidad de combate y de carrera, +20 % de incomodidad.
  - Sunstruck >40 °C: −66 %, +30 % de incomodidad, interrumpe el sueño.
  - Hyperthermic >41 °C: −90 % de combate, sin carrera, menos visión, +100 % de gasto de resistencia, +40 % de incomodidad. Pierde salud (hasta un 30 %) si el aire supera 37 °C.

  La infección y la enfermedad suben la temperatura. El sudor la controla y la sed limita el sudor. — [PZwiki: Hyperthermia](https://pzwiki.net/wiki/Hyperthermia)
- Hypothermia:
  - Chilly <36.5 °C: +10 % de incomodidad, no hay curación natural, más riesgo de resfriado.
  - Cold <35 °C: −33 % de combate y carrera.
  - Freezing <30 °C: −66 %.
  - Hypothermic <25 °C: −90 % de combate, sin carrera. Pierde salud (hasta el 1 %) si el aire está bajo 0 °C.

  El hambre, el cansancio y la baja forma reducen la resistencia al frío. — [PZwiki: Hypothermia](https://pzwiki.net/wiki/Hypothermia)
- Windchill: aparece con una diferencia de sensación térmica de >5, >10, >15 o >20 °C. Solo informa, pero el cuerpo se enfría más rápido. Desaparece al entrar en un edificio. — [PZwiki: Windchill](https://pzwiki.net/wiki/Windchill)

**Humedad (Wet)**
- Niveles por humedad corporal total:
  - Moist 15 %: no hay curación natural.
  - Wet 40 %.
  - Soaking 70 %: más riesgo de enfermar.
  - Drenched 90 %: hasta +75 % de pérdida de calor.

  Cada nivel suma +10 % de incomodidad.
- Fuentes: lluvia y sudor. Se quita con refugio, fuego o toalla. Un paraguas en la mano impide pasar de "Wet".
- La ropa mojada aísla menos: el riesgo de resfriado es ×2 con el cuerpo al 100 % de humedad y ×4 si además la ropa está al 100 %. — [PZwiki: Wet](https://pzwiki.net/wiki/Wet)

**Resfriado (Has a cold)**
- Se contrae por frío o humedad prolongados. Niveles al 20/40/60/80 % de fuerza del resfriado: estornudos y tos cada vez más frecuentes, que atraen zombis (los pañuelos los amortiguan).
- No se cura mientras siga el frío, el hambre, la sed, la humedad o el cansancio. El common mallow lo reduce.
- Resilient: −55 % de probabilidad de contagio, −20 % de fuerza, −50 % de progresión. Prone to Illness: +70 %, +20 % y +50 %. Outdoorsy: 10 % de probabilidad por frío o humedad. — [PZwiki: Has a cold](https://pzwiki.net/wiki/Has_a_cold)

**Enfermedad (Sick) y olor nocivo (Noxious smell)**
- Sick:
  - Queasy >25 %.
  - Nauseous >50 %: carga −1.
  - Sick >75 %: carga −2.
  - Fever >90 %: carga −3, hipertermia.

  Cada nivel sube la generación de calor. Si es zombificación o veneno, la salud cae progresivamente. Si es comida en mal estado o cadáveres, la curación es más lenta y solo en Fever baja la salud.
- Las enfermedades no zombi se revierten con comida, descanso o lemongrass. Los cigarrillos enferman a quien no es Smoker. — [PZwiki: Sick](https://pzwiki.net/wiki/Sick)
- Enfermedad por cadáveres: más de 20 cuerpos juntos con moscas. Para evitarla hay que estar a ≥13 tiles en exterior, en otro edificio o en otra planta.
- Noxious smell:
  - Bad Smell: ganancia de enfermedad >0 y <0.001/tick.
  - Awful Odor: 0.001–0.002/tick.
  - Overwhelming Stench: >0.002/tick.
  - Deadly Fumes: generador encendido en interior. La salud baja al 65 %, luego llega cansancio extremo y la salud baja al 5 %, pero no mata directamente.

  Las máscaras con tag gas mask o SCBA lo evitan. — [PZwiki: Noxious smell](https://pzwiki.net/wiki/Noxious_smell)
- Duración de la intoxicación alimentaria (ticks): normal 200–280, Weak Stomach 120–230, Iron Gut 80–150 (la tabla de la wiki es así; resulta extraña para Weak Stomach). — [PZwiki: Health](https://pzwiki.net/wiki/Health)

**Heridas y dolor (Injured / Pain / Bleeding / Restricted movement)**
- Injured: A Little Hurt <80 % de salud, Injured <60 % (carga −1), Severe <40 % (carga −2), Critical <25 % (carga −3). La salud se recupera más rápido entre ≈10 y 80 %. — [PZwiki: Injured](https://pzwiki.net/wiki/Injured)
- Pain:
  - Multiplicador por zona: manos y pies 0.5×, brazos 0.6–0.7×, torso 0.78–0.8×, piernas 0.7×.
  - Tropiezo al saltar: +5 / +10 / +15 / +20 %. Desde el nivel 2 penaliza movimiento, daño y velocidad de ataque según la zona y no deja dormir.
  - Agony impide hacer ejercicio. Desde el nivel 3 el personaje emite ruido.
  - Fuentes además de las heridas: cama mala, intoxicación alimentaria, rigidez por ejercicio.
  - Los analgésicos duran ≈1 h y tardan ≈50 min en quitar 100 de dolor; el efecto no se acumula. — [PZwiki: Pain](https://pzwiki.net/wiki/Pain); [PZwiki: Painkillers](https://pzwiki.net/wiki/Painkillers)
- Bleeding:
  - Por número de heridas sangrantes: 1, 2, 3, o 4+ (o cuello).
  - El pánico sube 0.2× / 0.4× / 0.6× / 0.8× por parte sangrante. Desde el nivel 2, carga −1.
  - Estar bien alimentado contiene el primer nivel. Fear of Blood duplica el pánico.
  - Las heridas en el cuello drenan salud muy rápido aunque no muestren niveles altos. — [PZwiki: Bleeding](https://pzwiki.net/wiki/Bleeding)
- Restricted movement ("CantSprint"): no se puede esprintar por ir descalzo, heridas en las piernas, sobrecarga o ropa pesada. — [PZwiki: Restricted movement](https://pzwiki.net/wiki/Restricted_movement)

**Tabaco (Smoker)**
- Smoker (+3 en B42, +4 en B41):
  - El estrés sube según el tiempo sin fumar, con pico hacia las 13 h y un tope de 51. Si ese estrés supera 50, también sube la infelicidad.
  - Tos aleatoria cada 12–35 h. Fumar no le provoca enfermedad.
  - Es incompatible con Athletic.
- Efecto de cada producto (estrés / infelicidad, tos smoker / no smoker):
  - Cigarette: −10 / −10, tos 10 % / 50 %.
  - Cigarillo: −15 / −15.
  - Cigar: −40 / −40, tos 20 % / 66.7 %.
  - Pipe: −15 / −15.
  - Chewing Tobacco: −10 / −10. — [PZwiki: Smoker](https://pzwiki.net/wiki/Smoker)

**Nutrición y peso**
- Cada comida tiene Calories, Carbohydrates, Proteins y Fats. Solo afectan al peso, y las proteínas al "Protein Boost" del ejercicio.
- Rangos acumulados: calorías −2200 a 3700, carbohidratos/proteínas/grasas −500 a 1000. — [PZwiki: Nutrition](https://pzwiki.net/wiki/Nutrition)
- Ganancia de peso:
  - Se gana peso si las calorías superan el umbral base + (peso − 80) × 40. El umbral base es 700 con Slow Metabolism y peso <90, 1800 con Fast Metabolism y peso >70, y 1000 en los demás casos.
  - ΔPeso = factor × (calorías/4000) × segundos. El factor es 0.000013 si carbohidratos/grasas ≤400, 0.000026 si están entre 400 y 700, y 0.000039 si superan 700.
  - Ejemplo: 3000 kcal y 500 de carbohidratos mantenidos un día dan +1.68 kg. — [PZwiki: Nutrition](https://pzwiki.net/wiki/Nutrition)
- Pérdida de peso: si las calorías quedan por debajo de (peso − 70) × 30, ΔPeso = 0.0000085 × (calorías/2500, con tope 1) × segundos. Dormir es lo que menos calorías gasta; esprintar, saltar y talar gastan más. — [PZwiki: Nutrition](https://pzwiki.net/wiki/Nutrition)
- Proteínas: entre 50 y 300 dan ×1.5 de XP de Strength; por debajo de −300, ×0.7. Es un dato de B34.5 que la wiki no ha actualizado. — [PZwiki: Nutrition](https://pzwiki.net/wiki/Nutrition)
- Rasgos de peso (peso por defecto 80):
  - Emaciated ≤50 kg.
  - Very Low Weight 50.1–65.
  - Low Weight 65.1–75.
  - Normal 75.1–84.9.
  - High Weight 85–99.9.
  - Very High Weight ≥100.
  - A 35 kg se entra en "degeneración": la salud baja rápido. El tope superior es 130 kg.
  - Con cualquier rasgo de peso no se gana XP de Fitness por encima del nivel 6. Con Emaciated o Very High/Very Low Weight no se gana XP de Fitness en absoluto. — [PZwiki: Nutrition](https://pzwiki.net/wiki/Nutrition); [PZwiki: Traits](https://pzwiki.net/wiki/Traits)
- Efectos de los rasgos de peso:
  - Emaciated: 40 % de daño melee, 30 % de regeneración de resistencia, recibe daño a 35 kg.
  - Very Low Weight: 60 % de daño melee.
  - Low Weight: 80 % de daño melee.
  - High Weight: Fitness máxima 9, ×2 de pérdida de resistencia, 70 % de regeneración.
  - Very High Weight: Fitness máxima 7, 40 % de regeneración.
  - Todos tienen más probabilidad de tropezar y menos de trepar vallas altas. — [PZwiki: Traits](https://pzwiki.net/wiki/Traits)
- B41 vs B42: en B41 se podían elegir en la creación Obese (+10, 105 kg), Overweight (+6, 90–95 kg), Underweight (+6, 70 kg) y Very Underweight (+10, 60 kg). En B42 se sustituyen por Slow Metabolism (+2, empieza con High Weight y tiende a engordar) y Fast Metabolism (+2, empieza con Low Weight y tiende a adelgazar). — [B41 Traits (archivo)](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Traits); [PZwiki: Traits](https://pzwiki.net/wiki/Traits)

**Muerte**
- Con 0 de salud el personaje muere de forma permanente. Aparece el moodle "Dead" ("Deceased – High chance of becoming rat food"), o el moodle "Zombie" si estaba infectado. Si estaba infectado, se reanima en 1–2 minutos con los ajustes por defecto, sea cual sea la causa de muerte. — [PZwiki: Moodle](https://pzwiki.net/wiki/Moodles); [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)
- "This is how you died" es el lema que el juego muestra al inicio de cada partida (el juego no tiene final). En vanilla no se conserva nada tras la muerte. Mods como Skill Recovery Journal permiten recuperar parte de la XP. — [Gamer Empire](https://gamerempire.net/project-zomboid-can-you-die-of-old-age/); [PZFans](https://pzfans.com/project_zomboid_how_to_keep_your_skills_after_death)

### Inferences
- El diseño de PZ se basa en estados continuos de 0–100 con 4 umbrales de moodle, con penalizaciones aditivas que se combinan: carga −1/−2/−3 por hambre, sed, enfermedad y heridas, y multiplicadores de daño por resistencia y cansancio. Así las crisis se acumulan: herido + hambriento + cansado lleva a un colapso en espiral.
- Muchos moodles no tienen efecto directo (Bored, Windchill, Discomfort). Funcionan como avisos tempranos de una variable que sí hace daño (Unhappy, Hypothermia). Es un buen patrón de UX para un juego parecido.
- B42 añade más fuentes de incomodidad (Discomfort, cascos y máscaras) y quita "regalos" de B41 (carga +2 por estar saciado): va hacia más realismo y fricción.

### Gaps
- No encontré la pantalla de muerte exacta (qué estadísticas muestra: días sobrevividos, zombis matados) en fuentes fiables. Hace falta verificarla en el juego.
- La tasa exacta de fatiga por hora en B42 aparece como "PLACEHOLDER" en la wiki.
- Faltan los valores precisos de calor y aislamiento del modelo de termorregulación (fórmula por parte del cuerpo). La wiki no lo detalla.
- Los iconos de moodles B42 sin usar (Concentrating, Dizzy, Wired, etc.) no tienen mecánica documentada; pueden llegar en versiones futuras.

## 2. ¿Cómo funcionan exactamente las heridas, la infección y el tratamiento (probabilidades, tiempos)? (incluye ropa y protección)

### Takeaway
El cuerpo tiene 17 partes. Cada una puede tener heridas tipadas (arañazo, laceración, mordisco, herida profunda, quemadura, fractura, cristal o bala alojados) que sangran, duelen y tienen una "severidad" en horas de curación. Hay dos infecciones distintas. La infección de herida (bacteriana) es leve y se trata con desinfección, vendas limpias o esterilizadas y antibióticos. La Knox Infection se transmite solo por ataques zombi (arañazo 7 %, laceración 25 %, mordisco 100 % por defecto), es invisible, incurable y mata en ≈3 días. La ropa reduce la probabilidad de que el golpe rompa la piel según la defensa por parte del cuerpo, y se agujerea con el uso.

### Cited Findings

**Partes del cuerpo y salud global**
- 17 partes: pies, espinillas (shins), muslos, manos, antebrazos y brazos (izquierdo y derecho), más ingle (groin), torso inferior, torso superior, cuello y cabeza.
- Estado global por salud:
  - OK: sin daño.
  - Slight: 90–100.
  - Very Minor: 80–90.
  - Minor: 70–80.
  - Moderate: 60–70.
  - Severe: 50–60.
  - Very Severe: 40–50.
  - Critical: 20–40.
  - Highly Critical: 10–20.
  - Terminal: 0–10.
  - Deceased: 0. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Las heridas ponen un tope a la salud máxima: por ejemplo, una fractura en el torso superior la deja en ≈60 %. Dormir acelera mucho la curación. Las heridas del cuello ignoran ese tope y pueden matar en minutos si no se vendan. — [PZwiki: Health](https://pzwiki.net/wiki/Health)

**Tipos de herida (síntomas, causa, tratamiento)**
- Scratched (arañazo): poca pérdida de salud, sangrado y dolor leve. Causas: zombi, romper ventanas, fallar saltos de vallas, recoger cristal, choques de vehículo, tropiezos. Se trata con una venda. Si es de zombi, 7 % de Knox. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Lacerated (laceración): pérdida moderada de salud, sangrado y dolor. Es la versión más grave del arañazo. Si es de zombi, 25 % de Knox. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Bitten (mordisco): pérdida moderada de salud, sangrado y dolor. Los zombis muerden mucho más por la espalda. Infección Knox del 100 % salvo que el sandbox la desactive. Si es sobrevivible, la recuperación es larga. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Deep Wound (herida profunda):
  - Causas: romper ventanas con la mano, pasar por ventanas rotas, cristal descalzo, caídas, extraer balas o cristales, choques a 40–50 mph, golpes de hacha.
  - Tratamiento: coser con Suture Needle, o con aguja e hilo (que duele más). Alternativa: mantenerla vendada ≈1 mes.
  - Vendada sin coser, la venda se ensucia en segundos. Coser y quitar los puntos dan XP de First Aid. — [PZwiki: Health](https://pzwiki.net/wiki/Health); [PZwiki: Suture needle](https://pzwiki.net/wiki/Suture_needle)
- Lodged Glass Shard / Lodged Bullet: pérdida severa de salud, sangrado y dolor. Se extraen con pinzas (el cristal también a mano), lo que deja una herida profunda: desinfectar, coser y vendar. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Burn (quemadura): pérdida severa de salud y dolor severo por estar cerca del fuego. Venda limpia que hay que cambiar regularmente. Curación larga, 50–100 h, sin efecto de Fast/Slow Healer. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Fracture (fractura):
  - Causas: caídas de más de un piso (más probable con carga), choques a ≥60 mph, golpes contundentes.
  - Penaliza velocidad (pierna), combate (brazo), resistencia (torso) o fatiga (cabeza), con dolor severo.
  - Tratamiento: Splint (sábana rasgada + madera recta: rama, palo o tablón). Cabeza y torso no se pueden entablillar.
  - Cura ≈10 veces más rápido con férula. La wiki dice además que cada nivel de First Aid de quien la aplica suma un factor 5 (es ambiguo); en otro sitio dice "First Aid ≥4: +250 %" y "bien alimentado: +30 %". La comfrey poultice se acumula con la férula.
  - La férula es lo único que detiene la pérdida de HP por fractura. — [PZwiki: Health](https://pzwiki.net/wiki/Health); [PZwiki: Splint](https://pzwiki.net/wiki/Splint)
- Exercise Fatigue (rigidez muscular): dolor, menos daño y velocidad de ataque si afecta a los brazos y más torpeza si afecta a las piernas. Aparece ≈12 h después del ejercicio. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Otras heridas:
  - Back injury: sobrecarga que drena la salud hasta el 75 %.
  - Fall damage: escala con la altura, la carga y el bajo peso.
  - Lesiones de piernas: cojera, sin correr. Vendar ayuda un poco.
  - Lesiones de brazos: daño muy reducido con melee y con armas de fuego. — [PZwiki: Health](https://pzwiki.net/wiki/Health)

**Tiempos de curación ("severity", horas de juego)**

| Herida | Normal | Slow Healer | Fast Healer |
|---|---|---|---|
| Arañazo | 7–15 | 15–25 | 4–10 |
| Arañazo de ventana | 12–20 | 20–30 | 5–10 |
| Arañazo de arma | 5–10 | 10–20 | 1–5 |
| Laceración | 10–20 | 20–30 | 5–10 |
| Mordisco | 50–80 | 80–150 | 30–50 |
| Herida profunda | 15–20 | 20–32 | 11–15 |
| Bala | 17–23 | 22–28 | 12–18 |
| Fractura (días) | hasta 60 | hasta 140 | hasta 40 |
| Quemadura | 50–100 | 50–100 | 50–100 |

— [PZwiki: Health](https://pzwiki.net/wiki/Health)

**Vendas, desinfección e infección de herida**
- Toda herida que rompe la piel sangra y hay que vendarla. Sirven: venda médica, venda adhesiva, sábana rasgada (rag), tira de denim o tira de cuero.
- La venda limpia reduce la probabilidad de infección. Desinfectar y poner una venda o trapo esterilizado la reduce todavía más y ayuda a curar una infección ya declarada.
- La venda se ensucia con el tiempo, según el tipo y la gravedad de la herida, el nivel de First Aid y si sangra. Una venda sucia aumenta la infección, así que hay que cambiarla. — [PZwiki: Health](https://pzwiki.net/wiki/Health); [PZwiki: Bandage](https://pzwiki.net/wiki/Bandage)
- No llevar venda detiene la curación. Una venda sucia es mejor que ninguna porque detiene el sangrado, aunque maximiza el riesgo de infección. Las vendas esterilizadas se ensucian igual de rápido pero mejoran la curación.
- Recetas:
  - Limpiar una venda o trapo con 500 mL de agua.
  - Esterilizar con 500 mL de agua (hervida) o con 100 mL de alcohol, vodka o whiskey. — [PZwiki: Bandage](https://pzwiki.net/wiki/Bandage)
- Infección de herida: muy poca pérdida de salud si no está vendada y algo más de dolor. Las heridas no zombi infectadas son 100 % sobrevivibles. Se trata con desinfectante o toallitas de alcohol, venda esterilizada, antibióticos o garlic poultice. — [PZwiki: Health](https://pzwiki.net/wiki/Health); [PZwiki: Antibiotics](https://pzwiki.net/wiki/Antibiotics)
- Ropa sucia o ensangrentada sobre una herida abierta aumenta la probabilidad de infección. La ropa se lava con agua y jabón. — [PZwiki: Soap](https://pzwiki.net/wiki/Soap)
- First Aid (skill): mejora la evaluación de heridas, la velocidad de las acciones médicas, la eficacia de cataplasmas y férulas, y la duración de las vendas. — [PZwiki: Skills](https://pzwiki.net/wiki/Skills)

**Knox Infection (zombificación)**
- Solo se contagia por ataque zombi: arañazo 7 %, laceración 25 %, mordisco 100 % (sandbox por defecto). Las heridas no zombi (cristal, caídas) nunca transmiten Knox. — [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)
- Es invisible para el jugador. Cronología de síntomas:
  - Inmediatamente: la temperatura sube rápido.
  - 1–4 h: ansiedad (estrés).
  - 5–12 h: Queasy, pérdida leve de salud.
  - 13–24 h: Nauseous, pérdida moderada.
  - 25–48 h: Sick, pérdida severa.
  - 49–71 h: Fever, daño terminal.
  - 72 h: muerte y zombificación.
- Resilient multiplica la velocidad de progresión por 0.75 y Prone to Illness por 1.25.
- Solo se ralentiza estando bien alimentado, hidratado y sin resfriado. No hay cura: la desinfección no sirve. — [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)
- Sandbox:
  - Transmission: Blood+Saliva (por defecto), Saliva Only (solo mordiscos), Everyone's Infected (todos se reaniman al morir) o None.
  - Infection Mortality: Instant, 0–30 s, 0–1 min, 0–12 h, 2–3 días (por defecto), 1–2 semanas o Never.
  - Reanimate Time: Instant, 0–30 s, 0–1 min (por defecto), 0–12 h, 2–3 días o 1–2 semanas.
  - En versiones antiguas (0.1.6a) había un 4 % de sobrevivir a un mordisco. El rasgo Hypochondriac (síntomas falsos) está desactivado desde 41.65. — [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)
- Hay fuentes de la comunidad con cifras distintas (p. ej. 50 % arañazo / 20 % laceración / 15 % mordisco como probabilidades de tipo de herida, no de infección). Parecen de builds antiguas o de otra métrica. — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/7048779852332288496); comparar con [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)

**Probabilidad de que un ataque zombi hiera**
- Al atacar un zombi, el jugador tiene primero una probabilidad de bloquear. Si el golpe conecta, se comprueba contra la "injury chance" del jugador.
- La tabla de skill de arma 0–10 da:
  - Bloqueo: +0 a +30 %.
  - Injury chance: −5, −2, 0, 1, 2, 3, 4, 5, 5, 6, 7 %.
  - Las armas no-hacha cuentan el nivel −1. — [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Thick Skinned multiplica por 1.3 la probabilidad de no ser herido (base 15 %, modificada por la skill de arma). Thin-skinned la multiplica por 0.7. — [PZwiki: Traits](https://pzwiki.net/wiki/Traits)
- Strength y Fitness dan +2 % de bloqueo por nivel (+0 a +20 %). La carga y el agotamiento restan un 2–8 % de bloqueo frontal según el nivel. — [PZwiki: Strength](https://pzwiki.net/wiki/Strength); [PZwiki: Heavy load](https://pzwiki.net/wiki/Heavy_load)

**Ropa: capas, protección, aislamiento, agujeros, suciedad y sangre**
- Hay más de 100 "body locations" (slots de ropa) mutuamente excluyentes. Algunos ejemplos: ropa interior superior e inferior, calcetines, zapatos, camisetas, camisas, suéteres, chaquetas, full tops, pantalones, monos, cabeza, ojos, máscara, cuello, guantes, cinturón, espalda, armadura, ropa interior larga… — [PZwiki: Clothing](https://pzwiki.net/wiki/Clothing)
- Stats por prenda:
  - Bite defense, Scratch defense y Bullet defense: % de reducción en las partes que cubre. No protege en una parte con agujero.
  - Neck protection.
  - Insulation (% de calor retenido), Wind resistance y Water resistance.
  - Fabric type, "Can get holes", condición máxima, "Condition lower chance" (probabilidad de dañarse o agujerearse al recibir un golpe en esa parte) y "Condition loss".
  - Stomp power, velocidad de ataque, movement speed (future), fall chance (gafas que se caen) y hotbar slots. — [PZwiki: Clothing](https://pzwiki.net/wiki/Clothing)
- La ropa mojada pierde calor más rápido y un aislamiento alto lo retiene. La resistencia al viento reduce el windchill. — [PZwiki: Clothing](https://pzwiki.net/wiki/Clothing)
- Mecánica práctica, según una fuente de la comunidad:
  - Las defensas de varias capas sobre la misma parte se suman. Conviene mirar el panel Health → Protection.
  - Un ataque bloqueado suele romper la tela de esa parte, y la defensa baja hasta que se cose o se cambia la prenda.
  - Las chaquetas de cuero, de bombero y militares dan protección parcial del cuello. Las bufandas dan 10 % contra arañazos y 0 contra mordiscos. — [PZFans](https://pzfans.com/zombie-proof_threads_dress_smart_or_die_stupid_in_project_zomboid/)
- Hay testimonios de foro (no verificados) que dicen dos cosas: que al 100 % de protección el ataque abre un agujero y deja la protección de esa parte en 0 sin herir, y que el agujero es una "tirada de moneda" separada de la protección. — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/595136999981060934)
- Tailoring (parches):
  - El aporte de un parche crece con el nivel. A Tailoring 10 (mordisco/arañazo/bala): rag 5 % solo arañazo, denim 5/10/5 %, cuero 10/20/10 %.
  - Probabilidad de recuperar el parche al quitarlo: del 10 % al 60 % (+5 % por nivel).
  - En el nivel 8, coser con la tela correcta repara el agujero del todo y restaura defensa, condición y aislamiento. Zapatos, chalecos y similares no se pueden reparar.
  - En B42 ya no se obtiene hilo al rasgar ropa. Se hace con "Pick thread" (aguja o pinzas + trapo) o con una rueca. — [PZwiki: Tailoring](https://pzwiki.net/wiki/Tailoring)

### Inferences
- El modelo de herida de PZ se puede resumir en una cadena:
  1. Golpe: probabilidad de bloqueo según skill, Strength y Fitness.
  2. Probabilidad de herir según skill y traits.
  3. Parte del cuerpo aleatoria.
  4. Tirada de defensa de la ropa en esa parte, con posible agujero.
  5. Tipo de herida.
  6. Tirada de Knox según el tipo.

  Cada paso es una palanca de diseño distinta: equipo, traits, skill.
- La separación entre infección bacteriana (castigo leve por descuido, tratable) y Knox (muerte segura y oculta) crea tensión narrativa: el jugador no sabe si está condenado durante horas. Es una característica clave a replicar.

### Gaps
- No encontré la fórmula oficial de probabilidad de agujero ni cómo se combinan exactamente varias capas (¿suma o tiradas independientes por capa?). Las fuentes comunitarias se contradicen.
- Faltan las probabilidades numéricas de infección bacteriana (con venda limpia, sucia o esterilizada) y su temporizador. La wiki no las da.
- No encontré cuánto suma la suciedad o la sangre a la probabilidad de infección, ni cómo se acumulan sobre la ropa.
- Tampoco las tasas exactas de pérdida de salud por herida y por segundo.

## 3. ¿Cómo dan forma los traits y las ocupaciones al juego, y qué cambió en Build 42?

### Takeaway
La creación de personaje usa puntos: se parte de 0, las ocupaciones dan o quitan puntos (Unemployed o Custom Occupation dan 8), los traits positivos cuestan y los negativos dan, y el total debe ser ≥0. Los traits y ocupaciones que dan niveles de skill además fijan permanentemente el multiplicador de XP de esa skill (25 % en nivel 0, 100 % en nivel 1, 133 % en nivel 2, 166 % en nivel 3+). B42 reequilibró muchos costes, renombró traits (Asthmatic→Short of Breath, Pacifist→Reluctant Fighter, Feeble→Weak, Weak→Puny, Outdoorsman→Outdoorsy, Cook→Keen Cook, Amateur Mechanic→Vehicle Knowledge, Axe Man→Ax-pert), eliminó los traits de peso elegibles y Lucky/Unlucky, y añadió traits y ocupaciones de crafteo (Blacksmith, Welder, Tailor, Rancher, DIY Expert…).

### Cited Findings

**Reglas generales**
- "Points to Spend" debe ser ≥0: los positivos que pasen de 8 puntos hay que compensarlos con negativos. Hay traits mutuamente excluyentes (p. ej. Deaf con Hard of Hearing o Keen Hearing). Algunos traits se ganan o pierden jugando. — [PZwiki: Traits](https://pzwiki.net/wiki/Traits)
- Boost de XP por nivel inicial: nivel 0 → 25 %, nivel 1 → 100 %, nivel 2 → 133 %, nivel ≥3 → 166 %.
  - En B42 (42.13.1) la interfaz muestra mal +75/+100/+125 %.
  - Strength y Fitness no reciben boost.
  - Running usa 100/125/133/166 %. — [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Strength y Fitness empiezan en 5. Los traits Weak/Puny/Stout/Strong y Out of Shape/Unfit/Fit/Athletic se ganan o pierden según el nivel: 0–1 Puny/Unfit, 2–4 Weak/Out of Shape, 5 ninguno, 6–8 Stout/Fit, 9–10 Strong/Athletic. Ganarlos jugando no da los niveles extra, solo el icono y efectos como el knockback. — [PZwiki: Strength](https://pzwiki.net/wiki/Strength); [PZwiki: Fitness](https://pzwiki.net/wiki/Fitness)

**Traits positivos B42, con coste y entre paréntesis el coste B41 si cambió**
- Adrenaline Junkie −4 (−8): +0.20/+0.25 de velocidad con pánico fuerte/extremo.
- Angler −4: +1 Fishing, recetas de caña y chum.
- Artisan −2 (nuevo): +1 Glassmaking, +1 Pottery.
- Athletic −10: +4 Fitness, +20 % de velocidad de carrera, −20 % de gasto de resistencia al correr.
- Baseball Player −4: +1 Long Blunt.
- Blacksmith Knowledge −6 (nuevo): +1 Maintenance, +2 Blacksmithing.
- Brave −4: pánico al 30 %.
- Brawler −6: +1 Axe, +1 Long Blunt.
- Cat's Eyes −3 (−2): +20 % de visión nocturna.
- Crafty −3 (nuevo): ×1.3 de XP de crafteo.
- Dextrous −2: tiempo de transferencia al 50 %.
- Eagle Eyed −4 (−6).
- Fast Healer −6.
- Fast Learner −6: ×1.3 de XP salvo Strength y Fitness.
- Fast Reader −2: lectura ×1.3.
- First Aider −2 (−4): +1 First Aid.
- Fit −6: +2 Fitness.
- Former Scout −6: +1 First Aid, +1 Fishing, +1 Foraging.
- Gardener −2 (−4): +1 Agriculture.
- Graceful −4: 60 % del radio de ruido de pasos.
- Gymnast −5: +1 Lightfooted, +1 Nimble.
- Handy −8: +1 Carpentry, +1 Carving, +1 Maintenance, +1 Masonry, +100 HP a las construcciones, ≈11 % más rápido.
- Herbalist −4 (−6).
- Hiker −5 (−6).
- Hunter −8: +1 Aiming, Butchering, Short Blade, Sneaking y Tracking.
- Inconspicuous −4: 50 % de probabilidad de ser visto.
- Inventive −2 (nuevo): −1 nivel requerido para autoaprender recetas.
- Iron Gut −2 (−3).
- Keen Cook −3 (Cook −6 en B41): +2 Cooking, +1 Butchering.
- Keen Hearing −6: radio de percepción ×2.
- Light Eater −2 (−4).
- Low Thirst −2 (−6).
- Mason −2 (nuevo): +2 Masonry.
- Nutritionist −2 (−4).
- Organized −4 (−6): contenedores ×1.3.
- Outdoorsy −2: 10 % de probabilidad de resfriado.
- Resilient −4.
- Runner −4: +1 Running.
- Sewer −4: +1 Tailoring.
- Speed Demon −1.
- Stout −6: +2 Strength.
- Strong −10: +4 Strength, +40 % de knockback.
- Target Shooter −5 (nuevo): +1 Aiming.
- Thick Skinned −8.
- Tinkerer −4 (nuevo): +1 Maintenance.
- Vehicle Knowledge −3 (Amateur Mechanic −5 en B41): +1 Mechanics.
- Wakeful −3 (−2).
- Whittler −2 (nuevo): +2 Carving.
- Bushcrafter −8 (nuevo): +1 Carving, Foraging, Knapping y Maintenance.

— [PZwiki: Traits (42.20.4)](https://pzwiki.net/wiki/Traits); [B41 Traits (archivo 41.78.16)](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Traits)

**Traits negativos B42, con coste y entre paréntesis el coste o nombre B41**
- Agoraphobic +4.
- All Thumbs +2: transferencia ×4.
- Short of Breath +5 (Asthmatic): resistencia al correr ×1.4, en el swing ×1.3.
- Claustrophobic +4.
- Clumsy +2: radio de ruido de pasos ×1.2.
- Conspicuous +4: ×2 de probabilidad de ser visto.
- Cowardly +2: pánico ×2.
- Deaf +12.
- Disorganized +6 (+4): contenedores ×0.7.
- Fast Metabolism +2 (nuevo).
- Fear of Blood +5.
- Weak +6 (Feeble en B41): −2 Strength, carga 9.
- Hard of Hearing +4.
- Hearty Appetite +4: hambre ×1.5.
- High Thirst +2 (+6).
- Illiterate +10 (+8): solo lee cómics, libros ilustrados y revistas HottieZ; no puede escribir.
- Out of Shape +6: −2 Fitness.
- Reluctant Fighter +5 (Pacifist +4): ×0.75 de XP en armas, Maintenance y Aiming.
- Prone to Illness +4.
- Puny +10 (Weak +10 en B41): −5 Strength, −40 % de knockback.
- Restless Sleeper +6.
- Short Sighted +2: borroso a más de 4 tiles, se corrige con gafas.
- Sleepyhead +4.
- Slow Healer +3 (+6).
- Slow Learner +6: ×0.7 de XP.
- Slow Metabolism +2 (nuevo).
- Slow Reader +2.
- Smoker +3 (+4).
- Sunday Driver +1: velocidad máxima 30 mph.
- Thin-skinned +8.
- Unfit +10: −4 Fitness.
- Weak Stomach +2 (+3): ×2 de intoxicación alimentaria.

— [PZwiki: Traits](https://pzwiki.net/wiki/Traits); [B41 Traits (archivo)](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Traits)

**Eliminados o futuros**
- Lucky −4 y Unlucky +4: ±10 % de botín y ±5 % de fallo en reparaciones. Estaban en B41 (no en MP) y ya no están en B42.
- Brooding, Hypochondriac, Patient, Short Tempered, Light Drinker, Hardened Drinker, Marksman, Gift of the Gab, Motion Sensitive: eliminados o sin efecto.
- B41 tenía además Obese +10, Overweight +6, Underweight +6 y Very Underweight +10 elegibles en la creación. — [PZwiki: Traits](https://pzwiki.net/wiki/Traits); [B41 Traits (archivo)](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Traits)
- Traits exclusivos de ocupación:
  - Desensitized (Veteran): 0 % de pánico salvo pesadillas, ×2 de pesadillas.
  - Ax-pert (Lumberjack, "Axe Man" en B41): hachas un 25 % más rápidas.
  - Burglar: hacer puente a vehículos, romper menos cerrojos de ventanas.
  - Night Owl (Security Guard y Nurse).
  - Vehicle Knowledge (Mechanic): +3 Mechanics y repara todos los vehículos.
  - Keen Cook (Chef).
  - Blacksmith Knowledge (Blacksmith). — [PZwiki: Traits](https://pzwiki.net/wiki/Traits)

**Ocupaciones B41 (41.78.16): puntos y skills**
- Unemployed 8 puntos.
- Fire Officer 0: +1 Axe, +1 Fitness, +1 Sprinting, +1 Strength.
- Police Officer −4: +3 Aiming, +2 Reloading, +1 Nimble.
- Park Ranger −4: +1 Axe, +1 Carpentry, +2 Foraging, +2 Trapping.
- Construction Worker −2: +1 Carpentry, +3 Short Blunt.
- Security Guard −2: +1 Lightfooted, +2 Sprinting, Night Owl.
- Carpenter +2: +3 Carpentry, +1 Short Blunt.
- Burglar −6: +2 Lightfooted, +2 Nimble, +2 Sneaking.
- Chef −4: +3 Cooking, +1 Maintenance, +1 Short Blade, Cook.
- Repairman −4: +1 Carpentry, +2 Maintenance, +1 Short Blunt.
- Farmer +2: +3 Farming.
- Fisherman −2: +3 Fishing, +1 Foraging.
- Doctor +2: +3 First Aid, +1 Short Blade.
- Veteran −8: +2 Aiming, +2 Reloading, Desensitized.
- Nurse +2: +2 First Aid, +1 Lightfooted.
- Lumberjack 0: +2 Axe, +1 Strength, Axe Man.
- Fitness Instructor −6: +3 Fitness, +2 Sprinting, Nutritionist.
- Burger Flipper +2: +2 Cooking, +1 Maintenance, +1 Short Blade, Cook.
- Electrician −4: +3 Electrical.
- Engineer −4: +1 Carpentry, +1 Electrical.
- Metalworker −6: +3 Metalworking.
- Mechanic −4: +3 Mechanics, +1 Short Blunt, Amateur Mechanic.

— [B41 Occupation (archivo)](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Occupation)

**Ocupaciones B42**
- Custom Occupation 8 puntos.
- Blacksmith −6 (nueva): +4 Blacksmithing, +1 Maintenance, +1 Short Blunt.
- Burger Flipper +2.
- Burglar −6.
- Carpenter −2: +4 Carpentry, +1 Carving, +1 Maintenance, +1 Masonry, +1 Short Blunt.
- Chef −2: +4 Cooking, +2 Butchering, +1 Maintenance, +1 Short Blade.
- Construction Worker −2: +1 Carpentry, +1 Long Blunt, +1 Maintenance, +2 Masonry, +2 Short Blunt.
- DIY Expert −2 (antes Repairman): +1 Carpentry, +2 Maintenance, +1 Masonry, +1 Short Blunt, Inventive.
- Doctor 0: +6 First Aid, +1 Short Blade.
- Electrician −2: +5 Electrical.
- Engineer −4: +1 Carpentry, +1 Electrical, +1 Masonry.
- Crop Farmer 0: +4 Agriculture, +1 Animal Care, +1 Strength.
- Firefighter 0: +1 Axe, +1 Fitness, +1 Running, +1 Strength.
- Fishing Guide −2 (antes Fisherman): +3 Fishing, +1 Butchering, +1 Foraging.
- Fitness Instructor −6: +3 Fitness, +2 Running, +1 Strength, Nutritionist.
- Lumberjack 0: +2 Axe, +1 Maintenance, +1 Strength, Ax-pert.
- Mechanic −4: +4 Mechanics, +1 Welding, Vehicle Knowledge.
- Nurse 0: +3 First Aid, +1 Fitness, +1 Lightfooted, Night Owl.
- Park Ranger −4: +1 First Aid, +1 Foraging, +1 Knapping, +1 Carving, +1 Trapping, Herbalist.
- Police Officer −4: +4 Aiming, +1 Nimble, +1 Reloading.
- Rancher / Livestock Farmer 0: +1 Fitness, +4 Animal Care, +3 Butchering.
- Security Guard −2: +1 Lightfooted, +2 Running, +1 Short Blunt, Night Owl.
- Tailor +2 (nueva): +4 Tailoring.
- Veteran −8: +2 Aiming, +2 Reloading, Desensitized.
- Welder −4 (antes Metalworker): +4 Welding.

La wiki avisa de que esta tabla "needs verification" para B42 estable. — [PZwiki: Occupation](https://pzwiki.net/wiki/Occupation)
- Fuentes de terceros coinciden en las nuevas ocupaciones (Blacksmith, Welder, Livestock/Crop Farmer, Tailor, DIY Expert), pero dan puntos contradictorios entre sí y dicen que el parche 42.16 retocó skills iniciales y costes. — [XGamingServer guide](https://xgamingserver.com/blog/project-zomboid-traits-occupations-guide/); [Supercraft](https://supercraft.host/wiki/project-zomboid/character-creation)

### Inferences
- Las ocupaciones B42 tienden a dar más niveles concentrados (+4 a +6 en la skill principal frente a +3 en B41) y más skills secundarias de crafteo, en línea con el gran rework de crafteo de B42.
- Muchos traits "baratos" de B41 bajaron de coste en B42 (Low Thirst −6→−2, Light Eater −4→−2, Slow Healer +6→+3), lo que reduce el min-maxing de los combos clásicos.
- Para un juego similar, el mecanismo más potente es ligar los niveles iniciales a un multiplicador de XP permanente. Hace que la elección de ocupación importe durante toda la partida y no solo al principio.

### Gaps
- Los costes y bonus de B42 siguen cambiando (42.16+). No pude verificar los valores definitivos en las notas de parche oficiales ni en posts "Thursdoid" (no los recuperé).
- Algunos efectos de traits nuevos (Inventive, Tinkerer, Bushcrafter) están descritos de forma breve, sin números detallados.

## 4. ¿Cómo suben de nivel las skills y cómo funcionan los multiplicadores, los libros y la TV/VHS?

### Takeaway
Las skills van de 0 a 10 por XP. Las normales necesitan 75→9000 XP por nivel (32 775 en total) y las físicas (Strength, Fitness) 1500→150 000. La XP efectiva se multiplica por:
- el boost inicial (25–166 %),
- los traits (Fast Learner ×1.3, Slow Learner ×0.7, Crafty ×1.3, Reluctant Fighter ×0.75),
- los libros de habilidad (×3/×5/×8/×12/×16 por volumen, que cubre 2 niveles, proporcional a la fracción leída; Aiming y Reloading usan multiplicadores menores),
- la TV y los VHS, que dan XP pasiva.

B42 amplió el conjunto de skills a unas 30: añadió Blacksmithing, Carving, Glassmaking, Knapping, Masonry, Pottery, Animal Care, Butchering y Tracking, y renombró Farming→Agriculture, Metalworking→Welding y Sprinting→Running.

### Cited Findings
- XP por nivel (no acumulada):
  - Normal: 75, 150, 300, 750, 1500, 3000, 4500, 6000, 7500, 9000 (total 32 775).
  - Pasiva (Strength y Fitness): 1500, 3000, 6000, 9000, 18 000, 30 000, 60 000, 90 000, 120 000, 150 000. — [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Categorías y skills (B42):
  - Passive: Fitness, Strength.
  - Agility: Running (antes Sprinting), Lightfooted, Nimble, Sneaking.
  - Combat: Axe, Long Blade, Long Blunt, Short Blade, Short Blunt, Spear, Maintenance.
  - Firearm: Aiming, Reloading.
  - Crafting: Blacksmithing, Carpentry, Carving, Cooking, Electrical, Glassmaking, Knapping, Masonry, Mechanics, Pottery, Tailoring, Welding.
  - Farming: Agriculture, Animal Care, Butchering.
  - Survivalist: First Aid, Fishing, Foraging, Tracking, Trapping.

  En B41 eran: Fitness, Strength, Sprinting, Lightfooted, Nimble, Sneaking, las 7 de combate, Aiming, Reloading, Carpentry, Cooking, Farming, First Aid, Electrical, Metalworking, Mechanics, Tailoring, Fishing, Trapping y Foraging. — [PZwiki: Moodle (navbox de skills)](https://pzwiki.net/wiki/Moodles); [B41 Occupation (archivo, navbox)](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Occupation)
- Efecto de las skills de arma 0–10 (las que no son Axe usan nivel −1):
  - Daño: 30 %→130 %.
  - Crítico: 0→30 %.
  - Velocidad de ataque: 0→30 %.
  - Bloqueo: 0→30 %.
  - Injury chance: −5 %→7 %.

  El crítico total está acotado entre el 10 y el 90 %. — [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Strength 0–10: daño melee 75 %→125 %, knockdown de empuje 75→125 %, bloqueo +0→20 %, carga 6→20.
  - Se gana XP haciendo ejercicio, cargando más del 50 % de la capacidad, corriendo, golpeando y talando.
  - Fitness se gana con ejercicio, golpes sin estar agotado y corriendo (50/50 con Running). — [PZwiki: Strength](https://pzwiki.net/wiki/Strength); [PZwiki: Fitness](https://pzwiki.net/wiki/Fitness)
- Ejercicio (B42):
  - Squats: 4 de Fitness por repetición (≈208/h).
  - Push-ups: 6 de Strength (9 con protein boost; ≈576/h).
  - Sit-ups: 2 de Fitness (≈144/h).
  - Burpees: 3.2 de Fitness y 4.8 de Strength.
  - Barbell curls, dumbbell presses y bicep curls: 7.2 de Strength (10.8 con proteína). Dumbbell presses ≈994/h.
  - +10 % de XP por cada nivel por encima de 5.
  - Los ejercicios pesados gastan ×1.3 de resistencia, y +33 % por cada nivel de carga.
  - Producen rigidez muscular (dolor) unas 12 h después, más rápido si el personaje está cansado (+33 % por nivel). — [PZwiki: Exercise](https://pzwiki.net/wiki/Exercise)
- Tensión muscular en combate:
  - Con el arma al nivel 10 se sufre el 10 % (−7.5 % por nivel).
  - Strength 0 ×1.5 y Strength 10 ×0.5.
  - Escala con el número de zombis golpeados. Pisar (stomp) da 0.3 y empujar 0.15.
  - En melee la base es 60 % del peso del arma + 120 % de su modificador de resistencia. — [PZwiki: Health](https://pzwiki.net/wiki/Health)
- Libros de habilidad:
  - Un volumen por cada 2 niveles. Hay libros para 24 skills (B42).
  - Volúmenes: I 220 páginas (niveles 1–2, ×3), II 260 (3–4, ×5), III 300 (5–6, ×8), IV 340 (7–8, ×12), V 380 (9–10, ×16).
  - Cada 10 % leído da el 10 % del multiplicador máximo (un multiplicador por debajo de 1 se ignora).
  - El multiplicador desaparece al completar el rango de niveles del libro. Puede haber varios activos a la vez. — [PZwiki: Skill books](https://pzwiki.net/wiki/Skill_books); [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Excepción de Aiming: libros ×1.5, ×2.5, ×4, ×6, ×8. Además, Aiming y Reloading reciben un multiplicador global de 0.37037 al llegar al nivel 5. — [PZwiki: Skill books](https://pzwiki.net/wiki/Skill_books); [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Efecto acumulado: con libros, la XP efectiva para llegar a nivel 10 en una skill normal baja de 32 775 a ≈2754. — [PZwiki: Skills](https://pzwiki.net/wiki/Skills)
- Lectura:
  - ≈2 minutos de juego por página: Vol. I ≈7 h 20 min, Vol. V ≈12 h 40 min.
  - Fast Reader 70 % del tiempo, Slow Reader 130 %, gafas de lectura 90 % (multiplicativo).
  - Solo se puede leer con el nivel de skill requerido. Por encima, se lee sin efecto.
  - El progreso se guarda. Los libros no se releen. Leer libros de habilidad genera aburrimiento.
  - Un libro quemado como combustible dura 15 min.
  - Illiterate no puede leerlos. — [PZwiki: Skill books](https://pzwiki.net/wiki/Skill_books); [PZwiki: Bored](https://pzwiki.net/wiki/Bored)
- TV:
  - En el canal 203 "Life and Living TV" se emiten programas que dan XP pasiva estando en la misma habitación: Cook Show (Cooking, 600), Woodcraft (Carpentry, 1200), Exposure Survival (Agriculture 1800, Fishing, Foraging, Trapping).
  - Hace falta electricidad (red o generador).
  - Los VHS (Home y Retail) reducen el aburrimiento y algunos dan XP. La TV antigua no reproduce VHS. — [PZwiki: Television](https://pzwiki.net/wiki/Television)

### Inferences
- PZ combina tres palancas que se multiplican: el boost permanente de creación, los traits de aprendizaje y los libros temporales por rango de nivel. Así un personaje "especialista" puede llegar a nivel 10 con un ~8 % del esfuerzo bruto. Es un buen modelo para premiar la exploración (encontrar libros) frente al grindeo.
- Que Aiming y Reloading tengan multiplicadores menores y la penalización 0.37037 a partir del nivel 5 muestra un equilibrado específico para que las armas de fuego no dominen.

### Gaps
- Las cantidades exactas de XP por acción (talar, coser, cocinar) por skill no se recopilaron.
- No encontré la lista completa de VHS con XP ni las cantidades de los programas de TV de Fishing, Foraging y Trapping (la tabla de la wiki salió incompleta).
- No pude confirmar si B42 cambió los multiplicadores de los libros respecto a B41 (la tabla parece igual) ni el comportamiento de la "XP Boost" mostrada con fallo en 42.13.1.
