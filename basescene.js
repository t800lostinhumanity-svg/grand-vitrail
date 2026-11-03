// La base vivante : cases de verre, bâtiments, habitants, fumées, nuages et cycle du jour
(function () {
  var TW = 64, TH = 32, TOP = 76;
  var cv = null, ctx = null, model = null, onTile = null, raf = null, host = null;
  var ground = null, groundKey = '';
  var cssW = 0, cssH = 0, dpr = 1, scale = 1, ox = 0;
  var walkers = [], smoke = [], clouds = [], birds = [];

  function sx(x, y) { return (x - y) * TW / 2; }
  function sy(x, y) { return (x + y) * TH / 2 + TOP; }
  function worldSize() {
    var size = model.size;
    return { w: (size + 1) * TW, h: sy(size, size) + 58 };
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function m(v) { return Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }

  // Le sol est dessiné une seule fois : chaque case est une pièce de verre avec son reflet
  function paintGround() {
    var key = model.size + ':' + model.seed + ':' + cssW + ':' + cssH;
    if (key === groundKey && ground) return;
    groundKey = key;
    ground = document.createElement('canvas');
    ground.width = cv.width; ground.height = cv.height;
    var c = ground.getContext('2d');
    var rand = window.GVB.rng32(window.GVB.hashStr(model.seed));
    var size = model.size;
    c.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, 0);
    c.lineJoin = 'round';
    // Dalle flottante : côtés de pierre sombre
    c.fillStyle = '#2a1a10'; c.strokeStyle = '#120e0a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(sx(0, size), sy(0, size)); c.lineTo(sx(size, size), sy(size, size)); c.lineTo(sx(size, size), sy(size, size) + 20); c.lineTo(sx(0, size), sy(0, size) + 16); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#1b1008';
    c.beginPath(); c.moveTo(sx(size, size), sy(size, size)); c.lineTo(sx(size, 0), sy(size, 0)); c.lineTo(sx(size, 0), sy(size, 0) + 16); c.lineTo(sx(size, size), sy(size, size) + 20); c.closePath(); c.fill(); c.stroke();
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var base = model.palette[Math.floor(rand() * model.palette.length)];
      var a = sx(x, y), b = sy(x, y);
      var g = c.createLinearGradient(a - TW / 2, b, a + TW / 2, b + TH);
      var v = (rand() - 0.5) * 0.16;
      g.addColorStop(0, shade(base, v + 0.18));
      g.addColorStop(1, shade(base, v - 0.14));
      c.fillStyle = g;
      c.strokeStyle = '#120e0a'; c.lineWidth = 1.7;
      c.beginPath(); c.moveTo(a, b); c.lineTo(a + TW / 2, b + TH / 2); c.lineTo(a, b + TH); c.lineTo(a - TW / 2, b + TH / 2); c.closePath(); c.fill(); c.stroke();
      // Mosaïque : la case se découpe en éclats, chacun de sa nuance
      var mx0 = a + (rand() - 0.5) * TW * 0.16, my0 = b + TH / 2 + (rand() - 0.5) * TH * 0.16;
      var rim = [[a, b], [a + TW * 0.26, b + TH * 0.26], [a + TW / 2, b + TH / 2], [a + TW * 0.26, b + TH * 0.74], [a, b + TH], [a - TW * 0.26, b + TH * 0.74], [a - TW / 2, b + TH / 2], [a - TW * 0.26, b + TH * 0.26]];
      c.lineWidth = 0.6; c.strokeStyle = 'rgba(18,14,10,.42)';
      for (var rs = 0; rs < 8; rs++) {
        var r0 = rim[rs], r1 = rim[(rs + 1) % 8];
        c.fillStyle = shade(base, v + (rand() - 0.5) * 0.13 + (rs < 2 || rs > 5 ? 0.03 : -0.03));
        c.beginPath(); c.moveTo(mx0, my0); c.lineTo(r0[0], r0[1]); c.lineTo(r1[0], r1[1]); c.closePath(); c.fill(); c.stroke();
      }
      c.strokeStyle = '#120e0a'; c.lineWidth = 1.7;
      c.beginPath(); c.moveTo(a, b); c.lineTo(a + TW / 2, b + TH / 2); c.lineTo(a, b + TH); c.lineTo(a - TW / 2, b + TH / 2); c.closePath(); c.stroke();
      // Petites touches de vie sur la case : herbes et fleurs
      if (rand() < 0.75) {
        for (var tf = 0; tf < 5; tf++) {
          var tu = (rand() - 0.5) * 0.72, tv = (rand() - 0.5) * 0.72, tx0 = a + (tu - tv) * TW / 2, ty0 = b + TH / 2 + (tu + tv) * TH / 2;
          if (rand() < 0.3) { c.fillStyle = ['#ff8ad1', '#ffd75a', '#ffffff', '#8fb8ff'][Math.floor(rand() * 4)]; c.beginPath(); c.arc(tx0, ty0, 1.3, 0, 6.28); c.fill(); }
          else { c.strokeStyle = 'rgba(18,14,10,.55)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(tx0 - 1.6, ty0); c.lineTo(tx0 - 2, ty0 - 3); c.moveTo(tx0, ty0); c.lineTo(tx0, ty0 - 4); c.moveTo(tx0 + 1.6, ty0); c.lineTo(tx0 + 2.2, ty0 - 3); c.stroke(); }
        }
      }
      // Reflet du verre sur l'arête haute
      c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(a - TW / 2 + 5, b + TH / 2 - 1); c.lineTo(a, b + 3); c.lineTo(a + TW / 2 - 5, b + TH / 2 - 1); c.stroke();
      // Facette intérieure
      if (rand() < 0.5) {
        c.strokeStyle = 'rgba(18,14,10,.55)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(a - TW / 4 + rand() * 8, b + TH / 4); c.lineTo(a + TW / 4 - rand() * 8, b + TH * 0.75); c.stroke();
      }
    }
    // Racines de roche : l'île flotte au-dessus du vide
    c.strokeStyle = '#120e0a'; c.lineWidth = 1.6;
    for (var ri = 0; ri <= size * 2; ri++) {
      var k = ri / (size * 2), px0 = sx(0, size) + (sx(size, 0) - sx(0, size)) * k;
      var py0 = (k < 0.5 ? sy(0, size) + (sy(size, size) - sy(0, size)) * k * 2 : sy(size, size) + (sy(size, 0) - sy(size, size)) * (k - 0.5) * 2) + 15;
      var drop = 22 + rand() * 62 * Math.sin(k * 3.14);
      c.fillStyle = ri % 2 ? '#4a3628' : '#35261e';
      c.beginPath(); c.moveTo(px0 - 24, py0 - 2); c.lineTo(px0 + 24, py0 - 2); c.lineTo(px0 + 12, py0 + drop * 0.55); c.lineTo(px0 + (rand() - 0.5) * 8, py0 + drop); c.lineTo(px0 - 12, py0 + drop * 0.5); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,220,170,.16)';
      c.beginPath(); c.moveTo(px0 - 24, py0 - 2); c.lineTo(px0 - 4, py0 - 2); c.lineTo(px0 - 7, py0 + drop * 0.5); c.lineTo(px0 - 12, py0 + drop * 0.5); c.closePath(); c.fill();
      if (rand() < 0.3 && drop > 30) {
        var cry = model.palette[Math.floor(rand() * model.palette.length)], cx0 = px0 + (rand() - 0.5) * 14, cy0 = py0 + drop * 0.42;
        c.fillStyle = shade(cry, 0.42);
        c.beginPath(); c.moveTo(cx0 - 5, cy0); c.lineTo(cx0, cy0 - 3); c.lineTo(cx0, cy0 + 15); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = shade(cry, -0.05);
        c.beginPath(); c.moveTo(cx0 + 5, cy0); c.lineTo(cx0, cy0 - 3); c.lineTo(cx0, cy0 + 15); c.closePath(); c.fill(); c.stroke();
      }
    }
    try { window.GVG.polish(ground, Math.round(9 * dpr * scale), 0.9); } catch (e) { /* sol gardé sans éclairage */ }
  }

  function fit() {
    var r = host.getBoundingClientRect();
    if (r.width === cssW && r.height === cssH) return;
    cssW = r.width; cssH = r.height;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
    cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
    groundKey = '';
  }
  function layout() {
    var w = worldSize();
    scale = Math.min(cssW / w.w, cssH / w.h);
    ox = cssW / 2;
  }

  function nightFactor() {
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60 + (model.hourShift || 0);
    h = (h + 24) % 24;
    if (h >= 7.5 && h <= 18.5) return 0;
    if (h >= 21 || h <= 5) return 1;
    return h < 7.5 ? (7.5 - h) / 2.5 : (h - 18.5) / 2.5;
  }

  function spawnWalkers() {
    walkers = [];
    var n = Math.max(3, Math.min(14, Math.floor(model.population / 18)));
    for (var i = 0; i < n; i++) walkers.push(newWalker(i));
  }
  function newWalker(i) {
    var s = model.size;
    return { x: Math.random() * s, y: Math.random() * s, tx: Math.random() * s, ty: Math.random() * s, v: 0.28 + Math.random() * 0.3, c: ['#f5d7b5', '#ffd680', '#8fb8ff', '#ff8a8f', '#9af0c0'][i % 5], p: Math.random() * 6, seed: i + 1, pause: 0, uid: [0, 0, 1, 0, 4, 0, 8, 1, 0, 3][i % 10] };
  }

  // Les habitants sont de vraies marionnettes de leur peuple
  var folk = {};
  function folkOf(uid) {
    var key = model.race + ':' + uid + ':' + model.skin;
    if (folk[key] === undefined) {
      folk[key] = null;
      window.GVG.unit(model.race, uid, null, model.skin, 2).then(function (s) { folk[key] = s; });
    }
    return folk[key];
  }
  function drawWalker(w, t) {
    var dx = w.tx - w.x, dy = w.ty - w.y, d = Math.sqrt(dx * dx + dy * dy);
    var moved = 0;
    if (w.pause > 0) w.pause -= t;
    else if (d < 0.1) { w.tx = Math.random() * model.size; w.ty = Math.random() * model.size; if (Math.random() < 0.5) w.pause = 1 + Math.random() * 3; }
    else { w.x += dx / d * w.v * t; w.y += dy / d * w.v * t; w.p += t * 8; moved = w.v * t; }
    var a = sx(w.x, w.y), b = sy(w.x, w.y) + TH / 2;
    var f = folkOf(w.uid);
    if (f && window.GVR) {
      if (!w.st || w.st.rig !== f.rig) { w.st = window.GVR.state(f.rig, w.seed); w.st.rootX = 0; w.st.rootY = -f.rig.H; w.dir = 1; w.fl = 1; }
      var K = 0.26, sdx = sx(w.tx, w.ty) - a;
      if (Math.abs(sdx) > 1) w.dir = sdx > 0 ? 1 : -1;
      w.fl += (w.dir - w.fl) * Math.min(1, t * 9);
      window.GVR.update(w.st, t, moved * TW / K * 0.7);
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath(); ctx.ellipse(a + 2, b + 1, 8, 2.8, 0, 0, 6.28); ctx.fill();
      var sh = f.sheet, rig = f.rig, st = w.st, q2 = K / sh.ppu;
      ctx.save();
      ctx.translate(a, b);
      ctx.scale(Math.abs(w.fl) < 0.12 ? 0.12 : w.fl, 1);
      rig.order.forEach(function (i) {
        var bn = rig.bones[i], r = sh.rects[bn.part];
        if (!r) return;
        ctx.save();
        ctx.translate(st.x[i] * K, st.y[i] * K);
        ctx.rotate(st.ang[i]);
        ctx.scale(q2 * bn.k, q2 * bn.k);
        ctx.drawImage(sh.lit, r.x, r.y, r.w, r.h, -r.ox, -r.oy, r.w, r.h);
        ctx.restore();
      });
      ctx.restore();
      return;
    }
    b -= Math.abs(Math.sin(w.p)) * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(a, b + 1, 3, 1.3, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = w.c; ctx.strokeStyle = '#120e0a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(a - 2.6, b); ctx.lineTo(a + 2.6, b); ctx.lineTo(a, b - 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f5d7b5';
    ctx.beginPath(); ctx.arc(a, b - 8, 2.2, 0, 6.28); ctx.fill(); ctx.stroke();
  }

  // Ciel vivant derrière l'île : jour, couchant, nuit étoilée, montagnes lointaines
  var stars = [];
  function drawSky(now, night) {
    var g = ctx.createLinearGradient(0, 0, 0, cssH);
    var dayTop = [86, 150, 220], dayLow = [255, 214, 160], nightTop = [8, 8, 36], nightLow = [40, 28, 84];
    function mix(a, b) { return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * night) + ',' + Math.round(a[1] + (b[1] - a[1]) * night) + ',' + Math.round(a[2] + (b[2] - a[2]) * night) + ')'; }
    g.addColorStop(0, mix(dayTop, nightTop));
    g.addColorStop(1, mix(dayLow, nightLow));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cssW, cssH);
    if (!stars.length) for (var i = 0; i < 70; i++) stars.push({ x: Math.random(), y: Math.random() * 0.7, p: Math.random() * 6 });
    if (night > 0.05) {
      ctx.fillStyle = '#ffffff';
      stars.forEach(function (st) {
        ctx.globalAlpha = night * (0.4 + 0.6 * Math.abs(Math.sin(now * 0.001 + st.p)));
        ctx.fillRect(st.x * cssW, st.y * cssH, 1.5, 1.5);
      });
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,250,220,' + night + ')';
      ctx.beginPath(); ctx.arc(cssW * 0.82, cssH * 0.16, 15, 0, 6.28); ctx.fill();
    }
    // Soleil et rayons
    if (night < 0.9) {
      var sunA = 1 - night;
      var sg = ctx.createRadialGradient(cssW * 0.16, cssH * 0.14, 0, cssW * 0.16, cssH * 0.14, cssW * 0.55);
      sg.addColorStop(0, 'rgba(255,245,200,' + (0.9 * sunA) + ')');
      sg.addColorStop(0.2, 'rgba(255,225,150,' + (0.35 * sunA) + ')');
      sg.addColorStop(1, 'rgba(255,225,150,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, cssW, cssH);
    }
    // Montagnes lointaines en deux plans
    [[0.62, 0.34, night ? 'rgba(30,24,70,.85)' : 'rgba(110,130,190,.5)', 5], [0.72, 0.5, night ? 'rgba(20,16,50,.95)' : 'rgba(80,100,160,.6)', 8]].forEach(function (lay) {
      ctx.fillStyle = lay[2];
      ctx.beginPath();
      ctx.moveTo(0, cssH);
      for (var m = 0; m <= 10; m++) {
        var mx = m / 10 * cssW, my = cssH * lay[0] - Math.abs(Math.sin(m * lay[3] * 0.7)) * cssH * lay[1] * 0.42;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(cssW, cssH);
      ctx.closePath();
      ctx.fill();
    });
    // Nuages en verre dépoli qui dérivent
    ctx.fillStyle = 'rgba(255,255,255,' + (0.26 - 0.18 * night) + ')';
    for (var c = 0; c < 4; c++) {
      var cx = ((now * (0.006 + c * 0.003) + c * 260) % (cssW + 160)) - 80, cy = cssH * (0.12 + c * 0.13);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 58 - c * 6, 13, 0, 0, 6.28);
      ctx.ellipse(cx + 26, cy - 7, 30, 10, 0, 0, 6.28);
      ctx.fill();
    }
  }

  function draw(now, t) {
    var size = model.size, night = nightFactor();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawSky(now, night);
    // Îlots lointains qui flottent lentement
    [[0.1, 0.5, 26, 0.9], [0.9, 0.44, 20, 1.4], [0.2, 0.84, 16, 2], [0.84, 0.8, 24, 2.7]].forEach(function (l) {
      var ix = l[0] * cssW, iy = l[1] * cssH + Math.sin(now * 0.0005 + l[3]) * 5, ir = l[2];
      ctx.fillStyle = night ? '#1a1630' : '#6f5a4a'; ctx.strokeStyle = '#120e0a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ix - ir, iy); ctx.lineTo(ix + ir, iy); ctx.lineTo(ix + ir * 0.4, iy + ir * 0.8); ctx.lineTo(ix - ir * 0.1, iy + ir * 1.2); ctx.lineTo(ix - ir * 0.6, iy + ir * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = night ? '#2c3a50' : model.palette[0];
      ctx.beginPath(); ctx.moveTo(ix - ir, iy); ctx.lineTo(ix - ir * 0.3, iy - ir * 0.22); ctx.lineTo(ix + ir * 0.5, iy - ir * 0.18); ctx.lineTo(ix + ir, iy); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    if (ground) ctx.drawImage(ground, 0, 0, cssW, cssH);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, 0);
    // Cascade qui tombe du bord de l'île
    var wfx = sx(size, size * 0.45) - 8, wfy = sy(size, size * 0.45) + TH * 0.6, wfh = 170;
    var wfg = ctx.createLinearGradient(0, wfy, 0, wfy + wfh);
    wfg.addColorStop(0, 'rgba(170,225,255,.92)'); wfg.addColorStop(0.7, 'rgba(170,225,255,.5)'); wfg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wfg;
    ctx.beginPath(); ctx.moveTo(wfx - 6, wfy); ctx.lineTo(wfx + 6, wfy); ctx.lineTo(wfx + 11, wfy + wfh); ctx.lineTo(wfx - 11, wfy + wfh); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (var wd = 0; wd < 9; wd++) { var wk = ((now * 0.0006 + wd * 0.11) % 1), wy0 = wfy + wk * wfh; ctx.fillRect(wfx - 5 + ((wd * 37) % 10), wy0, 1.4, 7 + wk * 12); }

    // Case choisie et cases libres en déplacement
    function outline(x, y, color, w) {
      var a = sx(x, y), b = sy(x, y);
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(a + TW / 2, b + TH / 2); ctx.lineTo(a, b + TH); ctx.lineTo(a - TW / 2, b + TH / 2); ctx.closePath(); ctx.stroke();
    }
    if (model.moving) model.free.forEach(function (k) { var p = k.split(','); outline(+p[0], +p[1], 'rgba(255,255,255,.75)', 2); });
    if (model.selected) {
      var sp = model.selected.split(',');
      outline(+sp[0], +sp[1], 'rgba(255,215,90,' + (0.65 + 0.35 * Math.sin(now * 0.005)) + ')', 3.5);
    }

    // Objets et habitants, triés du fond vers l'avant
    var items = [];
    model.objects.forEach(function (o) { items.push({ d: o.x + o.y, o: o }); });
    walkers.forEach(function (w) { items.push({ d: w.x + w.y - 0.5, w: w }); });
    items.sort(function (a, b) { return a.d - b.d; });
    var glows = [];
    items.forEach(function (it) {
      if (it.w) { drawWalker(it.w, t); return; }
      var o = it.o, img = window.GVG.get(o.key), cx = sx(o.x, o.y), cy = sy(o.x, o.y) + TH / 2;
      if (o.born && now - o.born < 500) { var pop = (now - o.born) / 500; ctx.save(); ctx.translate(cx, cy); ctx.scale(pop, 0.4 + pop * 0.6); ctx.translate(-cx, -cy); o._popped = true; }
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, o.w * 0.38, o.w * 0.14, 0, 0, 6.28); ctx.fill();
      if (img && img.shadow) {
        ctx.save();
        ctx.globalAlpha = 0.3 * (1 - night * 0.7);
        ctx.transform(1, 0, -0.62, 0.34, cx, cy);
        ctx.drawImage(img.shadow, -o.w / 2, -o.h * o.foot, o.w, o.h);
        ctx.restore();
      }
      if (img) ctx.drawImage(img, cx - o.w / 2, cy - o.h * o.foot, o.w, o.h);
      if (o._popped) { ctx.restore(); o._popped = false; }
      if (o.job) {
        // Échafaudage et barre d'avancement
        ctx.strokeStyle = '#6e3f17'; ctx.lineWidth = 2;
        for (var s = -1; s <= 1; s += 2) {
          ctx.beginPath(); ctx.moveTo(cx + s * o.w * 0.36, cy + 2); ctx.lineTo(cx + s * o.w * 0.36, cy - o.h * 0.72); ctx.stroke();
        }
        ctx.beginPath(); ctx.moveTo(cx - o.w * 0.4, cy - o.h * 0.36); ctx.lineTo(cx + o.w * 0.4, cy - o.h * 0.36); ctx.moveTo(cx - o.w * 0.4, cy - o.h * 0.66); ctx.lineTo(cx + o.w * 0.4, cy - o.h * 0.66); ctx.stroke();
        var pct = Math.max(0, Math.min(1, (Date.now() - o.job.start) / (o.job.until - o.job.start)));
        ctx.fillStyle = '#120e0a'; ctx.fillRect(cx - 20, cy - o.h * 0.88, 40, 6);
        ctx.fillStyle = '#ffd75a'; ctx.fillRect(cx - 19, cy - o.h * 0.88 + 1, 38 * pct, 4);
        if (Math.random() < t * 5) smoke.push({ x: cx + (Math.random() - 0.5) * 20, y: cy - 6, age: 0, life: 0.5, r: 1.6, spark: true });
      }
      if (o.level !== undefined && !o.job) {
        ctx.fillStyle = '#120e0a'; ctx.strokeStyle = '#ffd75a'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx + 22, cy + 2, 7, 0, 6.28); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.font = '700 10px Alegreya, Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText(o.level, cx + 22, cy + 5.5);
      }
      if (o.smoke && !o.job && Math.random() < t * 2.2) smoke.push({ x: cx + o.w * 0.2, y: cy - o.h * 0.72, age: 0, life: 2 + Math.random(), r: 2.4 });
      if (o.lit || !o.decor) glows.push({ x: cx, y: cy - o.h * 0.35, r: o.w * 0.55 });
    });

    // Fumée et étincelles
    smoke = smoke.filter(function (s) {
      s.age += t;
      if (s.age >= s.life) return false;
      var k = s.age / s.life;
      if (s.spark) {
        ctx.fillStyle = 'rgba(255,215,90,' + (1 - k) + ')';
        ctx.fillRect(s.x, s.y - k * 12, 1.8, 1.8);
      } else {
        ctx.fillStyle = 'rgba(190,190,205,' + (0.42 * (1 - k)) + ')';
        ctx.beginPath(); ctx.arc(s.x + Math.sin(k * 5) * 3, s.y - k * 34, s.r + k * 6, 0, 6.28); ctx.fill();
      }
      return true;
    });

    // Ombres de nuages
    var w = worldSize();
    if (!clouds.length) for (var i = 0; i < 3; i++) clouds.push({ x: -w.w / 2 + Math.random() * w.w, y: 60 + Math.random() * (w.h - 80), r: 46 + Math.random() * 40, v: 3 + Math.random() * 4 });
    ctx.fillStyle = 'rgba(10,8,30,.13)';
    clouds.forEach(function (c) {
      c.x += c.v * t;
      if (c.x - c.r > w.w / 2) c.x = -w.w / 2 - c.r;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r, c.r * 0.42, 0, 0, 6.28); ctx.fill();
    });

    // Oiseaux
    if (Math.random() < t * 0.06 && birds.length < 4 && night < 0.5) birds.push({ x: -w.w / 2, y: 20 + Math.random() * 50, v: 22 + Math.random() * 12, p: Math.random() * 6 });
    ctx.strokeStyle = '#120e0a'; ctx.lineWidth = 1.3;
    birds = birds.filter(function (b) {
      b.x += b.v * t; b.p += t * 9;
      var f = Math.sin(b.p) * 3;
      ctx.beginPath(); ctx.moveTo(b.x - 5, b.y - f); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + 5, b.y - f); ctx.stroke();
      return b.x < w.w / 2;
    });

    // Lucioles la nuit, papillons le jour
    for (var bf = 0; bf < 12; bf++) {
      var bfx = sx(0, size) + (sx(size, 0) - sx(0, size)) * ((bf * 0.37 + Math.sin(now * 0.00017 + bf) * 0.2 + 0.3) % 1), bfy = sy(size / 2, size / 2) * (0.5 + ((bf * 0.61) % 0.8)) + Math.sin(now * 0.0011 + bf * 2) * 8;
      if (night > 0.3) { ctx.fillStyle = 'rgba(220,255,140,' + (0.5 + 0.5 * Math.sin(now * 0.004 + bf * 3)) * night + ')'; ctx.beginPath(); ctx.arc(bfx, bfy, 1.5, 0, 6.28); ctx.fill(); }
      else if (bf % 3 === 0) { var fl0 = Math.abs(Math.sin(now * 0.014 + bf)) * 2.6 + 0.4; ctx.fillStyle = ['#ff8ad1', '#ffd75a', '#8fb8ff', '#ffffff'][bf / 3 % 4]; ctx.beginPath(); ctx.ellipse(bfx - fl0, bfy, fl0, 1.8, 0, 0, 6.28); ctx.ellipse(bfx + fl0, bfy, fl0, 1.8, 0, 0, 6.28); ctx.fill(); }
    }
    // Rayons du soleil sur l'île
    if (night < 0.8) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      for (var ry = 0; ry < 4; ry++) {
        var ang0 = 0.5 + ry * 0.28 + Math.sin(now * 0.00018 + ry) * 0.05, len = cssW * 1.2, rx0 = cssW * 0.16, ry0 = cssH * 0.14;
        var rg0 = ctx.createLinearGradient(rx0, ry0, rx0 + Math.cos(ang0) * len, ry0 + Math.sin(ang0) * len);
        rg0.addColorStop(0, 'rgba(255,240,190,' + (0.055 * (1 - night)) + ')'); rg0.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = rg0;
        ctx.beginPath(); ctx.moveTo(rx0, ry0); ctx.lineTo(rx0 + Math.cos(ang0 - 0.09) * len, ry0 + Math.sin(ang0 - 0.09) * len); ctx.lineTo(rx0 + Math.cos(ang0 + 0.09) * len, ry0 + Math.sin(ang0 + 0.09) * len); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, 0);
    }
    // La nuit tombe : tout s'assombrit, les fenêtres s'allument
    if (night > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(12,14,52,' + (0.5 * night) + ')';
      ctx.fillRect(0, 0, cssW, cssH);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, 0);
      ctx.globalCompositeOperation = 'lighter';
      glows.forEach(function (g) {
        var rg = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
        rg.addColorStop(0, 'rgba(255,190,90,' + (0.55 * night) + ')');
        rg.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.28); ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  var last = 0;
  function loop(now) {
    raf = null;
    if (!cv || !cv.isConnected || document.getElementById('battle')) { if (cv && cv.isConnected) raf = requestAnimationFrame(loop); return; }
    var t = Math.min(0.05, (now - last) / 1000);
    last = now;
    fit();
    layout();
    paintGround();
    draw(now, t);
    raf = requestAnimationFrame(loop);
  }

  function pick(clientX, clientY) {
    var r = cv.getBoundingClientRect();
    var a = (clientX - r.left - ox) / scale, b = (clientY - r.top) / scale;
    // D'abord les bâtiments, de l'avant vers le fond
    var list = model.objects.slice().sort(function (p, q) { return (q.x + q.y) - (p.x + p.y); });
    for (var i = 0; i < list.length; i++) {
      var o = list[i], cx = sx(o.x, o.y), cy = sy(o.x, o.y) + TH / 2;
      if (Math.abs(a - cx) < o.w * 0.34 && b < cy + 6 && b > cy - o.h * 0.8) return o.x + ',' + o.y;
    }
    var u = a / (TW / 2), v = (b - TOP) / (TH / 2);
    var x = Math.floor((u + v) / 2), y = Math.floor((v - u) / 2);
    if (x >= 0 && y >= 0 && x < model.size && y < model.size) return x + ',' + y;
    return null;
  }

  function attach(el, m, handler) {
    var firstTime = !model || model.seed !== m.seed;
    var grew = model && model.size !== m.size;
    model = m; onTile = handler; host = el;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      cv.addEventListener('click', function (e) {
        var k = pick(e.clientX, e.clientY);
        if (k && onTile) onTile(k);
      });
      ctx = cv.getContext('2d');
    }
    el.appendChild(cv);
    cssW = 0; cssH = 0;
    if (firstTime || grew || !walkers.length) spawnWalkers();
    if (grew) groundKey = '';
    var GVG = window.GVG;
    m.objects.forEach(function (o) {
      if (o.decor) GVG.decor(o.sym);
      else GVG.building(o.sym, o.orn, o.cls);
    });
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }

  window.GVBase = { attach: attach };
})();
