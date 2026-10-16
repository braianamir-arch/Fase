# Project Zomboid: mundo, simulación y modos de juego (Build 41 vs Build 42, estado a octubre de 2026)

> Nota metodológica: pzwiki.net, projectzomboid.com (blog oficial) y el wiki de Fandom devolvieron errores 403 o 402 al intentar leerlos en esta sesión. Por eso muchas citas vienen de sitios de comunidad o de hosting (pzfans, supercraft, build42guide.wiki, projectzomboid.wiki, xgamingserver), de prensa (PCGamesN, GameSpot) y de la página de Steam. Las afirmaciones marcadas **[conocimiento previo, no verificado]** salen del conocimiento general del investigador y no tienen fuente web confirmada en esta sesión. Están en "Inferences" para que el redactor decida si las usa.

## 1. ¿Cómo se simula el mundo a lo largo del tiempo (ambientación, mapa, servicios, erosión, eventos)?

### Takeaway
El mundo es un condado ficticio de Kentucky en cuarentena, el Knox Event de julio de 1993, representado en isometría y dividido en celdas (cells) de tiles. Sobre él corre un reloj acelerado con clima, estaciones, corte de servicios (agua y luz, por defecto entre 0 y 30 días), erosión o vegetación que avanza y metaeventos sonoros (helicóptero, disparos, alarmas). Build 42 duplica aproximadamente la superficie jugable, añade sótanos (basements), edificios muy altos, ciudades nuevas (Irvington, Brandenburg, Echo Creek) y una iluminación con oscuridad real.

### Cited Findings
**Ambientación y lore**
- Steam describe el juego como un sandbox de supervivencia zombi en pueblos dentro de la zona de exclusión del Knox Event (Knox Event Exclusion Zone), basado libremente en Kentucky. Se juega sin ayuda externa: saquear, construir, craftear, cultivar y pescar. — [Steam store](https://store.steampowered.com/app/108600/Project_Zomboid/)
- Según una guía de lore de la comunidad, la evacuación fue el 6 de julio de 1993: los militares acordonaron la zona con bloqueos y la partida empieza el 9 de julio. La cepa aérea provoca náuseas y, a los dos días, fiebre alta. — [ProGameGuides (lore)](https://progameguides.com/project-zomboid/project-zomboid-lore-everything-we-know/); [GGServers lore timeline](https://ggservers.com/blog/project-zomboid-lore-timeline/)
- El lore se cuenta sobre todo por radio y TV: la Guardia Nacional se redesplegó para montar la cuarentena y después se anuncian ley marcial y checkpoints en las carreteras principales. Los fans especulan con un laboratorio en Rosewood, pero no hay confirmación. — [ProGameGuides](https://progameguides.com/project-zomboid/project-zomboid-lore-everything-we-know/)
- En B41 y B42 no hay soldados NPC vivos. El ejército solo aparece en la narración ambiental: bases, checkpoints y cadáveres. — [pzfans (National Guard)](https://pzfans.com/project_zomboids_national_guard_what_they_left_behind/)
- Steam lista como trabajo futuro "NPC survivors, the return of Kate and Baldspot, and Knox Event Exclusion Zone expansion". — [Steam store](https://store.steampowered.com/app/108600/Project_Zomboid/)

**Mapa y estructura (B41 → B42)**
- B42 duplica aproximadamente ("roughly doubled") la superficie jugable de Knox County. La biblioteca de tiles pasa de unos 20.000 a unos 35.000 y hay alrededor de 1.400 edificios únicos. — [projectzomboid.wiki Build 42](https://projectzomboid.wiki/updates/build-42/) (fuente comunitaria)
- Pueblos rehechos en B42: Riverside, West Point, Rosewood, Fallas Lake, Muldraugh, Ekron y Dixie. Pueblos nuevos: Irvington, Brandenburg (zona comercial) y Ekron, además de nuevos puntos de interés rurales. — [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/)
- PCGamesN (18/12/2024) cita tres zonas nuevas: Echo Creek, Irvington y Brandenburg. — [PCGamesN B42 unstable](https://pcgamesn.com/project-zomboid/build-42-unstable-launch)
- En el lanzamiento estable, la prensa destaca el mapa "extensively expanded", con cambios fuertes en la Main Street de Rosewood y la Maria Plaza de Riverside. — [PCGamesN stable](https://www.pcgamesn.com/project-zomboid/build-42-stable-build-release)
- Tamaño de celda: B41 y anteriores usaban celdas compiladas de 300x300 tiles. B42 usa celdas "POT" (potencia de dos) de 256x256 tiles. — [Nexus mods tool](https://www.nexusmods.com/projectzomboid/mods/337); [pzfans map size](https://pzfans.com/HowBigIsProjectZomboidMap/)
- B42 elimina los límites de altura anteriores, lo que permite sótanos y edificios muy altos. — [supercraft B42 news](https://supercraft.host/wiki/project-zomboid/build_42_news/)
- Los rascacielos de Louisville llegan hasta 32 plantas en B42. — [LogicServers](https://logicservers.com/blog/project-zomboid-build-42-is-now-stable) (fuente comercial, sin verificar)
- Sótanos en B42: generados aleatoriamente y comunes en edificios rehechos. — [PCGamesN](https://pcgamesn.com/project-zomboid/build-42-unstable-launch). Una fuente comunitaria habla de 400 sótanos procedurales y 75 diseñados a mano en 42.20, con rutas propias de movimiento zombi. — [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/). Otra menciona búnkeres y "panic rooms". — [LogicServers](https://logicservers.com/blog/project-zomboid-build-42-is-now-stable)

**Visión, iluminación y oscuridad**
- Steam lista entre las características los sistemas de línea de visión (line-of-sight), iluminación y sonido, y el ciclo dinámico de día y noche, clima y estaciones. — [Steam store](https://store.steampowered.com/app/108600/Project_Zomboid/)
- En B42 algunas zonas quedan completamente a oscuras y hace falta una fuente de luz para explorarlas. — [PCGamesN](https://pcgamesn.com/project-zomboid/build-42-unstable-launch). La prensa también destaca "improved lighting and atmosphere" en la versión estable. — [PCGamesN stable](https://www.pcgamesn.com/project-zomboid/build-42-stable-build-release)
- En 42.21 se rehace el desvanecimiento y recorte (fade/cutaway) de los árboles XXL. — [PCGamesN 42.21](https://www.pcgamesn.com/project-zomboid/update-42-21-unstable); [Blog oficial 42.21 (título)](https://projectzomboid.com/blog/news/2026/09/re-population-of-the-dead-build-42-21-unstable-released/)

**Corte de servicios (utilities)**
- El corte de agua y de luz se configura en sandbox. Las opciones son: Instant, 0-30 días, 0-2 meses, etc. Según varios jugadores, el valor por defecto en los presets Builder, Survivor y Apocalypse es "0-30 días". — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/3129416400161121902); [xgamingserver water/electricity](https://xgamingserver.com/docs/project-zomboid/water-electricity)
- Hay conflicto entre fuentes. Una guía de servidor da como valor por defecto el 2 (0-2 meses). Indifferent Broccoli da 0-30 días y un modificador de día exacto de 14 por defecto. Existe un valor que deja los servicios encendidos siempre, y se puede fijar un día exacto (por ejemplo, luz el día 14 y agua el 30). — [xgamingserver](https://xgamingserver.com/docs/project-zomboid/water-electricity); [Indifferent Broccoli](https://wiki.indifferentbroccoli.com/ProjectZomboid/AllSandboxSettings)
- Sin electricidad dejan de funcionar los surtidores de gasolina, salvo que haya un generador cerca. Las alternativas son sifonear coches o usar bidones. — [xgamingserver vehicles](https://xgamingserver.com/blog/project-zomboid-vehicles-guide/)
- En 42.21 las neveras se calientan de forma gradual tras el corte de luz. La comida no se estropea de golpe. — [NoLimit Host 42.21](https://nolimit.host/blog/zomboid/zomboid-42-21-patch-notes)

**Metaeventos**
- El helicóptero se añadió en el Build 33. Es una aeronave que se oye pero no se ve: si estás al aire libre te sigue y arrastra hordas hacia ti. Quedarse dentro sin ventanas visibles suele evitar que te fije. Se anuncia por la radio de emergencia (Emergency Broadcast) en un canal aleatorio. — [PZwiki Metagame](https://pzwiki.net/wiki/Metagame) (vía snippet)
- En B42 vanilla suele llegar entre los días 6 y 10, de día, y puede volver varias veces durante ese día. Pasado ese día ya no vuelve. — [pzfans helicopter B42](https://pzfans.com/hovering_doom_surviving_project_zomboid_build_42s_helicopter_event/)
- En el endgame hay jugadores que lo ponen en "Sometimes" para mantener la tensión. — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/595136072544961442/?ctp=3)

**Fauna (B42)**
- B42 añade animales de granja (vacas, cerdos, ovejas y gallinas, con estaciones y alimentación) y salvajes (ciervos, ratas y conejos, con rastreo y caza). — [PCGamesN](https://pcgamesn.com/project-zomboid/build-42-unstable-launch)

### Inferences
- [conocimiento previo, no verificado] Estructura técnica: en B41 cada celda de 300x300 tiles se divide en chunks de 10x10 tiles, que se cargan en streaming alrededor del jugador. B41 permitía 8 plantas por encima del suelo y ninguna por debajo. B42 pasa a chunks de 8x8 y celdas de 256x256, y admite niveles Z negativos (sótanos) y del orden de 32 plantas hacia arriba.
- [conocimiento previo, no verificado] Ciudades de B41: Muldraugh (el inicio "clásico", junto a la carretera 31W), West Point (más grande, a orillas del río), Riverside, Rosewood (pequeña, con estación de bomberos, policía y prisión cercana), March Ridge (añadida en el Build 40, con un búnker militar subterráneo cercano), Louisville (añadida en la 41.51 como gran ciudad amurallada al noreste) y Valley Station. También hay zonas como Fallas Lake y Ekron, que en B41 era muy pequeña. B42 añade Irvington, Brandenburg y Echo Creek.
- [conocimiento previo, no verificado] Vista isométrica: el cono de visión (vision cone) depende de la dirección en que mira el personaje. Lo que queda fuera del cono o detrás de paredes se muestra oscurecido o "recordado" sin actores: los zombis no se ven fuera del campo visual. Los rasgos Eagle Eyed/Short Sighted y la iluminación nocturna modifican el alcance. Los interiores aparecen al cortar paredes y techos.
- [conocimiento previo, no verificado] Escala temporal: el valor por defecto es 1 hora real = 1 día de juego, configurable de 15 minutos a 24 horas. En el juego individual se puede acelerar el tiempo (x1 a x4 y aún más rápido al dormir). Por defecto se empieza el 9 de julio de 1993 a las 9:00 (Six Months Later empieza en diciembre).
- [conocimiento previo, no verificado] Clima (Climate Manager): lluvia, niebla, nieve, tormentas con truenos (el ruido de los truenos atrae zombis), viento, olas de calor y frío. Temperatura y humedad dependen de la estación, que se simula partiendo del clima de Kentucky. La ropa empapada provoca hipotermia y el calor, hipertermia.
- [conocimiento previo, no verificado] Erosión (Erosion system): con el paso de los días crecen hierba, arbustos y árboles jóvenes en el asfalto y las aceras, la enredadera cubre las paredes y aparecen grietas, manchas y basura. En sandbox se ajusta la velocidad, con un valor por defecto de unos 100 días hasta la vegetación máxima, y existe "Erosion Days" para empezar ya erosionado. El efecto es visible pero no destruye estructuras.
- [conocimiento previo, no verificado] Otros metaeventos: disparos lejanos ("gunshots") y gritos que mueven hordas, alarmas de casas al forzar ventanas o puertas (configurables), alarmas de coches, y "sleeping events" (pesadillas o sustos al dormir). Todos se configuran en sandbox ("Meta Events: Never/Sometimes/Often"). La migración de zombis se rige por la acústica: el ruido atrae a la horda.
- [conocimiento previo, no verificado] Emisiones de radio y TV: el Emergency Broadcast System (canal militar con el aviso del helicóptero), Life and Living TV (programas de cocina, carpintería y supervivencia que otorgan XP), noticias (Triple-N / WBLN News) y emisoras de música. La programación se va apagando con los días, al ritmo del colapso del mundo. Las cintas VHS y CD de B41/B42 dan XP o reducen el aburrimiento.

### Gaps
- No pude leer pzwiki ni el blog oficial (error 403): faltan las cifras oficiales de tamaño total del mapa en tiles o celdas para B41 y B42, del rango de días de erosión y de la lista exacta de emisoras.
- No confirmé el número exacto de plantas de los rascacielos de B42, ni las cifras de 400 y 75 sótanos: las dos cosas vienen de fuentes no oficiales.
- No encontré detalle verificable sobre gritos ("screams"), alarmas de casas y su probabilidad, ni sobre la mecánica de niebla y fog of war más allá de la descripción de Steam.

## 2. ¿Qué mecánicas de vehículos existen?

### Takeaway
Los vehículos (desde el Build 38, ampliados en B41) tienen física, combustible, llaves o puenteo (hotwiring), piezas con condición propia, maletero con capacidad, ruido y alarmas. Dependen de la electricidad para repostar en surtidores. B42 mantiene el sistema con correcciones de multijugador.

### Cited Findings
- Steam lista los "vehicles with physics" como característica central. — [Steam store](https://store.steampowered.com/app/108600/Project_Zomboid/)
- Puentear sin llave (hotwiring) exige Electrical 1 y Mechanics 2, o el rasgo Burglar, y hay que estar en el asiento del conductor. Puede disparar la alarma, que atrae zombis. Los coches en mejor estado cuestan más de puentear y puentear no garantiza que arranquen. — [pzfans hotwire](https://pzfans.com/how-to-hotwire-vehicles-cars-in-project-zomboid/); [servers4gamers](https://servers4gamers.com/blog/how-to-hotwire-a-car-in-project-zomboid/)
- La información del vehículo muestra condición general, potencia del motor, batería y condición por pieza. Antes de conducir conviene revisar combustible, batería, motor, capó, neumáticos, suspensión y maletero. — [pzfans car key](https://pzfans.com/how-to-find-and-use-a-car-key-in-project-zomboid/); [bamboogaming](https://www.bamboogaming.net/project-zomboid/vehicles)
- El maletero necesita llave. Se reposta con clic derecho. Los surtidores funcionan al principio y dejan de hacerlo con el corte de luz, salvo que haya un generador. La alternativa es sifonear. — [xgamingserver vehicles](https://xgamingserver.com/blog/project-zomboid-vehicles-guide/)
- Hay remolque de restos y tráileres, pero las fuentes encontradas no dan detalles. — [xgamingserver](https://xgamingserver.com/blog/project-zomboid-vehicles-guide/)
- Parches de B42: la 42.20.1 corrige la desaparición de vehículos al desconectarse otro jugador. La 42.21 corrige la conducción con ping alto en multijugador. — [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/); [Indie Stone forums 42.21](https://theindiestone.com/forums/topic/101693-4221-patch-notes/)

### Inferences
- [conocimiento previo, no verificado] Piezas (B41): motor, batería, depósito de gasolina, alternador implícito, silenciador (muffler: si está dañado, el coche hace más ruido), frenos, suspensión, 4 neumáticos (con presión de aire), parabrisas, ventanillas, puertas, capó, maletero, asientos, luces y radio. Las piezas tienen tamaño (ligero, estándar o pesado y deportivo) y hay que reemplazarlas por otras del mismo tamaño. Reparar exige el skill Mechanics y saber los modelos de coche (las revistas de mecánica enseñan los modelos).
- [conocimiento previo, no verificado] Las llaves aparecen en el contacto, en cadáveres o zombis cercanos, en la casa asociada o en el suelo. Los vehículos se generan en carreteras, aparcamientos y garajes, a veces bloqueados o ya destrozados ("burnt"/"smashed").
- [conocimiento previo, no verificado] Al conducir: el consumo depende de la carga y de las RPM. Atropellar zombis daña la parte frontal y puede herir al conductor. Los accidentes causan lesiones. Con el motor encendido se puede usar la calefacción o el aire acondicionado. La radio del coche sintoniza emisoras. La bocina y el motor hacen ruido que atrae hordas. Se puede dormir en el vehículo. B41 permite remolcar (tow) otro coche con el gancho y enganchar remolques. Hay ambulancias, furgonetas de reparto, camiones de bomberos y de policía con su propio botín.

### Gaps
- No obtuve una lista oficial de piezas, consumos, capacidades de maletero ni de la física de remolque. Tampoco cambios de vehículos en B42 más allá de correcciones de bugs: los anuncios oficiales del B42 no destacan novedades de vehículos.

## 3. ¿Qué modos de juego y opciones sandbox existen?

### Takeaway
B41 ofrece los presets Apocalypse, Survivor y Builder, más Sandbox y varios desafíos (Challenges). Steam y fuentes comunitarias indican que B42 reordena los presets en Outbreak, Rising, Apocalypse y Extinction, aunque hay conflicto entre fuentes, y renueva los desafíos con nuevos como Top of the World y 28 Seconds/Minutes Later. Sandbox expone cientos de parámetros: población y características de los zombis, servicios, botín, tiempo, erosión, eventos y vehículos.

### Cited Findings
- Steam lista los modos "Outbreak, Rising, Apocalypse, Extinction, and Challenge scenarios", además de multijugador online y split-screen local. — [Steam store](https://store.steampowered.com/app/108600/Project_Zomboid/)
- Presets de B42 según pzfans (42.19):
  - Apocalypse: base hardcore canónica, suministros escasos, sin multi-hit, sin respawn.
  - Outbreak: misma letalidad pero con multi-hit, minimapa y más XP y botín.
  - Rising: el más fácil, con zombis lentos y frágiles, mucho material de construcción y respawn activo.
  - Extinction: zombis sobrehumanos y resistentes, respawn activo, algunos abren puertas, heridas más duras y munición muy limitada.

  Según la misma fuente, Survivor y Builder pertenecen a los menús de B41. — [pzfans presets B42](https://pzfans.com/apocalypse_vs_survivor_b41-42_zombie_survival_face-off/); [pzfans comparison](https://pzfans.com/apocalypse-vs-survivor-in-project-zomboid/)
- Fuente en conflicto: build42guide.wiki (42.20, agosto de 2026) dice que B42 conserva Apocalypse ("intended difficulty"), Survivor y Builder, más Custom. Apocalypse y Survivor tienen corte de servicios y helicóptero, que Builder suele relajar. La infección es letal en Apocalypse y a menudo está desactivada en Builder. — [build42guide game modes](https://build42guide.wiki/start/build-42-game-modes)
- Desafíos en 42.20 según build42guide.wiki:
  - Top of the World (nuevo): empiezas en lo alto de un rascacielos.
  - 28 Seconds Later (nuevo, "28 Minutes Later" según PZwiki): todos los zombis corren (sprinters).
  - A Really CD DA (vuelve): empiezas herido, con fiebre, casi desnudo y con el rasgo de lectura CD DA.
  - Winter is Coming (vuelve): empiezas en pleno invierno.

  42.20 retira algunos desafíos antiguos y "Many Years Later" no aparece en la pantalla. — [build42guide challenges](https://build42guide.wiki/start/build-42-challenge-modes)
- Six Months Later es el único preset que no empieza en julio. Según una discusión de Steam, se empieza en Louisville seis meses después del brote. — [gamerempire](https://gamerempire.net/project-zomboid-when-does-winter-start/); [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/3883848697073297883)
- Sandbox: fecha y hora de inicio, duración del día, servicios con día exacto, metaeventos y helicóptero (Never/Once/Sometimes...), población de zombis, etc. — [xgamingserver sandbox](https://xgamingserver.com/docs/project-zomboid/sandbox-settings); [Indifferent Broccoli](https://wiki.indifferentbroccoli.com/ProjectZomboid/AllSandboxSettings)

### Inferences
- [conocimiento previo, no verificado] Desafíos de B41:
  - Last Stand: arena con oleadas y mejoras.
  - Kingsburg ("You Have One Day"/Kingsburg): mapa pequeño y fortificación antes de las oleadas.
  - "A Really Cool Day": empieza en invierno con frío extremo, en variante de B41.
  - "Winter is Coming": empieza el 1 de septiembre (o de noviembre) y llega el invierno.
  - "A Really CD DA": máquina de discos.
  - "Six Months Later": diciembre de 1993, erosión avanzada, servicios cortados, sin helicóptero y sin respawn.
  - "Opening Hours" y "Challenge Hours" no confirmados.
- [conocimiento previo, no verificado] Categorías sandbox de B41:
  - Población (Population: multiplicador, población inicial y pico, día del pico, respawn y migración).
  - Tiempo (Time: duración del día, mes, día y hora de inicio).
  - Mundo (World: agua y luz con modificadores, generador, alarmas, casas cerradas, comida y luz en edificios, botín por categoría, día de erosión).
  - Naturaleza (Nature: temperatura y lluvia, velocidad de erosión, farming, compost, abundancia natural, pesca).
  - Sadistic AI Director: metaeventos, eventos al dormir, frecuencia del helicóptero.
  - Meta: generador, servicios y alarmas.
  - Personaje (Character: XP, multiplicadores, fatiga, nutrición, puntos de rasgo, hambre, infección de heridas, fuerza de los golpes, "All Clothes Unlocked").
  - Vehículos (Vehicles: activados, frecuencia de aparición, probabilidad de gasolina, de llaves y de alarmas, durabilidad del motor, consumo, daño por accidentes, ruido de la sirena, etc.).
  - Zombie Lore: velocidad (Sprinters, Fast Shamblers, Shamblers, Random), fuerza, dureza, transmisión (Blood+Saliva, Saliva, Everyone's Infected, None), mortalidad de la infección, tiempo de reanimación, cognición (abren puertas o no), memoria, vista, oído, olfato, "Crawl Under Vehicle" y el "Zombie House Alarm".
  - Zombie Advanced: migración, redistribución, densidad y tamaño de hordas, "Rally Group".

  B42 añade, entre otras, opciones de animales, sótanos y fluidos.

### Gaps
- No pude verificar la lista oficial exacta de presets de B42: Steam y pzfans dicen Outbreak, Rising, Apocalypse y Extinction, y build42guide dice Apocalypse, Survivor y Builder. Tampoco verifiqué las reglas de Kingsburg, A Really Cool Day ni Last Stand.
- No obtuve la tabla completa de opciones sandbox con valores por defecto: pzwiki dio 403 e Indifferent Broccoli no devolvió contenido.

## 4. ¿Cuál es el roadmap? (estado de B42, NPC del B43, multijugador, guardado, mods)

### Takeaway
La rama inestable de B42 salió el 17 de diciembre de 2024, solo para un jugador. El multijugador llegó a la inestable con la 42.13 en diciembre de 2025. B42 (42.20, "The Big Glow Up") pasó a estable con multijugador el 29 de julio de 2026, con hotfixes hasta la 42.20.4 (26 de agosto de 2026). En septiembre de 2026 apareció la 42.21 en inestable. Los NPC humanos siguen reservados al Build 43, sin fecha, y el 1.0 no tiene ETA.

### Cited Findings
- B42 llegó a la rama inestable el 17 de diciembre de 2024 solo en un jugador. El multijugador entró en la inestable en diciembre de 2025. — [xgamingserver](https://xgamingserver.com/blog/?p=22000); [PCGamesN 18/12/2024](https://pcgamesn.com/project-zomboid/build-42-unstable-launch)
- 42.20 estable salió el 29 de julio de 2026. La prensa lo presenta como "landmark update" y "one of the broadest updates in Project Zomboid's long development history", con el objetivo de llevar al jugador "from improvised fixes towards increasingly ambitious attempts at self-sufficiency". Entre sus novedades:
  - mapa ampliado
  - animales
  - sótanos
  - arrastrar cadáveres
  - pesca, caza y trampas mejoradas
  - armas nuevas
  - sigilo mejorado
  - vallas plegables
  - crafting profundo
  - cambios de modos e interfaz
  - mejor iluminación
  - más lore ambiental

  — [PCGamesN stable](https://www.pcgamesn.com/project-zomboid/build-42-stable-build-release)
- Cronología de versiones:
  - 42.20 ("The Big Glow Up"): 28-29 de julio de 2026.
  - 42.20.1 y 42.20.2: 5 de agosto.
  - 42.20.3: 17 de agosto. Admite hasta 254 jugadores y permite a los administradores entrar en servidores llenos.
  - 42.20.4: 26 de agosto. Hotfix de seguridad que elimina `loadstring`/`loadstream` de Lua.

  Las partidas de la 42.19 no cargan en la 42.20 y las de B41 y B42 no son compatibles entre sí. — [projectzomboid.wiki](https://projectzomboid.wiki/updates/build-42/); [supercraft MP guide](https://supercraft.host/wiki/project-zomboid/pz_b42_mp_patch_stability_guide/)
- La 42.21 (septiembre de 2026), "Re-population of the Dead", es la primera actualización incremental tras B42 y está en Unstable. Corrige:
  - hordas que desaparecían al salir y volver a entrar en un chunk
  - duplicación de zombis en multijugador
  - exploits de safehouse
  - un bypass de autenticación de Steam

  También amplía el anticheat. — [Blog oficial (título/URL)](https://projectzomboid.com/blog/news/2026/09/re-population-of-the-dead-build-42-21-unstable-released/); [PCGamesN](https://www.pcgamesn.com/project-zomboid/update-42-21-unstable); [Gameluster](https://gameluster.com/project-zomboid-42-21-patch/). Conflicto: DoomHosting afirma que la 42.21 pasó a estable el 28 de septiembre de 2026, pero la mayoría de fuentes la sitúa en inestable. — [DoomHosting](https://www.doomhosting.com/blog/project-zomboid-42-21-stable-patch-notes-servers)
- Hay prevista una "Build 42 Support Update" para finales de 2026: optimización, más soporte para mods y funciones que no llegaron a la fecha de corte de la versión estable. — [Resumen de búsqueda sobre supercraft/hostedgg](https://supercraft.host/article/project-zomboid-roadmap-2026/)
- El roadmap de 2022 situaba los NPC en el Build 43, sin decidir aún su tipo. — [GameSpot](https://www.gamespot.com/articles/project-zomboid-2022-roadmap-details-rimworld-like-systems/1100-6499440/). El roadmap de enero de 2024 en PZwiki presenta el Build 43 como "NPC Stage 1" (NPC autónomos y grupos), sin fecha. — [PZwiki Upcoming versions](https://pzwiki.net/wiki/Upcoming_versions) (snippet). Fuentes de 2026 indican que no hay fecha y que no conviene esperar NPC en 2026. — [Supercraft roadmap 2026](https://supercraft.host/article/project-zomboid-roadmap-2026/)
- En 42.21 no hay NPC humanos. La comunidad cubre ese hueco con mods como Bandits y Week One. — [pzfans NPC mods](https://pzfans.com/zomboid_npc_mods_in_b42_surviving_the_apocalypse_with_friends/)
- Steam: 1.0 "no ETA" ("avoid ETAs"). El juego está en Early Access desde el 8 de noviembre de 2013. Precio: 24,99 USD. Cuenta con unas 160.584 reseñas en inglés (93 % positivas), soporte completo de mods Lua con herramientas públicas y Steam Workshop, split-screen local y multijugador cross-platform. — [Steam store](https://store.steampowered.com/app/108600/Project_Zomboid/)

### Inferences
- [conocimiento previo, no verificado] Multijugador de B41: el modo multijugador llegó en diciembre de 2021 (41.60 y siguientes) con servidores dedicados (hasta unos 32 jugadores por defecto, ampliable a 100), co-op host, PvP con toggle por jugador (icono de calavera), facciones con etiqueta, safehouses reclamables (casa propia, con miembros invitados y protección contra el loot de otros), admins, whitelist y SteamID. Hay un lag compensado y animaciones sincronizadas.
- [conocimiento previo, no verificado] Guardado: guardado continuo automático. No hay save-scumming: la muerte es permanente para el personaje (permadeath), aunque el mundo sigue y puedes crear un personaje nuevo en el mismo mundo, que podrá encontrar a su antiguo yo como zombi. En sandbox se puede hacer copia de seguridad manual de la carpeta de guardado.
- [conocimiento previo, no verificado] Mapa y anotaciones: el mapa del mundo se revela al explorar o al leer mapas locales que se encuentran como botín. Admite anotaciones (símbolos, texto y colores) y en B41 hay un minimapa opcional. En multijugador se pueden compartir anotaciones.
- [conocimiento previo, no verificado] Escala del Workshop: decenas de miles de mods, entre ellos mapas (Raven Creek, Bedford Falls...), vehículos (Filibuster Rhymes' Used Cars, KI5), armas (Brita's) y NPC (Superb Survivors, Bandits). Los mods de B41 requieren adaptarse a B42.

### Gaps
- No pude leer el blog oficial (403) para confirmar con texto primario la fecha de la 42.20 estable, el contenido de la Support Update ni declaraciones recientes sobre el Build 43. Las fechas de B42 vienen de prensa (PCGamesN) y de sitios de hosting y comunidad, que son coherentes entre sí.
- No encontré la fuente primaria del límite de 254 jugadores ni el estado actual (octubre de 2026) de la 42.21: el dato sobre si pasó a estable es contradictorio.
- No verifiqué con fuentes de esta sesión las cifras del Workshop, el detalle de facciones, PvP y safehouses de B41, ni el sistema de guardado.
