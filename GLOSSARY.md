# Glosario

Vocabulario de LogPose. El nombre en `código` es el del contrato (`packages/contracts`); lo que aún no existe lleva «sin implementar».

## Serie

**Saga**:
Bloque mayor de la historia (East Blue, Arabasta…); agrupa arcos. Se identifica por su `slug`.

**Arco** (`Arc`):
Tramo de una saga, identificado por su `slug`; su `type` dice si es canon, relleno o mixto.

**Episodio** (`Episode`):
Episodio del anime, identificado por su número (`number`). Es el eje de la cronología: el progreso y los desbloqueos se anclan a episodios, no a capítulos del manga.

**Canon / relleno**:
Si un episodio adapta el manga (`canon`), no lo adapta (`filler`), mezcla ambos (`mixed`) o resume (`recap`). El arco lleva los tres primeros (`type`) y la web solo marca como relleno `filler`; `recap` solo está en los episodios de research.

**Research** (`data/research/`):
Fuente única de la serie: sagas, arcos y episodios con sus textos en es/en/ja. De ella salen los datos de la API y los locales de la web ([ADR 0018](docs/adr/0018-datos-de-la-serie-desde-research.md)).

**Progreso de la serie** (`lastWatchedEpisode`):
Número del último episodio visto (0 = ninguno); un episodio está visto si su número no lo supera. Saga y arco salen del episodio. Es el único dato de progreso que se guarda: XP, nivel, cartas de episodio, avatares (`AVATAR_PROGRESS_UNLOCK_RULES`) y logros se calculan a partir de él ([ADR 0021](docs/adr/0021-progreso-derivado-de-un-numero.md)).

## Cartas y progresión

**Character**:
Entidad estable del personaje; agrupa sus cartas. Sin implementar.

**Card**:
Coleccionable concreto anclado a un momento de la historia (Luffy Gear 5), no el personaje genérico. Todas las categorías (`character`, `item`, `fruit`, `sword`, `boat`) son `Card`. Sin implementar.
Regla de variante: una carta = un cambio visual anclado a un episodio (una transformación, una etapa como niño o tras el salto temporal, un disfraz con nombre propio en el arco). Un hito de poder sin cambio visual no es carta.
_Evitar_: versión (a secas), personaje.

**XP** (`experience`):
Experiencia del usuario: la suma de `episode.experience` de los episodios vistos, más la de las misiones. Se guarda solo para ordenar el ranking y se recalcula entera en cada cambio de progreso. La de cada episodio la calcula el script de research según su tipo, sus eventos y si cierra arco o saga.

**Nivel**:
Sale de la XP: el mayor L con `15·L·(L−1)` menor o igual que ella. No se guarda.

**Berries**:
Moneda blanda del juego. Sin implementar.

**Logro** (`Achievement`):
Reto con una condición (completar un arco, reunir N cartas) que se cumple o no según el progreso y la colección; no se guarda. Sin implementar.

**weeklyScore**:
Puntuación de la liga semanal. Sin implementar: el ranking global ordena por `experience`.

**Server-authoritative**:
El servidor calcula todo lo que da el progreso; el cliente solo dice por qué episodio va (N).

## Red social

**Post**:
Texto con hasta 4 imágenes y una visibilidad. 280 caracteres, o 600 si el autor está verificado.

**Retweet**:
Post envoltorio (`isRetweet`, `retweetOf`) que copia el texto y las imágenes del original al crearse. Like, guardado y retweet actúan sobre el original. Solo se retuitea lo público.

**Todos** (`feed: 'all'`):
Vista de la comunidad con todo lo que el viewer puede ver, por fecha y sin retweets.

**Siguiendo** (`feed: 'following'`):
Vista de la comunidad con lo propio y lo de quien sigues, más lo que retuitean. Cada post sale una vez, en su aparición más reciente ([ADR 0022](docs/adr/0022-dos-vistas-del-feed.md)).

**Guardado** (`bookmark`):
Post que el usuario marca para leer después; sale en la pestaña de guardados de su perfil.

**Borrado lógico** (`isDeleted`):
Un post borrado se marca, no se elimina, y arrastra a sus retweets. Un retweet cuyo original no aparece no se sirve.

**Evento de notificación** (`notification_events`):
Aviso pendiente que deja un like, guardado, follow o retweet. El worker lo convierte en notificación según los ajustes del destinatario y, si falla, lo reintenta ([ADR 0020](docs/adr/0020-notificaciones-por-cola-en-mongo.md)).

**Verificado** (`verified`):
Usuario premium: insignia junto al nombre y posts más largos. El pago es simulado.

## Acceso

**Viewer**:
Quién hace la petición: anónimo, o usuario con su rol. Lo resuelve `SessionGuard` una vez por petición ([ADR 0004](docs/adr/0004-auth-propia-rol-simple.md)).

**Sesión** (`sessions`):
Login abierto en un navegador: un token aleatorio en la cookie y su hash en Mongo. Dura 30 días desde el último uso y se revoca al cerrar sesión o cambiar la contraseña ([ADR 0016](docs/adr/0016-sesiones-opacas-en-mongo.md)).

**Rol** (`role`):
`user` o `admin`, leído de la base de datos. El admin ve todo de todos.

**Acceso** (`access`):
Lo que un viewer ve de un perfil: `full` (su dueño o un admin) o `public` ([ADR 0006](docs/adr/0006-que-ve-cada-audiencia.md)).

**Visibilidad** (`visibility`):
Quién ve un post: `public` (todos), `followers` (quien sigue al dueño) o `private` (nadie más). El dueño y el admin lo ven siempre.

**Privacidad** (`privacy`):
Qué pestañas del perfil (posts, likes, guardados, comentarios) y sus contadores ven los demás.

## Choques de nombre

**Card v1 / v2**:
v1 es el catálogo antiguo: una entrada por personaje con arrays paralelos (`type[]`, `bounty[]`) y `unlockedCards` como cinco listas de ids. v2 es `Card`, una por versión. No confundir con la app anterior, también llamada v2 (este monorepo es v3).
_Evitar_: v2 a secas.

**`experience` / XP**:
Lo mismo. En el código, `experience`; en la interfaz y en los docs, XP.

**`rewards`**:
`episode.rewards` son solo las cartas que da un episodio, por categoría; la XP va aparte en `experience`. «Logro» queda para `Achievement`.
