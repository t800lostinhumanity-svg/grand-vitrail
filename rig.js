// Marionnettes de verre : chaque unité est un vrai squelette de pièces séparées, dessinées os par os.
// Repère : l'unité regarde vers +x, y descend, les pieds sont à y = 0. Un os pend vers +y depuis son pivot.
(function () {
  var GV = window.GV;
  var PI = Math.PI;

  // --- Petits outils de dessin ---
  function n(v) { return Math.round(v * 10) / 10; }
  function p(c, d) { return '<path class="pp ' + c + '" d="' + d + '"></path>'; }
  function q(c, d) { return '<path class="q ' + c + '" d="' + d + '"></path>'; }
  function pc(col, d) { return '<path class="pp" fill="' + col + '" d="' + d + '"></path>'; }
  function qc(col, d) { return '<path class="q" fill="' + col + '" d="' + d + '"></path>'; }
  function o(c, x, y, r) { return '<circle class="pp ' + c + '" cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"></circle>'; }
  function oq(c, x, y, r) { return '<circle class="q ' + c + '" cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"></circle>'; }
  function oc(col, x, y, r) { return '<circle class="q" fill="' + col + '" cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"></circle>'; }
  function dot(col, x, y, r) { return '<circle fill="' + col + '" cx="' + n(x) + '" cy="' + n(y) + '" r="' + n(r) + '"></circle>'; }
  function ln(d) { return '<path class="q n" d="' + d + '"></path>'; }
  function P() { // suite de points -> chemin fermé
    var s = 'M' + n(arguments[0]) + ' ' + n(arguments[1]);
    for (var i = 2; i < arguments.length; i += 2) s += 'L' + n(arguments[i]) + ' ' + n(arguments[i + 1]);
    return s + 'Z';
  }

  // Membre fuselé, facette avant et facette arrière, extrémités arrondies
  function limb(l, w0, w1, a, b) {
    var r0 = w0 / 2, r1 = w1 / 2;
    return p(b, 'M' + n(-r0) + ' 0A' + n(r0) + ' ' + n(r0) + ' 0 0 1 ' + n(r0) + ' 0L' + n(r1) + ' ' + n(l) + 'A' + n(r1) + ' ' + n(r1) + ' 0 0 1 ' + n(-r1) + ' ' + n(l) + 'Z') +
      q(a, P(r0 * 0.05, -r0 + 1.4, r0 - 1, 0, r1 - 1, l, r1 * 0.05, l + r1 - 1.4));
  }
  function bands(l, w, count) {
    var s = '', i;
    for (i = 1; i <= count; i++) { var y = l * i / (count + 1); s += ln('M' + n(-w / 2) + ' ' + n(y) + 'Q0 ' + n(y + 2) + ' ' + n(w / 2) + ' ' + n(y)); }
    return s;
  }
  function boxL(l, w) { return [-w - 8, -w - 8, w + 8, l + w + 8]; }

  // --- Proportions de chaque peuple ---
  var DIMS = [
    { th: 22, sh: 22, an: 5, ft: 12, tor: 40, tw: 15, ur: 19, fr: 19, aw: 10, lw: 12, hr: 13 },
    { th: 14, sh: 14, an: 5, ft: 14, tor: 38, tw: 21, ur: 16, fr: 16, aw: 13, lw: 15, hr: 14 },
    { th: 26, sh: 26, an: 4, ft: 12, tor: 38, tw: 12, ur: 21, fr: 20, aw: 8, lw: 9, hr: 11 },
    { th: 21, sh: 20, an: 5, ft: 14, tor: 44, tw: 20, ur: 22, fr: 21, aw: 14, lw: 15, hr: 13 },
    { th: 19, sh: 20, an: 5, ft: 16, tor: 46, tw: 22, ur: 29, fr: 29, aw: 14, lw: 15, hr: 12 },
    { th: 12, sh: 12, an: 3, ft: 10, tor: 25, tw: 11, ur: 13, fr: 13, aw: 6, lw: 7, hr: 15 },
    { th: 23, sh: 24, an: 4, ft: 11, tor: 38, tw: 13, ur: 20, fr: 20, aw: 5, lw: 6, hr: 12 },
    { th: 21, sh: 22, an: 6, ft: 14, tor: 40, tw: 15, ur: 20, fr: 20, aw: 10, lw: 12, hr: 12 }
  ];
  // Matière d'armure de chaque peuple : plaque claire, plaque sombre, garniture
  var MAT = [['m', 'md', 'y'], ['md', 'sd', 'y'], ['l', 'g', 'y'], ['sd', 'md', 'b'], ['b', 'sd', 'wd'], ['w', 'wd', 'md'], ['sd', 'md', 'g'], ['d', 'g', 'y']];
  // Aspect de chaque rang
  var LOOK = [
    { ar: 'tunic', hd: 'bare' }, { ar: 'plate', hd: 'helm', sh: 1 }, { ar: 'heavy', hd: 'visor', sh: 2 }, { ar: 'leather', hd: 'hood', qv: 1 },
    { ar: 'leather', hd: 'band' }, { ar: 'heavy', hd: 'helm', pd: 1 }, { ar: 'leather', hd: 'hood', qv: 1, pl: 1 }, { ar: 'robe', hd: 'hat', orb: 1 },
    { ar: 'robe', hd: 'halo' }, { ar: 'tunic', hd: 'goggle', apron: 1 }, { ar: 'heavy', hd: 'crown', pd: 1, cape: 1 }
  ];

  // --- Têtes ---
  function eye(x, y, r, iris) {
    return '<ellipse fill="#fff6e6" cx="' + n(x) + '" cy="' + n(y) + '" rx="' + n(r) + '" ry="' + n(r * 1.15) + '"></ellipse>' + dot(iris || '#1b130c', x + r * 0.28, y + 0.2, r * 0.62) + dot('#ffffff', x + r * 0.05, y - r * 0.4, r * 0.24);
  }
  function headArt(race, gear, r) {
    var cx = 2, cy = -r - 1, s = '';
    var neck = q(race === 6 ? 'b' : 'sk', P(-4.5, 3, 4.5, 3, 4, -4, -4, -4));
    s += neck;
    var e1 = cx + r * 0.2, e2 = cx + r * 0.68;
    if (race === 0) {
      if (gear === 'bare' || gear === 'goggle' || gear === 'band' || gear === 'halo') s += p('hr', 'M' + n(cx - r - 1) + ' ' + n(cy + 2) + 'Q' + n(cx - r - 3) + ' ' + n(cy - r) + ' ' + n(cx) + ' ' + n(cy - r - 1) + 'L' + n(cx - r * 0.3) + ' ' + n(cy + r) + 'Z');
      s += o('sk', cx, cy, r);
      s += oq('sk', cx - r * 0.45, cy + 1, 2.8);
      s += q('sk', P(cx + r * 0.42, cy + 0.5, cx + r * 1.05, cy + r * 0.38, cx + r * 0.5, cy + r * 0.45));
      s += eye(e1, cy - 0.5, 2.1, '#2f5fb8') + eye(e2, cy - 0.5, 1.8, '#2f5fb8');
      s += ln('M' + n(e1 - 2) + ' ' + n(cy - 4) + 'L' + n(e1 + 2.4) + ' ' + n(cy - 4.4) + 'M' + n(e2 - 1.6) + ' ' + n(cy - 4.2) + 'L' + n(e2 + 2) + ' ' + n(cy - 4));
      s += ln('M' + n(cx + r * 0.2) + ' ' + n(cy + r * 0.66) + 'Q' + n(cx + r * 0.42) + ' ' + n(cy + r * 0.74) + ' ' + n(cx + r * 0.66) + ' ' + n(cy + r * 0.62));
      if (gear === 'bare' || gear === 'goggle' || gear === 'band' || gear === 'halo') s += p('hr', 'M' + n(cx - r) + ' ' + n(cy - 1) + 'Q' + n(cx - r) + ' ' + n(cy - r - 2) + ' ' + n(cx + 1) + ' ' + n(cy - r - 1) + 'Q' + n(cx + r + 1) + ' ' + n(cy - r) + ' ' + n(cx + r * 0.9) + ' ' + n(cy - r * 0.34) + 'Q' + n(cx) + ' ' + n(cy - r * 0.7) + ' ' + n(cx - r * 0.42) + ' ' + n(cy - 1) + 'Z');
    } else if (race === 1) {
      s += o('sk', cx, cy, r);
      s += oq('sk', cx - r * 0.5, cy, 3);
      s += eye(e1, cy - 1.5, 2.1, '#5a3a14') + eye(e2, cy - 1.5, 1.8, '#5a3a14');
      s += q('hr', 'M' + n(e1 - 3) + ' ' + n(cy - 4.6) + 'L' + n(e2 + 3) + ' ' + n(cy - 5) + 'L' + n(e2 + 3) + ' ' + n(cy - 3) + 'L' + n(e1 - 3) + ' ' + n(cy - 2.6) + 'Z');
      s += p('hr', P(cx - r * 0.72, cy + 1, cx - r * 0.5, cy + r * 1.6, cx - r * 0.1, cy + r * 1.2, cx + r * 0.2, cy + r * 2.2, cx + r * 0.6, cy + r * 1.3, cx + r * 1.05, cy + r * 1.7, cx + r, cy + 1, cx + r * 0.4, cy + r * 0.3));
      s += ln('M' + n(cx - r * 0.1) + ' ' + n(cy + r * 0.8) + 'L' + n(cx) + ' ' + n(cy + r * 1.5) + 'M' + n(cx + r * 0.5) + ' ' + n(cy + r * 0.8) + 'L' + n(cx + r * 0.5) + ' ' + n(cy + r * 1.3));
      s += oq('y', cx + r * 0.2, cy + r * 1.75, 1.8);
      s += o('sk', cx + r * 0.62, cy + r * 0.12, r * 0.3);
    } else if (race === 2) {
      s += p('hr', 'M' + n(cx - r - 1) + ' ' + n(cy - 2) + 'Q' + n(cx - r * 1.2) + ' ' + n(cy + r * 2.4) + ' ' + n(cx - r * 1.9) + ' ' + n(cy + r * 3.4) + 'Q' + n(cx - r * 0.1) + ' ' + n(cy + r * 2.8) + ' ' + n(cx + r * 0.1) + ' ' + n(cy) + 'Z');
      s += q('sk', P(cx - r * 0.2, cy, cx - r * 2.1, cy - r * 0.75, cx - r * 0.5, cy + r * 0.5));
      s += o('sk', cx, cy, r);
      s += q('sk', P(cx + r * 0.42, cy + 0.5, cx + r * 0.95, cy + r * 0.3, cx + r * 0.5, cy + r * 0.38));
      s += eye(e1, cy - 0.5, 1.9, '#1f8a4f') + eye(e2, cy - 0.5, 1.6, '#1f8a4f');
      s += ln('M' + n(cx + r * 0.3) + ' ' + n(cy + r * 0.62) + 'Q' + n(cx + r * 0.5) + ' ' + n(cy + r * 0.7) + ' ' + n(cx + r * 0.68) + ' ' + n(cy + r * 0.56));
      if (gear !== 'hood' && gear !== 'helm' && gear !== 'visor') s += p('hr', 'M' + n(cx - r) + ' ' + n(cy) + 'Q' + n(cx - r) + ' ' + n(cy - r - 2) + ' ' + n(cx + 1) + ' ' + n(cy - r - 1) + 'Q' + n(cx + r) + ' ' + n(cy - r) + ' ' + n(cx + r * 0.95) + ' ' + n(cy - r * 0.2) + 'Q' + n(cx + r * 0.2) + ' ' + n(cy - r * 0.8) + ' ' + n(cx - r * 0.3) + ' ' + n(cy) + 'Z');
    } else if (race === 3) {
      s += q('sk', P(cx - r * 0.3, cy, cx - r * 1.5, cy - r * 0.3, cx - r * 0.5, cy + r * 0.5));
      s += p('sk', 'M' + n(cx - r) + ' ' + n(cy - 1) + 'Q' + n(cx) + ' ' + n(cy - r - 2) + ' ' + n(cx + r) + ' ' + n(cy - 2) + 'L' + n(cx + r * 1.18) + ' ' + n(cy + r * 0.7) + 'Q' + n(cx + r * 0.3) + ' ' + n(cy + r * 1.3) + ' ' + n(cx - r * 0.7) + ' ' + n(cy + r * 0.9) + 'Z');
      s += eye(e1, cy - 1, 1.7, '#d81f1f') + eye(e2, cy - 1, 1.5, '#d81f1f');
      s += q('k', P(e1 - 2.8, cy - 4.6, e2 + 2.8, cy - 3, e2 + 2.6, cy - 1.8, e1 - 2.6, cy - 3));
      s += q('sk', P(cx + r * 0.46, cy, cx + r * 1, cy + r * 0.28, cx + r * 0.5, cy + r * 0.4));
      s += q('k', 'M' + n(cx + r * 0.05) + ' ' + n(cy + r * 0.7) + 'L' + n(cx + r * 1.05) + ' ' + n(cy + r * 0.62) + 'L' + n(cx + r * 1) + ' ' + n(cy + r * 0.85) + 'L' + n(cx + r * 0.1) + ' ' + n(cy + r * 0.92) + 'Z');
      s += q('b', P(cx + r * 0.2, cy + r * 0.9, cx + r * 0.3, cy + r * 0.28, cx + r * 0.45, cy + r * 0.88));
      s += q('b', P(cx + r * 0.72, cy + r * 0.84, cx + r * 0.84, cy + r * 0.26, cx + r * 0.96, cy + r * 0.82));
      if (gear === 'bare' || gear === 'band') s += p('hr', P(cx - r * 0.6, cy - r * 0.7, cx - r * 0.3, cy - r * 1.6, cx + r * 0.2, cy - r * 1.05, cx + r * 0.2, cy - r * 0.7));
    } else if (race === 4) {
      s += p('sk', P(cx - r * 0.2, cy - 1, cx - r * 1.5, cy - r * 0.9, cx - r * 1.2, cy + r * 0.3, cx - r * 0.4, cy + r * 0.5));
      s += p('sk', 'M' + n(cx - r) + ' ' + n(cy + 1) + 'Q' + n(cx - r * 0.8) + ' ' + n(cy - r) + ' ' + n(cx + r * 0.3) + ' ' + n(cy - r) + 'Q' + n(cx + r * 1.1) + ' ' + n(cy - r * 0.9) + ' ' + n(cx + r * 1.2) + ' ' + n(cy + r * 0.1) + 'L' + n(cx + r * 1.3) + ' ' + n(cy + r * 1.1) + 'Q' + n(cx) + ' ' + n(cy + r * 1.5) + ' ' + n(cx - r * 0.8) + ' ' + n(cy + r * 0.9) + 'Z');
      s += eye(e1 + 1, cy - 2, 1.6, '#c6a21a') + eye(e2 + 1, cy - 2, 1.4, '#c6a21a');
      s += q('sk', P(cx + r * 0.6, cy - 1, cx + r * 1.65, cy + r * 0.32, cx + r * 0.9, cy + r * 0.5));
      s += q('k', 'M' + n(cx - r * 0.1) + ' ' + n(cy + r * 0.76) + 'L' + n(cx + r * 1.22) + ' ' + n(cy + r * 0.72) + 'L' + n(cx + r * 1.2) + ' ' + n(cy + r * 1.02) + 'L' + n(cx) + ' ' + n(cy + r * 1.06) + 'Z');
      s += q('b', P(cx + r * 0.1, cy + r * 1, cx + r * 0.22, cy + r * 0.44, cx + r * 0.36, cy + r * 0.98));
      s += q('b', P(cx + r * 0.9, cy + r * 0.92, cx + r * 1, cy + r * 0.36, cx + r * 1.12, cy + r * 0.9));
      if (gear === 'bare') s += ln('M' + n(cx) + ' ' + n(cy - r) + 'L' + n(cx - 2) + ' ' + n(cy - r - 5) + 'M' + n(cx + 3) + ' ' + n(cy - r) + 'L' + n(cx + 4) + ' ' + n(cy - r - 6) + 'M' + n(cx - 3) + ' ' + n(cy - r + 1) + 'L' + n(cx - 7) + ' ' + n(cy - r - 3));
    } else if (race === 5) {
      s += p('sk', P(cx - r * 0.3, cy - r * 0.4, cx - r * 2.1, cy - r * 1.1, cx - r * 1.3, cy + r * 0.3, cx - r * 0.4, cy + r * 0.4));
      s += q('l', P(cx - r * 0.6, cy - r * 0.3, cx - r * 1.6, cy - r * 0.76, cx - r * 1.1, cy + r * 0.1));
      s += o('sk', cx, cy, r);
      s += q('sk', P(cx + r * 0.72, cy - r * 0.45, cx + r * 1.5, cy - r * 1.35, cx + r * 1.15, cy - r * 0.05));
      s += eye(e1, cy - 2, 2.7, '#d8a400') + eye(e2 + 1, cy - 2, 2.4, '#d8a400');
      s += q('sk', P(cx + r * 0.46, cy, cx + r * 1.42, cy + r * 0.4, cx + r * 0.5, cy + r * 0.48));
      s += q('k', 'M' + n(cx - r * 0.2) + ' ' + n(cy + r * 0.56) + 'Q' + n(cx + r * 0.4) + ' ' + n(cy + r * 1.05) + ' ' + n(cx + r * 0.94) + ' ' + n(cy + r * 0.5) + 'Z');
      s += q('b', P(cx, cy + r * 0.62, cx + r * 0.14, cy + r * 0.88, cx + r * 0.26, cy + r * 0.66));
      s += q('b', P(cx + r * 0.46, cy + r * 0.66, cx + r * 0.58, cy + r * 0.9, cx + r * 0.72, cy + r * 0.6));
    } else if (race === 6) {
      s += p('b', 'M' + n(cx - r) + ' ' + n(cy) + 'A' + n(r) + ' ' + n(r) + ' 0 1 1 ' + n(cx + r) + ' ' + n(cy) + 'L' + n(cx + r * 0.72) + ' ' + n(cy + r * 0.72) + 'L' + n(cx - r * 0.55) + ' ' + n(cy + r * 0.72) + 'Z');
      s += q('k', 'M' + n(e1 - 2.8) + ' ' + n(cy - 2) + 'Q' + n(e1) + ' ' + n(cy - 5) + ' ' + n(e1 + 2.8) + ' ' + n(cy - 2) + 'Q' + n(e1) + ' ' + n(cy + 3.6) + ' ' + n(e1 - 2.8) + ' ' + n(cy - 2) + 'Z');
      s += q('k', 'M' + n(e2 - 2.4) + ' ' + n(cy - 2) + 'Q' + n(e2) + ' ' + n(cy - 5) + ' ' + n(e2 + 2.4) + ' ' + n(cy - 2) + 'Q' + n(e2) + ' ' + n(cy + 3.4) + ' ' + n(e2 - 2.4) + ' ' + n(cy - 2) + 'Z');
      s += dot('#c084ff', e1, cy - 1.2, 1.5) + dot('#c084ff', e2, cy - 1.2, 1.3) + dot('#ffffff', e1 - 0.3, cy - 1.6, 0.5);
      s += q('k', P(cx + r * 0.4, cy + r * 0.2, cx + r * 0.62, cy + r * 0.5, cx + r * 0.3, cy + r * 0.5));
      s += p('b', P(cx - r * 0.4, cy + r * 0.72, cx + r * 0.72, cy + r * 0.72, cx + r * 0.62, cy + r * 1.2, cx - r * 0.3, cy + r * 1.2));
      s += ln('M' + n(cx - r * 0.1) + ' ' + n(cy + r * 0.72) + 'V' + n(cy + r * 1.2) + 'M' + n(cx + r * 0.16) + ' ' + n(cy + r * 0.72) + 'V' + n(cy + r * 1.2) + 'M' + n(cx + r * 0.42) + ' ' + n(cy + r * 0.72) + 'V' + n(cy + r * 1.2));
      s += ln('M' + n(cx - r * 0.5) + ' ' + n(cy - r * 0.5) + 'L' + n(cx - r * 0.2) + ' ' + n(cy - r * 0.1) + 'L' + n(cx - r * 0.4) + ' ' + n(cy + r * 0.1));
    } else {
      s += p('d', P(cx - r * 0.5, cy - r * 0.6, cx - r * 2, cy - r * 1.7, cx - r * 0.9, cy + r * 0.1));
      s += p('d', P(cx - r * 0.2, cy - r * 0.86, cx - r * 1.2, cy - r * 2.1, cx - r * 0.1, cy - r * 0.2));
      s += p('sk', 'M' + n(cx - r) + ' ' + n(cy) + 'Q' + n(cx - r * 0.8) + ' ' + n(cy - r) + ' ' + n(cx + r * 0.2) + ' ' + n(cy - r) + 'L' + n(cx + r * 2) + ' ' + n(cy - r * 0.05) + 'L' + n(cx + r * 2) + ' ' + n(cy + r * 0.38) + 'L' + n(cx + r * 0.5) + ' ' + n(cy + r * 0.62) + 'L' + n(cx - r * 0.6) + ' ' + n(cy + r * 0.8) + 'Z');
      s += q('l', P(cx + r * 0.2, cy + r * 0.34, cx + r * 2, cy + r * 0.38, cx + r * 1.7, cy + r * 0.86, cx + r * 0.2, cy + r * 0.95, cx - r * 0.5, cy + r * 0.9));
      s += '<ellipse fill="#ffd75a" cx="' + n(e1 + 1) + '" cy="' + n(cy - 2) + '" rx="2.6" ry="2.2"></ellipse><rect fill="#120e0a" x="' + n(e1 + 0.5) + '" y="' + n(cy - 4) + '" width="1.1" height="4"></rect>';
      s += dot('#120e0a', cx + r * 1.72, cy + r * 0.1, 0.8);
      s += ln('M' + n(cx - r * 0.2) + ' ' + n(cy - r * 0.76) + 'L' + n(cx + r * 0.2) + ' ' + n(cy - r * 0.45) + 'M' + n(cx - r * 0.6) + ' ' + n(cy - r * 0.3) + 'L' + n(cx - r * 0.1) + ' ' + n(cy + r * 0.1));
    }
    // Couvre-chefs
    var tr = MAT[race];
    if (gear === 'helm' || gear === 'visor' || gear === 'crown') {
      if (gear !== 'crown') {
        s += p(tr[0], 'M' + n(cx - r - 1.5) + ' ' + n(cy + 2) + 'Q' + n(cx - r - 1) + ' ' + n(cy - r - 2.5) + ' ' + n(cx + 1) + ' ' + n(cy - r - 2.5) + 'Q' + n(cx + r + 2) + ' ' + n(cy - r - 1) + ' ' + n(cx + r + 1.5) + ' ' + n(cy - 1.5) + 'L' + n(cx + r * 0.8) + ' ' + n(cy - 2.5) + 'L' + n(cx - r * 0.3) + ' ' + n(cy - 2.5) + 'L' + n(cx - r * 0.3) + ' ' + n(cy + 4) + 'Z');
        s += q(tr[1], 'M' + n(cx - r - 1.5) + ' ' + n(cy + 2) + 'Q' + n(cx - r - 1) + ' ' + n(cy - r * 0.8) + ' ' + n(cx - r * 0.3) + ' ' + n(cy - r * 0.7) + 'L' + n(cx - r * 0.3) + ' ' + n(cy + 4) + 'Z');
        s += q(tr[2], P(cx - r - 0.4, cy - 2.8, cx + r + 1.4, cy - 2.8, cx + r + 1.4, cy - 0.6, cx - r - 0.4, cy - 0.6));
        s += q(tr[0], P(cx + r * 0.5, cy - 1, cx + r * 0.78, cy - 1, cx + r * 0.72, cy + r * 0.56, cx + r * 0.56, cy + r * 0.56));
        if (gear === 'visor') {
          s += p(tr[0], P(cx + r * 1.1, cy - 2, cx + r * 1.15, cy + r * 0.9, cx - r * 0.3, cy + r, cx - r * 0.3, cy - 2));
          s += q('k', P(cx, cy - 1.6, cx + r * 1.05, cy - 1.6, cx + r * 1.05, cy + 0.6, cx, cy + 0.6));
          s += ln('M' + n(cx + r * 0.2) + ' ' + n(cy + 3) + 'V' + n(cy + r * 0.8) + 'M' + n(cx + r * 0.5) + ' ' + n(cy + 3) + 'V' + n(cy + r * 0.8) + 'M' + n(cx + r * 0.8) + ' ' + n(cy + 3) + 'V' + n(cy + r * 0.8));
          s += p('g', 'M' + n(cx - 2) + ' ' + n(cy - r - 2) + 'Q' + n(cx - r * 1.6) + ' ' + n(cy - r * 2.6) + ' ' + n(cx - r * 2) + ' ' + n(cy - r * 0.6) + 'Q' + n(cx - r * 1.1) + ' ' + n(cy - r * 1.3) + ' ' + n(cx - r * 0.5) + ' ' + n(cy - r * 0.8) + 'Z');
        }
        if (race === 1) { s += p('b', P(cx - r * 0.9, cy - r * 0.5, cx - r * 1.9, cy - r * 1.6, cx - r * 0.5, cy - r * 0.86)); s += p('b', P(cx + r * 0.9, cy - r * 0.5, cx + r * 1.7, cy - r * 1.6, cx + r * 0.4, cy - r * 0.9)); }
        if (race === 3) { s += p('b', P(cx - 2, cy - r - 2, cx, cy - r * 2, cx + 3, cy - r - 2)); s += p('b', P(cx - r * 0.8, cy - r * 0.7, cx - r * 1.4, cy - r * 1.5, cx - r * 0.3, cy - r * 1)); }
      } else {
        s += p('y', P(cx - r * 0.95, cy - r * 0.45, cx - r * 1.08, cy - r * 1.5, cx - r * 0.5, cy - r * 1, cx, cy - r * 1.8, cx + r * 0.5, cy - r * 1, cx + r * 1.08, cy - r * 1.5, cx + r * 0.95, cy - r * 0.45));
        s += oq('g', cx, cy - r * 0.75, 2) + oq('l', cx - r * 0.55, cy - r * 0.7, 1.3) + oq('l', cx + r * 0.55, cy - r * 0.7, 1.3);
        s += dot('#ffffff', cx - r * 1.08, cy - r * 1.5, 1) + dot('#ffffff', cx, cy - r * 1.8, 1.1) + dot('#ffffff', cx + r * 1.08, cy - r * 1.5, 1);
      }
    } else if (gear === 'hood') {
      s += p('d', 'M' + n(cx - r - 3) + ' ' + n(cy + r + 2) + 'Q' + n(cx - r - 4) + ' ' + n(cy - r - 3) + ' ' + n(cx + 2) + ' ' + n(cy - r - 2.5) + 'Q' + n(cx + r + 2) + ' ' + n(cy - r) + ' ' + n(cx + r * 1.05) + ' ' + n(cy - 1) + 'Q' + n(cx + r * 0.2) + ' ' + n(cy - r * 0.8) + ' ' + n(cx - r * 0.2) + ' ' + n(cy + 2) + 'L' + n(cx) + ' ' + n(cy + r + 2) + 'Z');
      s += ln('M' + n(cx - r * 0.2) + ' ' + n(cy + 2) + 'Q' + n(cx - r) + ' ' + n(cy - r * 0.4) + ' ' + n(cx - r * 0.3) + ' ' + n(cy - r - 1));
    } else if (gear === 'band') {
      s += q('g', P(cx - r - 0.5, cy - r * 0.6, cx + r + 0.5, cy - r * 0.7, cx + r + 0.5, cy - r * 0.32, cx - r - 0.5, cy - r * 0.2));
      s += q('g', P(cx - r - 0.2, cy - r * 0.5, cx - r * 1.9, cy - r * 0.2, cx - r * 1.7, cy + r * 0.3, cx - r * 0.9, cy - r * 0.1));
    } else if (gear === 'hat') {
      s += p('d', P(cx - r * 1.6, cy - r * 0.46, cx + r * 1.7, cy - r * 0.56, cx + r * 0.9, cy - r * 0.95, cx + r * 0.3, cy - r * 2.9, cx - r * 0.8, cy - r * 3.2, cx - r * 0.3, cy - r * 2.1, cx - r * 0.85, cy - r * 0.95));
      s += q('y', P(cx - r * 0.9, cy - r * 0.92, cx + r * 0.96, cy - r * 1, cx + r * 0.82, cy - r * 1.32, cx - r * 0.74, cy - r * 1.26));
      s += oq('l', cx + 1, cy - r * 1.14, 1.5);
      s += dot('#ffd75a', cx - r * 0.2, cy - r * 2, 0.9) + dot('#ffffff', cx + r * 0.2, cy - r * 1.6, 0.7);
    } else if (gear === 'halo') {
      s += q('y', P(cx - r, cy - r * 0.62, cx + r, cy - r * 0.7, cx + r, cy - r * 0.46, cx - r, cy - r * 0.36));
      s += oq('l', cx + 2, cy - r * 0.54, 1.5);
    } else if (gear === 'goggle') {
      s += q('wd', P(cx - r - 0.3, cy - 3.4, cx + r + 0.3, cy - 3.4, cx + r + 0.3, cy - 0.6, cx - r - 0.3, cy - 0.6));
      s += o('m', e1, cy - 2, 3.2) + oc('#ffd75a', e1, cy - 2, 2) + o('m', e2 + 0.6, cy - 2, 2.8) + oc('#ffd75a', e2 + 0.6, cy - 2, 1.7);
      s += dot('#ffffff', e1 - 0.7, cy - 2.7, 0.7);
    }
    return s;
  }

  // --- Torses ---
  function torsoArt(race, look, d) {
    var T = d.tor, W = d.tw, tr = MAT[race], s = '', ar = look.ar;
    var sl = -W, sr = W * 0.85; // épaules
    var wl = -W * 0.72, wr = W * 0.68; // taille
    function chest(a, b) {
      return p(a, 'M' + n(wl) + ' 3L' + n(sl) + ' ' + n(-T + 7) + 'Q' + n(sl + 2) + ' ' + n(-T - 1) + ' ' + n(sl + 9) + ' ' + n(-T - 1) + 'L' + n(sr - 8) + ' ' + n(-T - 1) + 'Q' + n(sr) + ' ' + n(-T) + ' ' + n(sr) + ' ' + n(-T + 7) + 'L' + n(wr) + ' 3Z') +
        q(b, 'M' + n(W * 0.28) + ' ' + n(-T - 0.6) + 'L' + n(sr - 8) + ' ' + n(-T - 0.6) + 'Q' + n(sr - 0.5) + ' ' + n(-T) + ' ' + n(sr - 0.5) + ' ' + n(-T + 7) + 'L' + n(wr - 0.5) + ' 2.6L' + n(W * 0.22) + ' 2.6Z');
    }
    if (look.qv) {
      s += p('wd', P(-W * 1.05, -T * 0.18, -W * 0.5, -T * 1.08, -W * 0.05, -T * 0.98, -W * 0.5, -T * 0.08));
      for (var a = 0; a < 3; a++) s += q('m', P(-W * 0.72 + a * 3, -T * 1.02 - a, -W * 0.92 + a * 3, -T * 1.25 - a, -W * 0.52 + a * 3, -T * 1.2 - a));
    }
    var bare = (race === 4 || race === 5) && (ar === 'tunic' || ar === 'leather');
    if (race === 6 && (ar === 'tunic' || ar === 'leather')) {
      // Cage thoracique du mort
      s += p('k', 'M' + n(wl) + ' 3L' + n(sl) + ' ' + n(-T + 7) + 'L' + n(sl + 7) + ' ' + n(-T) + 'L' + n(sr - 7) + ' ' + n(-T) + 'L' + n(sr) + ' ' + n(-T + 7) + 'L' + n(wr) + ' 3Z');
      s += q('b', P(1, -T, 5, -T, 5, 4, 1, 4));
      for (var r = 0; r < 5; r++) {
        var ry = -T + 6 + r * (T - 12) / 5;
        s += q('b', 'M' + n(sl + 2 + r) + ' ' + n(ry) + 'Q' + n(-2) + ' ' + n(ry - 3) + ' 3 ' + n(ry + 1) + 'Q' + n(sr - 2) + ' ' + n(ry - 3) + ' ' + n(sr - 1 - r) + ' ' + n(ry + 1) + 'L' + n(sr - 1 - r) + ' ' + n(ry + 3.4) + 'Q' + n(sr - 3) + ' ' + n(ry) + ' 3 ' + n(ry + 3.6) + 'Q' + n(-2) + ' ' + n(ry) + ' ' + n(sl + 2 + r) + ' ' + n(ry + 3) + 'Z');
      }
      s += q('d', 'M' + n(wl) + ' -6L' + n(wr) + ' -6L' + n(wr + 3) + ' 6L' + n(wl - 3) + ' 6Z');
    } else if (bare) {
      s += chest('sk', 'sk');
      s += ln('M' + n(-W * 0.55) + ' ' + n(-T * 0.62) + 'Q' + n(-W * 0.1) + ' ' + n(-T * 0.5) + ' 2 ' + n(-T * 0.64) + 'Q' + n(W * 0.34) + ' ' + n(-T * 0.5) + ' ' + n(W * 0.68) + ' ' + n(-T * 0.64));
      s += ln('M2 ' + n(-T * 0.6) + 'V' + n(-T * 0.1) + 'M' + n(-W * 0.3) + ' ' + n(-T * 0.32) + 'H' + n(W * 0.4) + 'M' + n(-W * 0.22) + ' ' + n(-T * 0.16) + 'H' + n(W * 0.34));
      s += q('wd', P(-W * 0.9, -T * 0.86, -W * 0.6, -T, W * 0.72, -T * 0.08, W * 0.4, T * 0.02));
      s += q('b', P(wl - 0.6, -T * 0.82, wl + 6, -T * 0.92, wl + 3, -T * 0.68));
      if (ar === 'leather') s += q('md', P(-W * 0.3, -T * 0.6, W * 0.1, -T * 0.38, W * 0.16, -T * 0.25, -W * 0.24, -T * 0.47));
    } else if (ar === 'tunic' || ar === 'leather') {
      s += chest(ar === 'tunic' ? 'g' : 'w', ar === 'tunic' ? 'd' : 'wd');
      if (ar === 'tunic') {
        s += q('sk', P(-3, -T - 0.5, 8, -T - 0.5, 3, -T + 9));
        s += ln('M2 ' + n(-T + 9) + 'V2M' + n(-W * 0.5) + ' ' + n(-T * 0.5) + 'H' + n(-W * 0.18) + 'M' + n(W * 0.2) + ' ' + n(-T * 0.5) + 'H' + n(W * 0.5));
        s += q('l', P(-W * 0.62, -T + 8, -3, -T + 5, -1.6, -T + 12, -W * 0.56, -T + 14));
      } else {
        s += q('wd', P(-W * 0.82, -T + 3, -W * 0.5, -T, W * 0.72, -T * 0.12, W * 0.42, -T * 0.02));
        s += q('wd', P(W * 0.7, -T + 3, W * 0.4, -T, -W * 0.72, -T * 0.12, -W * 0.42, -T * 0.02));
        s += oq('y', 2, -T * 0.56, 2.6);
        s += ln('M' + n(-W * 0.5) + ' ' + n(-T * 0.25) + 'H' + n(W * 0.5));
      }
    } else if (ar === 'plate' || ar === 'heavy') {
      s += chest(tr[0], tr[1]);
      s += q(tr[2], P(-W * 0.14, -T - 0.4, W * 0.34, -T - 0.4, W * 0.42, -T + 5, -W * 0.22, -T + 5));
      s += ln('M' + n(wl + 1) + ' ' + n(-T * 0.32) + 'Q2 ' + n(-T * 0.2) + ' ' + n(wr - 1) + ' ' + n(-T * 0.32) + 'M' + n(wl) + ' ' + n(-T * 0.16) + 'Q2 ' + n(-T * 0.04) + ' ' + n(wr) + ' ' + n(-T * 0.16));
      // Emblème peint de la couleur du peuple
      s += q('g', P(2, -T * 0.86, W * 0.44, -T * 0.66, 2, -T * 0.38, -W * 0.38, -T * 0.66));
      s += q('l', P(2, -T * 0.78, W * 0.18, -T * 0.66, 2, -T * 0.52, -W * 0.14, -T * 0.66));
      s += dot('#ffffff', -W * 0.5, -T * 0.82, 1) + dot('#ffffff', W * 0.56, -T * 0.82, 0.8);
      if (ar === 'heavy') {
        s += q(tr[2], P(wl - 0.6, -T * 0.44, wr + 0.6, -T * 0.44, wr + 0.2, -T * 0.38, wl - 0.2, -T * 0.38));
        s += p('k', 'M-5 ' + n(-T - 1) + 'H9V' + n(-T + 2) + 'H-5Z');
      }
    } else {
      // Robe longue
      s += chest('g', 'd');
      s += q('l', P(-W * 0.2, -T - 0.6, W * 0.36, -T - 0.6, W * 0.2, 3, -W * 0.08, 3));
      for (var e = 0; e < 4; e++) s += dot('#ffd75a', W * 0.06, -T + 7 + e * (T - 10) / 4, 0.9);
      s += q('sk', P(-3, -T - 0.6, 7, -T - 0.6, 2, -T + 5));
      s += q('y', P(-W * 0.82, -T - 1, W * 0.8, -T - 1, W * 0.84, -T + 2.6, -W * 0.84, -T + 2.6));
    }
    if (look.apron) {
      s += q('wd', P(-W * 0.5, -T + 8, W * 0.52, -T + 8, W * 0.74, 6, -W * 0.72, 6));
      s += oq('md', 2, -T * 0.4, 2.6);
    }
    // Sacoche, boucles et bandoulière
    if (ar === 'tunic' || ar === 'leather') {
      s += q('wd', P(wl + 1, -T * 0.05, wl + 7, -T * 0.05, wl + 7, 6, wl + 1, 6)) + dot('#ffd75a', wl + 4, 2, 0.9);
      if (ar === 'tunic' && !bare) s += q('wd', P(-W * 0.7, -T + 5, -W * 0.46, -T + 3, W * 0.62, -T * 0.1, W * 0.4, -T * 0.05));
    }
    if (ar === 'plate' || ar === 'heavy') {
      for (var rv = 0; rv < 4; rv++) s += dot('#ffd75a', wl + 2 + rv * (wr - wl - 4) / 3, -T * 0.1, 0.8);
    }
    // Ceinture
    if (!bare || ar === 'leather') {
      s += q(ar === 'robe' ? 'y' : 'wd', P(wl - 1, -4, wr + 1, -4, wr + 1.4, 1.5, wl - 1.4, 1.5));
      s += q(ar === 'robe' ? 'l' : 'y', P(-1.5, -5, 6, -5, 6, 2.5, -1.5, 2.5));
    } else s += q('wd', P(wl - 1, -3, wr + 1, -3, wr + 1.4, 1.5, wl - 1.4, 1.5));
    return s;
  }

  // Bas du corps : pagne, jupe d'armes ou robe, fixés aux hanches
  function skirtArt(race, look, d) {
    var W = d.tw, ar = look.ar;
    if (ar === 'robe') {
      var L = d.th + d.sh + d.an - 4;
      return p('d', 'M' + n(-W * 0.72) + ' -2L' + n(-W * 1.15) + ' ' + n(L) + 'Q0 ' + n(L + 5) + ' ' + n(W * 1.2) + ' ' + n(L - 1) + 'L' + n(W * 0.7) + ' -2Z') +
        q('g', 'M' + n(-W * 0.1) + ' -2L' + n(-W * 0.2) + ' ' + n(L + 2) + 'Q' + n(W * 0.5) + ' ' + n(L + 3) + ' ' + n(W * 1.1) + ' ' + n(L - 1) + 'L' + n(W * 0.66) + ' -2Z') +
        q('y', 'M' + n(-W * 1.1) + ' ' + n(L - 4) + 'Q0 ' + n(L + 1) + ' ' + n(W * 1.14) + ' ' + n(L - 5) + 'L' + n(W * 1.2) + ' ' + n(L - 1) + 'Q0 ' + n(L + 5) + ' ' + n(-W * 1.15) + ' ' + n(L) + 'Z') +
        ln('M' + n(W * 0.2) + ' 0L' + n(W * 0.34) + ' ' + n(L - 2));
    }
    if (ar === 'heavy') {
      var tr = MAT[race], s = '', i;
      for (i = 0; i < 4; i++) { var x = -W * 0.8 + i * W * 0.52; s += q(i % 2 ? tr[1] : tr[0], P(x, -2, x + W * 0.5, -2, x + W * 0.58, 14, x - W * 0.08, 14)); }
      return s;
    }
    if (ar === 'plate') {
      var tb = MAT[race];
      return q(tb[1], P(-W * 0.72, -2, W * 0.7, -2, W * 0.82, 10, -W * 0.84, 10)) + q('g', P(-W * 0.22, -2, W * 0.34, -2, W * 0.34, 18, W * 0.06, 14, -W * 0.22, 18)) + q('y', P(-W * 0.05, 4, W * 0.17, 4, W * 0.06, 10));
    }
    if (race === 4 || race === 5 || race === 3) return q('wd', P(-W * 0.72, -2, W * 0.7, -2, W * 0.5, 14, W * 0.14, 9, -W * 0.3, 15, -W * 0.72, 10));
    if (ar === 'tunic') return q('d', P(-W * 0.74, -2, W * 0.72, -2, W * 0.9, 11, W * 0.35, 8, -W * 0.2, 12, -W * 0.86, 9));
    return null;
  }

  // Jambes
  function legArts(race, look, d) {
    var ar = look.ar, tr = MAT[race], lw = d.lw;
    var plated = ar === 'plate' || ar === 'heavy';
    var a, b;
    if (plated) { a = tr[0]; b = tr[1]; }
    else if (race === 4 || race === 5) { a = 'sk'; b = 'sk'; }
    else if (race === 6) { a = 'b'; b = 'b'; }
    else if (race === 7) { a = 'g'; b = 'd'; }
    else if (ar === 'leather') { a = 'w'; b = 'wd'; }
    else { a = 'd'; b = 'k'; if (ar === 'robe') a = 'k'; }
    var th = limb(d.th, lw, lw * 0.84, a, b), sh = limb(d.sh, lw * 0.84, lw * 0.66, a, b), ft = '';
    if (plated) {
      th += bands(d.th, lw, 1) + o(tr[1], 0, d.th, lw * 0.44) + dot('#ffffff', -lw * 0.14, d.th - lw * 0.14, 0.7);
      sh += bands(d.sh, lw * 0.8, 2) + q(tr[2], P(-lw * 0.4, d.sh * 0.1, lw * 0.4, d.sh * 0.1, lw * 0.36, d.sh * 0.22, -lw * 0.36, d.sh * 0.22));
    } else if (race === 6) {
      th = limb(d.th, lw, lw * 0.8, 'b', 'b') + o('b', 0, d.th, lw * 0.5);
      sh = limb(d.sh, lw * 0.8, lw * 0.6, 'b', 'b');
    } else if (race === 7) {
      for (var i = 1; i < 4; i++) { th += oq('l', lw * 0.1, d.th * i / 4, 1.3); sh += oq('l', lw * 0.1, d.sh * i / 4, 1.1); }
    } else if (ar === 'tunic' || ar === 'leather') {
      sh += q('wd', P(-lw * 0.46, d.sh * 0.42, lw * 0.46, d.sh * 0.42, lw * 0.4, d.sh * 1.1, -lw * 0.4, d.sh * 1.1));
      sh += q('w', P(-lw * 0.5, d.sh * 0.42, lw * 0.5, d.sh * 0.42, lw * 0.46, d.sh * 0.54, -lw * 0.46, d.sh * 0.54));
      th += ln('M' + n(-lw * 0.3) + ' ' + n(d.th * 0.3) + 'L' + n(lw * 0.1) + ' ' + n(d.th * 0.5));
    }
    var F = d.ft, H = d.an;
    if (race === 7 || race === 4) {
      ft = p(race === 7 ? 'g' : 'sk', P(-4, -2, 3, -3, F * 0.7, H - 2, F, H, -4, H)) + q('b', P(F * 0.74, H - 1.4, F + 3.4, H + 0.4, F * 0.8, H + 0.4)) + q('b', P(F * 0.34, H - 2, F * 0.34 + 3, H + 0.4, F * 0.3, H + 0.4));
    } else if (race === 6) {
      ft = p('b', P(-3, -2, 3, -2, F, H - 1, F, H, -3, H));
    } else if (race === 5) {
      ft = p('wd', 'M-3 -2L3 -2Q' + n(F * 0.7) + ' ' + n(H - 2) + ' ' + n(F + 2) + ' ' + n(H - 3.5) + 'L' + n(F + 1) + ' ' + n(H) + 'L-3 ' + n(H) + 'Z');
    } else {
      var boot = plated ? tr[1] : 'wd';
      ft = p(boot, 'M' + n(-lw * 0.38) + ' -3L' + n(lw * 0.38) + ' -3L' + n(lw * 0.38) + ' ' + n(H * 0.3) + 'Q' + n(F) + ' ' + n(H * 0.3) + ' ' + n(F) + ' ' + n(H) + 'L' + n(-lw * 0.42) + ' ' + n(H) + 'Z') + q('k', P(-lw * 0.42, H - 1.3, F, H - 1.3, F, H, -lw * 0.42, H));
    }
    return { th: th, sh: sh, ft: ft };
  }

  // Bras
  function armArts(race, look, d) {
    var ar = look.ar, tr = MAT[race], aw = d.aw;
    var plated = ar === 'plate' || ar === 'heavy';
    var a, b, skin = race === 6 ? 'b' : 'sk';
    if (plated) { a = tr[0]; b = tr[1]; }
    else if (race === 4 || race === 5 || race === 7 && ar !== 'robe') { a = 'sk'; b = 'sk'; }
    else if (race === 6 && ar !== 'robe') { a = 'b'; b = 'b'; }
    else if (ar === 'leather') { a = 'w'; b = 'wd'; }
    else if (ar === 'robe') { a = 'g'; b = 'd'; }
    else { a = 'sk'; b = 'sk'; }
    var up = limb(d.ur, aw, aw * 0.84, a, b), fo = limb(d.fr, aw * 0.84, aw * 0.66, a === 'sk' && ar !== 'tunic' ? a : (plated ? a : (ar === 'tunic' ? 'sk' : a)), plated ? b : (ar === 'tunic' ? 'sk' : b));
    if (plated) {
      up += bands(d.ur, aw, 1);
      fo += bands(d.fr, aw * 0.8, 1) + o(tr[1], 0, 0, aw * 0.42) + q(tr[2], P(-aw * 0.38, d.fr * 0.72, aw * 0.38, d.fr * 0.72, aw * 0.34, d.fr * 0.84, -aw * 0.34, d.fr * 0.84));
    } else if (ar === 'tunic') {
      up = limb(d.ur, aw, aw * 0.9, 'g', 'd') + ln('M' + n(-aw * 0.44) + ' ' + n(d.ur * 0.72) + 'H' + n(aw * 0.44));
    } else if (ar === 'robe') {
      // Manche large
      fo = p(b, P(-aw * 0.5, 0, aw * 0.5, 0, aw * 0.9, d.fr * 0.82, -aw * 0.8, d.fr * 0.9)) + q(a, P(0, 0, aw * 0.5, 0, aw * 0.9, d.fr * 0.82, 0, d.fr * 0.88)) + q('y', P(-aw * 0.8, d.fr * 0.76, aw * 0.88, d.fr * 0.7, aw * 0.9, d.fr * 0.82, -aw * 0.8, d.fr * 0.9));
    }
    // Main
    fo += plated ? o(tr[1], 0, d.fr, aw * 0.5) : o(skin, 0, d.fr, aw * 0.46);
    if (plated) fo += ln('M' + n(-aw * 0.3) + ' ' + n(d.fr + 1) + 'H' + n(aw * 0.3));
    if (race === 7 || race === 4) fo += q('b', P(aw * 0.3, d.fr + aw * 0.1, aw * 0.8, d.fr + aw * 0.5, aw * 0.26, d.fr + aw * 0.5));
    if (look.pd) {
      var R = aw * 0.95;
      up += p(tr[0], 'M' + n(-R) + ' ' + n(R * 0.5) + 'Q' + n(-R * 1.1) + ' ' + n(-R) + ' 0 ' + n(-R * 1.1) + 'Q' + n(R * 1.1) + ' ' + n(-R) + ' ' + n(R) + ' ' + n(R * 0.5) + 'Q0 ' + n(R * 0.1) + ' ' + n(-R) + ' ' + n(R * 0.5) + 'Z');
      up += q(tr[2], 'M' + n(-R * 0.9) + ' ' + n(R * 0.46) + 'Q0 ' + n(R * 0.05) + ' ' + n(R * 0.9) + ' ' + n(R * 0.46) + 'L' + n(R * 0.8) + ' ' + n(R * 0.14) + 'Q0 ' + n(-R * 0.26) + ' ' + n(-R * 0.8) + ' ' + n(R * 0.14) + 'Z');
      if (race === 3 || race === 7 || race === 4) up += q('b', P(-R * 0.2, -R, 0, -R * 1.9, R * 0.3, -R));
    } else if (ar === 'plate') {
      var R2 = aw * 0.74;
      up += p(tr[0], 'M' + n(-R2) + ' ' + n(R2 * 0.6) + 'Q' + n(-R2) + ' ' + n(-R2) + ' 0 ' + n(-R2) + 'Q' + n(R2) + ' ' + n(-R2) + ' ' + n(R2) + ' ' + n(R2 * 0.6) + 'Z');
    }
    return { up: up, fo: fo };
  }

  function shieldArt(race, big) {
    var w = big ? 19 : 14, h = big ? 30 : 19, tr = MAT[race];
    var s = p(tr[0], 'M' + (-w) + ' ' + (-h) + 'Q0 ' + n(-h - 4) + ' ' + w + ' ' + (-h) + 'L' + w + ' ' + n(h * 0.1) + 'Q' + n(w * 0.8) + ' ' + n(h * 0.8) + ' 0 ' + (h + 3) + 'Q' + n(-w * 0.8) + ' ' + n(h * 0.8) + ' ' + (-w) + ' ' + n(h * 0.1) + 'Z');
    s += q('g', 'M' + n(-w + 3) + ' ' + n(-h + 2) + 'Q0 ' + n(-h - 1) + ' ' + n(w - 3) + ' ' + n(-h + 2) + 'L' + n(w - 3) + ' ' + n(h * 0.1) + 'Q' + n(w * 0.66) + ' ' + n(h * 0.68) + ' 0 ' + (h - 1) + 'Q' + n(-w * 0.66) + ' ' + n(h * 0.68) + ' ' + n(-w + 3) + ' ' + n(h * 0.1) + 'Z');
    s += q('d', 'M0 ' + n(-h) + 'Q' + n(w * 0.5) + ' ' + n(-h) + ' ' + n(w - 3) + ' ' + n(-h + 2) + 'L' + n(w - 3) + ' ' + n(h * 0.1) + 'Q' + n(w * 0.66) + ' ' + n(h * 0.68) + ' 0 ' + (h - 1) + 'Z');
    s += q('l', P(0, -h * 0.6, w * 0.42, -h * 0.05, 0, h * 0.48, -w * 0.42, -h * 0.05));
    s += o(tr[2], 0, -h * 0.05, 2.8) + dot('#ffffff', -w * 0.6, -h * 0.72, 1);
    return s;
  }

  // --- Squelette ---
  function Rig() { this.bones = []; this.index = {}; this.order = []; this.parts = {}; }
  Rig.prototype.bone = function (name, parent, x, y, partSvg, box, k) {
    var i = this.bones.length;
    this.bones.push({ n: name, p: parent ? this.index[parent] : -1, x: x, y: y, part: partSvg ? name : null, k: k || 1, spr: null });
    this.index[name] = i;
    if (partSvg) this.parts[name] = { id: name, svg: partSvg, box: box };
    return i;
  };
  Rig.prototype.draw = function (names) {
    var self = this;
    this.order = names.filter(function (m) { return self.index[m] !== undefined && self.bones[self.index[m]].part; }).map(function (m) { return self.index[m]; });
    // Ce qui est du côté opposé au regard reste dans l'ombre : le personnage gagne en volume
    var shieldUp = this.look && this.look.sh;
    this.bones.forEach(function (b) {
      var far = /^(thighB|shinB|footB|wingB|capeU|capeL|tailU|tailL|tail\d|tRB|sRB|tFB|sFB|tB\d|sB\d)$/.test(b.n) || (!shieldUp && /^(armUB|armLB)$/.test(b.n));
      b.dk = far ? 0.74 : 1;
    });
  };

  var cache = {};
  function get(race, uid, weapon) {
    var key = race + ':' + uid + ':' + (weapon || '');
    if (cache[key]) return cache[key];
    var rig = uid === 11 ? monster(race) : humanoid(race, uid, weapon);
    rig.key = key;
    cache[key] = rig;
    return rig;
  }

  function humanoid(race, uid, weapon) {
    var r = GV.RACES[race], hybrid = uid >= 100;
    var role = hybrid ? GV.ROLES[5] : GV.ROLES[uid];
    var look = hybrid ? LOOK[5] : LOOK[uid];
    var w = weapon || (hybrid ? GV.RACES[uid - 100].w[5] : r.w[uid]);
    var d = DIMS[race];
    var rig = new Rig();
    rig.type = 'biped';
    rig.d = d;
    rig.look = look;
    rig.weapon = w;
    rig.H = d.th + d.sh + d.an - 1.5;
    var legs = legArts(race, look, d), arms = armArts(race, look, d);
    var WB = [-d.tw * 2, -d.tor - d.hr * 3, d.tw * 2, 22];
    rig.bone('hip', null, 0, 0);
    if (look.cape) {
      rig.bone('torsoTop', 'hip', 0, 0);
    }
    rig.bone('torso', 'hip', 0, -1, torsoArt(race, look, d), WB);
    if (look.cape) {
      var cw = d.tw * 1.25, cl = (rig.H + d.tor) * 0.46;
      rig.bone('capeU', 'torso', -d.tw * 0.3, -d.tor + 2, p('d', P(-cw * 0.7, -2, cw * 0.7, -2, cw * 0.96, cl, -cw * 0.96, cl)) + q('g', P(-cw * 0.2, -1, cw * 0.66, -1, cw * 0.9, cl, -cw * 0.1, cl)) + q('y', P(-cw * 0.74, -3, cw * 0.74, -3, cw * 0.74, 1.2, -cw * 0.74, 1.2)), [-cw - 8, -8, cw + 8, cl + 8]);
      rig.bone('capeL', 'capeU', 0, cl - 1, p('d', P(-cw * 0.96, -1, cw * 0.96, -1, cw * 1.16, cl * 0.9, cw * 0.4, cl * 0.82, -cw * 0.2, cl * 0.94, -cw * 1.16, cl * 0.86)) + q('g', P(-cw * 0.1, 0, cw * 0.9, 0, cw * 1.08, cl * 0.84, cw * 0.4, cl * 0.76, -cw * 0.14, cl * 0.84)) + q('y', P(-cw * 1.1, cl * 0.72, cw * 1.08, cl * 0.72, cw * 1.16, cl * 0.9, cw * 0.4, cl * 0.82, -cw * 0.2, cl * 0.94, -cw * 1.16, cl * 0.86)), [-cw * 1.3 - 6, -6, cw * 1.3 + 6, cl + 8]);
    }
    if (race === 7) {
      rig.bone('tailU', 'hip', -d.tw * 0.5, 0, limb(22, 12, 8, 'g', 'd'), boxL(24, 14));
      rig.bone('tailL', 'tailU', 0, 22, limb(20, 8, 1.5, 'g', 'd'), boxL(22, 10));
      rig.bone('wingB', 'torso', -d.tw * 0.5, -d.tor * 0.82, wingArt('d', 'g', 34, 0), [-44, -44, 16, 16]);
    }
    rig.bone('armUB', 'torso', d.tw * 0.62, -d.tor + 4, arms.up, boxL(d.ur, d.aw * 2));
    rig.bone('armLB', 'armUB', 0, d.ur, arms.fo, boxL(d.fr, d.aw * 1.6));
    if (look.sh) rig.bone('shield', 'armLB', 0, d.fr * 0.72, shieldArt(race, look.sh === 2), [-24, -38, 24, 38]);
    if (look.orb) rig.bone('orb', 'armLB', 3, d.fr + 8, o('l', 0, 0, 8) + dot('#ffffff', -2.4, -2.6, 2.2), [-11, -11, 11, 11]);
    rig.bone('thighB', 'hip', -1.5, 0, legs.th, boxL(d.th, d.lw));
    rig.bone('shinB', 'thighB', 0, d.th, legs.sh, boxL(d.sh, d.lw));
    rig.bone('footB', 'shinB', 0, d.sh, legs.ft, [-d.lw - 4, -6, d.ft + 8, d.an + 4]);
    rig.bone('thighF', 'hip', 1.5, 0, legs.th, boxL(d.th, d.lw));
    rig.bone('shinF', 'thighF', 0, d.th, legs.sh, boxL(d.sh, d.lw));
    rig.bone('footF', 'shinF', 0, d.sh, legs.ft, [-d.lw - 4, -6, d.ft + 8, d.an + 4]);
    var sk = skirtArt(race, look, d);
    if (sk) rig.bone('skirt', 'hip', 0, 0, sk, [-d.tw * 1.5, -6, d.tw * 1.5, rig.H + 10]);
    rig.bone('head', 'torso', 1, -d.tor, headArt(race, look.hd, d.hr), [-d.hr * 2.4, -d.hr * 5, d.hr * 3.2, d.hr * 2.8]);
    rig.bone('armUF', 'torso', -d.tw * 0.7, -d.tor + 4, arms.up, boxL(d.ur, d.aw * 2));
    rig.bone('armLF', 'armUF', 0, d.ur, arms.fo, boxL(d.fr, d.aw * 1.6));
    var held = !!HELD[w], ws = role.big ? (role.under ? 78 : 96) : 70;
    rig.bone('weapon', 'armLF', 0, d.fr, null, null);
    rig.wform = w;
    rig.ws = ws;
    rig.held = held;
    rig.profile = WEAPON_PROFILE[w] || 'SLASH';
    var i = rig.index.weapon;
    rig.bones[i].part = 'weapon';
    rig.bones[i].k = ws / 80;
    rig.draw(['capeL', 'capeU', 'tailL', 'tailU', 'wingB', look.sh ? '' : 'armUB', look.sh ? '' : 'armLB', 'thighB', 'shinB', 'footB', 'thighF', 'shinF', 'footF', 'skirt', 'torso', look.sh ? 'armUB' : '', look.sh ? 'armLB' : '', 'shield', 'orb', 'head', 'armUF', 'weapon', 'armLF']);
    return rig;
  }
  function wingArt(a, b, L, ribs) {
    return p(a, P(0, 0, -L * 0.2, -L * 1.1, -L * 1.1, -L * 0.9, -L * 0.7, -L * 0.34, -L, 0, -L * 0.3, L * 0.1)) + q(b, P(-L * 0.1, -L * 0.1, -L * 0.3, -L * 0.96, -L * 0.8, -L * 0.8, -L * 0.45, -L * 0.2)) + ln('M0 0L' + n(-L * 0.7) + ' ' + n(-L * 0.34) + 'M0 0L' + n(-L * 0.2) + ' ' + n(-L * 1.1));
  }

  var HELD = { wbw: 1, wcb: 1, wro: 1, wbm: 1 };
  var WEAPON_PROFILE = { wsw: 'SLASH', wfb: 'CHOP', wci: 'SWEEP', wcv: 'SWEEP', wdg: 'STAB', wax: 'SLASH', wdx: 'CHOP', wmc: 'SLASH', whm: 'CHOP', wcl: 'CHOP', wbn: 'SLASH', wfl: 'SLASH', wsp: 'THRUST', wtr: 'THRUST', wha: 'THRUST', wsc: 'SWEEP', wja: 'THROW', wbw: 'BOW', wcb: 'GUN', wbl: 'GUN', wsb: 'GUN', wbm: 'THROW', wro: 'THROW', wst: 'CAST', wsk: 'CAST' };
  var POLE = { wsp: 1, wtr: 1, wha: 1, wsc: 1, wja: 1, wst: 0 };

  // --- Monstres ---
  function legPair(rig, side, parent, px, py, l1, l2, w, a, b, foot) {
    rig.bone('t' + side, parent, px, py, limb(l1, w, w * 0.72, a, b), boxL(l1, w));
    rig.bone('s' + side, 't' + side, 0, l1, limb(l2, w * 0.72, w * 0.5, a, b) + foot, [-w - 14, -w - 6, w + 26, l2 + w + 12]);
  }
  function monster(race) {
    return [griffon, golem, treant, boar, hydra, spider, boneDragon, wyvern][race]();
  }
  // Deux monstres debout partagent la mécanique des bipèdes
  function bigBiped(d, arts) {
    var rig = new Rig();
    rig.type = 'biped'; rig.d = d; rig.look = { ar: 'monster' }; rig.H = d.th + d.sh + d.an - 1.5; rig.fists = true; rig.profile = 'SLAM'; rig.big = true;
    rig.bone('hip', null, 0, 0);
    rig.bone('torso', 'hip', 0, -1, arts.torso, [-d.tw * 2, -d.tor - 20, d.tw * 2, 20]);
    rig.bone('armUB', 'torso', d.tw * 0.8, -d.tor + 8, arts.up, boxL(d.ur, d.aw * 2));
    rig.bone('armLB', 'armUB', 0, d.ur, arts.fo, boxL(d.fr, d.aw * 2));
    rig.bone('thighB', 'hip', -3, 0, arts.th, boxL(d.th, d.lw));
    rig.bone('shinB', 'thighB', 0, d.th, arts.sh, boxL(d.sh, d.lw));
    rig.bone('footB', 'shinB', 0, d.sh, arts.ft, [-d.lw - 6, -10, d.ft + 10, d.an + 6]);
    rig.bone('thighF', 'hip', 3, 0, arts.th, boxL(d.th, d.lw));
    rig.bone('shinF', 'thighF', 0, d.th, arts.sh, boxL(d.sh, d.lw));
    rig.bone('footF', 'shinF', 0, d.sh, arts.ft, [-d.lw - 6, -10, d.ft + 10, d.an + 6]);
    rig.bone('head', 'torso', 2, -d.tor, arts.head, [-52, -76, 52, 30]);
    rig.bone('armUF', 'torso', -d.tw * 0.8, -d.tor + 8, arts.up, boxL(d.ur, d.aw * 2));
    rig.bone('armLF', 'armUF', 0, d.ur, arts.fo, boxL(d.fr, d.aw * 2));
    rig.draw(['armUB', 'armLB', 'thighB', 'shinB', 'footB', 'thighF', 'shinF', 'footF', 'torso', 'head', 'armUF', 'armLF']);
    return rig;
  }
  function golem() {
    var d = { th: 26, sh: 26, an: 7, ft: 20, tor: 52, tw: 30, ur: 32, fr: 34, aw: 24, lw: 25, hr: 14 };
    function rivets(l, w) { return dot('#ffd75a', -w * 0.3, l * 0.25, 1.4) + dot('#ffd75a', w * 0.3, l * 0.25, 1.4) + dot('#ffd75a', -w * 0.3, l * 0.75, 1.4) + dot('#ffd75a', w * 0.3, l * 0.75, 1.4); }
    function block(l, w, a, b) { return p(b, P(-w / 2, -3, w / 2, -3, w / 2 - 2, l + 3, -w / 2 + 2, l + 3)) + q(a, P(1, -2, w / 2 - 1, -2, w / 2 - 3, l + 2, 1, l + 2)) + rivets(l, w); }
    var t = p('md', P(-34, -52, 34, -52, 24, 2, -24, 2)) + q('m', P(2, -50, 32, -50, 22, 1, 2, 1));
    t += q('sd', P(-22, -14, 22, -14, 20, 2, -20, 2)) + ln('M-24 -30H26M-28 -42H30M2 -52V2');
    t += q('g', P(2, -44, 16, -30, 2, -14, -12, -30)) + q('l', P(2, -38, 9, -30, 2, -22, -5, -30)) + dot('#ffffff', 0, -33, 1.4);
    [-26, 26].forEach(function (x) { t += dot('#ffd75a', x, -46, 1.6) + dot('#ffd75a', x * 0.7, -6, 1.6); });
    var h = p('md', P(-13, -4, 15, -4, 17, -24, 9, -30, -9, -30, -14, -22)) + q('m', P(2, -29, 8, -29, 16, -24, 14, -5, 2, -5));
    h += q('k', P(-7, -20, 16, -20, 15, -13, -7, -13)) + dot('#ffd75a', 1, -17, 2.2) + dot('#ffd75a', 10, -17, 2) + dot('#ffffff', 0.4, -17.6, 0.8);
    var fo = block(d.fr, d.aw - 2, 'm', 'md') + p('sd', P(-14, d.fr, 14, d.fr, 16, d.fr + 16, -14, d.fr + 16)) + ln('M-6 ' + (d.fr + 6) + 'V' + (d.fr + 16) + 'M3 ' + (d.fr + 6) + 'V' + (d.fr + 16));
    return bigBiped(d, { torso: t, head: h, up: block(d.ur, d.aw, 'm', 'md') + o('y', 0, 0, 9), fo: fo, th: block(d.th, d.lw, 'm', 'md'), sh: block(d.sh, d.lw - 2, 'm', 'md'), ft: p('sd', P(-14, -5, 12, -5, 22, d.an - 1, 22, d.an, -14, d.an)) });
  }
  function treant() {
    var d = { th: 24, sh: 26, an: 7, ft: 18, tor: 54, tw: 26, ur: 32, fr: 34, aw: 15, lw: 19, hr: 14 };
    function bark(l, w) { return p('wd', P(-w / 2, -2, w / 2, -2, w / 2 - 2, l + 2, -w / 2 + 2, l + 2)) + q('w', P(0, -1, w / 2 - 1, -1, w / 2 - 3, l + 1, 0, l + 1)) + ln('M' + n(-w * 0.2) + ' 2L' + n(-w * 0.12) + ' ' + n(l * 0.5) + 'L' + n(-w * 0.24) + ' ' + n(l - 1) + 'M' + n(w * 0.22) + ' 4L' + n(w * 0.14) + ' ' + n(l * 0.6)); }
    function leaf(x, y, r, c) { return p(c, P(x, y - r, x + r * 0.86, y - r * 0.2, x + r * 0.5, y + r * 0.8, x - r * 0.5, y + r * 0.8, x - r * 0.86, y - r * 0.2)); }
    var t = p('wd', 'M-24 2L-30 -46Q-14 -56 2 -54Q20 -56 30 -44L24 2Z') + q('w', P(2, -52, 28, -44, 22, 1, 2, 1));
    t += ln('M-16 0L-20 -24L-12 -46M-4 0L-6 -24M12 0L16 -24L10 -46M-16 -24L-4 -18');
    t += q('k', 'M-6 -24Q2 -14 12 -24Q2 -20 -6 -24Z') + dot('#ffd75a', -6, -34, 3) + dot('#ffd75a', 11, -34, 2.8) + dot('#ffffff', -6.5, -35, 1);
    t += q('k', P(-10, -41, -2, -36, -10, -37)) + q('k', P(14, -41, 7, -36, 14, -37));
    var h = '';
    [[-22, -26, 15, 'd'], [22, -26, 15, 'd'], [-12, -38, 15, 'g'], [14, -38, 15, 'd'], [0, -50, 15, 'g'], [-2, -24, 17, 'l'], [18, -14, 11, 'g'], [-22, -10, 11, 'd'], [-30, -40, 9, 'g'], [32, -38, 9, 'g']].forEach(function (a) { h += leaf(a[0], a[1], a[2], a[3]); });
    h += o('y', 22, -40, 2.4) + o('y', -24, -24, 2.2) + oc('#ff8ad1', 4, -30, 2.4);
    var fo = bark(d.fr, d.aw) + p('wd', P(-9, d.fr, -16, d.fr + 16, -6, d.fr + 8, -2, d.fr + 20, 3, d.fr + 8, 12, d.fr + 16, 9, d.fr)) + leaf(4, d.fr * 0.4, 5, 'g');
    return bigBiped(d, { torso: t, head: h, up: bark(d.ur, d.aw + 2) + leaf(0, 0, 8, 'l'), fo: fo, th: bark(d.th, d.lw), sh: bark(d.sh, d.lw), ft: p('wd', P(-10, -4, 8, -4, 20, d.an - 3, 16, d.an, 6, d.an - 2, 0, d.an, -12, d.an)) });
  }
  // Quadrupèdes, volants et autres : tronc, cou, tête, mâchoire, ailes, queue, pattes
  function beastBase(rig, opt) {
    rig.type = 'beast';
    rig.H = opt.H;
    rig.fly = opt.fly || 0;
    rig.legs = [];
    rig.necks = [];
    rig.tail = [];
    rig.wings = [];
    rig.profile = 'BITE';
    rig.big = true;
    return rig;
  }
  function griffon() {
    var rig = beastBase(new Rig(), { H: 56, fly: 14 });
    rig.bone('body', null, 0, 0, pc('#d9a548', 'M-46 -2Q-50 -24 -24 -26Q6 -32 30 -24Q44 -16 40 6Q24 22 -8 20Q-40 22 -46 -2Z') + qc('#b37d2c', 'M-44 2Q-24 16 0 14Q-16 22 -30 18Q-42 12 -44 2Z') + q('m', 'M12 -28Q40 -28 42 -6Q38 12 18 20Q6 2 12 -28Z') + q('l', 'M18 -22Q34 -20 34 -6Q32 6 22 12Q14 0 18 -22Z') + ln('M20 -14L28 -8M18 -4L28 2M22 6L30 8') + q('g', P(-12, -30, 12, -32, 14, -22, -10, -20)) + q('y', P(-12, -22, 14, -24, 14, -21, -11, -19)), [-60, -46, 56, 34]);
    rig.bone('tail1', 'body', -44, -4, limb(26, 8, 5, 'y', 'wd'), boxL(28, 10));
    rig.bone('tail2', 'tail1', 0, 26, limb(22, 5, 3, 'y', 'wd') + p('wd', P(-4, 18, 5, 18, 6, 32, 0, 38, -6, 32)), [-14, -12, 14, 48]);
    rig.tail = ['tail1', 'tail2'];
    function wing(a, b, c) {
      var s = '', i, L = 86;
      for (i = 0; i < 6; i++) {
        var ang = -2.5 + i * 0.3, x = Math.cos(ang) * L * (1 - i * 0.07), y = Math.sin(ang) * L * (1 - i * 0.07), x2 = Math.cos(ang + 0.42) * L * (0.86 - i * 0.05), y2 = Math.sin(ang + 0.42) * L * (0.86 - i * 0.05);
        s += q(i % 2 ? a : b, P(0, 0, x * 0.6, y * 0.6 - 4, x, y, x2, y2));
      }
      s += p(c, 'M4 6Q-22 -6 -36 -44L-26 -48Q-10 -20 14 -6Z') + ln('M-4 -6L-18 -26M2 -2L-10 -18');
      return s;
    }
    rig.bone('wingB', 'body', 10, -22, wing('d', 'g', 'd'), [-96, -96, 30, 22]);
    rig.bone('wingF', 'body', -4, -22, wing('l', 'g', 'y'), [-96, -96, 30, 22]);
    rig.wings = ['wingF', 'wingB'];
    var paw = qc('#b37d2c', P(-5, 30, 7, 30, 14, 36, -5, 36)), talon = q('y', P(-3, 28, 8, 28, 13, 34, 4, 31, 5, 36, -2, 32, -4, 36));
    legPair(rig, 'RB', 'body', -32, 8, 24, 26, 15, 'y', 'wd', paw);
    legPair(rig, 'FB', 'body', 26, 8, 22, 28, 11, 'y', 'wd', talon);
    legPair(rig, 'RF', 'body', -24, 10, 24, 26, 16, 'y', 'wd', paw);
    legPair(rig, 'FF', 'body', 32, 10, 22, 28, 12, 'm', 'y', talon);
    rig.legs = [{ t: 'tRF', s: 'sRF', l1: 24, l2: 26, ph: 0 }, { t: 'tRB', s: 'sRB', l1: 24, l2: 26, ph: 0.5 }, { t: 'tFF', s: 'sFF', l1: 22, l2: 28, ph: 0.5 }, { t: 'tFB', s: 'sFB', l1: 22, l2: 28, ph: 0 }];
    rig.bone('neck1', 'body', 32, -18, p('m', P(-11, 4, 11, 4, 9, -26, -7, -26)) + q('l', P(1, 2, 10, 2, 8, -24, 1, -24)) + ln('M-6 -8L6 -12M-6 -18L6 -20'), [-18, -34, 18, 10]);
    rig.bone('head', 'neck1', 2, -26, p('m', 'M-12 2Q-16 -16 2 -18Q16 -16 16 -6L10 4Z') + q('l', P(-12, -14, -24, -22, -8, -18)) + q('l', P(-14, -6, -28, -8, -14, -1)) + p('y', 'M14 -10Q32 -8 36 4Q26 2 12 -1Z') + dot('#ffd75a', 7, -8, 3.4) + dot('#120e0a', 8, -8, 1.8) + dot('#ffffff', 6.6, -9, 0.7), [-32, -28, 42, 12]);
    rig.bone('jaw', 'head', 12, -1, p('y', 'M0 0Q12 4 20 8Q8 8 -2 4Z'), [-6, -5, 26, 13]);
    rig.necks = [{ b: ['neck1'], head: 'head', jaw: 'jaw', a0: 0.5 }];
    rig.draw(['wingB', 'tRB', 'sRB', 'tFB', 'sFB', 'tail1', 'tail2', 'tRF', 'sRF', 'body', 'tFF', 'sFF', 'neck1', 'jaw', 'head', 'wingF']);
    return rig;
  }
  function boar() {
    var rig = beastBase(new Rig(), { H: 42 });
    rig.sz = 1.2;
    rig.bone('body', null, 0, 0, pc('#8a5430', 'M-50 -4Q-52 -30 -22 -34Q14 -42 40 -28Q50 -12 44 8Q20 24 -14 22Q-46 22 -50 -4Z') + qc('#5e3519', 'M-48 2Q-24 18 8 16Q30 14 44 4Q30 20 -6 22Q-40 22 -48 2Z') + p('md', P(-24, -36, 18, -40, 22, -6, -20, -4)) + q('m', P(-1, -38, 17, -39, 20, -8, 0, -6)) + q('g', P(-16, -24, 13, -27, 15, -12, -14, -10)) + q('l', P(-8, -22, 6, -24, 8, -14, -7, -12)) + q('y', P(-25, -8, 23, -10, 24, -4, -24, -2)) + q('b', P(-20, -36, -14, -48, -8, -37)) + q('b', P(-2, -39, 4, -52, 10, -40)) + q('b', P(14, -40, 22, -50, 24, -38)), [-62, -60, 58, 32]);
    rig.bone('tail1', 'body', -48, -14, limb(16, 5, 2, 'w', 'wd') + '', boxL(18, 6));
    rig.tail = ['tail1'];
    function hoof(c) { return q('k', P(-7, 22, 7, 22, 8, 28, -8, 28)); }
    legPair(rig, 'RB', 'body', -34, 10, 16, 18, 15, 'w', 'wd', hoof());
    legPair(rig, 'FB', 'body', 28, 10, 16, 18, 14, 'w', 'wd', hoof());
    legPair(rig, 'RF', 'body', -26, 12, 16, 18, 16, 'w', 'wd', hoof());
    legPair(rig, 'FF', 'body', 34, 12, 16, 18, 15, 'w', 'wd', hoof());
    rig.legs = [{ t: 'tRF', s: 'sRF', l1: 16, l2: 18, ph: 0 }, { t: 'tRB', s: 'sRB', l1: 16, l2: 18, ph: 0.5 }, { t: 'tFF', s: 'sFF', l1: 16, l2: 18, ph: 0.5 }, { t: 'tFB', s: 'sFB', l1: 16, l2: 18, ph: 0 }];
    rig.bone('neck1', 'body', 42, -14, null);
    rig.bone('head', 'neck1', 0, 0, pc('#8a5430', 'M-16 -18Q6 -26 24 -12L44 -4Q48 6 40 10L14 14Q-14 16 -16 -18Z') + qc('#b5784a', P(30, -8, 45, -3, 46, 6, 32, 8)) + q('k', 'M38 -1h3v3h-3z') + qc('#5e3519', P(-10, -20, -16, -34, -2, -22)) + dot('#e0263c', 16, -9, 3) + dot('#120e0a', 16.5, -9, 1.6) + dot('#ffffff', 15.5, -10, 0.7) + q('k', P(-16, -18, 18, -18, 20, -14, -16, -12)) + q('b', 'M28 8Q40 8 44 -8Q46 8 34 14Z') + q('md', P(-4, -20, 16, -18, 16, -10, -4, -13)), [-24, -40, 54, 22]);
    rig.bone('jaw', 'head', 16, 9, pc('#5e3519', 'M-6 -2L24 -2Q20 8 2 8Z'), [-12, -8, 30, 14]);
    rig.necks = [{ b: [], head: 'head', jaw: 'jaw', a0: 0, ram: true }];
    rig.draw(['tRB', 'sRB', 'tFB', 'sFB', 'tail1', 'tRF', 'sRF', 'body', 'tFF', 'sFF', 'jaw', 'head']);
    return rig;
  }
  function wyvern() {
    var rig = beastBase(new Rig(), { H: 58, fly: 22 });
    rig.bone('body', null, 0, 0, p('g', 'M-34 -4Q-38 -24 -10 -28Q22 -30 34 -14Q38 4 18 14Q-22 22 -34 -4Z') + q('l', 'M-24 8Q2 18 26 8Q34 0 32 -8Q6 8 -24 8Z') + ln('M-10 9V15M4 8V14M16 5V11') + q('d', P(-20, -27, -14, -38, -8, -29)) + q('d', P(-4, -30, 2, -42, 8, -30)) + q('d', P(12, -29, 18, -38, 22, -24)), [-46, -50, 46, 28]);
    rig.bone('tail1', 'body', -32, -4, limb(30, 16, 10, 'g', 'd'), boxL(32, 16));
    rig.bone('tail2', 'tail1', 0, 30, limb(28, 10, 6, 'g', 'd'), boxL(30, 12));
    rig.bone('tail3', 'tail2', 0, 28, limb(22, 6, 2, 'g', 'd') + p('y', P(-1, 18, 12, 28, 0, 40, -12, 28)), [-18, -10, 18, 48]);
    rig.tail = ['tail1', 'tail2', 'tail3'];
    function wing(a, b) { return p(a, P(0, 4, -22, -58, -96, -74, -74, -34, -88, -6, -50, -14, -34, 18)) + q(b, P(-8, -2, -24, -50, -82, -66, -64, -30, -44, -20, -30, 6)) + ln('M-22 -58L-74 -34M-22 -58L-50 -14M-22 -58L-30 16') + p('sk', 'M-3 6L-25 -60L-17 -60L5 2Z') + q('b', P(-22, -60, -26, -72, -16, -60)); }
    rig.bone('wingB', 'body', 12, -22, wing('d', 'd'), [-104, -86, 18, 28]);
    rig.bone('wingF', 'body', 0, -22, wing('g', 'l'), [-104, -86, 18, 28]);
    rig.wings = ['wingF', 'wingB'];
    var claw = q('b', P(-5, 24, 10, 24, 16, 30, 8, 28, 8, 33, 1, 28, -4, 32));
    legPair(rig, 'RB', 'body', -6, 12, 20, 24, 13, 'g', 'd', claw);
    legPair(rig, 'RF', 'body', 4, 14, 20, 24, 14, 'g', 'd', claw);
    rig.legs = [{ t: 'tRF', s: 'sRF', l1: 20, l2: 24, ph: 0 }, { t: 'tRB', s: 'sRB', l1: 20, l2: 24, ph: 0.5 }];
    rig.bone('neck1', 'body', 30, -14, limb(28, 15, 11, 'g', 'd') + q('l', P(3, 0, 8, 0, 6, 28, 3, 28)), boxL(30, 15));
    rig.bone('neck2', 'neck1', 0, 28, limb(24, 11, 8, 'g', 'd') + q('l', P(2, 0, 5.5, 0, 4, 24, 2, 24)), boxL(26, 11));
    rig.bone('head', 'neck2', 0, 24, p('sk', 'M-12 -8Q-6 -16 8 -14L34 -6L36 2L12 6L-10 6Z') + p('d', P(-8, -12, -30, -24, -14, -4)) + p('d', P(-3, -14, -22, -32, -6, -8)) + dot('#ffd75a', 6, -8, 3) + '<rect fill="#120e0a" x="5.5" y="-11" width="1.2" height="6"></rect>' + q('b', P(16, 3, 19, 8, 22, 3)) + q('b', P(26, 3, 29, 8, 32, 2)) + dot('#120e0a', 31, -3, 1), [-36, -38, 44, 16]);
    rig.bone('jaw', 'head', 8, 5, p('l', P(-12, 0, 26, 0, 22, 8, -8, 8)) + q('b', P(6, 0, 9, -4, 12, 0)) + q('b', P(15, 0, 18, -4, 21, 0)), [-18, -8, 32, 14]);
    rig.necks = [{ b: ['neck1', 'neck2'], head: 'head', jaw: 'jaw', a0: -1.05, sn: true }];
    rig.draw(['wingB', 'tRB', 'sRB', 'tail3', 'tail2', 'tail1', 'tRF', 'sRF', 'body', 'neck2', 'neck1', 'jaw', 'head', 'wingF']);
    return rig;
  }
  function boneDragon() {
    var rig = beastBase(new Rig(), { H: 58, fly: 22 });
    var ribs = '';
    for (var i = 0; i < 6; i++) { var x = -26 + i * 10; ribs += q('b', 'M' + x + ' -24Q' + (x + 5) + ' -2 ' + (x - 2) + ' 12L' + (x - 5) + ' 11Q' + (x + 2) + ' -2 ' + (x - 3) + ' -23Z'); }
    rig.bone('body', null, 0, 0, pc('#1a1030', 'M-32 -20Q0 -30 30 -20Q36 0 16 14Q-16 18 -32 0Z') + dot('#b070ff', 2, -6, 9) + ribs + q('b', 'M-38 -26Q0 -36 38 -22L36 -18Q0 -30 -36 -20Z') + q('b', P(-30, -30, -26, -38, -22, -30)) + q('b', P(-12, -33, -8, -41, -4, -33)) + q('b', P(8, -33, 12, -41, 16, -31)), [-48, -50, 48, 28]);
    function bone1(l) { return limb(l, 6, 4.5, 'b', 'b') + o('b', 0, 0, 4.5) + o('b', 0, l, 3.4); }
    rig.bone('tail1', 'body', -34, -18, bone1(24), boxL(26, 8));
    rig.bone('tail2', 'tail1', 0, 24, bone1(22), boxL(24, 8));
    rig.bone('tail3', 'tail2', 0, 22, limb(18, 4, 1, 'b', 'b') + q('g', P(0, 12, 8, 22, 0, 32, -8, 22)), [-14, -8, 14, 38]);
    rig.tail = ['tail1', 'tail2', 'tail3'];
    function wing(a) { return '<path fill="' + a + '" fill-opacity=".62" d="M0 4L-22 -60L-94 -76L-72 -36L-86 -6L-50 -14L-34 18Z"></path>' + limb(1, 1, 1, 'b', 'b') + q('b', 'M-3 6L-25 -60L-20 -62L3 3Z') + q('b', 'M-24 -62L-96 -78L-94 -74L-25 -56Z') + q('b', 'M-22 -58L-74 -36L-73 -33L-20 -54Z') + q('b', 'M-22 -58L-52 -14L-48 -13L-18 -55Z') + q('b', 'M-22 -58L-34 18L-30 18L-18 -56Z'); }
    rig.bone('wingB', 'body', 12, -22, wing('#4a2384'), [-104, -88, 18, 28]);
    rig.bone('wingF', 'body', 0, -22, wing('#8d4de0'), [-104, -88, 18, 28]);
    rig.wings = ['wingF', 'wingB'];
    var claw = q('b', P(-4, 24, 8, 24, 14, 31, 6, 28, 6, 33, 0, 28, -4, 33));
    legPair(rig, 'RB', 'body', -14, 12, 20, 24, 6, 'b', 'b', claw);
    legPair(rig, 'RF', 'body', 2, 14, 20, 24, 6.5, 'b', 'b', claw);
    rig.legs = [{ t: 'tRF', s: 'sRF', l1: 20, l2: 24, ph: 0 }, { t: 'tRB', s: 'sRB', l1: 20, l2: 24, ph: 0.5 }];
    rig.bone('neck1', 'body', 30, -18, bone1(24) + o('b', 0, 12, 4.5), boxL(26, 8));
    rig.bone('neck2', 'neck1', 0, 24, bone1(22) + o('b', 0, 11, 4), boxL(24, 8));
    rig.bone('head', 'neck2', 0, 22, p('b', 'M-12 -8Q-4 -18 10 -14L34 -6L34 0L12 2L-10 6Z') + q('k', P(0, -11, 9, -9, 9, -3, 0, -3)) + dot('#c084ff', 5, -7, 2.4) + dot('#ffffff', 4.4, -7.6, 0.8) + q('k', P(26, -5, 30, -4, 28, -1)) + q('b', P(14, 1, 17, 7, 20, 1)) + q('b', P(23, 1, 26, 7, 29, 0)) + p('b', P(-8, -12, -30, -26, -12, -4)) + p('b', P(-3, -14, -20, -32, -5, -9)), [-36, -38, 42, 14]);
    rig.bone('jaw', 'head', 6, 5, p('b', P(-12, 0, 24, 0, 20, 7, -8, 7)) + q('b', P(4, 0, 7, -4, 10, 0)) + q('b', P(13, 0, 16, -4, 19, 0)), [-18, -8, 30, 13]);
    rig.necks = [{ b: ['neck1', 'neck2'], head: 'head', jaw: 'jaw', a0: -1.05, sn: true }];
    rig.draw(['wingB', 'tRB', 'sRB', 'tail3', 'tail2', 'tail1', 'tRF', 'sRF', 'body', 'neck2', 'neck1', 'jaw', 'head', 'wingF']);
    return rig;
  }
  function hydra() {
    var rig = beastBase(new Rig(), { H: 34 });
    rig.bone('body', null, 0, 0, p('d', 'M-52 14Q-56 -24 -14 -34Q30 -38 46 -14Q54 8 44 20Q-4 34 -52 14Z') + q('g', 'M-36 -14Q-6 -32 34 -18Q46 -4 38 10Q-4 -4 -36 -14Z') + q('l', 'M-44 12Q-4 28 40 16L38 22Q-4 30 -46 18Z') + ln('M-20 -22L-16 -6M-2 -26L0 -6M16 -22L14 -2'), [-64, -50, 60, 40]);
    rig.bone('tail1', 'body', -48, 2, limb(26, 16, 9, 'g', 'd'), boxL(28, 16));
    rig.bone('tail2', 'tail1', 0, 26, limb(26, 9, 2, 'g', 'd'), boxL(28, 10));
    rig.tail = ['tail1', 'tail2'];
    var claw = q('b', P(-7, 10, 9, 10, 14, 16, -7, 16));
    legPair(rig, 'RF', 'body', -24, 16, 8, 10, 15, 'g', 'd', claw);
    legPair(rig, 'FF', 'body', 22, 18, 8, 10, 15, 'g', 'd', claw);
    rig.legs = [{ t: 'tRF', s: 'sRF', l1: 8, l2: 10, ph: 0 }, { t: 'tFF', s: 'sFF', l1: 8, l2: 10, ph: 0.5 }];
    var order = [];
    var defs = [{ x: -6, y: -22, a0: -0.26, L: 28 }, { x: 22, y: -14, a0: -1.2, L: 26 }, { x: 8, y: -22, a0: -0.75, L: 34 }];
    defs.forEach(function (dn, k) {
      var id = 'n' + k, b1 = id + 'a', b2 = id + 'b', b3 = id + 'c', hd = id + 'h', jw = id + 'j', L = dn.L;
      rig.bone(b1, 'body', dn.x, dn.y, limb(L, 16, 13, 'g', 'd') + q('l', P(3.5, 0, 7.4, 0, 6, L, 3, L)), boxL(L, 16));
      rig.bone(b2, b1, 0, L, limb(L, 13, 11, 'g', 'd') + q('l', P(3, 0, 6, 0, 5, L, 2.6, L)), boxL(L, 13));
      rig.bone(b3, b2, 0, L, limb(L * 0.8, 11, 9, 'g', 'd') + q('l', P(2.6, 0, 5, 0, 4, L * 0.8, 2.4, L * 0.8)), boxL(L, 11));
      rig.bone(hd, b3, 0, L * 0.8, p('g', 'M-11 -8Q-2 -15 10 -11L28 -6L30 1L10 4L-10 6Z') + q('d', P(-10, -9, -24, -14, -11, -2)) + q('d', P(-5, -11, -18, -22, -3, -11)) + dot('#ffd75a', 5, -6, 2.6) + '<rect fill="#120e0a" x="4.5" y="-8.6" width="1" height="5"></rect>' + q('b', P(14, 2, 16, 6, 19, 2)) + q('b', P(21, 2, 23, 6, 26, 1)), [-30, -28, 36, 12]);
      rig.bone(jw, hd, 6, 4, p('l', P(-12, 0, 20, 0, 16, 7, -8, 7)), [-16, -6, 26, 12]);
      rig.necks.push({ b: [b1, b2, b3], head: hd, jaw: jw, a0: dn.a0, sn: true });
      order.push(b3, b2, b1, jw, hd);
    });
    rig.draw(['tail2', 'tail1', 'tRF', 'sRF', 'tFF', 'sFF', 'body'].concat(order));
    return rig;
  }
  function spider() {
    var rig = beastBase(new Rig(), { H: 44 });
    rig.sz = 1.4;
    rig.bone('body', null, 0, 0, p('d', 'M-8 -10Q-52 -36 -66 -6Q-66 22 -32 20Q-10 18 -4 6Z') + q('g', 'M-14 -10Q-46 -28 -60 -6Q-48 -18 -14 -2Z') + p('y', P(-38, -20, -29, -8, -38, 4, -47, -8)) + q('g', P(-38, -14, -33, -8, -38, -2, -43, -8)) + p('k', 'M-6 -16Q20 -24 30 -6Q30 10 8 12Q-8 12 -6 -16Z') + q('d', 'M-4 -14Q18 -20 26 -8Q14 -12 -4 -6Z') + dot('#e0263c', 20, -8, 3) + dot('#e0263c', 26, -6, 2.4) + dot('#e0263c', 14, -11, 2.2) + dot('#e0263c', 22, -1, 1.8) + dot('#ffffff', 19, -9, 0.9) + '<g transform="translate(-6,-16)">' + p('wd', P(-8, 0, 8, 0, 6, -18, -6, -18)) + o('sk', 1, -25, 8) + p('sk', P(-4, -26, -16, -33, -6, -21)) + p('sk', P(6, -26, 17, -33, 8, -21)) + dot('#120e0a', 1.5, -26, 1.2) + dot('#120e0a', 6, -26, 1.2) + '</g>', [-78, -70, 42, 30]);
    var near = [[20, -2, 28, 36], [8, 2, 28, 38], [-4, 4, 26, 38], [-16, 2, 26, 36]];
    var far = [[24, -6, 24, 32], [14, -4, 24, 34], [0, -2, 24, 34], [-12, -4, 24, 32]];
    function add(list, tag, a, b, w) {
      list.forEach(function (L, k) {
        var nm = tag + k;
        rig.bone('t' + nm, 'body', L[0], L[1], limb(L[2], w, w * 0.7, a, b), boxL(L[2], w));
        rig.bone('s' + nm, 't' + nm, 0, L[2], limb(L[3], w * 0.7, 1.5, a, b), boxL(L[3], w));
        rig.legs.push({ t: 't' + nm, s: 's' + nm, l1: L[2], l2: L[3], ph: (k % 2 ? 0.5 : 0) + (tag === 'B' ? 0.5 : 0), reach: 32 - k * 20, up: true });
      });
    }
    add(far, 'B', 'd', 'k', 7);
    add(near, 'F', 'g', 'd', 8);
    rig.bone('neck1', 'body', 24, -2, null);
    rig.bone('head', 'neck1', 0, 0, null);
    rig.bone('jaw', 'neck1', 2, 4, q('b', 'M0 -2Q12 2 10 14Q6 6 -2 4Z'), [-6, -6, 16, 18]);
    rig.necks = [{ b: [], head: 'head', jaw: 'jaw', a0: 0, ram: true }];
    rig.draw(['tB0', 'sB0', 'tB1', 'sB1', 'tB2', 'sB2', 'tB3', 'sB3', 'jaw', 'body', 'tF0', 'sF0', 'tF1', 'sF1', 'tF2', 'sF2', 'tF3', 'sF3']);
    return rig;
  }

  // --- Animation ---
  // Clés d'attaque : u/f bras porteur (0 en bas, PI/2 devant, PI au-dessus), ub/fb autre bras, w arme (angle absolu),
  // tor torse, hd tête, hx/hy déplacement du bassin. "hit" : instant du contact. Les valeurs absentes gardent la pose de base.
  var PROFILES = {
    SLASH: { dur: 0.62, hit: 0.46, keys: [
      { t: 0.32, u: 2.7, f: 2.5, w: -0.7, tor: -0.24, hx: -2, hd: -0.1 },
      { t: 0.44, u: 1.8, f: 1.5, w: 1.1, tor: 0.14, hx: 3, hd: 0.08 },
      { t: 0.54, u: 0.9, f: 0.7, w: 2.2, tor: 0.34, hx: 6, hy: 3 },
      { t: 0.7, u: 0.8, f: 0.7, w: 2, tor: 0.28, hx: 5, hy: 2 }
    ] },
    SWEEP: { dur: 0.58, hit: 0.42, keys: [
      { t: 0.3, u: 1.1, f: 0.1, w: -1.5, tor: -0.3, hx: -2, hd: 0.12 },
      { t: 0.42, u: 1.5, f: 1.5, w: 1.4, tor: 0.1, hx: 3 },
      { t: 0.54, u: 1.5, f: 2.5, w: 3, tor: 0.32, hx: 6, hy: 1 },
      { t: 0.72, u: 1.2, f: 2, w: 2.5, tor: 0.22, hx: 4 }
    ] },
    CHOP: { dur: 0.86, hit: 0.56, keys: [
      { t: 0.38, u: 3, f: 3.1, w: -1, ub: 2.8, fb: 3, tor: -0.34, hx: -4, hy: 3, hd: -0.2 },
      { t: 0.52, u: 2.2, f: 2.1, w: 0.7, ub: 2, fb: 2, tor: 0.05, hx: 2, hy: -4 },
      { t: 0.62, u: 1, f: 0.8, w: 2.1, ub: 1, fb: 0.9, tor: 0.46, hx: 9, hy: 5 },
      { t: 0.8, u: 0.9, f: 0.7, w: 2, ub: 0.9, fb: 0.8, tor: 0.38, hx: 7, hy: 4 }
    ] },
    STAB: { dur: 0.46, hit: 0.4, keys: [
      { t: 0.28, u: 0.1, f: 1.1, w: 1.5, tor: -0.2, hx: -3 },
      { t: 0.42, u: 1.5, f: 1.6, w: 1.6, tor: 0.34, hx: 8 },
      { t: 0.62, u: 1.4, f: 1.5, w: 1.6, tor: 0.3, hx: 7 }
    ] },
    THRUST: { dur: 0.6, hit: 0.44, keys: [
      { t: 0.3, u: 0.2, f: 1.3, w: 1.5, tor: -0.2, hx: -4 },
      { t: 0.46, u: 1.5, f: 1.6, w: 1.58, tor: 0.3, hx: 9 },
      { t: 0.66, u: 1.4, f: 1.55, w: 1.58, tor: 0.24, hx: 7 }
    ] },
    SLAM: { dur: 0.9, hit: 0.58, keys: [
      { t: 0.4, u: 3, f: 3.1, ub: 3, fb: 3.1, tor: -0.3, hx: -4, hy: 2, hd: -0.2 },
      { t: 0.56, u: 2, f: 1.8, ub: 2, fb: 1.8, tor: 0.1, hx: 3, hy: -3 },
      { t: 0.64, u: 1.1, f: 0.8, ub: 1.1, fb: 0.8, tor: 0.6, hx: 10, hy: 8, hd: 0.2 },
      { t: 0.82, u: 1, f: 0.8, ub: 1, fb: 0.8, tor: 0.5, hx: 8, hy: 6 }
    ] },
    BOW: { dur: 0.9, hit: 0.58, draw: 1, keys: [
      { t: 0.5, tor: -0.06, pull: 1 },
      { t: 0.58, tor: -0.1, pull: 0 },
      { t: 0.75, tor: -0.02, pull: 0 }
    ] },
    GUN: { dur: 0.56, hit: 0.3, keys: [
      { t: 0.28, tor: 0, kick: 0 },
      { t: 0.36, tor: -0.2, hx: -3, kick: 1, hd: -0.14 },
      { t: 0.7, tor: -0.04, kick: 0.1 }
    ] },
    THROW: { dur: 0.72, hit: 0.48, keys: [
      { t: 0.36, u: 3.5, f: 3.9, w: -1.4, ub: 1.6, fb: 1.6, tor: -0.34, hx: -4, hd: -0.1 },
      { t: 0.5, u: 2.2, f: 2, w: 1, ub: 0.8, fb: 0.9, tor: 0.2, hx: 3 },
      { t: 0.62, u: 0.9, f: 0.8, w: 2.2, ub: 0.3, fb: 0.6, tor: 0.34, hx: 6, hy: 2 }
    ] },
    CAST: { dur: 0.82, hit: 0.56, keys: [
      { t: 0.45, u: 2.5, f: 2.7, w: 0.1, ub: 2.1, fb: 2.5, tor: -0.16, hx: -1, hy: -2, hd: -0.2 },
      { t: 0.58, u: 1.5, f: 1.6, w: 1.3, ub: 1.5, fb: 1.6, tor: 0.22, hx: 3, hy: 0 },
      { t: 0.74, u: 1.4, f: 1.5, w: 1.1, ub: 1.2, fb: 1.4, tor: 0.14, hx: 2 }
    ] },
    SPIN: { dur: 0.8, hit: 0.45, spin: 1, keys: [
      { t: 0.25, u: 1.2, f: 0.8, w: -1.2, tor: -0.3, hy: 3 },
      { t: 0.7, u: 1.6, f: 1.6, w: 1.6, tor: 0, hy: 3 }
    ] },
    BITE: { dur: 0.72, hit: 0.5, keys: [] }
  };
  var FIELDS = ['u', 'f', 'w', 'ub', 'fb', 'tor', 'hd', 'hx', 'hy', 'pull', 'kick'];
  function smooth(k) { return k * k * (3 - 2 * k); }

  // Deux os reliés atteignent une cible : renvoie les angles (vers l'avant) de chacun
  var ikOut = [0, 0, 0, 0];
  function ik(ax, ay, tx, ty, l1, l2, bend) {
    var dx = tx - ax, dy = ty - ay, d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    var mx = (l1 + l2) * 0.995;
    if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
    var base = Math.atan2(dx, dy);
    var c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    if (c > 1) c = 1; else if (c < -1) c = -1;
    var a1 = base + bend * Math.acos(c);
    var kx = ax + Math.sin(a1) * l1, ky = ay + Math.cos(a1) * l1;
    ikOut[0] = a1;
    ikOut[1] = Math.atan2(ax + dx - kx, ay + dy - ky);
    return ikOut;
  }

  // État animé d'une unité
  function state(rig, seed) {
    var c = rig.bones.length;
    return { rig: rig, ang: new Float32Array(c), x: new Float32Array(c), y: new Float32Array(c), gait: seed * 0.37 % 1, walk: 0, speed: 0, ready: 0, t: seed * 0.71, atk: null, atkT: 0, atkDur: 1, aim: 0, combo: seed % 2, hit: 0, block: 0, fall: 0, sprH: 0, sprV: 0, cape: 0, capeV: 0, step: 0, flap: seed * 1.3, attacking: 0, charge: 0 };
  }
  var pose = {}, basePose = {};
  function gaitFoot(ph, S, lift, out) {
    ph = ph - Math.floor(ph);
    if (ph < 0.6) { out[0] = S - 2 * S * ph / 0.6; out[1] = 0; out[2] = 0; }
    else {
      var k = (ph - 0.6) / 0.4, e = smooth(k);
      out[0] = -S + 2 * S * e;
      out[1] = Math.sin(k * PI) * lift;
      out[2] = k < 0.5 ? 0.7 * Math.sin(k * 2 * PI) : -0.5 * Math.sin((k - 0.5) * 2 * PI);
    }
  }
  var fA = [0, 0, 0], fB = [0, 0, 0];

  function animBiped(st, dt) {
    var rig = st.rig, d = rig.d, B = rig.index, ang = st.ang, look = rig.look;
    var w = st.walk, run = Math.min(1, Math.max(0, st.speed / 95 - 0.55) * 2), S = (d.th + d.sh) * (0.4 + 0.1 * run);
    var tau = 2 * PI, phi = st.gait, s1 = Math.sin(tau * phi), c1 = Math.cos(tau * phi), c2 = Math.cos(2 * tau * phi);
    var breath = Math.sin(st.t * 1.9), idle = Math.sin(st.t * 0.63);
    var ready = st.ready, profile = st.atk ? PROFILES[st.atk] : null;

    // Pose de base
    var b = basePose;
    var swing = c1 * (0.42 + 0.3 * run) * w;
    var cls = rig.fists ? 'fist' : (rig.held ? (rig.profile === 'BOW' ? 'bow' : (rig.profile === 'GUN' ? 'gun' : 'lob')) : (POLE[rig.wform] ? 'pole' : (rig.profile === 'CAST' ? 'staff' : 'blade')));
    b.tor = 0.02 + w * (0.05 + 0.14 * run) + s1 * 0.018 * w + idle * 0.012 * (1 - w) + ready * 0.05;
    b.hd = -b.tor * 0.6 + idle * 0.02 + Math.sin(st.t * 0.31) * 0.05 * (1 - w);
    b.hx = idle * 0.6 * (1 - w) + s1 * 0.7 * w;
    b.hy = breath * 0.35 + (ready * 2.2) + w * (0.8 - 1.3 * c2);
    b.u = 0.1 - swing; b.f = b.u + 0.35 + Math.max(0, -swing) * 0.5; b.w = 0.5;
    b.ub = 0.1 + swing; b.fb = b.ub + 0.35 + Math.max(0, swing) * 0.5;
    b.pull = 0; b.kick = 0;
    if (cls === 'blade') {
      b.u = 0.32 - swing * 0.6 + ready * 0.2; b.f = b.u + 0.9 + ready * 0.3 + breath * 0.02; b.w = 0.32 + ready * 0.3 - swing * 0.15;
    } else if (cls === 'pole') {
      b.u = 0.34 - swing * 0.3; b.f = 1.25 + ready * 0.25; b.w = 0.14 + ready * 1.2 + swing * 0.05;
    } else if (cls === 'staff') {
      b.u = 0.42 - swing * 0.3; b.f = 1.1; b.w = 0.06 + idle * 0.02 + swing * 0.06; b.ub = 0.25 + swing * 0.5; b.fb = 1.1;
    } else if (cls === 'bow' || cls === 'gun') {
      var A = PI / 2 - st.aim * ready;
      b.u = 0.28 + (A - 0.28) * ready - swing * 0.4 * (1 - ready); b.f = (0.9 + (A - 0.9) * ready); b.w = (-0.9) * (1 - ready) + st.aim * ready;
      if (cls === 'gun') { b.u = 0.5 + (A - 0.65 - 0.5) * ready; b.f = 1 + (A - 1) * ready; }
    } else if (cls === 'lob') {
      b.u = 0.3 - swing * 0.5; b.f = 1.2; b.w = 0;
    } else if (cls === 'fist') {
      b.u = 0.2 - swing + ready * 0.2; b.f = b.u + 0.3 + ready * 0.3; b.ub = 0.2 + swing + ready * 0.2; b.fb = b.ub + 0.3 + ready * 0.3;
    }
    if (look.sh) {
      b.ub = 0.45 + swing * 0.2 + ready * 0.35 + st.block * 0.7;
      b.fb = 1.25 + ready * 0.2 + st.block * 0.3;
    }
    // Clés d'attaque par-dessus
    for (var fi = 0; fi < FIELDS.length; fi++) pose[FIELDS[fi]] = b[FIELDS[fi]];
    if (profile) {
      var k = st.atkT, keys = profile.keys, prevT = 0, i;
      for (var fj = 0; fj < FIELDS.length; fj++) {
        var fn = FIELDS[fj], a0 = b[fn], t0 = 0, a1 = b[fn], t1 = 1, done = false;
        for (i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (key[fn] === undefined) continue;
          var val = key[fn];
          if ((fn === 'u' || fn === 'f' || fn === 'ub' || fn === 'fb' || fn === 'w') && (cls === 'bow' || cls === 'gun') ) { /* la visée garde le bras */ }
          if (key.t <= k) { a0 = val; t0 = key.t; }
          else { a1 = val; t1 = key.t; done = true; break; }
        }
        if (!done) { a1 = b[fn]; t1 = 1; }
        pose[fn] = a0 + (a1 - a0) * smooth(Math.min(1, (k - t0) / ((t1 - t0) || 1)));
      }
      void prevT;
    }
    // Réaction aux coups
    var h = st.hit;
    pose.tor -= h * 0.34;
    pose.hd -= h * 0.3;
    pose.hx -= h * 3;
    pose.hy += h * 2;
    pose.u -= h * 0.25;
    pose.ub -= h * 0.2;

    // Mort : le corps se plie et tombe en arrière
    var fall = st.fall;
    if (fall > 0) {
      var e = fall < 0.7 ? smooth(fall / 0.7) : 1 + Math.sin((fall - 0.7) / 0.3 * PI) * 0.06;
      pose.tor += (-1.5 - pose.tor) * e;
      pose.hd += (-1.75 - pose.hd) * e;
      pose.hx += (-rig.H * 0.55) * e;
      pose.hy += (rig.H - d.lw * 0.5 - pose.hy) * e;
      pose.u += (-2.2 - pose.u) * e; pose.f += (-2.6 - pose.f) * e;
      pose.ub += (-1.6 - pose.ub) * e; pose.fb += (-2.5 - pose.fb) * e;
      pose.w += (-2.8 - pose.w) * e;
    }

    // Jambes par cinématique inverse : les pieds restent posés au sol
    gaitFoot(phi, S, d.th * 0.34 * (0.7 + 0.5 * run), fA);
    gaitFoot(phi + 0.5, S, d.th * 0.34 * (0.7 + 0.5 * run), fB);
    var stanceF = 5 + ready * 5, stanceB = -5 - ready * 5;
    var fx = fA[0] * w + stanceF * (1 - w), fy = fA[1] * w, gx = fB[0] * w + stanceB * (1 - w), gy = fB[1] * w;
    var hipX = pose.hx, hipY = -rig.H + pose.hy;
    if (fall > 0) { var ef = Math.min(1, fall / 0.7); fx += 10 * ef; gx += 16 * ef; }
    var hipBone = rig.bones[B.hip];
    st.rootX = hipX; st.rootY = hipY;
    ang[B.hip] = 0;
    var ll = ik(hipX + 1.5, hipY, fx, -d.an - fy, d.th, d.sh, 1);
    ang[B.thighF] = -ll[0]; ang[B.shinF] = -ll[1];
    ang[B.footF] = -fA[2] * w + (fall > 0 ? 0.3 * fall : 0);
    ll = ik(hipX - 1.5, hipY, gx, -d.an - gy, d.th, d.sh, 1);
    ang[B.thighB] = -ll[0]; ang[B.shinB] = -ll[1];
    ang[B.footB] = -fB[2] * w + (fall > 0 ? 0.3 * fall : 0);
    if (B.skirt !== undefined) ang[B.skirt] = (st.cape * 0.3) + s1 * 0.04 * w - pose.tor * 0.2;

    var tor = pose.tor;
    if (profile && profile.spin) { var kk = Math.min(1, st.atkT / 0.9); st.spin = kk * 4 * PI; } else st.spin = 0;
    ang[B.torso] = tor;
    ang[B.head] = tor + pose.hd + st.sprH * 0.5;
    ang[B.armUF] = -pose.u;
    ang[B.armLF] = -pose.f;
    ang[B.armUB] = -pose.ub;
    ang[B.armLB] = -pose.fb;
    if (B.weapon !== undefined) ang[B.weapon] = pose.w + (st.sprH * 0.3);
    if (B.shield !== undefined) ang[B.shield] = 0.12 + st.block * 0.2;
    if (B.orb !== undefined) ang[B.orb] = 0;
    if (B.capeU !== undefined) {
      var cp = st.cape + w * 0.18 + run * 0.3 + Math.sin(st.t * 2.3) * 0.03;
      ang[B.capeU] = cp * 0.8;
      ang[B.capeL] = cp * 1.4 + Math.sin(st.t * 3.1) * 0.05;
    }
    if (B.tailU !== undefined) { var tl = 0.9 + st.cape * 0.4 + Math.sin(st.t * 2 + s1) * 0.12; ang[B.tailU] = tl; ang[B.tailL] = tl + 0.3 + Math.sin(st.t * 2.7) * 0.18; }
    if (B.wingB !== undefined) ang[B.wingB] = Math.sin(st.t * 1.7) * 0.08 - pose.tor * 0.4;
    // Le second bras tient la hampe ou la corde
    fk(st);
    if (cls === 'pole' || cls === 'bow' || cls === 'gun' || cls === 'staff' && profile) {
      var sB = B.armUB, wb = B.weapon, wa = ang[wb];
      var tx, ty;
      if (cls === 'pole') { tx = st.x[wb] + Math.sin(wa) * -(-20); ty = st.y[wb] - Math.cos(wa) * 20; }
      else if (cls === 'gun') { var pullOff = 12; tx = st.x[wb] + Math.cos(wa) * pullOff; ty = st.y[wb] + Math.sin(wa) * pullOff; }
      else if (cls === 'bow') { var pl = pose.pull * ready, off = -6 - pl * 26; if (!profile || pose.pull < 0.02) { off = -4; } tx = st.x[wb] + Math.cos(wa) * off; ty = st.y[wb] + Math.sin(wa) * off; if (ready < 0.3) { tx = st.x[B.torso] + d.tw * 0.5; ty = st.y[B.torso] - 4; } }
      else { tx = st.x[wb] + Math.sin(wa) * 16; ty = st.y[wb] - Math.cos(wa) * 16; }
      if (fall < 0.05 && !look.sh) {
        var la = ik(st.x[sB], st.y[sB], tx, ty, d.ur, d.fr, 1);
        ang[B.armUB] = -la[0]; ang[B.armLB] = -la[1];
        fk(st);
      }
      st.pull = pose.pull;
    }
    if (pose.kick && cls === 'gun') { var kx = pose.kick; ang[B.armLF] += kx * 0.25; ang[B.armUF] += kx * 0.2; ang[B.weapon] -= kx * 0.3; fk(st); }
    void hipBone; void dt;
  }

  function animBeast(st, dt) {
    var rig = st.rig, B = rig.index, ang = st.ang;
    var w = st.walk, phi = st.gait, t = st.t, tau = 2 * PI;
    var k = st.atk ? st.atkT : -1;
    var lunge = 0, jaw = 0.05 + Math.max(0, Math.sin(t * 0.7)) * 0.05;
    if (k >= 0) {
      if (k < 0.4) { var a = smooth(k / 0.4); lunge = -0.45 * a; jaw = 0.15 + 0.5 * a; }
      else if (k < 0.55) { var c = smooth((k - 0.4) / 0.15); lunge = -0.45 + 1.45 * c; jaw = 0.65 + 0.1 * c; }
      else { var e = smooth((k - 0.55) / 0.45); lunge = 1 - e; jaw = 0.75 * (1 - e) * (1 - e); }
    }
    var fall = st.fall;
    var fe = fall > 0 ? (fall < 0.7 ? smooth(fall / 0.7) : 1) : 0;
    var flap = 0;
    var fly = rig.fly;
    if (rig.wings.length) { st.flap += dt * (fly ? 6.2 + lunge * 3 : 3); flap = Math.sin(st.flap); }
    var hover = fly * (1 - fe) + (fly ? flap * -3 + 2 : 0) * (1 - fe);
    var pitch = (lunge * 0.12) + st.hit * -0.12 + w * 0.02 * Math.sin(tau * phi * 2) - fe * 0.18;
    st.rootX = lunge * 7 - st.hit * 3;
    st.rootY = -rig.H - hover + (w * 1.1 * Math.cos(tau * 2 * phi)) + Math.sin(t * 1.8) * 0.5 + fe * (rig.H * 0.72) - lunge * 1;
    ang[B.body] = pitch;
    var cb = Math.cos(pitch), sb = Math.sin(pitch), S = 0;
    // Pattes
    rig.legs.forEach(function (L) {
      var ti = B[L.t], si = B[L.s], bn = rig.bones[ti];
      var hx = st.rootX + cb * bn.x - sb * bn.y, hy = st.rootY + sb * bn.x + cb * bn.y;
      var a1, a2;
      if (fly && fe < 0.5) {
        var dg = Math.sin(st.flap * 0.5 + L.ph * 6) * 0.1;
        a1 = 1.15 + dg + lunge * 0.3; a2 = -0.45 + dg;
        ang[ti] = -a1; ang[si] = -a2;
        return;
      }
      S = (L.l1 + L.l2) * 0.34;
      gaitFoot(phi + L.ph, S, (L.l1 + L.l2) * 0.26, fA);
      var rest = L.reach !== undefined ? L.reach : bn.x * 0.92;
      var fx = rest + fA[0] * w, fy = fA[1] * w;
      var r = ik(hx, hy, fx + (L.up ? 0 : 0), -fy, L.l1, L.l2, L.up ? (bn.x > 0 ? -1 : 1) : (bn.x > 0 ? 1 : -1));
      ang[ti] = -r[0]; ang[si] = -r[1];
    });
    // Queue
    rig.tail.forEach(function (n1, i) {
      var v = 1 + i * 0.22 + Math.sin(t * 2.2 - i * 0.9 + w * phi * 6) * 0.2 + st.cape * 0.3;
      ang[B[n1]] = v - fe * 0.3;
    });
    // Ailes
    rig.wings.forEach(function (n2, i) {
      var open = fly ? (flap * 0.62 - 0.05) : 0.3 + Math.sin(t * 1.4) * 0.06;
      ang[B[n2]] = open * (i ? 0.92 : 1) + pitch + fe * 1.1;
    });
    // Cous et têtes
    rig.necks.forEach(function (N, i) {
      var striker = rig.necks.length === 1 || (st.combo % rig.necks.length) === i;
      var L = striker ? lunge : lunge * 0.15;
      var cur = N.a0 + Math.sin(t * 1.3 + i * 2) * 0.09;
      if (N.sn) {
        // Cou serpentin : l'angle fait onduler chaque segment, la tête reste à l'horizontale
        var a = N.a0 - 0.22 * L * 1.4;
        for (var j = 0; j < N.b.length; j++) {
          var off = Math.sin(t * 1.6 - j * 1.1 + i * 2.1) * 0.12;
          var ca = (j === 0 ? -2.5 : -2.5 + (j * 0.35)) - N.a0 * 0;
          ang[B[N.b[j]]] = a + (N.b.length === 3 ? [-2.9, -2.3, -1.7][j] + N.a0 * 0.4 : [-2.5, -1.9][j]) + off - L * 0.55 + fe * 1.4 + 0 * ca;
        }
        ang[B[N.head]] = pitch + st.hit * -0.3 + L * 0.22 - Math.PI * 0 + fe * 0.9;
      } else {
        for (var j2 = 0; j2 < N.b.length; j2++) ang[B[N.b[j2]]] = cur + L * 0.5 + st.sprH * 0.3 + fe * -0.6;
        ang[B[N.head]] = pitch + (N.ram ? L * 0.2 : L * 0.3) + Math.sin(t * 0.9) * 0.05 - st.hit * 0.25 + fe * 0.7;
      }
      if (B[N.jaw] !== undefined) ang[B[N.jaw]] = ang[B[N.head]] + jaw * (striker ? 1 : 0.4) * 0.9;
    });
    fk(st);
  }

  // Positions de tous les os d'après leurs angles
  function fk(st) {
    var bones = st.rig.bones, ang = st.ang, X = st.x, Y = st.y;
    for (var i = 0; i < bones.length; i++) {
      var b = bones[i];
      if (b.p < 0) { X[i] = st.rootX; Y[i] = st.rootY; continue; }
      var a = ang[b.p], c = Math.cos(a), s = Math.sin(a);
      X[i] = X[b.p] + c * b.x - s * b.y;
      Y[i] = Y[b.p] + s * b.x + c * b.y;
    }
  }

  // Avance l'animation d'une unité : dist = chemin parcouru (unités du squelette), dt en secondes
  function update(st, dt, dist) {
    var rig = st.rig;
    st.t += dt;
    var v = dt > 0 ? dist / dt : 0;
    st.speed += (v - st.speed) * Math.min(1, dt * 7);
    var goal = st.speed > 5 ? 1 : 0;
    st.walk += (goal - st.walk) * Math.min(1, dt * 7);
    var S = rig.type === 'biped' ? (rig.d.th + rig.d.sh) * 0.42 : 24;
    st.gait += dist * 0.6 / (2 * S);
    var before = st.gait - dist * 0.6 / (2 * S);
    st.footfall = Math.floor(before * 2) !== Math.floor(st.gait * 2) && st.walk > 0.4;
    st.gait -= Math.floor(st.gait);
    // Élan secondaire : la cape et la tête suivent avec retard
    var fh = -st.sprH * 90 - st.sprV * 10 - (st.speed * 0.0012) * 0;
    st.sprV += fh * dt; st.sprH += st.sprV * dt;
    var capeGoal = Math.min(1.1, st.speed * 0.012);
    st.capeV += ((capeGoal - st.cape) * 40 - st.capeV * 6) * dt;
    st.cape += st.capeV * dt;
    st.hit = Math.max(0, st.hit - dt * 3.2);
    st.block = Math.max(0, st.block - dt * 2.6);
    if (st.atk) {
      st.atkT += dt / st.atkDur;
      if (st.atkT >= 1) { st.atk = null; st.atkT = 0; st.combo++; }
    }
    if (st.falling) st.fall = Math.min(1, st.fall + dt / 0.55);
    if (rig.type === 'biped') animBiped(st, dt); else animBeast(st, dt);
  }

  function startAttack(st, name, interval) {
    var prof = PROFILES[name] || PROFILES.SLASH;
    if (name === 'SLASH' && st.combo % 3 === 2) { name = 'SWEEP'; prof = PROFILES.SWEEP; }
    st.atk = name;
    st.atkT = 0;
    st.atkDur = Math.min(prof.dur, Math.max(0.3, interval * 0.92));
    return prof.hit * st.atkDur;
  }

  // Dessin statique, pose de repos, pour les écrans de gestion et le SVG de secours
  function restPose(rig) {
    var st = state(rig, 0);
    st.t = 0; st.ready = rig.held ? 0.0 : 0.25;
    update(st, 0, 0);
    return st;
  }
  function markup(race, uid, weapon) {
    var rig = get(race, uid, weapon), st = restPose(rig), s = '';
    var bx = fitOf(rig);
    rig.order.forEach(function (i) {
      var b = rig.bones[i];
      var inner = b.part === 'weapon' ? '<use href="#' + rig.wform + '" x="-40" y="' + (rig.held ? -40 : -65) + '" width="80" height="80"></use>' : rig.parts[b.part].svg;
      s += '<g transform="translate(' + n(st.x[i]) + ' ' + n(st.y[i]) + ') rotate(' + n(st.ang[i] * 180 / PI) + ') scale(' + b.k + ')">' + inner + '</g>';
    });
    return '<g transform="translate(' + n(bx.x) + ' ' + n(bx.y) + ') scale(' + bx.k + ')">' + s + '</g>';
  }
  // Mise à l'échelle pour tenir dans une case de 120 x 140
  function fitOf(rig) {
    var k = 1, w = 0;
    if (rig.type === 'beast') { k = rig.fly ? 0.72 : (rig.sz || 1) * 0.8; w = 8; }
    return { k: k, x: 60 + w * k * 0, y: 128 - (rig.fly ? 0 : 0), w: w };
  }

  // Un dégât visible pour la silhouette ombrée
  window.GVR = { get: get, state: state, update: update, startAttack: startAttack, restPose: restPose, markup: markup, fitOf: fitOf, fk: fk, PROFILES: PROFILES };
  GV.unitMarkup = markup;
})();
