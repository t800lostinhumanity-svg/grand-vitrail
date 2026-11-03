// Scène de bataille : marionnettes articulées, frappes qui portent vraiment, projectiles balistiques, corps qui se brisent
(function () {
  var RACE_GLASS = ['#2f6bff', '#f0a020', '#1fc46f', '#e0263c', '#16c7c0', '#c6d92a', '#9a4dff', '#ff6a1a'];
  var AMBIENT = [
    { c: '#fff6a8', n: 26, vx: 0.3, vy: -0.1, s: 0.22 }, { c: '#e8c98a', n: 34, vx: 1, vy: 0.1, s: 0.18 }, { c: '#9af0c0', n: 34, vx: 0.4, vy: 0.5, s: 0.3 }, { c: '#ffb36a', n: 36, vx: 1.4, vy: 0.1, s: 0.16 },
    { c: '#bff3ea', n: 26, vx: 0.1, vy: -0.25, s: 0.28 }, { c: '#dcf25a', n: 26, vx: 0.1, vy: -0.5, s: 0.2 }, { c: '#d2aaff', n: 34, vx: 0.2, vy: -0.2, s: 0.26 }, { c: '#ff9a2e', n: 60, vx: 0.2, vy: -1.3, s: 0.2 }, { c: '#ffe9a0', n: 44, vx: 0, vy: -0.4, s: 0.2 }
  ];
  // Lumière de chaque terrain
  var ENV = [
    { sunC: [1.08, 1, 0.84], amb: [0.4, 0.45, 0.54], back: [0.5, 0.47, 0.38], grade: [1.03, 1, 0.96] },
    { sunC: [1.12, 0.95, 0.72], amb: [0.42, 0.38, 0.4], back: [0.5, 0.42, 0.3], grade: [1.05, 0.99, 0.92] },
    { sunC: [0.95, 1.04, 0.82], amb: [0.28, 0.42, 0.38], back: [0.36, 0.5, 0.36], grade: [0.97, 1.03, 0.97] },
    { sunC: [1, 0.82, 0.68], amb: [0.42, 0.32, 0.34], back: [0.36, 0.26, 0.22], grade: [1.03, 0.98, 0.95] },
    { sunC: [0.86, 1, 0.94], amb: [0.26, 0.4, 0.42], back: [0.3, 0.46, 0.44], grade: [0.95, 1.02, 1.02] },
    { sunC: [1.02, 1.02, 0.7], amb: [0.36, 0.38, 0.26], back: [0.42, 0.44, 0.24], grade: [1.02, 1.02, 0.9] },
    { sunC: [0.84, 0.84, 1.06], amb: [0.36, 0.32, 0.44], back: [0.34, 0.24, 0.5], grade: [1, 0.98, 1.04] },
    { sunC: [1, 0.76, 0.62], amb: [0.4, 0.28, 0.26], back: [0.34, 0.16, 0.08], grade: [1.06, 0.98, 0.94], heat: 1 },
    { sunC: [0.86, 0.8, 0.96], amb: [0.26, 0.24, 0.36], back: [0.5, 0.42, 0.42], grade: [1.02, 0.99, 1.02] }
  ];
  var FORT = { keep: { h: 12, w: 13.3 }, tower: { h: 8, w: 8.9 }, wall: { h: 5.6, w: 6.2 } };
  var PROJ = { wbw: 'arrow', wcb: 'bolt', wsb: 'dart', wbl: 'pellet', wja: 'weapon', wro: 'weapon', wbm: 'weapon', wst: 'orb', wsk: 'orb', wbn: 'orb' };
  var SHX = 0.42, SHY = 0.26;

  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // Manette : une forme par action, jamais de mot. Le nom reste lisible par un appui long.
  var PAD_ICONS = {
    attack: '<path d="M28 4l-3.5 9.5-10 8.5-4.5-4.5 8.5-10z"/><path d="M7.5 14L18 24.5l-2 2L5.5 16z"/><path d="M12 21.6L10.4 20l-4.6 4.6 1.6 1.6z"/><circle cx="5.6" cy="26.4" r="2.5"/>',
    dodge: '<path d="M14 5l11 11-11 11v-6l5-5-5-5z"/><path d="M3 8.5h8.5v3H3zM1.5 14.5H11v3H1.5zM3 20.5h8.5v3H3z"/>',
    hold: '<path d="M16 2.5L27.5 7v8.5C27.5 22.5 22.5 27 16 30 9.5 27 4.5 22.5 4.5 15.5V7z"/><path class="cut" d="M16 8v16M10 14h12"/>',
    auto: '<path d="M6 15a10 10 0 0 1 17.5-6L26 6.5V14h-7.5l2.5-2.5A7 7 0 0 0 9 15z"/><path d="M26 17a10 10 0 0 1-17.5 6L6 25.5V18h7.5L11 20.5A7 7 0 0 0 23 17z"/><path d="M16 12.5l3.5 3.5-3.5 3.5-3.5-3.5z"/>',
    all: '<path class="ln" d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6"/><circle cx="16" cy="11.5" r="3"/><path d="M11.2 23c0-5 2.2-7.8 4.8-7.8s4.8 2.8 4.8 7.8z"/><circle cx="8.8" cy="14.8" r="2.2"/><path d="M5.4 23c0-3.700 1.4-5.700 3.4-5.700.7 0 1.300.2 1.8.7-.8 1.2-1.300 2.900-1.300 5z"/><circle cx="23.2" cy="14.8" r="2.2"/><path d="M26.600 23c0-3.700-1.4-5.700-3.4-5.700-.7 0-1.300.2-1.8.7.8 1.2 1.300 2.900 1.300 5z"/>',
    none: '<path class="ln" d="M4 10V4h6M22 4h6v6M28 22v6h-6M10 28H4v-6"/><path class="ln fat" d="M11 11l10 10M21 11L11 21"/>',
    lasso: '<rect class="ln" x="4" y="4" width="21" height="21" rx="1.5" stroke-dasharray="4.4 3.2"/><path d="M15 14l14 8.5-6 1.5 3.2 5-2.8 1.700-3.2-5.100-3.600 4z"/>',
    smite: '<path d="M19.5 1.5L6.5 18H14l-3 12.5L25.5 12H17.5z"/>',
    heal: '<path d="M16 28.5C6 21.5 2.5 16 2.5 11 2.5 6.5 6 3.5 9.600 3.5c2.8 0 5.100 1.600 6.4 4 1.300-2.4 3.600-4 6.4-4C26 3.5 29.5 6.5 29.5 11c0 5-3.5 10.5-13.5 17.5z"/><path class="cut" d="M16 9.5v11M10.5 15h11"/>',
    charge: '<path d="M6.5 2.5h3v27h-3z"/><path d="M10.5 4.5H28L22.5 11l5.5 6.5H10.5z"/>',
    power: '<path d="M16 1.5l2.8 11.700L30.5 16l-11.700 2.8L16 30.5l-2.8-11.700L1.5 16l11.700-2.8z"/><path d="M7 7l10.2 7.8L25 7l-7.8 10.2L25 25l-10.2-7.8L7 25l7.8-10.2z"/>',
    pause: '<path d="M8 5h6v22H8zM18 5h6v22h-6z"/>',
    play: '<path d="M9 4l18 12L9 28z"/>',
    spd: '<path d="M3.5 6L16 16 3.5 26zM16 6l12.5 10L16 26z"/>',
    skip: '<path d="M5 6l14 10L5 26zM21 6h5.5v20H21z"/>',
    crown: '<path d="M3 9l6.5 6L16 5l6.5 10L29 9l-2.5 16h-21z"/>',
    add: '<circle cx="12" cy="9" r="5"/><path d="M3 27c0-8 3.8-12 9-12 2 0 3.700.6 5.100 1.700V27z"/><path d="M22 14h4v5h5v4h-5v5h-4v-5h-5v-4h5z"/>'
  };
  function padIcon(n) { return '<svg viewBox="0 0 32 32" aria-hidden="true">' + PAD_ICONS[n] + '</svg>'; }
  // Le socle du stick est une petite rosace
  var STICK_ROSE = (function () {
    function pt(a, r) { return (60 + Math.cos(a) * r).toFixed(1) + ' ' + (60 + Math.sin(a) * r).toFixed(1); }
    var out = '<svg class="rose" viewBox="0 0 120 120" aria-hidden="true"><circle class="r0" cx="60" cy="60" r="57"/>', i;
    for (i = 0; i < 8; i++) {
      var a0 = (i - 0.5) * Math.PI / 4 - Math.PI / 2, a1 = a0 + Math.PI / 4;
      out += '<path class="r1" fill="' + RACE_GLASS[i] + '" d="M' + pt(a0, 30) + 'L' + pt(a0, 54) + 'A54 54 0 0 1 ' + pt(a1, 54) + 'L' + pt(a1, 30) + 'A30 30 0 0 0 ' + pt(a0, 30) + 'Z"/>';
    }
    for (i = 0; i < 4; i++) out += '<path class="r2" d="M60 8l8 10H52z" transform="rotate(' + (i * 90) + ' 60 60)"/>';
    return out + '</svg>';
  })();

  // opts : { nameA, nameB, mine, half, startAt, map, interactive, reserve, onDeploy, onEnd(result), onClose(), sound }
  function play(sideA, sideB, seed, opts) {
    var GV = window.GV, GVB = window.GVB, GVM = window.GVM, GVG = window.GVG, GVR = window.GVR;
    var tactical = !!opts.interactive;
    var eng = GVB.create(sideA, sideB, seed, opts.map, tactical);
    var map = GVM.MAPS[opts.map];
    var W = eng.width, H = eng.height;
    var rot = opts.half === null && window.innerHeight > window.innerWidth;
    function px(x, y) { return rot ? [y, W - x] : [x, y]; }
    function unpx(a, b) { return rot ? [W - b, a] : [a, b]; }
    var fieldW = rot ? H : W, fieldH = rot ? W : H;

    var html = '<div class="bbar"><div class="bteam"><span style="color:' + GV.RACES[sideA.race].color + '">' + esc(opts.nameA) + '</span><i class="hpbar"><b id="hpa"></b></i></div><span class="bmap">' + esc(map.name) + '</span><div class="bteam right"><span style="color:' + GV.RACES[sideB.race].color + '">' + esc(opts.nameB) + '</span><i class="hpbar"><b id="hpb"></b></i></div></div>';
    html += '<div class="bstage"><canvas id="gcv" aria-hidden="true"></canvas><canvas id="bcv" aria-label="Champ de bataille : ' + esc(map.name) + '"></canvas><div class="pad wait" id="pad"></div><div class="intro" id="intro"><strong>' + esc(map.name) + '</strong><span>' + esc(map.rule) + '</span><b id="cd"></b></div><div id="res-slot"></div></div>';
    var box = document.createElement('div');
    box.id = 'battle';
    box.style.background = map.bg;
    box.innerHTML = html;
    document.body.appendChild(box);

    var cv = box.querySelector('#bcv'), ctx = cv.getContext('2d'), stage = box.querySelector('.bstage');
    var cd = box.querySelector('#cd'), intro = box.querySelector('#intro');
    var hpa = box.querySelector('#hpa'), hpb = box.querySelector('#hpb');
    var G = window.GVGL.create(box.querySelector('#gcv'), GVG.quality);
    var isGL = G.kind === 'gl';
    var ready = false, skins = [sideA.skin, sideB.skin], fxs = {};
    var env = ENV[opts.map] || ENV[0];
    G.setEnv({ sunC: env.sunC, amb: env.amb, back: env.back, grade: env.grade, heat: env.heat || 0, holy: px(40, 30) });
    var bgCol = rgb(map.bg);

    // Sprites d'effets
    ['soft', 'ring', 'spark', 'white', 'beam', 'smoke', 'sh0', 'sh1', 'sh2', 'sh3', 'arrow', 'bolt', 'dart', 'pellet'].forEach(function (n) { fxs[n] = G.atlas.add(G.fx, n); });

    // --- Chargement des marionnettes ---
    var puppets = {};
    function loadPuppet(race, uid, wid, skin) {
      var key = race + '|' + uid + '|' + (wid || '') + '|' + skin;
      if (puppets[key]) return puppets[key].p;
      var entry = { p: null, pup: null };
      puppets[key] = entry;
      entry.p = GVG.unit(race, uid, wid, skin, 3).then(function (s) {
        var rig = s.rig, sprs = [];
        rig.bones.forEach(function (b, i) {
          if (!b.part) return;
          var dedupe = s.cls + '|' + (b.part === 'weapon' ? rig.wform : rig.parts[b.part].svg);
          sprs[i] = G.atlas.add(s.sheet, b.part, dedupe);
        });
        entry.pup = { rig: rig, sprs: sprs };
      });
      return entry.p;
    }
    function puppetOf(race, uid, wid, skin) { var e = puppets[race + '|' + uid + '|' + (wid || '') + '|' + skin]; return e ? e.pup : null; }

    var looks = [], forts = {};
    function look(u) {
      var at = px(u.x, u.y);
      var big = u.kind === 'monster' || u.kind === 'hero';
      var lk = { x: at[0], y: at[1], dir: rot ? 1 : (u.team === 0 ? 1 : -1), f: rot ? 1 : (u.team === 0 ? 1 : -1), flash: 0, kx: 0, ky: 0, kvx: 0, kvy: 0, s: u.hero ? 7.8 : (big ? 6.8 : 5), pendUntil: 0, falling: false, broken: false, lie: 0, blast: 0, alpha: 1, hideW: 0, lastAtk: -9, readyUntil: 0, trail: [], st: null, pup: null, fortS: null, shake: 0, smokeT: 0 };
      looks[u.idx] = lk;
      return lk;
    }
    function wid(u) { return u.wIdx >= 0 ? GV.WEAPONS[u.wIdx][0] : null; }
    function bindPuppet(u, lk) {
      var pup = puppetOf(u.race, u.uid, wid(u), u.team === 0 ? skins[0] : skins[1]);
      if (!pup) return;
      lk.pup = pup;
      lk.s *= pup.rig.sz || 1;
      lk.st = GVR.state(pup.rig, u.idx + 1);
      lk.st.rootX = 0; lk.st.rootY = -pup.rig.H;
    }
    var loads = [];
    function loadUnit(u, lk) {
      if (u.fort) {
        var sym = u.fort === 'keep' ? GV.RACES[u.race].citadel : (u.fort === 'tower' ? 'd11' : 'd12'), cls = GV.RACES[u.race].cls;
        return GVG.single('fort' + sym + cls, cls, '<g transform="translate(-100 -169)"><use href="#' + sym + '" width="200" height="180"></use></g>', [-100, -169, 100, 11], 1.7).then(function (s) { lk.fortS = G.atlas.add(s, 'main', 'fort' + sym + cls); });
      }
      return loadPuppet(u.race, u.uid, wid(u), u.team === 0 ? skins[0] : skins[1]);
    }
    eng.units.forEach(function (u) { loads.push(loadUnit(u, look(u))); });
    (opts.reserve || []).forEach(function (r) { loads.push(loadPuppet(sideA.race, r.uid, r.w >= 0 ? GV.WEAPONS[r.w][0] : null, skins[0])); });

    // Décors debout
    var props = [];
    loads.push(new Promise(function (ok) { setTimeout(ok, 30); }).then(function () {
      var sheet = GVM.propSheet(opts.map);
      map.props.forEach(function (p, i) {
        var at = px(p[1], p[2]);
        props.push({ x: at[0], y: at[1], s: p[3] * 1.9, spr: G.atlas.add(sheet, p[0] + (p[4] || '')), a: 1, ph: i * 1.3, sway: { oak: 1, elm: 1, mangrove: 1, banner: 1.6, tent: 0.2, deadtree: 0.3, lily: 0.1, mushroom: 0.1 }[p[0]] || 0, glow: (p[0] === 'crystal' || p[0] === 'shard') ? (p[4] || '#ffd75a') : null });
      });
      // Terrain : la plus grosse cuisson de la scène
      var long = isGL ? Math.min(2048, Math.round(Math.max(window.innerWidth, window.innerHeight) * Math.min(2, window.devicePixelRatio || 1) * 1.6)) : 1000;
      long = Math.max(1400, long);
      var tw = fieldW >= fieldH ? long : Math.round(long * 3 / 4), th = fieldW >= fieldH ? Math.round(long * 3 / 4) : long;
      var baked = GVM.bake(opts.map, tw, th, rot);
      G.setTerrain(baked, fieldW, fieldH);
      miniImg = baked.lit;
    }));
    Promise.all(loads).then(function () {
      G.buildAtlas();
      fxs.done = true;
      eng.units.forEach(function (u) { if (!u.fort) bindPuppet(u, looks[u.idx]); });
      ready = true;
    });

    // Lumières fixes du décor
    var fixedLights = [];
    props.length = 0;
    (function () {
      map.props.forEach(function (p) {
        if (p[0] === 'crystal' || p[0] === 'shard') { var at = px(p[1], p[2]), c = rgb(p[4] || '#ffd75a'); fixedLights.push({ x: at[0], y: at[1] - p[3] * 0.9, z: 1.8, r: 7 + p[3] * 2, cr: c[0], cg: c[1], cb: c[2], i: 0.5, flick: 0.2 }); }
      });
      map.zones.forEach(function (z) {
        if (z.kind !== 'lava') return;
        z.pts.forEach(function (q, i) { if (i % 2) { var at = px(q[0], q[1]); fixedLights.push({ x: at[0], y: at[1], z: 1.4, r: 9, cr: 1, cg: 0.42, cb: 0.1, i: 0.8, flick: 0.35 }); } });
      });
      if (opts.map === 8) { var c0 = px(40, 30); fixedLights.push({ x: c0[0], y: c0[1], z: 4, r: 13, cr: 1, cg: 0.9, cb: 0.66, i: 0.7, flick: 0.1 }); }
    })();

    // --- Effets ---
    var parts = [], texts = [], flash = { a: 0, c: [1, 1, 1] }, title = null, shake = 0, lamps = [], debris = [], decals = [], projs = [], waves = [], later = [], hitStop = 0, clock = 0, beams = [], aberr = 0;
    function after(delay, fn) { if (delay <= 0) fn(); else later.push({ at: clock + delay, fn: fn }); }
    function lamp(x, y, r, c, i, life, z) { lamps.push({ x: x, y: y, z: z === undefined ? 1.8 : z, r: r, c: c, i: i * 0.6, age: 0, life: life }); }
    function add(kind, x, y, vx, vy, life, size, c, grav, spin, extra) {
      if (parts.length > 520) parts.shift();
      var p = { k: kind, x: x, y: y, vx: vx, vy: vy, age: 0, life: life, size: size, c: c, grav: grav || 0, rot: Math.random() * 6.28, spin: spin || 0, gy: extra || 0 };
      parts.push(p);
      return p;
    }
    function sparks(x, y, c, n, power) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = (0.4 + Math.random()) * power; add('spark', x, y, Math.cos(a) * v, Math.sin(a) * v - power * 0.2, rnd(0.2, 0.45), rnd(0.5, 1.1), c, 14); } }
    function shards(x, y, c, n, power, gy) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = (0.5 + Math.random()) * power; add('shard', x, y, Math.cos(a) * v, Math.sin(a) * v * 0.7 - power * 0.6, rnd(0.7, 1.3), rnd(0.2, 0.46), i % 4 ? c : [1, 1, 1], 26, rnd(-10, 10), gy); } }
    function dust(x, y, c, n, size) { for (var i = 0; i < n; i++) add('smoke', x + rnd(-0.4, 0.4), y + rnd(-0.1, 0.2), rnd(-0.9, 0.9), rnd(-0.7, -0.1), rnd(0.45, 0.8), size * rnd(0.7, 1.2), c, 0, rnd(-1, 1)); }
    function dmgText(x, y, amt) {
      if (texts.length > 24) return;
      var big = amt >= 18;
      texts.push({ x: x + rnd(-0.6, 0.6), y: y, t: String(Math.max(1, Math.round(amt))), age: 0, big: big, color: big ? '#ffd75a' : '#ffffff' });
    }
    // Secousses et éclairs volontairement discrets : on doit toujours bien voir la bataille
    function addShake(v) { shake = Math.max(shake, Math.min(0.16, v * 0.22)); }
    function addFlash(a, c) { if (a * 0.3 > flash.a) flash = { a: Math.min(0.08, a * 0.3), c: c }; }
    function floatText(lk, text, color) { if (texts.length < 24) texts.push({ x: lk.x + rnd(-0.5, 0.5), y: lk.y - lk.s * 0.95, t: text, age: 0, big: false, color: color }); }
    function wave(x, y, amp, life) { if (waves.length < 4) waves.push({ x: x, y: y, age: 0, life: life, amp: amp * 0.5 }); }
    function scar(x, y, spr, size, r, g, b, a, ang) { if (decals.length > 420) decals.shift(); decals.push({ x: x, y: y, spr: spr, s: size, r: r, g: g, b: b, a: a, ang: ang || 0 }); }
    function explosion(x, y, c, power) {
      addFlash(0.12 * power, [1, 0.8, 0.5]);
      addShake(0.45 * power);
      aberr = Math.max(aberr, (0.005 * power) * 0.3);
      lamp(x, y - 1, 9 * power, [1, 0.62, 0.26], 1.3, 0.35);
      wave(x, y, 0.016 * power, 0.5);
      add('ring', x, y, 0, 0, 0.36, 6 * power, [1, 0.74, 0.42]);
      add('core', x, y - 0.8, 0, 0, 0.2, 3.6 * power, [1, 0.72, 0.36]);
      for (var i = 0; i < 9; i++) { var a = Math.random() * 6.28, v = rnd(2, 8) * power; add('spark', x, y - 0.6, Math.cos(a) * v, Math.sin(a) * v * 0.7 - 3, rnd(0.3, 0.7), rnd(0.8, 1.6), [1, rnd(0.5, 0.9), 0.3], 16); }
      for (var j = 0; j < 3; j++) add('smoke', x + rnd(-1, 1), y + rnd(-0.4, 0.3), rnd(-1.2, 1.2), rnd(-0.9, -0.2), rnd(0.5, 0.9), rnd(1.4, 2.2) * power, [0.42, 0.38, 0.34], 0, rnd(-1, 1));
      for (var k = 0; k < 7; k++) add('shard', x, y, rnd(-6, 6), rnd(-8, -2), rnd(0.6, 1.1), rnd(0.2, 0.4), c, 26, rnd(-9, 9), y + rnd(-0.3, 0.8));
      scar(x, y + 0.1, fxs.soft, 3.6 * power, 0.03, 0.02, 0.02, 0.3);
      beep(80, 0.4, 0.1, 'sawtooth');
    }

    var audio = null;
    function beep(freq, len, vol, type) {
      if (!opts.sound) return;
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        var o = audio.createOscillator(), v = audio.createGain();
        o.type = type || 'triangle';
        o.frequency.value = freq;
        v.gain.value = vol || 0.04;
        v.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + len);
        o.connect(v); v.connect(audio.destination);
        o.start();
        o.stop(audio.currentTime + len);
      } catch (e) { /* le jeu continue sans son */ }
    }

    // Position d'un os dans le monde
    function depth(y) { return 0.88 + 0.24 * y / fieldH; }
    function boneAt(lk, name, ox, oy) {
      var st = lk.st, rig = lk.pup.rig, i = rig.index[name];
      if (i === undefined) return [lk.x, lk.y - lk.s * 0.5];
      var sc = lk.s / 140 * depth(lk.y), a = st.ang[i], c = Math.cos(a), s = Math.sin(a), k = rig.bones[i].k;
      var lx = st.x[i] + ((ox || 0) * c - (oy || 0) * s) * k, ly = st.y[i] + ((ox || 0) * s + (oy || 0) * c) * k;
      return [lk.x + lk.kx + lk.f * lx * sc, lk.y + lk.ky + ly * sc];
    }
    function muzzle(u, lk) {
      if (u.fort) return [lk.x, lk.y - FORT[u.fort].h * 0.72];
      if (!lk.pup) return [lk.x, lk.y - 3];
      var rig = lk.pup.rig;
      if (rig.type === 'beast') return boneAt(lk, rig.necks[0].head, 14, 0);
      return boneAt(lk, rig.index.weapon !== undefined ? 'weapon' : 'armLF', 0, rig.held ? 0 : -26);
    }

    // Le coup porte : effets sur la cible, au moment précis du contact
    function impact(from, to, lf, lt, amt, dirx, heavy) {
      var hy = lt.y - lt.s * 0.5;
      lt.flash = 1;
      if (lt.st) {
        lt.st.hit = heavy ? 1.2 : 0.9;
        var hasShield = lt.pup && lt.pup.rig.look && lt.pup.rig.look.sh;
        if (hasShield && Math.random() < 0.5) { lt.st.block = 1; sparks(lt.x + lt.f * lt.s * 0.2, hy, [1, 0.95, 0.75], 6, 8); beep(1500, 0.05, 0.02); }
      }
      var push = (heavy ? 7 : 4);
      lt.kvx += dirx * push; lt.kvy += rnd(-1, 1);
      sparks(lt.x, hy, [1, 0.96, 0.82], heavy ? 5 : 3, heavy ? 10 : 8);
      shards(lt.x, hy, rgb(RACE_GLASS[to.race]), heavy ? 6 : 3, heavy ? 7 : 5, lt.y + rnd(-0.2, 0.5));
      if (heavy) lamp(lt.x, hy, 6, [1, 0.86, 0.6], 1.2, 0.16);
      if (heavy) { wave(lt.x, hy, 0.008, 0.3); addShake(0.28); }
      dmgText(lt.x, lt.y - lt.s * 0.95, amt);
      beep((heavy ? 110 : 170) + (from.idx % 5) * 30, 0.07);
    }

    // Tir réel : la flèche part à l'instant du lâcher et suit une courbe
    function launch(from, to, lf, lt, amt, fixedDur) {
      var fw = from.fort ? null : wid(from), rigW = lf.pup ? lf.pup.rig.wform : null;
      var type = from.fort ? 'arrow' : (PROJ[rigW || fw] || ((from.kind === 'magic' || from.kind === 'healer') ? 'orb' : 'arrow'));
      var m = muzzle(from, lf), tx = lt.x + rnd(-0.3, 0.3), ty = lt.y - lt.s * 0.5 + rnd(-0.5, 0.5);
      var dx = tx - m[0], dy = ty - m[1], dist = Math.sqrt(dx * dx + dy * dy), heavy = from.splash > 0;
      var speed = type === 'weapon' ? 17 : (type === 'orb' ? 22 : (type === 'pellet' ? 50 : 36));
      var dur = fixedDur || Math.max(0.1, dist / speed), arc = type === 'pellet' ? 0 : (heavy ? dist * 0.3 : (type === 'orb' ? dist * 0.05 : dist * 0.09));
      var col = rgb(RACE_GLASS[from.race]);
      var p = { type: type, x0: m[0], y0: m[1], x1: tx, y1: ty, age: 0, dur: dur, arc: arc, c: col, from: from, to: to, lf: lf, lt: lt, amt: amt, heavy: heavy, spin: rnd(6, 10), t: 0, ang: Math.atan2(dy, dx) };
      if (type === 'weapon' && lf.pup) { var wi = lf.pup.rig.index.weapon; p.spr = lf.pup.sprs[wi]; p.k = lf.pup.rig.bones[wi].k * lf.s / 140; p.upright = !lf.pup.rig.held; lf.hideW = clock + 0.42; }
      if (type === 'pellet') {
        for (var i = 0; i < 5; i++) add('spark', m[0], m[1], Math.cos(p.ang + rnd(-0.3, 0.3)) * rnd(14, 30), Math.sin(p.ang + rnd(-0.3, 0.3)) * rnd(14, 30), 0.14, 1.3, [1, 0.85, 0.5], 0);
        dust(m[0], m[1], [0.5, 0.48, 0.46], 4, 0.9);
        lamp(m[0], m[1], 6, [1, 0.8, 0.4], 2, 0.1);
        beep(150, 0.09, 0.05, 'square');
      } else if (type === 'orb') {
        lamp(m[0], m[1], 5, col, 1.5, 0.2); beep(740, 0.1, 0.03);
      } else beep(620, 0.05, 0.022);
      projs.push(p);
    }
    function landing(p) {
      var from = p.from, to = p.to, lt = p.lt;
      if (p.heavy) explosion(p.x1, p.y1 + lt.s * 0.5, rgb(RACE_GLASS[from.race]), 1);
      if (p.type === 'orb') { lamp(p.x1, p.y1, 7, p.c, 1.8, 0.3); add('ring', p.x1, p.y1, 0, 0, 0.3, 3.6, p.c); for (var i = 0; i < 8; i++) { var a = Math.random() * 6.28; add('ember', p.x1, p.y1, Math.cos(a) * 5, Math.sin(a) * 5, 0.4, 0.42, p.c, 3); } }
      if (!tactical) impact(from, to, p.lf, lt, p.amt, p.x1 > p.x0 ? 1 : -1, false);
      // La flèche ratée ou brisée reste plantée dans le sol, quelques instants
      if ((p.type === 'arrow' || p.type === 'bolt') && Math.random() < 0.5) {
        var gx = p.x1 + rnd(-1, 1), gy = lt.y + rnd(-0.2, 0.7);
        scar(gx, gy, fxs[p.type], 1.5, 1, 1, 1, 0.9, p.x1 > p.x0 ? 0.9 : Math.PI - 0.9);
      }
    }

    // Lecture du journal du moteur : le moteur ne change jamais, seul le spectacle est décalé
    var evIdx = 0;
    function animSpeed() { return opts.half !== null ? 1 : (opts.interactive ? (speedBoost ? 2 : 1) : 1.6); }
    function attackAnim(lf, name) {
      var interval = clock - lf.lastAtk;
      lf.lastAtk = clock;
      lf.readyUntil = clock + 3;
      return GVR.startAttack(lf.st, name || lf.pup.rig.profile, Math.min(2, interval)) / 1;
    }
    function drainEvents() {
      while (evIdx < eng.events.length) {
        var ev = eng.events[evIdx++], kind = ev[1];
        if (kind === 'power') {
          var race = ev[3], col = rgb(RACE_GLASS[race]);
          addFlash(0.4, col);
          title = { t: GV.POWERS[race].name, c: GV.RACES[race].color, age: 0 };
          addShake(0.6); aberr = Math.max(aberr, 0.01 * 0.3);
          beep(220, 0.5, 0.08); beep(440, 0.5, 0.05);
          eng.units.forEach(function (u) { if (u.alive && u.team === ev[2] && !u.fort) { var l = looks[u.idx]; if (!l) return; add('ring', l.x, l.y, 0, 0, 0.6, 5, col); for (var i = 0; i < 6; i++) add('ember', l.x + rnd(-1, 1), l.y - rnd(0, l.s), 0, rnd(-6, -2), rnd(0.5, 0.9), 0.4, col); lamp(l.x, l.y - 2, 5, col, 1, 0.8); } });
          continue;
        }
        if (kind === 'smite') {
          var at = px(ev[2], ev[3]);
          addFlash(0.3, [1, 0.96, 0.78]);
          addShake(0.9); aberr = Math.max(aberr, 0.012 * 0.3);
          beep(90, 0.5, 0.12, 'sawtooth');
          beams.push({ x: at[0], y: at[1], w: 7, age: 0, life: 0.6, c: [1, 0.92, 0.62] });
          lamp(at[0], at[1], 14, [1, 0.9, 0.6], 1.4, 0.55, 5);
          wave(at[0], at[1], 0.03, 0.6);
          add('ring', at[0], at[1], 0, 0, 0.5, 12, [1, 0.82, 0.42]);
          for (var si = 0; si < 18; si++) { var a2 = Math.random() * 6.28, r2 = Math.random() * 5.4; add('spark', at[0] + Math.cos(a2) * r2, at[1] + Math.sin(a2) * r2 * 0.6, 0, -rnd(8, 18), rnd(0.4, 0.9), rnd(1, 2), si % 2 ? [1, 0.84, 0.35] : [1, 1, 1], 4); }
          for (var sd = 0; sd < 10; sd++) { var a3 = Math.random() * 6.28, r3 = Math.random() * 5; scar(at[0] + Math.cos(a3) * r3, at[1] + Math.sin(a3) * r3 * 0.7, fxs['sh' + (sd % 4)], 0.5, 1, 0.9, 0.6, 0.8, a3); }
          scar(at[0], at[1], fxs.soft, 9, 0.03, 0.02, 0.01, 0.34);
          continue;
        }
        if (kind === 'healall') {
          addFlash(0.18, [0.6, 0.94, 0.75]);
          beep(660, 0.4, 0.06);
          eng.units.forEach(function (u) { if (u.alive && u.team === 0 && !u.fort) { var l = looks[u.idx]; if (!l) return; add('ring', l.x, l.y, 0, 0, 0.6, 4, [0.6, 0.94, 0.75]); for (var h = 0; h < 5; h++) add('ember', l.x + rnd(-1, 1), l.y - rnd(0, 2), 0, rnd(-5, -2), rnd(0.6, 1), 0.34, [0.6, 0.94, 0.75]); lamp(l.x, l.y - 2, 5, [0.6, 0.94, 0.75], 0.9, 0.7); } });
          continue;
        }
        if (kind === 'hero') {
          var hl = looks[ev[2]];
          if (!hl) continue;
          var arch = GV.HERO_ARCH[ev[3]], tint = ev[3] === 2 ? [0.6, 0.94, 0.75] : [1, 0.84, 0.35];
          title = { t: arch.ability, c: '#ffd75a', age: 0.2 };
          if (hl.st) attackAnim(hl, ev[3] === 0 ? 'SPIN' : 'CAST');
          addShake(0.5);
          addFlash(0.12, tint);
          beep(ev[3] === 2 ? 880 : 300, 0.4, 0.09);
          add('ring', hl.x, hl.y, 0, 0, 0.5, 12, tint);
          wave(hl.x, hl.y - 2, 0.016, 0.5);
          if (ev[3] === 2) beams.push({ x: hl.x, y: hl.y, w: 4, age: 0, life: 0.7, c: tint });
          for (var hi = 0; hi < 12; hi++) { var ha = hi / 12 * 6.28; add('spark', hl.x, hl.y - 2, Math.cos(ha) * 12, Math.sin(ha) * 7, 0.4, 1.1, tint, 2); }
          lamp(hl.x, hl.y - 2, 10, tint, 1.2, 0.5);
          continue;
        }
        if (kind === 'order') {
          title = { t: 'Charge !', c: '#ffd75a', age: 0 };
          beep(330, 0.3, 0.07, 'square');
          continue;
        }
        var from = eng.units[ev[2]], to = eng.units[ev[3]];
        var lf = looks[ev[2]], lt = looks[ev[3]];
        if (kind === 'deploy') {
          if (!lf) { lf = look(from); bindPuppet(from, lf); }
          shards(lf.x, lf.y - 2, rgb(RACE_GLASS[from.race]), 10, 5, lf.y);
          add('ring', lf.x, lf.y, 0, 0, 0.5, 5, rgb(RACE_GLASS[from.race]));
          lamp(lf.x, lf.y - 2, 6, rgb(RACE_GLASS[from.race]), 1.4, 0.4);
          continue;
        }
        if (!lf || !lt) continue;
        var dx = lt.x - lf.x, dy2 = (lt.y - lt.s * 0.5) - (lf.y - lf.s * 0.6);
        if (Math.abs(dx) > 0.3) lf.dir = dx > 0 ? 1 : -1;
        if (lf.st) { lf.st.aim = Math.max(-0.9, Math.min(0.9, Math.atan2(dy2, Math.abs(dx) + 0.01))); }
        if (kind === 'swing') {
          if (lf.st) { attackAnim(lf); var prf = GVR.PROFILES[lf.st.atk]; lf.st.atkDur = ev[4] * eng.tick / prf.hit; }
          continue;
        }
        if (kind === 'struck' || kind === 'landed') {
          if (ev[4] > 0) impact(from, to, lf, lt, ev[4], lf.x < lt.x ? 1 : -1, from.kind === 'monster' || !!from.hero || from.kind === 'heavy');
          else floatText(lt, 'Esquivé', '#9fe6ff');
          continue;
        }
        if (kind === 'missed') {
          floatText(lt, to.alive && to.dodgeUntil > eng.ticks ? 'Esquivé' : 'Raté', to.dodgeUntil > eng.ticks ? '#9fe6ff' : '#c9c6d8');
          continue;
        }
        if (kind === 'dodge') {
          lf.roll = 1;
          dust(lf.x, lf.y, [0.75, 0.75, 0.8], 3, 1);
          for (var dg0 = 0; dg0 < 6; dg0++) add('ember', lf.x + rnd(-0.8, 0.8), lf.y - rnd(0, lf.s * 0.7), rnd(-2, 2), rnd(-3, 0), 0.4, 0.26, [0.62, 0.9, 1]);
          beep(880, 0.08, 0.025);
          continue;
        }
        if (kind === 'shot' && tactical) {
          launch(from, to, lf, lt, 0, ev[4] * eng.tick);
          continue;
        }
        if (kind === 'hit') {
          (function (from2, to2, lf2, lt2, amt, dir, bigB) {
            var delay = lf2.st ? attackAnim(lf2) : 0;
            lt2.pendUntil = Math.max(lt2.pendUntil, clock + delay + 0.02);
            lt2.blast = bigB ? 1 : lt2.blast;
            after(delay, function () { impact(from2, to2, lf2, lt2, amt, dir, bigB); });
          })(from, to, lf, lt, ev[4], lf.dir, from.kind === 'monster' || from.hero || from.kind === 'heavy');
        } else if (kind === 'shot') {
          (function (from2, to2, lf2, lt2, amt) {
            var delay = lf2.st ? attackAnim(lf2) : 0;
            var dist = Math.sqrt((lt2.x - lf2.x) * (lt2.x - lf2.x) + (lt2.y - lf2.y) * (lt2.y - lf2.y));
            lt2.pendUntil = Math.max(lt2.pendUntil, clock + delay + dist / 14 + 0.1);
            if (from2.splash > 0) lt2.blast = 1;
            after(delay, function () { launch(from2, to2, lf2, lt2, amt); });
          })(from, to, lf, lt, ev[4]);
        } else if (kind === 'heal') {
          (function (lf2, lt2) {
            var delay = lf2.st && !lf2.st.atk ? attackAnim(lf2, 'CAST') : 0;
            after(delay, function () {
              var m = muzzle({ fort: null }, lf2);
              parts.push({ k: 'link', x0: m[0], y0: m[1], lt: lt2, age: 0, life: 0.45, c: [0.6, 0.95, 0.75] });
              lamp(lt2.x, lt2.y - 2, 5, [0.6, 0.94, 0.75], 1, 0.45);
              for (var hh = 0; hh < 6; hh++) add('ember', lt2.x + rnd(-1, 1), lt2.y - rnd(0, lt2.s * 0.8), 0, rnd(-5, -2), rnd(0.5, 0.9), 0.3, [0.6, 0.94, 0.75]);
            });
          })(lf, lt);
        } else if (kind === 'die') {
          if (from && from.team === to.team) { /* la mort est lue image par image */ }
        }
      }
    }

    // --- Mort et résurrection, lues sur l'état du moteur ---
    function beginDeath(u, lk) {
      if (u.fort) { collapseFort(u, lk); return; }
      if (!lk.st) { lk.broken = true; return; }
      if (u.hero || lk.s > 5.5) hitStop = 0.04;
      lk.falling = true;
      lk.st.falling = true;
      lk.lie = 0;
      lamp(lk.x, lk.y - 2, 6, [1, 1, 1], 1, 0.2);
      beep(1200, 0.14, 0.03);
      // L'arme échappe de la main
      var rig = lk.pup.rig, wi = rig.index.weapon;
      if (wi !== undefined && lk.pup.sprs[wi]) {
        var at = boneAt(lk, 'weapon');
        debris.push({ spr: lk.pup.sprs[wi], x: at[0], y: lk.y + rnd(0, 0.5), h: lk.y - at[1], vx: -lk.dir * rnd(1, 3), vy: rnd(-0.4, 0.4), vh: rnd(5, 8), a: lk.st.ang[wi], vr: rnd(-9, 9), f: lk.f, k: rig.bones[wi].k * lk.s / 140, age: 0, life: 2.2, rest: false });
        lk.noWeapon = true;
      }
      if (lk.blast) breakUp(u, lk, 1.5);
    }
    function breakUp(u, lk, power) {
      lk.broken = true;
      var rig = lk.pup.rig, st = lk.st, col = rgb(RACE_GLASS[u.race]);
      var sc = lk.s / 140 * depth(lk.y);
      rig.order.forEach(function (i) {
        var b = rig.bones[i], spr = lk.pup.sprs[i];
        if (!spr || (lk.noWeapon && i === rig.index.weapon)) return;
        var ang = Math.random() * 6.28, v = rnd(0.6, 2.4) * power;
        debris.push({ spr: spr, x: lk.x + lk.f * st.x[i] * sc, y: lk.y + rnd(-0.1, 0.4), h: -st.y[i] * sc, vx: Math.cos(ang) * v - lk.dir * power * 1.2, vy: Math.sin(ang) * v * 0.4, vh: rnd(1.5, 4.5) * power, a: st.ang[i], vr: rnd(-7, 7) * power, f: lk.f, k: b.k * lk.s / 140, age: 0, life: rnd(1.3, 2) });
      });
      shards(lk.x, lk.y - lk.s * 0.3, col, Math.round(10 * power), 6 * power, lk.y + rnd(-0.2, 0.7));
      add('ring', lk.x, lk.y - 0.3, 0, 0, 0.32, lk.s * 0.9, col);
      lamp(lk.x, lk.y - 1.5, 6 + lk.s, col, 1.2, 0.3);
      for (var i2 = 0; i2 < 6 + lk.s; i2++) { var a2 = Math.random() * 6.28, r2 = Math.random() * lk.s * 0.32; scar(lk.x + Math.cos(a2) * r2, lk.y + Math.sin(a2) * r2 * 0.5 + 0.2, fxs['sh' + (i2 % 4)], rnd(0.24, 0.5), col[0], col[1], col[2], 0.95, a2); }
      dust(lk.x, lk.y, [0.7, 0.66, 0.6], 3, 1.1);
      addShake(0.2 + lk.s * 0.02);
    }
    function collapseFort(u, lk) {
      lk.broken = true;
      var f = FORT[u.fort], s = lk.fortS, col = [0.7, 0.72, 0.82];
      addShake(1.2); aberr = Math.max(aberr, 0.012 * 0.3);
      beep(70, 0.8, 0.14, 'sawtooth');
      wave(lk.x, lk.y - f.h * 0.5, 0.03, 0.7);
      lamp(lk.x, lk.y - f.h * 0.5, f.w * 2, [1, 0.72, 0.4], 2, 0.6, 4);
      if (s) {
        var nx = 4, ny = 4, k = f.w / 200, W0 = s.x1 - s.x0, H0 = s.y1 - s.y0;
        for (var j = 0; j < ny; j++) for (var i = 0; i < nx; i++) {
          var piece = { x0: -W0 / nx / 2, x1: W0 / nx / 2, y0: -H0 / ny / 2, y1: H0 / ny / 2, u0: s.u0 + (s.u1 - s.u0) * i / nx, u1: s.u0 + (s.u1 - s.u0) * (i + 1) / nx, v0: s.v0 + (s.v1 - s.v0) * j / ny, v1: s.v0 + (s.v1 - s.v0) * (j + 1) / ny, ax: s.ax + s.aw * i / nx, ay: s.ay + s.ah * j / ny, aw: s.aw / nx, ah: s.ah / ny };
          var cx = (s.x0 + W0 * (i + 0.5) / nx) * k, cy = (s.y0 + H0 * (j + 0.5) / ny) * k;
          debris.push({ spr: piece, x: lk.x + cx, y: lk.y + rnd(-0.3, 0.6), h: -cy, vx: cx * rnd(0.3, 0.8), vy: rnd(-0.3, 0.3), vh: rnd(0, 3), a: 0, vr: rnd(-1.6, 1.6), f: 1, k: k, age: 0, life: rnd(2, 3) });
        }
      }
      for (var d = 0; d < 26; d++) add('smoke', lk.x + rnd(-f.w * 0.5, f.w * 0.5), lk.y - rnd(0, f.h * 0.6), rnd(-2, 2), rnd(-3, -0.4), rnd(1.2, 2.4), rnd(2.4, 4.6), [0.42, 0.4, 0.4], 0, rnd(-1, 1));
      shards(lk.x, lk.y - f.h * 0.5, col, 40, 12, lk.y + rnd(-0.4, 1));
    }
    function revive(u, lk) {
      lk.falling = false; lk.broken = false; lk.noWeapon = false; lk.blast = 0; lk.pendUntil = 0;
      if (lk.pup) { lk.st = GVR.state(lk.pup.rig, u.idx + 1); lk.st.rootX = 0; lk.st.rootY = -lk.pup.rig.H; }
      shards(lk.x, lk.y - 2, [0.82, 0.66, 1], 12, 5, lk.y);
      add('ring', lk.x, lk.y, 0, 0, 0.5, 6, [0.82, 0.66, 1]);
      lamp(lk.x, lk.y - 2, 7, [0.82, 0.66, 1], 1.5, 0.5);
      title = { t: 'Relève', c: '#d2aaff', age: 0.5 };
    }

    // --- Commandes du joueur ---
    var selected = {}, lasso = null, lassoMode = false, paused = false, marks = [], followCam = true, followIds = null, aim = null, hintLeft = tactical ? 9 : 0;
    function selIds() { return Object.keys(selected).map(Number).filter(function (id) { return eng.units[id] && eng.units[id].alive; }); }
    function clearDead() { Object.keys(selected).forEach(function (id) { if (!eng.units[id] || !eng.units[id].alive) delete selected[id]; }); }
    function pickUnit(wx, wy, team) {
      var best = null, bd = 1e9;
      eng.units.forEach(function (u) {
        var l = looks[u.idx];
        if (!l || !u.alive || l.broken || (team !== undefined && u.team !== team)) return;
        if (team === 0 && u.fort) return;
        var dx = l.x - wx, cy = u.fort ? l.y - FORT[u.fort].h * 0.45 : l.y - l.s * 0.45, dy = cy - wy, R = u.fort ? FORT[u.fort].w * 0.5 : Math.max(2.4, l.s * 0.62), q = dx * dx + dy * dy;
        if (q < R * R && q < bd) { bd = q; best = u; }
      });
      return best;
    }
    function orderMove(wx, wy) {
      var ids = selIds();
      if (!ids.length) return;
      var e = unpx(wx, wy), cx = 0, cy = 0;
      ids.forEach(function (id) { cx += eng.units[id].x; cy += eng.units[id].y; });
      cx /= ids.length; cy /= ids.length;
      ids.forEach(function (id, i) {
        var u = eng.units[id], ox = u.x - cx, oy = u.y - cy, L = Math.sqrt(ox * ox + oy * oy);
        // La troupe garde sa forme, resserrée ; deux unités ne visent jamais le même point
        if (L > 9) { ox *= 9 / L; oy *= 9 / L; }
        if (L < 1.5 && ids.length > 1) { var a = i / ids.length * 6.2832; ox = Math.cos(a) * 2.6; oy = Math.sin(a) * 2.6; }
        eng.order({ type: 'unit', ids: [id], cmd: 'move', x: e[0], y: e[1], ox: ox, oy: oy });
      });
      marks.push({ x: wx, y: wy, age: 0, c: [0.5, 0.96, 0.56] });
      beep(520, 0.05, 0.025);
    }
    function orderAttack(target) {
      var ids = selIds();
      if (!ids.length) return;
      eng.order({ type: 'unit', ids: ids, cmd: 'attack', target: target.idx });
      var l = looks[target.idx];
      marks.push({ x: l.x, y: l.y, age: 0, c: [1, 0.36, 0.36] });
      beep(300, 0.06, 0.03, 'square');
    }
    function orderDodge(dx, dy) {
      var ids = commandIds().filter(function (id) { return (eng.units[id].dodgeReady || 0) <= eng.ticks; });
      if (!ids.length) return;
      var o = { type: 'unit', ids: ids, cmd: 'dodge' };
      if (dx !== undefined) { var d = toEngine(dx, dy); o.dx = d[0]; o.dy = d[1]; }
      eng.order(o);
      beep(880, 0.05, 0.02);
    }
    function toEngine(sx, sy) { var e0 = unpx(0, 0), e1 = unpx(sx, sy); return [e1[0] - e0[0], e1[1] - e0[1]]; }
    function selectAll() { eng.units.forEach(function (u) { if (u.alive && u.team === 0 && !u.fort) selected[u.idx] = true; }); }
    // Sans sélection, le stick et les boutons commandent toute l'armée
    function commandIds() {
      var ids = selIds();
      if (ids.length) return ids;
      selectAll();
      hintLeft = 0;
      return selIds();
    }
    // Un ennemi proche ; si une direction est donnée, celui qui se trouve le mieux dans cet axe
    function bestFoe(x, y, ex, ey) {
      var best = null, bs = Infinity;
      eng.units.forEach(function (e) {
        if (!e.alive || e.team === 0) return;
        var qx = e.x - x, qy = e.y - y, q = Math.sqrt(qx * qx + qy * qy) || 1, sc = q;
        if (ex !== undefined) { var c = (qx * ex + qy * ey) / q; sc = q * (2.2 - c * 1.7) + (c < 0.2 ? 200 : 0); }
        if (sc < bs) { bs = sc; best = e; }
      });
      return best;
    }
    function aimTarget(sx, sy) {
      var ids = selIds(), cx = 0, cy = 0, n = 0;
      eng.units.forEach(function (u) {
        if (!u.alive || u.team !== 0 || u.fort || (ids.length && !selected[u.idx])) return;
        cx += u.x; cy += u.y; n++;
      });
      if (!n) return null;
      var d = toEngine(sx, sy);
      return bestFoe(cx / n, cy / n, d[0], d[1]);
    }
    // Avec une direction, tout le groupe vise la même cible ; sans, chacun prend l'ennemi le plus proche
    function fireAttack(dir) {
      var ids = commandIds();
      if (!ids.length) return;
      if (stick.id !== null) { stick.stop = true; stick.moving = false; }
      if (dir) {
        var tg = aimTarget(dir[0], dir[1]);
        if (tg) orderAttack(tg);
        return;
      }
      var seen = {};
      ids.forEach(function (id) {
        var u = eng.units[id], foe = bestFoe(u.x, u.y);
        if (!foe) return;
        eng.order({ type: 'unit', ids: [id], cmd: 'attack', target: foe.idx });
        var l = looks[foe.idx];
        if (l && !seen[foe.idx]) { seen[foe.idx] = true; marks.push({ x: l.x, y: l.y, age: 0, c: [1, 0.36, 0.36] }); }
      });
      beep(300, 0.06, 0.03, 'square');
    }
    var lastTap = { t: 0, id: -1 };
    function tapAt(cx, cy) {
      var wx = (cx - view.ox) / view.s, wy = (cy - view.oy) / view.s;
      if (targeting) {
        var w = unpx(wx, wy);
        targeting = false;
        eng.order({ type: 'smite', x: w[0], y: w[1] });
        syncPad();
        return;
      }
      if (!tactical) return;
      var ally = pickUnit(wx, wy, 0);
      if (ally) {
        var now = performance.now();
        if (lastTap.id === ally.idx && now - lastTap.t < 340) {
          // Deux touches : toutes les unités du même type
          eng.units.forEach(function (u) { if (u.alive && u.team === 0 && !u.fort && u.uid === ally.uid) selected[u.idx] = true; });
        } else if (selected[ally.idx]) delete selected[ally.idx];
        else selected[ally.idx] = true;
        lastTap = { t: now, id: ally.idx };
        hintLeft = 0;
        syncPad();
        beep(760, 0.04, 0.02);
        return;
      }
      var foe = pickUnit(wx, wy, 1);
      if (foe && selIds().length) { orderAttack(foe); return; }
      if (selIds().length) orderMove(wx, wy);
    }

    var targeting = false, speedBoost = false, reserve = (opts.reserve || []).map(function (r) { return { uid: r.uid, n: r.n, w: r.w, lv: r.lv }; });
    // --- Manette : tout se commande sur la carte ---
    var pad = box.querySelector('#pad'), btn = {}, tip = null, stickEl = null, knob = null, stickDir = null, manaBar = null, manaNum = null, lastCd = -1, lastPauseIcon = null;
    var stick = { id: null, dx: 0, dy: 0, m: 0, moving: false, stop: false, tick: -1, ids: [] };
    function pb(act, cls, icon, label, inner, style) {
      return '<button type="button" class="pb ' + cls + '" data-p="' + act + '" aria-label="' + esc(label) + '"' + (style ? ' style="' + style + '"' : '') + '>' + padIcon(icon) + (inner || '') + '</button>';
    }
    function cost(n) { return '<small>' + n + '</small>'; }
    function buildPad() {
      var sysSkip = pb('skip', 'lead sys', 'skip', 'Passer le combat');
      if (!tactical) {
        pad.innerHTML = '<div class="pad-sys">' + sysSkip + '</div>';
      } else {
        var c = eng.costs, heroes = eng.units.filter(function (u) { return u.team === 0 && u.hero && u.alive; });
        var res = heroes.map(function (u) { return pb('hero:' + u.idx, 'amber port', 'crown', u.hero.name || 'Héros'); }).join('') + reserve.map(function (r) {
          return pb('dep:' + r.uid, 'sky port', 'add', 'Renfort : ' + GV.unitInfo(sideA.race, r.uid).name, '<em></em>' + cost(c.deploy));
        }).join('');
        pad.innerHTML = '<div class="pad-sys">' + pb('pause', 'lead sys', 'pause', 'Pause') + pb('spd', 'lead sys', 'spd', 'Vitesse', '<em></em>') + sysSkip + '</div>' +
          '<div class="pad-res">' + res + '</div>' +
          '<div class="pad-l"><div class="pad-row">' + pb('all', 'amethyst', 'all', "Toute l'armée") + pb('none', 'amethyst', 'none', 'Tout désélectionner', '<em></em>') + pb('lasso', 'amethyst', 'lasso', 'Cadre de sélection') + '</div>' +
          '<div class="stick" aria-label="Stick : déplacer" role="group">' + STICK_ROSE + '<i class="stick-dir"></i><i class="knob"></i></div></div>' +
          '<div class="pad-r"><div class="pad-mana" aria-hidden="true"><i></i><span></span></div><div class="pad-row">' +
          pb('smite', 'sun', 'smite', 'Frappe', cost(c.smite)) + pb('heal', 'emerald', 'heal', 'Soin', cost(c.heal)) + pb('charge', 'ember', 'charge', 'Charge', cost(c.charge)) +
          pb('power', 'race', 'power', GV.POWERS[sideA.race].name, cost(c.power), '--g1:' + RACE_GLASS[sideA.race]) + '</div>' +
          '<div class="pad-act">' + pb('auto', 'emerald a-auto', 'auto', 'Combat libre') + pb('hold', 'amber a-hold', 'hold', 'Tenir la position') + pb('dodge', 'sapphire a-dodge', 'dodge', 'Esquiver', '<b class="cd"></b>') + pb('attack', 'ruby a-attack', 'attack', 'Attaquer') + '</div></div>' +
          '<div class="pad-tip" hidden></div>';
        tip = pad.querySelector('.pad-tip');
        stickEl = pad.querySelector('.stick'); knob = pad.querySelector('.knob'); stickDir = pad.querySelector('.stick-dir');
        manaBar = pad.querySelector('.pad-mana i'); manaNum = pad.querySelector('.pad-mana span');
        bindStick();
        heroes.forEach(function (u) { paintThumb('hero:' + u.idx, u.uid, wid(u)); });
        reserve.forEach(function (r) { paintThumb('dep:' + r.uid, r.uid, typeof r.w === 'number' && r.w >= 0 ? GV.WEAPONS[r.w][0] : null); });
      }
      Array.prototype.forEach.call(pad.querySelectorAll('.pb'), function (el) { btn[el.getAttribute('data-p')] = el; });
    }
    // Le portrait de l'unité remplace l'icône dès qu'il est prêt
    function paintThumb(act, uid, weapon) {
      GVG.unit(sideA.race, uid, weapon, skins[0], 3).then(GVG.portrait).then(function (art) {
        var el = btn[act];
        if (!el || !el.isConnected) return;
        var c = document.createElement('canvas');
        c.width = 111; c.height = 105;
        c.className = 'pb-art';
        c.getContext('2d').drawImage(art, 0, 0, 111, 105);
        var old = el.querySelector('svg');
        if (old) el.replaceChild(c, old);
      }).catch(function () { /* l'icône reste affichée */ });
    }
    function flag(name, off, pressed) {
      var el = btn[name];
      if (!el) return;
      if (off !== undefined && el.classList.contains('off') !== !!off) { el.classList.toggle('off', !!off); el.setAttribute('aria-disabled', off ? 'true' : 'false'); }
      if (pressed !== undefined && (el.getAttribute('aria-pressed') === 'true') !== !!pressed) el.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    }
    function setText(el, v) { if (el && el.textContent !== String(v)) el.textContent = v; }
    function syncPad() {
      if (!tactical) return;
      clearDead();
      var ids = selIds(), m = eng.mana[0], c = eng.costs, ticks = eng.ticks;
      flag('none', !ids.length);
      setText(btn.none.querySelector('em'), ids.length || '');
      flag('lasso', undefined, lassoMode);
      flag('hold', undefined, ids.length > 0 && ids.every(function (id) { var o = eng.units[id].cmd; return o && o.t === 'hold'; }));
      flag('auto', undefined, ids.length > 0 && ids.every(function (id) { return !eng.units[id].cmd; }));
      // Recharge de l'esquive : le cadran se vide jusqu'à ce qu'une unité soit prête
      var soon = Infinity, any = false;
      eng.units.forEach(function (u) {
        if (!u.alive || u.team !== 0 || u.fort || (ids.length && !selected[u.idx])) return;
        any = true;
        soon = Math.min(soon, Math.max(0, (u.dodgeReady || 0) - ticks));
      });
      var pct = any ? Math.round(soon / GVB.DODGE_COOLDOWN * 100) : 0;
      if (pct !== lastCd) { lastCd = pct; btn.dodge.style.setProperty('--cd', pct + '%'); flag('dodge', pct > 0); }
      flag('smite', m < c.smite, targeting);
      flag('heal', m < c.heal);
      flag('charge', m < c.charge);
      flag('power', m < c.power || eng.fired[0]);
      manaBar.style.width = Math.round(m / eng.manaMax[0] * 100) + '%';
      setText(manaNum, Math.floor(m));
      var icon = paused ? 'play' : 'pause';
      if (icon !== lastPauseIcon) { lastPauseIcon = icon; btn.pause.querySelector('svg').innerHTML = PAD_ICONS[icon]; btn.pause.setAttribute('aria-label', paused ? 'Reprendre' : 'Pause'); }
      flag('pause', undefined, paused);
      flag('spd', undefined, speedBoost);
      setText(btn.spd.querySelector('em'), speedBoost ? '×2' : '');
      reserve.forEach(function (r) {
        var el = btn['dep:' + r.uid];
        el.hidden = r.n < 1;
        setText(el.querySelector('em'), '×' + r.n);
        flag('dep:' + r.uid, m < c.deploy);
      });
      eng.units.forEach(function (u) {
        var el = u.team === 0 && u.hero ? btn['hero:' + u.idx] : null;
        if (!el) return;
        el.hidden = !u.alive;
        flag('hero:' + u.idx, undefined, !!selected[u.idx]);
      });
    }
    function doPad(act, dir) {
      var el = btn[act];
      if (el && el.classList.contains('off')) { beep(140, 0.05, 0.02, 'square'); return; }
      var pushed = stick.id !== null && stick.m > 0 ? [stick.dx, stick.dy] : null;
      if (act === 'skip') { finishNow(); return; }
      if (act === 'spd') speedBoost = !speedBoost;
      else if (act === 'pause') paused = !paused;
      else if (act === 'all') { selectAll(); hintLeft = 0; beep(760, 0.04, 0.02); }
      else if (act === 'none') selected = {};
      else if (act === 'lasso') lassoMode = !lassoMode;
      else if (act === 'attack') fireAttack(dir || pushed);
      else if (act === 'dodge') { var dd = dir || pushed; if (dd) orderDodge(dd[0], dd[1]); else orderDodge(); }
      else if (act === 'hold' || act === 'auto') { stick.stop = stick.id !== null; stick.moving = false; eng.order({ type: 'unit', ids: commandIds(), cmd: act }); beep(520, 0.05, 0.02); }
      else if (act === 'smite') targeting = !targeting;
      else if (act === 'heal' || act === 'charge' || act === 'power') eng.order({ type: act });
      else if (act.indexOf('hero:') === 0) { selected = {}; selected[+act.slice(5)] = true; hintLeft = 0; beep(760, 0.04, 0.02); }
      else if (act.indexOf('dep:') === 0) {
        var r = reserve.filter(function (x) { return x.uid === +act.slice(4); })[0];
        if (!r || r.n < 1) return;
        r.n--;
        eng.order({ type: 'deploy', uid: r.uid, w: r.w, lv: r.lv });
        if (opts.onDeploy) opts.onDeploy(r.uid);
      }
      syncPad();
    }
    // Un doigt par bouton : l'action part quand on relève, ce qui fonctionne même avec un pouce déjà sur le stick
    var presses = {};
    function showTip(el) {
      if (!tip) return;
      var r = el.getBoundingClientRect(), o = stage.getBoundingClientRect(), under = r.top - o.top < 44;
      tip.textContent = el.getAttribute('aria-label');
      tip.hidden = false;
      tip.classList.toggle('under', under);
      var half = tip.offsetWidth / 2;
      tip.style.left = Math.max(half + 4, Math.min(o.width - half - 4, r.left + r.width / 2 - o.left)) + 'px';
      tip.style.top = (under ? r.bottom - o.top + 8 : r.top - o.top - 8) + 'px';
    }
    function hideTip() { if (tip) tip.hidden = true; }
    pad.addEventListener('pointerdown', function (e) {
      var el = e.target.closest ? e.target.closest('.pb') : null;
      if (!el) return;
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* le geste continue sans capture */ }
      el.classList.add('on');
      var rec = { el: el, x: e.clientX, y: e.clientY, tip: false, aiming: false, timer: 0 };
      rec.timer = setTimeout(function () { if (!rec.aiming) { rec.tip = true; showTip(el); } }, 420);
      presses[e.pointerId] = rec;
    });
    pad.addEventListener('pointermove', function (e) {
      var rec = presses[e.pointerId];
      if (!rec) return;
      var act = rec.el.getAttribute('data-p');
      if (act !== 'attack' && act !== 'dodge') return;
      // Attaque et esquive se visent : glisser depuis le bouton choisit la direction
      var dx = e.clientX - rec.x, dy = e.clientY - rec.y, L = Math.sqrt(dx * dx + dy * dy);
      if (L > 14) {
        rec.aiming = true;
        hideTip();
        aim = { kind: act, dx: dx / L, dy: dy / L, m: Math.min(1, L / 70), target: null };
        if (act === 'attack') aim.target = aimTarget(aim.dx, aim.dy);
      } else if (rec.aiming) aim = null;
    });
    function padUp(e) {
      var rec = presses[e.pointerId];
      if (!rec) return;
      delete presses[e.pointerId];
      clearTimeout(rec.timer);
      rec.el.classList.remove('on');
      hideTip();
      var shot = aim, act = rec.el.getAttribute('data-p');
      if (rec.aiming) aim = null;
      if (e.type !== 'pointerup') return;
      if (rec.aiming) { if (shot) doPad(act, [shot.dx, shot.dy]); return; }
      if (rec.tip) return; // appui long : on a lu le nom, on ne déclenche rien
      var r = rec.el.getBoundingClientRect();
      if (e.clientX < r.left - 18 || e.clientX > r.right + 18 || e.clientY < r.top - 18 || e.clientY > r.bottom + 18) return;
      doPad(act);
    }
    pad.addEventListener('pointerup', padUp);
    pad.addEventListener('pointercancel', padUp);
    // Le clavier passe par le clic ; au doigt, l'action est déjà partie au relâchement
    pad.addEventListener('click', function (e) {
      if (e.detail !== 0) return;
      var el = e.target.closest ? e.target.closest('.pb') : null;
      if (el) doPad(el.getAttribute('data-p'));
    });
    pad.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    // Le stick : la direction du pouce donne le cap, son écart au centre donne l'allure
    function stickAt(e) {
      var r = stickEl.getBoundingClientRect(), R = r.width * 0.34;
      var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2, L = Math.sqrt(x * x + y * y), q = L > R ? R / L : 1, m = Math.min(1, L / R);
      knob.style.transform = 'translate(' + (x * q).toFixed(1) + 'px,' + (y * q).toFixed(1) + 'px)';
      if (m < 0.18) { stick.m = 0; stickDir.style.opacity = 0; return; }
      stick.dx = x / L; stick.dy = y / L; stick.m = (m - 0.18) / 0.82;
      stickDir.style.opacity = (0.35 + 0.65 * stick.m).toFixed(2);
      stickDir.style.transform = 'rotate(' + Math.round(Math.atan2(y, x) * 57.2958 + 90) + 'deg)';
    }
    function bindStick() {
      stickEl.addEventListener('pointerdown', function (e) {
        if (stick.id !== null) return;
        e.preventDefault();
        stick.id = e.pointerId; stick.stop = false; stick.tick = -1;
        try { stickEl.setPointerCapture(e.pointerId); } catch (err) { /* le geste continue sans capture */ }
        stickEl.classList.add('on');
        stickAt(e);
      });
      stickEl.addEventListener('pointermove', function (e) { if (e.pointerId === stick.id) stickAt(e); });
      function up(e) {
        if (e.pointerId !== stick.id) return;
        stick.id = null; stick.m = 0;
        stickEl.classList.remove('on');
        knob.style.transform = '';
        stickDir.style.opacity = 0;
        stopStick();
      }
      stickEl.addEventListener('pointerup', up);
      stickEl.addEventListener('pointercancel', up);
      stickEl.addEventListener('lostpointercapture', up);
    }
    function stopStick() {
      if (!stick.moving) return;
      stick.moving = false;
      eng.order({ type: 'unit', ids: stick.ids, cmd: 'hold' });
    }
    // Chaque tour, le groupe reçoit un point à atteindre droit devant lui : la formation se conserve d'elle-même
    function driveStick() {
      if (stick.id === null || paused || eng.done) return;
      if (stick.m <= 0) { stopStick(); stick.stop = false; return; }
      if (stick.stop || eng.ticks === stick.tick) return;
      if (stick.moving && !selIds().length) { stick.moving = false; stick.stop = true; return; }
      var ids = commandIds();
      if (!ids.length) return;
      stick.tick = eng.ticks;
      var d = toEngine(stick.dx, stick.dy), k = 0.42 + 0.58 * stick.m;
      ids.forEach(function (id) {
        var u = eng.units[id];
        eng.order({ type: 'unit', ids: [id], cmd: 'move', x: u.x + d[0] * 8, y: u.y + d[1] * 8, k: k });
      });
      if (!stick.moving) { followCam = true; followIds = ids.slice(); hintLeft = 0; }
      stick.moving = true; stick.ids = ids;
    }

    // --- Caméra ---
    var cam = { x: fieldW / 2, y: fieldH / 2, z: 1 }, playZ = 1;
    var cssW = 0, cssH = 0, dpr = Math.min(2, window.devicePixelRatio || 1), base = 1, viewX = opts.half === 1 ? W / 2 : 0, renderScale = 1;
    function fit() {
      var r = stage.getBoundingClientRect();
      if (r.width !== cssW || r.height !== cssH) {
        cssW = r.width; cssH = r.height;
        cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
        cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
        var gc = box.querySelector('#gcv');
        gc.style.width = cssW + 'px'; gc.style.height = cssH + 'px';
        base = opts.half === null ? Math.min(cssW / fieldW, cssH / fieldH) : Math.min(cssW / (W / 2), cssH / H);
        // Vue de jeu : assez large pour voir la manœuvre, jamais de gros plan automatique
        playZ = Math.max(1, 11 / base);
        clampCam();
      }
      var dd = dpr * renderScale;
      G.resize(Math.max(2, Math.round(cssW * dd)), Math.max(2, Math.round(cssH * dd)), dd);
    }
    function clampCam() {
      var vw = cssW / (base * cam.z), vh = cssH / (base * cam.z);
      cam.x = vw >= fieldW ? fieldW / 2 : Math.max(vw / 2, Math.min(fieldW - vw / 2, cam.x));
      var below = tactical ? Math.min(170, cssH * 0.34) / (base * cam.z) : 0;
      cam.y = vh >= fieldH ? fieldH / 2 : Math.max(vh / 2 - 10, Math.min(fieldH - vh / 2 + below, cam.y));
    }
    var view = { s: 1, ox: 0, oy: 0 };
    function computeView() {
      var nowS = performance.now() * 0.021, sx = shake > 0 ? Math.sin(nowS) * shake : 0, sy = shake > 0 ? Math.cos(nowS * 1.3) * shake * 0.7 : 0;
      if (opts.half !== null) {
        var ox = (cssW - W / 2 * base) / 2, oy = (cssH - H * base) / 2;
        view.s = base; view.ox = ox - viewX * base; view.oy = oy;
        return;
      }
      var s = base * cam.z;
      view.s = s; view.ox = cssW / 2 - (cam.x + sx) * s; view.oy = cssH / 2 - (cam.y + sy) * s;
    }
    function zoomAt(cx, cy, factor) {
      var wx = (cx - view.ox) / view.s, wy = (cy - view.oy) / view.s;
      cam.z = Math.max(1, Math.min(2.8 * Math.max(1, 11 / base), cam.z * factor));
      playZ = cam.z;
      var s = base * cam.z;
      cam.x = wx - (cx - cssW / 2) / s; cam.y = wy - (cy - cssH / 2) / s;
      clampCam();
      followCam = false;
    }
    // Gestes : un doigt déplace la vue (ou trace le cadre), deux doigts zooment, une touche commande
    var pts = {}, gesture = null, MM = { x: 0, y: 0, w: 0, h: 0 };
    function local(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function inMini(p) { return tactical !== null && opts.half === null && p[0] >= MM.x && p[0] <= MM.x + MM.w && p[1] >= MM.y && p[1] <= MM.y + MM.h; }
    function miniJump(p) { cam.x = (p[0] - MM.x) / MM.w * fieldW; cam.y = (p[1] - MM.y) / MM.h * fieldH; clampCam(); followCam = false; }
    cv.addEventListener('pointerdown', function (e) {
      var p = local(e);
      pts[e.pointerId] = p;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* le geste continue sans capture */ }
      var ids = Object.keys(pts);
      if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]]; gesture = { kind: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; lasso = null; return; }
      if (inMini(p)) { gesture = { kind: 'mini' }; miniJump(p); return; }
      var wx = (p[0] - view.ox) / view.s, wy = (p[1] - view.oy) / view.s, on = tactical ? pickUnit(wx, wy, 0) : null;
      gesture = { kind: 'tap', x: p[0], y: p[1], last: p, t: performance.now(), onSel: on && selected[on.idx] ? on : null };
    });
    cv.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      var p = local(e);
      pts[e.pointerId] = p;
      if (!gesture) return;
      if (gesture.kind === 'mini') { miniJump(p); return; }
      if (gesture.kind === 'pinch') {
        var ids = Object.keys(pts);
        if (ids.length < 2) return;
        var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (gesture.d > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / gesture.d);
        gesture.d = d;
        return;
      }
      var moved = Math.hypot(p[0] - gesture.x, p[1] - gesture.y);
      if (gesture.kind === 'tap' && moved > 9) {
        if (gesture.onSel) gesture.kind = 'flick';
        else if (lassoMode && tactical) gesture.kind = 'lasso';
        else gesture.kind = 'pan';
      }
      if (gesture.kind === 'pan' && opts.half === null) {
        cam.x -= (p[0] - gesture.last[0]) / view.s; cam.y -= (p[1] - gesture.last[1]) / view.s;
        clampCam();
        followCam = false; followIds = null;
      }
      if (gesture.kind === 'lasso') lasso = { x0: gesture.x, y0: gesture.y, x1: p[0], y1: p[1] };
      gesture.last = p;
    });
    function endPointer(e) {
      var had = pts[e.pointerId];
      delete pts[e.pointerId];
      if (!had || !gesture) return;
      if (gesture.kind === 'pinch') { if (!Object.keys(pts).length) gesture = null; return; }
      if (gesture.kind === 'tap' && e.type === 'pointerup') tapAt(gesture.x, gesture.y);
      if (gesture.kind === 'flick' && e.type === 'pointerup') orderDodge(had[0] - gesture.x, had[1] - gesture.y);
      if (gesture.kind === 'lasso' && lasso) {
        var xa = Math.min(lasso.x0, lasso.x1), xb = Math.max(lasso.x0, lasso.x1), ya = Math.min(lasso.y0, lasso.y1), yb = Math.max(lasso.y0, lasso.y1);
        eng.units.forEach(function (u) {
          var l = looks[u.idx];
          if (!l || !u.alive || u.team !== 0 || u.fort) return;
          var sx = l.x * view.s + view.ox, sy = (l.y - l.s * 0.45) * view.s + view.oy;
          if (sx >= xa && sx <= xb && sy >= ya && sy <= yb) selected[u.idx] = true;
        });
        lasso = null;
        lassoMode = false;
        hintLeft = 0;
        syncPad();
      }
      gesture = null;
    }
    cv.addEventListener('pointerup', endPointer);
    cv.addEventListener('pointercancel', endPointer);
    cv.addEventListener('wheel', function (e) {
      if (opts.half !== null) return;
      e.preventDefault();
      var p = local(e);
      zoomAt(p[0], p[1], e.deltaY < 0 ? 1.12 : 0.89);
    }, { passive: false });
    // Vue d'ensemble pendant le compte à rebours, puis cadrage sur son armée ; ensuite plus aucun zoom automatique
    var armyX = 0, armyY = 0, wasStarted = false;
    function updateCamera(t, started) {
      if (opts.half !== null) return;
      var sx = 0, sy = 0, c = 0;
      eng.units.forEach(function (u) {
        if (!u.alive || u.fort || !looks[u.idx] || u.team !== opts.mine) return;
        var l = looks[u.idx];
        sx += l.x; sy += l.y; c++;
      });
      if (c) { armyX = sx / c; armyY = sy / c; }
      var remain = (startAt - Date.now()) / 1000;
      if (!started && remain > 1.6) { cam.z = 1; cam.x = fieldW / 2; cam.y = fieldH / 2; clampCam(); return; }
      if (Math.abs(cam.z - playZ) > 0.002) cam.z += (playZ - cam.z) * Math.min(1, t * 3.2);
      if (followCam && c) {
        var goX = armyX, goY = armyY, gn = 0, gx = 0, gy = 0;
        if (followIds) followIds.forEach(function (id) {
          var u = eng.units[id], l = looks[id];
          if (u && u.alive && l) { gx += l.x; gy += l.y; gn++; }
        });
        if (gn) { goX = gx / gn; goY = gy / gn; }
        var k = Math.min(1, t * (gn ? 2.4 : (started ? 0.9 : 3)));
        cam.x += (goX - cam.x) * k; cam.y += (goY - cam.y) * k;
      }
      clampCam();
    }
    // Minicarte : toute la bataille d'un coup d'œil, et un raccourci pour s'y rendre
    function drawMinimap() {
      if (opts.half !== null) return;
      var mw = Math.min(130, cssW * 0.25), mh = mw * fieldH / fieldW;
      if (mh > cssH * 0.3) { mh = cssH * 0.3; mw = mh * fieldW / fieldH; }
      MM = { x: cssW - mw - 8, y: 8, w: mw, h: mh };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = '#0a0810';
      ctx.fillRect(MM.x, MM.y, mw, mh);
      ctx.globalAlpha = 1;
      if (miniImg) { ctx.globalAlpha = 0.72; ctx.drawImage(miniImg, MM.x, MM.y, mw, mh); ctx.globalAlpha = 1; }
      var k = mw / fieldW;
      eng.units.forEach(function (u) {
        var l = looks[u.idx];
        if (!l || !u.alive) return;
        ctx.fillStyle = u.team === opts.mine ? (selected[u.idx] ? '#ffd75a' : '#7fe08a') : '#ff5a60';
        var sz = u.fort ? 5 : (l.s > 5.5 ? 4 : 3);
        ctx.fillRect(MM.x + l.x * k - sz / 2, MM.y + l.y * k - sz / 2, sz, sz);
      });
      var vw = cssW / view.s, vh = cssH / view.s, vx = -view.ox / view.s, vy = -view.oy / view.s;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.strokeRect(MM.x + Math.max(0, vx) * k, MM.y + Math.max(0, vy) * k, Math.min(fieldW, vw) * k, Math.min(fieldH, vh) * k);
      ctx.strokeStyle = '#d9b447'; ctx.lineWidth = 1.5;
      ctx.strokeRect(MM.x, MM.y, mw, mh);
    }
    var miniImg = null;

    // --- Dessin ---
    function Q(spr, x, y, w, h, ang, r, g, b, a, mode) {
      var c = Math.cos(ang), s = Math.sin(ang), hw = w / 2, hh = h / 2;
      var ax = c * hw, ay = s * hw, bx = -s * hh, by = c * hh;
      G.quad(spr, x - ax - bx, y - ay - by, x + ax - bx, y + ay - by, x + ax + bx, y + ay + by, x - ax + bx, y - ay + by, c, s, 1, r, g, b, a, 0, mode);
    }
    function line(x0, y0, x1, y1, wd, r, g, b, a, mode) {
      var dx = x1 - x0, dy = y1 - y0, L = Math.sqrt(dx * dx + dy * dy) || 0.001;
      Q(fxs.white, (x0 + x1) / 2, (y0 + y1) / 2, L, wd, Math.atan2(dy, dx), r, g, b, a, mode);
    }
    function drawPuppet(lk, shadow, alpha) {
      var pup = lk.pup, st = lk.st, rig = pup.rig, order = rig.order, bones = rig.bones, sprs = pup.sprs;
      var X = lk.x + lk.kx, Y = lk.y + lk.ky, sc = lk.s / 140 * depth(lk.y), f = lk.f;
      if (st.spin) f *= Math.cos(st.spin) || 0.01;
      var roll = lk.roll > 0 ? (1 - lk.roll) * 6.2832 : 0, rc = Math.cos(roll), rs = Math.sin(roll), pivY = -rig.H * 0.55;
      if (lk.st.dodging && !shadow) alpha *= 0.72;
      var fs = f >= 0 ? 1 : -1, fl = shadow ? 0 : lk.flash * 0.34, mode = shadow ? 3 : 0, wi = rig.index.weapon;
      for (var n = 0; n < order.length; n++) {
        var i = order[n], spr = sprs[i];
        if (!spr) continue;
        if (i === wi && (lk.noWeapon || clock < lk.hideW)) continue;
        var k = bones[i].k, a = st.ang[i], c = Math.cos(a), s = Math.sin(a), bx = st.x[i], by = st.y[i];
        var x0 = spr.x0 * k, x1 = spr.x1 * k, y0 = spr.y0 * k, y1 = spr.y1 * k;
        var l0x = bx + x0 * c - y0 * s, l0y = by + x0 * s + y0 * c, l1x = bx + x1 * c - y0 * s, l1y = by + x1 * s + y0 * c, l2x = bx + x1 * c - y1 * s, l2y = by + x1 * s + y1 * c, l3x = bx + x0 * c - y1 * s, l3y = by + x0 * s + y1 * c;
        if (roll) {
          var tmp;
          tmp = l0x * rc - (l0y - pivY) * rs; l0y = pivY + l0x * rs + (l0y - pivY) * rc; l0x = tmp;
          tmp = l1x * rc - (l1y - pivY) * rs; l1y = pivY + l1x * rs + (l1y - pivY) * rc; l1x = tmp;
          tmp = l2x * rc - (l2y - pivY) * rs; l2y = pivY + l2x * rs + (l2y - pivY) * rc; l2x = tmp;
          tmp = l3x * rc - (l3y - pivY) * rs; l3y = pivY + l3x * rs + (l3y - pivY) * rc; l3x = tmp;
          var c2 = c * rc - s * rs, s2 = s * rc + c * rs; c = c2; s = s2;
        }
        if (shadow) {
          G.quad(spr, X + (f * l0x - l0y * SHX) * sc, Y - l0y * SHY * sc, X + (f * l1x - l1y * SHX) * sc, Y - l1y * SHY * sc, X + (f * l2x - l2y * SHX) * sc, Y - l2y * SHY * sc, X + (f * l3x - l3y * SHX) * sc, Y - l3y * SHY * sc, 1, 0, 1, 0, 0, 0, alpha, 0, mode);
        } else {
          G.quad(spr, X + f * l0x * sc, Y + l0y * sc, X + f * l1x * sc, Y + l1y * sc, X + f * l2x * sc, Y + l2y * sc, X + f * l3x * sc, Y + l3y * sc, c, s, fs, bones[i].dk, bones[i].dk, bones[i].dk, alpha, fl, mode);
        }
      }
    }
    function drawBow(lk) {
      var rig = lk.pup.rig;
      if (rig.profile !== 'BOW' || lk.noWeapon) return;
      var top = boneAt(lk, 'weapon', -12, -37), bot = boneAt(lk, 'weapon', -12, 37), st = lk.st, wi = rig.index.weapon;
      var pull = st.atk === 'BOW' ? (st.pull || 0) : 0, hand = pull > 0.02 ? boneAt(lk, 'armLB', 0, rig.d.fr) : null;
      var thick = lk.s * 0.012;
      if (hand) {
        line(top[0], top[1], hand[0], hand[1], thick, 0.92, 0.9, 0.8, 0.95, 1);
        line(bot[0], bot[1], hand[0], hand[1], thick, 0.92, 0.9, 0.8, 0.95, 1);
        var tip = boneAt(lk, 'weapon', 26, 0), ang = Math.atan2(tip[1] - hand[1], tip[0] - hand[0]);
        Q(fxs.arrow, (tip[0] + hand[0]) / 2, (tip[1] + hand[1]) / 2, lk.s * 0.56, lk.s * 0.09, ang, 1, 1, 1, 1, 1);
      } else line(top[0], top[1], bot[0], bot[1], thick, 0.92, 0.9, 0.8, 0.8, 1);
      void wi;
    }
    function drawTrail(lk) {
      var tr = lk.trail;
      if (tr.length < 2) return;
      for (var i = 1; i < tr.length; i++) {
        var a = tr[i - 1], b = tr[i], al = (i / tr.length) * (1 - Math.min(1, (clock - b.t) / 0.16)) * 0.55;
        if (al <= 0) continue;
        G.quad(fxs.white, a.tx, a.ty, b.tx, b.ty, b.bx, b.by, a.bx, a.by, 1, 0, 1, 1, 0.94, 0.78, al, 0, 2);
      }
    }
    function drawUnit(u, lk) {
      if (lk.broken) return;
      if (u.fort) {
        var f = FORT[u.fort], s = lk.fortS;
        if (!s) return;
        var k = f.w / 200, sh = lk.shake > 0 ? rnd(-lk.shake, lk.shake) : 0, burn = 1 - 0.35 * (1 - u.hp / u.maxHp);
        G.quad(s, lk.x + sh + s.x0 * k, lk.y + s.y0 * k, lk.x + sh + s.x1 * k, lk.y + s.y0 * k, lk.x + sh + s.x1 * k, lk.y + s.y1 * k, lk.x + sh + s.x0 * k, lk.y + s.y1 * k, 1, 0, 1, burn, burn, burn, 1, lk.flash * 0.18, 0);
        return;
      }
      if (!lk.st) return;
      var ringA = lk.falling ? 0 : 0.42, ringC = u.team === opts.mine ? [0.5, 0.96, 0.56] : [1, 0.42, 0.45], rw = lk.s * 0.74 * depth(lk.y);
      if (ringA) Q(fxs.ring, lk.x, lk.y, rw, rw * 0.32, 0, ringC[0], ringC[1], ringC[2], ringA, 1);
      if (u.hero && !lk.falling) {
        var pulse = 0.5 + 0.2 * Math.sin(clock * 3);
        Q(fxs.soft, lk.x, lk.y, lk.s * 1.8, lk.s * 0.7, 0, 1, 0.84, 0.35, pulse * 0.45, 2);
        Q(fxs.ring, lk.x, lk.y, lk.s * 1.2 + Math.sin(clock * 2) * 0.3, lk.s * 0.42, 0, 1, 0.8, 0.28, 0.8, 1);
      }
      drawPuppet(lk, false, lk.alpha);
      drawBow(lk);
      drawTrail(lk);
      if (lk.st.atk === 'CAST') {
        var k2 = lk.st.atkT;
        if (k2 < 0.6) { var tip = muzzle(u, lk), gr = lk.s * (0.14 + k2 * 0.4), col = rgb(RACE_GLASS[u.race]); Q(fxs.soft, tip[0], tip[1], gr, gr, 0, col[0], col[1], col[2], 0.55, 2); }
      }
      if (lk.pup.rig.index.orb !== undefined && !lk.falling) {
        var orb = boneAt(lk, 'orb'), oc = rgb(RACE_GLASS[u.race]);
        Q(fxs.soft, orb[0], orb[1], lk.s * 0.3, lk.s * 0.3, 0, oc[0], oc[1], oc[2], 0.42 + 0.14 * Math.sin(clock * 5 + u.idx), 2);
      }
    }
    function stepUnit(u, lk, tk, dt) {
      if (u.alive && (lk.broken || lk.falling) && !u.fort) revive(u, lk);
      if (!u.alive && !lk.broken && !lk.falling && clock >= lk.pendUntil) beginDeath(u, lk);
      if (lk.broken) return;
      lk.flash = Math.max(0, lk.flash - dt * 7);
      lk.shake = Math.max(0, lk.shake - dt * 2);
      if (u.fort) {
        var at0 = px(u.x, u.y); lk.x = at0[0]; lk.y = at0[1];
        var dmg = 1 - u.hp / u.maxHp, f = FORT[u.fort];
        lk.smokeT -= dt;
        if (dmg > 0.35 && lk.smokeT <= 0) {
          lk.smokeT = 0.16 / (dmg + 0.2);
          var sx = lk.x + rnd(-f.w * 0.3, f.w * 0.3), sy = lk.y - rnd(f.h * 0.2, f.h * 0.7);
          add('smoke', sx, sy, rnd(0.2, 0.9), rnd(-2.6, -1.4), rnd(1, 1.8), rnd(1.4, 2.4), [0.13, 0.12, 0.13], 0, rnd(-1, 1));
          if (dmg > 0.55) { add('fire', sx, sy + 0.4, rnd(-0.4, 0.4), rnd(-3, -1.6), rnd(0.35, 0.6), rnd(0.8, 1.5), [1, 0.56, 0.16]); if (Math.random() < 0.3) lamp(sx, sy, 6, [1, 0.55, 0.2], 1.1, 0.3); }
        }
        return;
      }
      if (!lk.st) return;
      var at = px(u.px + (u.x - u.px) * tk, u.py + (u.y - u.py) * tk);
      var mdx = at[0] - lk.x, mdy = at[1] - lk.y, moved = Math.sqrt(mdx * mdx + mdy * mdy);
      if (lk.falling) moved = 0;
      if (!lk.falling) { lk.x = at[0]; lk.y = at[1]; }
      if (Math.abs(mdx) > 0.015 && !lk.st.atk && clock > lk.lastAtk + 0.5 && !lk.falling) lk.dir = mdx > 0 ? 1 : -1;
      lk.f += (lk.dir - lk.f) * Math.min(1, dt * 11);
      if (Math.abs(lk.f) < 0.12) lk.f = lk.f < 0 ? -0.12 : 0.12;
      // Recul amorti après un coup
      lk.kvx += (-lk.kx * 70 - lk.kvx * 11) * dt; lk.kvy += (-lk.ky * 70 - lk.kvy * 11) * dt;
      lk.kx += lk.kvx * dt; lk.ky += lk.kvy * dt;
      var st = lk.st, goal = (clock < lk.readyUntil || st.atk) ? 1 : 0;
      if (lk.roll > 0) lk.roll = Math.max(0, lk.roll - dt / 0.42);
      st.dodging = u.dodgeUntil > eng.ticks;
      st.ready += (goal - st.ready) * Math.min(1, dt * 5);
      var sc = lk.s / 140 * depth(lk.y);
      GVR.update(st, dt, moved / sc);
      // Pas : poussière, éclaboussures, braises selon le sol
      if (st.footfall && moved > 0.001) {
        var g = unpx(lk.x, lk.y), kd = GVM.kindAt(opts.map, g[0], g[1]);
        if (kd === 'water' || kd === 'bog') { add('ring', lk.x, lk.y + 0.1, 0, 0, 0.5, 2.2, kd === 'bog' ? [0.6, 0.85, 0.7] : [0.8, 0.95, 1]); for (var w0 = 0; w0 < 3; w0++) add('ember', lk.x, lk.y, rnd(-2, 2), rnd(-4, -2), 0.3, 0.2, [0.8, 0.95, 1], 18); }
        else if (kd === 'lava') { for (var w1 = 0; w1 < 3; w1++) add('ember', lk.x, lk.y, rnd(-1.5, 1.5), rnd(-4, -1.5), 0.5, 0.26, [1, 0.6, 0.2], 6); }
        else if (kd === 'acid') add('ring', lk.x, lk.y + 0.1, 0, 0, 0.4, 1.8, [0.8, 1, 0.3]);
        else if (kd !== 'cover') dust(lk.x, lk.y, [0.68, 0.62, 0.52], 1, 0.75);
      }
      // Trace de l'arme pendant la frappe
      if (st.atk && lk.pup.rig.wform && !lk.pup.rig.held && GVR.PROFILES[st.atk].keys.length && st.atkT > 0.26 && st.atkT < 0.72 && st.atk !== 'CAST') {
        var tp = boneAt(lk, 'weapon', 0, -lk.pup.rig.ws * 0.72 / lk.pup.rig.bones[lk.pup.rig.index.weapon].k), bs = boneAt(lk, 'weapon', 0, -lk.pup.rig.ws * 0.26 / lk.pup.rig.bones[lk.pup.rig.index.weapon].k);
        lk.trail.push({ tx: tp[0], ty: tp[1], bx: bs[0], by: bs[1], t: clock });
        if (lk.trail.length > 12) lk.trail.shift();
      } else if (lk.trail.length && clock - lk.trail[lk.trail.length - 1].t > 0.18) lk.trail.length = 0;
      // Mort : au sol quelques instants, puis le verre cède
      if (lk.falling && st.fall >= 1) {
        lk.lie += dt;
        if (lk.lie > 0.12) breakUp(u, lk, u.kind === 'monster' ? 0.9 : 0.75);
      }
    }
    function drawProps(shadow, dt) {
      props.forEach(function (p) {
        if (!p.spr) return;
        var s = p.spr, k = p.s, sw = p.sway ? Math.sin(clock * 1.3 + p.ph) * 0.02 * p.sway + Math.sin(clock * 2.9 + p.ph * 2) * 0.008 * p.sway : 0;
        var x0 = s.x0 * k, x1 = s.x1 * k, y0 = s.y0 * k, y1 = s.y1 * k;
        var top = sw * k;
        if (shadow) {
          G.quad(s, p.x + x0 - y0 * SHX + top, p.y - y0 * SHY, p.x + x1 - y0 * SHX + top, p.y - y0 * SHY, p.x + x1 - y1 * SHX, p.y - y1 * SHY, p.x + x0 - y1 * SHX, p.y - y1 * SHY, 1, 0, 1, 0, 0, 0, 0.3, 0, 3);
        }
      });
      void dt;
    }
    function drawProp(p) {
      var s = p.spr, k = p.s, sw = p.sway ? Math.sin(clock * 1.3 + p.ph) * 0.02 * p.sway + Math.sin(clock * 2.9 + p.ph * 2) * 0.008 * p.sway : 0;
      var top = sw * k, x0 = s.x0 * k, x1 = s.x1 * k, y0 = s.y0 * k, y1 = s.y1 * k;
      G.quad(s, p.x + x0 + top, p.y + y0, p.x + x1 + top, p.y + y0, p.x + x1, p.y + y1, p.x + x0, p.y + y1, 1, 0, 1, 1, 1, 1, p.a, 0, 0);
      if (p.glow) {
        var c = rgb(p.glow.charAt(0) === '#' ? p.glow : '#ffd75a');
        Q(fxs.soft, p.x, p.y - k * 0.5, k * 1.1, k * 1.1, 0, c[0], c[1], c[2], 0.3 + 0.12 * Math.sin(clock * 2 + p.ph), 2);
      }
    }
    function propFade(dt) {
      props.forEach(function (p) {
        var target = 1;
        for (var i = 0; i < eng.units.length; i++) {
          var u = eng.units[i], l = looks[u.idx];
          if (!l || !u.alive || u.fort) continue;
          if (l.y < p.y && l.y > p.y - p.s * 1.05 && Math.abs(l.x - p.x) < p.s * 0.5) { target = 0.42; break; }
        }
        p.a += (target - p.a) * Math.min(1, dt * 7);
      });
    }
    function stepDebris(dt) {
      for (var i = debris.length - 1; i >= 0; i--) {
        var d = debris[i];
        d.age += dt;
        if (d.age > d.life) { debris.splice(i, 1); continue; }
        if (!d.rest) {
          d.vh -= 26 * dt;
          d.h += d.vh * dt;
          d.x += d.vx * dt; d.y += d.vy * dt;
          d.a += d.vr * dt;
          if (d.h <= 0.02) {
            d.h = 0.02;
            if (d.vh < -2.5) { d.vh *= -0.34; d.vx *= 0.55; d.vy *= 0.55; d.vr *= 0.5; if (Math.random() < 0.3) add('spark', d.x, d.y, rnd(-3, 3), rnd(-4, -1), 0.2, 0.5, [1, 1, 1], 14); }
            else { d.rest = true; d.vh = 0; d.a = Math.round(d.a / Math.PI) * Math.PI + (d.a % 0.6) * 0.8 + Math.PI / 2; }
          }
        }
      }
    }
    function drawDebris(shadow) {
      for (var i = 0; i < debris.length; i++) {
        var d = debris[i], s = d.spr, k = d.k, c = Math.cos(d.a), sn = Math.sin(d.a), f = d.f;
        var al = d.age > d.life - 0.5 ? (d.life - d.age) / 0.5 : 1;
        var x0 = s.x0 * k, x1 = s.x1 * k, y0 = s.y0 * k, y1 = s.y1 * k;
        var ax = x0 * c - y0 * sn, ay = x0 * sn + y0 * c, bx = x1 * c - y0 * sn, by = x1 * sn + y0 * c, cx = x1 * c - y1 * sn, cy = x1 * sn + y1 * c, dx = x0 * c - y1 * sn, dy = x0 * sn + y1 * c;
        if (shadow) {
          if (d.h > 3) continue;
          G.quad(s, d.x + f * ax + d.h * SHX, d.y + ay * 0.25, d.x + f * bx + d.h * SHX, d.y + by * 0.25, d.x + f * cx + d.h * SHX, d.y + cy * 0.25, d.x + f * dx + d.h * SHX, d.y + dy * 0.25, 1, 0, 1, 0, 0, 0, 0.3 * al, 0, 3);
        } else {
          var hy = d.y - d.h;
          G.quad(s, d.x + f * ax, hy + ay, d.x + f * bx, hy + by, d.x + f * cx, hy + cy, d.x + f * dx, hy + dy, c, sn, f >= 0 ? 1 : -1, 1, 1, 1, al, 0, 0);
        }
      }
    }
    function drawDecals() {
      for (var i = 0; i < decals.length; i++) {
        var d = decals[i];
        var isShard = d.spr !== fxs.soft;
        if (isShard) {
          if (d.spr === fxs.arrow || d.spr === fxs.bolt) { Q(d.spr, d.x, d.y, d.s, d.s * 0.17, d.ang, 1, 1, 1, 0.85, 1); continue; }
          // Éclat au sol : éclairé pour scintiller quand la lumière passe
          var c = Math.cos(d.ang), s = Math.sin(d.ang), hw = d.s / 2, hh = d.s * 0.3;
          var ax = c * hw, ay = s * hw * 0.5, bx = -s * hh, by = c * hh * 0.5;
          G.quad(d.spr, d.x - ax - bx, d.y - ay - by, d.x + ax - bx, d.y + ay - by, d.x + ax + bx, d.y + ay + by, d.x - ax + bx, d.y - ay + by, 1, 0, 1, d.r, d.g, d.b, d.a, 0, 0);
        } else Q(d.spr, d.x, d.y, d.s, d.s * 0.5, 0, d.r, d.g, d.b, d.a, 1);
      }
    }
    function stepProjectiles(dt) {
      for (var i = projs.length - 1; i >= 0; i--) {
        var p = projs[i];
        p.age += dt;
        var k = p.age / p.dur;
        if (k >= 1) { projs.splice(i, 1); landing(p); continue; }
        var x = p.x0 + (p.x1 - p.x0) * k, y = p.y0 + (p.y1 - p.y0) * k - Math.sin(k * Math.PI) * p.arc;
        var kn = Math.min(1, k + 0.02), xn = p.x0 + (p.x1 - p.x0) * kn, yn = p.y0 + (p.y1 - p.y0) * kn - Math.sin(kn * Math.PI) * p.arc;
        p.ang = Math.atan2(yn - y, xn - x); p.x = x; p.y = y;
        p.t -= dt;
        if (p.type === 'orb' && p.t <= 0) { p.t = 0.025; add('ember', x, y, rnd(-1, 1), rnd(-1, 1), 0.34, p.heavy ? 0.5 : 0.34, p.c); }
        if (p.heavy && p.t <= 0) { p.t = 0.09; add('ember', x, y, 0, 0, 0.25, 0.26, [1, 0.6, 0.2]); }
      }
    }
    function drawProjectiles() {
      for (var i = 0; i < projs.length; i++) {
        var p = projs[i];
        if (p.x === undefined) continue;
        if (p.type === 'orb') {
          var sz = p.heavy ? 2.4 : 1.6;
          Q(fxs.soft, p.x, p.y, sz * 1.5, sz * 1.5, 0, p.c[0], p.c[1], p.c[2], 0.7, 2);
          Q(fxs.soft, p.x, p.y, sz * 0.55, sz * 0.55, 0, 1, 1, 1, 0.9, 2);
        } else if (p.type === 'weapon' && p.spr) {
          var s = p.spr, k = p.k, a = p.upright ? p.ang + Math.PI / 2 : p.age * p.spin * (p.heavy ? 1 : 1);
          if (p.upright && s.y1 > 0) a = p.ang + Math.PI / 2;
          var c = Math.cos(a), sn = Math.sin(a), x0 = s.x0 * k, x1 = s.x1 * k, y0 = s.y0 * k, y1 = s.y1 * k;
          G.quad(s, p.x + x0 * c - y0 * sn, p.y + x0 * sn + y0 * c, p.x + x1 * c - y0 * sn, p.y + x1 * sn + y0 * c, p.x + x1 * c - y1 * sn, p.y + x1 * sn + y1 * c, p.x + x0 * c - y1 * sn, p.y + x0 * sn + y1 * c, c, sn, 1, 1, 1, 1, 1, 0, 0);
        } else if (fxs[p.type]) {
          var L = p.type === 'arrow' ? 2.7 : (p.type === 'bolt' ? 1.9 : (p.type === 'dart' ? 1.2 : 0.4));
          var HH = p.type === 'pellet' ? 0.4 : L * 16 / (p.type === 'arrow' ? 96 : (p.type === 'bolt' ? 64 : 48));
          // Traînée
          Q(fxs.spark, p.x - Math.cos(p.ang) * L * 0.8, p.y - Math.sin(p.ang) * L * 0.8, L * 1.4, HH * 0.5, p.ang, 1, 0.96, 0.82, 0.45, 2);
          Q(fxs[p.type], p.x, p.y, L, HH, p.ang, 1, 1, 1, 1, 1);
        }
      }
    }
    function drawParticles(t) {
      var keep = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.age += t;
        if (p.age >= p.life) continue;
        parts[keep++] = p;
        var k = p.age / p.life, c = p.c;
        if (p.k === 'link') {
          var tx = p.lt.x, ty = p.lt.y - p.lt.s * 0.5, mid = 1 - k;
          line(p.x0, p.y0, tx, ty, 0.5 * mid + 0.05, c[0], c[1], c[2], 0.9 * mid, 2);
          line(p.x0, p.y0, tx, ty, 0.14, 1, 1, 1, mid, 2);
          continue;
        }
        p.vy += p.grav * t;
        p.x += p.vx * t;
        p.y += p.vy * t;
        p.rot += p.spin * t;
        if (p.k === 'spark') {
          var vl = Math.sqrt(p.vx * p.vx + p.vy * p.vy), L = Math.min(2.2, p.size * (0.3 + vl * 0.09));
          Q(fxs.spark, p.x, p.y, L, 0.1 + p.size * 0.1, Math.atan2(p.vy, p.vx), c[0], c[1], c[2], 1 - k * k, 2);
        } else if (p.k === 'shard') {
          if (p.gy && p.y > p.gy && p.vy > 0) { if (p.vy > 6) { p.vy *= -0.3; p.vx *= 0.5; p.spin *= 0.4; } else { p.y = p.gy; p.vy = 0; p.vx *= 0.7; p.grav = 0; p.spin = 0; } }
          Q(fxs['sh' + (i % 4)], p.x, p.y, p.size, p.size, p.rot, c[0], c[1], c[2], Math.min(1, (1 - k) * 2.4), 1);
        } else if (p.k === 'smoke') {
          var grow = p.size * (0.7 + k * 1.1);
          p.vx *= 1 - t * 1.2; p.vy *= 1 - t * 1.2;
          Q(fxs.smoke, p.x, p.y, grow, grow, p.rot, c[0], c[1], c[2], Math.sin(k * 3.14) * 0.34, 1);
        } else if (p.k === 'ember') {
          Q(fxs.soft, p.x, p.y, p.size * 2, p.size * 2, 0, c[0], c[1], c[2], 1 - k, 2);
        } else if (p.k === 'fire') {
          var fg = p.size * (1 - k * 0.6);
          Q(fxs.soft, p.x, p.y, fg, fg * 1.5, 0, 1, 0.45 + (1 - k) * 0.4, 0.1, (1 - k) * 0.9, 2);
        } else if (p.k === 'ring') {
          var rr = p.size * (0.15 + 0.85 * (1 - (1 - k) * (1 - k)));
          Q(fxs.ring, p.x, p.y, rr, rr * 0.5, 0, c[0], c[1], c[2], 1 - k, 2);
        } else if (p.k === 'core') {
          var cz = p.size * (0.5 + k * 0.5);
          Q(fxs.soft, p.x, p.y, cz, cz, 0, c[0], c[1], c[2], 1 - k, 2);
          Q(fxs.soft, p.x, p.y, cz * 0.5, cz * 0.5, 0, 1, 1, 1, 1 - k, 2);
        }
      }
      parts.length = keep;
    }
    // Sélection, destinations et cibles
    function drawCommands(t) {
      var pulse = 0.72 + 0.28 * Math.sin(clock * 6 + performance.now() * 0.004);
      var pull = aim || (stick.id !== null && stick.m > 0 && !stick.stop ? { kind: 'move', dx: stick.dx, dy: stick.dy, m: stick.m, target: null } : null);
      if (pull) {
        var gx = 0, gy = 0, gn = 0, some = selIds().length > 0;
        eng.units.forEach(function (u) {
          var l = looks[u.idx];
          if (!l || !u.alive || u.team !== 0 || u.fort || (some && !selected[u.idx])) return;
          gx += l.x; gy += l.y; gn++;
        });
        if (gn) {
          gx /= gn; gy /= gn;
          var col = pull.kind === 'attack' ? [1, 0.36, 0.36] : (pull.kind === 'dodge' ? [0.45, 0.85, 1] : [0.5, 0.96, 0.56]);
          var aLen = pull.kind === 'dodge' ? 4.5 : 3 + 9 * pull.m, ax = gx + pull.dx * aLen, ay = gy + pull.dy * aLen;
          line(gx, gy, ax, ay, 0.26, col[0], col[1], col[2], 0.8, 2);
          line(ax, ay, ax - pull.dx * 1.5 - pull.dy, ay - pull.dy * 1.5 + pull.dx, 0.26, col[0], col[1], col[2], 0.8, 2);
          line(ax, ay, ax - pull.dx * 1.5 + pull.dy, ay - pull.dy * 1.5 - pull.dx, 0.26, col[0], col[1], col[2], 0.8, 2);
          var tgL = pull.target && pull.target.alive ? looks[pull.target.idx] : null;
          if (tgL) {
            line(gx, gy, tgL.x, tgL.y, 0.1, 1, 0.36, 0.36, 0.5, 2);
            Q(fxs.ring, tgL.x, tgL.y, tgL.s * 1.1, tgL.s * 0.4, 0, 1, 0.3, 0.3, pulse, 1);
          }
        }
      }
      eng.units.forEach(function (u) {
        var l = looks[u.idx];
        if (!l || !u.alive || !selected[u.idx]) return;
        var rw = l.s * 1.02 * depth(l.y);
        Q(fxs.ring, l.x, l.y, rw, rw * 0.36, 0, 1, 0.82, 0.25, pulse, 1);
        var top = l.y - l.s * 1.08 * depth(l.y) - Math.abs(Math.sin(performance.now() * 0.004)) * 0.35;
        line(l.x - 0.42, top - 0.5, l.x, top, 0.2, 1, 0.86, 0.36, 1, 1);
        line(l.x + 0.42, top - 0.5, l.x, top, 0.2, 1, 0.86, 0.36, 1, 1);
        if (u.cmd && u.cmd.t === 'move') {
          var m = px(u.cmd.x, u.cmd.y);
          line(l.x, l.y, m[0], m[1], 0.09, 0.5, 0.96, 0.56, 0.5, 2);
          Q(fxs.ring, m[0], m[1], 1.8, 0.7, 0, 0.4, 0.96, 0.5, 0.8, 1);
        } else if (u.cmd && u.cmd.t === 'attack' && eng.units[u.cmd.id] && eng.units[u.cmd.id].alive) {
          var tl = looks[u.cmd.id];
          line(l.x, l.y, tl.x, tl.y, 0.09, 1, 0.36, 0.36, 0.55, 2);
          Q(fxs.ring, tl.x, tl.y, tl.s * 0.95, tl.s * 0.34, 0, 1, 0.3, 0.3, pulse, 1);
        } else if (u.cmd && u.cmd.t === 'hold') {
          Q(fxs.ring, l.x, l.y, l.s * 0.6, l.s * 0.22, 0, 0.62, 0.9, 1, 0.6, 2);
        }
      });
      marks = marks.filter(function (mk) {
        mk.age += t;
        if (mk.age > 0.55) return false;
        var k = mk.age / 0.55, sz = 1 + k * 3.4;
        Q(fxs.ring, mk.x, mk.y, sz, sz * 0.4, 0, mk.c[0], mk.c[1], mk.c[2], 1 - k, 1);
        return true;
      });
    }
    function drawBeams(t) {
      beams = beams.filter(function (b) {
        b.age += t;
        var k = b.age / b.life;
        if (k >= 1) return false;
        var al = 1 - k, wd = b.w * (1 - k * 0.6);
        Q(fxs.beam, b.x, b.y - 22, wd * 0.7, 44, 0, b.c[0], b.c[1], b.c[2], al * 0.34, 2);
        Q(fxs.beam, b.x, b.y - 22, wd * 0.2, 44, 0, 1, 1, 1, al * 0.4, 2);
        Q(fxs.soft, b.x, b.y, wd * 1.3, wd * 0.5, 0, b.c[0], b.c[1], b.c[2], al * 0.4, 2);
        return true;
      });
    }
    function drawRays(time) {
      for (var i = 0; i < 7; i++) {
        var x = fieldW * (0.06 + i * 0.15) + Math.sin(time * 0.17 + i * 2) * 3, w = 8 + Math.sin(time * 0.3 + i) * 2.4;
        var a = 0.05 + 0.02 * Math.sin(time * 0.5 + i * 1.7);
        var c = 0.27, s = -0.0;
        void s;
        G.quad(fxs.beam, x, -2, x + w, -2, x + w - fieldH * c, fieldH + 2, x - fieldH * c, fieldH + 2, 1, 0, 1, env.sunC[0], env.sunC[1], env.sunC[2], a, 0, 2);
      }
    }
    var ambient = [], ambDef = AMBIENT[opts.map] || AMBIENT[0], ambCol = rgb(ambDef.c);
    var ambRand = GVB.rng32(GVB.hashStr('amb' + opts.map));
    for (var a0 = 0; a0 < ambDef.n * 2; a0++) ambient.push({ x: ambRand() * fieldW, y: ambRand() * fieldH, p: ambRand() * 6 });
    function drawAmbient(t, time) {
      for (var i = 0; i < ambient.length; i++) {
        var a = ambient[i];
        a.x += (ambDef.vx + Math.sin(time * 0.6 + a.p) * 0.25) * t;
        a.y += ambDef.vy * t;
        if (a.x > fieldW) a.x -= fieldW; if (a.x < 0) a.x += fieldW;
        if (a.y > fieldH) a.y -= fieldH; if (a.y < 0) a.y += fieldH;
        var al = 0.3 + 0.5 * Math.abs(Math.sin(time + a.p)), sz = ambDef.s * 2.2;
        Q(fxs.soft, a.x, a.y, sz, sz, 0, ambCol[0], ambCol[1], ambCol[2], al, 2);
      }
    }
    var lightList = [];
    function gatherLights(t, time) {
      lightList.length = 0;
      lamps = lamps.filter(function (l) { l.age += t; return l.age < l.life; });
      lamps.forEach(function (l) { var k = 1 - l.age / l.life; lightList.push({ x: l.x, y: l.y, z: l.z, r: l.r, cr: l.c[0], cg: l.c[1], cb: l.c[2], i: l.i * k }); });
      projs.forEach(function (p) { if (p.x !== undefined && (p.type === 'orb' || p.heavy)) lightList.push({ x: p.x, y: p.y, z: 1.2, r: p.heavy ? 8 : 6, cr: p.c[0], cg: p.c[1], cb: p.c[2], i: 1.3 }); });
      eng.units.forEach(function (u) {
        var l = looks[u.idx];
        if (!l || l.broken || !l.pup) return;
        if (u.hero) lightList.push({ x: l.x, y: l.y - 3, z: 2, r: 7, cr: 1, cg: 0.84, cb: 0.45, i: 0.55 });
        else if (l.pup.rig.index.orb !== undefined) { var o = boneAt(l, 'orb'), oc = rgb(RACE_GLASS[u.race]); lightList.push({ x: o[0], y: o[1], z: 1.4, r: 5, cr: oc[0], cg: oc[1], cb: oc[2], i: 0.8 }); }
      });
      lightList.sort(function (a, b) { return b.i * b.r - a.i * a.r; });
      fixedLights.slice().sort(function (a, b) { return Math.abs(a.x - cam.x) + Math.abs(a.y - cam.y) - Math.abs(b.x - cam.x) - Math.abs(b.y - cam.y); }).forEach(function (f, i) { if (lightList.length < 12) lightList.push({ x: f.x, y: f.y, z: f.z, r: f.r, cr: f.cr, cg: f.cg, cb: f.cb, i: f.i * (1 + f.flick * Math.sin(time * 5 + i * 3) * Math.sin(time * 2.3 + i)) }); });
      G.setLights(lightList.slice(0, 12), time);
    }

    // Interface au-dessus du verre
    function drawBar(x, y, u, w, a) {
      var r = Math.max(0, u.hp / u.maxHp);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(5,4,10,.85)';
      ctx.fillRect(x - w / 2 - 0.06, y - 0.06, w + 0.12, 0.5);
      ctx.fillStyle = u.team === opts.mine ? (r > 0.35 ? '#7fe08a' : '#ffd75a') : '#ff6a70';
      ctx.fillRect(x - w / 2, y, w * r, 0.38);
      ctx.globalAlpha = 1;
    }
    function drawTexts(t) {
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      texts = texts.filter(function (x) {
        x.age += t;
        if (x.age > 0.8) return false;
        var pop = x.age < 0.1 ? 0.7 + x.age * 3 : 1;
        ctx.font = '700 ' + ((x.big ? 1.5 : 1.1) * pop) + 'px Alegreya, Georgia, serif';
        ctx.globalAlpha = x.age > 0.5 ? (0.8 - x.age) / 0.3 : 1;
        ctx.strokeStyle = '#120e0a'; ctx.lineWidth = 0.32;
        ctx.strokeText(x.t, x.x, x.y - x.age * 2.6);
        ctx.fillStyle = x.color;
        ctx.fillText(x.t, x.x, x.y - x.age * 2.6);
        ctx.globalAlpha = 1;
        return true;
      });
    }

    var finished = false, raf = null, last = performance.now(), acc = 0, endTimer = 0, slow = 1, fpsAcc = 0, fpsN = 0, adaptAt = 0;
    var startAt = opts.startAt || Date.now() + 3000, lastSync = 0;
    buildPad();
    syncPad();
    var items = [];

    function frame(now) {
      if (finished) return;
      raf = requestAnimationFrame(frame);
      var t = Math.min(0.05, (now - last) / 1000), rawDt = (now - last) / 1000;
      last = now;
      fit();
      var wall = Date.now();
      var started = ready && wall >= startAt;
      if (!ready) { cd.textContent = '…'; return; }
      if (!started) cd.textContent = Math.ceil((startAt - wall) / 1000);
      else if (!intro.hidden) { intro.hidden = true; pad.classList.remove('wait'); }
      if (started) driveStick();

      var tk = 1;
      if (started && !eng.done && !paused) {
        if (opts.half !== null) {
          var want = Math.floor((wall - startAt) / 100);
          while (eng.ticks < want && !eng.done) eng.step();
          tk = ((wall - startAt) % 100) / 100;
        } else {
          acc += t * (opts.interactive ? (speedBoost ? 2 : 1) : 1.6) / eng.tick;
          while (acc >= 1 && !eng.done) { eng.step(); acc -= 1; }
          tk = Math.min(1, acc);
        }
        drainEvents();
      }
      if (eng.done) {
        drainEvents();
        endTimer += t;
        slow = 0.4;
        if (endTimer > 1.9) { finish(); return; }
      }
      // Moteur trop lent : on baisse d'abord la finesse, puis les effets les plus coûteux
      if (rawDt > 0 && document.visibilityState === 'visible' && started) {
        fpsAcc += rawDt; fpsN++;
        if (now > adaptAt && fpsN >= 40) {
          var fps = fpsN / fpsAcc;
          fpsAcc = 0; fpsN = 0;
          adaptAt = now + 1200;
          window.GV_LAST_FPS = fps;
          if (fps < 38 && isGL) {
            if (renderScale > 0.62) renderScale = Math.max(0.6, renderScale * 0.84);
            else { G.bloom = false; G.setLightLimit(5); }
          }
        }
      }
      var dtReal = t;
      if (hitStop > 0) { hitStop -= t; t = t * 0.3; }
      var dt = paused ? 0 : t * slow * (started ? animSpeed() : 1);
      clock += dt;
      for (var li = later.length - 1; li >= 0; li--) if (later[li].at <= clock) { var job = later[li]; later.splice(li, 1); job.fn(); }

      var ra = Math.round(eng.share(0) * 100), rb = Math.round(eng.share(1) * 100);
      hpa.style.width = ra + '%'; hpb.style.width = rb + '%';
      if (tactical && now - lastSync > 120) { syncPad(); lastSync = now; }

      updateCamera(dtReal, started);
      if (shake > 0) shake = Math.max(0, shake - dtReal * 2.4);
      aberr = Math.max(0, aberr - dtReal * 0.03);
      computeView();
      var time = now / 1000;

      for (var ui = 0; ui < eng.units.length; ui++) { var uu = eng.units[ui], ll = looks[uu.idx]; if (ll) stepUnit(uu, ll, tk, dt); }
      stepDebris(dt);
      stepProjectiles(dt);
      propFade(dtReal);
      gatherLights(dt, time);

      // Vues de loin : le plomb fin assombrirait les personnages, on compense leur éclat
      var pxRig = view.s * dpr * renderScale * 5 / 140;
      G.setEnv({ gain: 1.2 + 0.55 * Math.max(0, Math.min(1, (0.8 - pxRig) / 0.5)) });
      G.begin(cssW, cssH, view.s, view.ox, view.oy, bgCol);
      G.terrain();
      G.startSprites();
      drawDecals();
      // Ombres réelles : le squelette projeté au sol
      if (isGL) {
        G.shadowsOn();
        drawProps(true, dt);
        for (var si = 0; si < eng.units.length; si++) {
          var su = eng.units[si], sl = looks[su.idx];
          if (!sl || sl.broken) continue;
          if (su.fort) {
            var ff = FORT[su.fort], fs = sl.fortS;
            if (fs) { var fk = ff.w / 200, x0 = fs.x0 * fk, x1 = fs.x1 * fk, y0 = fs.y0 * fk, y1 = fs.y1 * fk; G.quad(fs, sl.x + x0 - y0 * SHX, sl.y - y0 * SHY, sl.x + x1 - y0 * SHX, sl.y - y0 * SHY, sl.x + x1 - y1 * SHX, sl.y - y1 * SHY, sl.x + x0 - y1 * SHX, sl.y - y1 * SHY, 1, 0, 1, 0, 0, 0, 0.34, 0, 3); }
          } else if (sl.st) drawPuppet(sl, true, 0.36);
        }
        drawDebris(true);
        G.shadowsOff();
      }
      // Ombre de contact, sous les pieds
      for (var ci = 0; ci < eng.units.length; ci++) {
        var cu = eng.units[ci], cl = looks[cu.idx];
        if (cl && !cl.broken && !cu.fort) { var cw0 = cl.s * 0.95 * depth(cl.y), fly0 = cl.pup && cl.pup.rig.fly ? 0.55 : 1; Q(fxs.soft, cl.x, cl.y + 0.05, cw0 * fly0, cw0 * 0.3 * fly0, 0, 0, 0, 0, 0.72, 1); }
      }
      drawDebris(false);
      // Tout ce qui se tient debout est trié de l'arrière vers l'avant
      items.length = 0;
      props.forEach(function (p) { if (p.spr) items.push({ y: p.y, p: p }); });
      eng.units.forEach(function (u) { var l = looks[u.idx]; if (l && !l.broken) items.push({ y: l.y, u: u, l: l }); });
      items.sort(function (a, b) { return a.y - b.y; });
      for (var it = 0; it < items.length; it++) {
        if (items[it].p) drawProp(items[it].p);
        else drawUnit(items[it].u, items[it].l);
      }
      drawCommands(dtReal);
      drawProjectiles();
      drawParticles(dt);
      drawBeams(dt);
      if (isGL) { drawRays(time); }
      drawAmbient(dtReal, time);

      var wv = [];
      waves = waves.filter(function (w) {
        w.age += dt;
        var k = w.age / w.life;
        if (k >= 1) return false;
        wv.push({ u: (w.x * view.s + view.ox) / cssW, v: 1 - (w.y * view.s + view.oy) / cssH, r: k * 0.42, a: w.amp * (1 - k) });
        return true;
      });
      G.end({ flash: [flash.c[0], flash.c[1], flash.c[2], flash.a], waves: wv, ab: aberr });
      if (flash.a > 0) flash.a = Math.max(0, flash.a - dtReal * 1.2);

      // Barres, noms et chiffres par-dessus le verre
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.ox, dpr * view.oy);
      eng.units.forEach(function (u) {
        var l = looks[u.idx];
        if (!l || l.broken || l.falling || !u.alive) return;
        if (u.fort) { var f = FORT[u.fort]; drawBar(l.x, l.y - f.h, u, f.w * 0.55, 1); return; }
        var top = l.y - l.s * 1.0 * depth(l.y);
        if (u.hero || selected[u.idx] || u.hp < u.maxHp * 0.995) drawBar(l.x, top, u, u.hero ? 4.4 : 3, 1);
        if (u.hero) {
          ctx.font = '700 1.25px Alegreya, Georgia, serif';
          ctx.textAlign = 'center';
          ctx.lineWidth = 0.28; ctx.strokeStyle = '#120e0a';
          ctx.strokeText(u.hero.name || '', l.x, top - 0.25);
          ctx.fillStyle = '#ffd75a';
          ctx.fillText(u.hero.name || '', l.x, top - 0.25);
        }
      });
      drawTexts(dtReal);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (lasso) {
        ctx.strokeStyle = '#ffd75a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.strokeRect(lasso.x0, lasso.y0, lasso.x1 - lasso.x0, lasso.y1 - lasso.y0);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,215,90,.12)';
        ctx.fillRect(lasso.x0, lasso.y0, lasso.x1 - lasso.x0, lasso.y1 - lasso.y0);
      }
      if (started && hintLeft > 0) {
        hintLeft -= dtReal;
        ctx.font = '700 15px Alegreya, Georgia, serif'; ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, hintLeft);
        ctx.lineWidth = 4; ctx.strokeStyle = '#05040a';
        var hintT = 'Pousse le stick, ou touche tes unités puis le sol';
        ctx.strokeText(hintT, cssW / 2, cssH * 0.3); ctx.fillStyle = '#ffe9a0'; ctx.fillText(hintT, cssW / 2, cssH * 0.3);
        ctx.globalAlpha = 1;
      }
      if (paused) {
        ctx.font = '26px "Uncial Antiqua", Georgia, serif'; ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = '#05040a';
        ctx.strokeText('Pause', cssW / 2, cssH * 0.14); ctx.fillStyle = '#ffd75a'; ctx.fillText('Pause', cssW / 2, cssH * 0.14);
      }
      drawMinimap();
      if (title) {
        title.age += dtReal;
        if (title.age > 1.5) title = null;
        else {
          var sc2 = title.age < 0.15 ? 0.6 + title.age * 2.7 : 1;
          ctx.font = (30 * sc2) + 'px "Uncial Antiqua", Georgia, serif';
          ctx.textAlign = 'center';
          ctx.globalAlpha = title.age > 1.1 ? (1.5 - title.age) / 0.4 : 1;
          ctx.lineWidth = 6; ctx.strokeStyle = '#05040a';
          ctx.strokeText(title.t, cssW / 2, cssH * 0.2);
          ctx.fillStyle = title.c;
          ctx.fillText(title.t, cssW / 2, cssH * 0.2);
          ctx.globalAlpha = 1;
        }
      }
      if (targeting) {
        ctx.font = '700 17px Alegreya, Georgia, serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4; ctx.strokeStyle = '#05040a';
        ctx.strokeText('Touche le terrain pour frapper', cssW / 2, 28);
        ctx.fillStyle = '#ffd75a';
        ctx.fillText('Touche le terrain pour frapper', cssW / 2, 28);
      }
    }

    function finishNow() {
      if (!intro.hidden) intro.hidden = true;
      while (!eng.done) eng.step();
      evIdx = eng.events.length;
      finish();
    }
    function finish() {
      if (finished) return;
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      intro.hidden = true;
      var mine = eng.units.filter(function (u) { return u.team === opts.mine && !u.fort; });
      var total = 0, cur = 0;
      mine.forEach(function (u) { total += u.maxHp; cur += Math.max(0, u.hp); });
      var ratio = total ? cur / total : 0;
      var won = eng.winner === opts.mine;
      var stars = !won ? 0 : (ratio >= 0.55 ? 3 : (ratio >= 0.25 ? 2 : 1));
      var summary = opts.onEnd({ winner: eng.winner, units: eng.units, stars: stars, map: opts.map });
      beep(won ? 660 : 180, 0.5, 0.08);
      pad.hidden = true;
      var starRow = opts.interactive && won ? '<div class="stars" aria-label="' + stars + ' étoiles sur 3">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= stars ? 'on' : '') + '"></i>'; }).join('') + '</div>' : '';
      box.querySelector('#res-slot').innerHTML = '<div class="result"><h2>' + (won ? 'Victoire' : 'Défaite') + '</h2>' + starRow + '<p>' + summary + '</p><button class="btn" id="close-b">Continuer</button></div>';
      box.querySelector('#close-b').addEventListener('click', function () { G.dispose(); box.remove(); opts.onClose(); });
    }
    if (window.GV_KEEP_FRAME) window.GV_DEBUG_VIEW = { eng: eng, looks: looks, view: view, cam: cam, sel: function () { return selIds(); } };
    raf = requestAnimationFrame(frame);
  }

  window.GVView = { play: play };
})();
