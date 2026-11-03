// Atelier graphique : transforme les dessins vectoriels en images de verre en relief, prêtes à animer
(function () {
  var CSS = '.pp{stroke:#120e0a;stroke-width:1.7;stroke-linejoin:round;stroke-linecap:round}.q{stroke:#120e0a;stroke-width:0.9;stroke-linejoin:round;stroke-linecap:round}.p{stroke:#120e0a;stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.g{fill:var(--g)}.d{fill:var(--d)}.l{fill:var(--l)}.sk{fill:var(--sk)}.hr{fill:var(--hr)}.m{fill:#dcecfb}.md{fill:#8fa9c4}.w{fill:#a8662a}.wd{fill:#6e3f17}.b{fill:#efe8d0}.k{fill:#120e0a}.y{fill:#ffd75a}.s{fill:#b4b8d2}.sd{fill:#6f7396}.n{fill:none}.lg{fill:none;stroke:#120e0a;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}' +
    '.bow{fill:none;stroke:#8a4f24;stroke-width:7;stroke-linecap:round}' +
    '.r1{--g:#2f6bff;--d:#163a9e;--l:#8fb8ff;--sk:#f5d7b5;--hr:#6e3f17}.r2{--g:#f0a020;--d:#a05a0a;--l:#ffd680;--sk:#e8b890;--hr:#e8561a}.r3{--g:#1fc46f;--d:#0c7a45;--l:#9af0c0;--sk:#f7e8cf;--hr:#e8eef2}.r4{--g:#e0263c;--d:#8c1024;--l:#ff8a8f;--sk:#7fb43a;--hr:#1c1724}.r5{--g:#16c7c0;--d:#0b7c80;--l:#9ff3ea;--sk:#6fa8a0;--hr:#2f4d55}.r6{--g:#c6d92a;--d:#7d8c12;--l:#f0f59a;--sk:#a6c43a;--hr:#5a3a1c}.r7{--g:#9a4dff;--d:#55209e;--l:#d2aaff;--sk:#e5e2cf;--hr:#1c1724}.r8{--g:#ff6a1a;--d:#a83506;--l:#ffc080;--sk:#c9541a;--hr:#ffd75a}' +
    '.sk0{--g:#ff8ad1;--d:#b03c86;--l:#ffd0ec}.sk1{--g:#9fe6ff;--d:#3f8fc0;--l:#eafaff}.sk2{--g:#3fae4a;--d:#1c6a2a;--l:#a9e88a}.sk3{--g:#b5121f;--d:#5f0812;--l:#ffd75a}.sk4{--g:#2a2740;--d:#14121f;--l:#8d86c9}.sk5{--g:#f2c531;--d:#a97c14;--l:#fff3b0}.sk6{--g:#efeaf7;--d:#a9a2c4;--l:#ffffff}.sk7{--g:#ff3d7f;--d:#5a1fb0;--l:#ffb02e}';

  // Donne du volume à chaque pièce de verre : le plomb sépare les pièces, chacune est bombée puis éclairée.
  function polish(canvas, radius, strength) {
    var w = canvas.width, h = canvas.height, c = canvas.getContext('2d');
    var im = c.getImageData(0, 0, w, h), px = im.data, n = w * h;
    var R = radius || 9, K = strength === undefined ? 1 : strength;
    var d = new Float32Array(n), i, x, y;
    for (i = 0; i < n; i++) {
      var a = px[i * 4 + 3], lum = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
      d[i] = (a < 110 || lum < 42) ? 0 : 1e6;
    }
    // Distance au plomb le plus proche (deux passages)
    for (y = 1; y < h; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x;
      if (d[i] === 0) continue;
      var m = d[i];
      if (d[i - 1] + 1 < m) m = d[i - 1] + 1;
      if (d[i - w] + 1 < m) m = d[i - w] + 1;
      if (d[i - w - 1] + 1.41 < m) m = d[i - w - 1] + 1.41;
      if (d[i - w + 1] + 1.41 < m) m = d[i - w + 1] + 1.41;
      d[i] = m;
    }
    for (y = h - 2; y >= 0; y--) for (x = w - 2; x >= 1; x--) {
      i = y * w + x;
      if (d[i] === 0) continue;
      var q = d[i];
      if (d[i + 1] + 1 < q) q = d[i + 1] + 1;
      if (d[i + w] + 1 < q) q = d[i + w] + 1;
      if (d[i + w + 1] + 1.41 < q) q = d[i + w + 1] + 1.41;
      if (d[i + w - 1] + 1.41 < q) q = d[i + w - 1] + 1.41;
      d[i] = q;
    }
    // Hauteur en dôme, puis lumière venant d'en haut à gauche
    var hmap = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var t = d[i] / R;
      if (t > 1) t = 1;
      hmap[i] = R * Math.sqrt(1 - (1 - t) * (1 - t));
    }
    var LX = -0.48, LY = -0.62, LZ = 0.62, HX = -0.27, HY = -0.35, HZ = 0.9;
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x;
      var o = i * 4;
      if (px[o + 3] < 8) continue;
      var nx = (hmap[i - 1] - hmap[i + 1]) * 0.62, ny = (hmap[i - w] - hmap[i + w]) * 0.62, nz = 1;
      var l = Math.sqrt(nx * nx + ny * ny + 1);
      nx /= l; ny /= l; nz /= l;
      var diff = nx * LX + ny * LY + nz * LZ;
      if (diff < 0) diff = 0;
      var sp = nx * HX + ny * HY + nz * HZ;
      if (sp <= 0) sp = 0;
      else { var s2 = sp * sp, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8; sp = s16 * s16 * s8; } // reflet serré, seulement sur le bord tourné vers la lumière
      if (d[i] === 0) {
        // Plomb : métal sombre légèrement bleuté
        var mt = 1 + K * 0.5;
        px[o] = Math.min(255, px[o] * mt + 14);
        px[o + 1] = Math.min(255, px[o + 1] * mt + 15);
        px[o + 2] = Math.min(255, px[o + 2] * mt + 22);
        continue;
      }
      var glow = Math.min(1, d[i] / (R * 2.2));
      // Grain du verre soufflé
      var grain = 1 + 0.035 * Math.sin(x * 0.73 + y * 1.31 + Math.sin(y * 0.21) * 3);
      var shadeK = (1 - K) + K * (0.34 + 0.86 * diff + 0.14 * glow) * grain;
      var r = px[o] * shadeK, gr = px[o + 1] * shadeK, b = px[o + 2] * shadeK;
      // Saturation plus vive, comme un verre traversé par la lumière
      var mean = (r + gr + b) / 3;
      r = mean + (r - mean) * (1 + 0.3 * K);
      gr = mean + (gr - mean) * (1 + 0.3 * K);
      b = mean + (b - mean) * (1 + 0.3 * K);
      var white = sp * 210 * K;
      px[o] = Math.max(0, Math.min(255, r + white));
      px[o + 1] = Math.max(0, Math.min(255, gr + white));
      px[o + 2] = Math.max(0, Math.min(255, b + white));
    }
    c.putImageData(im, 0, 0);
    return canvas;
  }

  // Silhouette noire pour les ombres portées
  function silhouette(canvas) {
    var s = document.createElement('canvas');
    s.width = canvas.width; s.height = canvas.height;
    var c = s.getContext('2d');
    c.drawImage(canvas, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = '#000';
    c.fillRect(0, 0, s.width, s.height);
    return s;
  }

  var glowCache = {};
  function glow(color) {
    if (glowCache[color]) return glowCache[color];
    var s = document.createElement('canvas');
    s.width = s.height = 128;
    var c = s.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.35)'));
    g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    glowCache[color] = s;
    return s;
  }

  var symbols = null;
  function loadSymbols() {
    symbols = {};
    var re = /<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g, m;
    while ((m = re.exec(window.GV_SPRITES))) symbols[m[1]] = m[0];
  }
  // Ne garde que les dessins utiles : l'image reste légère
  function collectDefs(markup) {
    if (!symbols) loadSymbols();
    var seen = {}, out = '', stack = [markup];
    while (stack.length) {
      var re = /href="#([^"]+)"/g, txt = stack.pop(), m;
      while ((m = re.exec(txt))) {
        if (!seen[m[1]] && symbols[m[1]]) {
          seen[m[1]] = 1;
          out += symbols[m[1]];
          stack.push(symbols[m[1]]);
        }
      }
    }
    return out;
  }

  var cache = {}, pending = {};
  function get(key) { return cache[key] || null; }

  // Fabrique une image. Si le navigateur refuse, on garde une image vide et le jeu continue.
  function make(key, inner, vbW, vbH, cls, pxPerUnit) {
    if (cache[key]) return Promise.resolve(cache[key]);
    if (pending[key]) return pending[key];
    var w = Math.round(vbW * pxPerUnit), h = Math.round(vbH * pxPerUnit);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + w + '" height="' + h + '" viewBox="0 0 ' + vbW + ' ' + vbH + '"><style>' + CSS + '</style><defs>' + collectDefs(inner) + '</defs><g class="' + cls + '">' + inner + '</g></svg>';
    pending[key] = new Promise(function (resolve) {
      var img = new Image();
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      img.onload = function () {
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        try { polish(canvas, Math.max(5, pxPerUnit * 4.2)); } catch (e) { /* image gardée sans éclairage */ }
        canvas.shadow = silhouette(canvas);
        cache[key] = canvas;
        resolve(canvas);
      };
      img.onerror = function () { canvas.shadow = canvas; cache[key] = canvas; resolve(canvas); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    return pending[key];
  }

  // Relief d'une planche : normales pour la lumière en temps réel et version déjà éclairée pour les écrans de gestion
  function relief(canvas, R) {
    var w = canvas.width, h = canvas.height, c = canvas.getContext('2d');
    var im = c.getImageData(0, 0, w, h), px = im.data, cnt = w * h;
    var d = new Float32Array(cnt), i, x, y;
    for (i = 0; i < cnt; i++) {
      var a = px[i * 4 + 3], lum = px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11;
      d[i] = (a < 110 || lum < 42) ? 0 : 1e6;
    }
    for (y = 1; y < h; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x;
      if (d[i] === 0) continue;
      var m = d[i];
      if (d[i - 1] + 1 < m) m = d[i - 1] + 1;
      if (d[i - w] + 1 < m) m = d[i - w] + 1;
      if (d[i - w - 1] + 1.41 < m) m = d[i - w - 1] + 1.41;
      if (d[i - w + 1] + 1.41 < m) m = d[i - w + 1] + 1.41;
      d[i] = m;
    }
    for (y = h - 2; y >= 0; y--) for (x = w - 2; x >= 1; x--) {
      i = y * w + x;
      if (d[i] === 0) continue;
      var q2 = d[i];
      if (d[i + 1] + 1 < q2) q2 = d[i + 1] + 1;
      if (d[i + w] + 1 < q2) q2 = d[i + w] + 1;
      if (d[i + w + 1] + 1.41 < q2) q2 = d[i + w + 1] + 1.41;
      if (d[i + w - 1] + 1.41 < q2) q2 = d[i + w - 1] + 1.41;
      d[i] = q2;
    }
    var hm = new Float32Array(cnt);
    for (i = 0; i < cnt; i++) { var t = d[i] / R; if (t > 1) t = 1; hm[i] = R * Math.sqrt(1 - (1 - t) * (1 - t)); }
    var nrm = new Uint8Array(cnt * 4);
    var lit = document.createElement('canvas');
    lit.width = w; lit.height = h;
    var lc = lit.getContext('2d'), li = lc.createImageData(w, h), lp = li.data;
    var LX = -0.48, LY = -0.62, LZ = 0.62, HX = -0.27, HY = -0.35, HZ = 0.9;
    for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
      i = y * w + x;
      var o = i * 4;
      if (px[o + 3] < 8) { nrm[o] = 128; nrm[o + 1] = 128; nrm[o + 2] = 0; nrm[o + 3] = 0; continue; }
      var nx = (hm[i - 1] - hm[i + 1]) * 0.62, ny = (hm[i - w] - hm[i + w]) * 0.62;
      var l = Math.sqrt(nx * nx + ny * ny + 1);
      nx /= l; ny /= l;
      var nz = 1 / l;
      var thick = d[i] === 0 ? 0 : Math.min(1, d[i] / (R * 1.6));
      // Marbrure du verre soufflé, peinte dans la couleur
      var mot = 1 + (d[i] === 0 ? 0 : 0.07 * Math.sin(x * 0.19 + Math.sin(y * 0.13) * 2.4) + 0.05 * Math.sin(y * 0.31 + x * 0.07 + Math.sin(x * 0.05) * 3));
      var r0 = Math.min(255, px[o] * mot), g0 = Math.min(255, px[o + 1] * mot), b0 = Math.min(255, px[o + 2] * mot);
      px[o] = r0; px[o + 1] = g0; px[o + 2] = b0;
      var mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0);
      // Le métal et le verre clair brillent plus que le tissu sombre
      var gloss = d[i] === 0 ? 0.35 : ((mx - mn) < 40 && mx > 90 ? 1 : 0.62);
      nrm[o] = Math.round((nx * 0.5 + 0.5) * 255);
      nrm[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nrm[o + 2] = Math.round(thick * 255);
      nrm[o + 3] = Math.round(gloss * 255);
      // Version figée
      var diff = nx * LX + ny * LY + nz * LZ; if (diff < 0) diff = 0;
      var sp = nx * HX + ny * HY + nz * HZ;
      if (sp <= 0) sp = 0; else { var s2 = sp * sp, s4 = s2 * s2, s8 = s4 * s4, s16 = s8 * s8; sp = s16 * s16 * s8; }
      var sh = 0.36 + 0.82 * diff + 0.16 * thick;
      var rr = r0 * sh, gg = g0 * sh, bb = b0 * sh, me = (rr + gg + bb) / 3;
      rr = me + (rr - me) * 1.28; gg = me + (gg - me) * 1.28; bb = me + (bb - me) * 1.28;
      var wh = sp * 215 * gloss;
      lp[o] = Math.max(0, Math.min(255, rr + wh));
      lp[o + 1] = Math.max(0, Math.min(255, gg + wh));
      lp[o + 2] = Math.max(0, Math.min(255, bb + wh));
      lp[o + 3] = px[o + 3];
    }
    c.putImageData(im, 0, 0);
    lc.putImageData(li, 0, 0);
    return { nrm: nrm, lit: lit };
  }

  // Une planche regroupe toutes les pièces d'un même personnage : une seule image à décoder, puis on découpe
  var sheets = {}, sheetOrder = [];
  function sheet(key, cls, parts, ppu) {
    if (sheets[key]) return sheets[key];
    var W = 1024, x = 0, y = 0, rowH = 0, cells = [], M = 2, inner = '', ids = Object.keys(parts);
    ids.sort(function (a, b) { var A = parts[a].box, B = parts[b].box; return (B[3] - B[1]) - (A[3] - A[1]); });
    ids.forEach(function (id) {
      var b = parts[id].box, cw = Math.ceil((b[2] - b[0]) * ppu) + M * 2, ch = Math.ceil((b[3] - b[1]) * ppu) + M * 2;
      if (x + cw > W) { x = 0; y += rowH; rowH = 0; }
      cells.push({ id: id, x: x, y: y, w: cw, h: ch, box: b });
      inner += '<g transform="translate(' + (x + M - b[0] * ppu) + ' ' + (y + M - b[1] * ppu) + ') scale(' + ppu + ')">' + parts[id].svg + '</g>';
      x += cw; if (ch > rowH) rowH = ch;
    });
    var H = y + rowH;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><style>' + CSS + '</style><defs>' + collectDefs(inner) + '</defs><g class="' + cls + '">' + inner + '</g></svg>';
    sheets[key] = new Promise(function (resolve) {
      var img = new Image();
      var canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      function done() {
        var c = canvas.getContext('2d', { willReadFrequently: true }), rects = {};
        canvas.getContext('2d').drawImage(img, 0, 0, W, H);
        var data = c.getImageData(0, 0, W, H).data;
        cells.forEach(function (ce) {
          var x0 = ce.x + ce.w, x1 = ce.x, y0 = ce.y + ce.h, y1 = ce.y, i, j;
          for (j = ce.y; j < ce.y + ce.h; j++) for (i = ce.x; i < ce.x + ce.w; i++) {
            if (data[(j * W + i) * 4 + 3] > 6) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
          }
          if (x1 < x0) { x0 = ce.x; x1 = ce.x + 1; y0 = ce.y; y1 = ce.y + 1; }
          x0 = Math.max(ce.x, x0 - 1); y0 = Math.max(ce.y, y0 - 1); x1 = Math.min(ce.x + ce.w - 1, x1 + 1); y1 = Math.min(ce.y + ce.h - 1, y1 + 1);
          var ox = ce.x + M - ce.box[0] * ppu, oy = ce.y + M - ce.box[1] * ppu;
          rects[ce.id] = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, ox: ox - x0, oy: oy - y0 };
        });
        var rel = relief(canvas, Math.max(4, ppu * 2.6));
        var out = { key: key, albedo: canvas, nrm: rel.nrm, lit: rel.lit, rects: rects, ppu: ppu, w: W, h: H };
        sheetOrder.push(key);
        while (sheetOrder.length > 60) { delete sheets[sheetOrder.shift()]; }
        resolve(out);
      }
      img.onload = done;
      img.onerror = function () { done(); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
    return sheets[key];
  }

  var BOW = '<path class="pp g" d="M-16 -38Q22 0 -16 38L-8 38Q34 0 -8 -38Z"></path><path class="q y" d="M-1 -6H9V6H-1Z"></path>';
  var FX_HELD = { wbw: 1, wcb: 1, wro: 1, wbm: 1 };
  function weaponPart(form) {
    if (form === 'wbw') return { svg: BOW, box: [-22, -44, 40, 44] };
    var y0 = FX_HELD[form] ? -40 : -65;
    return { svg: '<use href="#' + form + '" x="-40" y="' + y0 + '" width="80" height="80"></use>', box: [-44, y0 - 4, 44, y0 + 84] };
  }
  // Marionnette prête à animer : son squelette et sa planche de pièces
  function unit(race, uid, weapon, skin, ppu) {
    var GV = window.GV, rig = window.GVR.get(race, uid, weapon);
    var cls = GV.unitClass(race, uid, skin), P = ppu || 3;
    var parts = {};
    Object.keys(rig.parts).forEach(function (k) { parts[k] = rig.parts[k]; });
    if (rig.wform) parts.weapon = weaponPart(rig.wform);
    return sheet('u' + rig.key + ':' + cls + ':' + P, cls, parts, P).then(function (s) { return { rig: rig, sheet: s, cls: cls }; });
  }
  // Pièce isolée (forts et décors du champ de bataille)
  function single(key, cls, svg, box, ppu) {
    var parts = { main: { svg: svg, box: box } };
    return sheet(key, cls, parts, ppu);
  }
  function building(sym, orn, cls) {
    var key = 'b' + sym + ':' + (orn || '') + ':' + cls;
    var inner = '<use href="#' + sym + '" width="200" height="180"></use>' + (orn ? '<use href="#' + orn + '" width="200" height="180"></use>' : '');
    return make(key, inner, 200, 180, cls, 2.4);
  }
  function decor(sym) {
    return make('d' + sym, '<use href="#' + sym + '" width="52" height="58"></use>', 52, 58, '', 3);
  }
  // Portrait fini pour les écrans de gestion : le squelette en pose de repos
  function portrait(s) {
    var out = document.createElement('canvas');
    out.width = 444; out.height = 420;
    var c = out.getContext('2d'), R = window.GVR, st = R.restPose(s.rig), fit = R.fitOf(s.rig), sh = s.sheet, img = sh.lit;
    var K = 3 * fit.k / sh.ppu;
    s.rig.order.forEach(function (i) {
      var b = s.rig.bones[i], r = sh.rects[b.part];
      if (!r) return;
      c.filter = b.dk < 1 ? 'brightness(' + b.dk + ')' : 'none';
      c.setTransform(1, 0, 0, 1, 42 + (fit.x + st.x[i] * fit.k) * 3, (fit.y + st.y[i] * fit.k) * 3);
      c.rotate(st.ang[i]);
      c.scale(K * b.k, K * b.k);
      c.drawImage(img, r.x, r.y, r.w, r.h, -r.ox, -r.oy, r.w, r.h);
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.filter = 'none';
    return out;
  }
  function loadImage(src) {
    return new Promise(function (resolve) {
      var i = new Image();
      i.onload = function () { resolve(i); };
      i.onerror = function () { resolve(null); };
      i.src = src;
    });
  }

  // Fond de page : une mosaïque sombre de verres, répétable et très légère
  (function () {
    var T = 420, N = 7, cell = T / N, seed = 91, jit = [], i, j, PAL = ['#1d1538', '#241a44', '#17132e', '#2b1a3f', '#14203a', '#1c2a44', '#2a1630', '#101b2e', '#231b3f', '#1a2238', '#301c34', '#191433'];
    function R() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    for (j = 0; j < N; j++) { jit[j] = []; for (i = 0; i < N; i++) jit[j][i] = [(R() - 0.5) * cell * 0.7, (R() - 0.5) * cell * 0.7]; }
    function pt(a, b) { var q = jit[(b + N) % N][(a + N) % N]; return (a * cell + q[0]).toFixed(1) + ' ' + (b * cell + q[1]).toFixed(1); }
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + T + '" height="' + T + '" viewBox="0 0 ' + T + ' ' + T + '"><g stroke="#050308" stroke-width="2.4" stroke-linejoin="round">';
    for (j = -1; j <= N; j++) for (i = -1; i <= N; i++) {
      var A = pt(i, j), B = pt(i + 1, j), C = pt(i + 1, j + 1), D = pt(i, j + 1);
      s += '<path fill="' + PAL[Math.floor(R() * PAL.length)] + '" d="M' + A + 'L' + B + 'L' + D + 'Z"/><path fill="' + PAL[Math.floor(R() * PAL.length)] + '" d="M' + B + 'L' + C + 'L' + D + 'Z"/>';
    }
    s += '</g></svg>';
    document.documentElement.style.setProperty('--mosaic', 'url("data:image/svg+xml,' + encodeURIComponent(s) + '")');
  })();

  // Rosace du titre
  function rose(size) {
    var cols = ['#2f6bff', '#f0a020', '#1fc46f', '#e0263c', '#16c7c0', '#c6d92a', '#9a4dff', '#ff6a1a'], s = '', i;
    for (i = 0; i < 16; i++) {
      var a = i / 16 * 360, c = cols[i % 8], c2 = cols[(i + 3) % 8];
      s += '<g transform="rotate(' + a + ' 60 60)"><path fill="' + c + '" stroke="#120e0a" stroke-width="1.4" d="M60 40L53 22Q60 3 67 22Z"></path><path fill="' + c2 + '" stroke="#120e0a" stroke-width="1.2" d="M60 42L55 34L60 24L65 34Z"></path></g>';
    }
    return '<svg class="rose" width="' + size + '" height="' + size + '" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58" fill="#120e0a" stroke="#d9b447" stroke-width="2.4"></circle>' + s + '<circle cx="60" cy="60" r="17" fill="#120e0a" stroke="#d9b447" stroke-width="1.6"></circle><circle cx="60" cy="60" r="12" fill="#fff0a8" stroke="#120e0a" stroke-width="1.2"></circle><path fill="#ffd75a" stroke="#120e0a" stroke-width="1" d="M60 49L63 57L71 60L63 63L60 71L57 63L49 60L57 57Z"></path></svg>';
  }

  window.GVG = { rose: rose, polish: polish, relief: relief, glow: glow, portrait: portrait, quality: 'high', get: get, unit: unit, sheet: sheet, single: single, building: building, decor: decor, loadImage: loadImage };
})();
