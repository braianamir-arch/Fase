# Desarmando Project Zomboid pieza por pieza

Project Zomboid (PZ) no gana por tener un sistema genial. Gana porque tiene decenas de sistemas chicos que se enganchan entre sí. Hambre, sed, cansancio, temperatura, heridas por parte del cuerpo, ruido, luz, carga, botín que se pudre y servicios que se cortan corren al mismo tiempo, y casi todos usan el mismo molde: una variable de 0 a 100 con 4 umbrales que restan capacidad de carga, daño, velocidad o visión. Esas penalizaciones se suman, así que una crisis chica se vuelve una espiral: herido, con hambre y cansado es casi muerto ([PZwiki: Moodle](https://pzwiki.net/wiki/Moodles)).

Build 42 pasó a estable con la versión 42.20 a fines de julio de 2026, con multijugador incluido ([PCGamesN](https://www.pcgamesn.com/project-zomboid/build-42-stable-build-release)). Esa build convirtió el crafteo en un árbol tecnológico (piedra, cerámica, herrería), sumó animales con genética, sótanos y un mapa del doble de tamaño, y cambió el auto-apuntado por una retícula.

Los jugadores aman la profundidad y las historias que salen solas bajo el lema "This is how you died". Odian la interfaz: el propio estudio reconoce que es "clunky, fiddly and slow". También les pesa la curva de aprendizaje, el desarrollo lento y que, después de 13 años, sigue sin haber NPCs humanos ([Steam](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/); [Supercraft](https://supercraft.host/article/project-zomboid-roadmap-2026/)).

En celular, PZ no existe oficialmente y The Indie Stone dice que nunca va a existir ([projectzomboid.com](https://projectzomboid.com/blog/news/2024/01/project-zomboid-mobile/)). Mientras tanto, el mercado Android de zombis lo ocupan juegos free-to-play simples y criticados por su monetización. Ahí está el hueco: la simulación de PZ con controles táctiles bien pensados y una interfaz moderna.

> **Cómo leer este catálogo.** **[B41]** y **[B42]** marcan datos que la fuente atribuye a una build concreta; sin marca, el dato vale para las dos o la fuente no distingue. **[conflicto]** indica que las fuentes no coinciden. **[sin verificar]** indica una fuente de fans o de foro sin confirmar en la wiki oficial. Casi todos los números vienen de la PZwiki oficial, leída en copias archivadas. Muchas de sus páginas de B42 dicen "needs verification", y B42 sigue cambiando entre parches, así que conviene tomar las cifras como aproximadas. Los nombres de los términos del juego quedan en inglés entre paréntesis.

---

## 1. Contexto y estado de versiones (a octubre de 2026)

- **Qué es**: un sandbox de supervivencia zombi en isométrica, ambientado en un condado ficticio de Kentucky dentro de la zona de exclusión del Knox Event, en 1993 ([Steam](https://store.steampowered.com/app/108600/Project_Zomboid/)).
  - Según el lore de la comunidad, la evacuación fue el 6 de julio y la partida arranca el 9 de julio ([ProGameGuides](https://progameguides.com/project-zomboid/project-zomboid-lore-everything-we-know/)).
- **Early Access desde noviembre de 2013.** Cuesta USD 24,99 y tiene unas 160.584 reseñas en inglés, con un 93 % positivas. El 1.0 no tiene fecha ("no ETA"). Trae soporte completo de mods en Lua con Workshop, pantalla dividida (split-screen) local y multijugador ([Steam](https://store.steampowered.com/app/108600/Project_Zomboid/)).
- **Hitos**:
  - Tech demo: mayo de 2011.
  - Octubre de 2011: les robaron portátiles con código sin copia de seguridad, lo que causó "severe delays".
  - B41: 20 de diciembre de 2021, con multijugador renovado y combate y animaciones nuevos ([Wikipedia](https://en.wikipedia.org/wiki/Project_Zomboid)).
- **B42**:
  - Rama inestable (unstable): 17 de diciembre de 2024, solo un jugador.
  - Multijugador en unstable: 42.13, diciembre de 2025.
  - Estable: 42.20 "The Big Glow Up", el 28–29 de julio de 2026.
  - Hotfixes hasta la 42.20.4 (26 de agosto). La 42.20.3 admite hasta 254 jugadores.
  - Las partidas de B41 y B42 no son compatibles entre sí, y las de la 42.19 no cargan en la 42.20 ([projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/); [PCGamesN](https://www.pcgamesn.com/project-zomboid/build-42-stable-build-release)).
  - **[conflicto]** Wikipedia fecha el anuncio de la estable el 9 de julio de 2026 ([Wikipedia](https://en.wikipedia.org/wiki/Project_Zomboid)).
- **42.21 "Re-population of the Dead"** (septiembre de 2026). Arregla:
  - hordas que desaparecían al salir y volver a entrar en un chunk;
  - zombis duplicados en multijugador;
  - exploits de las casas seguras (safehouse) y un bypass de autenticación.

  ([Blog oficial](https://projectzomboid.com/blog/news/2026/09/re-population-of-the-dead-build-42-21-unstable-released/)). **[conflicto]** La mayoría de las fuentes la ubica en unstable, pero DoomHosting dice que pasó a estable el 28 de septiembre ([DoomHosting](https://www.doomhosting.com/blog/project-zomboid-42-21-stable-patch-notes-servers)).
- **Lo que viene**:
  - Una "Build 42 Support Update" para fines de 2026, con optimización y más soporte de mods ([Supercraft](https://supercraft.host/article/project-zomboid-roadmap-2026/)).
  - Los NPCs humanos quedan para B43 ("NPC Stage 1"), sin fecha. Las fuentes de 2026 piden no esperarlos este año ([PZwiki: Upcoming versions](https://pzwiki.net/wiki/Upcoming_versions); [Supercraft](https://supercraft.host/article/project-zomboid-roadmap-2026/)).
  - En B41 y B42 no hay soldados vivos: el ejército solo aparece como escenografía (bases, checkpoints, cadáveres) ([pzfans](https://pzfans.com/project_zomboids_national_guard_what_they_left_behind/)).

---

## 2. Personaje y supervivencia: 24 moodles encadenados

### 2.1 Cómo funcionan los moodles

- [ ] **Qué son**: iconos arriba a la derecha que muestran el estado del personaje. La mayoría tiene 4 niveles ligados a umbrales de una variable de 0 a 100 %. El fondo verde marca un estado positivo y el rojo uno negativo, y el tooltip amplía la información ([PZwiki: Moodle](https://pzwiki.net/wiki/Moodles)).
- [ ] **Lista activa [B42]**: Hungry, Thirsty, Panic, Bored, Stressed, Unhappy, Drunk, Heavy load, Endurance, Tired, Hyperthermia, Hypothermia, Windchill, Wet, Injured, Pain, Bleeding, Restricted movement, Has a cold, Sick, Noxious smell, Discomfort, Dead y Zombie.
  - **[B42]** suma Discomfort y Noxious smell.
  - Hay iconos todavía sin uso para moodles futuros: Concentrating, Dizzy, Exhausted, Happy, Scared, HearingImpaired, Sedated, VisionImpaired y Wired.
  - Están eliminados o no tienen efecto: Angry, Hungover, Fear, Morale y Sanity ([PZwiki: Moodle](https://pzwiki.net/wiki/Moodles)).
- [ ] **Patrón de diseño**: varios moodles no hacen daño directo (Bored, Windchill, Discomfort). Funcionan como aviso temprano de otro moodle que sí lo hace (Unhappy, Hypothermia).

### 2.2 Necesidades básicas

- [ ] **Hambre (Hungry)**: sube unos 4,32 % por hora de juego.
  - Light Eater la multiplica por 0,75 y Hearty Appetite por 1,5.
  - Niveles:
    - Peckish (>15 %): regeneración −25 %.
    - Hungry (>25 %): carga −1.
    - Very Hungry (>45 %): carga −2 y regeneración −55 %.
    - Starving (>70 %): pierde 4,4 % de salud por hora hasta morir.
  - Saciado, cura "750 % más rápido".
  - **[B41]** Cualquier nivel positivo de hambre daba +2 de carga. **[B42]** Ese bonus desaparece ([PZwiki: Hungry](https://pzwiki.net/wiki/Hungry)).
- [ ] **Sed (Thirsty)**: sube unos 2,875 % por hora. Corriendo se multiplica por 1,2 y durmiendo por 0,125.
  - Niveles: >13 %, >25 %, >70 % y >85 %. En el último (Dying of Thirst) pierde 22 % de salud por hora.
  - El personaje toma agua solo si la sed llega a 10 % o más.
  - Bucle: con poca agua suda menos, entonces se calienta más y le da más sed ([PZwiki: Thirsty](https://pzwiki.net/wiki/Thirsty)).
- [ ] **Cansancio y sueño (Tired)**: solo se puede dormir con 60 % o más de fatiga.
  - Niveles: >60, >70, >80 y >90 %, con daño cuerpo a cuerpo de −50, −80, −90 y −95 %.
  - Duerme unas 9 h (entre 3 y 16). Con Wakeful son unas 6 h y con Sleepyhead unas 12 h.
  - Hay un 5 % de base de tener pesadillas, y sube con el estrés.
  - Si está activado el "sleeping event", un zombi puede despertarte. Es más probable con ventanas abiertas o luces y aparatos encendidos ([PZwiki: Tired](https://pzwiki.net/wiki/Tired); [PZwiki: Sleep](https://pzwiki.net/wiki/Sleep)).
  - **[sin verificar]** La tasa exacta de fatiga en B42 figura como "PLACEHOLDER" en la wiki.
- [ ] **Resistencia (Endurance)**: cuatro niveles al gastar 25, 50, 75 y 90 %.
  - Penalizan el daño (−50 a −95 %), la velocidad (−19 a −75 %) y el sprint.
  - Exhausted no deja usar el mazo (sledgehammer).
  - Se recupera sentado, en un vehículo o con Fitness alta ([PZwiki: Endurance](https://pzwiki.net/wiki/Endurance)).
  - Queja de B42: "A minor fight with 6 zombies can leave me completely depleted, forcing me to sleep by noon" ([Steam](https://steamcommunity.com/app/108600/discussions/0/595135965842913736)).

### 2.3 Mente

- [ ] **Pánico (Panic)**: sube unos 3 % por cada zombi visto, más 0,5 % por minuto mientras haya zombis a la vista.
  - Solo cuentan los zombis que están en pantalla, así que hacer zoom baja la ganancia.
  - La recuperación mejora cada día sobrevivido, hasta el día 150.
  - Niveles **[B42]**: Nervous, Alarmed, Frightened y Terrified.
    - Restan crítico y daño cuerpo a cuerpo.
    - Penalizan el disparo con nivel × (4 + distancia × 0,5).
    - Terrified además achica el cono de visión.
  - **[B41]** Los niveles se llamaban Slight Panic, Panic, Strong Panic y Extreme Panic.
  - Rasgos: Brave baja el pánico un 70 %, Cowardly lo duplica y Desensitized lo anula ([PZwiki: Panic](https://pzwiki.net/wiki/Panic)).
- [ ] **Aburrimiento (Bored)**: lo suben estar quieto, estar en interiores y leer libros de habilidad.
  - Lo bajan la TV, la radio, la literatura, manejar, estar al aire libre, craftear y tener supervivientes cerca.
  - Desde el 50 % empieza a sumar infelicidad ([PZwiki: Bored](https://pzwiki.net/wiki/Bored)).
- [ ] **Estrés (Stressed)**: viene de una posible infección, de zombis golpeando la puerta, de pesadillas y de la falta de nicotina.
  - El estrés del fumador se cuenta aparte, con tope de 51, así que el total puede llegar a 150 %.
  - Se baja matando zombis, fumando, leyendo o **[B42]** acariciando animales ([PZwiki: Stressed](https://pzwiki.net/wiki/Stress)).
- [ ] **Infelicidad (Unhappy)**: hace más lentas todas las acciones con barra de tiempo, entre +7,4 y +26,5 %.
  - Los antidepresivos tardan 2 h en hacer efecto y no se acumulan ([PZwiki: Unhappy](https://pzwiki.net/wiki/Unhappiness); [PZwiki: Antidepressants](https://pzwiki.net/wiki/Antidepressants)).
- [ ] **Incomodidad (Discomfort) [B42]**: va de 0 a 100 y alimenta la infelicidad.
  - La generan la ropa y los cascos, por ejemplo: Hockey Mask 5 %, Gas Mask 60 %, NBC mask 75 %.
  - Mojado, hipotermia e hipertermia suman +10 % cada uno ([PZwiki: Discomfort](https://pzwiki.net/wiki/Discomfort)).

### 2.4 Cuerpo y entorno

- [ ] **Temperatura**:
  - Hipertermia: >37,5 / >39 / >40 / >41 °C, con hasta −90 % de combate.
  - Hipotermia: <36,5 / <35 / <30 / <25 °C. Desde Chilly ya no hay curación natural.
  - Windchill solo avisa: el cuerpo se enfría más rápido ([PZwiki: Hyperthermia](https://pzwiki.net/wiki/Hyperthermia); [PZwiki: Hypothermia](https://pzwiki.net/wiki/Hypothermia); [PZwiki: Windchill](https://pzwiki.net/wiki/Windchill)).
- [ ] **Mojado (Wet)**: niveles al 15, 40, 70 y 90 % de humedad.
  - Desde el primero no hay curación natural.
  - Con humedad máxima se pierde hasta un 75 % más de calor.
  - Un paraguas en la mano no deja pasar de "Wet" ([PZwiki: Wet](https://pzwiki.net/wiki/Wet)).
- [ ] **Resfriado (Has a cold)**: aparece con frío o humedad prolongados.
  - **Los estornudos y la tos atraen zombis**. Los pañuelos los amortiguan.
  - No se cura mientras sigan el frío, el hambre o la humedad ([PZwiki: Has a cold](https://pzwiki.net/wiki/Has_a_cold)).
- [ ] **Enfermedad (Sick)**: niveles al 25, 50, 75 y 90 % (Fever), que restan carga.
  - La causan la comida podrida, la infección zombi y los cadáveres: 20 o más cuerpos con moscas. Hay que alejarse 13 tiles o más ([PZwiki: Sick](https://pzwiki.net/wiki/Sick)).
- [ ] **Olor nocivo (Noxious smell) [B42]**: el nivel máximo, Deadly Fumes, es un generador encendido bajo techo.
  - La salud baja al 65 % y después al 5 %. La máscara de gas lo evita ([PZwiki: Noxious smell](https://pzwiki.net/wiki/Noxious_smell)).
- [ ] **Borrachera (Drunk)**: visión doble, peor sueño, menos calor corporal y controles de manejo con retraso.
  - Oculta la hipotermia y baja el pánico.
  - **[B41]** Existían Light Drinker y Hardened Drinker; ya no están ([PZwiki: Drunk](https://pzwiki.net/wiki/Drunk)).
- [ ] **Fumador (Smoker)**: cuesta +3 **[B42]** (+4 **[B41]**).
  - El estrés sube con las horas sin fumar.
  - Un cigarrillo baja 10 de estrés y un puro 40 ([PZwiki: Smoker](https://pzwiki.net/wiki/Smoker)).
- [ ] **Nutrición y peso**: el hambre y las calorías son **sistemas separados**. Se puede estar emaciado y lleno a la vez.
  - Cada comida tiene calorías, carbohidratos, proteínas y grasas. El peso por defecto es 80 kg.
  - Se engorda si las calorías superan base + (peso − 80) × 40. La base es 700, 1000 o 1800 según el metabolismo.
  - A los 35 kg la salud cae rápido.
  - Rasgos de peso: Emaciated hace 40 % de daño cuerpo a cuerpo. High Weight duplica la pérdida de resistencia.
  - **[B41]** Se elegían Obese, Overweight, Underweight y Very Underweight. **[B42]** Los reemplazan Slow Metabolism y Fast Metabolism ([PZwiki: Nutrition](https://pzwiki.net/wiki/Nutrition); [PZwiki: Traits](https://pzwiki.net/wiki/Traits)).
- [ ] **Carga (Heavy load)**: niveles al superar el 100, 125, 150 y 175 % de la capacidad.
  - Restan velocidad: −19, −37, −56 y −75 %.
  - Desde el 150 % hay daño continuo hasta quedar en 75 % de salud. Sentarse lo frena ([PZwiki: Heavy load](https://pzwiki.net/wiki/Heavy_load)).

### 2.5 Heridas, infección y tratamiento

- [ ] **17 partes del cuerpo**: pies, canillas, muslos, manos, antebrazos, brazos, ingle, torso inferior y superior, cuello y cabeza.
  - Las heridas ponen techo a la salud máxima.
  - **Una herida en el cuello puede matar en minutos** si no se venda ([PZwiki: Health](https://pzwiki.net/wiki/Health)).
- [ ] **Tipos de herida** ([PZwiki: Health](https://pzwiki.net/wiki/Health)):
  - Arañazo (Scratched).
  - Laceración (Lacerated).
  - Mordisco (Bitten). Pasa mucho más cuando atacan por la espalda.
  - Herida profunda (Deep Wound): hay que coserla con aguja o mantenerla vendada alrededor de un mes.
  - Vidrio o bala alojados: se sacan con pinzas.
  - Quemadura: tarda 50–100 h en curar.
  - Fractura: se trata con férula (splint) hecha de trapo y madera. Cura unas 10 veces más rápido y es lo único que frena la pérdida de vida. Ni la cabeza ni el torso se pueden entablillar.
  - Rigidez por ejercicio: aparece unas 12 h después de entrenar.
- [ ] **Tiempos de curación** (horas de juego, normal / Slow Healer / Fast Healer) ([PZwiki: Health](https://pzwiki.net/wiki/Health)):

  | Herida | Normal | Slow | Fast |
  |---|---|---|---|
  | Arañazo | 7–15 | 15–25 | 4–10 |
  | Laceración | 10–20 | 20–30 | 5–10 |
  | Mordisco | 50–80 | 80–150 | 30–50 |
  | Herida profunda | 15–20 | 20–32 | 11–15 |
  | Fractura (días) | hasta 60 | hasta 140 | hasta 40 |
  | Quemadura | 50–100 | 50–100 | 50–100 |

  **[sin verificar]** La bonificación de First Aid en fracturas aparece de forma ambigua en la wiki.
- [ ] **Vendas**: sin venda la herida no cura.
  - Una venda sucia frena el sangrado pero sube la infección, así que hay que cambiarla.
  - Se esterilizan con 500 mL de agua hervida o 100 mL de alcohol.
  - La infección bacteriana es leve y siempre sobrevivible. Se trata con desinfectante, antibióticos o una cataplasma de ajo ([PZwiki: Bandage](https://pzwiki.net/wiki/Bandage); [PZwiki: Antibiotics](https://pzwiki.net/wiki/Antibiotics)).
  - **[sin verificar]** Faltan las probabilidades numéricas de la infección bacteriana.
- [ ] **Infección Knox (zombificación)**: solo la transmite un ataque zombi.
  - **Probabilidad por herida: arañazo 7 %, laceración 25 %, mordisco 100 %.**
  - Es invisible. Avanza así:
    - 1–4 h: ansiedad.
    - 5–12 h: Queasy.
    - 13–24 h: Nauseous.
    - 25–48 h: Sick.
    - 49–71 h: Fever.
    - **72 h: muerte y reanimación.**
  - No tiene cura. Resilient la frena un 25 %.
  - Sandbox: modo de transmisión, mortalidad (desde instantánea hasta nunca) y tiempo de reanimación ([PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)).
  - **[conflicto]** Hay cifras de comunidad distintas (50/20/15 %), que parecen medir el tipo de herida y no la infección ([Steam](https://steamcommunity.com/app/108600/discussions/0/7048779852332288496)).
- [ ] **Cadena de un golpe zombi**:
  1. Tirada de bloqueo. Suben la chance la skill de arma (+0 a +30 %), Strength y Fitness (+2 % por nivel).
  2. Probabilidad de herida.
  3. Parte del cuerpo al azar.
  4. Defensa de la ropa en esa parte, con posibilidad de agujero.
  5. Tipo de herida.
  6. Tirada de Knox.

  Thick Skinned multiplica por 1,3 la chance de no ser herido y Thin-skinned por 0,7 ([PZwiki: Skills](https://pzwiki.net/wiki/Skills); [PZwiki: Traits](https://pzwiki.net/wiki/Traits)).
- [ ] **Ropa**: más de 100 zonas para equipar (body locations).
  - Cada prenda tiene defensa contra mordisco, arañazo y bala, protección de cuello, aislamiento, resistencia al viento y al agua, condición y posibilidad de agujerearse.
  - Con un agujero, esa zona queda sin protección ([PZwiki: Clothing](https://pzwiki.net/wiki/Clothing)).
  - **[sin verificar]** No se sabe cómo se combinan las capas (se suman o cada una tira por separado) ni la fórmula del agujero ([PZFans](https://pzfans.com/zombie-proof_threads_dress_smart_or_die_stupid_in_project_zomboid/); [Steam](https://steamcommunity.com/app/108600/discussions/0/595136999981060934)).
- [ ] **Muerte**: es permanente. Si estabas infectado, te reanimás como zombi en 1–2 minutos.
  - En vanilla no se conserva nada. Mods como Skill Recovery Journal recuperan parte de la XP ([PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection); [PZFans](https://pzfans.com/project_zomboid_how_to_keep_your_skills_after_death)).

### 2.6 Creación de personaje: ocupaciones y rasgos con puntos

- [ ] **Sistema de puntos**:
  - El saldo final tiene que ser 0 o más.
  - Las ocupaciones dan o quitan puntos. Unemployed **[B41]** y Custom Occupation **[B42]** dan 8.
  - Los rasgos positivos cuestan puntos y los negativos los dan.
  - Algunos rasgos se excluyen entre sí ([PZwiki: Traits](https://pzwiki.net/wiki/Traits)).
- [ ] **Mecanismo clave**: el nivel inicial de una skill fija **para siempre** su multiplicador de XP. Nivel 0 da 25 %, nivel 1 100 %, nivel 2 133 % y nivel 3 o más 166 % ([PZwiki: Skills](https://pzwiki.net/wiki/Skills)).
- [ ] **Rasgos renombrados en [B42]**:
  - Asthmatic → Short of Breath.
  - Pacifist → Reluctant Fighter.
  - Feeble → Weak, y el Weak de B41 pasa a llamarse Puny.
  - Outdoorsman → Outdoorsy.
  - Cook → Keen Cook.
  - Amateur Mechanic → Vehicle Knowledge.
  - Axe Man → Ax-pert.
- [ ] **Rasgos nuevos [B42]**: Artisan, Blacksmith Knowledge, Crafty (×1,3 de XP de crafteo), Inventive, Mason, Target Shooter, Tinkerer, Whittler y Bushcrafter.
- [ ] **Rasgos eliminados [B42]**: Lucky y Unlucky (±10 % de botín), los rasgos de peso y los de bebedor.
- [ ] **Rasgos más baratos [B42]**: Low Thirst pasa de −6 a −2 y Slow Healer de +6 a +3 ([PZwiki: Traits](https://pzwiki.net/wiki/Traits); [B41 Traits](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Traits)).
- [ ] **Ocupaciones [B42]**: 24 en total. Son nuevas Blacksmith, Tailor, Welder (antes Metalworker), DIY Expert (antes Repairman), Rancher, Crop Farmer y Fishing Guide.
  - Dan más niveles concentrados: Doctor +6 en First Aid y Electrician +5, contra +3 en B41 ([PZwiki: Occupation](https://pzwiki.net/wiki/Occupation); [B41 Occupation](https://web.archive.org/web/20241101/https://pzwiki.net/wiki/Occupation)).
  - **[conflicto]** La tabla B42 dice "needs verification" y las guías externas dan puntos distintos. El parche 42.16 cambió costos ([XGamingServer](https://xgamingserver.com/blog/project-zomboid-traits-occupations-guide/)).

### 2.7 Skills, XP, libros y TV

- [ ] **Escala de 0 a 10**:
  - Una skill normal necesita 75 → 9000 XP por nivel, 32.775 en total.
  - Las físicas (Strength y Fitness) necesitan 1500 → 150.000 ([PZwiki: Skills](https://pzwiki.net/wiki/Skills)).
- [ ] **Lista [B42], unas 30 skills**:
  - Agility: Running, Lightfooted, Nimble, Sneaking.
  - Combate: Axe, Long/Short Blade, Long/Short Blunt, Spear, Maintenance.
  - Armas de fuego: Aiming, Reloading.
  - Crafteo: Blacksmithing, Carpentry, Carving, Cooking, Electrical, Glassmaking, Knapping, Masonry, Mechanics, Pottery, Tailoring, Welding.
  - Campo: Agriculture, Animal Care, Butchering.
  - Supervivencia: First Aid, Fishing, Foraging, Tracking, Trapping.
  - **[B41]** No existían Blacksmithing, Carving, Glassmaking, Knapping, Masonry, Pottery, Animal Care, Butchering ni Tracking. Farming, Metalworking y Sprinting cambiaron de nombre.
- [ ] **Libros de habilidad**: 5 tomos por skill, cada uno cubre 2 niveles.
  - Multiplican la XP ×3, ×5, ×8, ×12 y ×16, en proporción a cuánto leíste.
  - Hay que leerlos con el nivel justo. Se lee a unos 2 min de juego por página (de 7 a 12 h por libro).
  - Con libros, llegar a nivel 10 pasa de 32.775 XP a unas 2754 ([PZwiki: Skill books](https://pzwiki.net/wiki/Skill_books)).
- [ ] **Freno a las armas de fuego**: Aiming y Reloading tienen libros más débiles y desde el nivel 5 su XP baja al 37 %.
- [ ] **TV y VHS**: el canal "Life and Living" da XP pasiva de cocina, carpintería y supervivencia, pero necesita electricidad. **[B42]** Lo que se gana con TV/VHS en Carpentry tiene tope en nivel 3 ([PZwiki: Television](https://pzwiki.net/wiki/Television); [PZwiki: Carpentry](https://pzwiki.net/wiki/Carpentry)).
- [ ] **Ejercicio**: las flexiones dan 6 XP de Strength y las sentadillas 4 de Fitness. Duele unas 12 h después ([PZwiki: Exercise](https://pzwiki.net/wiki/Exercise)).

---

## 3. Zombies y combate: el ruido decide quién vive

### 3.1 Percepción e IA

- [ ] **Prioridades del zombi**: primero la presa que ve, después el ruido (también los "naturales", como un trueno), y si no hay nada, deambula.
  - Al ver a alguien va en línea recta: rompe ventanas, golpea puertas y atraviesa la vegetación ([PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)).
- [ ] **Radio y volumen son cosas distintas**. El radio es quién oye el ruido; el volumen es cuánto atrae.
  - Una sirena de auto tiene radio 100 y volumen 60, así que un zombi puede ignorarla para seguir a alguien que tose ([PZwiki: Noise](https://pzwiki.net/wiki/Noise)).
- [ ] **Memoria**: es el tiempo que persigue antes de rendirse.
  - **[sin verificar]** Un modder encontró valores internos de 1250, 800, 500 y 25 para Long, Normal, Short y None ([Indie Stone Forums](https://theindiestone.com/forums/index.php?%2Ftopic%2F66643-changing-zombies-sighthearingmemory-dynamically%2F=)).
- [ ] **Olfato**: no hay uno documentado en vanilla.
- [ ] **Visión de noche**: las fuentes de luz atraen zombis ([PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)).
- [ ] **Zombie Lore (sandbox)**, con los valores por defecto de Apocalypse en negrita ([PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)):
  - Speed: Sprinters / **Fast Shamblers** / Shamblers / Random.
  - Strength: Superhuman / **Normal** / Weak / Random.
  - Toughness: Tough / **Normal** / Fragile / Random.
  - Cognition: abren puertas / navegan / **navegación básica** / Random.
  - Memory, Sight y Hearing: tres o cuatro grados cada uno.
  - Crawl Under Vehicle: **Often**.
  - Interruptores:
    - Drag Down (encendido): un grupo te tira al suelo.
    - Fence Lunge (encendido).
    - Fake Dead: algunos se hacen los muertos.
    - Rear Vulnerability: **High**.
    - Day/Night Active: **Both**.
    - Environmental Attacks: apagado.
    - Damage Construction: encendido.
  - **[conflicto]** En B42, Sight y Hearing vendrían por defecto en "Random between Normal and Poor" ([DoomHosting](https://www.doomhosting.com/help/articles/project-zomboid-sandbox-settings-explained)).
  - **[conflicto]** Zombie House Alarm: apagado según pzwiki, encendido según pzfans 42.19 ([pzfans](https://pzfans.com/what-attracts-zombies-to-bases/)).
- [ ] **Tipos de zombi**:
  - Reptantes (crawlers): van a 1/5 de la velocidad, no retroceden con un golpe no letal y su abalanzo hiere más.
  - Corredores (sprinters): tropiezan y te frenan al agarrarte.
  - Zombis con el uniforme de su zona: policías, presos.
  - "Survivor zombies" con mochilas, comida y mapas anotados, y zombis con armas clavadas.
  - No habrá zombis niños ([PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)).
- [ ] **Física**:
  - Saltan vallas bajas, caen y quedan un momento vulnerables. Varios a la vez rompen la valla. No trepan vallas altas.
  - Un zombi caído no se levanta si tiene algo encima.
  - Rompen una ventana sin barricada en unos 20 minutos de juego.
  - **[B42]** Ragdoll al recibir un auto, un disparo o una explosión ([PZwiki: Zombie](https://pzwiki.net/wiki/Zombie); [PZwiki: Fence](https://pzwiki.net/wiki/Fence); [PZwiki: Window](https://pzwiki.net/wiki/Window); [G2A](https://www.g2a.com/news/features/project-zomboid-build-42-everything-you-need-to-know/)).
- [ ] **Barricadas**:
  - Hasta 4 tablas por lado. Con 3 o más tapan la vista.
  - Vida según la skill: madera 1000 → 1500 HP, barras de metal 3000 → 4500, chapa 5000 → 7500.
  - No se reparan, se reemplazan ([PZwiki: Barricade](https://pzwiki.net/wiki/Barricade)).

### 3.2 Hordas y meta-eventos (el "director sádico")

- [ ] **Dos capas de zombis**: los reales, cerca del jugador y con IA completa, y los virtuales, por celda, que caminan hasta 100 tiles hacia el último sonido oído ([PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)).
- [ ] **Población (Apocalypse)** ([PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)):
  - Multiplicador 1,0, con pico ×1,5 el **día 28**.
  - **Respawn** cada 72 h de hasta el 10 % de la población deseada, solo en celdas que nadie vio en 16 h.
  - Redistribución cada 12 h dentro de la misma celda.
  - **Rally groups** de 20 zombis con un líder.
  - Distribución urbana.
  - **[conflicto menor]** Otra página de la wiki habla de un pico a los ~30 días ([PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)).
- [ ] **Meta Event**: hasta una vez por día suenan disparos, gritos o perros lejanos que mueven hordas. Seguir el sonido no lleva a ningún lado ([PZwiki: Metagame](https://pzwiki.net/wiki/Metagame)).
  - **[conflicto]** No está claro si genera zombis o solo mueve los que ya hay ([Steam](https://steamcommunity.com/app/108600/discussions/0/4811511685075336309/)).
- [ ] **Helicóptero**: es un objeto invisible con ruido 500.
  - Por defecto pasa una sola vez entre los días 6 y 9, de 9 a 18 h. La radio lo avisa a las 7.
  - Si te ve, se queda 60 s reales encima tuyo y arrastra hordas.
  - Para escapar: quedarte adentro con cortinas, mejor en un sótano, o huir en auto ([PZwiki: Helicopter](https://pzwiki.net/wiki/Helicopter)).
  - **[conflicto]** pzfans dice días 6–10 en B42, con varias pasadas ese día ([pzfans](https://pzfans.com/hovering_doom_surviving_project_zomboid_build_42s_helicopter_event/)).
- [ ] **Alarmas**: la de casa hace ruido 600 y la de auto 150 ([PZwiki: Noise](https://pzwiki.net/wiki/Noise)).

### 3.3 Cuerpo a cuerpo

- [ ] **7 categorías**: axe, long blunt, short blunt, long blade, short blade, spear e improvisadas.
  - Un arma de dos manos usada con una hace −50 % de daño.
  - **Si el zombi está más cerca que el alcance mínimo, el golpe se vuelve empujón (shove)** ([PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)).
- [ ] **Daño**: el mínimo-máximo del arma se multiplica por:
  - Strength (75 → 125 %).
  - La skill del arma (de 30 a 130 %, más +10 % en nivel 3 y +20 % en nivel 7 para hacha, long blunt y lanza).
  - Las penalizaciones de los moodles.
- [ ] **Crítico**: +3 % por nivel, entre un mínimo de 10 % y un máximo de 90 % ([PZwiki: Skills](https://pzwiki.net/wiki/Skills); [Steam Guide v41.56](https://steamcommunity.com/sharedfiles/filedetails/?id=2644480496)).
- [ ] **Resistencia**: proporcional al peso del arma. El hacha de leñador la multiplica por 3 y el mazo por 4. Si el golpe sobra mucho para matar ("overkill"), gasta −80 % ([Steam Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2644480496)).
- [ ] **Durabilidad**: cada golpe tiene 1 chance en (ConditionLowerChance + mod de Maintenance × 2) de gastar un punto.
  - Ejemplo: la palanca (crowbar) aguanta unos 1050 golpes ([PZwiki: Maintenance](https://pzwiki.net/wiki/Maintenance); [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)).
- [ ] **Golpes especiales**:
  - Puñalada en la mandíbula (jaw stab) con hoja corta: mata al instante, pero solo si hay un único zombi cerca.
  - Puñalada por la espalda en sigilo: mata al instante.
  - Carga con lanza al esprintar ([Steam Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2644480496); [PZwiki: Short Blade](https://pzwiki.net/wiki/Short_Blade)).
- [ ] **Empujar, pisar y rematar**: el empujón tira al zombi y el pisotón no gasta el arma ([pzfans](https://pzfans.com/knock_tactics_breakdown_build_41_vs_42_zomboid_secrets/)).
  - **[sin verificar]** Un golpe en la cabeza a un zombi caído haría ×3 de daño.
- [ ] **Multi-hit**: es opción de sandbox, apagada en Apocalypse. **[B42]** Algunas armas fabricadas lo traen de serie: Barbell 3 objetivos, Bucket Maul 4 ([PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)).
- [ ] **Armas por partes [B42]**: mango, cabeza y filo se gastan por separado, y la cabeza se puede caer ([BisectHosting](https://www.bisecthosting.com/blog/project-zomboid-build-42-20-patch-notes-stable-version-new-features-changes-content)).

### 3.4 Armas de fuego y explosivos

- [ ] **Ruido**:
  - **Ningún arma suena menos de 60**: revólver 60, M9 100, M16 150, escopetas 200. Caminar hace 7.
  - Disparar es decidir atraer a la horda. No hay silenciador en vanilla ([PZwiki: Firearm](https://pzwiki.net/wiki/Firearm); [pzfans](https://pzfans.com/what-attracts-zombies-to-bases/)).
- [ ] **Ejemplos**:
  - M9: 15 balas, precisión 50 % +4 % por nivel.
  - JS-2000 (escopeta): 6 balas, crítico 70 %.
  - M14: alcance 40.
  - Accesorios: miras ×2, ×4 y ×8, láser, linterna, choke.
- [ ] **Aiming** mejora precisión, crítico, alcance, ángulo y retroceso. Desde el nivel 6 el pánico ya no afecta al disparo ([PZwiki: Aiming](https://pzwiki.net/wiki/Aiming)).
- [ ] **Cambios en [B42]**:
  - Chau auto-apuntado: hay una retícula cuyo tamaño muestra la precisión ([Gameluster](https://gameluster.com/project-zomboid-build-42-guide-the-new-aiming-system-explained/)).
  - **[B42.13+]** Se prioriza el disparo a la cabeza, y en la 42.20 se puede apuntar a partes del cuerpo.
  - Armas nuevas: L92 y JS-3T ([BisectHosting](https://www.bisecthosting.com/blog/project-zomboid-build-42-20-patch-notes-stable-version-new-features-changes-content)).
  - **[B42.15]** Se activan los encasquillamientos (jamming); después bajaron la tasa ([PCGamesN](https://www.pcgamesn.com/project-zomboid/gun-jamming-fix)).
- [ ] **Explosivos**:
  - Pipe bomb: radio 7, hace más daño al jugador que a los zombis.
  - Molotov: radio 4.
  - Noise maker.
  - Variantes con sensor, temporizador o control remoto ([PZwiki: Explosives](https://pzwiki.net/wiki/Explosives)).
  - Las trampas del juego son de caza, no para zombis ([PZwiki: Trap](https://pzwiki.net/wiki/Trap)).

### 3.5 Sonido y sigilo

- [ ] **Tabla de ruido** ([PZwiki: Noise](https://pzwiki.net/wiki/Noise)):
  - Movimiento: caminar 7, esprintar 14, agachado 3,5.
  - Voz: gritar 30, estornudar o toser 40.
  - Construir 15, generador 20–25, zombi golpeando una puerta 20.
  - Vehículos: motor 55–220, bocina 150.
  - Eventos: alarma de casa 600, helicóptero 500.
  - Paredes, puertas y distancia amortiguan el ruido.
- [ ] **Agacharse**: multiplica el ruido por 0,2 y la chance de ser detectado por 0,4. Sneaking 10 lleva el ruido efectivo al 8 % ([PZwiki: Sneaking](https://pzwiki.net/wiki/Sneaking)).
- [ ] **Lightfooted** baja el ruido de pasos de 99 % a 20 %, y **Nimble** de 100 % a 50 % ([PZwiki: Lightfooted](https://pzwiki.net/wiki/Lightfooted); [PZwiki: Nimble](https://pzwiki.net/wiki/Nimble)).
  - **[sin verificar]** Que se multipliquen entre sí es una inferencia.
- [ ] **Visibilidad**: Inconspicuous ×0,5, Conspicuous ×2, Cat's Eyes, Keen Hearing.
  - Las cortinas tapan la línea de visión pero no el ruido ([PZwiki: Window](https://pzwiki.net/wiki/Window)).
- [ ] **Animales [B42]**: su ruido atrae zombis, pero los zombis no los atacan ([PZwiki: Animal](https://pzwiki.net/wiki/Animal)).
  - **[sin verificar]** Osos agresivos ([supercraft](https://www.supercraft.host/wiki/project-zomboid/pz_b42_animal_husbandry_server_guide)).

---

## 4. Objetos, inventario y crafteo: de saquear a producir

### 4.1 Inventario por peso, no por casillas

- [ ] **Capacidad**: cada objeto tiene un valor de carga.
  - **[conflicto]** La página Inventory da 8 de límite base. La página Strength da 12 con Strength 5 (la escala va de 6 a 20 entre Strength 0 y 10) ([PZwiki: Inventory](https://pzwiki.net/wiki/Inventory); [PZwiki: Strength](https://pzwiki.net/wiki/Strength)).
  - **[sin verificar]** Tope rígido de 50, según un foro ([Steam](https://steamcommunity.com/app/108600/discussions/0/3826413307970131587/?ctp=2)).
- [ ] **Lo que tenés en la mano pesa el 30 %** ([PZwiki: Inventory](https://pzwiki.net/wiki/Inventory)).
- [ ] **Saquear lleva tiempo**: cada transferencia muestra una barra de progreso, y Dextrous la acelera ×2 ([PZwiki: Inventory](https://pzwiki.net/wiki/Inventory)).
- [ ] **Bolsas**: tienen capacidad y un % de reducción de peso que **solo vale si la llevás equipada**. Restan velocidad de movimiento (−1 a −6 %) y suman ranuras de hotbar ([PZwiki: Container](https://pzwiki.net/wiki/Container)).
  - **[B42.19]** Valores según pzfans: Military Backpack 28 / 85 %, Big Hiking 22 / 80 %, Duffel 18 / 65 %, Garbage Bag 20 / 50 % ([pzfans](https://pzfans.com/item-bag-list/)).
  - Organized multiplica la capacidad ×1,3 y Disorganized ×0,7.
  - **[B42]** Hay bolsas fabricables (framepacks, sling bags).
- [ ] **Durabilidad y reparación**: al llegar a 0 el objeto se rompe para siempre.
  - Reparar puede fallar, y si falla lo daña más. Cada reparación rinde menos que la anterior.
  - Las armas de fuego se reparan canibalizando otra igual ([PZwiki: Durability](https://pzwiki.net/wiki/Durability)).
- [ ] **Muebles (moveables)**: se levantan con chance de romperse, que baja con la skill. Los grandes se dividen en partes. Un generador pesa 40 y se lleva en brazos ([PZwiki: Furniture](https://pzwiki.net/wiki/Furniture); [PZwiki: Generator](https://pzwiki.net/wiki/Generator)).
- [ ] **Llaves**: cada una abre puertas específicas, que se resaltan. Aparecen en zombis cerca del edificio y se pueden copiar ([PZwiki: Key](https://pzwiki.net/wiki/Key)).

### 4.2 Botín

- [ ] **Procedural**: el botín se genera al cargar el contenedor.
  - Se arma con listas por tipo de habitación y de contenedor, con tiradas.
  - **Más densidad de zombis da más botín**, así que el riesgo trae recompensa ([PZwiki: Procedural distributions](https://pzwiki.net/wiki/Procedural_distributions)).
- [ ] **Estado al aparecer**: comida podrida (75 % de las veces si tiene `isRotten`), ropa sucia o agujereada, filos gastados.
- [ ] **Rareza**:
  - **[B41]** Siete niveles por categoría, de None a Abundant ([PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)).
  - **[B42]** Multiplicadores decimales ([build42guide](https://build42guide.wiki/multiplayer/build-42-sandbox-settings)).
- [ ] **Respawn de botín**: viene apagado.
  - **[B41]** Cada día, semana o mes, solo en pueblos.
  - **[B42]** Temporizador en horas. MaxItemsForLootRespawn = 5.
  - **[conflicto]** El valor por defecto en B42 sería apagado o 1 h, según la fuente ([pzfans](https://pzfans.com/how-to-set-loot-respawn-in-project-zomboid/); [winternode](https://winternode.com/blog/project-zomboid/server-settings-explained)).
- [ ] **Casas especiales y mapas**: casas aleatorias (alijos, quemadas, con cadáveres) y mapas anotados por supervivientes ([PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)).
- [ ] **Sótanos procedurales [B42]**: una nueva zona de botín ([logicservers](https://logicservers.com/blog/project-zomboid-build-42-is-now-stable)).

### 4.3 Comida, agua y cocina

- [ ] **Frescura**: la comida pasa de Fresh a Stale y de ahí a Rotten. Comerla podrida enferma.
  - La lata cerrada no vence, pero necesita abrelatas ([PZwiki: Food](https://pzwiki.net/wiki/Food)).
- [ ] **Frío**: la heladera multiplica ×5 la duración. El freezer ×50 según la página Food, pero **[conflicto]** ×25 según la página Fridge ([PZwiki: Fridge](https://pzwiki.net/wiki/Fridge)).
  - **[42.21]** Sin luz, la heladera se calienta de a poco ([NoLimit Host](https://nolimit.host/blog/zomboid/zomboid-42-21-patch-notes)).
- [ ] **Agua**:
  - La de lluvia, ríos y charcos está contaminada (tainted): hay que hervirla.
  - El pozo es la única fuente limpia después del corte.
  - El colector de lluvia (Carpentry 5) guarda 600 L ([PZwiki: Water](https://pzwiki.net/wiki/Water); [PZwiki: Rain collector barrel](https://pzwiki.net/wiki/Rain_collector_barrel)).
  - **[B42]** Sistema de fluidos: cualquier recipiente lleva cualquier líquido, y los líquidos se mezclan ([PZwiki: Fluid container](https://pzwiki.net/wiki/Fluid_container)).
- [ ] **Recetas evolutivas**: partís de una base (olla, pan, bol) y le sumás ingredientes.
  - Cada ingrediente nuevo da −5 de aburrimiento. Repetir el mismo penaliza.
  - El plato hereda la edad de la base: cocinar sirve para salvar lo que está por vencer ([PZwiki: Evolved recipes](https://pzwiki.net/wiki/Evolved_recipes)).
- [ ] **Cooking**:
  - Desde nivel 7 se puede usar comida podrida.
  - Se pueden envenenar comidas con lavandina (lejía).
  - **[B42]** Recetas con utensilios, por ejemplo despresar un pollo o hacer masa de pan ([PZwiki: Cooking](https://pzwiki.net/wiki/Cooking)).
- [ ] **Fuentes de calor**: horno (pide electricidad), parrilla, fogata con 3 piedras ([PZwiki: Campfire](https://pzwiki.net/wiki/Campfire)).
- [ ] **Conservas [B42]**: frascos de verduras, con Cooking 8 o una revista ([build42guide](https://build42guide.wiki/crafting/build-42-recipes)).

### 4.4 Producción renovable

- [ ] **Agricultura (Farming [B41] / Agriculture [B42])**:
  - Pasos: limpiar, cavar, sembrar, regar, curar, cosechar.
  - Hasta 7 fases. **Las semillas solo salen en la fase 7.**
  - Agua: con 10 % de déficit la planta crece más lento, con 30 % se frena y con más de 30 % muere.
  - Plagas: mildiu, moscas, babosas, pulgones.
  - **[B42]** Estaciones con meses buenos, pobres y malos, y cultivos "malditos". Unos 32 cultivos según pzfans.
  - La XP solo se gana al cosechar.
  - El compost tarda unas 2 semanas ([PZwiki: Agriculture](https://pzwiki.net/wiki/Agriculture); [pzfans](https://pzfans.com/project_zomboid_build_42_--_the_next_chapter_of_the_apocalypse/)).
- [ ] **Recolección (Foraging)**:
  - Un modo de búsqueda difumina la pantalla salvo un radio de 3 a 10 tiles.
  - La lluvia y la oscuridad penalizan. Se puede elegir un foco por categoría.
  - Hay temporadas: la leña rinde +50 % en otoño.
  - Las bayas y hongos venenosos bajan con el nivel ([PZwiki: Foraging](https://pzwiki.net/wiki/Foraging)).
- [ ] **Pesca**: caña más carnada, y se pesca mejor al amanecer y al atardecer.
  - **[B42]** Minijuego de tensión del sedal, salpicaduras que muestran dónde hay peces y chum para atraerlos ([PZwiki: Fishing](https://pzwiki.net/wiki/Fishing)).
- [ ] **Trampas**: hay que poner carnada y alejarse más de 75 tiles por al menos 1 h. Cada animal tiene su zona y su horario ([PZwiki: Trapping](https://pzwiki.net/wiki/Trapping)).
- [ ] **Animales [B42]**:
  - Especies: vaca, cerdo, oveja, gallina, pavo, conejo, ciervo, mapache, rata y ratón.
  - Tienen raza, sexo, edad, hambre, sed y **genética con alelos y consanguinidad**.
  - No se infectan.
  - **[sin verificar]** No hay caballos ([PZwiki: Animals](https://pzwiki.net/wiki/Animals); [pzfans](https://pzfans.com/pages/project_zomboid_livestock_guide/)).
  - Skills asociadas:
    - Animal Care: se sube ordeñando y esquilando.
    - Butchering: con gancho da cuero y más carne.
    - Tracking: huellas en el modo de búsqueda ([PZwiki: Butchering](https://pzwiki.net/wiki/Butchering); [PZwiki: Tracking](https://pzwiki.net/wiki/Tracking)).

### 4.5 Construcción, electricidad, mecánica y costura

- [ ] **Carpintería**: martillo, clavos y tablas. Un tronco da 3 tablas.
  - Las paredes se construyen por etapas, y los zombis trepan los marcos ([PZwiki: Carpentry](https://pzwiki.net/wiki/Carpentry)).
- [ ] **Soldadura (Metalworking [B41] → Welding [B42])**: soplete y máscara.
  - **[B42]** Ya no da XP desarmar muebles de metal. La progresión es desguazar autos, después barras, después chapa ([PZwiki: Welding](https://pzwiki.net/wiki/Welding)).
- [ ] **Generador**:
  - Conectarlo pide Electrical 3 o una revista.
  - Alcanza 20 tiles y ±3 pisos.
  - Con 10 L y una carga típica dura unos 18,7 días.
  - Bajo techo intoxica. Con condición de 20 % o menos puede explotar ([PZwiki: Generator](https://pzwiki.net/wiki/Generator)).
- [ ] **Mecánica**: menú del capó para instalar y reparar piezas. Si fallás, dañás la pieza.
  - **[B42]** Hacen falta revistas por tipo de vehículo ([PZwiki: Mechanics](https://pzwiki.net/wiki/Mechanics)).
- [ ] **Costura (Tailoring)**: parches y acolchado de trapo, jean o cuero. En nivel 8 se reparan los agujeros por completo.
  - **[B42]** El hilo ya no sale de romper ropa: se saca con aguja o se hila en una rueca. Se pueden hacer armaduras de cuero y hueso ([PZwiki: Tailoring](https://pzwiki.net/wiki/Tailoring)).
- [ ] **Literatura**: 1270 títulos de libro y revistas que enseñan recetas ([PZwiki: Literature](https://pzwiki.net/wiki/Literature)).

### 4.6 La reforma del crafteo de B42: un árbol tecnológico

- [ ] **Menú de crafteo dedicado (tecla B)**:
  - Categorías, búsqueda y elección de ingredientes.
  - Usa los inventarios cercanos.
  - Algunas recetas piden una estación de trabajo o luz.
  - Las herramientas se gastan.
  - **[B41]** El crafteo era con clic derecho, en cualquier lugar ([PZwiki: Crafting](https://pzwiki.net/wiki/Crafting)).
- [ ] **Formas de aprender recetas**: por profesión o rasgo, con revistas, investigando un objeto (ingeniería inversa) o al subir de nivel ([build42guide](https://build42guide.wiki/crafting/build-42-recipes); [PZwiki: Knapping](https://pzwiki.net/wiki/Knapping)).
- [ ] **Cadena de producción**:
  - **Knapping**: herramientas de sílex.
  - **Carving**: madera y hueso. Una rama da 4 mangos y 4 cucharas.
  - **Pottery**: arcilla y horno (kiln). Hace los moldes y crisoles.
  - **Masonry**: piedra, ladrillo, cemento.
  - **Blacksmithing**: carbón, horno de fundición, fragua y yunque. Llega a armaduras de placas y espadas. Es una skill de "semanas o meses".
  - **Glassmaking**.
  - ([PZwiki: Carving](https://pzwiki.net/wiki/Carving); [PZwiki: Pottery](https://pzwiki.net/wiki/Pottery); [PZwiki: Masonry](https://pzwiki.net/wiki/Masonry); [PZwiki: Blacksmithing](https://pzwiki.net/wiki/Blacksmithing); [PZwiki: Glassmaking](https://pzwiki.net/wiki/Glassmaking))
- [ ] **Interdependencias**: Pottery hace los moldes que la herrería necesita, y Carving hace los mangos. La producción queda atada a la base, a diferencia del crafteo portátil de B41.
  - **[sin verificar]** Las cantidades exactas por receta salen de guías de fans ([build42guide](https://build42guide.wiki/crafting/build-42-recipes)).
- [ ] **Otras novedades [B42]**: arrastrar cadáveres (cansa y deja un rastro de sangre), diarios y folletos que se pueden leer, y transferencias de inventario controladas por el servidor en multijugador ([pzfans](https://pzfans.com/project_zomboid_build_42_--_the_next_chapter_of_the_apocalypse/)).

---

## 5. Mundo y simulación: un reloj que juega en tu contra

- [ ] **Mapa**:
  - **[B41]** Celdas de 300×300 tiles.
  - **[B42]** Celdas de 256×256 y un mapa jugable de aproximadamente el doble. Pasa de unos 20.000 a unos 35.000 tiles y tiene unos 1400 edificios únicos ([Nexus](https://www.nexusmods.com/projectzomboid/mods/337); [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/)).
  - **[sin verificar]** Las cifras vienen de fuentes de comunidad.
- [ ] **Pueblos [B42]**:
  - Nuevos: Irvington, Brandenburg y Echo Creek.
  - Rehechos: Riverside, West Point, Rosewood, Muldraugh y otros.
  - ([PCGamesN](https://pcgamesn.com/project-zomboid/build-42-unstable-launch); [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/))
- [ ] **Altura [B42]**: se quitó el límite, así que hay sótanos y edificios altos ([supercraft](https://supercraft.host/wiki/project-zomboid/build_42_news/)).
  - **[sin verificar]** Rascacielos de 32 pisos en Louisville ([LogicServers](https://logicservers.com/blog/project-zomboid-build-42-is-now-stable)).
  - **[sin verificar]** 400 sótanos procedurales y 75 hechos a mano.
- [ ] **Luz [B42]**: hay zonas con oscuridad total, donde hace falta una linterna ([PCGamesN](https://pcgamesn.com/project-zomboid/build-42-unstable-launch)).
- [ ] **Sistemas de base**: línea de visión, iluminación, sonido, día y noche, clima y estaciones ([Steam](https://store.steampowered.com/app/108600/Project_Zomboid/)).
- [ ] **Corte de servicios**: el agua y la luz se cortan en un rango configurable. Sin luz no andan los surtidores ni las heladeras ([xgamingserver](https://xgamingserver.com/docs/project-zomboid/water-electricity)).
  - **[conflicto]** Por defecto sería 0–30 días o 0–2 meses, según la fuente ([Indifferent Broccoli](https://wiki.indifferentbroccoli.com/ProjectZomboid/AllSandboxSettings)).
- [ ] **Fauna [B42]**: de granja y salvaje ([PCGamesN](https://pcgamesn.com/project-zomboid/build-42-unstable-launch)).
- [ ] **Lore por radio y TV**: la Guardia Nacional, la ley marcial y la radio de emergencia que avisa del helicóptero ([ProGameGuides](https://progameguides.com/project-zomboid/project-zomboid-lore-everything-we-know/)).
- [ ] **Sin fuente en las notas**: erosión y vegetación que crece, escala de tiempo (1 hora real = 1 día de juego), detalle del clima y lista de emisoras. Las notas los marcan como "conocimiento previo, no verificado", así que conviene confirmarlos en el juego.

### 5.1 Vehículos

- [ ] **Física**: hay "vehicles with physics" ([Steam](https://store.steampowered.com/app/108600/Project_Zomboid/)).
- [ ] **Arranque sin llave (hotwiring)**: pide Electrical 1 y Mechanics 2, o el rasgo Burglar. Puede disparar la alarma ([pzfans](https://pzfans.com/how-to-hotwire-vehicles-cars-in-project-zomboid/)).
- [ ] **Estado del auto**: cada pieza tiene su condición. Hay que revisar nafta, batería, motor y cubiertas ([pzfans](https://pzfans.com/how-to-find-and-use-a-car-key-in-project-zomboid/)).
- [ ] **Combustible**: el baúl necesita llave. Sin luz, los surtidores no funcionan y queda sifonear ([xgamingserver](https://xgamingserver.com/blog/project-zomboid-vehicles-guide/)).
- [ ] **Ruido**: los motores hacen 55–220 y la bocina 150. Hay un multiplicador de sandbox ([PZwiki: Noise](https://pzwiki.net/wiki/Noise)).
- [ ] **[B42]** No hay novedades grandes de vehículos, solo arreglos de multijugador ([Indie Stone forums](https://theindiestone.com/forums/topic/101693-4221-patch-notes/)).

---

## 6. Modos de juego

- [ ] **Presets [B42]** **[conflicto]**:
  - Steam lista "Outbreak, Rising, Apocalypse, Extinction, and Challenge scenarios" ([Steam](https://store.steampowered.com/app/108600/Project_Zomboid/)).
  - pzfans los describe así ([pzfans](https://pzfans.com/apocalypse_vs_survivor_b41-42_zombie_survival_face-off/)):
    - Rising: el más fácil.
    - Outbreak: con multi-hit, minimapa y más XP.
    - Apocalypse: el canónico duro.
    - Extinction: zombis sobrehumanos, respawn y poca munición.
  - build42guide (42.20) dice en cambio que siguen Apocalypse, Survivor y Builder ([build42guide](https://build42guide.wiki/start/build-42-game-modes)).
- [ ] **Presets [B41]**: Apocalypse, Survivor, Builder y Sandbox.
- [ ] **Desafíos [B42.20]**:
  - Top of the World (nuevo): empezás arriba de un rascacielos.
  - 28 Seconds Later (o "28 Minutes Later"): todos los zombis son corredores.
  - Vuelven A Really CD DA y Winter is Coming.
  - ([build42guide](https://build42guide.wiki/start/build-42-challenge-modes))
- [ ] **Six Months Later**: es el único preset que no empieza en julio ([gamerempire](https://gamerempire.net/project-zomboid-when-does-winter-start/)).
- [ ] **Sandbox**: cientos de parámetros. Fecha y duración del día, servicios, botín, población, meta-eventos, helicóptero, Zombie Lore, vehículos y **[B42]** animales y fluidos ([xgamingserver](https://xgamingserver.com/docs/project-zomboid/sandbox-settings); [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)).
- [ ] **Multijugador**: online, split-screen y cross-platform. **[B42.20.3]** Hasta 254 jugadores ([Steam](https://store.steampowered.com/app/108600/Project_Zomboid/); [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/)).
  - **[sin verificar]** El detalle de PvP, facciones y safehouses en B41 no tiene fuente en las notas.
- [ ] **Muerte permanente**: lema "This is how you died". El juego no tiene final ([Gamer Empire](https://gamerempire.net/project-zomboid-can-you-die-of-old-age/)).

---

## 7. Lo que los jugadores aman y odian

### 7.1 Aman

- [ ] **Historias propias**: partidas largas que terminan "por un solo mordisco o un pescado en mal estado" ([GOG](https://www.gog.com/en/game/project_zomboid?page=5)).
- [ ] **La premisa como diseño**: según GameGeeker, la frase inicial funciona como "entire design philosophy". Le pone 8,5 de nota global y 6,0 en historia, porque no hay trama ([GameGeeker](https://gamegeeker.com/games/project-zomboid-108600/review?market=HK)).
- [ ] **El crafteo de B42**: "the star", "genuinely, quietly thrilling". Del sótano dicen que es "a fortress and a trap in equal measure" ([HostedGG](https://hostedgg.com/blog/project-zomboid-build-42-review)).
  - Los árboles de herrería y alfarería dan una progresión clara, y el menú de construcción es más fácil ([next-stage.fr](https://www.next-stage.fr/2025/11/project-zomboid-build-42-notre-avis-mise-jour-qui-fait-sensation.html)).
- [ ] **Aprender a sobrevivir**: "your first 20 or so characters will die glorious deaths", y después las partidas duran meses ([Steam](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/)).

### 7.2 Odian

- [ ] **El inventario en forma de lista**: "it makes the inventory systems of games from the 90s seem like genius user-friendly works of art" ([Steam: Inventory woes](https://steamcommunity.com/app/108600/discussions/0/3192490350123061624/)).
  - Piden iconos, filtros, ordenar por peso, un muñeco de equipo (paper-doll) y mejores descripciones.
  - El estudio admite que la UI es "clunky, fiddly and slow" ([Steam](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/)).
  - **[sin verificar]** La cita del desarrollador viene de un resumen del buscador.
- [ ] **La curva de aprendizaje**: "Newcomers will die confused, repeatedly, to things they did not know could kill them". Además, en ciudades densas el rendimiento se traba ("stutter") ([HostedGG](https://hostedgg.com/blog/project-zomboid-build-42-review)).
- [ ] **Resistencia y cansancio demasiado castigadores en B42** ([Steam](https://steamcommunity.com/app/108600/discussions/0/595135965842913736)).
- [ ] **Desarrollo lento y sin NPCs** ([KeenGamer ES](https://www.keengamer.com/articles/features/others/project-zomboid-y-las-actualizaciones-a-fuego-lento/); [Supercraft](https://supercraft.host/article/project-zomboid-roadmap-2026/)).
- [ ] **Mando a medias**: moverse y pelear anda bien, pero menús e inventario son torpes. En Steam Deck, abrir el menú radial impide moverse. En B42 el soporte de mando está "incomplete" ([pzfans](https://pzfans.com/zomboid_controller_survival_taming_the_apocalypse_on_gamepad/); [Supercraft](https://supercraft.host/article/project-zomboid-steam-deck-guide-2026/)).
- [ ] **Bugs**: la UI desaparece, y los mods viejos se rompen en B42 ([pzfans](https://pzfans.com/ui_disappeared_zomboid_screen_scares__survival_fixes_b41b42/); [pzfans](https://pzfans.com/build_42_modding_what_works_what_s_broken_and_what_s_worth_it)).

---

## 8. Mods más pedidos: un mapa de lo que le falta al juego

- [ ] **Top del Workshop** (septiembre de 2025):
  1. Common Sense (unos 3,74 millones de suscriptores).
  2. Reload All Mags.
  3. Weapon Condition Indicator.
  4. Authentic Z.
  5. Fuel Side Indicator.

  También son populares Better Sorting, ORGM, Real Night Vision, Superb Survivors y Bandits ([DatHost](https://dathost.net/blog/what-are-the-best-project-zomboid-mods-for-2025)).
- [ ] **Esenciales en B42**: Skill Recovery Journal, True Music, Inventory Tetris, Common Sense, Brita's Weapon Pack, Vanilla Food Expanded, Has Been Read y CleanUI ([Supercraft](https://supercraft.host/wiki/project-zomboid/pz_best_mods_2026/); [Supercraft 2025](https://supercraft.host/wiki/project-zomboid/mods-for-2025)).
- [ ] **NPCs**: Bandits funciona en 42.20 o más. Superb Survivors no está portado ([pzfans](https://pzfans.com/zomboid_npc_mods_in_b42_surviving_the_apocalypse_with_friends/)).
- [ ] **Qué falta según esos mods** (lectura de diseño):

  | Mod | Necesidad que revela |
  |---|---|
  | Common Sense | interacciones lógicas (abrir con palanca, etc.) |
  | Reload All Mags, Better Sorting | acciones en lote, orden |
  | Weapon Condition / Fuel Side / Has Been Read | información visible sin abrir menús |
  | Inventory Tetris, CleanUI | inventario visual y limpio |
  | Skill Recovery Journal | no perder todo al morir |
  | Bandits, Superb Survivors | NPCs humanos |
  | True Music, Authentic Z, Brita's | ambiente, estética y variedad de equipo |

---

## 9. Situación en celular

- [ ] **No hay PZ oficial para móvil**. Lo dice The Indie Stone: "there will never be a Project Zomboid Mobile APK". Los APK que circulan probablemente son falsos o maliciosos ([projectzomboid.com](https://projectzomboid.com/blog/news/2024/01/project-zomboid-mobile/)).
- [ ] **Zomdroid**: un lanzador hecho por fans para Android, sin relación oficial.
  - Corre B41 y B42 hasta la 42.7, con mods.
  - Pide Android 11 y unos 3 GB de RAM libres.
  - Archivado en agosto de 2025.
  - El multijugador viene apagado por miedo a reclamos ([GitHub](https://github.com/liamelui/zomdroid); [ixbt.games](https://ixbt.games/en/news/2025/10/21/v-neoficialnuiu-mobilnuiu-versiiu-project-zomboid-dobavili-multipleer.html)).
  - Que alguien haga ese esfuerzo muestra que hay demanda.
- [ ] **El problema de controles**: PZ exige apretar 2–3 cosas a la vez (postura, encarar, atacar), algo "not possible on a touch screen" ([Steam 2014](https://steamcommunity.com/app/108600/discussions/0/620700960733659206)).
- [ ] **La competencia**:
  - **Mini DayZ**: joystick flotante y ataque automático cuerpo a cuerpo. Moverse tocando la pantalla es errático y el texto es chico ([Pocket Gamer](https://www.pocketgamer.com/mini-day-z/review/); [Common Sense Media](https://www.commonsensemedia.org/app-reviews/mini-dayz-survival-game)).
  - **Last Day on Earth**: joystick a la izquierda y botones a la derecha. El botón de recolectar elige la herramienta solo. Cuesta abrir el inventario en pleno combate. Lo critican por la energía limitada, los temporizadores y el muro de pago ("money trap") ([BlueStacks](https://www.bluestacks.com/blog/game-guides/last-day-earth-survival-pc/surviving-last-day-on-earth-bluestacks-keymapping-tool.html); [Common Sense Media](https://www.commonsensemedia.org/app-reviews/last-day-on-earth-survival)).
  - Otros: Dawn of Zombies, LifeAfter, Grim Soul, Dysmantle ([AppsToPlay](https://www.appstoplay.com/articles/10_games_like_project_zomboid_on_android)).
  - **[sin verificar]** "How You Died", visto en TikTok ([TikTok](https://www.tiktok.com/discover/games-like-project-zomboid-for-mobile)).
- [ ] **Hueco del mercado**: ninguno de esos juegos se acerca a la profundidad de PZ.
  - **[sin verificar]** No hay datos de Google Play (notas, descargas) de la competencia.

---

## 10. Consideraciones legales

- [ ] **Las mecánicas son libres; la expresión no.** En *Tetris Holding v. Xio Interactive* (2012) se decidió que las reglas no se protegen, pero el "look and feel" casi idéntico sí. Xio perdió por eso y por trade dress ([Loeb & Loeb](https://www.loeb.com/en/insights/publications/2012/06/tetris-holding-llc-v-xio-interactive-inc)).
  - *Spry Fox v. Lolapps* (Triple Town contra Yeti Town) aplica el mismo criterio ([Wikipedia](https://en.wikipedia.org/wiki/Spry_Fox,_LLC_v._Lolapps,_Inc.)).
- [ ] **Se puede usar**: hambre, sed y fatiga, heridas por parte del cuerpo, infección con muerte segura, acciones con barra de tiempo, skills que suben con el uso, rasgos por puntos, contenedores y menús contextuales. Esto es una inferencia de las notas, no un consejo legal.
- [ ] **Hay que evitar**:
  - El nombre "Project Zomboid" o "Zomboid", también en la ficha de Google Play.
  - Assets, música y textos literales, como la frase "This is how you died".
  - El mapa de Knox County calcado y la UI copiada.
- [ ] **Riesgo concreto**: The Indie Stone sale activamente contra los "PZ Mobile" falsos, y Zomdroid se autocensuró ([projectzomboid.com](https://projectzomboid.com/blog/news/2024/01/project-zomboid-mobile/); [ixbt.games](https://ixbt.games/en/news/2025/10/21/v-neoficialnuiu-mobilnuiu-versiiu-project-zomboid-dobavili-multipleer.html)).
- [ ] **[sin verificar]** No se comprobó si "Zomboid" es marca registrada ni en qué países. Para un lanzamiento comercial conviene una consulta legal breve.

---

## Qué significa para nuestro juego

**La interfaz es la oportunidad más grande.** Se puede copiar la profundidad de PZ y ganarle en la parte que todos odian, incluido su propio estudio.

- **Inventario**: una grilla de iconos con peso visible, filtros por categoría, orden por peso o estado, paper-doll, "transferir todo" o "transferir categoría", y tooltip al mantener apretado.
- **Indicadores en pantalla**: durabilidad, nafta, "leído" y recargar todos los cargadores. Son justo lo que suman los mods más instalados (Weapon Condition Indicator, Fuel Side Indicator, Has Been Read, Reload All Mags).
- **Por qué importa más en celular**: cada toque cuesta más que un clic.
- **Controles**:
  - La postura de combate como interruptor, en vez de mantener apretado. Eso resuelve el problema de las pulsaciones simultáneas.
  - Autoapuntado opcional dentro de un cono.
  - Un botón contextual que elige la herramienta correcta, como hace LDoE.
  - Un hotbar de 4–6 ranuras para no abrir el inventario en combate, que es la falla documentada de LDoE.
  - Joystick flotante, no moverse tocando la pantalla, que en Mini DayZ resultó errático.
  - Escalado de texto y soporte de mando desde el primer día.

**Conviene copiar el motor de reglas, no la cantidad de contenido.**

- **Estados**: variables de 0 a 100 con 4 umbrales y penalizaciones que se suman, con moodles "aviso" sin efecto directo.
- **Ocupación**: el nivel inicial fija para siempre el multiplicador de XP, así la elección pesa toda la partida.
- **Libros**: multiplicadores por rango de nivel, que premian explorar por encima de grindear.
- **Recetas**: el patrón receta + herramienta + skill + XP + resultado que escala con la skill, igual en todos los sistemas de producción. Eso permite programarlos de forma genérica en Godot.
- **El reloj del mundo**: servicios que se cortan, comida que se pudre, población con pico el día 28 y un helicóptero que castiga quedarse afuera. Empuja de saquear a producir sin necesidad de guion.
- **Ruido con radio y volumen separados, y disparar como decisión estratégica**: es barato de simular y da muchísima tensión.

**Hay que tener cuidado con el realismo que frustra.** La queja por la resistencia de B42, la de la curva de "morís sin saber por qué" y el éxito de Skill Recovery Journal apuntan a lo mismo:

- Pistas contextuales ("esto te puede matar").
- Un diario opcional para conservar habilidades.
- Sesiones cortas con guardado frecuente.

Todo eso sin tocar la muerte permanente, que es parte del atractivo.

**Los diferenciadores que PZ no tiene después de 13 años**:

- **NPCs humanos**: es el pedido número uno, y Bandits o Superb Survivors solo lo cubren a medias.
- **Música y radio con más vida** (lo que aporta True Music).
- **Interacciones de "sentido común" de serie** (lo que aporta Common Sense).
- **Precio premium y sin pay-to-win**: frente a la "money trap" de la competencia en Android, es una diferencia que se ve de lejos.

**En rendimiento y alcance, empezar chico y por capas.**

- PZ ya se traba en ciudades densas de PC, y el único port de fans pide 3 GB de RAM libres.
- La arquitectura de dos capas de PZ (zombis reales cerca, "virtuales" por celda, botín generado al abrir el contenedor) se adapta bien a Android si se suman LOD, instancing y límites dinámicos de hordas.
- Lo legal es simple si se respeta una regla: **mecánicas sí, identidad no**. Región, época, estética 3D, nombre y frase de apertura propios, nada de "Zomboid" en la ficha y una consulta legal antes del lanzamiento comercial.
