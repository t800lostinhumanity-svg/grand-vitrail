// Architecture du royaume : chaque bâtiment est assemblé pierre par pierre et tuile par tuile, comme un vitrail.
// Les couleurs de peuple (g, d, l) passent par les toits, les bannières et les vitraux.
(function () {
  function rnd(seed) { var a = seed * 7919 + 17; return function () { a = (a * 16807) % 2147483647; return (a - 1) / 2147483646; }; }
  function n(v) { return Math.round(v * 10) / 10; }
  function attr(col, thin) { return (col.charAt(0) === '#' ? 'class="' + (thin ? 'q' : 'pp') + '" fill="' + col + '"' : 'class="' + (thin ? 'q ' : 'pp ') + col + '"'); }
  function shape(col, pts, thin) {
    var d = 'M' + n(pts[0]) + ' ' + n(pts[1]);
    for (var i = 2; i < pts.length; i += 2) d += 'L' + n(pts[i]) + ' ' + n(pts[i + 1]);
    return '<path ' + attr(col, thin) + ' d="' + d + 'Z"></path>';
  }
  function path(col, d, thin) { return '<path ' + attr(col, thin) + ' d="' + d + '"></path>'; }
  function disc(col, x, y, r, thin) { return '<circle ' + attr(col, thin) + ' cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"></circle>'; }
  function line(d) { return '<path class="q n" d="' + d + '"></path>'; }
  function spot(col, x, y, r) { return '<circle fill="' + col + '" cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"></circle>'; }

  var STONE = ['#cfc8b6', '#b7af9b', '#9d9583', '#ddd6c4', '#c3bba7'];
  var DARK = ['#8f8878', '#7b7466', '#6a6456', '#9a9282'];
  var SLATE = ['#a9a6bd', '#8f8ca6', '#bcb9cf', '#7f7c96'];
  var ROCK = ['#8d7f6c', '#a39480', '#6f6455', '#b4a692', '#7d7060'];
  var WOOD = ['#a8662a', '#8f5522', '#bd7a38', '#7a4619'];
  var WOODD = ['#6e3f17', '#5a3212', '#7f4b1e'];

  // Mur de pierres appareillées
  function stones(x, y, w, h, pal, seed, rh, cw) {
    var r = rnd(seed), out = shape('#2a241e', [x, y, x + w, y, x + w, y + h, x, y + h]), rowH = rh || 8, colW = cw || 13, row = 0;
    for (var yy = y; yy < y + h - 0.5; yy += rowH, row++) {
      var hh = Math.min(rowH, y + h - yy), xx = x - (row % 2 ? colW / 2 : 0);
      while (xx < x + w) {
        var cw2 = colW * (0.8 + r() * 0.4), a = Math.max(x, xx), b = Math.min(x + w, xx + cw2);
        if (b - a > 0.8) out += shape(pal[Math.floor(r() * pal.length)], [a, yy, b, yy, b, yy + hh, a, yy + hh], true);
        xx += cw2;
      }
    }
    return out;
  }
  // Planches
  function planks(x, y, w, h, pal, seed, horizontal, size) {
    var r = rnd(seed), out = '', s = size || 7;
    if (horizontal) for (var yy = y; yy < y + h - 0.2; yy += s) out += shape(pal[Math.floor(r() * pal.length)], [x, yy, x + w, yy, x + w, Math.min(y + h, yy + s), x, Math.min(y + h, yy + s)], true);
    else for (var xx = x; xx < x + w - 0.2; xx += s) out += shape(pal[Math.floor(r() * pal.length)], [xx, y, Math.min(x + w, xx + s), y, Math.min(x + w, xx + s), y + h, xx, y + h], true);
    return out + path('n', 'M' + n(x) + ' ' + n(y) + 'H' + n(x + w) + 'V' + n(y + h) + 'H' + n(x) + 'Z');
  }
  // Toit de tuiles : un trapèze ou, avec ins = demi-largeur, un pignon
  function tiles(x0, x1, yb, yt, ins, seed, pal, rowH) {
    var r = rnd(seed), rh = rowH || 9, P = pal || ['g', 'g', 'l', 'd', 'g'], out = shape(P[3] || 'd', [x0 - 3, yb, x1 + 3, yb, x1 - ins, yt, x0 + ins, yt]);
    for (var y = yb - rh; y > yt - rh; y -= rh) {
      var k = (yb - y) / (yb - yt), k2 = (yb - y - rh) / (yb - yt), xl = x0 - 3 + (ins + 3) * Math.min(1, k), xr = x1 + 3 - (ins + 3) * Math.min(1, k);
      var xl2 = x0 - 3 + (ins + 3) * Math.max(0, k2), xr2 = x1 + 3 - (ins + 3) * Math.max(0, k2);
      var count = Math.max(1, Math.round((xr2 - xl2) / 12));
      for (var i = 0; i < count; i++) {
        var a = i / count, b = (i + 1) / count, top0 = xl + (xr - xl) * a, top1 = xl + (xr - xl) * b, bot0 = xl2 + (xr2 - xl2) * a, bot1 = xl2 + (xr2 - xl2) * b;
        out += shape(P[Math.floor(r() * P.length)], [top0, y, top1, y, bot1, y + rh, (bot0 + bot1) / 2, y + rh + 1.8, bot0, y + rh], true);
      }
    }
    return out;
  }
  function cone(cx, yb, r, apex, seed, pal) { return tiles(cx - r, cx + r, yb, apex, r, seed, pal, 8) + disc('y', cx, apex - 2, 2.8, true); }
  function win(x, y, w, h, arch, tint) {
    var col = tint || 'y', s = arch
      ? path('wd', 'M' + n(x - 2) + ' ' + n(y + h + 2) + 'V' + n(y + w / 2) + 'A' + n(w / 2 + 2) + ' ' + n(w / 2 + 2) + ' 0 0 1 ' + n(x + w + 2) + ' ' + n(y + w / 2) + 'V' + n(y + h + 2) + 'Z') + path(col, 'M' + n(x) + ' ' + n(y + h) + 'V' + n(y + w / 2) + 'A' + n(w / 2) + ' ' + n(w / 2) + ' 0 0 1 ' + n(x + w) + ' ' + n(y + w / 2) + 'V' + n(y + h) + 'Z', true)
      : shape('wd', [x - 2, y - 2, x + w + 2, y - 2, x + w + 2, y + h + 2, x - 2, y + h + 2]) + shape(col, [x, y, x + w, y, x + w, y + h, x, y + h], true);
    s += line('M' + n(x + w / 2) + ' ' + n(y + 1) + 'V' + n(y + h) + 'M' + n(x) + ' ' + n(y + h * 0.55) + 'H' + n(x + w));
    s += shape('#cfc8b6', [x - 3, y + h + 2, x + w + 3, y + h + 2, x + w + 3, y + h + 4, x - 3, y + h + 4], true);
    return s;
  }
  function door(x, y, w, h, col) {
    var c = col || 'wd', r = w / 2;
    var s = path('#3a342c', 'M' + n(x - 3) + ' ' + n(y + h) + 'V' + n(y + r) + 'A' + n(r + 3) + ' ' + n(r + 3) + ' 0 0 1 ' + n(x + w + 3) + ' ' + n(y + r) + 'V' + n(y + h) + 'Z');
    s += path(c, 'M' + n(x) + ' ' + n(y + h) + 'V' + n(y + r) + 'A' + n(r) + ' ' + n(r) + ' 0 0 1 ' + n(x + w) + ' ' + n(y + r) + 'V' + n(y + h) + 'Z', true);
    for (var xx = x + w / 4; xx < x + w - 1; xx += w / 4) s += line('M' + n(xx) + ' ' + n(y + 2) + 'V' + n(y + h));
    s += shape('md', [x, y + h * 0.42, x + w, y + h * 0.42, x + w, y + h * 0.48, x, y + h * 0.48], true) + shape('md', [x, y + h * 0.76, x + w, y + h * 0.76, x + w, y + h * 0.82, x, y + h * 0.82], true);
    return s + spot('#ffd75a', x + w * 0.78, y + h * 0.6, 1.5);
  }
  function banner(x, y, w, h) {
    return shape('wd', [x - w * 0.6, y - 2, x + w * 0.6, y - 2, x + w * 0.6, y + 1, x - w * 0.6, y + 1], true) + shape('g', [x - w / 2, y, x + w / 2, y, x + w / 2, y + h, x, y + h - 6, x - w / 2, y + h]) + shape('d', [x, y, x + w / 2, y, x + w / 2, y + h, x, y + h - 6], true) + shape('y', [x, y + h * 0.18, x + w * 0.24, y + h * 0.4, x, y + h * 0.62, x - w * 0.24, y + h * 0.4], true);
  }
  function flag(x, y, h, big) {
    var w = big ? 20 : 15;
    return shape('wd', [x - 1, y, x + 1, y, x + 1, y - h, x - 1, y - h], true) + path('g', 'M' + (x + 1) + ' ' + n(y - h) + 'Q' + n(x + w * 0.6) + ' ' + n(y - h + 1) + ' ' + (x + w) + ' ' + n(y - h + 5) + 'Q' + n(x + w * 0.5) + ' ' + n(y - h + 6) + ' ' + (x + 1) + ' ' + n(y - h + 10) + 'Z') + spot('#ffd75a', x, y - h - 1.5, 1.8);
  }
  function battlement(x, y, w, cell, pal, seed) {
    var out = stones(x, y, w, 7, pal, seed, 7, 12), count = Math.round(w / cell);
    for (var i = 0; i < count; i += 2) { var c = x + i * w / count; out += stones(c, y - 7, w / count, 7, pal, seed + i + 1, 7, 12); }
    return out;
  }
  function barrel(x, y, s) { var w = 10 * (s || 1), h = 13 * (s || 1); return path('w', 'M' + n(x) + ' ' + n(y) + 'Q' + n(x - w * 0.16) + ' ' + n(y - h / 2) + ' ' + n(x) + ' ' + n(y - h) + 'H' + n(x + w) + 'Q' + n(x + w * 1.16) + ' ' + n(y - h / 2) + ' ' + n(x + w) + ' ' + n(y) + 'Z') + line('M' + n(x + w * 0.33) + ' ' + n(y) + 'V' + n(y - h) + 'M' + n(x + w * 0.66) + ' ' + n(y) + 'V' + n(y - h)) + shape('md', [x - 1, y - h * 0.8, x + w + 1, y - h * 0.8, x + w + 1, y - h * 0.68, x - 1, y - h * 0.68], true) + shape('md', [x - 1, y - h * 0.3, x + w + 1, y - h * 0.3, x + w + 1, y - h * 0.18, x - 1, y - h * 0.18], true); }
  function crate(x, y, s) { var d = 12 * (s || 1); return shape('w', [x, y, x + d, y, x + d, y - d, x, y - d]) + line('M' + n(x) + ' ' + n(y) + 'L' + n(x + d) + ' ' + n(y - d) + 'M' + n(x) + ' ' + n(y - d) + 'L' + n(x + d) + ' ' + n(y)) + shape('wd', [x, y - d, x + d, y - d, x + d, y - d + 2, x, y - d + 2], true); }
  function torch(x, y) { return shape('wd', [x - 1, y, x + 1, y, x + 1, y - 8, x - 1, y - 8], true) + path('#ff8a1e', 'M' + (x - 3) + ' ' + (y - 8) + 'Q' + x + ' ' + (y - 17) + ' ' + (x + 3) + ' ' + (y - 8) + 'Z', true) + path('y', 'M' + (x - 1.4) + ' ' + (y - 8) + 'Q' + x + ' ' + (y - 13) + ' ' + (x + 1.4) + ' ' + (y - 8) + 'Z', true); }
  function steps(x0, x1, y, count, pal) { var s = '', i; for (i = 0; i < count; i++) { var k = i * 4; s += shape(pal[i % pal.length], [x0 + k, y - i * 3, x1 - k, y - i * 3, x1 - k, y - i * 3 - 3, x0 + k, y - i * 3 - 3], true); } return s; }
  function rocks(cx, cy, r, seed, pal) {
    var R = rnd(seed), out = '', count = 7;
    for (var i = 0; i < count; i++) {
      var a0 = Math.PI + i / count * Math.PI, a1 = Math.PI + (i + 1) / count * Math.PI, ry0 = r * (0.86 + R() * 0.2), ry1 = r * (0.86 + R() * 0.2);
      out += shape(pal[Math.floor(R() * pal.length)], [cx, cy, cx + Math.cos(a0) * ry0, cy + Math.sin(a0) * ry0, cx + Math.cos(a1) * ry1, cy + Math.sin(a1) * ry1]);
    }
    return out;
  }

  var B = {
    // Caserne
    d1: function () {
      return flag(150, 58, 34) + stones(26, 88, 148, 84, STONE, 1) + shape('#8f8878', [174, 88, 186, 80, 186, 164, 174, 172]) + tiles(18, 178, 90, 44, 30, 1) + shape('d', [16, 88, 184, 88, 184, 92, 16, 92]) + door(84, 118, 32, 54) + banner(50, 98, 20, 34) + banner(150, 98, 20, 34) + win(46, 140, 10, 16, false) + win(144, 140, 10, 16, false) + disc('md', 100, 104, 8) + disc('g', 100, 104, 5, true) + spot('#ffd75a', 100, 104, 1.8) + shape('s', [62, 172, 66, 136, 68, 136, 70, 172], true) + shape('md', [128, 172, 130, 138, 132, 138, 134, 172], true);
    },
    // Ferme
    d2: function () {
      var field = '', r = rnd(2);
      for (var i = 0; i < 6; i++) { var x = 8 + i * 15; field += shape(i % 2 ? '#f2c531' : '#e6b422', [x, 172, x + 15, 172, x + 12, 142, x - 2, 142], true); for (var k = 0; k < 3; k++) field += line('M' + n(x + 2 + k * 4 + r()) + ' 170V' + n(146 + r() * 8)); }
      return field + planks(96, 100, 84, 72, ['#e8dcc0', '#dccfb0', '#f0e6cd'], 2, false, 11) + shape('wd', [96, 100, 180, 100, 180, 104, 96, 104], true) + shape('wd', [96, 100, 100, 100, 100, 172, 96, 172], true) + shape('wd', [176, 100, 180, 100, 180, 172, 176, 172], true) + shape('wd', [98, 104, 104, 104, 178, 168, 172, 168], true) + tiles(88, 188, 102, 44, 50, 2, ['#d9a548', '#c79335', '#e8bd60', '#a97c28']) + door(122, 134, 22, 38) + win(152, 118, 14, 14, false) + win(110, 112, 10, 12, false) + path('#e8bd60', 'M12 172Q14 142 34 140Q54 142 56 172Z') + line('M20 172L32 144M34 172L38 144M46 172L40 146') + shape('wd', [0, 172, 90, 172, 90, 170, 0, 170], true) + shape('wd', [6, 172, 9, 172, 9, 158, 6, 158], true) + shape('wd', [80, 172, 83, 172, 83, 158, 80, 158], true);
    },
    // Moulin
    d3: function () {
      function blade(a) {
        var c = Math.cos(a), s = Math.sin(a), L = 66, W = 15, o = '';
        function pt(u, v) { return [100 + c * u - s * v, 64 + s * u + c * v]; }
        var p0 = pt(10, 0), p1 = pt(L, 0), p2 = pt(L, W), p3 = pt(10, W);
        o += shape('#f2ecd8', [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]]);
        for (var u = 22; u < L; u += 12) { var q0 = pt(u, 0), q1 = pt(u, W); o += line('M' + n(q0[0]) + ' ' + n(q0[1]) + 'L' + n(q1[0]) + ' ' + n(q1[1])); }
        var v0 = pt(10, W * 0.5), v1 = pt(L, W * 0.5);
        o += line('M' + n(v0[0]) + ' ' + n(v0[1]) + 'L' + n(v1[0]) + ' ' + n(v1[1]));
        var s0 = pt(0, -1.5), s1 = pt(L + 2, -1.5), s2 = pt(L + 2, 1.5), s3 = pt(0, 1.5);
        return o + shape('wd', [s0[0], s0[1], s1[0], s1[1], s2[0], s2[1], s3[0], s3[1]], true);
      }
      var tower = '', rows = 11;
      var r = rnd(3);
      for (var i = 0; i < rows; i++) { var k0 = i / rows, k1 = (i + 1) / rows, w0 = 22 + 16 * k0, w1 = 22 + 16 * k1, y0 = 66 + 106 * k0, y1 = 66 + 106 * k1, cnt = 5; for (var j = 0; j < cnt; j++) tower += shape(STONE[Math.floor(r() * 5)], [100 - w0 + 2 * w0 * j / cnt + (i % 2 ? 2 : 0), y0, 100 - w0 + 2 * w0 * (j + 1) / cnt + (i % 2 ? 2 : 0), y0, 100 - w1 + 2 * w1 * (j + 1) / cnt + (i % 2 ? 2 : 0), y1, 100 - w1 + 2 * w1 * j / cnt + (i % 2 ? 2 : 0), y1], true); }
      return tower + cone(100, 68, 28, 34, 3) + door(90, 136, 20, 36) + win(94, 100, 12, 16, true) + blade(0.35) + blade(0.35 + Math.PI / 2) + blade(0.35 + Math.PI) + blade(0.35 + 3 * Math.PI / 2) + disc('wd', 100, 64, 6) + disc('y', 100, 64, 2.4, true) + path('#e8dcc0', 'M138 172Q134 156 146 154Q158 156 154 172Z') + path('#d8cca8', 'M150 172Q148 160 158 158Q168 160 166 172Z');
    },
    // Mine
    d4: function () {
      return rocks(100, 172, 92, 41, ROCK) + rocks(40, 172, 40, 42, ['#a39480', '#7d7060', '#b4a692']) + rocks(160, 172, 44, 43, ['#8d7f6c', '#6f6455', '#a39480']) + shape('#120e0a', [70, 172, 70, 112, 130, 112, 130, 172]) + planks(62, 104, 76, 11, WOOD, 4, true, 11) + planks(62, 115, 10, 57, WOOD, 5, false, 5) + planks(128, 115, 10, 57, WOOD, 6, false, 5) + shape('md', [74, 172, 126, 172, 112, 150, 88, 150], true) + line('M86 172L92 150M114 172L108 150M80 166H120M84 160H116M88 154H112') + shape('wd', [84, 150, 116, 150, 112, 136, 88, 136]) + shape('y', [88, 136, 96, 126, 104, 134, 110, 128, 112, 136], true) + disc('wd', 92, 152, 3, true) + disc('wd', 108, 152, 3, true) + shape('y', [28, 172, 36, 158, 44, 172]) + shape('y', [150, 172, 160, 154, 170, 172]) + shape('#fff3b0', [36, 158, 44, 172, 36, 172], true) + spot('#ffffff', 160, 160, 1.4) + torch(58, 150) + torch(142, 150);
    },
    // Forge
    d5: function () {
      return stones(136, 26, 22, 44, DARK, 5, 7, 9) + shape('sd', [132, 26, 162, 26, 162, 20, 132, 20]) + stones(28, 92, 130, 80, STONE, 7) + shape('#8f8878', [158, 92, 176, 84, 176, 162, 158, 172]) + tiles(20, 170, 94, 54, 22, 5) + shape('#120e0a', [40, 172, 40, 128, 48, 116, 78, 116, 86, 128, 86, 172]) + path('#ff8a1e', 'M46 172V132Q63 112 80 132V172Z', true) + path('#ffd75a', 'M54 172Q50 150 63 130Q76 150 72 172Z', true) + path('#fff6c9', 'M60 172Q58 158 63 146Q68 158 66 172Z', true) + shape('sd', [104, 150, 142, 150, 142, 156, 132, 156, 128, 164, 134, 172, 112, 172, 118, 164, 114, 156, 104, 156]) + shape('md', [106, 150, 140, 150, 140, 152, 106, 152], true) + shape('wd', [120, 148, 124, 128, 127, 128, 124, 148]) + shape('md', [116, 122, 136, 122, 136, 132, 116, 132]) + win(100, 106, 14, 14, false) + win(132, 106, 14, 14, false) + barrel(160, 172, 0.9);
    },
    // Scierie
    d6: function () {
      var saw = '', i;
      for (i = 0; i < 12; i++) { var a = i / 12 * 6.2832, a2 = (i + 0.5) / 12 * 6.2832, a3 = (i + 1) / 12 * 6.2832; saw += shape('m', [104, 112, 104 + Math.cos(a) * 24, 112 + Math.sin(a) * 24, 104 + Math.cos(a2) * 30, 112 + Math.sin(a2) * 30, 104 + Math.cos(a3) * 24, 112 + Math.sin(a3) * 24], true); }
      return shape('wd', [24, 172, 32, 172, 32, 88, 24, 88]) + shape('wd', [168, 172, 176, 172, 176, 88, 168, 88]) + tiles(14, 186, 90, 40, 34, 6) + saw + disc('md', 104, 112, 9) + disc('g', 104, 112, 4, true) + spot('#ffffff', 101, 109, 1.4) + planks(44, 140, 116, 16, WOOD, 8, true, 8) + shape('wd', [48, 156, 56, 156, 56, 172, 48, 172]) + shape('wd', [148, 156, 156, 156, 156, 172, 148, 172]) + disc('w', 14, 164, 8) + disc('#e8c98a', 14, 164, 4, true) + disc('w', 30, 164, 8) + disc('#e8c98a', 30, 164, 4, true) + disc('w', 22, 151, 8) + disc('#e8c98a', 22, 151, 4, true) + spot('#7a4619', 14, 164, 1.2) + spot('#7a4619', 30, 164, 1.2) + spot('#7a4619', 22, 151, 1.2) + planks(164, 158, 32, 14, ['#e8c98a', '#d6b070', '#c79a5a'], 9, true, 5);
    },
    // Marché
    d7: function () {
      var aw = '', i;
      for (i = 0; i < 8; i++) { var x0 = 34 + i * 16.5, x1 = x0 + 16.5, b0 = 14 + i * 21.5, b1 = b0 + 21.5; aw += path(i % 2 ? '#f6efdb' : 'g', 'M' + n(x0) + ' 50L' + n(x1) + ' 50L' + n(b1) + ' 96Q' + n((b0 + b1) / 2) + ' 106 ' + n(b0) + ' 96Z'); }
      return shape('wd', [26, 172, 32, 172, 32, 90, 26, 90]) + shape('wd', [168, 172, 174, 172, 174, 90, 168, 90]) + aw + shape('#f6efdb', [30, 50, 170, 50, 170, 46, 30, 46]) + planks(30, 132, 140, 40, WOOD, 7, true, 8) + shape('wd', [26, 128, 174, 128, 174, 134, 26, 134]) + disc('#e0263c', 54, 122, 6.5) + disc('#e0263c', 66, 122, 6.5) + disc('#ff8a1e', 60, 114, 6.5) + spot('#ffffff', 52, 119, 1.4) + disc('y', 96, 122, 6) + disc('y', 106, 122, 6) + disc('y', 101, 113, 6) + spot('#ffffff', 94, 119, 1.3) + disc('l', 138, 122, 6.5) + disc('g', 150, 122, 6.5) + disc('d', 144, 113, 6.5) + spot('#ffffff', 136, 119, 1.3) + crate(4, 172, 1.2) + barrel(180, 172, 1) + crate(12, 158, 0.8) + shape('y', [88, 150, 112, 150, 112, 164, 88, 164]) + disc('#a97c14', 100, 157, 5, true);
    },
    // Temple
    d8: function () {
      function column(x) { return shape('#efe8d0', [x, 84, x + 12, 84, x + 13, 152, x - 1, 152]) + line('M' + (x + 3) + ' 88V150M' + (x + 6) + ' 88V150M' + (x + 9) + ' 88V150') + shape('#d9d2bf', [x - 3, 78, x + 15, 78, x + 13, 84, x - 1, 84], true) + shape('#d9d2bf', [x - 3, 152, x + 15, 152, x + 15, 158, x - 3, 158], true); }
      return shape('#3a342c', [38, 84, 162, 84, 162, 152, 38, 152]) + win(92, 102, 16, 34, true, 'l') + column(36) + column(66) + column(122) + column(152) + shape('#d9d2bf', [24, 70, 176, 70, 176, 80, 24, 80]) + line('M24 75H176') + tiles(18, 182, 72, 26, 82, 8) + disc('y', 100, 54, 9) + disc('#fff6c9', 100, 54, 4, true) + steps(16, 184, 172, 5, ['#d9d2bf', '#c3bba7', '#e6dfcc']);
    },
    // Bibliothèque
    d9: function () {
      return stones(34, 74, 132, 98, SLATE, 9) + shape('#7f7c96', [166, 74, 180, 66, 180, 164, 166, 172]) + tiles(26, 174, 76, 26, 74, 9) + win(46, 92, 18, 40, true, 'l') + win(136, 92, 18, 40, true, 'g') + door(84, 122, 32, 50, 'g') + disc('wd', 100, 96, 14) + disc('l', 100, 96, 11, true) + line('M100 85V107M89 96H111M92 88L108 104M108 88L92 104') + spot('#ffd75a', 100, 96, 2) + shape('wd', [44, 140, 66, 140, 66, 158, 44, 158]) + shape('#e0263c', [47, 142, 51, 142, 51, 156, 47, 156], true) + shape('#2f6bff', [52, 142, 56, 142, 56, 156, 52, 156], true) + shape('#1fc46f', [57, 142, 62, 142, 62, 156, 57, 156], true) + shape('wd', [134, 140, 156, 140, 156, 158, 134, 158]) + shape('y', [137, 142, 142, 142, 142, 156, 137, 156], true) + shape('#9a4dff', [143, 142, 148, 142, 148, 156, 143, 156], true) + shape('#ff6a1a', [149, 142, 153, 142, 153, 156, 149, 156], true) + steps(76, 124, 172, 2, ['#bcb9cf', '#a9a6bd']);
    },
    // Écurie
    d10: function () {
      function stall(x) { return path('#120e0a', 'M' + x + ' 172V136Q' + (x + 16) + ' 118 ' + (x + 32) + ' 136V172Z') + shape('w', [x, 150, x + 32, 150, x + 32, 172, x, 172], true) + line('M' + (x + 8) + ' 150V172M' + (x + 16) + ' 150V172M' + (x + 24) + ' 150V172M' + x + ' 160H' + (x + 32)); }
      var horse = path('#7a4619', 'M72 150Q70 134 78 126L84 122L88 126L96 132L94 138L86 134L84 150Z') + path('#3a2412', 'M78 126Q74 134 72 148L76 148Q76 136 82 124Z', true) + spot('#120e0a', 87, 128, 1.1);
      return planks(16, 104, 168, 68, WOOD, 10, false, 8) + shape('wd', [12, 100, 188, 100, 188, 106, 12, 106]) + tiles(6, 194, 102, 54, 26, 10) + stall(26) + stall(84) + stall(142) + horse + path('#e8bd60', 'M4 172Q6 152 18 150Q30 152 26 172Z') + line('M10 172L16 154M20 172L18 152') + shape('wd', [178, 172, 198, 172, 196, 160, 180, 160]) + shape('#5cc6ea', [181, 162, 195, 162, 194, 165, 182, 165], true);
    },
    // Tour d'archers
    d11: function () {
      return flag(100, 26, 24, true) + stones(68, 42, 64, 130, STONE, 11) + shape('#8f8878', [132, 42, 142, 36, 142, 164, 132, 172]) + battlement(60, 38, 80, 10, STONE, 12) + shape('#120e0a', [94, 64, 106, 64, 106, 88, 94, 88]) + shape('#120e0a', [76, 106, 82, 106, 82, 124, 76, 124]) + shape('#120e0a', [118, 106, 124, 106, 124, 124, 118, 124]) + door(86, 134, 28, 38) + banner(100, 46, 14, 12) + torch(74, 140) + torch(126, 140) + shape('wd', [146, 172, 150, 172, 164, 92, 160, 92], true) + shape('wd', [158, 172, 162, 172, 176, 92, 172, 92], true) + line('M150 160H162M152 148H164M154 136H166M157 124H169M159 112H171M161 100H173');
    },
    // Muraille
    d12: function () {
      return stones(6, 74, 188, 98, STONE, 12) + battlement(2, 66, 196, 13, STONE, 13) + stones(4, 58, 34, 114, DARK, 14) + battlement(0, 54, 42, 7, DARK, 15) + stones(162, 58, 34, 114, DARK, 16) + battlement(158, 54, 42, 7, DARK, 17) + path('#120e0a', 'M72 172V126Q100 94 128 126V172Z') + (function () { var s = ''; for (var x = 78; x < 128; x += 10) s += shape('md', [x, 110, x + 2, 110, x + 2, 172, x, 172], true); for (var y = 120; y < 172; y += 12) s += shape('md', [72, y, 128, y, 128, y + 2, 72, y + 2], true); return s; })() + path('#b7af9b', 'M66 172V124Q100 86 134 124V172H128V126Q100 94 72 126V172Z') + banner(100, 78, 14, 16) + torch(58, 130) + torch(142, 130) + shape('#120e0a', [17, 90, 23, 90, 23, 108, 17, 108]) + shape('#120e0a', [176, 90, 182, 90, 182, 108, 176, 108]);
    },
    // Port
    d13: function () {
      var wave = '', i;
      for (i = 0; i < 5; i++) wave += path(i % 2 ? '#3fb4e0' : '#1f7fc0', 'M0 ' + (134 + i * 8) + 'Q25 ' + (130 + i * 8) + ' 50 ' + (134 + i * 8) + 'T100 ' + (134 + i * 8) + 'T150 ' + (134 + i * 8) + 'T200 ' + (134 + i * 8) + 'V' + (144 + i * 8) + 'H0Z', true);
      var ship = path('w', 'M92 138Q104 160 160 160Q186 158 194 134L176 140H108Z') + planks(112, 142, 62, 14, WOOD, 13, true, 5) + shape('wd', [136, 140, 140, 140, 140, 44, 136, 44]) + path('#f6efdb', 'M141 48Q172 74 141 112Z') + path('g', 'M141 62Q157 76 141 94Z', true) + path('#efe8d0', 'M135 56Q110 84 135 118Z') + flag(138, 44, 14);
      return wave + ship + planks(0, 118, 92, 10, WOOD, 14, false, 9) + shape('wd', [10, 128, 18, 128, 18, 168, 10, 168]) + shape('wd', [62, 128, 70, 128, 70, 168, 62, 168]) + crate(6, 118, 1) + barrel(22, 118, 1) + crate(44, 118, 1.1) + shape('wd', [74, 118, 78, 118, 78, 60, 74, 60]) + shape('wd', [62, 64, 102, 58, 102, 62, 62, 68]) + line('M100 60V96') + crate(94, 108, 0.8) + spot('#ffffff', 40, 150, 1) + spot('#ffffff', 90, 164, 1) + spot('#ffffff', 26, 164, 0.8);
    },
    // Atelier de siège
    d14: function () {
      var gear = '', i;
      for (i = 0; i < 8; i++) { var a = i / 8 * 6.2832; gear += shape('sd', [26 + Math.cos(a - 0.2) * 12, 60 + Math.sin(a - 0.2) * 12, 26 + Math.cos(a - 0.14) * 17, 60 + Math.sin(a - 0.14) * 17, 26 + Math.cos(a + 0.14) * 17, 60 + Math.sin(a + 0.14) * 17, 26 + Math.cos(a + 0.2) * 12, 60 + Math.sin(a + 0.2) * 12], true); }
      return planks(10, 94, 104, 78, WOODD, 15, false, 9) + tiles(2, 122, 96, 56, 18, 14) + shape('#120e0a', [30, 172, 30, 118, 92, 118, 92, 172]) + planks(26, 110, 70, 8, WOOD, 16, true, 8) + gear + disc('md', 26, 60, 12) + disc('sd', 26, 60, 4, true) + shape('wd', [124, 170, 196, 170, 196, 156, 124, 156]) + disc('w', 134, 168, 10) + disc('md', 134, 168, 3.5, true) + disc('w', 186, 168, 10) + disc('md', 186, 168, 3.5, true) + shape('wd', [148, 156, 154, 156, 168, 100, 164, 100]) + shape('wd', [178, 156, 172, 156, 166, 100, 164, 100]) + shape('w', [126, 134, 132, 138, 186, 42, 182, 38]) + path('wd', 'M176 40Q190 34 192 24Q196 40 182 50Z') + disc('s', 188, 24, 7) + shape('sd', [120, 124, 138, 124, 138, 146, 120, 146]);
    },
    // Taverne
    d15: function () {
      return stones(146, 28, 18, 66, DARK, 15, 7, 8) + shape('sd', [143, 28, 167, 28, 167, 23, 143, 23]) + stones(34, 128, 124, 44, STONE, 18) + planks(30, 88, 132, 40, ['#efe2c6', '#e6d8b8', '#f4ead2'], 17, false, 13) + shape('wd', [28, 124, 164, 124, 164, 130, 28, 130]) + shape('wd', [28, 86, 164, 86, 164, 90, 28, 90]) + shape('wd', [30, 90, 34, 90, 34, 126, 30, 126], true) + shape('wd', [158, 90, 162, 90, 162, 126, 158, 126], true) + shape('wd', [34, 124, 40, 124, 92, 90, 86, 90], true) + shape('wd', [158, 124, 152, 124, 100, 90, 106, 90], true) + tiles(22, 170, 90, 38, 34, 15, ['#c9472f', '#a93524', '#df6a3f', '#8e2a1f']) + win(52, 96, 16, 18, false) + win(124, 96, 16, 18, false) + win(44, 138, 18, 20, false) + win(130, 138, 18, 20, false) + door(84, 132, 28, 40) + shape('wd', [162, 96, 192, 96, 192, 100, 162, 100]) + shape('wd', [168, 100, 190, 100, 190, 126, 168, 126]) + shape('y', [172, 104, 184, 104, 184, 120, 172, 120], true) + path('n', 'M184 108Q190 112 184 116') + shape('#f6efdb', [171, 102, 185, 102, 185, 107, 171, 107], true) + barrel(6, 172, 1.1) + barrel(18, 172, 1) + barrel(12, 158, 0.9) + torch(70, 132) + torch(126, 132);
    },
    // Puits de lumière
    d16: function () {
      var rays = '<path fill="#fff6c9" fill-opacity=".38" d="M70 110L52 0H148L130 110Z"></path><path fill="#ffe27a" fill-opacity=".42" d="M84 110L78 0H122L116 110Z"></path>';
      var s = stones(46, 124, 108, 48, SLATE, 16, 8, 12) + shape('#bcb9cf', [38, 116, 162, 116, 162, 126, 38, 126]) + path('#2a241e', 'M50 118Q100 106 150 118Z') + shape('wd', [52, 172, 58, 172, 58, 62, 52, 62]) + shape('wd', [142, 172, 148, 172, 148, 62, 142, 62]);
      var star = shape('#fff6c9', [100, 42, 110, 86, 136, 96, 110, 106, 100, 122, 90, 106, 64, 96, 90, 86]) + shape('y', [100, 42, 110, 86, 100, 96], true) + shape('#ffe27a', [136, 96, 110, 106, 100, 96], true) + shape('l', [64, 96, 90, 106, 100, 96], true) + shape('g', [100, 122, 90, 106, 100, 96], true) + spot('#ffffff', 97, 80, 2);
      var runes = '';
      for (var i = 0; i < 4; i++) runes += shape('y', [60 + i * 24, 140, 66 + i * 24, 136, 72 + i * 24, 140, 66 + i * 24, 156], true);
      return rays + s + runes + star + tiles(40, 160, 66, 30, 60, 17);
    },
    // Citadelles
    c1: function () {
      function tower(cx, w, top, seed) { return stones(cx - w / 2, top, w, 172 - top, STONE, seed) + cone(cx, top + 2, w / 2 + 6, top - w * 1.1, seed); }
      return flag(100, 14, 12, true) + stones(36, 88, 128, 84, STONE, 21) + battlement(32, 84, 136, 11, STONE, 22) + stones(70, 56, 60, 116, DARK, 23) + cone(100, 58, 38, 18, 24) + tower(24, 36, 70, 25) + tower(176, 36, 70, 26) + door(82, 128, 36, 44) + win(90, 72, 20, 34, true, 'l') + banner(52, 98, 16, 28) + banner(148, 98, 16, 28) + win(19, 92, 10, 16, true) + win(171, 92, 10, 16, true) + torch(74, 136) + torch(126, 136) + steps(72, 128, 172, 2, ['#bcb9cf', '#a9a6bd']);
    },
    c2: function () {
      return rocks(100, 172, 98, 31, ['#6f6455', '#8d7f6c', '#5f5546', '#a39480']) + stones(40, 96, 120, 76, DARK, 32, 10, 18) + shape('y', [36, 96, 164, 96, 164, 88, 36, 88]) + path('y', 'M56 172V122L100 88L144 122V172Z') + path('#120e0a', 'M64 172V126L100 98L136 126V172Z') + shape('wd', [68, 172, 98, 172, 98, 128, 68, 128]) + shape('wd', [102, 172, 132, 172, 132, 128, 102, 128]) + line('M78 128V172M88 128V172M112 128V172M122 128V172') + shape('md', [68, 140, 132, 140, 132, 144, 68, 144], true) + shape('md', [68, 158, 132, 158, 132, 162, 68, 162], true) + disc('y', 100, 108, 6) + spot('#120e0a', 100, 108, 2.4) + shape('sd', [26, 172, 44, 172, 42, 124, 28, 124]) + disc('md', 35, 116, 8) + shape('hr', [28, 120, 42, 120, 35, 136], true) + shape('sd', [156, 172, 174, 172, 172, 124, 158, 124]) + disc('md', 165, 116, 8) + shape('hr', [158, 120, 172, 120, 165, 136], true) + shape('l', [50, 106, 54, 100, 58, 106, 54, 118], true) + shape('l', [142, 106, 146, 100, 150, 106, 146, 118], true) + torch(50, 136) + torch(150, 136);
    },
    c3: function () {
      var r = rnd(35), leaves = '';
      leaves += path('d', 'M12 62Q14 14 100 10Q186 14 188 62Q186 104 100 106Q14 104 12 62Z');
      for (var i = 0; i < 74; i++) { var a = r() * 6.2832, d = Math.sqrt(r()), x = 100 + Math.cos(a) * d * 88, y = 58 + Math.sin(a) * d * 46, rs = 7 + r() * 8, shadeL = y < 50 ? ['l', 'g', 'l'] : ['g', 'd', 'g']; leaves += shape(shadeL[Math.floor(r() * 3)], [x, y - rs, x + rs * 0.86, y - rs * 0.2, x + rs * 0.5, y + rs * 0.8, x - rs * 0.5, y + rs * 0.8, x - rs * 0.86, y - rs * 0.2]); }
      var trunk = path('wd', 'M62 172Q80 140 74 96Q70 70 58 60L80 74L92 56L100 76L112 54L120 74L142 60Q130 70 126 96Q120 140 138 172Z') + path('w', 'M100 76L112 54L120 74L142 60Q130 70 126 96Q120 140 138 172H100Z', true) + line('M80 170Q88 130 82 92M94 170Q98 130 92 96M112 170Q108 130 112 96M124 170Q116 130 118 96');
      return trunk + leaves + door(88, 136, 24, 36, 'g') + win(82, 104, 12, 16, true) + win(108, 92, 12, 16, true) + win(112, 118, 10, 14, true) + spot('#ffd75a', 40, 62, 2.6) + spot('#ffd75a', 160, 58, 2.6) + spot('#ffffff', 100, 30, 2) + spot('#ff8ad1', 66, 40, 2.2) + spot('#ff8ad1', 136, 44, 2.2) + shape('wd', [30, 90, 58, 90, 58, 93, 30, 93], true) + shape('wd', [142, 90, 170, 90, 170, 93, 142, 93], true) + cone(44, 90, 12, 72, 36) + cone(156, 90, 12, 72, 37);
    },
    c4: function () {
      var fence = '', r = rnd(38);
      function stake(x, h) { return shape(WOOD[Math.floor(r() * 4)], [x, 172, x + 13, 172, x + 13, 172 - h, x + 6.5, 172 - h - 12, x, 172 - h]) + shape('md', [x, 172 - h * 0.7, x + 13, 172 - h * 0.7, x + 13, 172 - h * 0.62, x, 172 - h * 0.62], true); }
      for (var i = 0; i < 4; i++) fence += stake(4 + i * 13, 38 + r() * 8) + stake(144 + i * 13, 38 + r() * 8);
      var tent = shape('g', [40, 150, 100, 40, 100, 150]) + shape('d', [160, 150, 100, 40, 100, 150]) + shape('l', [64, 150, 100, 40, 80, 150], true) + shape('d', [122, 150, 100, 40, 140, 150], true) + shape('#120e0a', [82, 150, 100, 92, 118, 150]) + shape('wd', [98, 40, 102, 40, 102, 16, 98, 16], true) + path('g', 'M102 16Q122 18 130 24Q118 26 102 32Z');
      return tent + fence + disc('b', 100, 92, 11) + shape('b', [94, 100, 106, 100, 104, 108, 96, 108], true) + shape('k', [93, 88, 98, 88, 98, 94, 93, 94], true) + shape('k', [102, 88, 107, 88, 107, 94, 102, 94], true) + line('M98 102V108M102 102V108') + shape('b', [78, 92, 66, 84, 80, 86], true) + shape('b', [122, 92, 134, 84, 120, 86], true) + planks(64, 150, 72, 22, WOOD, 19, true, 7) + shape('#120e0a', [86, 172, 114, 172, 114, 152, 86, 152]) + torch(58, 150) + torch(142, 150) + banner(30, 104, 14, 24) + banner(170, 104, 14, 24);
    },
    c5: function () {
      function tusk(x, flip) { return path('b', 'M' + x + ' 172Q' + (x + 6 * flip) + ' 130 ' + (x + 26 * flip) + ' 104Q' + (x + 18 * flip) + ' 140 ' + (x + 16 * flip) + ' 172Z') + line('M' + (x + 4 * flip) + ' 160H' + (x + 15 * flip) + 'M' + (x + 8 * flip) + ' 142H' + (x + 18 * flip)); }
      return rocks(100, 172, 96, 51, ['#0b7c80', '#16a8a0', '#3f6f6a', '#2f5a58', '#16c7c0']) + path('#120e0a', 'M52 172Q50 104 100 94Q150 104 148 172Z') + spot('#ffd75a', 88, 128, 2.8) + spot('#ffd75a', 112, 128, 2.8) + tusk(50, 1) + tusk(150, -1) + tusk(72, 1) + tusk(128, -1) + disc('b', 100, 72, 15) + shape('b', [90, 82, 110, 82, 108, 94, 92, 94]) + shape('k', [90, 66, 97, 66, 97, 75, 90, 75], true) + shape('k', [103, 66, 110, 66, 110, 75, 103, 75], true) + line('M96 84V94M100 84V94M104 84V94') + shape('b', [86, 62, 70, 44, 90, 54]) + shape('b', [114, 62, 130, 44, 110, 54]) + path('#3fd4c4', 'M0 172Q30 162 62 172Z', true) + path('#3fd4c4', 'M138 172Q170 162 200 172Z', true) + shape('b', [22, 172, 24, 150, 28, 172], true) + shape('b', [172, 172, 176, 148, 180, 172], true);
    },
    c6: function () {
      function gear(x, y, R, c) { var s = '', i; for (i = 0; i < 8; i++) { var a = i / 8 * 6.2832; s += shape(c, [x + Math.cos(a - 0.26) * R * 0.8, y + Math.sin(a - 0.26) * R * 0.8, x + Math.cos(a - 0.16) * R * 1.2, y + Math.sin(a - 0.16) * R * 1.2, x + Math.cos(a + 0.16) * R * 1.2, y + Math.sin(a + 0.16) * R * 1.2, x + Math.cos(a + 0.26) * R * 0.8, y + Math.sin(a + 0.26) * R * 0.8], true); } return s + disc(c, x, y, R * 0.86) + disc('#2a241e', x, y, R * 0.3, true); }
      return planks(22, 110, 80, 62, WOOD, 25, false, 9) + planks(88, 74, 76, 98, ['#8f8f4a', '#77783d', '#a6a658'], 26, true, 10) + shape('md', [84, 70, 168, 66, 170, 76, 84, 78]) + shape('g', [20, 104, 104, 96, 108, 112, 18, 118]) + shape('d', [34, 62, 106, 54, 108, 94, 32, 98]) + line('M44 62L44 96M60 60L60 96M76 58L76 94M92 56L92 94') + shape('#ff8a1e', [36, 72, 50, 70, 50, 84, 36, 86], true) + stones(136, 20, 14, 48, DARK, 27, 6, 7) + shape('sd', [132, 20, 154, 20, 154, 14, 132, 14]) + gear(58, 142, 20, 'md') + gear(170, 148, 18, 'y') + gear(150, 110, 12, 'md') + door(106, 132, 28, 40, 'wd') + win(102, 92, 16, 16, false) + win(136, 92, 14, 16, false) + shape('md', [4, 172, 16, 172, 16, 124, 4, 124]) + disc('#e0263c', 10, 118, 6) + crate(182, 172, 1) + barrel(14, 172, 1);
    },
    c7: function () {
      function spire(x, w, top, seed) { return stones(x, top + 30, w, 172 - top - 30, DARK, seed, 7, 9) + tiles(x - 2, x + w + 2, top + 32, top - 18, w / 2 + 2, seed, ['d', 'g', 'd', 'k']); }
      return spire(10, 34, 70, 41) + spire(156, 34, 70, 42) + stones(44, 78, 112, 94, ['#5d4f7c', '#4a3e68', '#6f6090', '#3f3458'], 43, 8, 12) + tiles(38, 162, 80, 14, 62, 44, ['d', 'g', 'd', 'k']) + disc('wd', 100, 92, 18) + disc('g', 100, 92, 15, true) + line('M100 77V107M85 92H115M89 81L111 103M111 81L89 103') + disc('l', 100, 92, 4, true) + door(82, 124, 36, 48, 'd') + win(56, 104, 14, 40, true, 'g') + win(130, 104, 14, 40, true, 'g') + path('#b6adcf', 'M2 172V158Q8 150 14 158V172Z', true) + path('#b6adcf', 'M186 172V158Q192 150 198 158V172Z', true) + spot('#b070ff', 22, 88, 2) + spot('#b070ff', 178, 88, 2);
    },
    c8: function () {
      var r = rnd(55), ash = '';
      for (var i = 0; i < 9; i++) ash += spot('#ffb02e', 80 + r() * 40, 8 + r() * 26, 1 + r() * 1.3);
      return ash + path('#6f4636', 'M2 172L60 44H140L198 172Z') + shape('#5a3a30', [100, 44, 140, 44, 198, 172, 120, 172], true) + shape('#8a5a42', [60, 44, 100, 44, 74, 172, 2, 172], true) + path('#120e0a', 'M58 44Q100 62 142 44Q100 30 58 44Z') + path('#ff8a1e', 'M72 46Q100 58 128 46Q100 38 72 46Z', true) + path('#ff6a1a', 'M90 50Q84 108 66 172H134Q116 108 110 50Z', true) + path('#ffd75a', 'M96 52Q94 110 84 172H116Q106 110 104 52Z', true) + path('#fff3b0', 'M99 56Q99 110 95 172H105Q101 110 101 56Z', true) + line('M36 110L50 130L42 150M162 104L150 128L160 150M26 150L36 164M174 150L166 164') + path('wd', 'M6 172Q30 150 56 172Z') + path('l', 'M18 170Q18 152 28 152Q38 152 38 170Z', true) + spot('#ffffff', 25, 158, 1.4) + path('wd', 'M144 172Q170 150 194 172Z') + path('l', 'M160 170Q160 152 170 152Q180 152 180 170Z', true) + spot('#ffffff', 167, 158, 1.4) + shape('d', [60, 44, 52, 30, 70, 42]) + shape('d', [140, 44, 148, 30, 130, 42]);
    }
  };

  // Décors à défricher
  var DECOR = {
    dcTree: function () { return path('w', 'M22 58V34H30V58Z') + (function () { var r = rnd(61), s = '', cols = ['#2f8a3a', '#3fbe58', '#57d06a', '#1f7a30']; for (var i = 0; i < 14; i++) { var a = r() * 6.2832, d = Math.sqrt(r()), x = 26 + Math.cos(a) * d * 17, y = 20 + Math.sin(a) * d * 16, rs = 5 + r() * 3; s += shape(cols[Math.floor(r() * (y < 18 ? 3 : 4))], [x, y - rs, x + rs, y + rs * 0.5, x - rs, y + rs * 0.5], true); } return s; })(); },
    dcRock: function () { return shape('#c3bcc9', [14, 26, 28, 14, 30, 34, 16, 40], true) + shape('#8f8ca0', [6, 54, 14, 26, 16, 40, 18, 54], true) + shape('#a9a6bd', [16, 40, 30, 34, 34, 54, 18, 54], true) + shape('#77748a', [28, 14, 44, 28, 40, 40, 30, 34], true) + shape('#5f5c72', [30, 34, 40, 40, 48, 54, 34, 54], true); },
    dcBush: function () { return (function () { var r = rnd(63), s = '', cols = ['#57b84a', '#2f8a3a', '#7fd060', '#3fa040']; for (var i = 0; i < 12; i++) { var x = 8 + r() * 36, y = 30 + r() * 20, rs = 5 + r() * 3; s += shape(cols[Math.floor(r() * 4)], [x, y - rs, x + rs, y + rs * 0.6, x - rs, y + rs * 0.6], true); } return s; })() + '<circle fill="#ff8ad1" cx="18" cy="38" r="2.6"></circle><circle fill="#ffd75a" cx="34" cy="40" r="2.6"></circle><circle fill="#ff8ad1" cx="26" cy="33" r="2"></circle>'; }
  };

  // Armes : gravures, fils de garde, gemmes et reliefs ajoutés aux formes de base
  function q0(c, d) { return '<path class="q ' + c + '" d="' + d + '"></path>'; }
  function wrap(y0, y1, x0, x1) { var s = '', y; for (y = y0; y < y1; y += 3.4) s += '<path class="q n" d="M' + x0 + ' ' + n(y) + 'L' + x1 + ' ' + n(y + 1.4) + '"></path>'; return s; }
  function gem(x, y, r, c) { return '<circle class="q ' + (c || 'l') + '" cx="' + x + '" cy="' + y + '" r="' + r + '"></circle><circle fill="#fff" cx="' + n(x - r * 0.3) + '" cy="' + n(y - r * 0.3) + '" r="' + n(r * 0.3) + '"></circle>'; }
  var WDET = {
    wsw: q0('l', 'M39 10H41V50H39Z') + q0('y', 'M36 52H44V58H36Z') + gem(40, 55, 2) + wrap(60, 71, 36, 44),
    wfb: q0('l', 'M40 22Q38 30 40 38Q42 30 40 22Z') + gem(40, 57, 2.2) + wrap(62, 75, 36, 44),
    wci: q0('md', 'M40 52Q30 30 48 12Q42 30 43 52Z') + q0('y', 'M34 54H48V60H34Z') + wrap(62, 75, 36, 44),
    wcv: '<path class="q n" d="M42 8Q50 26 42 52M42 20L46 24M44 32L48 34M43 42L47 44"></path>' + gem(40, 54, 2.4, 'y') + wrap(60, 75, 37, 43),
    wdg: q0('l', 'M39 32H41V52H39Z') + gem(40, 56, 1.8) + wrap(60, 73, 36, 44),
    wax: q0('md', 'M45 13Q64 11 68 30Q56 25 45 28Z') + q0('y', 'M52 18L56 22L52 26L48 22Z') + wrap(36, 76, 37, 43),
    wdx: q0('l', 'M45 12Q66 8 72 32Q58 24 45 28Z') + q0('m', 'M35 12Q14 8 8 32Q22 24 35 28Z') + q0('y', 'M56 16L60 20L56 24L52 20Z') + q0('y', 'M24 16L28 20L24 24L20 20Z') + wrap(36, 76, 37, 43),
    wmc: '<path class="q n" d="M32 4L40 12L48 4M20 14L32 21M60 14L48 21M20 28L32 21M60 28L48 21M32 38L40 30L48 38"></path>' + gem(40, 21, 2.6, 'y') + wrap(42, 76, 36, 44),
    whm: q0('sd', 'M12 6H20V34H12Z') + q0('sd', 'M60 6H68V34H60Z') + '<circle fill="#ffd75a" cx="16" cy="11" r="1.4"></circle><circle fill="#ffd75a" cx="16" cy="29" r="1.4"></circle><circle fill="#ffd75a" cx="64" cy="11" r="1.4"></circle><circle fill="#ffd75a" cx="64" cy="29" r="1.4"></circle>' + q0('l', 'M40 15L45 20L40 25L35 20Z') + wrap(38, 76, 36, 44),
    wcl: '<path class="q n" d="M34 14Q36 30 38 50M46 12Q44 30 42 50M40 18V40"></path>' + q0('wd', 'M34 58H46L47 63H33Z'),
    wbn: '<path class="q n" d="M38 40L41 48L38 56L41 66M46 12L43 16L45 20"></path>' + q0('wd', 'M34 64H46V70H34Z'),
    wfl: gem(58, 24, 2.6, 'y'),
    wsp: q0('l', 'M39 8H41V24H39Z') + q0('y', 'M35 30H45V34H35Z') + wrap(44, 76, 37, 43),
    wtr: '<path class="q n" d="M26 10L28 24M40 8V30M54 10L52 24"></path>' + q0('y', 'M34 34H46V38H34Z') + wrap(44, 76, 37, 43),
    wha: q0('l', 'M46 19Q60 20 63 31Q53 33 46 31Z') + q0('y', 'M36 30H44V34H36Z') + wrap(40, 76, 37, 43),
    wsc: q0('md', 'M42 10Q24 8 12 24Q26 13 42 16Z') + wrap(48, 76, 36, 44),
    wja: q0('md', 'M40 4L43 16H40Z') + wrap(30, 60, 38, 42),
    wcb: q0('md', 'M36 24H44V40H36Z') + q0('y', 'M38 52H42V56H38Z') + wrap(58, 74, 36, 44),
    wbl: q0('y', 'M33 8H47L45 12H35Z') + q0('y', 'M34 40H46V44H34Z') + wrap(54, 74, 38, 50),
    wsb: wrap(24, 54, 37, 43),
    wbm: q0('sd', 'M24 58Q30 68 42 68Q32 64 28 52Z') + '<circle fill="#ffffff" cx="31" cy="43" r="1.6"></circle>',
    wro: '<path class="q n" d="M26 22L44 42L34 72M44 42L16 52M44 42L64 64"></path>',
    wst: '<path class="q n" d="M36 10L40 18L44 10M28 16H52M34 24L40 18L46 24"></path>' + '<circle fill="#ffffff" cx="35" cy="11" r="1.2"></circle>' + q0('y', 'M36 32H44L43 38H37Z') + wrap(42, 74, 37, 43),
    wsk: gem(28, 12, 1.8, 'l') + gem(52, 12, 1.8, 'l') + '<circle fill="#ffffff" cx="38" cy="18" r="1.5"></circle>' + q0('l', 'M36 42H44V46H36Z') + q0('l', 'M36 60H44V64H36Z') + '<circle class="q y" cx="40" cy="78" r="3"></circle>'
  };
  Object.keys(WDET).forEach(function (id) {
    window.GV_SPRITES = window.GV_SPRITES.replace(new RegExp('(<symbol id="' + id + '"[\\s\\S]*?)</symbol>'), function (m, head) { return head + WDET[id] + '</symbol>'; });
  });

  function replace(id, inner, vb) {
    var re = new RegExp('<symbol id="' + id + '"[\\s\\S]*?</symbol>');
    var sym = '<symbol id="' + id + '" viewBox="' + vb + '">' + inner + '</symbol>';
    if (re.test(window.GV_SPRITES)) window.GV_SPRITES = window.GV_SPRITES.replace(re, function () { return sym; });
    else window.GV_SPRITES += sym;
  }
  Object.keys(B).forEach(function (id) { replace(id, B[id](), '0 0 200 180'); });
  Object.keys(DECOR).forEach(function (id) { replace(id, DECOR[id](), '0 0 52 58'); });
})();
