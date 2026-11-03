// Terrains de bataille : le sol est un vrai vitrail, chaque pièce de verre prend la couleur de ce qui s'y trouve.
// Les zones servent à la fois au dessin et aux règles : ce que le joueur voit est ce qui agit sur ses unités.
(function () {
  var W = 80, H = 60, SCALE = 2;

  // Effets en jeu de chaque type de sol
  var KINDS = {
    ground: { speed: 1 },
    road: { speed: 1.2 },
    bridge: { speed: 1 },
    water: { speed: 0.5 },
    bog: { speed: 0.45 },
    rough: { speed: 0.75 },
    cover: { speed: 0.9, cover: 0.7 },
    lava: { speed: 0.8, burn: 0.03 },
    acid: { speed: 0.85, burn: 0.015 },
    light: { speed: 1, heal: 0.012 }
  };

  var GLASS = {
    water: ['#2b9fd6', '#1f7fc0', '#5cc6ea', '#3fb4e0'],
    bog: ['#1e8f7c', '#16705f', '#2fae94', '#4b8f4f'],
    lava: ['#ff6a1a', '#ffb02e', '#e0261c', '#ff8a1e'],
    acid: ['#c6e32a', '#9fdc1e', '#e4f25a', '#7fc21a']
  };

  function band(kind, pts, w) { return { t: 'b', kind: kind, pts: pts, w: w }; }
  function disc(kind, x, y, r) { return { t: 'c', kind: kind, x: x, y: y, r: r }; }

  var MAPS = [
    {
      name: 'Plaine des Rois', home: 0, bg: '#0a1a2c',
      rule: 'La rivière ralentit. Le pont et la route accélèrent. Humains : +10 % d’attaque.',
      ground: ['#6fbe3e', '#57a82f', '#8bd24a', '#4b9a2f', '#a4dc5a'],
      palette: { road: ['#e3c27a', '#cfa95f', '#efd795'], bridge: ['#c9c6d8', '#a9a6bd', '#dfddea'], rough: ['#8a9a4a', '#a1ad57'] },
      zones: [band('road', [[-2, 15], [12, 13], [28, 17], [42, 15]], 2.2), band('water', [[21, -2], [17, 8], [22, 15], [18, 23], [21, 32]], 3.4), band('bridge', [[15.5, 14.2], [25.5, 15.8]], 3)],
      props: [['castle', 6, 4, 3.4], ['oak', 12, 3.5, 2], ['oak', 3, 9, 1.8], ['oak', 30, 4, 2.2], ['oak', 36, 8, 1.9], ['banner', 15, 5, 1.2], ['oak', 5, 27, 2.2], ['oak', 13, 27, 1.7], ['rock', 28, 27, 1], ['oak', 34, 26, 2.3], ['castle', 34, 29.2, 2.2], ['banner', 25, 26, 1.1]]
    },
    {
      name: 'Cols de l’Enclume', home: 1, bg: '#1c1006',
      rule: 'Les éboulis ralentissent. La voie de la mine accélère. Nains : +10 % d’attaque.',
      ground: ['#b5853f', '#9c6f30', '#c99a4c', '#87602b', '#d8ae62'],
      palette: { road: ['#6f5a46', '#5a4838', '#83705a'], rough: ['#8a8378', '#6f6a60', '#a39b8d'] },
      zones: [disc('rough', 10, 8, 5), disc('rough', 30, 22, 5.5), disc('rough', 22, 3, 4), disc('rough', 18, 27, 4), band('road', [[-2, 22], [12, 18], [20, 15], [28, 12], [42, 7]], 2)],
      props: [['mountain', 6, 6, 5], ['mountain', 16, 4.5, 4], ['mountain', 34, 5, 5.5], ['mountain', 27, 3.5, 3.4], ['crystal', 12, 9, 1.3, '#ffb02e'], ['crystal', 30, 21, 1.5, '#ffb02e'], ['rock', 8, 25, 1.4], ['rock', 21, 26, 1.1], ['mountain', 36, 29, 3.6], ['mountain', 4, 29.5, 3.2], ['crystal', 26, 27, 1.1, '#ffd680'], ['rock', 33, 16, 1]]
    },
    {
      name: 'Bois d’Émeraude', home: 2, bg: '#04170e',
      rule: 'Les sous-bois protègent : 30 % de dégâts en moins contre les tirs. Elfes : +10 % d’attaque.',
      ground: ['#2fae66', '#1f9455', '#46c67c', '#7bd98f', '#178148'],
      palette: { cover: ['#0f6a3c', '#0c5a32', '#157a46', '#1a8a50'], road: ['#b8d98a', '#cfe7a0'] },
      zones: [disc('cover', 9, 7, 6), disc('cover', 31, 23, 6), disc('cover', 21, 3, 5), disc('cover', 20, 27, 5), disc('cover', 7, 24, 5), disc('cover', 33, 6, 5.5), band('road', [[16, 15], [24, 15]], 3)],
      props: [['elm', 6, 7, 3], ['elm', 12, 6, 2.5], ['elm', 9, 11, 2.3], ['elm', 19, 4, 2.8], ['elm', 25, 3.4, 2.2], ['elm', 31, 6, 3], ['elm', 36, 9, 2.6], ['elm', 6, 26, 2.8], ['elm', 10, 28, 2.2], ['elm', 18, 28.6, 2.6], ['elm', 24, 28.4, 2.2], ['elm', 29, 25, 2.8], ['elm', 35, 27, 3], ['mushroom', 16, 12, 0.9], ['mushroom', 25, 19, 1], ['crystal', 20, 15.5, 1.5, '#9af0c0']]
    },
    {
      name: 'Steppe de Sang', home: 3, bg: '#1e0608',
      rule: 'Terre de guerre : toutes les unités ont +10 % d’attaque. Orques : +10 % de plus.',
      ground: ['#c9472f', '#a93524', '#df6a3f', '#8e2a1f', '#e88a4e'],
      palette: { road: ['#6b1f1a', '#54181a', '#7f2a20'], rough: ['#efb06a', '#d99450'] },
      zones: [band('road', [[-2, 8], [14, 12], [26, 18], [42, 22]], 2.2), disc('rough', 28, 6, 4.5), disc('rough', 12, 24, 4.5)],
      props: [['bones', 8, 5, 2.6], ['bones', 32, 26, 2.8], ['spike', 16, 4, 1.8], ['spike', 18.5, 5, 1.3], ['tent', 5, 26, 2.6], ['tent', 34, 6.5, 2.6], ['banner', 10, 27, 1.3], ['banner', 30, 8, 1.3], ['spike', 24, 27, 1.6], ['rock', 37, 14, 1.2], ['rock', 3, 14, 1.1]]
    },
    {
      name: 'Marais Turquoise', home: 4, bg: '#031a1a',
      rule: 'La vase ralentit de moitié. Trolls : +10 % d’attaque.',
      ground: ['#5c9a6a', '#477f57', '#74ae72', '#3a6f50', '#8fbf7a'],
      palette: { road: ['#a8b88a', '#90a278'] },
      zones: [disc('bog', 14, 10, 6), disc('bog', 26, 20, 6.5), disc('bog', 20, 1, 5), disc('bog', 6, 25, 5), disc('bog', 34, 5, 5), band('road', [[-2, 17], [10, 18], [17, 15], [23, 13], [32, 13], [42, 12]], 1.8)],
      props: [['mangrove', 5, 7, 2.8], ['mangrove', 24, 6, 2.4], ['mangrove', 35, 16, 2.6], ['mangrove', 14, 26, 2.6], ['mangrove', 36, 27, 2.8], ['lily', 13, 9, 1], ['lily', 16, 12, 0.8], ['lily', 26, 21, 1], ['lily', 23, 18, 0.8], ['lily', 7, 25, 0.9], ['mushroom', 20, 26, 1], ['bones', 8, 16, 1.6]]
    },
    {
      name: 'Décharge Citrine', home: 5, bg: '#141704',
      rule: 'L’acide ronge les unités qui le traversent. Gobelins : +10 % d’attaque.',
      ground: ['#8f8f4a', '#77783d', '#a6a658', '#646533', '#bcbc6a'],
      palette: { rough: ['#6e6658', '#857b69', '#5a5448'], road: ['#c7b98a', '#d9cc9f'] },
      zones: [disc('rough', 8, 7, 5), disc('rough', 32, 23, 5), disc('rough', 30, 5, 4), disc('rough', 9, 25, 4), disc('acid', 20, 15, 4.2), disc('acid', 12, 3, 3), disc('acid', 28, 27, 3)],
      props: [['scrap', 6, 7, 2.6], ['gear', 11, 10, 1.7], ['scrap', 32, 5, 2.4], ['gear', 28, 8, 1.3], ['scrap', 8, 27, 2.6], ['gear', 14, 25, 1.4], ['scrap', 34, 26, 2.8], ['gear', 30, 21, 1.7], ['spike', 20, 4, 1.2], ['spike', 21, 26, 1.2]]
    },
    {
      name: 'Cimetière d’Améthyste', home: 6, bg: '#10061f',
      rule: 'Les morts remontent plus vite : relève à 40 %. Morts-Vivants : +10 % d’attaque.',
      ground: ['#5b3a8e', '#4a2e78', '#6f49a8', '#3b2466', '#8560bd'],
      palette: { road: ['#a79ac0', '#8f80ad', '#bcb0d2'], rough: ['#2f1d55', '#3a2564'], cover: ['#2a1a4c', '#352160'] },
      zones: [band('road', [[-2, 15], [40, 15]], 2), band('road', [[20, -2], [20, 32]], 2), disc('cover', 9, 7, 4.5), disc('cover', 31, 7, 4.5), disc('cover', 9, 23, 4.5), disc('cover', 31, 23, 4.5)],
      props: [['tomb', 6, 6, 1.5], ['tomb', 10, 6, 1.5], ['tomb', 8, 10, 1.5], ['tomb', 12, 9.6, 1.3], ['tomb', 29, 6, 1.5], ['tomb', 33, 6, 1.5], ['tomb', 31, 10, 1.5], ['deadtree', 16, 5, 2.4], ['deadtree', 25, 26, 2.4], ['tomb', 6, 23, 1.5], ['tomb', 10, 23, 1.5], ['tomb', 8, 27, 1.5], ['tomb', 29, 23, 1.5], ['tomb', 33, 23, 1.5], ['tomb', 31, 27, 1.5], ['ruin', 20, 2.6, 2.6], ['crystal', 20, 15.6, 1.4, '#d2aaff']]
    },
    {
      name: 'Caldeira', home: 7, bg: '#1b0603',
      rule: 'La lave brûle vite : passez par les ponts d’obsidienne. Drakéides : +10 % d’attaque.',
      ground: ['#3a3038', '#2b242c', '#4a3f48', '#221c24', '#5a4c52'],
      palette: { bridge: ['#15111a', '#1f1a26', '#2a2432'], rough: ['#5a3a30', '#6f4636'] },
      zones: [band('lava', [[13, -2], [17, 8], [12, 16], [16, 24], [12, 32]], 2.6), band('lava', [[28, -2], [24, 7], [29, 15], [24, 23], [28, 32]], 2.6), band('bridge', [[7, 11], [20, 11]], 3), band('bridge', [[7, 21], [20, 21]], 3), band('bridge', [[20, 9], [33, 9]], 3), band('bridge', [[20, 19], [33, 19]], 3), disc('rough', 20, 15, 3)],
      props: [['spire', 5, 7, 2.6], ['spire', 8, 3.5, 1.8], ['spire', 35, 6, 2.8], ['spire', 34, 24, 2.4], ['spire', 5, 26, 2.4], ['spire', 20, 4, 2], ['spire', 20, 28, 2.2], ['crystal', 37, 15, 1.4, '#ff8a1e'], ['crystal', 3, 16, 1.4, '#ff8a1e']]
    },
    {
      name: 'Nef Brisée', home: -1, bg: '#0a0810',
      rule: 'Au cœur de la rosace, la lumière soigne toutes les unités. Terrain neutre.',
      ground: ['#3a3050', '#2c2440', '#4a3f66', '#231c34', '#58497a'],
      palette: { road: ['#d9b94a', '#ffd75a', '#b89a3a'], rough: ['#2a2238', '#332a44'] },
      zones: [band('road', [[-2, 15], [42, 15]], 2.6), disc('light', 20, 15, 7)],
      rosette: true,
      props: [['shard', 6, 7, 3, '#2f6bff'], ['shard', 12, 4, 2.2, '#f0a020'], ['shard', 28, 4, 2.2, '#1fc46f'], ['shard', 34, 7, 3, '#e0263c'], ['shard', 6, 27, 2.8, '#16c7c0'], ['shard', 13, 28, 2.2, '#c6d92a'], ['shard', 27, 28, 2.2, '#9a4dff'], ['shard', 34, 27, 2.8, '#ff6a1a'], ['ruin', 20, 3, 3], ['ruin', 20, 29, 3]]
    }
  ];

  // Les cartes sont décrites à petite échelle puis agrandies : plus de place pour manœuvrer, et de nouveaux décors semés partout
  MAPS.forEach(function (m, id) {
    m.zones.forEach(function (z) {
      if (z.t === 'c') { z.x *= SCALE; z.y *= SCALE; z.r *= SCALE; }
      else { z.w *= 1.6; z.pts = z.pts.map(function (q) { return [q[0] * SCALE, q[1] * SCALE]; }); }
    });
    m.props.forEach(function (q) { q[1] *= SCALE; q[2] *= SCALE; });
    var kinds = m.props.filter(function (q) { return q[3] <= 3.4 && q[0] !== 'castle' && q[0] !== 'tent' && q[0] !== 'ruin' && q[0] !== 'banner'; });
    if (!kinds.length) return;
    var r = window.GVB.rng32(id * 977 + 13), extra = [];
    for (var i = 0; i < 46; i++) {
      var base = kinds[Math.floor(r() * kinds.length)], x = 3 + r() * (W - 6), y = 4 + r() * (H - 7), kd = kindAt(id, x, y);
      if (kd === 'road' || kd === 'water' || kd === 'bridge' || kd === 'lava' || kd === 'acid' || kd === 'light') continue;
      if (base[0] === 'lily' && kd !== 'bog') continue;
      if (extra.some(function (e) { return (e[1] - x) * (e[1] - x) + (e[2] - y) * (e[2] - y) < 22; })) continue;
      extra.push(base[4] ? [base[0], x, y, base[3] * (0.65 + r() * 0.5), base[4]] : [base[0], x, y, base[3] * (0.65 + r() * 0.5)]);
    }
    m.props = m.props.concat(extra);
  });

  function distToBand(z, x, y) {
    var best = Infinity;
    for (var i = 0; i < z.pts.length - 1; i++) {
      var a = z.pts[i], b = z.pts[i + 1];
      var dx = b[0] - a[0], dy = b[1] - a[1];
      var k = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy);
      k = k < 0 ? 0 : (k > 1 ? 1 : k);
      var ex = a[0] + dx * k - x, ey = a[1] + dy * k - y;
      var d = ex * ex + ey * ey;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }

  // La dernière zone déclarée passe devant les autres
  function kindAt(map, x, y) {
    var zs = MAPS[map].zones;
    for (var i = zs.length - 1; i >= 0; i--) {
      var z = zs[i];
      if (z.t === 'c') {
        var dx = z.x - x, dy = z.y - y;
        if (dx * dx + dy * dy <= z.r * z.r) return z.kind;
      } else if (distToBand(z, x, y) <= z.w / 2) return z.kind;
    }
    return 'ground';
  }

  // --- Dessin ---
  var LEAD = '#120e0a';

  function poly(c, pts, fill) {
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.stroke();
  }
  function blob(c, x, y, r, fill) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    c.stroke();
  }

  // Feuillage en facettes triangulaires, chacune de son vert
  function foliage(c, cx, cy, rx, ry, cols) {
    var r = window.GVB.rng32(Math.round(rx * 1000) + 7), rings = [[1, 11], [0.68, 8], [0.34, 5]];
    var body = [];
    for (var b0 = 0; b0 < 14; b0++) { var ab = b0 / 14 * 6.2832, rb = b0 % 2 ? 1.04 : 0.92; body.push(cx + Math.cos(ab) * rx * rb, cy + Math.sin(ab) * ry * rb); }
    poly(c, body, cols[0]);
    rings.forEach(function (rg, ri) {
      for (var i = 0; i < rg[1]; i++) {
        var a0 = (i + ri * 0.4) / rg[1] * 6.2832, a1 = (i + 1 + ri * 0.4) / rg[1] * 6.2832, am = (a0 + a1) / 2;
        var o = rg[0] * (0.82 + r() * 0.14), inner = Math.max(0, rg[0] - 0.36);
        var up = Math.max(0, -Math.sin(am));
        var col = cols[Math.min(cols.length - 1, Math.floor(up * 2.2 + ri * 0.9 + r() * 1.2))];
        poly(c, [cx + Math.cos(a0) * rx * inner, cy + Math.sin(a0) * ry * inner, cx + Math.cos(am) * rx * o, cy + Math.sin(am) * ry * o, cx + Math.cos(a1) * rx * inner, cy + Math.sin(a1) * ry * inner], col);
      }
    });
    for (var k = 0; k < 4; k++) { var an = r() * 6.28, d = r() * 0.8; poly(c, [cx + Math.cos(an) * rx * d - 0.04, cy + Math.sin(an) * ry * d, cx + Math.cos(an) * rx * d, cy + Math.sin(an) * ry * d - 0.05, cx + Math.cos(an) * rx * d + 0.04, cy + Math.sin(an) * ry * d], cols[3] || cols[0]); }
  }

  // Décors : l'origine est au pied de l'objet, 1 = la taille annoncée
  var PROPS = {
    oak: function (c) {
      poly(c, [-0.09, 0, 0.09, 0, 0.06, -0.42, -0.06, -0.42], '#7c4a22');
      poly(c, [0, 0, 0.09, 0, 0.06, -0.42, 0, -0.42], '#573214');
      foliage(c, 0, -0.68, 0.4, 0.34, ['#2c8a2e', '#3aa835', '#5fd04a', '#8ae25a', '#1f7a2a']);
    },
    elm: function (c) {
      poly(c, [-0.07, 0, 0.07, 0, 0.04, -0.4, -0.04, -0.4], '#6b3f1c');
      var tiers = [[-0.34, 0.34, 0.36], [-0.56, 0.27, 0.32], [-0.76, 0.19, 0.28]];
      tiers.forEach(function (t2) {
        poly(c, [-t2[1], t2[0], 0, t2[0] - t2[2], 0, t2[0] + 0.04], '#7bea9c');
        poly(c, [t2[1], t2[0], 0, t2[0] - t2[2], 0, t2[0] + 0.04], '#21b56a');
        poly(c, [-t2[1], t2[0], 0, t2[0] + 0.04, t2[1], t2[0], 0, t2[0] + 0.08], '#0c7a45');
      });
    },
    rock: function (c) {
      poly(c, [-0.5, 0, -0.36, -0.36, -0.14, -0.28, -0.1, 0], '#8f8ca0');
      poly(c, [-0.36, -0.36, -0.1, -0.58, 0.04, -0.34, -0.14, -0.28], '#c9c6d4');
      poly(c, [-0.14, -0.28, 0.04, -0.34, 0.14, 0, -0.1, 0], '#a5a2b6');
      poly(c, [0.04, -0.34, -0.1, -0.58, 0.28, -0.46, 0.34, -0.18], '#77748a');
      poly(c, [0.14, 0, 0.04, -0.34, 0.34, -0.18, 0.5, 0], '#5f5c72');
    },
    mountain: function (c) {
      poly(c, [-0.62, 0, -0.34, -0.42, -0.2, -0.1, -0.3, 0], '#8f7655');
      poly(c, [-0.34, -0.42, -0.08, -1, -0.02, -0.5, -0.2, -0.1], '#b89a72');
      poly(c, [-0.3, 0, -0.2, -0.1, -0.02, -0.5, 0.06, 0], '#a58a66');
      poly(c, [0.06, 0, -0.02, -0.5, 0.26, -0.3, 0.3, 0], '#7c6548');
      poly(c, [-0.02, -0.5, -0.08, -1, 0.3, -0.52, 0.26, -0.3], '#6b573f');
      poly(c, [0.3, 0, 0.26, -0.3, 0.3, -0.52, 0.6, 0], '#57462f');
      poly(c, [-0.08, -1, -0.26, -0.66, -0.13, -0.72, -0.05, -0.6, 0.06, -0.7, 0.16, -0.62], '#f7efd9');
      poly(c, [-0.08, -1, 0.16, -0.62, 0.06, -0.7], '#c9c3b0');
    },
    crystal: function (c, o) {
      var col = o || '#8fb8ff';
      poly(c, [-0.2, 0, -0.14, -0.72, 0, -1, 0, 0], '#ffffff');
      poly(c, [0, 0, 0, -1, 0.14, -0.72, 0.2, 0], col);
      poly(c, [0.2, 0, 0.26, -0.42, 0.42, -0.56, 0.42, 0], col);
    },
    ruin: function (c) {
      poly(c, [-0.5, 0, -0.5, -0.8, -0.3, -0.8, -0.3, 0], '#a9a6bd');
      poly(c, [0.3, 0, 0.3, -0.62, 0.5, -0.7, 0.5, 0], '#7f7c96');
      poly(c, [-0.5, -0.8, -0.3, -1, 0.04, -0.98, 0.1, -0.84, -0.3, -0.8], '#c9c6d8');
    },
    castle: function (c) {
      poly(c, [-0.32, 0, -0.32, -0.62, 0.32, -0.62, 0.32, 0], '#c9c6d8');
      poly(c, [0.04, 0, 0.04, -0.62, 0.32, -0.62, 0.32, 0], '#a9a6bd');
      poly(c, [-0.5, 0, -0.5, -0.56, -0.3, -0.56, -0.3, 0], '#dfddea');
      poly(c, [0.3, 0, 0.3, -0.56, 0.5, -0.56, 0.5, 0], '#a9a6bd');
      c.save(); c.globalAlpha = 0.55; c.lineWidth *= 0.6;
      [-0.1, -0.2, -0.3, -0.4, -0.5].forEach(function (yb, i) { c.beginPath(); c.moveTo(-0.5, yb); c.lineTo(0.5, yb); c.stroke(); for (var xb = -0.45 + (i % 2) * 0.05; xb < 0.5; xb += 0.1) { c.beginPath(); c.moveTo(xb, yb); c.lineTo(xb, yb + 0.1); c.stroke(); } });
      c.restore();
      poly(c, [-0.55, -0.56, -0.4, -0.9, -0.4, -0.56], '#2f6bff');
      poly(c, [-0.25, -0.56, -0.4, -0.9, -0.4, -0.56], '#163a9e');
      poly(c, [0.25, -0.56, 0.4, -0.9, 0.4, -0.56], '#2f6bff');
      poly(c, [0.55, -0.56, 0.4, -0.9, 0.4, -0.56], '#163a9e');
      poly(c, [-0.3, -0.62, 0, -1, 0, -0.62], '#ff4a5a');
      poly(c, [0.3, -0.62, 0, -1, 0, -0.62], '#b0142a');
      poly(c, [-0.09, 0, -0.09, -0.2, 0, -0.27, 0.09, -0.2, 0.09, 0], '#2a1a10');
      blob(c, -0.4, -0.42, 0.035, '#ffd75a'); blob(c, 0.4, -0.42, 0.035, '#ffd75a'); blob(c, 0, -0.44, 0.05, '#ffd75a');
    },
    banner: function (c) {
      poly(c, [-0.025, 0, 0.025, 0, 0.025, -1, -0.025, -1], '#6b3f1c');
      poly(c, [0.025, -1, 0.42, -0.86, 0.025, -0.68], '#ffd75a');
    },
    tent: function (c) {
      poly(c, [-0.5, 0, 0, -0.8, 0, 0], '#e0263c');
      poly(c, [0, 0, 0, -0.8, 0.5, 0], '#8c1024');
      poly(c, [-0.09, 0, 0, -0.34, 0.09, 0], '#120e0a');
    },
    bones: function (c) {
      c.save();
      c.lineWidth *= 1;
      for (var i = 0; i < 4; i++) {
        var x = -0.36 + i * 0.24;
        poly(c, [x - 0.05, 0, x - 0.1, -0.6 + i * 0.05, x + 0.04, -0.34, x + 0.05, 0], '#efe8d0');
      }
      c.restore();
    },
    spike: function (c) {
      poly(c, [-0.14, 0, 0, -1, 0, 0], '#efe8d0');
      poly(c, [0, 0, 0, -1, 0.14, 0], '#a8a08a');
    },
    mushroom: function (c) {
      poly(c, [-0.08, 0, 0.08, 0, 0.06, -0.36, -0.06, -0.36], '#f7efd9');
      poly(c, [-0.34, -0.36, -0.2, -0.66, 0.2, -0.66, 0.34, -0.36], '#e0263c');
      blob(c, -0.08, -0.5, 0.05, '#ffffff');
      blob(c, 0.12, -0.46, 0.04, '#ffffff');
    },
    mangrove: function (c) {
      poly(c, [-0.3, 0, -0.1, -0.42, 0.1, -0.42, 0.3, 0, 0.1, -0.2, 0, 0, -0.1, -0.2], '#4a3020');
      foliage(c, 0, -0.68, 0.46, 0.3, ['#0b7c80', '#16a8a0', '#3fd4c4', '#8cf0e0', '#086468']);
    },
    lily: function (c) {
      poly(c, [-0.34, -0.03, -0.17, -0.15, 0.2, -0.15, 0.34, -0.03, 0.17, 0.06, -0.17, 0.06], '#2fd07a');
      blob(c, 0, -0.1, 0.07, '#ff8ad1');
    },
    gear: function (c) {
      var pts = [], n = 16;
      for (var i = 0; i < n; i++) {
        var r = i % 2 ? 0.4 : 0.5, a = i / n * Math.PI * 2;
        pts.push(Math.cos(a) * r, -0.5 + Math.sin(a) * r);
      }
      poly(c, pts, '#c8ccd6');
      blob(c, 0, -0.5, 0.17, '#5f6470');
    },
    scrap: function (c) {
      poly(c, [-0.5, 0, -0.5, -0.4, -0.06, -0.46, -0.04, 0], '#a8662a');
      poly(c, [-0.04, 0, -0.06, -0.3, 0.46, -0.36, 0.5, 0], '#c6d92a');
      poly(c, [-0.34, -0.42, -0.26, -0.9, 0.12, -0.86, 0.1, -0.34], '#6f7396');
      poly(c, [-0.22, -0.8, 0.06, -0.77, 0.04, -0.64, -0.2, -0.67], '#ffb02e');
    },
    tomb: function (c) {
      poly(c, [-0.3, 0, -0.3, -0.62, -0.16, -0.82, 0.16, -0.82, 0.3, -0.62, 0.3, 0], '#b6adcf');
      poly(c, [0.06, 0, 0.06, -0.8, 0.16, -0.82, 0.3, -0.62, 0.3, 0], '#7e73a1');
      poly(c, [-0.04, -0.2, -0.04, -0.4, -0.13, -0.4, -0.13, -0.47, -0.04, -0.47, -0.04, -0.6, 0.03, -0.6, 0.03, -0.47, 0.12, -0.47, 0.12, -0.4, 0.03, -0.4, 0.03, -0.2], '#2a1a4c');
    },
    deadtree: function (c) {
      poly(c, [-0.08, 0, 0.08, 0, 0.04, -0.5, 0.3, -0.84, 0.25, -0.88, 0.01, -0.62, -0.02, -1, -0.07, -1, -0.05, -0.6, -0.3, -0.74, -0.33, -0.7, -0.05, -0.46], '#241435');
    },
    spire: function (c) {
      poly(c, [-0.3, 0, -0.1, -0.68, 0, -1, 0, 0], '#4a3f48');
      poly(c, [0, 0, 0, -1, 0.12, -0.6, 0.3, 0], '#1f1a26');
      poly(c, [-0.06, -0.08, -0.03, -0.46, 0.03, -0.26, 0.06, -0.08], '#ff8a1e');
    },
    shard: function (c, o) {
      var col = o || '#ffd75a';
      poly(c, [-0.18, 0, -0.34, -0.5, 0.02, -1, 0.02, 0], col);
      c.save(); c.globalAlpha = 0.45;
      poly(c, [-0.18, 0, -0.34, -0.5, -0.1, -0.5], '#ffffff');
      c.restore();
      c.save(); c.globalAlpha = 0.75;
      poly(c, [0.02, 0, 0.02, -1, 0.28, -0.42, 0.2, 0], '#120e0a');
      c.restore();
      poly(c, [0.02, -0.92, 0.26, -0.42, 0.18, 0, 0.02, 0], col);
    }
  };

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function m(v) { return Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }

  // Couleur de verre d'une pièce selon le type de sol sous son centre
  function glassFor(map, id, kind, x, y, rand) {
    if (map.rosette && kind === 'light') {
      var ang = Math.atan2(y - 30, x - 40);
      var colors = ['#2f6bff', '#f0a020', '#1fc46f', '#e0263c', '#16c7c0', '#c6d92a', '#9a4dff', '#ff6a1a'];
      var dist = Math.sqrt((x - 40) * (x - 40) + (y - 30) * (y - 30));
      if (dist < 3.2) return '#fff6c9';
      return colors[(Math.floor((ang + Math.PI) / (Math.PI / 4))) % 8];
    }
    var pal = (map.palette && map.palette[kind]) || GLASS[kind] || map.ground;
    return pal[Math.floor(rand() * pal.length)];
  }

  // Sites de Voronoï : une trame irrégulière, plus des paires de points le long des frontières pour que le plomb suive la rive
  function sitesOf(id) {
    var map = MAPS[id], rand = window.GVB.rng32(window.GVB.hashStr('sites' + id)), sites = [], pairs = [];
    function pair(x, y, nx, ny) { var o = 0.3; pairs.push([x + nx * o, y + ny * o], [x - nx * o, y - ny * o]); }
    map.zones.forEach(function (z) {
      if (z.t === 'c') {
        var count = Math.max(10, Math.round(z.r * 6.28 / 1.25));
        for (var i = 0; i < count; i++) { var a0 = i / count * 6.2832; pair(z.x + Math.cos(a0) * z.r, z.y + Math.sin(a0) * z.r, Math.cos(a0), Math.sin(a0)); }
      } else {
        for (var s = 0; s < z.pts.length - 1; s++) {
          var A = z.pts[s], B = z.pts[s + 1], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.sqrt(dx * dx + dy * dy), steps = Math.max(1, Math.round(L / 1.15));
          for (var j = 0; j <= steps; j++) {
            var x = A[0] + dx * j / steps, y = A[1] + dy * j / steps, nx = -dy / L, ny = dx / L;
            pair(x + nx * z.w / 2, y + ny * z.w / 2, nx, ny);
            pair(x - nx * z.w / 2, y - ny * z.w / 2, nx, ny);
            pairs.push([x, y]);
          }
        }
      }
    });
    if (map.rosette) {
      [2, 4.6, 7.4, 10.2, 13].forEach(function (r, ri) {
        var c = 8 + ri * 10;
        for (var k = 0; k < c; k++) { var an = (k + (ri % 2) * 0.5) / c * 6.2832; pairs.push([40 + Math.cos(an) * r, 30 + Math.sin(an) * r]); }
      });
      pairs.push([40, 30]);
    }
    // Grille de recherche
    var CELL = 2, GW = Math.ceil((W + 4) / CELL) + 2, GH = Math.ceil((H + 4) / CELL) + 2, near = [];
    for (var q = 0; q < GW * GH; q++) near.push(null);
    function occIdx(x, y) { return (Math.floor((y + 2) / 0.5) * ((W + 8) * 2) + Math.floor((x + 2) / 0.5)); }
    var occ = {};
    var seenP = {};
    pairs.forEach(function (p) {
      var hk = Math.round(p[0] * 8) + ':' + Math.round(p[1] * 8);
      if (seenP[hk]) return;
      seenP[hk] = 1;
      occ[occIdx(p[0], p[1])] = 1; sites.push(p);
    });
    var step = 1.5;
    for (var yy = -1; yy < H + 1; yy += step) for (var xx = -1; xx < W + 1; xx += step) {
      var px0 = xx + (rand() - 0.5) * step * 0.82, py0 = yy + (rand() - 0.5) * step * 0.82, clash = false;
      for (var o2 = -1; o2 <= 1 && !clash; o2++) for (var o3 = -1; o3 <= 1; o3++) if (occ[occIdx(px0 + o2 * 0.5, py0 + o3 * 0.5)]) { clash = true; break; }
      if (!clash) sites.push([px0, py0]);
    }
    function bucket(x, y) { return Math.max(0, Math.min(GH - 1, Math.floor((y + 2) / CELL))) * GW + Math.max(0, Math.min(GW - 1, Math.floor((x + 2) / CELL))); }
    sites.forEach(function (st, i) { var bk = bucket(st[0], st[1]); (near[bk] = near[bk] || []).push(i); });
    return { sites: sites, near: near, CELL: CELL, GW: GW, GH: GH };
  }
  function hexRGB(col) {
    if (col.charAt(0) === '#') { var v = parseInt(col.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
    var m = col.match(/\d+/g); return [+m[0], +m[1], +m[2]];
  }
  var bakes = {};
  // Cuit un terrain : couleurs, normales (x, y, épaisseur, brillance) et masque des sols animés
  function bake(id, cw, ch, rot) {
    var key = id + ':' + cw + ':' + ch + ':' + (rot ? 1 : 0);
    if (bakes[key]) return bakes[key];
    var map = MAPS[id], S = sitesOf(id), sites = S.sites, near = S.near, CELL = S.CELL, GW = S.GW, GH = S.GH;
    var rand = window.GVB.rng32(window.GVB.hashStr('bake' + id));
    var ns = sites.length, colR = new Float32Array(ns), colG = new Float32Array(ns), colB = new Float32Array(ns), gdx = new Float32Array(ns), gdy = new Float32Array(ns), kinds = new Uint8Array(ns), strk = new Float32Array(ns), i;
    for (i = 0; i < ns; i++) {
      var sx0 = sites[i][0], sy0 = sites[i][1], kd = kindAt(id, sx0, sy0), base = hexRGB(glassFor(map, id, kd, sx0, sy0, rand)), v = (rand() - 0.5) * 0.16;
      if (kd === 'ground' || kd === 'rough' || kd === 'cover' || kd === 'road') { var mixK = kd === 'ground' ? 0.5 : 0.3, palAll = (map.palette && map.palette[kd]) || map.ground, mR = 0, mG = 0, mB = 0; palAll.forEach(function (hx) { var q0 = hexRGB(hx); mR += q0[0]; mG += q0[1]; mB += q0[2]; }); base = [base[0] + (mR / palAll.length - base[0]) * mixK, base[1] + (mG / palAll.length - base[1]) * mixK, base[2] + (mB / palAll.length - base[2]) * mixK]; }
      colR[i] = base[0] * (1 + v); colG[i] = base[1] * (1 + v); colB[i] = base[2] * (1 + v);
      var an = rand() * 6.2832; gdx[i] = Math.cos(an); gdy[i] = Math.sin(an); strk[i] = rand() * 6.2832;
      kinds[i] = kd === 'water' ? 1 : (kd === 'bog' ? 2 : (kd === 'lava' ? 3 : (kd === 'acid' ? 4 : (kd === 'light' ? 5 : 0))));
    }
    // Bruit de texture du verre
    var NS = 128, nz = new Float32Array(NS * NS), nr = window.GVB.rng32(99);
    for (i = 0; i < NS * NS; i++) nz[i] = nr();
    function noise(x, y) {
      var ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; ix &= NS - 1; iy &= NS - 1;
      var jx = (ix + 1) & (NS - 1), jy = (iy + 1) & (NS - 1);
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      var a = nz[iy * NS + ix], b = nz[iy * NS + jx], c = nz[jy * NS + ix], d = nz[jy * NS + jx];
      return a + (b - a) * fx + (c - a + (a - b + d - c) * fx) * fy;
    }
    var pxN = cw * ch, edge = new Float32Array(pxN), owner = new Int32Array(pxN);
    var fieldW = rot ? H : W, fieldH = rot ? W : H, x, y;
    for (y = 0; y < ch; y++) {
      var dy = (y + 0.5) / ch * fieldH;
      for (x = 0; x < cw; x++) {
        var dx = (x + 0.5) / cw * fieldW;
        var mx = rot ? W - dy : dx, my = rot ? dx : dy;
        // Léger tremblement : la main du verrier
        mx += Math.sin(my * 2.1 + 1.7) * 0.05; my += Math.sin(mx * 2.3) * 0.05;
        var bx = Math.floor((mx + 2) / CELL), by = Math.floor((my + 2) / CELL), best = 1e9, sec = 1e9, bi = 0, si = 0;
        for (var oy = -1; oy <= 1; oy++) {
          var ry = by + oy; if (ry < 0 || ry >= GH) continue;
          for (var ox = -1; ox <= 1; ox++) {
            var rx = bx + ox; if (rx < 0 || rx >= GW) continue;
            var list = near[ry * GW + rx]; if (!list) continue;
            for (var l = 0; l < list.length; l++) {
              var s = sites[list[l]], ex = s[0] - mx, ey = s[1] - my, dd = ex * ex + ey * ey;
              if (dd < best) { sec = best; si = bi; best = dd; bi = list[l]; }
              else if (dd < sec) { sec = dd; si = list[l]; }
            }
          }
        }
        var s1 = sites[bi], s2 = sites[si], gx = s1[0] - s2[0], gy = s1[1] - s2[1];
        edge[y * cw + x] = (sec - best) / (2 * Math.sqrt(gx * gx + gy * gy) || 1);
        owner[y * cw + x] = bi;
      }
    }
    var ppw = cw / fieldW, LEAD_W = 0.062, BEV = 0.34;
    var height = new Float32Array(pxN);
    for (i = 0; i < pxN; i++) {
      var e = edge[i] - LEAD_W;
      if (e <= 0) { height[i] = 0; continue; }
      var tt = e / BEV; if (tt > 1) tt = 1;
      height[i] = Math.sqrt(1 - (1 - tt) * (1 - tt));
    }
    var cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var c = cv.getContext('2d'), im = c.createImageData(cw, ch), pd = im.data;
    var nrm = new Uint8Array(pxN * 4), mask = new Uint8Array(pxN * 4);
    var lit = document.createElement('canvas'); lit.width = cw; lit.height = ch;
    var lc = lit.getContext('2d'), li = lc.createImageData(cw, ch), lp = li.data;
    var bevS = BEV * ppw * 0.2;
    for (y = 0; y < ch; y++) {
      var yy0 = y > 0 ? y - 1 : y, yy1 = y < ch - 1 ? y + 1 : y;
      for (x = 0; x < cw; x++) {
        i = y * cw + x;
        var o = i * 4, xx0 = x > 0 ? i - 1 : i, xx1 = x < cw - 1 ? i + 1 : i;
        var nx = (height[xx0] - height[xx1]) * bevS, ny = (height[yy0 * cw + x] - height[yy1 * cw + x]) * bevS;
        var nl = Math.sqrt(nx * nx + ny * ny + 1);
        nx /= nl; ny /= nl;
        var hh = height[i], own = owner[i], R, G, B, sxw = x / ppw, syw = y / ppw, wx = rot ? W - syw : sxw, wy = rot ? sxw : syw;
        if (hh <= 0) {
          // Plomb : petite baguette de métal
          var lb = 26 + 16 * Math.max(0, 1 - edge[i] / LEAD_W);
          R = lb; G = lb * 0.96; B = lb * 1.08;
          nrm[o] = Math.round(nx * 127.5 + 127.5); nrm[o + 1] = Math.round(ny * 127.5 + 127.5); nrm[o + 2] = 0; nrm[o + 3] = 120;
        } else {
          var st = strk[own], cs = Math.cos(st), sn = Math.sin(st);
          var u = wx * cs + wy * sn, w = -wx * sn + wy * cs;
          var f1 = noise(u * 2.2 + st * 7, w * 9 + st * 3), f2 = noise(wx * 6.3 + 11, wy * 6.3 + 7), f3 = noise(wx * 24, wy * 24);
          var pr = (wx - sites[own][0]) * gdx[own] + (wy - sites[own][1]) * gdy[own];
          var shade2 = 0.86 + pr * 0.14 + (f1 - 0.5) * 0.26 + (f2 - 0.5) * 0.2 + (f3 - 0.5) * 0.08;
          // Grisaille : le peintre assombrit le bord des pièces
          shade2 *= 0.6 + 0.4 * Math.min(1, edge[i] / 0.42);
          R = colR[own] * shade2; G = colG[own] * shade2; B = colB[own] * shade2;
          // Bulles d'air
          if (f3 > 0.84 && f2 > 0.55) { R += 26; G += 26; B += 22; }
          var knd = kinds[own];
          var nnx = nx + (f2 - 0.5) * 0.1 + (f3 - 0.5) * 0.06, nny = ny + (f1 - 0.5) * 0.1 + (f3 - 0.5) * 0.06;
          nrm[o] = Math.max(0, Math.min(255, Math.round(nnx * 127.5 + 127.5))); nrm[o + 1] = Math.max(0, Math.min(255, Math.round(nny * 127.5 + 127.5)));
          nrm[o + 2] = Math.round(hh * 255); nrm[o + 3] = 96 + (f2 * 74);
          if (knd === 1) mask[o] = 255; else if (knd === 2) mask[o] = 150; else if (knd === 3) mask[o + 1] = 255; else if (knd === 4) mask[o + 2] = 255; else if (knd === 5) mask[o + 3] = 255;
        }
        pd[o] = Math.max(0, Math.min(255, R)); pd[o + 1] = Math.max(0, Math.min(255, G)); pd[o + 2] = Math.max(0, Math.min(255, B)); pd[o + 3] = 255;
        // Version figée
        var dff = -0.48 * nx - 0.62 * ny + 0.62 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), sp = -0.27 * nx - 0.35 * ny + 0.9 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        if (dff < 0) dff = 0;
        sp = sp <= 0 ? 0 : Math.pow(sp, 40);
        var lk = 0.42 + 0.72 * dff + 0.14 * hh;
        lp[o] = Math.min(255, pd[o] * lk + sp * 170); lp[o + 1] = Math.min(255, pd[o + 1] * lk + sp * 170); lp[o + 2] = Math.min(255, pd[o + 2] * lk + sp * 170); lp[o + 3] = 255;
      }
    }
    c.putImageData(im, 0, 0);
    lc.putImageData(li, 0, 0);
    // Cadre de plomb et filet d'or
    [c, lc].forEach(function (fc) {
      var fw = Math.max(3, ppw * 0.34);
      fc.strokeStyle = LEAD; fc.lineWidth = fw; fc.strokeRect(0, 0, cw, ch);
      fc.strokeStyle = '#d9b447'; fc.lineWidth = Math.max(1, fw * 0.24); fc.strokeRect(fw * 0.62, fw * 0.62, cw - fw * 1.24, ch - fw * 1.24);
    });
    var out = { albedo: cv, lit: lit, nrm: nrm, mask: mask, w: cw, h: ch };
    bakes = {}; // Une seule cuisson à la fois en mémoire
    bakes[key] = out;
    return out;
  }

  // Décors de bataille : chaque type est peint sur une planche, debout, l'origine au pied
  function propSheet(id) {
    var map = MAPS[id], seen = {}, list = [];
    map.props.forEach(function (p) { var k = p[0] + (p[4] || ''); if (!seen[k]) { seen[k] = 1; list.push({ k: k, fn: p[0], o: p[4] }); } });
    var CS = 256, cols = 4, rows = Math.ceil(list.length / cols), cv = document.createElement('canvas');
    cv.width = cols * CS; cv.height = rows * CS;
    var c = cv.getContext('2d'), rects = {};
    list.forEach(function (it, i) {
      var cx = (i % cols) * CS + CS / 2, cy = Math.floor(i / cols) * CS + CS * 0.9, sc = CS * 0.78;
      c.save();
      c.setTransform(sc, 0, 0, sc, cx, cy);
      c.strokeStyle = LEAD;
      c.lineJoin = 'round';
      c.lineWidth = 0.016;
      PROPS[it.fn](c, it.o);
      c.restore();
      var cellX = (i % cols) * CS, cellY = Math.floor(i / cols) * CS;
      rects[it.k] = { x: cellX, y: cellY, w: CS, h: CS, ox: CS / 2, oy: CS * 0.9 };
    });
    var rel = window.GVG.relief(cv, 8);
    return { key: 'props' + id, albedo: cv, nrm: rel.nrm, lit: rel.lit, rects: rects, ppu: sc0(CS), w: cv.width, h: cv.height };
  }
  function sc0(CS) { return CS * 0.78; }

  // Vignette à plat pour le catalogue des terrains
  function paint(id, cw, ch, rot) {
    var map = MAPS[id], b = bake(id, cw, ch, rot), cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    var c = cv.getContext('2d');
    c.drawImage(b.lit, 0, 0);
    var sx = rot ? ch / W : cw / W, lead = Math.max(1, sx * 0.075);
    function place(p) { return rot ? [p[2] * sx, (W - p[1]) * sx] : [p[1] * sx, p[2] * sx]; }
    map.props.slice().sort(function (a2, b2) { return place(a2)[1] - place(b2)[1]; }).forEach(function (p) {
      var at = place(p), s = p[3] * sx * 1.9;
      c.save();
      c.setTransform(s, 0, 0, s, at[0], at[1]);
      c.strokeStyle = LEAD; c.lineJoin = 'round'; c.lineWidth = Math.max(0.03, lead * 0.9 / s);
      PROPS[p[0]](c, p[4]);
      c.restore();
    });
    c.strokeStyle = LEAD; c.lineWidth = lead * 5; c.strokeRect(0, 0, cw, ch);
    c.strokeStyle = '#ffd75a'; c.lineWidth = lead * 1.1; c.strokeRect(lead * 3.4, lead * 3.4, cw - lead * 6.8, ch - lead * 6.8);
    return cv;
  }

  var cache = {};
  function image(id, cw, ch, rot) {
    var key = id + ':' + cw + ':' + ch + ':' + (rot ? 1 : 0);
    if (!cache[key]) cache[key] = paint(id, cw, ch, rot).toDataURL('image/jpeg', 0.86);
    return cache[key];
  }

  window.GVM = { MAPS: MAPS, KINDS: KINDS, kindAt: kindAt, image: image, bake: bake, propSheet: propSheet, W: W, H: H };
})();
