// Moteur de rendu du champ de bataille : WebGL 2, lumières en temps réel, verre, eau, lave, halo, ondes de choc.
// Sans WebGL 2, ou en mode économie, une version Canvas 2D dessine la même scène avec un éclairage figé.
(function () {
  var MAX_LIGHTS = 12, MAX_QUADS = 7000, STRIDE = 13;

  var COMMON = [
    'precision mediump float;',
    'uniform vec4 uLP[' + MAX_LIGHTS + '];uniform vec4 uLC[' + MAX_LIGHTS + '];uniform int uNL;',
    'uniform vec3 uSun,uSunC,uAmb,uBack;uniform float uTime;uniform sampler2D uNoise;',
    'vec3 shade(vec3 alb,vec3 N,float thick,float gloss,vec2 w){',
    ' float cl=texture(uNoise,w*0.011+uTime*vec2(0.0045,0.0021)).r;cl=smoothstep(0.32,0.68,cl);float sunK=0.62+0.55*cl;',
    ' float bk=texture(uNoise,w*0.017-uTime*vec2(0.003,0.0015)).g;',
    ' float d=max(dot(N,uSun),0.0);vec3 H=normalize(uSun+vec3(0.0,0.0,1.0));float sp=max(dot(N,H),0.0);sp*=sp;sp*=sp;sp*=sp;sp*=sp;sp*=sp;',
    ' vec3 c=alb*(uAmb*0.66+uSunC*d*sunK*0.62+uBack*thick*(0.45+0.8*bk)*0.42)+uSunC*sp*gloss*sunK*0.7;',
    ' for(int i=0;i<uNL;i++){vec3 L=vec3(uLP[i].xy-w,uLP[i].z);float r2=dot(L,L);float a=1.0-r2/(uLP[i].w*uLP[i].w);if(a<=0.0)continue;a*=a;L=normalize(L);',
    '  float dl=max(dot(N,L),0.0);float sl=max(dot(N,normalize(L+vec3(0.0,0.0,1.0))),0.0);sl*=sl;sl*=sl;sl*=sl;sl*=sl;',
    '  c+=uLC[i].rgb*a*(alb*(dl*1.5+0.25*thick)+sl*gloss*0.9);}',
    ' return c;}'
  ].join('\n');

  var VS_SPR = '#version 300 es\nlayout(location=0) in vec2 aP;layout(location=1) in vec2 aUV;layout(location=2) in vec3 aRot;layout(location=3) in vec4 aCol;layout(location=4) in vec2 aFx;uniform vec4 uCam;out vec2 vUV;out vec3 vRot;out vec4 vCol;out vec2 vFx;out vec2 vW;void main(){vW=aP;vUV=aUV;vRot=aRot;vCol=aCol;vFx=aFx;gl_Position=vec4(aP.x*uCam.x+uCam.z,aP.y*uCam.y+uCam.w,0.0,1.0);}';
  var FS_SPR = '#version 300 es\n' + COMMON + '\nuniform sampler2D uA,uN;uniform float uGain;in vec2 vUV;in vec3 vRot;in vec4 vCol;in vec2 vFx;in vec2 vW;out vec4 o;void main(){vec4 a=texture(uA,vUV);float m=vFx.y;' +
    'if(m>2.5){if(a.a<0.35)discard;o=vec4(0.0,0.0,0.0,vCol.a);return;}' +
    'if(m>1.5){o=vec4(a.rgb*vCol.rgb*vCol.a,0.0);return;}' +
    'if(m>0.5){o=vec4(a.rgb*vCol.rgb,a.a)*vCol.a;return;}' +
    'if(a.a<0.004)discard;vec3 alb=a.rgb/a.a*vCol.rgb*uGain;vec4 n=texture(uN,vUV);vec2 q=n.xy*2.0-1.0;vec3 N=vec3(vRot.z*(vRot.x*q.x-vRot.y*q.y),vRot.y*q.x+vRot.x*q.y,0.0);N.z=sqrt(max(0.05,1.0-dot(N.xy,N.xy)));' +
    'vec3 c=shade(alb,N,n.b,n.a,vW);float rim=1.0-N.z;rim*=rim;c+=(uAmb+uSunC*0.25)*alb*rim*1.1;c=mix(c,vec3(1.0,0.97,0.9),vFx.x);float al=a.a*vCol.a;o=vec4(c*al,al);}';

  var VS_T = '#version 300 es\nlayout(location=0) in vec2 aP;uniform vec4 uCam;out vec2 vW;void main(){vW=aP;gl_Position=vec4(aP.x*uCam.x+uCam.z,aP.y*uCam.y+uCam.w,0.0,1.0);}';
  var FS_T = '#version 300 es\n' + COMMON + '\nuniform sampler2D uMap,uMapN,uMask;uniform vec2 uField,uHoly;in vec2 vW;out vec4 o;void main(){vec2 uv=vW/uField;vec4 mk=texture(uMask,uv);float water=mk.r,lava=mk.g,acid=mk.b,holy=mk.a;float t=uTime;' +
    'vec2 nA=texture(uNoise,vW*0.055+vec2(t*0.031,t*0.017)).rg-0.5;vec2 nB=texture(uNoise,vW*0.12-vec2(t*0.022,-t*0.027)).gb-0.5;vec2 rip=nA+nB;' +
    'vec2 uvd=uv+rip*0.007*water+rip*0.004*lava;vec3 alb=texture(uMap,uvd).rgb;vec4 nm=texture(uMapN,uv);vec2 q=nm.xy*2.0-1.0+rip*1.5*water;vec3 N=vec3(q,0.0);N.z=sqrt(max(0.05,1.0-dot(q,q)));float thick=nm.b,gloss=nm.a;' +
    'if(water>0.01){float c=abs(sin((nA.x+nB.y)*20.0+t*0.8));c=1.0-c;c*=c;c*=c;c*=c;alb+=vec3(0.45,0.8,1.0)*c*0.55*water*thick;gloss=max(gloss,water);}' +
    'vec3 col=shade(alb,normalize(N),thick,gloss,vW);' +
    'if(lava>0.01){float f1=texture(uNoise,vW*0.05+vec2(t*0.02,t*0.044)).r,f2=texture(uNoise,vW*0.15-vec2(t*0.034,t*0.02)).g;float h=f1*0.62+f2*0.5;float cr=smoothstep(0.42,0.62,h);vec3 hot=mix(vec3(1.0,0.22,0.02),vec3(1.0,0.86,0.28),smoothstep(0.55,0.86,h));col=mix(col*0.5,hot*(1.05+0.25*sin(t*2.0+h*9.0)),cr*lava*(0.25+0.75*thick));}' +
    'if(acid>0.01){float f1=texture(uNoise,vW*0.09+vec2(t*0.02,-t*0.03)).r;float bu=texture(uNoise,vW*0.42+vec2(0.0,-t*0.09)).b;bu=smoothstep(0.66,0.74,bu);vec3 hot=mix(vec3(0.5,0.85,0.05),vec3(0.92,1.0,0.35),f1);col=mix(col,hot*(0.72+0.5*f1),acid*0.62*(0.3+0.7*thick));col+=vec3(0.9,1.0,0.4)*bu*acid*0.55*thick;}' +
    'if(holy>0.01){float r=length(vW-uHoly);col+=alb*(0.42+0.3*sin(r*1.0-t*1.5))*holy;col+=vec3(1.0,0.92,0.7)*pow(max(0.0,1.0-r/15.0),3.0)*0.45*holy;}' +
    'o=vec4(col*0.9,1.0);}';

  var VS_Q = '#version 300 es\nlayout(location=0) in vec2 aP;out vec2 vUV;void main(){vUV=aP*0.5+0.5;gl_Position=vec4(aP,0.0,1.0);}';
  var FS_BRIGHT = '#version 300 es\nprecision mediump float;uniform sampler2D uS;in vec2 vUV;out vec4 o;void main(){vec3 c=texture(uS,vUV).rgb;float l=max(c.r,max(c.g,c.b));float k=smoothstep(0.78,1.0,l);o=vec4(c*k,1.0);}';
  var FS_BLUR = '#version 300 es\nprecision mediump float;uniform sampler2D uS;uniform vec2 uD;in vec2 vUV;out vec4 o;void main(){vec3 c=texture(uS,vUV).rgb*0.227;c+=(texture(uS,vUV+uD*1.385).rgb+texture(uS,vUV-uD*1.385).rgb)*0.316;c+=(texture(uS,vUV+uD*3.231).rgb+texture(uS,vUV-uD*3.231).rgb)*0.07;o=vec4(c,1.0);}';
  var FS_POST = '#version 300 es\nprecision mediump float;uniform sampler2D uS,uB1,uB2;uniform vec4 uWave[4];uniform vec4 uFlash;uniform vec3 uGrade;uniform float uAsp,uAb,uBloom,uTime,uHeat;in vec2 vUV;out vec4 o;' +
    'float hs(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}void main(){vec2 uv=vUV;for(int i=0;i<4;i++){if(uWave[i].w<=0.0)continue;vec2 d=uv-uWave[i].xy;d.x*=uAsp;float r=length(d);float x=(r-uWave[i].z)*22.0;float a=uWave[i].w*exp(-x*x);if(r>0.001){d/=r;d.x/=uAsp;uv-=d*a;}}' +
    'if(uHeat>0.0){uv.x+=sin(uv.y*48.0+uTime*3.1)*0.0011*uHeat;uv.y+=cos(uv.x*37.0+uTime*2.3)*0.0009*uHeat;}' +
    'vec2 v=vUV-0.5;float vv=dot(v,v);vec2 ca=v*(0.0012+uAb)*(0.3+vv*3.0);vec3 c;c.r=texture(uS,uv+ca).r;c.g=texture(uS,uv).g;c.b=texture(uS,uv-ca).b;' +
    'c+=(texture(uB1,uv).rgb*0.62+texture(uB2,uv).rgb*0.72)*uBloom;' +
    'c*=uGrade;float m=dot(c,vec3(0.3,0.59,0.11));c=mix(vec3(m),c,1.14);c=clamp(c,0.0,1.0);c=mix(c,c*c*(3.0-2.0*c),0.5);' +
    'c*=1.0-smoothstep(0.16,0.72,vv)*0.68;c+=uFlash.rgb*uFlash.a;c+=(hs(vUV*vec2(731.0,593.0)+uTime)-0.5)*0.016;o=vec4(c,1.0);}';

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i), nm = a.name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u };
  }

  // Bruit répétable : base de l'eau, de la lave et des nuages
  function noiseData() {
    var S = 256, out = new Uint8Array(S * S * 4);
    function layer(seed, ch) {
      var r = window.GVB.rng32(seed), oct, x, y;
      var acc = new Float32Array(S * S), amp = 1, sum = 0;
      for (oct = 0; oct < 5; oct++) {
        var G = 4 << oct, g = new Float32Array(G * G), i;
        for (i = 0; i < G * G; i++) g[i] = r();
        for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
          var fx = x / S * G, fy = y / S * G, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
          tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
          var a = g[iy % G * G + ix % G], b = g[iy % G * G + (ix + 1) % G], c = g[(iy + 1) % G * G + ix % G], d = g[(iy + 1) % G * G + (ix + 1) % G];
          acc[y * S + x] += amp * (a + (b - a) * tx + (c - a + (a - b + d - c) * tx) * ty);
        }
        sum += amp; amp *= 0.55;
      }
      for (var k = 0; k < S * S; k++) out[k * 4 + ch] = Math.max(0, Math.min(255, Math.round(((acc[k] / sum) - 0.5) * 1.9 * 255 + 127)));
    }
    layer(11, 0); layer(23, 1); layer(37, 2);
    for (var j = 0; j < S * S; j++) out[j * 4 + 3] = 255;
    return { data: out, size: S };
  }
  var noiseCache = null;

  // Dessins des effets : halo, anneau, étincelle, fumée, éclat, trait et projectiles
  function fxSheet() {
    var W = 512, H = 256, cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var c = cv.getContext('2d'), rects = {}, nrm = new Uint8Array(W * H * 4), i;
    for (i = 0; i < W * H; i++) { nrm[i * 4] = 128; nrm[i * 4 + 1] = 128; nrm[i * 4 + 2] = 90; nrm[i * 4 + 3] = 255; }
    function cell(id, x, y, w, h, fn, tilt) {
      c.save(); c.translate(x + w / 2, y + h / 2); fn(c, w, h); c.restore();
      rects[id] = { x: x, y: y, w: w, h: h, ox: w / 2, oy: h / 2 };
      if (tilt) for (var j = y; j < y + h; j++) for (var k = x; k < x + w; k++) { var o = (j * W + k) * 4; nrm[o] = tilt[0]; nrm[o + 1] = tilt[1]; }
    }
    cell('soft', 0, 0, 64, 64, function (g, w) { var r = g.createRadialGradient(0, 0, 0, 0, 0, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-w / 2, -w / 2, w, w); });
    cell('ring', 64, 0, 64, 64, function (g, w) { var r = g.createRadialGradient(0, 0, w * 0.26, 0, 0, w / 2); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.72, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-w / 2, -w / 2, w, w); });
    cell('spark', 128, 0, 64, 16, function (g, w, h) { var r = g.createLinearGradient(-w / 2, 0, w / 2, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.72, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,1)'); g.fillStyle = r; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w * 0.36, -h / 2 + 2); g.lineTo(w / 2, 0); g.lineTo(w * 0.36, h / 2 - 2); g.closePath(); g.fill(); });
    cell('white', 192, 0, 8, 8, function (g, w, h) { g.fillStyle = '#fff'; g.fillRect(-w / 2, -h / 2, w, h); });
    cell('beam', 200, 0, 32, 64, function (g, w, h) { var r = g.createLinearGradient(-w / 2, 0, w / 2, 0); r.addColorStop(0, 'rgba(255,255,255,0)'); r.addColorStop(0.5, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(-w / 2, -h / 2, w, h); });
    // Fumée : plusieurs boules douces irrégulières
    var r2 = window.GVB.rng32(5);
    cell('smoke', 232, 0, 64, 64, function (g) { for (var n = 0; n < 16; n++) { var a = r2() * 6.28, d = r2() * 15, x = Math.cos(a) * d, y = Math.sin(a) * d, s = 8 + r2() * 11, gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2); } });
    // Éclats de verre : chacun penche différemment pour accrocher la lumière à sa façon
    function shard(pts) { return function (g) { g.fillStyle = '#fff'; g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); g.fill(); g.strokeStyle = 'rgba(20,14,10,.9)'; g.lineWidth = 2; g.stroke(); }; }
    cell('sh0', 296, 0, 32, 32, shard([[-10, -13], [13, -6], [2, 14]]), [60, 60]);
    cell('sh1', 328, 0, 32, 32, shard([[-13, -3], [-2, -14], [14, 5], [-5, 12]]), [190, 80]);
    cell('sh2', 360, 0, 32, 32, shard([[-12, 10], [-6, -12], [8, -11], [13, 8]]), [90, 190]);
    cell('sh3', 392, 0, 32, 32, shard([[-4, -14], [12, 2], [-10, 12]]), [180, 180]);
    // Projectiles : la pointe regarde vers +x
    cell('arrow', 0, 64, 96, 16, function (g) { g.fillStyle = '#8a5a2c'; g.fillRect(-36, -1.4, 66, 2.8); g.fillStyle = '#dcecfb'; g.beginPath(); g.moveTo(44, 0); g.lineTo(28, -5); g.lineTo(28, 5); g.closePath(); g.fill(); g.fillStyle = '#e8e2d0'; g.beginPath(); g.moveTo(-40, -6); g.lineTo(-26, -1); g.lineTo(-26, 1); g.lineTo(-40, 6); g.lineTo(-36, 0); g.closePath(); g.fill(); });
    cell('bolt', 96, 64, 64, 16, function (g) { g.fillStyle = '#5a3a1c'; g.fillRect(-24, -2, 42, 4); g.fillStyle = '#b4b8d2'; g.beginPath(); g.moveTo(28, 0); g.lineTo(14, -6); g.lineTo(14, 6); g.closePath(); g.fill(); g.fillStyle = '#e0263c'; g.fillRect(-28, -4, 8, 8); });
    cell('dart', 160, 64, 48, 16, function (g) { g.fillStyle = '#c6d92a'; g.fillRect(-20, -1.2, 28, 2.4); g.fillStyle = '#efe8d0'; g.beginPath(); g.moveTo(22, 0); g.lineTo(6, -3); g.lineTo(6, 3); g.closePath(); g.fill(); });
    cell('pellet', 208, 64, 16, 16, function (g) { g.fillStyle = '#ffd75a'; g.beginPath(); g.arc(0, 0, 5, 0, 6.28); g.fill(); });
    return { key: 'fx', albedo: cv, nrm: nrm, lit: cv, rects: rects, ppu: 1, w: W, h: H };
  }

  // Atlas commun aux deux moteurs : récolte les pièces puis les range
  function Atlas() { this.items = []; this.byKey = {}; this.w = 0; this.h = 0; }
  Atlas.prototype.add = function (sheet, name, dedupe) {
    var key = dedupe || (sheet.key + '/' + name);
    if (this.byKey[key]) return this.byKey[key];
    var r = sheet.rects[name];
    if (!r) return null;
    var P = sheet.ppu;
    var spr = { x0: -r.ox / P, y0: -r.oy / P, x1: (r.w - r.ox) / P, y1: (r.h - r.oy) / P, u0: 0, v0: 0, u1: 0, v1: 0, ax: 0, ay: 0, aw: r.w, ah: r.h };
    this.items.push({ spr: spr, sheet: sheet, r: r });
    this.byKey[key] = spr;
    return spr;
  };
  Atlas.prototype.pack = function (maxSize) {
    var items = this.items.slice().sort(function (a, b) { return b.r.h - a.r.h; });
    var fit = function (W) {
      var x = 0, y = 0, row = 0, ok = [];
      for (var i = 0; i < items.length; i++) {
        var it = items[i], w = it.r.w + 4, h = it.r.h + 4;
        if (x + w > W) { x = 0; y += row; row = 0; }
        ok.push([x + 2, y + 2]);
        x += w; if (h > row) row = h;
      }
      return { H: y + row, at: ok };
    };
    var W = 2048, res = fit(W);
    if (res.H > 2048 && maxSize >= 4096) { W = 4096; res = fit(W); }
    this.w = W; this.h = Math.min(maxSize, res.H);
    var self = this;
    items.forEach(function (it, i) {
      var a = res.at[i], s = it.spr;
      s.ax = a[0]; s.ay = a[1];
      s.u0 = a[0] / W; s.v0 = a[1] / self.h; s.u1 = (a[0] + it.r.w) / W; s.v1 = (a[1] + it.r.h) / self.h;
    });
    return items;
  };
  Atlas.prototype.compose = function (layer, items) {
    var cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    var c = cv.getContext('2d');
    items.forEach(function (it) { c.drawImage(it.sheet[layer], it.r.x, it.r.y, it.r.w, it.r.h, it.spr.ax, it.spr.ay, it.r.w, it.r.h); });
    return cv;
  };
  Atlas.prototype.normals = function (items) {
    var W = this.w, H = this.h, out = new Uint8Array(W * H * 4), i;
    for (i = 0; i < W * H; i++) { out[i * 4] = 128; out[i * 4 + 1] = 128; }
    items.forEach(function (it) {
      var src = it.sheet.nrm, sw = it.sheet.w, r = it.r, j;
      for (j = 0; j < r.h; j++) {
        var from = ((r.y + j) * sw + r.x) * 4, to = ((it.spr.ay + j) * W + it.spr.ax) * 4;
        if (it.spr.ay + j >= H) break;
        out.set(src.subarray(from, from + r.w * 4), to);
      }
    });
    return out;
  };

  // --- Moteur WebGL ---
  function createGL(canvas) {
    var gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.GV_KEEP_FRAME });
    if (!gl) return null;
    var progS, progT, progB, progBl, progP;
    try {
      progS = compile(gl, VS_SPR, FS_SPR); progT = compile(gl, VS_T, FS_T);
      progB = compile(gl, VS_Q, FS_BRIGHT); progBl = compile(gl, VS_Q, FS_BLUR); progP = compile(gl, VS_Q, FS_POST);
    } catch (e) { if (window.console) console.warn('Shaders refusés, rendu simple', e); return null; }

    var verts = new Float32Array(MAX_QUADS * 4 * STRIDE), count = 0;
    var vao = gl.createVertexArray(), vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, verts.byteLength, gl.DYNAMIC_DRAW);
    var idx = new Uint16Array(MAX_QUADS * 6 > 65000 ? 65000 - 65000 % 6 : MAX_QUADS * 6), q;
    for (q = 0; q < idx.length / 6; q++) { var o6 = q * 6, v4 = q * 4; idx[o6] = v4; idx[o6 + 1] = v4 + 1; idx[o6 + 2] = v4 + 2; idx[o6 + 3] = v4; idx[o6 + 4] = v4 + 2; idx[o6 + 5] = v4 + 3; }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    var S = STRIDE * 4;
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, S, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, S, 8);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, S, 16);
    gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, S, 28);
    gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 2, gl.FLOAT, false, S, 44);
    var quadVao = gl.createVertexArray(), qb = gl.createBuffer();
    gl.bindVertexArray(quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var fieldVao = gl.createVertexArray(), fb2 = gl.createBuffer();
    gl.bindVertexArray(fieldVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, fb2);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    function tex(unit, w, h, data, opts) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      opts = opts || {};
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, !!opts.premult);
      if (data && data.getContext) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, data);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      var wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (opts.mip) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D); }
      else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      return t;
    }
    if (!noiseCache) noiseCache = noiseData();
    var T_ATLAS = 0, T_NRM = 1, T_NOISE = 2, T_MAP = 3, T_MAPN = 4, T_MASK = 5, T_POST = 6;
    tex(T_NOISE, noiseCache.size, noiseCache.size, noiseCache.data, { repeat: true, mip: true });

    function target(w, h, stencil) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + T_POST);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      var f = gl.createFramebuffer(), rb = null;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      if (stencil) {
        rb = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, rb);
      }
      return { t: t, f: f, rb: rb, w: w, h: h };
    }
    function freeTarget(x) { if (!x) return; gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); if (x.rb) gl.deleteRenderbuffer(x.rb); }
    var scene = null, b1a = null, b1b = null, b2a = null, b2b = null;
    var view = { sx: 1, sy: 1, tx: 0, ty: 0 }, lights = new Float32Array(MAX_LIGHTS * 4), lcols = new Float32Array(MAX_LIGHTS * 4), nLights = 0;
    var env = { sun: [-0.45, -0.6, 0.66], sunC: [1, 0.96, 0.86], amb: [0.42, 0.42, 0.48], back: [0.42, 0.4, 0.36], grade: [1, 1, 1], heat: 0, holy: [20, 15] };
    var field = [40, 30], hasMap = false, maxLights = MAX_LIGHTS;
    var api = {
      kind: 'gl', atlas: new Atlas(), fx: null, bloom: true,
      setEnv: function (e) { Object.keys(e).forEach(function (k) { env[k] = e[k]; }); },
      setLightLimit: function (n) { maxLights = n; },
      resize: function (w, h) {
        if (scene && scene.w === w && scene.h === h) return;
        canvas.width = w; canvas.height = h;
        [scene, b1a, b1b, b2a, b2b].forEach(freeTarget);
        scene = target(w, h, true);
        var w4 = Math.max(2, w >> 2), h4 = Math.max(2, h >> 2), w8 = Math.max(2, w >> 3), h8 = Math.max(2, h >> 3);
        b1a = target(w4, h4); b1b = target(w4, h4); b2a = target(w8, h8); b2b = target(w8, h8);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      },
      buildAtlas: function () {
        var items = this.atlas.pack(gl.getParameter(gl.MAX_TEXTURE_SIZE));
        tex(T_ATLAS, 0, 0, this.atlas.compose('albedo', items), { premult: true, mip: true });
        tex(T_NRM, this.atlas.w, this.atlas.h, this.atlas.normals(items), { mip: true });
      },
      setTerrain: function (b, fw, fh) {
        field = [fw, fh];
        tex(T_MAP, 0, 0, b.albedo, { mip: true });
        tex(T_MAPN, b.w, b.h, b.nrm, { mip: true });
        tex(T_MASK, b.w, b.h, b.mask, {});
        gl.bindBuffer(gl.ARRAY_BUFFER, fb2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, fw, 0, fw, fh, 0, 0, fw, fh, 0, fh]), gl.STATIC_DRAW);
        hasMap = true;
      },
      // Vue : monde vers pixels logiques du canvas
      begin: function (cssW, cssH, s, ox, oy, bg) {
        view.sx = s / cssW * 2; view.sy = -s / cssH * 2; view.tx = ox / cssW * 2 - 1; view.ty = 1 - oy / cssH * 2;
        gl.bindFramebuffer(gl.FRAMEBUFFER, scene.f);
        gl.viewport(0, 0, scene.w, scene.h);
        gl.clearColor(bg[0], bg[1], bg[2], 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.disable(gl.BLEND);
        count = 0;
      },
      setLights: function (list, time) {
        nLights = Math.min(maxLights, list.length);
        for (var i = 0; i < nLights; i++) {
          var l = list[i];
          lights[i * 4] = l.x; lights[i * 4 + 1] = l.y; lights[i * 4 + 2] = l.z; lights[i * 4 + 3] = l.r;
          lcols[i * 4] = l.cr * l.i; lcols[i * 4 + 1] = l.cg * l.i; lcols[i * 4 + 2] = l.cb * l.i; lcols[i * 4 + 3] = 0;
        }
        api.time = time;
      },
      time: 0,
      terrain: function () {
        if (!hasMap) return;
        gl.useProgram(progT.p);
        setCommon(progT);
        gl.uniform1i(progT.u.uMap, T_MAP); gl.uniform1i(progT.u.uMapN, T_MAPN); gl.uniform1i(progT.u.uMask, T_MASK);
        gl.uniform2f(progT.u.uField, field[0], field[1]);
        gl.uniform2f(progT.u.uHoly, env.holy[0], env.holy[1]);
        gl.bindVertexArray(fieldVao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      },
      startSprites: function () {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(progS.p);
        setCommon(progS);
        gl.uniform1i(progS.u.uA, T_ATLAS); gl.uniform1i(progS.u.uN, T_NRM);
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      },
      flush: flush,
      // Ombres : la pochoir évite qu'elles se doublent en se chevauchant
      shadowsOn: function () { flush(); gl.enable(gl.STENCIL_TEST); gl.stencilFunc(gl.EQUAL, 0, 255); gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR); },
      shadowsOff: function () { flush(); gl.disable(gl.STENCIL_TEST); },
      quad: function (s, x0, y0, x1, y1, x2, y2, x3, y3, c, sn, f, r, g, b, a, fl, m) {
        if (count >= idx.length / 6 || count >= MAX_QUADS) flush();
        var o = count * 4 * STRIDE, u0 = s.u0, v0 = s.v0, u1 = s.u1, v1 = s.v1;
        verts[o] = x0; verts[o + 1] = y0; verts[o + 2] = u0; verts[o + 3] = v0; verts[o + 4] = c; verts[o + 5] = sn; verts[o + 6] = f; verts[o + 7] = r; verts[o + 8] = g; verts[o + 9] = b; verts[o + 10] = a; verts[o + 11] = fl; verts[o + 12] = m;
        o += STRIDE;
        verts[o] = x1; verts[o + 1] = y1; verts[o + 2] = u1; verts[o + 3] = v0; verts[o + 4] = c; verts[o + 5] = sn; verts[o + 6] = f; verts[o + 7] = r; verts[o + 8] = g; verts[o + 9] = b; verts[o + 10] = a; verts[o + 11] = fl; verts[o + 12] = m;
        o += STRIDE;
        verts[o] = x2; verts[o + 1] = y2; verts[o + 2] = u1; verts[o + 3] = v1; verts[o + 4] = c; verts[o + 5] = sn; verts[o + 6] = f; verts[o + 7] = r; verts[o + 8] = g; verts[o + 9] = b; verts[o + 10] = a; verts[o + 11] = fl; verts[o + 12] = m;
        o += STRIDE;
        verts[o] = x3; verts[o + 1] = y3; verts[o + 2] = u0; verts[o + 3] = v1; verts[o + 4] = c; verts[o + 5] = sn; verts[o + 6] = f; verts[o + 7] = r; verts[o + 8] = g; verts[o + 9] = b; verts[o + 10] = a; verts[o + 11] = fl; verts[o + 12] = m;
        count++;
      },
      end: function (o) {
        flush();
        gl.bindVertexArray(quadVao);
        gl.disable(gl.BLEND);
        var useBloom = api.bloom;
        if (useBloom) {
          gl.useProgram(progB.p);
          bindT(scene.t, 7); gl.uniform1i(progB.u.uS, 7);
          pass(b1a); gl.drawArrays(gl.TRIANGLES, 0, 6);
          blur(b1a, b1b, b1a);
          gl.useProgram(progBl.p);
          // Second niveau, plus large
          blit(b1a, b2a);
          blur(b2a, b2b, b2a);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(progP.p);
        bindT(scene.t, 7); gl.uniform1i(progP.u.uS, 7);
        bindT(b1a.t, 8); gl.uniform1i(progP.u.uB1, 8);
        bindT(b2a.t, 9); gl.uniform1i(progP.u.uB2, 9);
        gl.uniform1f(progP.u.uBloom, useBloom ? 0.5 : 0);
        gl.uniform1f(progP.u.uAsp, canvas.width / canvas.height);
        gl.uniform1f(progP.u.uAb, o.ab || 0);
        gl.uniform1f(progP.u.uTime, api.time % 100);
        gl.uniform1f(progP.u.uHeat, env.heat);
        gl.uniform3fv(progP.u.uGrade, env.grade);
        gl.uniform4f(progP.u.uFlash, o.flash[0], o.flash[1], o.flash[2], o.flash[3]);
        var w = new Float32Array(16);
        (o.waves || []).slice(0, 4).forEach(function (v, i) { w[i * 4] = v.u; w[i * 4 + 1] = v.v; w[i * 4 + 2] = v.r; w[i * 4 + 3] = v.a; });
        gl.uniform4fv(progP.u.uWave, w);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);
      },
      dispose: function () {
        var e = gl.getExtension('WEBGL_lose_context');
        if (e) e.loseContext();
      }
    };
    function bindT(t, unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }
    function pass(to) { gl.bindFramebuffer(gl.FRAMEBUFFER, to.f); gl.viewport(0, 0, to.w, to.h); }
    function blur(src, tmp, out) {
      gl.useProgram(progBl.p);
      gl.uniform1i(progBl.u.uS, 7);
      bindT(src.t, 7); gl.uniform2f(progBl.u.uD, 1 / src.w, 0); pass(tmp); gl.drawArrays(gl.TRIANGLES, 0, 6);
      bindT(tmp.t, 7); gl.uniform2f(progBl.u.uD, 0, 1 / src.h); pass(out); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    function blit(src, to) {
      gl.useProgram(progBl.p);
      gl.uniform1i(progBl.u.uS, 7);
      bindT(src.t, 7); gl.uniform2f(progBl.u.uD, 0, 0); pass(to); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    function setCommon(pr) {
      gl.uniform4f(pr.u.uCam, view.sx, view.sy, view.tx, view.ty);
      gl.uniform3fv(pr.u.uSun, env.sun); gl.uniform3fv(pr.u.uSunC, env.sunC); gl.uniform3fv(pr.u.uAmb, env.amb); gl.uniform3fv(pr.u.uBack, env.back);
      gl.uniform1f(pr.u.uTime, api.time);
      gl.uniform1i(pr.u.uNoise, T_NOISE);
      if (pr.u.uGain) gl.uniform1f(pr.u.uGain, env.gain || 1.2);
      gl.uniform1i(pr.u.uNL, nLights);
      if (nLights) { gl.uniform4fv(pr.u.uLP, lights); gl.uniform4fv(pr.u.uLC, lcols); }
    }
    function flush() {
      if (!count) return;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, verts.subarray(0, count * 4 * STRIDE));
      gl.drawElements(gl.TRIANGLES, count * 6, gl.UNSIGNED_SHORT, 0);
      count = 0;
    }
    api.fx = fxSheet();
    return api;
  }

  // --- Moteur de secours : mêmes appels, éclairage figé, sans ombres ni post-traitement ---
  function create2D(canvas) {
    var ctx = canvas.getContext('2d'), litAtlas = null, map = null, view = { s: 1, ox: 0, oy: 0 }, dpr = 1;
    var api = {
      kind: '2d', atlas: new Atlas(), fx: fxSheet(), bloom: false,
      setEnv: function () {}, setLightLimit: function () {}, setLights: function () {},
      resize: function (w, h, d) { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } dpr = d || 1; },
      buildAtlas: function () { var items = this.atlas.pack(4096); litAtlas = this.atlas.compose('lit', items); },
      setTerrain: function (b, fw, fh) { map = { img: b.lit, w: fw, h: fh }; },
      begin: function (cssW, cssH, s, ox, oy, bg) {
        view.s = s; view.ox = ox; view.oy = oy;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = 'rgb(' + Math.round(bg[0] * 255) + ',' + Math.round(bg[1] * 255) + ',' + Math.round(bg[2] * 255) + ')';
        ctx.fillRect(0, 0, cssW, cssH);
      },
      terrain: function () {
        if (!map || !map.img) return;
        ctx.setTransform(dpr * view.s, 0, 0, dpr * view.s, dpr * view.ox, dpr * view.oy);
        ctx.drawImage(map.img, 0, 0, map.w, map.h);
      },
      startSprites: function () {}, flush: function () {}, shadowsOn: function () { api.noDraw = true; }, shadowsOff: function () { api.noDraw = false; },
      quad: function (s, x0, y0, x1, y1, x2, y2, x3, y3, c, sn, f, r, g, b, a, fl, m) {
        if (api.noDraw || !litAtlas) return;
        var w = s.aw, h = s.ah;
        ctx.setTransform(dpr * view.s * (x1 - x0) / w, dpr * view.s * (y1 - y0) / w, dpr * view.s * (x3 - x0) / h, dpr * view.s * (y3 - y0) / h, dpr * (view.ox + view.s * x0), dpr * (view.oy + view.s * y0));
        ctx.globalAlpha = Math.max(0, Math.min(1, a));
        if (m > 0.5) {
          // Effets : on remplit la surface de la couleur demandée
          ctx.globalCompositeOperation = m > 1.5 && m < 2.5 ? 'lighter' : 'source-over';
          if (m > 2.5) { ctx.globalCompositeOperation = 'source-over'; return; }
          ctx.fillStyle = 'rgb(' + Math.round(r * 255) + ',' + Math.round(g * 255) + ',' + Math.round(b * 255) + ')';
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 6.2832);
          ctx.globalAlpha *= 0.55;
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          return;
        }
        ctx.drawImage(litAtlas, s.ax, s.ay, w, h, 0, 0, w, h);
        if (fl > 0.05) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = fl * a;
          ctx.drawImage(litAtlas, s.ax, s.ay, w, h, 0, 0, w, h);
          ctx.globalCompositeOperation = 'source-over';
        }
      },
      end: function (o) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        if (o.flash[3] > 0) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = o.flash[3];
          ctx.fillStyle = 'rgb(' + Math.round(o.flash[0] * 255) + ',' + Math.round(o.flash[1] * 255) + ',' + Math.round(o.flash[2] * 255) + ')';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      },
      time: 0,
      dispose: function () {}
    };
    return api;
  }

  window.GVGL = {
    create: function (canvas, quality) {
      if (quality !== 'low') {
        var g = null;
        try { g = createGL(canvas); } catch (e) { g = null; }
        if (g) return g;
        // Un canvas qui a déjà ouvert un contexte WebGL ne peut plus passer en 2D
        var fresh = canvas.cloneNode();
        if (canvas.parentNode) canvas.parentNode.replaceChild(fresh, canvas);
        canvas = fresh;
      }
      return create2D(canvas);
    }
  };
})();
