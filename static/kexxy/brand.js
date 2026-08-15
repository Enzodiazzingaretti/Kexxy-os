/* ============================================================
   KEXXY OS — capa de marca
   ------------------------------------------------------------
   Archivo propio: no existe en odysseus-dev/odysseus, así que
   `git pull` nunca lo toca ni genera conflictos acá adentro.

   Se engancha desde DOS líneas agregadas en static/index.html.
   Si algún día querés volver al original, borrá esas dos líneas
   y esta carpeta: no queda rastro.

   Corre SÍNCRONO en el <head>, después del script de favicon por
   ruta de upstream, para pisar título / ícono / manifest antes
   del primer pintado (sin parpadeo de "Odysseus").
   ============================================================ */
(function () {
  'use strict';

  var BRAND = 'KEXXY OS';
  var SHORT = 'KEXXY';
  var ACCENT = '#ffb000';

  var LS_THEME = 'odysseus-theme';
  var LS_CUSTOM = 'odysseus-custom-themes';
  var SEED_KEY = 'kexxy-brand-seeded';

  // Lo usan los pocos strings que quedaron parcheados en el JS de
  // upstream (chatRenderer.js, chat.js, app.js).
  window.KEXXY_BRAND = BRAND;

  /* ── 1. Tema ────────────────────────────────────────────────
     Se siembra UNA sola vez, con la misma forma de objeto que usa
     theme.js (`{name, colors, font, density}`). A partir de ahí es
     un tema custom común: editalo desde Ajustes → Apariencia y
     esto no lo vuelve a tocar nunca.

     Sembrar en localStorage ANTES de que corra theme.js importa:
     theme.js sólo baja el tema del servidor si no encuentra uno
     local (`if (!getSaved())`), así que esto gana sin pelear.
     ──────────────────────────────────────────────────────────── */
  var COLORS = {
    bg:     '#0b0d0e',   // fondo casi negro, tinte frío
    fg:     '#d6d3cd',   // texto neutro cálido, sin blanco puro
    panel:  '#08090a',
    border: '#1e2224',
    red:    ACCENT,      // 'red' es el token de acento global
    advanced: {
      sidebarBg:     '#08090a',
      brandColor:    ACCENT,
      brandMixTo:    '#ff7a00',
      userBubbleBg:  '#14171a',
      aiBubbleBg:    '#0e1112',
      bubbleBorder:  '#1e2224',
      inputBg:       '#0e1112',
      inputBorder:   '#24292c',
      sendBtnBg:     ACCENT,
      sendBtnHover:  '#ffc44d',
      codeBg:        '#070809',
      codeFg:        '#d6d3cd',
      toggleActive:  ACCENT,
      accentPrimary: ACCENT
    }
  };

  function seedTheme() {
    try {
      if (localStorage.getItem(SEED_KEY)) return;

      localStorage.setItem(LS_THEME, JSON.stringify({
        name: BRAND, colors: COLORS, font: 'mono', density: 'compact'
      }));

      // Guardarlo también como tema custom: aparece en el selector de
      // Apariencia y podés volver a él después de probar otros.
      var ct = {};
      try { ct = JSON.parse(localStorage.getItem(LS_CUSTOM)) || {}; } catch (_) {}
      var entry = {};
      for (var k in COLORS) { if (COLORS.hasOwnProperty(k)) entry[k] = COLORS[k]; }
      entry.font = 'mono';
      entry.density = 'compact';
      ct[BRAND] = entry;
      localStorage.setItem(LS_CUSTOM, JSON.stringify(ct));

      localStorage.setItem(SEED_KEY, '1');

      // Empujarlo al servidor por la misma API que usa Ajustes, para que
      // sobreviva a un borrado de localStorage y aparezca en otro navegador.
      window.addEventListener('load', function () {
        push('/api/prefs/theme', { name: BRAND, colors: COLORS, font: 'mono', density: 'compact' });
        push('/api/prefs/custom-themes', ct);
      }, { once: true });
    } catch (_) {}
  }

  function push(url, value) {
    try {
      fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ value: value })
      }).catch(function () {});
    } catch (_) {}
  }

  /* ── 2. La marca: el emblema KEXXY ──────────────────────────
     Reemplaza el barquito (referencia a la Odisea). Los PNG se
     generan desde kexxy-logo-white.png; los tamaños chicos van
     con una pasada de dilatación porque las puntas del emblema
     desaparecen en el resample a 16-32px.

     En la UI no se usa el PNG teñido sino logo-mask.png como
     mask-image de CSS (ver brand.css): así el logo toma
     --brand-color y sigue al tema, igual que hacía el SVG
     original con currentColor.
     ──────────────────────────────────────────────────────────── */
  var ASSETS = {
    fav16:  '/static/kexxy/favicon-16.png',
    fav32:  '/static/kexxy/favicon-32.png',
    icon192: '/static/kexxy/icon-192.png',
    icon512: '/static/kexxy/icon-512.png'
  };

  function accent() {
    try {
      var t = JSON.parse(localStorage.getItem(LS_THEME));
      return (t && ((t.colors && t.colors.red) || t.red)) || ACCENT;
    } catch (_) { return ACCENT; }
  }

  /* ── 3. Título, favicon y manifest (antes del primer pintado) ── */
  var ROUTE_SHAPES = ['/calendar', '/notes', '/cookbook', '/email',
                      '/memory', '/gallery', '/tasks', '/library'];

  function fixTitle() {
    var t = document.title || '';
    if (t.indexOf('Odysseus') === -1) return;
    // "Odysseus Chat" (raíz) → "KEXXY OS"; "Calendar — Odysseus" → "Calendar — KEXXY OS"
    document.title = t.replace(/Odysseus Chat/g, BRAND).replace(/Odysseus/g, BRAND);
  }

  function fixIcon() {
    var path = (window.location.pathname || '').toLowerCase();
    // En rutas con glifo propio (calendario, notas…) upstream ya puso un
    // ícono que no es de marca: se respeta. Sólo se pisa el barquito.
    if (ROUTE_SHAPES.indexOf(path) !== -1) return;

    // Se declaran los dos tamaños y decide el navegador: a 16px se usa la
    // versión más dilatada, que es la única que sobrevive.
    var links = document.querySelectorAll("link[rel='icon']");
    for (var i = 0; i < links.length; i++) links[i].parentNode.removeChild(links[i]);

    [['16x16', ASSETS.fav16], ['32x32', ASSETS.fav32]].forEach(function (pair) {
      var l = document.createElement('link');
      l.rel = 'icon'; l.type = 'image/png';
      l.setAttribute('sizes', pair[0]);
      l.href = pair[1];
      document.head.appendChild(l);
    });

    var apple = document.querySelector("link[rel='apple-touch-icon']");
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      document.head.appendChild(apple);
    }
    apple.href = ASSETS.icon192;
    return ASSETS.icon192;
  }

  function fixManifest(iconHref) {
    try {
      if (typeof Blob === 'undefined') return;
      var path = (window.location.pathname || '/');
      var link = document.querySelector("link[rel='manifest']");
      if (!link) return;
      var label = (document.title || BRAND);
      var manifest = {
        name: label,
        short_name: SHORT,
        start_url: path,
        scope: '/',
        display: 'standalone',
        background_color: COLORS.bg,
        theme_color: accent(),
        icons: [
          { src: iconHref || ASSETS.icon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: ASSETS.icon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      };
      var url = URL.createObjectURL(
        new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' })
      );
      link.href = url;
    } catch (_) {}
  }

  /* ── 4. Renombrado en el DOM ────────────────────────────────
     Acotado a selectores concretos a propósito: NUNCA se recorre el
     log del chat, porque un mensaje tuyo o del modelo puede decir
     "Odysseus" legítimamente y no hay que reescribirlo.
     ──────────────────────────────────────────────────────────── */
  var SCOPES = [
    '.sidebar-brand-title',
    '.welcome-name',
    'h1.a11y-visually-hidden',
    '[data-settings-panel="appearance"]'
  ];

  function renameIn(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.indexOf('Odysseus') !== -1) nodes.push(walker.currentNode);
    }
    for (var i = 0; i < nodes.length; i++) {
      // "Odysseus Logo" en Apariencia queda como "Logo": el nombre ahí
      // sobra, ya se sabe de qué app es.
      nodes[i].nodeValue = nodes[i].nodeValue
        .replace(/Odysseus Logo/g, 'Logo')
        .replace(/Odysseus/g, BRAND);
    }
  }

  function mark(cls) {
    var s = document.createElement('span');
    s.className = 'kexxy-mark ' + cls;
    s.setAttribute('data-kexxy', '1');
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  /* El barquito de la bienvenida se saca, no se reemplaza.

     El emblema ya está ahí dos veces —de fondo detrás del nombre y en el
     divisor espinado—, y a 1.8rem no se lee como sigilo: queda un asterisco
     que compite con el sigilo grande. Para volver a ponerlo, cambiar el
     remove() por:  el.parentNode.replaceChild(mark('welcome-boat'), el);
     y restaurar la regla .kexxy-mark.welcome-boat en brand.css. */
  function swapBoat() {
    var boats = document.querySelectorAll('svg.welcome-boat, .kexxy-mark.welcome-boat');
    for (var i = 0; i < boats.length; i++) {
      if (boats[i].parentNode) boats[i].parentNode.removeChild(boats[i]);
    }
  }

  /* Pantalla de carga. El overlay #app-loader es lo único que se ve mientras
     la app arranca (que son varios segundos), y traía sólo la onda ASCII.
     El emblema va arriba de la onda.

     Se busca con un loop corto de rAF en vez de esperar a DOMContentLoaded:
     este script corre en el <head>, así que el <body> todavía no existe, pero
     el overlay aparece en el primer frame y conviene no perdérselo. */
  function markLoader(tries) {
    var loader = document.getElementById('app-loader');
    if (loader) {
      if (!loader.querySelector('.kexxy-mark')) {
        loader.insertBefore(mark('kexxy-mark-loader'), loader.firstChild);
      }
      return;
    }
    if ((tries || 0) > 120) return;  // ~2s y se abandona
    requestAnimationFrame(function () { markLoader((tries || 0) + 1); });
  }

  /* Agrupar la lista de herramientas.

     Upstream las lista alfabéticamente: Brain, Calendar, Compare, Cookbook,
     Deep Research, Gallery, Library, Notes, Tasks. Diecisiete filas del mismo
     peso donde "New Chat" pesa igual que "Theme", y el alfabeto no dice nada
     sobre para qué sirve cada una.

     Se reordenan por función. Es seguro: son hermanos estáticos dentro de
     #tools-section y no hay orden persistido que pisar — el arrastre de
     secciones que guarda `sidebar-section-order` opera sobre las secciones
     (Chats, Email, Tools), no sobre estos items.

     Idempotente: el MutationObserver reejecuta el pase, y sin la guarda esto
     reordenaría en loop. */
  var GRUPOS = [
    ['Asistente', ['tool-memory-btn', 'tool-research-btn', 'tool-compare-btn', 'tool-cookbook-btn']],
    ['Trabajo',   ['tool-notes-btn', 'tool-tasks-btn', 'tool-calendar-btn', 'tool-library-btn', 'tool-gallery-btn']],
    ['Propio',    ['kexxy-proyectos-btn', 'kexxy-panel-btn']],
    ['Sistema',   ['tool-theme-btn']]
  ];

  function agruparSidebar() {
    var seccion = document.getElementById('tools-section');
    if (!seccion || seccion.dataset.kexxyAgrupado === '1') return;

    // Sin nuestros dos items todavía no tiene sentido agrupar: quedarían
    // fuera del bloque "Propio" y habría que rehacerlo.
    if (!document.getElementById('kexxy-panel-btn')) return;

    GRUPOS.forEach(function (g) {
      var titulo = g[0], ids = g[1];
      var presentes = ids.map(function (id) { return document.getElementById(id); })
                         .filter(Boolean);
      if (!presentes.length) return;

      var rotulo = document.createElement('div');
      rotulo.className = 'kx-grupo';
      rotulo.textContent = titulo;
      seccion.appendChild(rotulo);
      presentes.forEach(function (el) { seccion.appendChild(el); });
    });

    seccion.dataset.kexxyAgrupado = '1';
  }

  // El sidebar no traía logo, sólo texto. Se le antepone el emblema.
  function markSidebar() {
    var brand = document.querySelector('.sidebar-brand');
    if (!brand || brand.querySelector('.kexxy-mark')) return;
    var title = brand.querySelector('.sidebar-brand-title');
    brand.insertBefore(mark('kexxy-mark-sidebar'), title || brand.firstChild);
  }

  /* ── Panel de proyectos y finanzas ──────────────────────────
     No se embebe el panel en un iframe: la CSP declara `frame-src 'self'`,
     así que habría que parchear el middleware de upstream, y además el
     iframe dependería de que el servidor del panel esté levantado.

     En vez de eso se renderizan sus datos acá, leyendo el mismo cache.json
     montado en :ro que usa el servidor MCP. Consecuencias: se ve con el tema
     de KEXXY OS, funciona con el panel apagado, y la interfaz y el modelo
     miran exactamente la misma fuente — no hay dos verdades que diverjan.
     ──────────────────────────────────────────────────────────── */

  var ICONOS = {
    panel: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    proyectos: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>' +
               '<rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'
  };

  function itemSidebar(id, etiqueta, titulo, icono, onClick) {
    if (document.getElementById(id)) return null;
    var el = document.createElement('div');
    el.className = 'list-item';
    el.id = id;
    el.title = titulo;
    el.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"' +
      ' style="flex-shrink:0;opacity:0.5;">' + icono + '</svg>' +
      '<span class="grow">' + etiqueta + '</span>';
    el.addEventListener('click', onClick);
    return el;
  }

  function addPanelLink() {
    var theme = document.getElementById('tool-theme-btn');
    if (!theme || !theme.parentNode) return;
    var proy = itemSidebar('kexxy-proyectos-btn', 'Proyectos',
      'Proyectos con miniatura, estado de git y accesos', ICONOS.proyectos, openProyectos);
    if (proy) theme.parentNode.insertBefore(proy, theme);
    var panel = itemSidebar('kexxy-panel-btn', 'Panel',
      'Cobros, alertas y estado general', ICONOS.panel, openPanel);
    if (panel) theme.parentNode.insertBefore(panel, theme);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function antiguedad(generado) {
    if (!generado) return 'antigüedad desconocida';
    var t = new Date(generado);
    if (isNaN(t)) return String(generado);
    var horas = (Date.now() - t.getTime()) / 36e5;
    if (horas < 1) return 'hace ' + Math.round(horas * 60) + ' min';
    if (horas < 48) return 'hace ' + Math.round(horas) + ' h';
    return 'hace ' + Math.round(horas / 24) + ' días';
  }

  function seccion(titulo, cuerpo) {
    return '<div class="kx-sec"><h3>' + esc(titulo) + '</h3>' + cuerpo + '</div>';
  }

  /* Los montos vienen crudos del panel (138457.95). Sin separadores no se
     leen de un vistazo, que es justo para lo que sirve esta vista. Se usa
     formato local y no una moneda fija porque el panel mezcla pesos y
     dólares en los conceptos. */
  var NUM = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
  function plata(n) {
    var v = Number(n);
    return isFinite(v) ? '$' + NUM.format(v) : esc(n);
  }

  function render(d) {
    var proyectos = d.proyectos || [];
    var alertas = d.alertas || [];
    var fin = d.finanzas || {};
    var maquina = d.maquina || {};
    var html = '';

    // Encabezado: de qué máquina son los datos y de cuándo.
    html += '<div class="kx-meta">' +
      esc(maquina.etiqueta || maquina.hostname || 'máquina') +
      ' · datos ' + esc(antiguedad(d.generado)) + '</div>';

    // Finanzas primero: es lo que tiene consecuencias con fecha.
    if (fin && (fin.vencidos || fin.pendientes || fin.proximos)) {
      var cifras = '<div class="kx-cifras">' +
        '<div class="kx-cifra' + (fin.totalVencido ? ' kx-alto' : '') + '">' +
          '<span>Vencido</span><b>' + plata(fin.totalVencido || 0) + '</b></div>' +
        '<div class="kx-cifra"><span>Pendiente</span><b>' + plata(fin.totalPendiente || 0) + '</b></div>' +
        '<div class="kx-cifra"><span>Próximo</span><b>' + plata(fin.totalProximos || 0) + '</b></div>' +
        '</div>';
      var venc = (fin.vencidos || []).map(function (i) {
        return '<li class="kx-alto">' + esc(i.concepto || i) + '</li>';
      }).join('');
      if (venc) cifras += '<ul class="kx-lista">' + venc + '</ul>';
      html += seccion('Cobros', cifras);
    }

    // Alertas, de mayor a menor severidad.
    if (alertas.length) {
      var orden = { alta: 0, media: 1, baja: 2 };
      var ord = alertas.slice().sort(function (a, b) {
        return (orden[a.severidad] ?? 3) - (orden[b.severidad] ?? 3);
      });
      // El desglose por severidad en el título evita tener que contar a ojo
      // cuántas de las 25 son urgentes.
      var cuenta = {};
      alertas.forEach(function (a) {
        cuenta[a.severidad || 'baja'] = (cuenta[a.severidad || 'baja'] || 0) + 1;
      });
      var desglose = ['alta', 'media', 'baja']
        .filter(function (s) { return cuenta[s]; })
        .map(function (s) { return cuenta[s] + ' ' + s; })
        .join(' · ');

      html += seccion('Alertas — ' + desglose,
        '<ul class="kx-lista">' + ord.map(function (a) {
          return '<li class="kx-' + esc(a.severidad || 'baja') + '">' + esc(a.texto || '') + '</li>';
        }).join('') + '</ul>');
    }

    // Los proyectos tienen vista propia. Acá va sólo un resumen de una línea,
    // para no duplicar información en dos lugares que después divergen.
    if (proyectos.length) {
      var sucios = proyectos.filter(function (p) {
        var g = p.git || {};
        return g.sucios || g.adelante || g.atras || !g.esRepo;
      }).length;
      html += seccion('Proyectos',
        '<div class="kx-resumen-proy">' + proyectos.length + ' proyectos · ' +
        (sucios ? sucios + ' necesitan atención' : 'todos limpios') +
        ' <span class="kx-hint">— ver detalle en Proyectos</span></div>');
    }
    return html;
  }

  /* Acciones por proyecto.

     Son TODAS navegación (abrir una URL), nunca ejecución. No es una
     limitación que se pueda levantar con más código: `connect-src 'self'`
     bloquea llamar a la API del panel desde acá, y esa API es justamente la
     que ejecuta comandos. Cosas como "indexar" o "git pull" siguen siendo
     del panel o de sus .bat. */
  var GRAPH_URL = 'http://localhost:9749';
  var VAULT = 'boveda';
  var PANEL_API = 'http://127.0.0.1:4321';
  var BAT_INDEXAR = 'Indexar-Proyecto.bat';

  /* Indexar es la única acción que EJECUTA algo, y por eso va aparte del
     resto (que son links). El pedido sale del navegador —que corre en
     Windows y llega al panel— y no del contenedor, que sigue sin alcanzarlo.

     Requiere dos cosas que están documentadas donde corresponde: la CSP
     ensanchada con KEXXY_PANEL_ORIGIN (docker/kexxy.yml) y CORS en el panel
     acotado a este origen. El panel valida del lado del servidor que el .bat
     exista en el repo, así que desde acá no se puede pedir cualquier cosa. */
  function postPanel(ruta, cuerpo) {
    return fetch(PANEL_API + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status);
        return j;
      });
    });
  }

  function ocupar(boton, texto) {
    boton.dataset.previo = boton.dataset.previo || boton.textContent;
    boton.textContent = texto;
    boton.classList.add('kx-ocupado');
    boton.disabled = true;
  }

  function resolver(boton, ok, texto, detalle) {
    boton.classList.remove('kx-ocupado');
    boton.disabled = false;
    boton.classList.add(ok ? 'kx-hecho' : 'kx-fallo');
    boton.textContent = texto;
    if (detalle) boton.title = detalle;
    setTimeout(function () {
      boton.textContent = boton.dataset.previo || texto;
      boton.classList.remove('kx-hecho', 'kx-fallo');
    }, ok ? 2500 : 5000);
  }

  function fallar(boton, e) {
    // Distinguir "el panel no contestó" de "el panel contestó que no". Meter
    // todo en "panel apagado" mandaba a reiniciar el panel cuando el problema
    // era otro, y escondía el mensaje real.
    var red = e instanceof TypeError;
    resolver(boton, false, red ? 'Panel apagado' : 'No se pudo',
      red ? 'No pude hablar con el panel. Abrilo con Panel.bat y reintentá.' : e.message);
  }

  /* Levantar dev mata primero TODO dev que haya quedado vivo. Sin esto, los
     servidores de sesiones anteriores siguen ocupando su puerto y el nuevo
     arranca en otro sin avisar, o directamente falla. */
  function levantarDev(nombre, boton) {
    ocupar(boton, 'Limpiando…');
    postPanel('/api/dev', { accion: 'detener-todos' })
      .then(function (r) {
        var muertos = (r.detenidos || []).length;
        boton.textContent = muertos ? 'Arrancando… (' + muertos + ' zombie' + (muertos > 1 ? 's' : '') + ')'
                                    : 'Arrancando…';
        return postPanel('/api/dev', { proyecto: nombre, accion: 'arrancar' });
      })
      .then(function () { resolver(boton, true, 'Corriendo'); })
      .catch(function (e) { fallar(boton, e); });
  }

  /* Las operaciones de git son trabajos asíncronos del panel: el POST sólo
     los encola. Hay que seguir el estado hasta que deje de estar corriendo,
     si no el botón diría "listo" con el push todavía en curso. */
  function seguirGit(nombre, boton, verbo) {
    var intentos = 0;
    (function mirar() {
      fetch(PANEL_API + '/api/git', { credentials: 'omit' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var t = (d.git || d)[nombre];
          if (!t || t.estado === 'corriendo') {
            if (++intentos > 90) return resolver(boton, false, 'Sin respuesta',
              'El trabajo sigue corriendo después de 3 minutos. Miralo en el panel.');
            return setTimeout(mirar, 2000);
          }
          if (t.estado === 'ok') {
            resolver(boton, true, verbo + ' ok');
          } else {
            resolver(boton, false, 'Falló',
              (t.clasificacion ? t.clasificacion + ' — ' : '') + (t.salida || '').slice(-300));
          }
        })
        .catch(function (e) { fallar(boton, e); });
    })();
  }

  function gitOperacion(nombre, operacion, mensaje, boton) {
    ocupar(boton, operacion === 'pull' ? 'Trayendo…' : 'Subiendo…');
    postPanel('/api/git', { proyecto: nombre, operacion: operacion, mensaje: mensaje })
      .then(function () { seguirGit(nombre, boton, operacion === 'pull' ? 'Traído' : 'Subido'); })
      .catch(function (e) { fallar(boton, e); });
  }

  /* Pedir el mensaje de commit inline y no con prompt(): el prompt del
     navegador bloquea la página entera y se ve como un error del sistema. */
  function pedirMensaje(boton, alConfirmar) {
    var fila = boton.parentNode;
    if (fila.querySelector('.kx-commit')) return;
    var caja = document.createElement('div');
    caja.className = 'kx-commit';
    caja.innerHTML = '<input type="text" placeholder="mensaje del commit" maxlength="200">' +
                     '<button class="kx-accion kx-ok">Subir</button>' +
                     '<button class="kx-accion kx-cancel">Cancelar</button>';
    fila.appendChild(caja);
    var input = caja.querySelector('input');
    input.focus();

    function cerrar() { caja.remove(); }
    caja.querySelector('.kx-cancel').addEventListener('click', cerrar);
    caja.querySelector('.kx-ok').addEventListener('click', function () {
      var m = input.value.trim();
      if (!m) { input.focus(); return; }
      cerrar();
      alConfirmar(m);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') caja.querySelector('.kx-ok').click();
      if (e.key === 'Escape') cerrar();
    });
  }

  function ejecutarAccion(boton) {
    var nombre = boton.dataset.proy, accion = boton.dataset.accion;

    if (accion === 'dev') return levantarDev(nombre, boton);
    if (accion === 'pull') return gitOperacion(nombre, 'pull', null, boton);

    if (accion === 'push') {
      // Sin cambios sin commitear, el push no necesita mensaje.
      if (Number(boton.dataset.sucios) > 0) {
        return pedirMensaje(boton, function (m) { gitOperacion(nombre, 'push', m, boton); });
      }
      return gitOperacion(nombre, 'push', null, boton);
    }

    var cuerpo = accion === 'indexar'
      ? { proyecto: nombre, accion: 'bat', bat: BAT_INDEXAR }
      : { proyecto: nombre, accion: accion };
    ocupar(boton, 'Abriendo…');
    postPanel('/api/accion', cuerpo)
      .then(function () { resolver(boton, true, 'Lanzado'); })
      .catch(function (e) { fallar(boton, e); });
  }

  /* Producción es lo único que sigue siendo un link: es una URL de verdad.
     El resto abre programas en la máquina, así que son botones que le piden
     al panel que los ejecute.

     Graph NO va por tarjeta: la URL es la misma para todos, repetirla 10
     veces es ruido. Va una vez, en la cabecera. */
  function acciones(p) {
    var cfg = p.config || {};
    var n = esc(p.nombre);
    var html = '';
    if (cfg.prod) {
      html += '<a class="kx-accion" href="' + esc(cfg.prod) + '" target="_blank" rel="noopener">Producción</a>';
    }
    html += '<button class="kx-accion kx-do" data-proy="' + n + '" data-accion="vscode">VS Code</button>';
    html += '<button class="kx-accion kx-do" data-proy="' + n + '" data-accion="carpeta">Carpeta</button>';
    if (p.scriptDev) {
      html += '<button class="kx-accion kx-do" data-proy="' + n + '" data-accion="dev">Dev</button>';
    }
    html += '<button class="kx-accion kx-do" data-proy="' + n + '" data-accion="indexar">Indexar</button>';
    return html;
  }

  /* Fila de git: sólo aparece cuando hay algo para hacer. Un botón "Subir"
     permanentemente visible en un repo limpio es ruido que además invita a
     commits vacíos. */
  function filaGit(p) {
    var g = p.git || {};
    if (!g.esRepo) return '';
    var n = esc(p.nombre);
    var html = '';
    if (g.atras) {
      html += '<button class="kx-accion kx-do" data-proy="' + n + '" data-accion="pull">' +
              'Traer ' + g.atras + '</button>';
    }
    if (g.sucios || g.adelante) {
      var etiqueta = g.sucios
        ? 'Subir ' + g.sucios + (g.sucios === 1 ? ' cambio' : ' cambios')
        : 'Subir ' + g.adelante + (g.adelante === 1 ? ' commit' : ' commits');
      html += '<button class="kx-accion kx-do" data-proy="' + n + '" data-accion="push"' +
              ' data-sucios="' + (g.sucios || 0) + '">' + etiqueta + '</button>';
    }
    return html ? '<div class="kx-git">' + html + '</div>' : '';
  }

  function renderProyectos(d) {
    var proyectos = d.proyectos || [];
    var maquina = d.maquina || {};
    var html = '<div class="kx-meta">' +
      esc(maquina.etiqueta || maquina.hostname || 'máquina') +
      ' · ' + proyectos.length + ' proyectos · datos ' + esc(antiguedad(d.generado)) + '</div>';

    html += '<div class="kx-grid">';
    proyectos.forEach(function (p) {
      var g = p.git || {}, f = p.ficha || {};
      var estado = [];
      if (!g.esRepo) estado.push('no es repo');
      if (g.sucios) estado.push(g.sucios + ' sin commitear');
      if (g.adelante) estado.push(g.adelante + ' sin subir');
      if (g.atras) estado.push(g.atras + ' sin traer');
      var sucio = estado.length > 0;

      html += '<div class="kx-card' + (sucio ? ' kx-card-alerta' : '') + '">';
      html += p.miniatura
        ? '<div class="kx-thumb"><img loading="lazy" alt="" src="/api/kexxy/panel/thumb/' +
          encodeURIComponent(p.miniatura) + '"></div>'
        : '<div class="kx-thumb kx-sinthumb"><span class="kexxy-mark"></span></div>';

      html += '<div class="kx-card-body">' +
        '<div class="kx-card-tit">' + esc(p.nombre) + '</div>' +
        (f.titulo ? '<div class="kx-card-sub">' + esc(f.titulo) + '</div>' : '') +
        '<div class="kx-card-git">' +
          (g.rama ? '<span class="kx-rama">' + esc(g.rama) + '</span>' : '') +
          (sucio ? '<span class="kx-estado">' + esc(estado.join(' · ')) + '</span>'
                 : '<span class="kx-ok">limpio</span>') +
        '</div>' +
        '<div class="kx-acciones">' + acciones(p) + '</div>' +
        filaGit(p) +
      '</div></div>';
    });
    html += '</div>';
    return html;
  }

  /* Shell común de las dos vistas. `ancho` distingue la grilla de proyectos
     (necesita aire para las miniaturas) de la lista de finanzas. */
  function abrirModal(titulo, dibujar, ancho, accionHead) {
    var prev = document.getElementById('kx-panel-modal');
    if (prev) prev.remove();

    var modal = document.createElement('div');
    modal.id = 'kx-panel-modal';
    if (ancho) modal.classList.add('kx-ancho');
    modal.innerHTML =
      '<div class="kx-caja" role="dialog" aria-label="' + esc(titulo) + '">' +
      '<div class="kx-head"><span class="kexxy-mark kx-head-mark"></span>' +
      '<h2>' + esc(titulo) + '</h2>' +
      (accionHead || '') +
      '<button class="kx-cerrar" aria-label="Cerrar">&times;</button></div>' +
      '<div class="kx-body">Cargando…</div></div>';
    document.body.appendChild(modal);

    /* Arrastre y redimensión con el MISMO sistema que el resto de las
       ventanas de la app (windowDrag.js), y no con uno propio: así estas dos
       heredan el anclaje a bordes, el docking y el comportamiento táctil sin
       duplicar nada, y se siguen pareciendo al resto cuando upstream lo
       cambie.

       Va con import() dinámico porque brand.js es un script clásico y
       windowDrag.js es un módulo ES. Si fallara, el modal sigue funcionando
       fijo — se pierde el arrastre, no la vista. */
    import('/static/js/windowDrag.js')
      .then(function (m) {
        if (m && m.makeWindowDraggable) {
          m.makeWindowDraggable(modal, {
            content: modal.querySelector('.kx-caja'),
            header: modal.querySelector('.kx-head'),
            minWidth: 380,
            minHeight: 260
          });
        }
      })
      .catch(function () { /* sin arrastre, pero usable */ });

    function cerrar() {
      modal.remove();
      document.removeEventListener('keydown', onEsc);
    }
    function onEsc(e) { if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', onEsc);
    modal.querySelector('.kx-cerrar').addEventListener('click', cerrar);

    /* Cerrar al clickear afuera, pero sólo si el gesto EMPEZÓ afuera. Sin
       esto, arrastrar la ventana y soltar el mouse sobre el fondo cerraba el
       panel: el click cuenta como click en el backdrop. */
    var arrancoAfuera = false;
    modal.addEventListener('mousedown', function (e) { arrancoAfuera = (e.target === modal); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal && arrancoAfuera) cerrar();
    });

    var body = modal.querySelector('.kx-body');
    fetch('/api/kexxy/panel', { credentials: 'same-origin' })
      .then(function (r) {
        if (r.status === 503) {
          return r.json().then(function (j) { throw new Error(j.detail || 'Panel sin datos'); });
        }
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (d) {
        body.innerHTML = dibujar(d);
        // Delegación: las tarjetas se arman como string, así que los listeners
        // se enganchan después de inyectar.
        body.addEventListener('click', function (e) {
          var b = e.target.closest ? e.target.closest('.kx-do') : null;
          if (b && !b.classList.contains('kx-ocupado')) ejecutarAccion(b);
        });
      })
      .catch(function (e) {
        body.innerHTML = '<div class="kx-error">' + esc(e.message) + '</div>';
      });
  }

  function openPanel() { abrirModal('Panel', render, false); }

  function openProyectos() {
    abrirModal('Proyectos', renderProyectos, true,
      '<a class="kx-accion kx-head-accion" href="' + GRAPH_URL + '" target="_blank" rel="noopener"' +
      ' title="Grafo de código (Codebase Memory). Requiere Ver-Graph.bat corriendo">Graph</a>');
  }

  // Cabecera del chat. El default estático de index.html es "Odysseus Chat";
  // se toca SÓLO si dice exactamente eso, para no reescribir el nombre de una
  // sesión que vos hayas puesto.
  function fixChatMeta() {
    var meta = document.getElementById('current-meta');
    if (meta && meta.textContent.trim() === 'Odysseus Chat') meta.textContent = BRAND;
  }

  function fixPlaceholder() {
    var ta = document.getElementById('message');
    if (ta) {
      var p = ta.getAttribute('placeholder') || '';
      if (p.indexOf('Odysseus') !== -1) {
        ta.setAttribute('placeholder', p.replace(/Odysseus/g, BRAND));
      }
    }
  }

  function pass() {
    for (var i = 0; i < SCOPES.length; i++) {
      var els = document.querySelectorAll(SCOPES[i]);
      for (var j = 0; j < els.length; j++) {
        // El panel de Apariencia es DOM grande. Mientras está cerrado no se
        // recorre: sin esto, cada token que llega en streaming dispararía un
        // TreeWalker completo sobre él.
        if (els[j].classList && els[j].classList.contains('hidden')) continue;
        renameIn(els[j]);
      }
    }
    swapBoat();
    markSidebar();
    addPanelLink();
    agruparSidebar();
    fixChatMeta();
    fixPlaceholder();
    fixTitle();
  }

  function watch() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    var timer = null;
    new MutationObserver(function () {
      // La pantalla de bienvenida y el panel de Ajustes se re-renderizan
      // (chat nuevo, abrir Apariencia). Reaplicar, pero con debounce de 200ms:
      // durante el streaming de una respuesta esto se dispara cientos de veces
      // por segundo y no hay que hacer trabajo en cada una.
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () { timer = null; pass(); }, 200);
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ── Arranque ──
  seedTheme();
  fixTitle();
  fixManifest(fixIcon());
  markLoader(0);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { pass(); watch(); }, { once: true });
  } else {
    pass(); watch();
  }
})();
