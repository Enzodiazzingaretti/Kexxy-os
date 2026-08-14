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

  // El sidebar no traía logo, sólo texto. Se le antepone el emblema.
  function markSidebar() {
    var brand = document.querySelector('.sidebar-brand');
    if (!brand || brand.querySelector('.kexxy-mark')) return;
    var title = brand.querySelector('.sidebar-brand-title');
    brand.insertBefore(mark('kexxy-mark-sidebar'), title || brand.firstChild);
  }

  /* Acceso al panel de proyectos y finanzas.

     Abre en pestaña nueva en vez de embeberlo en un iframe: la CSP de la app
     declara `frame-src 'self'`, así que embeberlo obligaría a parchear el
     middleware de upstream. El navegador corre en Windows, así que llega a
     127.0.0.1 sin intermediarios.

     No se puede chequear antes si el panel está levantado: `connect-src
     'self'` bloquea el fetch. Por eso el tooltip avisa qué hacer si no abre. */
  var PANEL_URL = 'http://127.0.0.1:4321';

  function addPanelLink() {
    if (document.getElementById('kexxy-panel-btn')) return;
    var theme = document.getElementById('tool-theme-btn');
    if (!theme || !theme.parentNode) return;

    var item = document.createElement('div');
    item.className = 'list-item';
    item.id = 'kexxy-panel-btn';
    item.title = 'Panel de proyectos y finanzas. Si no abre, levantalo con Panel.bat';
    item.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"' +
      ' style="flex-shrink:0;opacity:0.5;">' +
      '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
      '<path d="M3 9h18"/><path d="M9 21V9"/>' +
      '</svg><span class="grow">Panel</span>';
    item.addEventListener('click', function () {
      window.open(PANEL_URL, '_blank', 'noopener');
    });

    theme.parentNode.insertBefore(item, theme);
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
