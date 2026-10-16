# Experiencia de jugador de Project Zomboid (UI/controles, elogios, críticas, mods) y panorama móvil de juegos tipo PZ

Nota de método: unas 16 llamadas (búsquedas y lecturas web) en octubre de 2026. Muchas páginas que aparecen al buscar "PZ mobile" o "games like PZ Android" son spam SEO en dominios ajenos (universidades, gobiernos), y las descarté. La página oficial de noticias de PZ y GameGeeker devolvieron 403, así que su contenido viene de los extractos del buscador. Reddit no apareció en ningún resultado.

## 1. ¿Qué aman y qué odian más los jugadores de PZ? (incluye UI/UX y controles)

### Takeaway
Lo que más se valora es la profundidad sistémica y la narrativa emergente bajo la premisa "This is how you died": la muerte es segura y la partida consiste en aplazarla. Las quejas que más se repiten son la interfaz (inventario en forma de lista larga, que el propio estudio reconoce como "clunky, fiddly and slow"), una curva de aprendizaje muy dura, el rendimiento en zonas urbanas densas, un desarrollo muy lento (13 años de Early Access, Build 42 tardó unos 4–5 años) y la ausencia de NPCs humanos.

### Cited Findings
**Historia y contexto**
- La alpha tech-demo salió el 28 de mayo de 2011. El 15 de octubre de 2011 les robaron dos portátiles con código sin copia de seguridad, lo que causó "severe delays". Entró en Early Access de Steam en noviembre de 2013 (Wikipedia también dice diciembre). En 2014 tuvo un multijugador que luego se retiró por problemas de rendimiento. Build 41 (20 de diciembre de 2021) trajo multijugador renovado, combate actualizado y un sistema de animación refinado, y los jugadores concurrentes subieron mucho — [Wikipedia](https://en.wikipedia.org/wiki/Project_Zomboid)
- Build 42 entró en beta abierta (unstable) el 17 de diciembre de 2024. El 9 de julio de 2026 se anunció como nueva build estable. Incluye animales, la revisión del crafteo y cambios en el mapa — [Wikipedia](https://en.wikipedia.org/wiki/Project_Zomboid)
- El multijugador de B42 llegó a unstable con la 42.13 el 11 de diciembre de 2025. Según Supercraft, la estable actual es la 42.20.3 (17 de agosto de 2026), y según otra fuente la 42.21 está en estable desde el 28 de septiembre de 2026 — [Supercraft roadmap 2026](https://supercraft.host/article/project-zomboid-roadmap-2026/); [HostedGG, estado MP mediados 2026](https://hostedgg.com/blog/project-zomboid-build-42-multiplayer-status) (este artículo, anterior, aún decía que B42 seguía en unstable; las fuentes se contradicen según la fecha)
- Un agregador de baja fiabilidad afirma que tras el lanzamiento completo de B42 hubo un récord de 121.603 jugadores concurrentes en Steam. Sin verificar, conviene confirmarlo en SteamDB — [Berkeley Historical Society (agregador dudoso)](https://berkeleyhistoricalsociety.org/project-zomboid-build-42/)

**Lo que aman**
- GameGeeker sobre la premisa: el juego "greets you with four words that double as its entire design philosophy". Lo plantea como una partida sobre aplazar un final ya escrito. Le da 6.0/10 en historia porque no hay trama ni eventos guionizados (la narrativa queda en manos del jugador) y 8.5 de nota global — [GameGeeker](https://gamegeeker.com/games/project-zomboid-108600/review?market=HK)
- Reseñas de usuarios en GOG: los jugadores crean narrativas emergentes con las mecánicas, y partidas largas terminan "por un solo mordisco o un pescado en mal estado". Otro usuario cuenta que apareció en una casa llena de zombis con gorros de fiesta y murió casi al instante — [GOG reviews](https://www.gog.com/en/game/project_zomboid?page=5)
- HostedGG (8.7/10) sobre B42: el nuevo crafteo es "the star" y "genuinely, quietly thrilling". Del sótano dice que es "a fortress and a trap in equal measure", y la agricultura y los animales dan proyectos a largo plazo. Para el multijugador: "Multiplayer survivalists, base-builders, and emergent-story chasers will find a near-bottomless well here" — [HostedGG review B42](https://hostedgg.com/blog/project-zomboid-build-42-review)
- Next-Stage (Francia): los árboles de herrería y alfarería dan una progresión clara, y el nuevo menú de construcción es mucho más fácil que el anterior — [next-stage.fr](https://www.next-stage.fr/2025/11/project-zomboid-build-42-notre-avis-mise-jour-qui-fait-sensation.html)
- Sobre la curva de aprendizaje, un veterano dice que "your first 20 or so characters will die glorious deaths", y otro que sus partidas ya duran meses frente a días al principio. La dificultad se vive como dominio progresivo — [Steam discussions (resumen de búsqueda)](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/)

**Lo que odian / puntos de dolor**
- Inventario. Hilo "Inventory woes" (enero de 2022), Cress: "it makes the inventory systems of games from the 90s seem like genius user-friendly works of art"; "A giant list is not user-friendly for most usecases"; "More focus on icons, less on text". Otros piden ordenar por peso, se quejan de que la lista es lenta con muchos objetos ligeros, de que una lata abierta aparece al fondo y queda seleccionado otro objeto, y de que "The description for the items is not helpful most of the time". Nattepunt: "Always searching in your list. No proper structure" — [Steam: Inventory woes](https://steamcommunity.com/app/108600/discussions/0/3192490350123061624/)
- Respuesta del desarrollador nasKo: "What is the exact issue you have with the inventory?… It's basically a listed Windows Explorer with containers working similar to folders" — [mismo hilo](https://steamcommunity.com/app/108600/discussions/0/3192490350123061624/)
- Peticiones de jugadores: un panel "paper-doll" para ver el equipo de un vistazo y filtros por categoría (comida, médico, armas, equipado, categorías propias). Según el resumen de búsqueda, un post del desarrollador de 2023 admite que la interfaz es de las áreas más débiles, "not much to look at", a veces "clunky, fiddly and slow", y que estaban probando middleware de UI para hacer viable una revisión. Otros jugadores la ven "fea pero funcional" — [Steam: Better inventory mod?](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/) (no leí el post del desarrollador directamente; viene del resumen del buscador)
- Hay un bug en B41/B42 en el que parte o toda la UI desaparece, en un jugador y en multijugador — [pzfans](https://pzfans.com/ui_disappeared_zomboid_screen_scares__survival_fixes_b41b42/)
- Curva de aprendizaje en B42: "Newcomers will die confused, repeatedly, to things they did not know could kill them". La guía dentro del juego "does not always keep pace with your questions". Rendimiento: "Performance can stutter in the busiest urban zones" — [HostedGG](https://hostedgg.com/blog/project-zomboid-build-42-review)
- Balance en B42 beta: la fatiga y la resistencia se consideran demasiado punitivas. "A minor fight with 6 zombies can leave me completely depleted, forcing me to sleep by noon" — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/595135965842913736)
- Fuentes fan describen B42 como "unstable", con muchas funciones desactivadas o sin integrar, y con mods antiguos rotos — [pzfans B42 modding](https://pzfans.com/build_42_modding_what_works_what_s_broken_and_what_s_worth_it)
- No hay NPCs humanos en B42. Están previstos para Build 43, sin fecha ("do not plan a 2026 NPC launch"). El roadmap habla de "NPC stage one, meta-world simulation, storylets" — [Supercraft roadmap](https://supercraft.host/article/project-zomboid-roadmap-2026/); [projectzomboid.wiki roadmap](https://projectzomboid.wiki/updates/roadmap/)
- Las actualizaciones "a fuego lento" son un tema recurrente en la prensa en español — [KeenGamer ES](https://www.keengamer.com/articles/features/others/project-zomboid-y-las-actualizaciones-a-fuego-lento/)

**Controles / mando / Steam Deck**
- El soporte de mando es parcial pero usable. Movimiento y combate funcionan bien, y menús e inventario son torpes. Muchos combinan mando con teclado y ratón para el inventario. Opiniones sobre el menú radial: "works great with the analog sticks" frente a "menu nav, while walking… extremely unnatural". En Deck, abrir el radial de armas con la cruceta izquierda impide moverse. Los botones traseros L4/R4/L5/R5 no se pueden asignar desde el juego (workaround: mapear la rueda del ratón vía Steam Input). B42 tiene el soporte de mando "incomplete" — [pzfans controller](https://pzfans.com/zomboid_controller_survival_taming_the_apocalypse_on_gamepad/); [Steam thread](https://steamcommunity.com/app/108600/discussions/0/3421060080216979302); [Supercraft Steam Deck 2026](https://supercraft.host/article/project-zomboid-steam-deck-guide-2026/)
- La versión 41.71 (mayo de 2022) trajo mejoras para Steam Deck y mando — [GamingOnLinux](https://gamingonlinux.com/2022/05/project-zomboid-version-4171-out-with-steam-deck-and-controller-upgrades)
- El roadmap restante de 2026 incluye "multiplayer/controller improvements" y optimización — [Supercraft roadmap](https://supercraft.host/article/project-zomboid-roadmap-2026/)

### Inferences
- Lo que hay que replicar o superar es la combinación de simulación profunda, muerte permanente y narrativa emergente. La UI es el punto débil reconocido incluso por el estudio, así que una interfaz moderna (iconos, filtros, paper-doll, ordenación) es la vía más clara para ser "mejor que PZ" sin competir en contenido.
- Arquitectura de UI de PZ (descripción de referencia por conocimiento general, no verificada con fuentes en esta sesión): ventanas flotantes de inventario y contenedores cercanos en lista con pestañas por contenedor, menú contextual con clic derecho para casi todas las acciones, "timed actions" encoladas con barra de progreso sobre el personaje, panel de salud por partes del cuerpo, panel de habilidades y rasgos, mapa en papel y minimapa (B41+), radiales para armas y emotes, y zoom de cámara isométrica fija.
- La fatiga y la resistencia excesivas en B42 indican que el "realismo" castigador tiene un umbral: si se sobrepasa, frustra.
- La falta de NPCs durante más de una década es la mayor oportunidad de diferenciación.

### Gaps
- No obtuve cifras agregadas de Steam (porcentaje de reseñas positivas, ventas totales). Wikipedia menciona un artículo de GamesIndustry.biz ("23x its normal sales") sin dar números.
- No encontré citas directas de Reddit ni reseñas de PC Gamer o RPS sobre B42.
- Faltan citas específicas sobre la sensación del combate y las animaciones, sobre desincronización en multijugador y sobre aburrimiento en el late game. Son críticas conocidas en la comunidad, pero no las verifiqué con fuentes en esta sesión.
- No tengo datos sobre accesibilidad (daltonismo, tamaño de fuente, escalado de UI).

## 2. ¿Qué funciones y mods piden más los jugadores?

### Takeaway
Los mods más suscritos son de calidad de vida y UI (Common Sense, Reload All Mags, Weapon Condition Indicator, Fuel Side Indicator, Better Sorting, CleanUI, Inventory Tetris, Has Been Read). Les siguen los que añaden contenido ausente: NPCs (Superb Survivors, Bandits), armas (Brita's, ORGM), música (True Music), estética (Authentic Z) y progresión (Skill Recovery Journal). Juntos dibujan qué le falta al juego base.

### Cited Findings
- Ranking por suscriptores de Steam Workshop (comprobado el 30 de septiembre de 2025): 1) Common Sense (unos 3,74 millones de suscriptores), 2) Reload All Mags, 3) Weapon Condition Indicator, 4) Authentic Z, 5) Fuel Side Indicator. También se citan como populares Better Sorting, ORGM Rechambered, Real Night Vision, Superb Survivors y Bandits NPC (Day One) — [DatHost best mods 2025](https://dathost.net/blog/what-are-the-best-project-zomboid-mods-for-2025)
- Esenciales en B42 (verificado en mayo de 2026 con 42.18.0): Skill Recovery Journal, True Music, Inventory Tetris y Common Sense. Como contenido, Brita's Weapon Pack y Vanilla Food Expanded. Otra guía de B42 añade Has Been Read y CleanUI como mods de calidad de vida muy usados, y advierte de que muchos mods antiguos no funcionan — [Supercraft best mods 2026](https://supercraft.host/wiki/project-zomboid/pz_best_mods_2026/); [Supercraft mods 2025](https://supercraft.host/wiki/project-zomboid/mods-for-2025)
- NPCs vía mods: Bandits funciona en 42.20+ (un jugador y multijugador). Superb Survivors no está portado a B42 — [pzfans NPC B42](https://pzfans.com/zomboid_npc_mods_in_b42_surviving_the_apocalypse_with_friends/); [pzfans NPC mods](https://pzfans.com/npc_mods_your_lonely_apocalypse_deserves/)
- Jugadores en Steam piden un "better inventory mod", paper-doll y filtros por categoría — [Steam](https://steamcommunity.com/app/108600/discussions/0/3767857092599707677/)

### Inferences (lectura de cada mod como función que falta)
- Common Sense (abrir cosas con herramientas lógicas, palancas, etc.): interacciones intuitivas que el jugador espera y que el juego base no tiene. Conviene diseñarlas de serie.
- Reload All Mags, Weapon Condition Indicator, Fuel Side Indicator, Has Been Read y Better Sorting: información visible en pantalla y acciones en lote. En móvil esto es imprescindible porque cada toque cuesta más que un clic.
- Inventory Tetris: hay demanda de un inventario espacial y visual, no de una lista.
- Skill Recovery Journal: la muerte permanente frustra cuando se pierden cientos de horas de habilidades, así que conviene ofrecer una forma opcional de conservar progreso.
- True Music, Authentic Z (ropa y estética) y Brita's/ORGM (armas): piden ambiente, personalización y variedad de equipo.
- Superb Survivors y Bandits: NPCs humanos, la función más pedida y aún ausente.
- Los mapas (Raven Creek y otros) son señal de que se quieren más ubicaciones y mapas grandes. No obtuve cifras.

### Gaps
- No pude abrir la página completa de Supercraft 2026 (timeout), así que me faltan cifras de suscriptores de Brita's, True Music y Raven Creek.
- No encontré una encuesta oficial ni un listado de "most requested features" de The Indie Stone.

## 3. ¿Existe PZ en móvil y cómo resuelven los juegos de supervivencia móviles los controles táctiles para inventario y combate complejos?

### Takeaway
No hay un PZ oficial para móvil. The Indie Stone dice que nunca habrá un "PZ Mobile APK" y que los que circulan probablemente son falsos o maliciosos. Lo único real es Zomdroid, un lanzador fan para Android, archivado y con multijugador desactivado por defecto por miedo legal. El mercado móvil de supervivencia zombi lo dominan juegos free-to-play simplificados (Last Day on Earth, Dawn of Zombies, LifeAfter) o cosas más ligeras (Mini DayZ, Dysmantle). Suelen resolver el táctil con joystick a la izquierda, botones contextuales a la derecha, autoataque o autorecogida, y criticas de monetización y temporizadores. Nadie ofrece hoy la profundidad de PZ en móvil, y ese es el hueco del mercado.

### Cited Findings
**PZ en móvil**
- Post oficial de enero de 2024: PZ "is NOT playable on mobile"; "there will never be a Project Zomboid Mobile APK". Los APK que circulan probablemente son falsos o maliciosos. Se puede hacer streaming con Steam Link, pero sin soporte oficial — [projectzomboid.com blog](https://projectzomboid.com/blog/news/2024/01/project-zomboid-mobile/) (contenido según el extracto del buscador, la página devolvió 403)
- Zomdroid es un lanzador fan para Android "not affiliated" con TIS. Soporta B41 (41.78.16) y B42 hasta la 42.7, mods Lua y solo un jugador. Requiere Android 11 y unos 3 GB de RAM libres. Repositorio archivado el 11 de agosto de 2025, con el autor "waiting for an official response from The Indie Stone regarding potential sponsorship" — [GitHub zomdroid](https://github.com/liamelui/zomdroid)
- En octubre de 2025 una actualización añadió multijugador, desactivado por defecto "para evitar posibles reclamaciones legales de The Indie Stone". Necesita copiar las librerías nativas de la versión Linux 42.12 (libRakNet64.so, libZNetNoSteam64.so). También mejoró la compatibilidad táctil en MIUI (Xiaomi, Redmi, POCO), donde antes no funcionaba — [ixbt.games](https://ixbt.games/en/news/2025/10/21/v-neoficialnuiu-mobilnuiu-versiiu-project-zomboid-dobavili-multipleer.html); [Androidphoria (ES)](https://androidphoria.com/juegos/zomdroid-project-zomboid-para-android-no-oficial)
- Escepticismo antiguo (Steam, 2014): los controles de PZ exigen pulsar 2–3 cosas a la vez (mantener postura de ataque, encarar y atacar), "not possible on a touch screen" — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/620700960733659206)
- Muchas páginas de "Project Zomboid mobile apk" son spam SEO. Algunas describen funciones inventadas como "combate táctico por turnos" — [ejemplo de spam](https://exhibition.artplaceamerica.org/kdn/project-zomboid-mobile-apk) (citado solo como prueba de la existencia de falsos)

**Juegos tipo PZ en móvil**
- Mini DayZ (Bohemia, 2017, iOS/Android): pixel art, mundos aleatorios, "custom touch controls". Ofrece toque para moverse o joystick flotante, y se recomienda el joystick porque el pathfinding por toque es errático. Los enemigos cercanos se atacan solos y las armas de fuego se disparan con un botón. Common Sense Media critica el texto pequeño y que los controles no son perfectos. Mini DayZ 2 se considera más completo, aunque con bugs — [Pocket Gamer](https://www.pocketgamer.com/mini-day-z/review/); [Common Sense Media](https://www.commonsensemedia.org/app-reviews/mini-dayz-survival-game); [Game*Spark](https://www.gamespark.jp/article/2017/07/04/74428.html)
- Last Day on Earth: Survival: joystick digital a la izquierda y botones de acción a la derecha. Es "serviceable", pero cuesta abrir el inventario en mitad del combate. El botón de recolectar usa automáticamente la herramienta adecuada, y la autorecogida existe pero deja al jugador más vulnerable. Mantener pulsado un objeto muestra su tooltip, y los objetos apilables se limitan a 20 por casilla. Las críticas principales son la energía limitada, temporizadores "overzealous", un muro de pago ("money trap"), bugs y mal soporte — [BlueStacks guía](https://www.bluestacks.com/blog/game-guides/last-day-earth-survival-pc/surviving-last-day-on-earth-bluestacks-keymapping-tool.html); [QooApp 2017](https://news.qoo-app.com/en/post/13567); [Common Sense Media LDoE](https://www.commonsensemedia.org/app-reviews/last-day-on-earth-survival); [Fandom wiki](https://last-day-on-earth-survival.fandom.com/wiki/General_Tips/FAQ)
- Otros que aparecen en listas de "juegos como PZ en Android": Dawn of Zombies: Survival (crafteo e interacción con supervivientes), LifeAfter, Grim Soul, Last Shelter (RTS), Into the Dead 2, Unkilled (con autodisparo), Dysmantle — [AppsToPlay](https://www.appstoplay.com/articles/10_games_like_project_zomboid_on_android); [Family Gaming Database](https://www.familygamingdatabase.com/search/platforms/Android/similar/Project+Zomboid)
- Un clip de TikTok menciona "How You Died", un juego móvil con fatiga, sed y multijugador online. Sin verificar, y su nombre parece aludir a la frase de PZ — [TikTok discover](https://www.tiktok.com/discover/games-like-project-zomboid-for-mobile)

### Inferences
- Los patrones táctiles dominantes en el género son joystick virtual flotante, botón de acción contextual que elige la herramienta o el arma adecuada, autoataque o autoapuntado opcional, mantener pulsado para ver el tooltip y botones grandes de recolectar o interactuar. El fallo común es abrir el inventario en combate, así que hacen falta ranuras rápidas o radiales accesibles sin soltar el joystick.
- El listón de calidad en móvil es bajo en profundidad y alto en frustración por monetización. Un juego premium o sin trampas pay-to-win, con la profundidad de PZ, se diferenciaría claramente.
- Zomdroid demuestra que hay demanda real de PZ en Android: se hace un esfuerzo técnico para portarlo con 3 GB de RAM.

### Gaps
- No encontré datos fiables de Google Play (notas medias, número de reseñas) de Mini DayZ, LDoE ni Dawn of Zombies. No pude confirmar si Mini DayZ fue retirado de las tiendas.
- No encontré reseñas de usuarios sobre cómo se juega Zomdroid con controles táctiles (no aparecieron hilos de Reddit).
- State of Survival y "Project Zomboid Mobile" falsos concretos no se investigaron a fondo.

## 4. Ideas concretas para adaptar la complejidad de PZ a pantallas táctiles (Godot, 3D, Android)

### Takeaway
La complejidad se traslada a móvil si se reduce el coste de cada interacción (menos toques, menos precisión) y no si se recorta la simulación. Las propuestas siguientes son inferencias de diseño a partir de las quejas documentadas (inventario en lista, radial incómodo con mando, inventario en combate en LDoE, pathfinding errático por toque en Mini DayZ, texto pequeño).

### Cited Findings
- Problemas de partida documentados: inventario-lista sin estructura ni iconos ([Steam](https://steamcommunity.com/app/108600/discussions/0/3192490350123061624/)); radial con mando "unnatural" mientras se camina ([pzfans](https://pzfans.com/zomboid_controller_survival_taming_the_apocalypse_on_gamepad/)); inventario en mitad del combate ([BlueStacks](https://www.bluestacks.com/blog/game-guides/last-day-earth-survival-pc/surviving-last-day-on-earth-bluestacks-keymapping-tool.html)); toque para moverse errático y texto pequeño ([Pocket Gamer](https://www.pocketgamer.com/mini-day-z/review/), [Common Sense Media](https://www.commonsensemedia.org/app-reviews/mini-dayz-survival-game)); pulsaciones simultáneas imposibles en táctil ([Steam 2014](https://steamcommunity.com/app/108600/discussions/0/620700960733659206))

### Inferences (propuestas)
- **Movimiento y combate:** joystick flotante a la izquierda. A la derecha, un botón de ataque grande y un botón de "postura de combate" con interruptor en lugar de mantener pulsado, que resuelve el problema de las pulsaciones simultáneas. Encarar con un deslizamiento sobre el botón de ataque o con autoapuntado al zombi más cercano dentro de un cono, con opción de desactivarlo. Botón de empujar o esquivar. Botón de sigilo con interruptor.
- **Acciones contextuales:** al acercarse a un objeto (puerta, ventana, contenedor, coche) aparece un botón contextual con la acción más probable. Mantener pulsado abre un menú radial grande (sustituye al clic derecho de PZ) con un máximo de unas 6–8 opciones y submenús.
- **Timed actions:** conservar la cola de acciones con barra de progreso visible, permitir encolar varias (por ejemplo "saquear todo, tapar ventanas") y cancelar deslizando. Pausa o ralentización opcional en menús para un jugador.
- **Inventario:** cuadrícula de iconos grandes con peso o volumen (al estilo de lo que pide Inventory Tetris, sin obligar al encaje), filtros por categoría en pestañas (comida, médico, armas, herramientas, equipado), ordenación por peso, nombre o estado, y búsqueda. Paper-doll del personaje para arrastrar ropa y armas. Vista dividida "mi inventario | contenedor" con "transferir todo" o "transferir categoría". Mantener pulsado para ver el tooltip. Indicadores visibles de estado, durabilidad, combustible y "leído" (lo que aportan Weapon Condition Indicator, Fuel Side Indicator y Has Been Read).
- **Hotbar y ranuras rápidas:** 4–6 ranuras siempre visibles para armas, vendas y comida, para no abrir el inventario en combate.
- **Salud:** silueta corporal tocable, donde cada parte muestra sus heridas y ofrece botones de "tratar" que eligen automáticamente el mejor objeto disponible.
- **Crafteo:** recetas filtradas por lo que se puede fabricar ya, con favoritos y "fabricar N". Recorrer el árbol de recetas o el menú de construcción con previsualización 3D en el mundo antes de colocar.
- **Cámara 3D:** pellizcar para hacer zoom y rotación con dos dedos o en pasos de 90°. Ocultación automática de tejados y paredes (cutaway) al entrar en edificios.
- **Mapa:** mapa en papel con anotaciones táctiles (marcadores e iconos de dibujo) y minimapa opcional.
- **Accesibilidad:** escalado de UI y texto (el texto pequeño es una queja de Mini DayZ), modo zurdo, botones reubicables y personalizables, soporte de mando Bluetooth desde el primer día y modos de daltonismo.
- **Onboarding:** tutorial y pistas contextuales ("esto te puede matar") frente a la queja de B42 de que la guía no responde a las dudas del jugador.
- **Progresión:** un "diario de habilidades" opcional (tipo Skill Recovery Journal) y sesiones cortas con guardado frecuente, adaptadas al móvil.
- **Diferenciadores frente a PZ:** NPCs humanos (lo más pedido), música y radio (True Music), interacciones de sentido común (Common Sense) y modelo premium o sin pay-to-win frente a LDoE.
- **Rendimiento:** PZ ya se resiente en ciudades densas en PC. En Android hay que pensar desde el principio en LOD, instancing de zombis, simulación por "chunks" o celdas y límites dinámicos de hordas.

### Gaps
- No encontré estudios de usabilidad ni postmortems de desarrolladores móviles sobre inventarios complejos. Las propuestas son de diseño, no están validadas con datos.

## 5. Consideraciones legales/IP de hacer un juego "como PZ"

### Takeaway
Las mecánicas y reglas no están protegidas por copyright, pero la expresión concreta sí ("look and feel", arte, audio, textos), y también las marcas. No se puede usar el nombre "Project Zomboid" o "Zomboid" ni sus assets, el mapa de Knox County, la frase "This is how you died" de forma idéntica ni una apariencia casi idéntica.

### Cited Findings
- Tetris Holding v. Xio Interactive (D.N.J., 30 de mayo de 2012): las reglas y mecánicas básicas son ideas no protegibles, pero la expresión artística y audiovisual concreta sí lo es. Se rechazó la defensa de "solo copiamos reglas funcionales". Xio perdió por copiar el "look and feel" de forma casi idéntica, y también por trade dress — [Loeb & Loeb](https://www.loeb.com/en/insights/publications/2012/06/tetris-holding-llc-v-xio-interactive-inc); [FedBar IP Insight](https://www.fedbar.org/wp-content/uploads/2012/10/ipinsight-octnov2012-pdf-1.pdf)
- Spry Fox v. Lolapps (Triple Town frente a Yeti Town) cita a Tetris para afirmar que el "look and feel" de un videojuego puede estar protegido — [Wikipedia](https://en.wikipedia.org/wiki/Spry_Fox,_LLC_v._Lolapps,_Inc.)
- The Indie Stone se posiciona activamente contra los "PZ Mobile" falsos — [projectzomboid.com](https://projectzomboid.com/blog/news/2024/01/project-zomboid-mobile/)
- Zomdroid desactivó el multijugador por defecto por miedo a reclamaciones de TIS. Es un ejemplo de riesgo cuando se usa código o binarios del juego original — [ixbt.games](https://ixbt.games/en/news/2025/10/21/v-neoficialnuiu-mobilnuiu-versiiu-project-zomboid-dobavili-multipleer.html)

### Inferences
- Se pueden usar libremente mecánicas como hambre, sed, fatiga, heridas por partes del cuerpo, infección por mordisco con muerte segura, timed actions, habilidades que suben con el uso, rasgos con coste en puntos, saqueo de contenedores y menús contextuales.
- Hay que evitar el nombre, logos, sprites o modelos, música, textos o frases icónicas literales, el mapa de Kentucky o Knox County calcado, la UI copiada píxel a píxel y el uso de "Zomboid" en el nombre o en las palabras clave de la ficha de Google Play. Esto último puede generar reclamaciones de marca y rechazo por la política de la tienda contra la suplantación.
- Es más seguro tener una ambientación propia (región, época, estética 3D distinta) y una frase de apertura original que evoque la idea sin copiarla. Para un lanzamiento comercial conviene una consulta legal breve.

### Gaps
- No verifiqué si "Project Zomboid" o "Zomboid" son marcas registradas, ni en qué jurisdicciones. Tampoco consulté jurisprudencia de la UE o de España sobre clones de videojuegos.
- No encontré casos de The Indie Stone actuando legalmente contra clones.
