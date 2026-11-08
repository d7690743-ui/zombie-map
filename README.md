# ZombieMap v1

Juego zombie con el mapa real de la colonia Guadalupana, Valle de
Chalco Solidaridad (Estado de México). Nuestra versión propia estilo
KnoxMap / Project Zomboid, pero como juego independiente para el
teléfono, sin Steam ni PC.

## Qué es

- **Mapa real en 3D**: 163 calles con sus nombres reales de
  OpenStreetMap (Av. Pascual Ortiz Rubio, Av. Adolfo López Mateos,
  etc.) y 4602 casas. El mapa está en `app/src/main/assets/mapa.js`
  (constante `MAPA`, sin fetch: funciona sin internet).
- **Jugador verde** que aparece junto a su casa; **15 zombies**
  gris-verdosos que deambulan por las calles y te persiguen si te
  ven a menos de 30 m.
- **Sin armas en v1**: el objetivo es sobrevivir. Cada mordida
  quita 10 de vida; a 0 sale la pantalla de fin con los segundos
  sobrevividos y botón de reinicio.

## Novedades de la 1.1

Mejoras tras probar la v1 en el teléfono (la captura mostraba las
calles casi invisibles, la cámara muy cerrada, el jugador diminuto y
ningún zombie en pantalla):

- **Calles visibles**: suelo más oscuro, calles en gris claro y línea
  central blanca discontinua sobre cada calle.
- **Cámara más abierta**: sigue al jugador desde (0, 24, 18), FOV 60,
  para ver más calle por delante y los zombies que vienen.
- **Jugador más visible**: escala 1.4x y anillo verde brillante bajo
  sus pies.
- **Minimapa** arriba a la derecha (150x150): calles, jugador en
  verde y zombies en rojo, norte arriba, se actualiza cada 200 ms.
- **Nombre de calle**: ahora detecta la calle con nombre más cercana
  hasta 15 m (antes solo sobre la calle) y casi nunca muestra "—".
- **Zombies más visibles y activos**: escala 1.2x con anillo rojo
  tenue, persiguen desde 45 m (antes 30 m) y más rápido (3.6 m/s);
  5 de los 15 nacen a 60–120 m del jugador para que haya acción
  pronto.

## Cómo se juega

- **Teléfono**: joystick virtual abajo a la izquierda.
- **Teclado** (si lo pruebas en PC): WASD o flechas.
- La cámara sigue al jugador desde atrás-arriba. Arriba a la
  izquierda ves la vida, los zombies, el tiempo y el nombre de la
  calle por la que caminas.

## Compilar

1. Crea el repo `zombie-map` en GitHub (vacío, público).
2. Sube este proyecto (`git add -A`, commit, push a `main`).
3. En la pestaña **Actions** descarga el artifact `app-debug`.

## Notas técnicas

- WebView a pantalla completa con Three.js r128 local (sin módulos,
  sin internet) + `mapa.js` + `game.js` en `app/src/main/assets/`.
- Rendimiento para gama media (Redmi Note 11 / Snapdragon 680):
  calles en UNA sola BufferGeometry, casas en UN solo InstancedMesh
  (4602 instancias, 1 draw call), sin sombras, niebla 120–420 m,
  antialias apagado, pixelRatio máximo 1.5.
- Colisión jugador/zombies contra casas con rejilla espacial de 25 m.
- Gradle 8.9, AGP 8.7.3, Kotlin 1.9.24, Java 17, compileSdk/targetSdk
  35, minSdk 24. Sin dependencias externas.
