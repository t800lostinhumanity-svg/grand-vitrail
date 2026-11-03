// Générateur de QR code (mode octets, correction L), sans dépendance
(function () {
  var ECC_PER_BLOCK = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28];
  var NUM_BLOCKS = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8];

  function rawModules(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var a = Math.floor(ver / 7) + 2;
      r -= (25 * a - 10) * a - 55;
      if (ver >= 7) r -= 36;
    }
    return r;
  }
  function dataCodewords(ver) {
    return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver];
  }

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 255;
  }
  function rsDivisor(degree) {
    var res = [];
    for (var i = 0; i < degree - 1; i++) res.push(0);
    res.push(1);
    var root = 1;
    for (var k = 0; k < degree; k++) {
      for (var j = 0; j < res.length; j++) {
        res[j] = gfMul(res[j], root);
        if (j + 1 < res.length) res[j] ^= res[j + 1];
      }
      root = gfMul(root, 2);
    }
    return res;
  }
  function rsRemainder(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) {
      var factor = b ^ res.shift();
      res.push(0);
      div.forEach(function (c, i) { res[i] ^= gfMul(c, factor); });
    });
    return res;
  }

  function encode(text) {
    var bytes = Array.prototype.slice.call(new TextEncoder().encode(text));
    var ver = 0;
    for (var v = 1; v <= 20; v++) {
      var head = 4 + (v < 10 ? 8 : 16);
      if (head + bytes.length * 8 <= dataCodewords(v) * 8) { ver = v; break; }
    }
    if (!ver) throw new Error('Code trop long pour un QR');

    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    var cap = dataCodewords(ver) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (var b = 0; b < bits.length; b += 8) {
      var val = 0;
      for (var q = 0; q < 8; q++) val = (val << 1) | bits[b + q];
      data.push(val);
    }

    // Découpe en blocs, correction d'erreur puis entrelacement
    var numBlocks = NUM_BLOCKS[ver], eccLen = ECC_PER_BLOCK[ver];
    var raw = Math.floor(rawModules(ver) / 8);
    var numShort = numBlocks - raw % numBlocks;
    var shortLen = Math.floor(raw / numBlocks);
    var blocks = [], div = rsDivisor(eccLen), k = 0;
    for (var i = 0; i < numBlocks; i++) {
      var dat = data.slice(k, k + shortLen - eccLen + (i < numShort ? 0 : 1));
      k += dat.length;
      var ecc = rsRemainder(dat, div);
      if (i < numShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var codewords = [];
    for (var c = 0; c < blocks[0].length; c++) {
      blocks.forEach(function (bl, idx) {
        if (c !== shortLen - eccLen || idx >= numShort) codewords.push(bl[c]);
      });
    }

    var size = ver * 4 + 17;
    var mod = [], fn = [];
    for (var y0 = 0; y0 < size; y0++) { mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setFn(x, y, on) { mod[y][x] = on; fn[y][x] = true; }

    for (var t = 0; t < size; t++) { setFn(6, t, t % 2 === 0); setFn(t, 6, t % 2 === 0); }
    function finder(cx, cy) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        var xx = cx + dx, yy = cy + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) setFn(xx, yy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);

    var aligns = [];
    if (ver > 1) {
      var numAlign = Math.floor(ver / 7) + 2;
      var stp = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
      aligns = [6];
      for (var pos = size - 7; aligns.length < numAlign; pos -= stp) aligns.splice(1, 0, pos);
    }
    aligns.forEach(function (ax, ai) {
      aligns.forEach(function (ay, aj) {
        var skip = (ai === 0 && aj === 0) || (ai === 0 && aj === aligns.length - 1) || (ai === aligns.length - 1 && aj === 0);
        if (skip) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setFn(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });

    function formatBits(mask) {
      var d = (1 << 3) | mask; // niveau de correction L
      var rem = d;
      for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      return ((d << 10) | rem) ^ 0x5412;
    }
    function drawFormat(mask) {
      var f = formatBits(mask);
      function bit(i) { return ((f >>> i) & 1) !== 0; }
      for (var i = 0; i <= 5; i++) setFn(8, i, bit(i));
      setFn(8, 7, bit(6)); setFn(8, 8, bit(7)); setFn(7, 8, bit(8));
      for (var j = 9; j < 15; j++) setFn(14 - j, 8, bit(j));
      for (var m = 0; m < 8; m++) setFn(size - 1 - m, 8, bit(m));
      for (var n = 8; n < 15; n++) setFn(8, size - 15 + n, bit(n));
      setFn(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem = ver;
      for (var r = 0; r < 12; r++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (ver << 12) | rem;
      for (var w = 0; w < 18; w++) {
        var on = ((vb >>> w) & 1) !== 0;
        var aa = size - 11 + w % 3, bb = Math.floor(w / 3);
        setFn(aa, bb, on); setFn(bb, aa, on);
      }
    }

    // Placement en zigzag des données
    var bi = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj;
          var upward = ((right + 1) & 2) === 0;
          var y = upward ? size - 1 - vert : vert;
          if (!fn[y][x] && bi < codewords.length * 8) {
            mod[y][x] = ((codewords[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0;
            bi++;
          }
        }
      }
    }

    function applyMask(mask) {
      for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
        var inv;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if (!fn[y][x] && inv) mod[y][x] = !mod[y][x];
      }
    }
    function penalty() {
      var score = 0, dark = 0;
      for (var y = 0; y < size; y++) {
        var runX = 0, runY = 0, lastX = false, lastY = false;
        for (var x = 0; x < size; x++) {
          if (mod[y][x]) dark++;
          if (x > 0 && mod[y][x] === lastX) { runX++; if (runX === 5) score += 3; else if (runX > 5) score++; } else { runX = 1; lastX = mod[y][x]; }
          if (x > 0 && mod[x][y] === lastY) { runY++; if (runY === 5) score += 3; else if (runY > 5) score++; } else { runY = 1; lastY = mod[x][y]; }
          if (x < size - 1 && y < size - 1 && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) score += 3;
        }
      }
      score += Math.floor(Math.abs(dark * 20 / (size * size) - 10)) * 10;
      return score;
    }
    var bestMask = 0, bestScore = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      applyMask(mk); drawFormat(mk);
      var sc = penalty();
      if (sc < bestScore) { bestScore = sc; bestMask = mk; }
      applyMask(mk);
    }
    applyMask(bestMask); drawFormat(bestMask);
    return { size: size, modules: mod, version: ver };
  }

  function toSvg(text) {
    var q = encode(text);
    var d = '';
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.modules[y][x]) d += 'M' + (x + 4) + ' ' + (y + 4) + 'h1v1h-1z';
    var full = q.size + 8;
    return '<svg class="qr" viewBox="0 0 ' + full + ' ' + full + '" role="img" aria-label="QR code de ton royaume" shape-rendering="crispEdges"><rect width="' + full + '" height="' + full + '" fill="#ffffff"></rect><path fill="#000000" d="' + d + '"></path></svg>';
  }

  window.GVQR = { encode: encode, toSvg: toSvg, _rsDivisor: rsDivisor, _rsRemainder: rsRemainder };
})();
