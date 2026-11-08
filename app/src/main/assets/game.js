// ============================================================
//  ZombieMap v1.1 — zombies en el mapa real de Guadalupana,
//  Valle de Chalco Solidaridad (Estado de México).
//  Three.js r128 (global THREE), datos en mapa.js (const MAPA).
//  Coordenadas en METROS relativas a la casa de David (0,0);
//  x = este, z = sur (norte = -z). Sin internet, todo local.
// ============================================================
(function () {
  'use strict';

  var SPAWN = MAPA.spawn;          // [x, z] donde aparece el jugador
  var N_ZOMBIES = 15;
  var VIDA_MAX = 100;
  var VEL_JUGADOR = 6;             // m/s
  var VEL_ZOMBIE_CAMINA = 1.5;     // m/s
  var VEL_ZOMBIE_PERSECUCION = 3.6;// m/s
  var DIST_PERSECUCION = 45;       // m
  var DIST_ATAQUE = 1.2;           // m
  var DANO = 10;
  var INVULNERABLE_MS = 1000;

  // ---------------- Escena ----------------
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1d24);
  scene.fog = new THREE.Fog(0x1a1d24, 120, 420);

  var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(SPAWN[0], 24, SPAWN[1] + 18);

  var renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('juego').appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8fa3c7, 0x1c2a1c, 0.9));
  var sol = new THREE.DirectionalLight(0xfff2d9, 0.7);
  sol.position.set(100, 200, 60);
  scene.add(sol);

  // ---------------- Suelo ----------------
  var suelo = new THREE.Mesh(
    new THREE.PlaneGeometry(1400, 1400),
    new THREE.MeshLambertMaterial({ color: 0x20242a })
  );
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = 0;
  scene.add(suelo);

  // ---------------- Calles: una sola BufferGeometry ----------------
  (function construirCalles() {
    var pos = [];
    var idx = [];
    var v = 0;
    for (var s = 0; s < MAPA.calles.length; s++) {
      var pts = MAPA.calles[s];
      var w = MAPA.anchos[s] / 2;
      for (var i = 0; i < pts.length - 1; i++) {
        var ax = pts[i][0], az = pts[i][1];
        var bx = pts[i + 1][0], bz = pts[i + 1][1];
        var dx = bx - ax, dz = bz - az;
        var len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) continue;
        var px = -dz / len * w, pz = dx / len * w;
        pos.push(ax + px, 0.05, az + pz, ax - px, 0.05, az - pz,
                 bx + px, 0.05, bz + pz, bx - px, 0.05, bz - pz);
        idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
        v += 4;
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    scene.add(new THREE.Mesh(geo,
      new THREE.MeshLambertMaterial({ color: 0x5a5a5a, side: THREE.DoubleSide })));
  })();

  // Línea central discontinua blanca sobre cada calle (tramos de 3 m,
  // huecos de 3 m, ancho 0.3 m). Material básico: siempre se ve clara.
  (function construirLineas() {
    var pos = [];
    var idx = [];
    var v = 0;
    var ANCHO = 0.3, LARGO = 3, HUECO = 3;
    for (var s = 0; s < MAPA.calles.length; s++) {
      var pts = MAPA.calles[s];
      for (var i = 0; i < pts.length - 1; i++) {
        var ax = pts[i][0], az = pts[i][1];
        var bx = pts[i + 1][0], bz = pts[i + 1][1];
        var dx = bx - ax, dz = bz - az;
        var len = Math.sqrt(dx * dx + dz * dz);
        if (len < 0.01) continue;
        var ux = dx / len, uz = dz / len;
        var px = -uz * ANCHO / 2, pz = ux * ANCHO / 2;
        var recor = 0;
        while (recor < len) {
          var t0 = recor, t1 = Math.min(recor + LARGO, len);
          var x0 = ax + ux * t0, z0 = az + uz * t0;
          var x1 = ax + ux * t1, z1 = az + uz * t1;
          pos.push(x0 + px, 0.07, z0 + pz, x0 - px, 0.07, z0 - pz,
                   x1 + px, 0.07, z1 + pz, x1 - px, 0.07, z1 - pz);
          idx.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
          v += 4;
          recor += LARGO + HUECO;
        }
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    scene.add(new THREE.Mesh(geo,
      new THREE.MeshBasicMaterial({ color: 0xc8c8c8, side: THREE.DoubleSide })));
  })();

  // ---------------- Casas: un solo InstancedMesh ----------------
  // casas[i] = [cx, cz, w, d, h, rot, colorHex]
  var casas = MAPA.casas;
  var inst = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    casas.length
  );
  var m4 = new THREE.Matrix4();
  var q = new THREE.Quaternion();
  var eu = new THREE.Euler();
  var sc = new THREE.Vector3();
  var pv = new THREE.Vector3();
  var col = new THREE.Color();
  for (var i = 0; i < casas.length; i++) {
    var c = casas[i];
    eu.set(0, c[5], 0);
    q.setFromEuler(eu);
    pv.set(c[0], c[4] / 2, c[1]);
    sc.set(c[2], c[4], c[3]);
    m4.compose(pv, q, sc);
    inst.setMatrixAt(i, m4);
    col.setHex(c[6]);
    inst.setColorAt(i, col);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  scene.add(inst);

  // ---------------- Colisión: rejilla espacial sobre las casas ----------------
  // Círculo (radio r) contra AABB de cada casa, ignorando su rotación.
  // La casa más ancha mide 42.7 m (radio ~21.4 m): con celdas de 25 m,
  // revisar las 3x3 celdas vecinas siempre alcanza.
  var CELDA = 25;
  var rejilla = {};
  for (var ci = 0; ci < casas.length; ci++) {
    var k = Math.floor(casas[ci][0] / CELDA) + ',' + Math.floor(casas[ci][1] / CELDA);
    (rejilla[k] = rejilla[k] || []).push(ci);
  }

  function resolverColision(p, r) {
    var cx0 = Math.floor(p.x / CELDA), cz0 = Math.floor(p.z / CELDA);
    for (var gx = cx0 - 1; gx <= cx0 + 1; gx++) {
      for (var gz = cz0 - 1; gz <= cz0 + 1; gz++) {
        var lista = rejilla[gx + ',' + gz];
        if (!lista) continue;
        for (var j = 0; j < lista.length; j++) {
          var c = casas[lista[j]];
          var hw = c[2] / 2, hd = c[3] / 2;
          var dx = p.x - c[0], dz = p.z - c[1];
          var ox = hw + r - Math.abs(dx);
          if (ox <= 0) continue;
          var oz = hd + r - Math.abs(dz);
          if (oz <= 0) continue;
          // Empuje hacia afuera por el eje de menor penetración.
          if (ox < oz) p.x += (dx >= 0 ? ox : -ox);
          else p.z += (dz >= 0 ? oz : -oz);
        }
      }
    }
  }

  // ---------------- Personajes ----------------
  function crearPersona(colorCuerpo, colorCabeza) {
    var g = new THREE.Group();
    var cuerpo = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.35),
      new THREE.MeshLambertMaterial({ color: colorCuerpo }));
    cuerpo.position.y = 0.95;
    g.add(cuerpo);
    var cabeza = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshLambertMaterial({ color: colorCabeza }));
    cabeza.position.y = 1.68;
    g.add(cabeza);
    return g;
  }

  var jugador = {
    x: SPAWN[0], z: SPAWN[1], dir: 0, vida: VIDA_MAX,
    mesh: crearPersona(0x2fae4e, 0x37c978)
  };
  jugador.mesh.position.set(jugador.x, 0, jugador.z);
  jugador.mesh.scale.set(1.4, 1.4, 1.4);
  scene.add(jugador.mesh);

  // Anillo verde brillante bajo los pies del jugador, para verlo siempre.
  var anilloJugador = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 1.0, 32),
    new THREE.MeshBasicMaterial({ color: 0x2eff7a, side: THREE.DoubleSide })
  );
  anilloJugador.rotation.x = -Math.PI / 2;
  anilloJugador.position.set(jugador.x, 0.06, jugador.z);
  scene.add(anilloJugador);

  // Puntos de calle cerca del spawn, para que los zombies nazcan cerca.
  var puntosCalle = [];
  for (var s = 0; s < MAPA.calles.length; s++) {
    for (var i = 0; i < MAPA.calles[s].length; i++) {
      var p = MAPA.calles[s][i];
      if (Math.hypot(p[0] - SPAWN[0], p[1] - SPAWN[1]) <= 300) puntosCalle.push(p);
    }
  }

  function puntoCalleAzar(centro, radio) {
    for (var t = 0; t < 20; t++) {
      var p = puntosCalle[Math.floor(Math.random() * puntosCalle.length)];
      if (Math.hypot(p[0] - centro.x, p[1] - centro.z) <= radio) return { x: p[0], z: p[1] };
    }
    return { x: centro.x, z: centro.z };
  }

  // Punto de calle a distancia entre rMin y rMax del centro.
  function puntoCalleAnillo(centro, rMin, rMax) {
    for (var t = 0; t < 40; t++) {
      var p = puntosCalle[Math.floor(Math.random() * puntosCalle.length)];
      var d = Math.hypot(p[0] - centro.x, p[1] - centro.z);
      if (d >= rMin && d <= rMax) return { x: p[0], z: p[1] };
    }
    return puntoCalleAzar(centro, rMax);
  }

  var zombies = [];
  for (var zi = 0; zi < N_ZOMBIES; zi++) {
    // Los 5 primeros nacen cerca (60–120 m) para que haya acción pronto.
    var sp = zi < 5 ? puntoCalleAnillo(jugador, 60, 120) : puntoCalleAzar(jugador, 300);
    var zm = crearPersona(0x7a8a6a, 0x8a9a7a);
    zm.scale.set(1.2, 1.2, 1.2);
    zm.position.set(sp.x, 0, sp.z);
    scene.add(zm);
    // Anillo rojo tenue bajo cada zombie, para verlo entre las casas.
    var anilloZ = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.78, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    anilloZ.rotation.x = -Math.PI / 2;
    anilloZ.position.set(sp.x, 0.06, sp.z);
    scene.add(anilloZ);
    zombies.push({
      x: sp.x, z: sp.z, mesh: zm, anillo: anilloZ,
      objetivo: puntoCalleAzar({ x: sp.x, z: sp.z }, 60), espera: 0
    });
  }

  // ---------------- Entrada: joystick táctil + teclado ----------------
  var joy = { x: 0, z: 0 };
  var teclas = {};
  window.addEventListener('keydown', function (e) { teclas[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', function (e) { teclas[e.key.toLowerCase()] = false; });

  var zonaJoy = document.getElementById('joy');
  var palo = document.getElementById('palo');
  var joyId = null;

  function actualizarJoy(t) {
    var r = zonaJoy.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = t.clientX - cx, dy = t.clientY - cy;
    var max = r.width / 2 - 10;
    var len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    palo.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    joy.x = dx / max;
    joy.z = dy / max;
  }

  zonaJoy.addEventListener('touchstart', function (e) {
    e.preventDefault();
    joyId = e.changedTouches[0].identifier;
    actualizarJoy(e.changedTouches[0]);
  }, { passive: false });
  zonaJoy.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyId) actualizarJoy(e.changedTouches[i]);
    }
  }, { passive: false });
  function finJoy(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyId) {
        joyId = null; joy.x = 0; joy.z = 0;
        palo.style.transform = 'translate(0,0)';
      }
    }
  }
  zonaJoy.addEventListener('touchend', finJoy);
  zonaJoy.addEventListener('touchcancel', finJoy);

  // ---------------- HUD ----------------
  var vidaEl = document.getElementById('vida');
  var zombiesEl = document.getElementById('nzombies');
  var tiempoEl = document.getElementById('tiempo');
  var calleEl = document.getElementById('calle');
  var flashEl = document.getElementById('flash');
  var finEl = document.getElementById('fin');
  var segundosEl = document.getElementById('segundos');

  // ---------------- Minimapa ----------------
  var mapaCv = document.getElementById('minimapa');
  var mapaCtx = mapaCv.getContext('2d');
  var tMapa = 0;
  var RANGO_MAPA = 250; // metros visibles alrededor del jugador

  // Dibuja calles (grises), zombies (puntos rojos) y jugador (punto
  // verde al centro). Norte arriba: x->derecha, z sur->abajo.
  function dibujarMinimapa() {
    var W = 150, H = 150;
    var esc = (W / 2) / RANGO_MAPA; // px por metro
    mapaCtx.fillStyle = 'rgba(16,18,22,0.92)';
    mapaCtx.fillRect(0, 0, W, H);
    mapaCtx.strokeStyle = '#8a8a8a';
    mapaCtx.lineWidth = 1;
    for (var s = 0; s < MAPA.calles.length; s++) {
      var pts = MAPA.calles[s];
      mapaCtx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var cx = W / 2 + (pts[i][0] - jugador.x) * esc;
        var cy = H / 2 + (pts[i][1] - jugador.z) * esc;
        if (i === 0) mapaCtx.moveTo(cx, cy);
        else mapaCtx.lineTo(cx, cy);
      }
      mapaCtx.stroke();
    }
    mapaCtx.fillStyle = '#ff4444';
    for (var zi = 0; zi < zombies.length; zi++) {
      mapaCtx.beginPath();
      mapaCtx.arc(W / 2 + (zombies[zi].x - jugador.x) * esc,
                  H / 2 + (zombies[zi].z - jugador.z) * esc, 3, 0, Math.PI * 2);
      mapaCtx.fill();
    }
    mapaCtx.fillStyle = '#2eff7a';
    mapaCtx.beginPath();
    mapaCtx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
    mapaCtx.fill();
  }

  // Segmentos de calle precalculados para el nombre de la calle actual.
  var segmentos = [];
  for (var sg = 0; sg < MAPA.calles.length; sg++) {
    var pts = MAPA.calles[sg];
    for (var pi = 0; pi < pts.length - 1; pi++) {
      segmentos.push({
        ax: pts[pi][0], az: pts[pi][1],
        bx: pts[pi + 1][0], bz: pts[pi + 1][1],
        w: MAPA.anchos[sg], nombre: MAPA.nombres[sg]
      });
    }
  }

  // La calle con nombre más cercana (hasta 15 m de su eje). Solo
  // devuelve '' si de verdad no hay ninguna calle con nombre cerca.
  function calleActual(x, z) {
    var mejor = null, mejorD = 1e9;
    for (var i = 0; i < segmentos.length; i++) {
      var g = segmentos[i];
      if (!g.nombre) continue;
      var dx = g.bx - g.ax, dz = g.bz - g.az;
      var l2 = dx * dx + dz * dz;
      var t = l2 === 0 ? 0 : ((x - g.ax) * dx + (z - g.az) * dz) / l2;
      t = Math.max(0, Math.min(1, t));
      var px = g.ax + t * dx, pz = g.az + t * dz;
      var d = Math.hypot(x - px, z - pz);
      if (d < mejorD) { mejorD = d; mejor = g; }
    }
    if (mejor && mejorD < 15) return mejor.nombre;
    return '';
  }

  // ---------------- Bucle principal ----------------
  var inicio = Date.now();
  var ultimoGolpe = 0;
  var terminado = false;
  var reloj = new THREE.Clock();
  var camDeseada = new THREE.Vector3();
  var tCalle = 0;

  function actualizar(dt) {
    // --- Movimiento del jugador ---
    var mx = joy.x, mz = joy.z;
    if (teclas['w'] || teclas['arrowup']) mz -= 1;
    if (teclas['s'] || teclas['arrowdown']) mz += 1;
    if (teclas['a'] || teclas['arrowleft']) mx -= 1;
    if (teclas['d'] || teclas['arrowright']) mx += 1;
    var ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    jugador.x += mx * VEL_JUGADOR * dt;
    jugador.z += mz * VEL_JUGADOR * dt;
    resolverColision(jugador, 0.5);
    if (ml > 0.1) {
      jugador.dir = Math.atan2(mx, mz);
      jugador.mesh.rotation.y = jugador.dir;
    }
    jugador.mesh.position.set(jugador.x, 0, jugador.z);

    // --- Zombies ---
    var ahora = Date.now();
    for (var i = 0; i < zombies.length; i++) {
      var zb = zombies[i];
      var dxp = jugador.x - zb.x, dzp = jugador.z - zb.z;
      var dp = Math.hypot(dxp, dzp);
      var vx = 0, vz = 0, vel = VEL_ZOMBIE_CAMINA;
      if (dp < DIST_PERSECUCION) {
        // Persecución.
        vel = VEL_ZOMBIE_PERSECUCION;
        vx = dxp / (dp || 1);
        vz = dzp / (dp || 1);
      } else {
        // Deambular hacia un punto cercano de calle.
        var dxo = zb.objetivo.x - zb.x, dzo = zb.objetivo.z - zb.z;
        var distObj = Math.hypot(dxo, dzo);
        zb.espera += dt;
        if (distObj < 2 || zb.espera > 8) {
          zb.objetivo = puntoCalleAzar(zb, 60);
          zb.espera = 0;
        } else {
          vx = dxo / distObj;
          vz = dzo / distObj;
        }
      }
      zb.x += vx * vel * dt;
      zb.z += vz * vel * dt;
      resolverColision(zb, 0.5);
      if (vx !== 0 || vz !== 0) zb.mesh.rotation.y = Math.atan2(vx, vz);
      zb.mesh.position.set(zb.x, 0, zb.z);
      zb.anillo.position.set(zb.x, 0.06, zb.z);

      // --- Ataque ---
      var d2 = Math.hypot(jugador.x - zb.x, jugador.z - zb.z);
      if (d2 < DIST_ATAQUE && ahora - ultimoGolpe > INVULNERABLE_MS && !terminado) {
        ultimoGolpe = ahora;
        jugador.vida -= DANO;
        // Empuje de 3 m alejándose del zombie.
        var ex = jugador.x - zb.x, ez = jugador.z - zb.z;
        var el = Math.hypot(ex, ez) || 1;
        jugador.x += ex / el * 3;
        jugador.z += ez / el * 3;
        resolverColision(jugador, 0.5);
        jugador.mesh.position.set(jugador.x, 0, jugador.z);
        flashEl.style.opacity = '0.55';
        setTimeout(function () { flashEl.style.opacity = '0'; }, 150);
        if (jugador.vida <= 0) {
          jugador.vida = 0;
          terminado = true;
          segundosEl.textContent = Math.floor((Date.now() - inicio) / 1000);
          finEl.style.display = 'flex';
        }
      }
    }

    // --- Anillo del jugador: siempre bajo sus pies ---
    anilloJugador.position.set(jugador.x, 0.06, jugador.z);

    // --- Cámara: sigue desde atrás-arriba con lerp suave ---
    camDeseada.set(jugador.x, 24, jugador.z + 18);
    camera.position.lerp(camDeseada, Math.min(1, dt * 4));
    camera.lookAt(jugador.x, 1, jugador.z);

    // --- HUD ---
    vidaEl.style.width = jugador.vida + '%';
    vidaEl.style.background = jugador.vida > 50 ? '#2fae4e'
      : (jugador.vida > 25 ? '#e0a030' : '#d23b3b');
    tiempoEl.textContent = 'Tiempo: ' + Math.floor((Date.now() - inicio) / 1000) + 's';
    tMapa += dt;
    if (tMapa > 0.2) {
      tMapa = 0;
      dibujarMinimapa();
    }
    tCalle += dt;
    if (tCalle > 0.25) {
      tCalle = 0;
      var nc = calleActual(jugador.x, jugador.z);
      calleEl.textContent = nc ? ('📍 ' + nc) : '📍 —';
    }
  }

  function bucle() {
    requestAnimationFrame(bucle);
    if (terminado) { renderer.render(scene, camera); return; }
    var dt = Math.min(reloj.getDelta(), 0.05);
    actualizar(dt);
    renderer.render(scene, camera);
  }

  zombiesEl.textContent = 'Zombies: ' + zombies.length;
  dibujarMinimapa();
  // Gancho de depuración (pruebas automatizadas; no afecta el juego).
  window.__zm = { jugador: jugador, zombies: zombies, calleActual: calleActual, MAPA: MAPA };
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  bucle();
})();
