# Project Zomboid: zombis, combate, sigilo y sonido (Build 41 / Build 42)

> Nota metodológica: pzwiki.net (la wiki oficial) devolvió 403 a las peticiones directas, así que las páginas se leyeron en copias de Wayback Machine de 2025-2026 (`web.archive.org/web/2025id_/https://pzwiki.net/wiki/<Página>`). Cito la URL canónica de pzwiki. Cada página de pzwiki indica su versión: muchas dicen "revisada para 41.78.16, partes actualizadas automáticamente a 42.12–42.13". Por eso marco con **[B41]** o **[B42]** solo lo que la fuente atribuye a una build concreta. Los sitios de fans (pzfans.com, projectzomboid.wiki, build42guide.wiki, etc.) se señalan como fuentes secundarias de fiabilidad baja o media. Contexto de versiones: según la prensa, Build 42.20 pasó a la rama estable hacia el 28-29 de julio de 2026, y 42.21 está en unstable (sept. 2026).

## 1. ¿Cómo detectan, persiguen y pierden los zombis al jugador?

### Takeaway
Los zombis usan sobre todo la vista (cono de visión afectado por la luz) y el oído. Dan prioridad a la presa que ven y, si no hay ninguna, al ruido más "atractivo" (volumen ≠ radio). Persiguen mientras dura su memoria, configurable en Sandbox: en el código, valores internos de ~1250/800/500/25 según un modder. No hay un sistema de olfato documentado en vanilla. La cognición (abrir puertas o solo romperlas), la fuerza, la dureza y la velocidad se configuran en "Zombie Lore".

### Cited Findings

**Percepción y prioridades**
- Los zombis dependen de la vista y del oído. Les atraen sobre todo radios, vehículos en marcha y disparos. Si oyen algo detrás, primero miran y después se giran. Su orden de prioridad: primero la presa a la vista, luego el ruido, sea artificial o no (por ejemplo, un trueno) — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Al ver a una presa toman la ruta más directa: atraviesan vegetación, golpean puertas o barricadas y rompen ventanas. Al verla gimen, lo que puede delatarlos, pero al arrastrar los pies hacen poco ruido. Un ataque por la espalda tiene más probabilidad de herir — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Hay una pequeña probabilidad de que un zombi deje de golpear una estructura si no tiene motivo para atravesarla — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Radio frente a volumen: el código distingue el radio (alcance bruto) del volumen (atractivo). Casi siempre coinciden; por ejemplo, el helicóptero tiene 500/500. La sirena de vehículo, en cambio, tiene radio 100 y volumen 60, así que un zombi puede ignorarla para perseguir a un superviviente que tose. Con los disparos pasa lo mismo — [PZwiki: Noise (42.13.1)](https://pzwiki.net/wiki/Noise)
- De noche, las fuentes de luz atraen a los zombis. La luz del día mejora la vista del jugador — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- Según una cita de un desarrollador recogida en un hilo de Steam, los zombis tienen un alcance de visión finito, bastante menor que el del jugador con el zoom al máximo. Un jugador estima que, tras doblar una esquina, siguen el rastro ~1–1,5 s (anecdótico) — [Steam discussions](https://steamcommunity.com/app/108600/discussions/0/3713810544744288861/)

**Ajustes de Sandbox "Zombie Lore"** (por defecto = Apocalypse; tabla de pzwiki, versión 41.78.16 con partes de 42.13.2) — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- *Speed*: Sprinters / **Fast Shamblers** (por defecto en Apocalypse, Survival, First Week y Six Months Later) / Shamblers (Initial Infection) / Random. Los Fast Shamblers alternan correr y arrastrar los pies hacia su objetivo.
- *Strength*: Superhuman / **Normal** / Weak / Random. Afecta al daño al jugador y a objetos del mundo, y a la probabilidad de romper la piel.
- *Toughness*: Tough / **Normal** / Fragile / Random. Afecta a los puntos de vida y a la probabilidad de caer al suelo.
- *Transmission*: **Blood + Saliva** / Saliva Only / Everyone's Infected (todos reaniman al morir) / None.
- *Infection Mortality*: Instant / 0-30 s / 0-1 min / 0-12 h / **2-3 días** / 1-2 semanas / Never.
- *Reanimate Time*: Instant / 0-30 s / **0-1 min** / 0-12 h / 2-3 días / 1-2 semanas.
- *Cognition*: Navigate + use doors / Navigate / **Basic navigation** (Apocalypse y Survival) / Random. Determina si intentan abrir puertas, romper ventanas o puertas, o solo rodear el obstáculo.
- *Crawl Under Vehicle*: Crawlers Only / Extremely Rare / Rare / Sometimes / **Often** / Very Often / Always.
- *Memory*: Long / **Normal** / Short / None / Random. Es cuánto tiempo persigue un zombi antes de rendirse.
- *Sight*: Eagle / **Normal** / Poor / Random. Es el radio del cono de visión, incluida la periferia.
- *Hearing*: Pinpoint / **Normal** / Poor / Random. Es la distancia a la que acuden a un ruido (ventanas rotas, zombis muriendo).
- *Environmental Attacks* (por defecto Off): los zombis que no han visto ni oído al jugador atacan puertas y construcciones mientras deambulan.
- *Damage Construction* (por defecto On): pueden destruir construcciones y defensas del jugador.
- *Day/Night Active*: **Both** / Night / Day. Los zombis inactivos son más lentos y tienden a no perseguir.
- *Zombie House Alarm Triggering* (por defecto Off según pzwiki): pueden disparar alarmas de casas al romper ventanas o puertas. Contradicción: pzfans (42.19) afirma que en Apocalypse está en True — [pzfans](https://pzfans.com/what-attracts-zombies-to-bases/)
- *Drag Down* (por defecto On): varios zombis pueden derribar al jugador.
- *Fence Lunge* (por defecto On): los zombis que trepan una valla a veces se abalanzan.
- *Fake Dead*: "Some zombies in the world will pretend to be dead" (por defecto) / también algunos que "matas" / nunca.
- *Rear Vulnerability* (por defecto High): probabilidad de mordisco cuando atacan por la espalda.
- Valores numéricos del archivo de configuración: Sight 1=Eagle, 2=Normal, 3=Poor, 4=Random; Hearing igual (1=Pinpoint); Memory 1=Long, 2=Normal, 3=Short, 4=None, 5=Random — [xgamingserver docs](https://xgamingserver.com/docs/project-zomboid/zombie-settings)
- **[B42]** Hay una opción 6 = "Random between Normal and None" (memoria). Según DoomHosting, los valores por defecto de B42 son Memory 2 y Sight/Hearing 5 ("Random between Normal and Poor"). Esto contradice la guía de servidor, que da Normal (2) — [DoomHosting B42 Sandbox explained](https://www.doomhosting.com/help/articles/project-zomboid-sandbox-settings-explained); [xgamingserver](https://xgamingserver.com/docs/project-zomboid/zombie-settings). Un jugador de Steam también afirma que en B42 vista y oído vienen aleatorios por defecto — [Steam](https://steamcommunity.com/app/108600/discussions/0/844004562473976959/)
- Memoria interna: un modder vio que memory=2 aparece como 800 en el objeto zombi. Su mapeo: 1250 (Long), 800 (Normal), 500 (Short), 25 (None). Es un hilo antiguo, posiblemente de B41 — [Indie Stone Forums](https://theindiestone.com/forums/index.php?%2Ftopic%2F66643-changing-zombies-sighthearingmemory-dynamically%2F=)

**Comportamientos físicos**
- Vallas bajas: los zombis las saltan, caen al suelo y quedan un momento vulnerables. Al saltar pueden abalanzarse (lunge) y desequilibrar o tirar al jugador, que queda inmóvil "un tiempo considerable". Si varios saltan a la vez, la valla se daña y acaba cayendo — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Vallas altas: el jugador puede escalarlas con la tecla E (con probabilidad de fallo según Fitness, Strength, rasgos, peso y moodles); los zombis no. Los zombis buscan antes otros puntos débiles (puertas, ventanas, vallas bajas o rodearla) y no atacan las vallas altas generadas en el mapa — [PZwiki: Fence](https://pzwiki.net/wiki/Fence)
- Un zombi caído no puede levantarse si un superviviente, otro zombi o un vehículo está encima — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Grupos grandes de zombis pueden agarrar y derribar a la presa para comérsela. Si el jugador muere junto a zombis, se arrodillan a comer el cadáver. También aparecen zombis sentados contra la pared (tienen que levantarse antes de atacar) o comiendo cadáveres — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Ventanas: un zombi tarda solo ~20 minutos de juego en romper una ventana sin barricada. Romperla produce un sonido fuerte. Ambos (jugador y zombi) pueden trepar por ventanas abiertas o rotas — [PZwiki: Window](https://pzwiki.net/wiki/Window)
- Barricadas: hasta 4 tablones por lado de puerta o ventana, y cada tablón se destruye por separado. Con 1-2 tablones por lado se sigue viendo; con 3-4 se bloquea la visión. La chapa metálica bloquea la visión y las barras no. La puerta o ventana no recibe daño hasta que caen todas las barricadas. Desde RC 2.9.8a los zombis no pueden trepar por una ventana con barricada — [PZwiki: Barricade](https://pzwiki.net/wiki/Barricade)
- Vida de las barricadas (B41, aún vigente en B42 según la wiki), según el nivel de Carpentry/Welding: madera 1000 HP (nivel 0-1) → 1500 (nivel 10); barras metálicas 3000 → 4500; chapa metálica 5000 → 7500. La vida del tablón escala con su condición: `cond/condMax*1000*BarricadeStrengthMod` — [PZwiki: Barricade](https://pzwiki.net/wiki/Barricade)
- Puertas de seguridad: no se abren desde fuera sin llave; romperlas lleva mucho tiempo. Romper una puerta hace mucho ruido — [PZwiki: Door](https://pzwiki.net/wiki/Door)
- Un zombi golpeando una puerta o ventana genera un ruido de 20 — [PZwiki: Noise](https://pzwiki.net/wiki/Noise)

**Tipos y variantes**
- Crawlers (reptantes): se mueven a ~1/5 de la velocidad de uno de pie y hacen poco ruido. Pueden quedar ocultos entre cultivos. **No retroceden con un golpe no letal**. Su ataque principal es abalanzarse, con mucha más probabilidad de romper la piel o morder al primer intento. No pueden destruir puertas ni ventanas ni pasar vallas (atacan la valla). Les cuesta girarse 180°. Aparecen cuando un zombi derribado decide arrastrarse o pueden generarse "haciéndose el muerto" — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Sprinters: solo caminan cuando están ociosos. A veces tropiezan y caen. Un sprinter que te ataca te ralentiza (simula el agarre). Una valla entre tú y él da tiempo para matarlo — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Atuendos: ropa normal, joyas, mochilas. Hay variantes por zona (policías cerca de comisarías y coches patrulla, reclusos en la prisión, granjas, parques de caravanas). Los "survivor zombies" llevan mochilas grandes con comida y mapas anotados. Pueden llevar armas de fuego (policías), llaves de coche o casa, y armas clavadas en el cuerpo; con el tiempo aparecen más tipos (lanzas, palancas, machetes) — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Descomposición: los zombis se pudren con el tiempo y pierden masa, pero no mueren por ello. "La descomposición no tiene efecto en el juego en B41". Las armas de filo dañan su ropa y causan heridas visibles — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Los niños zombis no se añadirán al juego — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- **[B42]** Los zombis hacen ragdoll al recibir el impacto de un vehículo, un disparo o una explosión — [G2A News](https://www.g2a.com/news/features/project-zomboid-build-42-everything-you-need-to-know/)
- **[B42.21 unstable]** Corrige un bug por el que hordas grandes desaparecían al salir y volver a entrar en un chunk, y la duplicación de zombis en MP (fuente secundaria) — [Gameluster](https://gameluster.com/project-zomboid-42-21-patch/); entrada oficial: [projectzomboid.com 42.21](https://projectzomboid.com/blog/news/2026/09/re-population-of-the-dead-build-42-21-unstable-released/)

**Infección (Knox Infection)**
- Probabilidad de transmisión: arañazo 7 %, laceración 25 %, mordisco 100 %. Ninguna herida ajena a los zombis infecta. Con Thick Skinned, la probabilidad de arañazo baja al 15 %. "Siempre hay un 25 % de que sea mordisco" — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie); [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)
- Progresión con la configuración por defecto: subida inmediata de temperatura; 1-4 h ansiedad; 5-12 h Queasy; 13-24 h Nauseous; 25-48 h Sick; 49-71 h Fever (daño terminal); 72 h muerte y reanimación. Resilient: −25 % de velocidad de zombificación; Prone to Illness: +25 %. No hay cura. Bien alimentado e hidratado y sin resfriado solo se ralentiza — [PZwiki: Knox Infection](https://pzwiki.net/wiki/Knox_Infection)

### Inferences
- Para un juego tipo PZ, el núcleo de la IA es una máquina de estados con prioridad vista > sonido > deambular. La memoria es un temporizador (~cientos de ticks) que, al expirar, devuelve al zombi a la última posición conocida o a deambular. El parámetro Cognition decide si la navegación incluye "usar puerta" o solo "romper/rodear".
- Separar el radio (quién oye) del volumen (prioridad entre sonidos que compiten) es un patrón de diseño útil para que un sonido fuerte pero poco "humano" (una sirena) pierda frente a una tos.

### Gaps
- No encontré el radio exacto en casillas del cono de visión (Eagle/Normal/Poor) ni del oído por nivel; pzwiki no lo publica en las páginas consultadas.
- No encontré confirmación de un sistema de olfato en vanilla. pzfans dice que las bases no son "imanes olorosos" por defecto (fuente secundaria).
- No pude leer el post oficial del lanzamiento de B42 (403) para listar los cambios de comportamiento zombi de primera mano (por ejemplo, nuevas animaciones o caídas por agujeros).

## 2. ¿Cómo funciona el sistema de hordas y meta-eventos?

### Takeaway
Hay un metajuego fuera de pantalla que mueve hordas con sonidos falsos (disparos, gritos, perros) y con el helicóptero, que es un objeto real invisible que te busca. A esto se suman reglas de población (multiplicador, pico en el día 28, respawn cada 72 h de hasta el 10 % de la población deseada en celdas no vistas 16 h, redistribución cada 12 h dentro de la misma celda) y "rally groups" de 20 zombis con líder. Los meta-eventos mueven zombis existentes; no está claro que generen nuevos.

### Cited Findings
- El metajuego es la simulación fuera de pantalla de eventos entre supervivientes, zombis y entorno. Los disparos oídos y el helicóptero son meta-eventos. No se puede encontrar quién disparó ni adónde fue el helicóptero; los zombis siguen igualmente esos sonidos — [PZwiki: Metagame](https://pzwiki.net/wiki/Metagame)
- Meta Event: "hasta una vez al día" se oyen disparos, gritos o ladridos lejanos que hacen migrar a los zombis. Seguir el sonido no lleva a ninguna fuente. Opciones: Never / Once / **Sometimes** (por defecto en Apocalypse) / Often — [PZwiki: Metagame](https://pzwiki.net/wiki/Metagame); [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- Sleeping Event: al dormir, posible despertar con pánico y "un zombi puede aparecer en la habitación [verificar]" — [PZwiki: Metagame](https://pzwiki.net/wiki/Metagame)
- Cada horda tiene un zombi líder al que siguen los demás. A intervalos irregulares, eventos externos (helicóptero, perro, disparos) provocan migraciones masivas que redistribuyen las hordas por el mapa. Los zombis van en línea recta hacia la fuente, aunque atraviesen tu refugio. La población aumenta hasta su pico a los ~30 días — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie)
- Helicóptero: es un objeto físico invisible ("choppah" en el código). Aparece a ~1.414 casillas del jugador y se acerca rápido. Si no te detecta, busca por la zona hasta 2 h. Si te ve, se queda encima 60 s reales (sin importar la velocidad del juego) y se va, con posibilidad de volver ~30 min después. Por defecto es un único evento entre los días 6 y 9, de 9 AM a 6 PM. Con Sandbox se puede repetir cada 6–9 o 10–15 días. Se anuncia en el AEBS a las 7 AM ("Air Activity Detected"). En MP alterna entre jugadores — [PZwiki: Helicopter](https://pzwiki.net/wiki/Helicopter)
- Ruido del helicóptero: radio y volumen 500 — [PZwiki: Noise](https://pzwiki.net/wiki/Noise)
- Opciones de Sandbox del helicóptero: Never / **Once** / Sometimes / Often. Si es frecuente, el helicóptero "se va y vuelve, trayendo hordas desde muchas direcciones" — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- Opciones avanzadas de población (por defecto en Apocalypse) — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox):
  - Population Multiplier: 4.0 Insane, 2.0 High, **1.0 Normal**, 0.35 Low, 0 None.
  - Population Start Multiplier 1.0; Peak Multiplier **1.5**; Peak Day **28**.
  - Respawn Hours **72** (0 = desactivado); Respawn Unseen Hours **16** (horas que el chunk debe estar sin ver); Respawn Multiplier **0.1** (fracción de la población deseada de la celda que puede reaparecer en cada ciclo).
  - Redistribute Hours **12**: los zombis migran a zonas vacías *de la misma celda*.
  - Follow Sound Distance **100**: distancia que un zombi *virtual* camina hacia el último sonido oído.
  - Rally Group Size **20** (0 = sin grupos; no se forman grupos dentro de edificios ni en bosques); Rally Travel Distance **20** (5–50); Rally Group Separation **15**; Rally Group Radius **3** (distancia máxima al líder).
  - Zombie Distribution: **Urban Focused** (por defecto) o Uniform.
- Contradicción comunitaria sobre si los meta-eventos generan zombis o solo los mueven. Varios usuarios dicen que solo recolocan zombis existentes y uno afirma que pueden generarlos. La wiki habla de "migración" — [Steam: Helicopter event and gunfire](https://steamcommunity.com/app/108600/discussions/0/4811511685075336309/)
- Razonamiento comunitario (no oficial): cuando una celda no está cargada, sus zombis son un "número" que se mueve entre celdas — [Steam discussion](https://steamcommunity.com/app/108600/discussions/0/2984159549099104740)
- Alarmas: House Alarms Frequency (Never … Very Often; por defecto Sometimes en Apocalypse). La alarma antirrobo hace un ruido de 600. Car Alarms Frequency (por defecto Extremely rare en Apocalypse); el claxon o la alarma de coche hacen 150. Siren Shutoff Hours 0 = suena hasta agotar la batería — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox); [PZwiki: Noise](https://pzwiki.net/wiki/Noise)
- **[B42.19]** Una fuente de fans confirma el mismo esquema (Never / Sometimes / Often; Meta Event "Sometimes" por defecto; Follow Sound Distance 100; Redistribute 12) — [pzfans Night Events](https://pzfans.com/ProjectZomboidNightEvents/); [pzfans attraction](https://pzfans.com/what-attracts-zombies-to-bases/)

### Inferences
- El diseño tiene dos capas: zombis "reales" (cargados cerca del jugador, con IA completa y rally groups) y zombis "virtuales" (abstractos por celda, que solo siguen sonidos hasta 100 casillas). Los meta-eventos son sonidos inyectados en ambas capas para remover el mapa y evitar zonas limpias para siempre.
- El helicóptero funciona como un "director sádico": un emisor de ruido de 500 que persigue al jugador si lo ve, y castiga quedarse al aire libre.

### Gaps
- No hay valores oficiales del radio o volumen de los meta-sonidos (disparo lejano, perro, grito).
- No se confirma si en B42 cambió la mecánica de respawn y redistribución, más allá de los arreglos de 42.21.

## 3. ¿Cuáles son las mecánicas exactas de combate cuerpo a cuerpo y con armas de fuego?

### Takeaway
En el cuerpo a cuerpo, el daño base (min–max del arma) se multiplica por Strength (75 %–125 %), por el nivel de habilidad del arma (+10 % por nivel en el código y bonus "bruiser" +10 %/+20 % en niveles 3 y 7) y por penalizaciones de moodles. El crítico usa el CritChance del arma, +3 % por nivel, limitado al 10–90 %. La resistencia gastada es proporcional al peso, con −80 % por "overkill". La durabilidad es 1 entre (ConditionLowerChance + MaintenanceMod×2). Las armas de fuego en B41 tienen precisión y crítico base más un bono por nivel de Aiming, y radios de ruido de 60–200. B42 sustituye el auto-apuntado por una retícula con prioridad a la cabeza, activa los encasquillamientos, reforma modelos y munición, y separa el estado del mango, de la cabeza y el afilado.

### Cited Findings

**Categorías de armas cuerpo a cuerpo**
- Hay siete subcategorías: axe, long blunt, short blunt, long blade, short blade, spear e improvised (esta última sin habilidad propia). Las armas de dos manos usadas con una hacen −50 % de daño y gastan mucha más resistencia; las pesadas (Heavy) solo se pueden usar a dos manos. Las armas con base speed 1 no son comparables entre clases: la lanza tiene una animación muy rápida y las Heavy una muy lenta — [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)
- Leyenda de estadísticas: Min/Max damage; Door damage; Tree damage; **Minimum range** (por debajo, el ataque se convierte en empujón); Maximum range (100 % del daño); Attack speed; Crit chance; Crit multiplier; Knockback; Max condition; Condition lower chance (1 entre x + (maintenance×2 + nivel del arma)) — [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)
- Ejemplos B42 de la tabla de pzwiki (Daño min–max / alcance / crit / multiplicador de crit / condición): Firefighter Axe 0.8–2, alcance 0.61–1.2, 20 %, 5×, condición 13; Wood Axe 1.3–3, 50 %, 12×, condición 15 (forjada: 25 hits medios frente a 40); Baseball Bat 0.8–1.1, alcance 1.25, 40 %, 2×, condición 15; Crowbar 0.6–1.15, 20 %, 2.5×, condición 15, 1 entre 70 (≈1050 golpes de media); Pickaxe 1–2.2, alcance 1.6, 9×; Barbell 1.8–2.8, 3 objetivos (multi-hit "3×"); Bucket Maul 1.5–3, hasta 4 objetivos — [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)
- **[B41 v41.56]** Ejemplos de la guía de Steam: Katana 8–8 de daño, crit 30, ×10; Machete 2–3; lanza fabricada 1–1.5, crit 30, ×10, 1 entre 2 (frágil); Hunting Knife 0.6–1.2, crit 50; Kitchen Knife 1 entre 2; Sledgehammer 2–3, crit 100, endurance mod ×4; Wood Axe endurance ×3 — [Steam Guide: Melee Weapons Information (v41.56)](https://steamcommunity.com/sharedfiles/filedetails/?id=2644480496)
- Bonus por habilidad (Axe, Long Blunt y Spear): nivel 3 +10 % de daño; nivel 7 +20 % de daño y +20 % de alcance; nivel 8+ además −10 % de resistencia. Cada habilidad sube la velocidad de ataque, el daño, el crítico y la probabilidad de empujar automáticamente a un zombi que te agarra de frente — [PZwiki: Axe (skill)](https://pzwiki.net/wiki/Axe_(skill)); [PZwiki: Long Blunt](https://pzwiki.net/wiki/Long_Blunt); [PZwiki: Spear](https://pzwiki.net/wiki/Spear)
- Short Blade: multiplicador de probabilidad de "jaw stab" (puñalada instantánea en la mandíbula) del 100 % (nivel 0) al 130 % (nivel 10) — [PZwiki: Short Blade](https://pzwiki.net/wiki/Short_Blade)
- Long blunt no daña la ropa de zombis ni de jugadores — [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)

**Fórmulas (B41, extraídas del código por el autor de la guía; fuente secundaria pero cita las clases Java)** — [Steam Guide v41.56](https://steamcommunity.com/sharedfiles/filedetails/?id=2644480496)
- Daño:
  - +10 % (niveles 3–6) o +20 % (nivel 7+) en Long Blunt, Axe y Spear.
  - +5 % por nivel de Strength.
  - Reducido por dolor o herida en la mano izquierda (Hand_L) o el brazo superior derecho (UpperArm_R).
  - Rasgos de peso: Underweight −20 %, Very Underweight −40 %, Emaciated −60 %.
  - −10 % por nivel de Panic o Stress a partir del nivel 2.
  - Endurance y Tired: −50/−80/−90/−95 % según el nivel.
  - Strong +40 % / Weak −40 %, y +10 % por nivel de habilidad del arma.
  - Si hay crítico, se multiplica por CritDmgMultiplier.
  - Clases: `SwipeStatePlayer.ConnectSwing`, `IsoGameCharacter.Hit`.
- Crítico:
  - Parte del CritChance del arma; un arma de dos manos usada con una pierde 1/3.
  - +3 % por nivel de habilidad del arma.
  - −5 % por nivel de los moodles Endurance o Heavy Load; −1,3 % por nivel de Panic.
  - −6 % contra zombis Tough y +6 % contra Fragile.
  - Se limita a un mínimo del 10 % y un máximo del 90 %.
  - El ataque de estocada con lanza tiene +30 % de crítico.
- Velocidad:
  - Base speed −23 % con un arma de dos manos usada con una mano; +25 % con el rasgo Axeman.
  - −0,07 por nivel de Endurance o Heavy Load; +0,03 por nivel de habilidad del arma; +0,02 por nivel de Fitness.
  - Factor aleatorio ×1,1 o ×1,2.
  - Se multiplica por el modificador de ropa y se reduce por heridas en los brazos.
  - Hipotermia o hipertermia: nivel 2 −34 %, nivel 3 −67 %, nivel 4 −90 %.
  - Tiene topes máximo y mínimo.
- Resistencia (endurance):
  - Proporcional al peso del arma (un arma de peso 2 gasta el doble que una de peso 1).
  - −20 % en el nivel 8 de Long Blunt, Axe o Spear.
  - Fitness: nivel 1 −5 %, nivel 5 −15 %, nivel 10 −25 %.
  - Endurance mod del arma: las armas cortas de estocada gastan la mitad; Wood Axe ×3 y Sledgehammer ×4.
  - Asthmatic +30 %.
  - Overkill: −80 % de resistencia si el daño supera con creces la vida restante del zombi.
- Durabilidad: se tira un número aleatorio entre 0 y [ConditionLowerChanceOneIn + MaintenanceMod×2]; con 0, el arma pierde un punto de condición. MaintenanceMod = floor((Maintenance + floor(Weapon/2))/2) — misma fórmula en [PZwiki: Maintenance](https://pzwiki.net/wiki/Maintenance), que da la tabla floor((M+W/2)/2)×2. La XP de Maintenance se gana cuando un golpe no resta condición.
- Short blades de estocada:
  - Jaw stab: muerte instantánea con probabilidad según el nivel de habilidad. Solo ocurre si te enfrentas a un único zombi; cualquier zombi agresivo cerca la desactiva. El arma puede quedarse clavada.
  - Ataque sigiloso por la espalda: muerte instantánea.
- Lanza: al esprintar se pasa a una carga que mata al instante si conecta y tiene más probabilidad de perder condición. La lanza tiene un alcance mínimo mayor, lo que obliga a empujar a corta distancia.

**Empujón, pisotón, suelo, multi-hit, agarre**
- Si el objetivo está por debajo del alcance mínimo, el ataque se convierte en empujón (shove) — [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)
- Strength modifica el daño cuerpo a cuerpo (75 %→125 % del nivel 0 al 10), el knockdown del empujón (75 %→125 %; con Strong, 168–175 % en los niveles 9–10; con Weak, 45–48 % en los niveles 0–1) y el bloqueo (+0 %→+20 %) — [PZwiki: Strength](https://pzwiki.net/wiki/Strength)
- Panic reduce el cono de visión, el crítico, la probabilidad de derribo con empujón y el knockback. En cuerpo a cuerpo: −1,3/−2,6/−3,9/−5,2 % de crítico y −0/−0,2/−0,3/−0,4 de daño según el nivel. En "Terrified", el radio de visión baja −36 y la luz −0,2. La ganancia es ~3 % por zombi visto y +0,5 % por minuto con zombis a la vista. Brave −70 % de ganancia; Cowardly ×2; Desensitized es inmune — [PZwiki: Panic](https://pzwiki.net/wiki/Panic)
- Weapon Multi-Hit (Sandbox, por defecto Off): algunas armas golpean y empujan a varios zombis a la vez. Melee Movement Disruption (por defecto On): el jugador se ralentiza al golpear — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- Pisotón y empujón (fuentes de fans): el empujón (Space) tira al zombi. Mientras estás sobre su pecho no se levanta y se levanta rápido al apartarte. El pisotón no gasta durabilidad. Golpear en la cabeza a un zombi caído da ×3 de daño y el doble de crítico (sin verificar). Un pisotón sin arma hace ~0,2–0,4 de daño — [pzfans knock tactics](https://pzfans.com/knock_tactics_breakdown_build_41_vs_42_zomboid_secrets/); [pzguide melee](https://pzguide.com/melee)
- Agarre y mordisco: los ataques zombi agarran y frenan a la víctima. Un ataque por la espalda tiene más probabilidad de herir. Con Drag Down, un grupo derriba al jugador — [PZwiki: Zombie](https://pzwiki.net/wiki/Zombie); [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- **[B42]** Algunas armas registran por separado el estado del mango, el de la cabeza y el afilado del filo; la cabeza puede caerse — [BisectHosting 42.20](https://www.bisecthosting.com/blog/project-zomboid-build-42-20-patch-notes-stable-version-new-features-changes-content)
- **[B42]** Hay armas fabricadas o forjadas con multi-hit nativo (Barbell, Cudgel y Block Maul con 3 objetivos; Bucket Maul con 4) y armas de chatarra (Scrap) — [PZwiki: Weapon](https://pzwiki.net/wiki/Weapon)
- **[B42, sin verificar]** build42guide.wiki y projectzomboid.wiki hablan de "muscle strain" y de fórmulas de knockback y strain que no pude contrastar con notas oficiales — [build42guide](https://build42guide.wiki/survival/build-42-combat)

**Armas de fuego**
- Estadísticas de pzwiki (tabla B41/B42.x; columnas: peso, manos, capacidad, daño, alcance mín–máx, precisión base +/nivel, crit base +/nivel, radio de ruido, knockback) — [PZwiki: Firearm](https://pzwiki.net/wiki/Firearm)

  | Arma | Capacidad | Daño | Alcance | Precisión | Crítico | Ruido |
  |---|---|---|---|---|---|---|
  | M9 Pistol | 15 | 0.6–1 | 0.61–15 | 50 % +4 %/nivel | 20 % +6 %/nivel | **100** |
  | M1911 | 7 | 0.9–1.2 | – | – | – | **70** |
  | M36 Revolver | 5 | – | – | – | – | **60** |
  | M625 | – | – | – | – | – | 80 |
  | D-E Pistol | – | – | – | – | – | 120 |
  | Magnum | – | – | – | – | – | 120 |
  | JS-2000 Shotgun | 6 | 1.5–2.2 | – | 65 % | 70 % +10 %/nivel | **200** |
  | Double Barrel | 2 | – | – | – | – | 200 |
  | Sawed-off | – | – | – | 70 % | – | 200 |
  | M16 | 30 | 1–1.6 | – | – | – | 150 |
  | M14 | 20 | 1.2–2, alcance 40 | – | – | 30 % | 170 |
  | MSR788 | 3 | – | 40 | – | – | 170 |
  | MSR700 | 3 | – | 30 | – | – | 150 |

  Knockback: 0.3 en pistolas y rifles; 0.8–0.9 en escopetas.
- Accesorios:
  - Ammo Straps: −5 de tiempo de recarga.
  - Choke Tube Full: −0,4 de dispersión y +2 de alcance; Improved: −0,2 y +1.
  - Gun Light: luz de distancia 15.
  - Laser Sight: +5 de precisión.
  - Recoil Pad: −2 de retroceso.
  - Red Dot: rango de mira 2–10; Tritium: 2–6; x2: 4–12; x4: 8–16; x8: 15–22.

  Fuente: [PZwiki: Firearm](https://pzwiki.net/wiki/Firearm)
- Aiming afecta a seis estadísticas: precisión, crítico ("precision"), alcance (excepto escopetas), ángulo de disparo, tiempo de recuperación de la puntería tras moverse y retroceso (−2 por nivel). También reduce la pérdida de condición. Desde Aiming 6, el pánico deja de afectar a las armas. Desde el nivel 5, la XP baja a ≈37 %. Niveles de Aiming para un 90 % de acierto: escopetas 0–4; M9/M1911 5; M14 8; M16 10 — [PZwiki: Aiming](https://pzwiki.net/wiki/Aiming)
- Reloading: es la velocidad de quitar y meter cargadores, de cargar balas en el cargador y de cargar armas de tambor, recámara o cargador interno. Se entrena descargando y recargando. Desde el nivel 5, la XP baja a ≈37 % — [PZwiki: Reloading](https://pzwiki.net/wiki/Reloading)
- Penalización de precisión por pánico a distancia: nivel × (4 + distancia×0,5); por ejemplo, Terrified a 20 casillas da −56. Encasquillamiento: −3/−6/−9/−12 % de probabilidad de desatascar — [PZwiki: Panic](https://pzwiki.net/wiki/Panic)
- **[B42]** Desaparece el auto-apuntado: hay una retícula cuyo tamaño refleja la precisión, afectada por la niebla. Moverse o disparar seguido la reduce — [Gameluster](https://gameluster.com/project-zomboid-build-42-guide-the-new-aiming-system-explained/)
- **[B42.13+]** Al apuntar se comprueba primero el impacto en la cabeza; en 42.20 se puede apuntar a zonas concretas del cuerpo. Hay nuevos modelos 3D, animaciones, munición y sonidos, y se añaden el L92 Lever Action y el JS-3T Tactical Shotgun — [BisectHosting 42.20](https://www.bisecthosting.com/blog/project-zomboid-build-42-20-patch-notes-stable-version-new-features-changes-content); [VGTimes](https://vgtimes.com/guides/122625-project-zomboid-build-42-20-guide.html)
- **[B42.15]** Se activa el encasquillamiento (jamming); una actualización posterior reduce mucho la tasa de atascos — [patched.gg](https://patched.gg/games/project-zomboid/some-new-things); [PCGamesN](https://www.pcgamesn.com/project-zomboid/gun-jamming-fix)
- **[B42]** Más armas en comisarías y armerías — [PCGamesN](https://www.pcgamesn.com/project-zomboid/gun-spawns). Vanilla no tiene silenciador (solo mods); hay un Firearm Noise Multiplier en Sandbox, por defecto 1.0 (fuente de fans) — [pzfans](https://pzfans.com/what-attracts-zombies-to-bases/)

**Explosivos y trampas del jugador**
- Explosivos arrojadizos: Pipe Bomb (explosión de radio 7; potencia 50 en la tabla y 90 en su ficha); Aerosol Bomb (radio 6); Fire Bomb (radio 6); Molotov (radio 4); Smoke Bomb (radio 5); Noise Maker (ruido 17). Fuegos artificiales: Firecrackers (ruido 80) y crafteados (60). Variantes: sensor de movimiento de corto, medio o largo alcance (3/4/5–6 casillas; se activa con cualquier movimiento, incluido el del jugador), temporizador y control remoto (alcance 7/11/15). La pipe bomb hace poco daño a los zombis y mucho al jugador; crea fuegos de ~10 min. Lo fabrica el Engineer, o se aprende con revistas o esquemas y Electrical 2–8 — [PZwiki: Explosives](https://pzwiki.net/wiki/Explosives); [PZwiki: Pipe Bomb](https://pzwiki.net/wiki/Pipe_bomb)
- Las "traps" de la wiki son de caza de animales pequeños (Box, Cage, Crate, Mouse, Snare y Stick), no trampas antizombis — [PZwiki: Trap](https://pzwiki.net/wiki/Trap)

### Inferences
- Combinar knockback/knockdown, pisotón y el estado "caído" con daño y crítico extra en la cabeza crea un bucle de empujar → derribar → rematar que hace viable el cuerpo a cuerpo contra muchos enemigos, pero lo castiga con resistencia, durabilidad y estar rodeado (drag down, mordisco por la espalda).
- Ningún arma tiene un ruido de disparo menor de 60, mientras que caminar hace 7: en PZ, disparar es una decisión estratégica de atraer a la horda.

### Gaps
- No encontré la fórmula oficial de la probabilidad de derribo (knockdown) ni el número exacto de objetivos del multi-hit para las armas de B41.
- No hay datos oficiales del daño del pisotón ni del multiplicador sobre zombis caídos (solo fuentes de fans).
- No encontré números de B42 sobre "muscle strain", la pérdida de afilado ni las probabilidades de encasquillamiento.

## 4. ¿Cómo funcionan el sistema de sonido y el sigilo?

### Takeaway
Cada acción emite ruido con un radio en casillas (caminar 7, esprintar 14, agachado 3,5, gritar 30, disparos 60–200, alarma 600, helicóptero 500). Las paredes, las puertas y la distancia lo amortiguan. El sigilo multiplica ese ruido: agacharse (×0,2 base × multiplicador de Sneaking), Lightfooted (99 %→20 %) y Nimble (100 %→50 %). También reduce la detección visual (×0,4 al agacharse, escalado por nivel; Inconspicuous ×0,5, Conspicuous ×2). La oscuridad, las cortinas y la luz completan el sistema.

### Cited Findings
- Volúmenes de acciones — [PZwiki: Noise (42.13.1, del código)](https://pzwiki.net/wiki/Noise):
  - Movimiento sin Lightfooted ni Nimble: esprintar 14, caminar 7, agachado 3,5.
  - Gritar 30 (×3 con megáfono); susurrar 6 (×3 con megáfono).
  - Fuego 20; armas de fuego 30–120 (la tabla de armas llega a 200 en escopetas).
  - Alarma antirrobo 600; helicóptero 500.
  - Construir o desmontar 15; claxon o alarma de coche 150; vehículo en marcha o al ralentí 55–220 según motor y silenciador.
  - Zombi golpeando una puerta o ventana 20; estornudo o tos sin amortiguar 40.
  - Generador 20 o 25; despertador 15; reloj digital 7 (estos dos sin verificar).
  - TV y radio según el volumen; talar y romper ventanas sin dato verificado.
  - El ruido lo amortiguan paredes, puertas y distancia.
- Sandbox de vehículos: Zombie Attraction Multiplier (ruido del motor), por defecto 1, de 0 a 100 — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- Agacharse (Sneaking):
  - Por defecto, moverse agachado multiplica el radio de ruido por 0,2 y la probabilidad de detección por 0,4.
  - El nivel de Sneaking añade un multiplicador al radio del 120 % (nivel 0) al 40 % (nivel 10), con un efectivo del 24 % → 8 %.
  - La probabilidad de detección agachado va del 114 % (nivel 0) al 48 % (nivel 10).
  - Se gana XP agachándose cerca de zombis sin ser detectado.

  Fuente: [PZwiki: Sneaking](https://pzwiki.net/wiki/Sneaking)
- Lightfooted: multiplicador del radio de pasos en todo tipo de movimiento: 99/90/79/71/65/59/52/45/37/30/20 % (niveles 0–10). Se gana XP agachándose sin ser detectado cerca de muchos zombis; un truco es atraerlos con un despertador. Burglar +2; Nurse y Police +1; Gymnast +1 — [PZwiki: Lightfooted](https://pzwiki.net/wiki/Lightfooted)
- Nimble: velocidad al caminar en postura de combate del 100 % al 150 %, y radio de pasos del 100 % al 50 % (en todos los movimientos). Se acumula con Lightfooted. Se gana XP caminando en postura de combate — [PZwiki: Nimble](https://pzwiki.net/wiki/Nimble)
- Visibilidad:
  - Inconspicuous: 50 % de probabilidad de ser visto. Conspicuous: 200 % — [PZwiki: Inconspicuous](https://pzwiki.net/wiki/Inconspicuous); [PZwiki: Conspicuous](https://pzwiki.net/wiki/Conspicuous)
  - Cat's Eyes: luz ambiental mínima del 20 % y cono de visión mayor de noche (para el jugador) — [PZwiki: Cat's Eyes](https://pzwiki.net/wiki/Cat%27s_Eyes)
  - Keen Hearing: radio de percepción del 200 %; los zombis que se acercan por detrás aparecen antes — [PZwiki: Keen Hearing](https://pzwiki.net/wiki/Keen_Hearing)
  - Darkness During Night: Pitch Black / Dark / **Normal** / Bright — [PZwiki: Custom Sandbox](https://pzwiki.net/wiki/Custom_Sandbox)
- Cortinas o sábanas en las ventanas bloquean la línea de visión desde dentro y desde fuera, y solo se manejan desde dentro — [PZwiki: Window](https://pzwiki.net/wiki/Window). Las cortinas no reducen el ruido. Ventanas o puertas abiertas y luces interiores de noche te hacen visible desde fuera (fuente de fans) — [pzfans](https://pzfans.com/what-attracts-zombies-to-bases/)
- Consejo contra el helicóptero: quedarse dentro con cortinas y luces apagadas (un sótano es ideal) o huir en vehículo hacia zonas rurales — [PZwiki: Helicopter](https://pzwiki.net/wiki/Helicopter)
- **[B42]** Animales: su ruido atrae zombis, pero los zombis no los atacan, salvo que se cambie en Sandbox — [PZwiki: Animal](https://pzwiki.net/wiki/Animal). Un servidor señala al oso como depredador agresivo con una IA compleja (fuente secundaria, no confirmada). Otra fuente dice que los animales salvajes huyen y pueden arrastrar hordas — [supercraft.host](https://www.supercraft.host/wiki/project-zomboid/pz_b42_animal_husbandry_server_guide); [games.gg](https://games.gg/pt-BR/project-zomboid/guides/project-zomboid-build-42-novidades-da-versão-estável/)
- **[B42]** Queja de jugadores: los zombis oyen el cuerpo a cuerpo desde muy lejos; la respuesta apunta al ajuste Hearing de Sandbox — [Steam](https://steamcommunity.com/app/108600/discussions/0/604150365670120374)

### Inferences
- Fórmula de pasos inferida combinando las tablas: radio = base (7 caminar / 14 esprintar) × multiplicador de Lightfooted × multiplicador de Nimble × (agachado ? 0,2 × multiplicador de Sneaking : 1). Ejemplo: caminar agachado con Lightfooted 10, Nimble 10 y Sneak 10 da ≈ 7 × 0,2 × 0,5 × 0,08 ≈ 0,06 casillas. No está verificado que se acumulen de forma multiplicativa.
- La detección visual es probabilística (multiplicadores sobre una "probabilidad de ser visto") y depende de la luz, del cono de visión del zombi y de si estás agachado, no de un umbral binario.

### Gaps
- No hay datos oficiales sobre esconderse dentro de vehículos (si los zombis ven a un jugador quieto dentro de un coche apagado).
- No encontré la fórmula exacta de detección visual (distancia × luz × ángulo) ni los radios de visión de los zombis.
- No encontré confirmación de primera mano de animales salvajes agresivos (lobos, osos) en la B42 estable; solo fuentes secundarias.
