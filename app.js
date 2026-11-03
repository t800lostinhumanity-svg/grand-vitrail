// Interface du jeu : royaume, armée, rencontres, carte, bestiaire et bataille
(function () {
  var GV = window.GV, GVB = window.GVB, GVQR = window.GVQR, GVM = window.GVM;
  var KEY = 'grand-vitrail-save-v1';
  var CODE_PREFIX = 'GV7:';
  var HOUR = 3600000, DAY = 24 * HOUR, LINK_LIFE = 7 * DAY, MAX_LEVEL = 10;
  var state = null, tab = 'base', draft = { name: '', race: 0 };
  var encounter = null; // { other, mine, code } pendant une rencontre
  var scanStream = null, scanTimer = null;
  var shownCode = null; // le code que l'ami a lu : c'est lui qui fait foi pour la bataille
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n) { n = Math.floor(n); return n >= 10000 ? Math.floor(n / 1000) + ' k' : String(n); }
  function dayKey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

  // Sauvegarde
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch (e) { state = null; }
    if (state) normalize();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* le jeu continue sans sauvegarde */ }
  }

  // Complète une sauvegarde, y compris celle d'une version précédente
  function normalize() {
    var defaults = { arsenal: {}, equip: {}, inbox: [], outbox: [], carry: [], seen: {}, acks: [], skins: {}, skin: -1, powerTime: 1, seq: 0, fame: 0, fameLevel: 1, stats: {}, trophies: {}, heroes: {}, heroActive: 0, items: [], itemSeq: 0, gear: {}, quality: 'high', jobs: [], research: { done: {}, job: null }, stars: {}, raidAt: Date.now() + 20 * 60000, taxRate: 1, taxLast: Date.now(), auto: { uid: 0, last: Date.now() }, ulv: {}, season: 1, history: [], sound: true, rot: 0 };
    Object.keys(defaults).forEach(function (k) { if (state[k] === undefined) state[k] = defaults[k]; });
    if (!state.quests) state.quests = { day: '', prog: {}, done: {} };
    if (!state.heroes[0]) state.heroes[0] = { lv: 1, xp: 0, skills: {} };
    if (!state.gear[0]) state.gear[0] = {};
    window.GVG.quality = state.quality;
  }
  function newGame(name, race) {
    var now = Date.now();
    state = {
      v: 1, id: Math.floor(Math.random() * 2176782336).toString(36) + Math.floor(Math.random() * 46656).toString(36),
      name: name, race: race, last: now, seasonStart: now,
      res: { or: 500, ble: 300, bois: 320, pierre: 220, fer: 120, lumiere: 10, eclats: 0 },
      bld: { cit: 1, cas: 1, fer: 1, min: 1, sci: 1 },
      reserve: {}, slots: new Array(12).fill(null),
      links: {}, hybrids: [], crowns: 0, wins: 0, losses: 0, trainLevel: 1, arsenal: {}, equip: {}
    };
    state.slots[0] = 1; state.slots[1] = 0; state.slots[3] = 0;
    normalize();
    ensureBase();
    save();
  }

  // Économie
  function lvl(id) { return state.bld[id] || 0; }
  function bonus(key) {
    var total = 0;
    GV.buildingsFor(state.race).forEach(function (b) { if (b.eff && b.eff[key]) total += b.eff[key] * lvl(b.id); });
    GV.TECHS.forEach(function (t) { if (state.research.done[t.id] && t.eff[key]) total += t.eff[key]; });
    return total;
  }
  function activeLinks() {
    var now = Date.now();
    return Object.keys(state.links).map(function (k) { return state.links[k]; }).filter(function (l) { return now - l.last < LINK_LIFE; });
  }
  function production() {
    var p = { or: 0, ble: 0, bois: 0, pierre: 0, fer: 0, lumiere: 0, eclats: 0 };
    GV.buildingsFor(state.race).forEach(function (b) {
      if (!b.prod) return;
      Object.keys(b.prod).forEach(function (r) { p[r] += b.prod[r] * lvl(b.id); });
    });
    p.ble *= 1 + 0.08 * lvl('mou');
    var mood = TAX_RATES[state.taxRate].prod * (1 + bonus('prod') / 100);
    ['or', 'ble', 'bois', 'pierre', 'fer'].forEach(function (r) { p[r] *= mood; });
    p.lumiere += 4 * activeLinks().length + 1;
    p.lumiere += 3 * activeLinks().filter(function (l) { return l.ally; }).length;
    return p;
  }
  function storage() { return Math.floor(3000 * Math.pow(1.6, lvl('cit') - 1) * (1 + bonus('storage') / 100)); }
  // --- Impôts : les habitants paient toutes les 10 minutes ---
  var TAX_PERIOD = 10 * 60000;
  var TAX_RATES = [{ name: 'Bas', m: 0.35, prod: 1.1, text: 'Peu d’or, mais +10 % de production' }, { name: 'Normal', m: 0.5, prod: 1, text: 'Équilibré' }, { name: 'Élevé', m: 0.8, prod: 0.85, text: 'Beaucoup d’or, mais -15 % de production' }];
  var news = { or: 0, units: [], built: [], techs: [] };
  function population() {
    var pop = 30;
    Object.keys(state.bld).forEach(function (k) { pop += 8 * state.bld[k]; });
    return pop + 20 * lvl('cit');
  }
  function taxAmount() { return Math.floor(population() * TAX_RATES[state.taxRate].m * (1 + bonus('tax') / 100)); }
  function collectTaxes(now) {
    var n = Math.floor((now - state.taxLast) / TAX_PERIOD);
    if (n <= 0) return;
    n = Math.min(n, 72); // 12 heures d'absence au maximum, comme la production
    var got = Math.min(n * taxAmount(), Math.max(0, storage() - state.res.or));
    state.res.or += got;
    news.or += got;
    state.taxLast = now - ((now - state.taxLast) % TAX_PERIOD);
  }

  // --- Recrues gratuites : la caserne forme des unités toute seule ---
  var AUTO_MINUTES = [5, 8, 12, 12, 18, 18, 25, 25, 30, 40];
  function autoPeriod(uid) {
    var m = AUTO_MINUTES[uid] * Math.max(0.4, 1 - 0.05 * (lvl('cas') - 1) - bonus('auto') / 100);
    // Une armée vide reçoit ses renforts trois fois plus vite : on peut toujours repartir au combat
    return m * 60000 / (armyTotal() === 0 ? 3 : 1);
  }
  function armyTotal() {
    var n = placedCount();
    Object.keys(state.reserve).forEach(function (u) { n += state.reserve[u]; });
    return n;
  }
  function autoLimit() { return armyCap() + 4 + lvl('cas'); }
  function addUnit(id) {
    var free = placedCount() < armyCap() ? state.slots.indexOf(null) : -1;
    if (free >= 0) state.slots[free] = id;
    else state.reserve[id] = (state.reserve[id] || 0) + 1;
  }
  function collectUnits(now) {
    var a = state.auto;
    if (GV.unitInfo(state.race, a.uid).tier > lvl('cas')) a.uid = 0;
    var guard = 0;
    while (guard++ < 40) {
      if (armyTotal() >= autoLimit()) { a.last = now; return; }
      var period = autoPeriod(a.uid);
      if (now - a.last < period) return;
      a.last += period;
      addUnit(a.uid);
      news.units.push(GV.unitInfo(state.race, a.uid).name);
    }
    a.last = now;
  }
  function nextUnitAt() { return state.auto.last + autoPeriod(state.auto.uid); }
  function nextTaxAt() { return state.taxLast + TAX_PERIOD; }
  function autoFill() {
    Object.keys(state.reserve).forEach(function (u) {
      while (state.reserve[u] > 0 && placedCount() < armyCap()) {
        state.slots[state.slots.indexOf(null)] = +u;
        state.reserve[u]--;
      }
    });
  }
  function countdown(at) { return '<span data-until="' + Math.floor(at) + '">' + clock(at) + '</span>'; }
  function clock(at) {
    var left = Math.max(0, Math.ceil((at - Date.now()) / 1000));
    return Math.floor(left / 60) + ' min ' + ('0' + (left % 60)).slice(-2);
  }
  function flushNews() {
    var parts = [];
    if (news.or > 0) parts.push('Impôts : +' + fmt(news.or) + ' Or');
    if (news.units.length) parts.push(news.units.length > 1 ? '+' + news.units.length + ' recrues' : news.units[0] + ' rejoint ton armée');
    news.built.forEach(function (id) { parts.push(buildingName(buildingById(id)) + ' : niveau ' + lvl(id)); });
    news.techs.forEach(function (id) { parts.push('Recherche terminée : ' + GV.TECHS.filter(function (t) { return t.id === id; })[0].name); });
    var changed = news.units.length + news.built.length + news.techs.length;
    news = { or: 0, units: [], built: [], techs: [] };
    if (parts.length) toast(parts.join(' · '));
    return changed > 0;
  }

  // --- Niveaux d'unités : un rang entier progresse ---
  var UNIT_MAX = 5;
  function unitLevel(uid) { return state.ulv[uid] || 1; }
  function levelMult(l) { return 1 + 0.12 * (l - 1); }
  function upgradeCost(uid) {
    var base = GV.unitInfo(state.race, uid).cost, l = unitLevel(uid), m = 1.5 * l * l;
    var c = { or: Math.ceil(base.or * m), fer: Math.ceil((base.fer || base.or * 0.25) * m) };
    if (l >= 3) c.lumiere = 5 * l;
    return c;
  }
  function upgradeCap() { return Math.min(UNIT_MAX, lvl('cas') + 1); }

  // --- Chantiers : construire prend du temps et mobilise un bâtisseur ---
  function jobOf(id) { return state.jobs.filter(function (j) { return j.id === id; })[0] || null; }
  function buildersMax() { return 2 + (lvl('cit') >= 5 ? 1 : 0); }
  function buildersFree() { return buildersMax() - state.jobs.length; }
  function jobSeconds(b) {
    var L = lvl(b.id) + 1;
    return 20 * L * L * (b.id === 'cit' ? 1.5 : 1) * (1 - bonus('build') / 100);
  }
  function startJob(b) {
    var now = Date.now();
    state.jobs.push({ id: b.id, start: now, until: now + jobSeconds(b) * 1000 });
  }
  function speedCost(until) { return Math.max(1, Math.ceil((until - Date.now()) / 300000)); }
  function collectJobs(now) {
    state.jobs = state.jobs.filter(function (j) {
      if (now < j.until) return true;
      state.bld[j.id] = lvl(j.id) + 1;
      news.built.push(j.id);
      track('build');
      return false;
    });
    var job = state.research.job;
    if (job && now >= job.until) {
      state.research.done[job.id] = 1;
      state.research.job = null;
      news.techs.push(job.id);
    }
  }

  function collect() {
    var now = Date.now();
    var elapsed = Math.max(0, Math.min(now - state.last, 12 * HOUR)) / HOUR;
    var p = production(), cap = storage();
    Object.keys(p).forEach(function (r) {
      var before = state.res[r] || 0;
      if (before < cap) state.res[r] = Math.min(cap, before + p[r] * elapsed);
    });
    state.last = now;
    collectTaxes(now);
    collectUnits(now);
    collectJobs(now);
  }
  function canPay(cost) {
    return Object.keys(cost).every(function (r) { return (state.res[r] || 0) >= cost[r]; });
  }
  function pay(cost) { Object.keys(cost).forEach(function (r) { state.res[r] -= cost[r]; }); }
  function costHtml(cost) {
    return Object.keys(cost).map(function (r) {
      var name = GV.RES.filter(function (x) { return x.id === r; })[0].name;
      var short = (state.res[r] || 0) < cost[r];
      return '<span class="' + (short ? 'short' : '') + '">' + fmt(cost[r]) + ' ' + name + '</span>';
    }).join(' · ');
  }
  function buildCost(b) {
    var l = lvl(b.id), m = Math.pow(1.55, l), c = {};
    Object.keys(b.cost).forEach(function (r) { c[r] = Math.ceil(b.cost[r] * m); });
    return c;
  }
  function unitCost(uid) {
    var info = GV.unitInfo(state.race, uid);
    var m = GV.RACES[state.race].costM * Math.max(0.5, 1 - 0.02 * lvl('bib') - bonus('cost') / 100), c = {};
    Object.keys(info.cost).forEach(function (r) { c[r] = Math.ceil(info.cost[r] * m); });
    return c;
  }
  function armyCap() { return Math.min(12, 6 + Math.ceil(lvl('tav') / 2) + (lvl('cit') >= 5 ? 1 : 0) + Math.floor(bonus('cap'))); }
  function placedCount() { return state.slots.filter(function (x) { return x !== null; }).length; }

  // Code de rencontre : le royaume tel qu'il part au combat
  function equipped(uid) {
    var w = state.equip[uid];
    return w === undefined || w === null ? -1 : w;
  }
  function sideOf() {
    var squad = [];
    state.slots.forEach(function (u, i) { if (u !== null) squad.push([u, i, equipped(u), unitLevel(u)]); });
    return { race: state.race, squad: squad, atk: 1 + 0.03 * lvl('for') + 0.015 * lvl('tou') + bonus('atk') / 100, hp: 1 + 0.03 * lvl('mur') + bonus('hp') / 100, spd: 1 + 0.02 * lvl('ecu') + bonus('spd') / 100, siege: 1 + 0.05 * lvl('ate') + bonus('siege') / 100, pt: state.powerTime, skin: state.skin, hero: heroSide() };
  }
  function encodeSide(s) {
    return { s: s.squad.map(function (e) { return e[0] + '.' + e[1] + (e[3] > 1 ? '.' + e[2] + '.' + e[3] : (e[2] >= 0 ? '.' + e[2] : '')); }).join(','), a: Math.round(s.atk * 1000), h: Math.round(s.hp * 1000), v: Math.round(s.spd * 1000), g: Math.round(s.siege * 1000), p: s.pt, k: s.skin, H: s.hero ? [s.hero.a, Math.round(s.hero.hp), Math.round(s.hero.atk * 10), s.hero.aura, s.hero.cd * 10, Math.round(s.hero.ab * 100), s.hero.spd, s.hero.w, s.hero.lv, s.hero.name].join('~') : undefined };
  }
  function makeCode() {
    var obj = encodeSide(sideOf());
    obj.i = state.id; obj.n = state.name; obj.r = state.race; obj.l = lvl('cit'); obj.c = state.crowns; obj.t = dayKey();
    var parcels = parcelsToCarry();
    if (parcels.length) obj.q = parcels;
    if (state.acks.length) obj.o = state.acks.slice(0, 4);
    return CODE_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function decodeSide(o, race) {
    var squad = String(o.s || '').split(',').filter(Boolean).map(function (x) { var p = x.split('.'); return [p[0] | 0, p[1] | 0, p[2] === undefined ? -1 : p[2] | 0, p[3] === undefined ? 1 : Math.max(1, Math.min(5, p[3] | 0))]; }).filter(function (e) {
      return ((e[0] >= 0 && e[0] < 12) || (e[0] >= 100 && e[0] < 108)) && e[1] >= 0 && e[1] < 12 && e[2] >= -1 && e[2] < GV.WEAPONS.length;
    }).slice(0, 12);
    function clamp(v, max) { return Math.max(1, Math.min(max, (v | 0) / 1000)); }
    var skin = o.k | 0;
    var hero = null;
    if (typeof o.H === 'string') {
      var hp = o.H.split('~');
      hero = {
        a: Math.max(0, Math.min(2, hp[0] | 0)), hp: Math.max(100, Math.min(9000, hp[1] | 0)), atk: Math.max(5, Math.min(600, (hp[2] | 0) / 10)), aura: Math.max(0, Math.min(10, +hp[3] || 0)),
        cd: Math.max(4, Math.min(20, (+hp[4] || 120) / 10)), ab: Math.max(1, Math.min(2, (hp[5] | 0) / 100)), spd: Math.max(0, Math.min(15, +hp[6] || 0)), w: Math.max(-1, Math.min(GV.WEAPONS.length - 1, hp[7] === undefined ? -1 : hp[7] | 0)), lv: hp[8] | 0, name: String(hp[9] || 'Héros').slice(0, 24)
      };
    }
    return { hero: hero, race: race, squad: squad, atk: clamp(o.a, 2.2), hp: clamp(o.h, 2), spd: clamp(o.v, 1.6), siege: clamp(o.g, 2.5), pt: Math.max(0, Math.min(2, o.p === undefined ? 1 : o.p | 0)), skin: skin >= 0 && skin < GV.SKINS.length ? skin : -1 };
  }
  // Dans un message, un code peut arriver coupé en plusieurs lignes ou entouré de texte
  function cleanCode(text) {
    var parts = String(text || '').trim().split(/\s+/), i = 0;
    while (i < parts.length && !/GV\d+:/.test(parts[i])) i++;
    if (i === parts.length) return parts.join('');
    var code = parts[i].slice(parts[i].search(/GV\d+:/));
    for (var j = i + 1; j <= parts.length; j++) {
      try {
        JSON.parse(decodeURIComponent(escape(atob(code.slice(code.indexOf(':') + 1)))));
        return code;
      } catch (e) {
        if (j < parts.length) code += parts[j];
      }
    }
    return code;
  }
  function readCode(text) {
    var t = cleanCode(text);
    if (t.indexOf('GV') === 0 && t.indexOf(CODE_PREFIX) !== 0) throw new Error('Ce code vient d\u2019une autre version du jeu. Mettez-le à jour tous les deux.');
    if (t.indexOf(CODE_PREFIX) !== 0) throw new Error('Ce code ne vient pas du Grand Vitrail.');
    var o;
    try { o = JSON.parse(decodeURIComponent(escape(atob(t.slice(CODE_PREFIX.length))))); } catch (e) { throw new Error('Ce code est incomplet. Recopie-le en entier.'); }
    var race = o.r | 0;
    if (race < 0 || race > 7 || typeof o.i !== 'string') throw new Error('Ce code est invalide.');
    var parcels = Array.isArray(o.q) ? o.q.filter(function (p) { return p && typeof p.i === 'string' && typeof p.f === 'string' && typeof p.t === 'string' && typeof p.k === 'string'; }).slice(0, 3) : [];
    return { id: o.i, name: String(o.n || 'Inconnu').slice(0, 16), race: race, level: o.l | 0, crowns: o.c | 0, side: decodeSide(o, race), parcels: parcels, acks: Array.isArray(o.o) ? o.o.slice(0, 4).map(String) : [], raw: t };
  }

  // Sprites
  function unitSvg(race, uid, label, weaponId, skin) {
    return '<svg data-spr="' + race + '|' + uid + '|' + (weaponId || '') + '|' + (skin === undefined ? -1 : skin) + '" class="' + GV.unitClass(race, uid, skin === undefined ? -1 : skin) + '" viewBox="-14 0 148 140" role="img" aria-label="' + esc(label || GV.unitInfo(race, uid).name) + '">' + GV.unitMarkup(race, uid, weaponId) + '</svg>';
  }
  function mySprite(uid) {
    var w = equipped(uid);
    return unitSvg(state.race, uid, null, w >= 0 ? GV.WEAPONS[w][0] : null, state.skin);
  }
  function bldSvg(b, cls) {
    var sym = b.sym || GV.RACES[state.race].citadel;
    return '<svg data-bld="' + sym + '|' + (b.orn || '') + '|' + cls + '" class="' + cls + '" viewBox="0 0 200 180" role="img" aria-label="' + esc(b.name) + '"><use href="#' + sym + '" width="200" height="180"></use>' + (b.orn ? '<use href="#' + b.orn + '" width="200" height="180"></use>' : '') + '</svg>';
  }

  // Écrans
  function renderHud() {
    if (!state) { $('hud').hidden = true; return; }
    $('hud').hidden = false;
    var race = GV.RACES[state.race];
    var res = GV.RES.map(function (r) {
      return '<div class="res"><i class="gem" style="background:' + r.color + '"></i><b style="color:' + r.color + '">' + fmt(state.res[r.id] || 0) + '</b>' + r.name + '</div>';
    }).join('');
    $('hud').innerHTML = '<div class="hud-top"><span class="hud-name">' + esc(state.name) + ' · ' + race.name + '</span><span class="hud-crowns">Couronnes ' + state.crowns + '</span></div><div class="fame" title="Renommée"><i style="width:' + Math.round(state.fame / fameNeed(state.fameLevel) * 100) + '%"></i><span>Renommée ' + state.fameLevel + '</span></div><div class="hud-res">' + res + '</div>';
  }
  function tabIcon(id) {
    var d = {
      base: 'M3 21V9l4-3v4h2V6l3-3 3 3v4h2V6l4 3v12h-7v-5h-4v5Z',
      campagne: 'M4 3h2v18H4Zm3 1h12l-3 4 3 4H7Z',
      armee: 'M14 3h7v7l-9 9 2 2-2 2-3-3-4 4-2-2 4-4-3-3 2-2 2 2Z',
      heros: 'M3 8l5 4 4-8 4 8 5-4-2 11H5Zm3 13h12v2H6Z',
      rencontre: 'M8 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm9 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM1 21v-3c0-3 3-5 7-5s7 2 7 5v3Zm16-7c3 0 6 1 6 4v3h-6v-3c0-2-1-3-2-4Z',
      carte: 'M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 2v16M4 12h16M6 6c3 2 9 2 12 0M6 18c3-2 9-2 12 0'
    }[id];
    var stroke = id === 'carte' ? ' fill="none" stroke="currentColor" stroke-width="2"' : ' fill="currentColor"';
    return '<svg class="tab-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"' + stroke + '></path></svg>';
  }
  function renderTabs() {
    if (!state) { $('tabs').hidden = true; return; }
    $('tabs').hidden = false;
    var items = [['base', 'Base'], ['campagne', 'Campagne'], ['armee', 'Armée'], ['heros', 'Héros'], ['rencontre', 'Amis'], ['carte', 'Monde']];
    $('tabs').innerHTML = items.map(function (it) {
      return '<button data-act="tab" data-v="' + it[0] + '"' + (tab === it[0] ? ' aria-current="page"' : '') + '>' + tabIcon(it[0]) + it[1] + '</button>';
    }).join('');
  }

  function viewCreate() {
    var cards = GV.RACES.map(function (r, i) {
      return '<button class="race-card" style="--c:' + r.color + '" data-act="pick-race" data-v="' + i + '" aria-pressed="' + (draft.race === i) + '" type="button"><svg data-spr="' + i + '|10||-1" class="' + r.cls + '" width="96" height="100" viewBox="-14 0 148 140" aria-hidden="true">' + GV.unitMarkup(i, 10) + '</svg><strong style="color:' + r.color + '">' + r.name + '</strong><small>Verre ' + r.glass + '</small><small>' + r.trait + '</small></button>';
    }).join('');
    return '<div class="title-block">' + GVG.rose(116) + '<h1>Le Grand Vitrail</h1></div><p class="title-sub">Le monde est un vitrail brisé. Ton téléphone en garde un éclat. Choisis ton peuple.</p>' + iosInstallHint() + '<label class="field" for="name">Nom de ton royaume<input type="text" id="name" maxlength="16" value="' + esc(draft.name) + '" placeholder="Ex. Valombre"></label><div class="races">' + cards + '</div><button class="btn" data-act="start">Fonder mon royaume</button>';
  }

  // --- Mode campagne ---
  function viewCampagne() {
    var last = state.trainLevel, current = Math.floor((last - 1) / 5);
    var chap = draft.chapter === undefined || draft.chapter === null ? current : draft.chapter;
    var map = GVM.MAPS[chap % 8], first = chap * 5 + 1;
    var nodes = [0, 1, 2, 3, 4].map(function (i) {
      var level = first + i, cleared = level < last, open = level <= last, boss = i === 4;
      var stars = state.stars[level] || 0, pos = [[12, 72], [30, 38], [50, 66], [70, 34], [88, 60]][i];
      var label = (boss ? 'Boss' : 'Combat ' + (i + 1)) + (cleared ? ', ' + stars + ' étoiles' : (open ? ', à jouer' : ', verrouillé'));
      return '<button class="node' + (boss ? ' boss' : '') + (cleared ? ' done' : '') + (level === last ? ' now' : '') + '" style="left:' + pos[0] + '%;top:' + pos[1] + '%" data-act="train" data-v="' + level + '"' + (open ? '' : ' disabled') + ' aria-label="' + label + '">' + (boss ? '♛' : (i + 1)) + '<span class="nstars">' + (cleared ? '★★★'.slice(0, stars) : '') + '</span></button>';
    }).join('');
    var nav = '<div class="row chap"><button class="btn alt" data-act="chapter" data-v="' + (chap - 1) + '"' + (chap <= 0 ? ' disabled' : '') + ' aria-label="Chapitre précédent">‹</button><strong>Chapitre ' + (chap + 1) + ' · ' + esc(map.name) + '</strong><button class="btn alt" data-act="chapter" data-v="' + (chap + 1) + '"' + (chap >= current ? ' disabled' : '') + ' aria-label="Chapitre suivant">›</button></div>';
    return raidPanel() + viewSeasonNote() + '<div class="panel"><h2>Campagne</h2>' + nav + '<div class="world"><img src="' + GVM.image(chap % 8, 720, 400, false) + '" alt="Terrain : ' + esc(map.name) + '">' + nodes + '</div><p class="note">' + esc(map.rule) + '</p><p class="note">Armée : ' + armyTotal() + ' unités · Prochaine recrue dans ' + countdown(nextUnitAt()) + '</p><p class="note">Le boss de chaque chapitre t’attend dans sa forteresse : abats son donjon. Rejoue un combat pour gagner plus d’étoiles.</p></div>' + viewQuests() + '<div class="panel"><h3>Options</h3><button class="btn alt" data-act="quality">Graphismes : ' + (state.quality === 'low' ? 'économie' : 'maximum') + '</button><button class="btn alt" data-act="sound">Son : ' + (state.sound ? 'activé' : 'coupé') + '</button><button class="btn alt" data-act="reset">' + (draft.confirmReset ? 'Confirmer : tout effacer' : 'Recommencer une partie') + '</button></div>';
  }

  // --- Mode gestion : la base personnelle ---
  var BASE_MAX = 10, TW = 64, TH = 32;
  var DECOR = { tree: { name: 'Arbre', gain: { bois: 60 }, sym: 'dcTree' }, rock: { name: 'Rocher', gain: { pierre: 45 }, sym: 'dcRock' }, bush: { name: 'Buisson', gain: { ble: 40 }, sym: 'dcBush' } };
  var CLEAR_COST = { or: 25 };

  function buildingById(id) { return GV.buildingsFor(state.race).filter(function (b) { return b.id === id; })[0]; }
  function buildingName(b) { return b.id === 'cit' ? GV.RACES[state.race].citadelName : b.name; }
  function tileKey(x, y) { return x + ',' + y; }
  function seedDecor(from, to) {
    var rand = GVB.rng32(GVB.hashStr(state.id + 'decor' + to));
    var kinds = ['tree', 'tree', 'rock', 'bush'];
    for (var y = 0; y < to; y++) for (var x = 0; x < to; x++) {
      if (x < from && y < from) continue;
      var key = tileKey(x, y);
      if (!state.base.tiles[key] && rand() < 0.26) state.base.decor[key] = kinds[Math.floor(rand() * kinds.length)];
    }
  }
  function tilesFromCenter(size) {
    var out = [], c = (size - 1) / 2;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) out.push([x, y]);
    // Une case sur deux d'abord, pour que les bâtiments ne se cachent pas les uns les autres
    function rank(t) { return ((t[0] + t[1]) % 2 ? 100 : 0) + Math.abs(t[0] - c) + Math.abs(t[1] - c); }
    out.sort(function (a, b) { return rank(a) - rank(b); });
    return out;
  }
  // Crée la base, et y pose les bâtiments d'une sauvegarde plus ancienne
  function ensureBase() {
    if (state.base) return;
    var built = GV.buildingsFor(state.race).filter(function (b) { return lvl(b.id) > 0; }).map(function (b) { return b.id; });
    var size = 5;
    while (size * size < built.length + 8) size++;
    state.base = { size: size, tiles: {}, decor: {} };
    tilesFromCenter(size).slice(0, built.length).forEach(function (t, i) { state.base.tiles[tileKey(t[0], t[1])] = built[i]; });
    seedDecor(0, size);
  }
  function extendCost() {
    var m = Math.pow(1.9, state.base.size - 5);
    return { or: Math.ceil(400 * m), bois: Math.ceil(300 * m), pierre: Math.ceil(220 * m) };
  }
  function extendNeed() { return state.base.size - 3; }
  function buildingUse(b) {
    var l = lvl(b.id), capL = b.id === 'cit' ? MAX_LEVEL : Math.min(MAX_LEVEL, lvl('cit') + 1);
    var needs = b.req && lvl('cit') < b.req;
    return { level: l, needs: needs, capped: l >= capL, max: l >= MAX_LEVEL, cost: buildCost(b) };
  }

  function baseModel() {
    var race = GV.RACES[state.race], objects = [], free = [], size = state.base.size;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var key = tileKey(x, y), id = state.base.tiles[key], dec = state.base.decor[key];
      if (id) {
        var b = buildingById(id), l = lvl(id), big = id === 'cit';
        var w = (big ? 88 : 64) * (1 + 0.025 * l), sym = b.sym || race.citadel;
        objects.push({ x: x, y: y, sym: sym, orn: b.orn, cls: race.cls, key: 'b' + sym + ':' + (b.orn || '') + ':' + race.cls, w: w, h: w * 0.9, foot: 0.93, level: l, job: jobOf(id), smoke: id === 'for' || id === 'cit' || id === 'tav' || id === 'ate', lit: true });
      } else if (dec) {
        objects.push({ decor: true, x: x, y: y, sym: DECOR[dec].sym, key: 'd' + DECOR[dec].sym, w: 38, h: 42, foot: 0.92 });
      } else free.push(key);
    }
    return { size: size, seed: state.id + ':' + size, palette: GVM.MAPS[state.race].ground, race: state.race, skin: state.skin, population: population(), objects: objects, free: free, selected: draft.tile, moving: !!draft.moving };
  }
  function tileAction(tk) {
    if (draft.moving) {
      if (state.base.tiles[tk] || state.base.decor[tk]) { toast('Choisis une case libre.'); return; }
      state.base.tiles[tk] = state.base.tiles[draft.moving];
      delete state.base.tiles[draft.moving];
      draft.moving = null;
      draft.tile = tk;
      save(); render();
      return;
    }
    draft.panel = null;
    draft.tile = draft.tile === tk ? null : tk;
    render();
  }
  function tileButtons() {
    var out = '', size = state.base.size;
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var key = tileKey(x, y), id = state.base.tiles[key], dec = state.base.decor[key];
      var label = id ? buildingName(buildingById(id)) + ', niveau ' + lvl(id) : (dec ? DECOR[dec].name : 'Terrain libre');
      out += '<button data-act="tile" data-v="' + key + '">' + esc(label) + ' (case ' + key + ')</button>';
    }
    return '<div class="sr-only">' + out + '</div>';
  }

  function buildableRow(b, c) {
    var u = buildingUse(b), line = u.needs ? 'Citadelle niveau ' + b.req + ' requise' : costHtml(u.cost);
    return '<div class="unit' + (u.needs ? ' locked' : '') + '">' + bldSvg(b, GV.RACES[state.race].cls) + '<div><strong>' + esc(buildingName(b)) + '</strong>' + (b.unique ? '<span class="note">Propre à ton peuple · </span>' : '') + '<span class="note">' + b.desc + '</span><div class="cost">' + line + '</div></div><button class="btn" data-act="place" data-v="' + b.id + '" aria-label="Construire ' + esc(buildingName(b)) + '"' + (u.needs || !canPay(u.cost) || buildersFree() < 1 ? ' disabled' : '') + '>+</button></div>';
  }
  function basePanel() {
    if (draft.panel === 'market') return viewMarket();
    if (draft.panel === 'research') return viewResearch();
    if (draft.panel === 'extend') {
      var ec = extendCost(), need = extendNeed(), atMax = state.base.size >= BASE_MAX, low = lvl('cit') < need;
      return '<div class="panel"><h3>Étendre la base</h3><p class="note">Ton terrain passe de ' + state.base.size + ' × ' + state.base.size + ' à ' + (state.base.size + 1) + ' × ' + (state.base.size + 1) + ' cases. Le nouveau terrain est à défricher.</p>' + (atMax ? '<p>Ta base a atteint sa taille maximale.</p>' : '<p class="cost">' + costHtml(ec) + (low ? ' · <span class="short">Citadelle niveau ' + need + ' requise</span>' : '') + '</p><button class="btn" data-act="extend"' + (low || !canPay(ec) ? ' disabled' : '') + '>Conquérir ce terrain</button>') + '</div>';
    }
    if (draft.moving) {
      var mb = buildingById(state.base.tiles[draft.moving]);
      return '<div class="panel"><h3>Déplacer : ' + esc(buildingName(mb)) + '</h3><p class="note">Touche une case libre sur le plan.</p><button class="btn alt" data-act="move-cancel">Annuler</button></div>';
    }
    if (draft.tile) {
      var key = draft.tile, id = state.base.tiles[key], dec = state.base.decor[key];
      if (id && jobOf(id)) {
        var jb = jobOf(id), jn = buildingById(id), jc = speedCost(jb.until);
        return '<div class="panel"><h3>Chantier : ' + esc(buildingName(jn)) + '</h3><p>Niveau ' + (lvl(id) + 1) + ' prêt dans ' + countdown(jb.until) + '</p><button class="btn" data-act="speedup" data-v="' + id + '"' + (state.res.eclats < jc ? ' disabled' : '') + '>Terminer maintenant : ' + jc + ' Éclats</button></div>';
      }
      if (id) {
        var b = buildingById(id), u = buildingUse(b);
        var label = u.max ? 'Niveau maximal' : (u.capped ? 'Citadelle trop basse' : 'Améliorer au niveau ' + (u.level + 1));
        var blocked = u.capped || !canPay(u.cost) || buildersFree() < 1;
        if (!u.capped && buildersFree() < 1) label = 'Bâtisseurs occupés';
        return '<div class="panel"><div class="unit" style="border:0;background:none;padding:0">' + bldSvg(b, GV.RACES[state.race].cls) + '<div style="grid-column:2 / 4"><strong>' + esc(buildingName(b)) + ' · Niveau ' + u.level + '</strong><span class="note">' + b.desc + '</span></div></div>' + (u.capped ? '' : '<p class="cost">' + costHtml(u.cost) + '</p>') + '<div class="row"><button class="btn" data-act="build" data-v="' + id + '"' + (blocked ? ' disabled' : '') + '>' + label + '</button><button class="btn alt" data-act="move">Déplacer</button></div></div>';
      }
      if (dec) {
        var d = DECOR[dec];
        return '<div class="panel"><h3>' + d.name + '</h3><p class="note">Défrichez cette case pour y construire. Vous récoltez : ' + rewardText(d.gain) + '.</p><p class="cost">' + costHtml(CLEAR_COST) + '</p><button class="btn" data-act="clear"' + (canPay(CLEAR_COST) ? '' : ' disabled') + '>Défricher</button></div>';
      }
      var list = GV.buildingsFor(state.race).filter(function (b) { return lvl(b.id) === 0 && !jobOf(b.id); });
      list.sort(function (x, y) { return (buildingUse(x).needs ? 1 : 0) - (buildingUse(y).needs ? 1 : 0); });
      return '<div class="panel"><h3>Terrain libre : que construire ?</h3>' + (list.length ? '<div class="units">' + list.map(buildableRow).join('') + '</div>' : '<p class="note">Tous tes bâtiments sont construits.</p>') + '</div>';
    }
    var p = production();
    var prod = GV.RES.filter(function (r) { return p[r.id] > 0; }).map(function (r) { return fmt(p[r.id]) + ' ' + r.name; }).join(' · ');
    var count = Object.keys(state.base.tiles).length, all = GV.buildingsFor(state.race).length;
    return '<div class="panel"><h3>Ta base</h3><p class="note">Touche une case pour construire, améliorer, déplacer ou défricher.</p><p class="note">' + count + ' bâtiments sur ' + all + ' · Terrain ' + state.base.size + ' × ' + state.base.size + ' · Bâtisseurs libres : ' + buildersFree() + ' sur ' + buildersMax() + '</p>' + jobsLine() + '<p class="note">Par heure : ' + prod + '</p><p class="note">Stock maximal : ' + fmt(storage()) + ' · La production s’arrête après 12 heures d’absence.</p></div>' + viewTaxes();
  }
  function jobsLine() {
    return state.jobs.map(function (j) { return '<p class="note">Chantier ' + esc(buildingName(buildingById(j.id))) + ' : ' + countdown(j.until) + '</p>'; }).join('');
  }
  function viewResearch() {
    var bl = lvl('bib'), job = state.research.job;
    var head = bl ? 'Bibliothèque niveau ' + bl + '. Une seule recherche à la fois.' : 'Construis la Bibliothèque pour lancer des recherches.';
    var cur = '';
    if (job) {
      var jt = GV.TECHS.filter(function (t) { return t.id === job.id; })[0], c = speedCost(job.until);
      cur = '<div class="panel"><strong>' + esc(jt.name) + '</strong><p>Terminée dans ' + countdown(job.until) + '</p><button class="btn" data-act="speed-tech"' + (state.res.eclats < c ? ' disabled' : '') + '>Terminer maintenant : ' + c + ' Éclats</button></div>';
    }
    var rows = GV.TECHS.map(function (t) {
      var done = state.research.done[t.id], locked = t.req > bl, line = done ? 'Terminée' : (locked ? 'Bibliothèque niveau ' + t.req + ' requise' : costHtml(t.cost) + ' · ' + t.min + ' min');
      return '<div class="unit' + (locked && !done ? ' locked' : '') + '" style="grid-template-columns:minmax(0,1fr) auto"><div><strong>' + esc(t.name) + '</strong><span class="note">' + esc(t.desc) + '</span><div class="cost">' + line + '</div></div>' + (done ? '<span></span>' : '<button class="btn" data-act="tech" data-v="' + t.id + '" aria-label="Rechercher ' + esc(t.name) + '"' + (locked || job || !canPay(t.cost) ? ' disabled' : '') + '>+</button>') + '</div>';
    }).join('');
    return '<div class="panel"><h3>Recherche</h3><p class="note">' + head + '</p>' + cur + '<div class="units">' + rows + '</div></div>';
  }
  function raidPanel() {
    if (Date.now() < state.raidAt) return '';
    return '<div class="panel raid"><h3>Ta base est attaquée !</h3><p class="note">Une armée marche sur ta citadelle. Tes tours et tes murailles combattent avec toi.</p><button class="btn war" data-act="raid">Défendre la base</button></div>';
  }
  function viewTaxes() {
    var btns = TAX_RATES.map(function (t, i) {
      return '<button class="' + (state.taxRate === i ? 'btn' : 'btn alt') + '" data-act="tax-rate" data-v="' + i + '" aria-pressed="' + (state.taxRate === i) + '">' + t.name + '</button>';
    }).join('');
    return '<div class="panel"><h3>Habitants et impôts</h3><p>' + population() + ' habitants paient <strong>' + taxAmount() + ' Or</strong> toutes les 10 minutes.</p><p>Prochain impôt dans ' + countdown(nextTaxAt()) + '</p><div class="tax-row">' + btns + '</div><p class="note">' + TAX_RATES[state.taxRate].text + '. Construis et améliore pour attirer plus d’habitants.</p></div>';
  }
  function viewBase() {
    ensureBase();
    var tabBtn = function (id, label) { return '<button class="btn ' + (draft.panel === id ? '' : 'alt') + '" data-act="base-panel" data-v="' + id + '">' + label + '</button>'; };
    return '<div class="base-top"><div id="base-stage" class="base-stage"></div>' + tileButtons() + '<div class="base-actions">' + tabBtn('market', 'Marché') + tabBtn('research', 'Recherche') + tabBtn('extend', 'Étendre') + '</div></div>' + raidPanel() + basePanel();
  }

  // --- Marché : les prix changent chaque jour ---
  var MARKET = [{ id: 'ble', price: 1, lots: [100, 500] }, { id: 'bois', price: 1.2, lots: [100, 500] }, { id: 'pierre', price: 1.5, lots: [100, 500] }, { id: 'fer', price: 3, lots: [50, 200] }, { id: 'lumiere', price: 18, lots: [5, 20] }];
  function marketPrices(item) {
    var rand = GVB.rng32(GVB.hashStr(dayKey() + item.id));
    var base = item.price * (0.8 + rand() * 0.4);
    return { buy: base * Math.max(0.6, 1 - 0.02 * lvl('mar')), sell: base * Math.min(0.75, 0.45 + 0.015 * lvl('mar')), trend: base / item.price };
  }
  function price2(n) { return n.toFixed(n < 10 ? 2 : 1).replace('.', ','); }
  function viewMarket() {
    var rows = MARKET.map(function (it) {
      var p = marketPrices(it), name = resName(it.id), stock = Math.floor(state.res[it.id] || 0), full = stock >= storage();
      var trend = p.trend > 1.08 ? 'Cher aujourd’hui' : (p.trend < 0.92 ? 'Bonne affaire' : 'Prix normal');
      var buys = it.lots.map(function (n) {
        var cost = Math.ceil(n * p.buy);
        return '<button class="btn" data-act="mkt-buy" data-v="' + it.id + ':' + n + '"' + (full || state.res.or < cost ? ' disabled' : '') + ' aria-label="Acheter ' + n + ' ' + name + ' pour ' + cost + ' Or">' + n + '<small>' + cost + ' Or</small></button>';
      }).join('');
      var sells = it.lots.map(function (n) {
        var gain = Math.floor(n * p.sell);
        return '<button class="btn alt" data-act="mkt-sell" data-v="' + it.id + ':' + n + '"' + (stock < n ? ' disabled' : '') + ' aria-label="Vendre ' + n + ' ' + name + ' pour ' + gain + ' Or">' + n + '<small>+' + gain + ' Or</small></button>';
      }).join('');
      var allGain = Math.floor(stock * p.sell);
      sells += '<button class="btn alt" data-act="mkt-sell" data-v="' + it.id + ':all"' + (stock < 1 ? ' disabled' : '') + ' aria-label="Vendre tout le stock de ' + name + ' pour ' + allGain + ' Or">Tout<small>+' + fmt(allGain) + ' Or</small></button>';
      return '<div class="market-row"><div class="market-head"><strong>' + name + '</strong><span class="note">' + fmt(stock) + ' en stock · ' + trend + '</span></div><div class="market-line"><span>Acheter</span><div class="market-btns two">' + buys + '</div></div><div class="market-line"><span>Vendre</span><div class="market-btns">' + sells + '</div></div></div>';
    }).join('');
    var ml = lvl('mar');
    return '<div class="panel"><h3>Marché</h3><p class="note">Tu as ' + fmt(state.res.or) + ' Or. Vends tes surplus pour gagner de l’or, ou achète ce qui te manque. Les prix changent chaque jour. ' + (ml ? 'Ton Marché niveau ' + ml + ' te donne de meilleurs prix.' : 'Construis le bâtiment Marché pour obtenir de meilleurs prix.') + '</p>' + rows + '</div>';
  }

  function viewArmee() {
    var cap = armyCap(), placed = placedCount();
    var slots = state.slots.map(function (u, i) {
      if (u === null) return '<button class="slot" data-act="slot" data-v="' + i + '" aria-label="Case vide ' + (i + 1) + '">' + (draft.sel !== undefined ? 'Placer' : '') + '</button>';
      return '<button class="slot" data-act="slot" data-v="' + i + '" aria-label="Retirer ' + esc(GV.unitInfo(state.race, u).name) + '">' + mySprite(u) + '</button>';
    }).join('');
    var reserve = Object.keys(state.reserve).filter(function (u) { return state.reserve[u] > 0; }).map(function (u) {
      var id = +u, on = draft.sel === id;
      return '<button class="btn ' + (on ? '' : 'alt') + '" data-act="sel" data-v="' + id + '">' + esc(GV.unitInfo(state.race, id).name) + ' ×' + state.reserve[u] + '</button>';
    }).join('');
    var ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    state.hybrids.forEach(function (o) { ids.push(100 + o); });
    var list = ids.map(function (id) {
      var info = GV.unitInfo(state.race, id);
      var locked = info.tier > lvl('cas');
      var c = unitCost(id);
      var desc = locked ? 'Caserne niveau ' + info.tier + ' requise' : costHtml(c);
      var tag = info.hybrid ? 'Hybride' : info.role.label;
      return '<div class="unit' + (locked ? ' locked' : '') + '">' + mySprite(id) + '<div><strong>' + esc(info.name) + '</strong><span class="note">' + tag + ' · Niv. ' + unitLevel(id) + ' · ' + Math.round(info.hp * levelMult(unitLevel(id))) + ' PV · ' + Math.round(info.atk * levelMult(unitLevel(id))) + ' ATQ</span><div class="cost">' + desc + '</div>' + equipButton(id) + (locked ? '' : upgradeButton(id)) + '</div><button class="btn" data-act="recruit" data-v="' + id + '" aria-label="Recruter ' + esc(info.name) + '"' + (locked || !canPay(c) ? ' disabled' : '') + '>+</button></div>';
    }).join('');
    return viewBarracks() + '<div class="panel"><h2>Formation</h2><p class="note">' + placed + ' unités placées sur ' + cap + '. La colonne de gauche est en première ligne. Touche une unité pour la retirer.</p><div class="formation">' + slots + '</div>' + (reserve ? '<h3>En réserve</h3><div class="row">' + reserve + '</div><button class="btn alt" data-act="autofill">Remplir la formation</button>' : '') + '</div>' + viewPower() + viewSkins() + '<h2>Recruter</h2><div class="units">' + list + '</div>' + viewForge();
  }

  function viewPower() {
    var p = GV.POWERS[state.race];
    var btns = GV.POWER_TIMES.map(function (t, i) {
      return '<button class="' + (state.powerTime === i ? 'btn' : 'btn alt') + '" data-act="power-time" data-v="' + i + '">' + t + '</button>';
    }).join('');
    return '<div class="panel"><h3>Pouvoir : ' + esc(p.name) + '</h3><p class="note">' + esc(p.desc) + '. Il se déclenche une fois par combat, au moment que tu choisis.</p><div class="row">' + btns + '</div></div>';
  }
  function viewSkins() {
    var cards = GV.SKINS.map(function (s, i) {
      var owned = state.skins[i], on = state.skin === i;
      var label = on ? 'Porté' : (owned ? 'Porter' : s.cost + ' Éclats');
      return '<div class="bes">' + unitSvg(state.race, 1, s.name, null, i) + esc(s.name) + '<button class="chip" data-act="skin" data-v="' + i + '"' + (!owned && state.res.eclats < s.cost ? ' disabled' : '') + '>' + label + '</button></div>';
    }).join('');
    return '<div class="panel"><h3>Skins de ton armée</h3><div class="bes-row">' + cards + '</div>' + (state.skin >= 0 ? '<button class="btn alt" data-act="skin" data-v="-1">Revenir au verre d’origine</button>' : '') + '</div>';
  }

  // Quêtes du jour
  function questsToday() {
    var day = dayKey();
    if (state.quests.day !== day) state.quests = { day: day, prog: {}, done: {} };
    var pool = GV.QUESTS.map(function (q, i) { return i; });
    var rand = GVB.rng32(GVB.hashStr(state.id + day));
    var out = [];
    while (out.length < 3) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return out;
  }
  function track(key, n) {
    questsToday();
    state.quests.prog[key] = (state.quests.prog[key] || 0) + (n || 1);
    state.stats[key] = (state.stats[key] || 0) + (n || 1);
    checkTrophies();
  }
  function rewardText(r) {
    return Object.keys(r).map(function (k) { return '+' + r[k] + ' ' + GV.RES.filter(function (x) { return x.id === k; })[0].name; }).join(' · ');
  }
  function viewQuests() {
    var rows = questsToday().map(function (i) {
      var q = GV.QUESTS[i], got = Math.min(q.goal, state.quests.prog[q.key] || 0), done = state.quests.done[i];
      var action = done ? '<span class="note">Fait</span>' : '<button class="btn" data-act="quest" data-v="' + i + '"' + (got < q.goal ? ' disabled' : '') + '>Prendre</button>';
      return '<div class="unit" style="grid-template-columns:minmax(0,1fr) auto"><div><strong>' + esc(q.text) + '</strong><span class="note">' + got + ' sur ' + q.goal + ' · ' + rewardText(q.reward) + '</span></div>' + action + '</div>';
    }).join('');
    return '<div class="panel"><h3>Quêtes du jour</h3><div class="units">' + rows + '</div></div>';
  }

  // Saisons de 28 jours
  function checkSeason() {
    if (Date.now() - state.seasonStart < 28 * DAY) return;
    var prize = 10 + state.crowns;
    state.history.push({ season: state.season, crowns: state.crowns, wins: state.wins });
    state.res.eclats += prize;
    state.seasonNote = 'Saison ' + state.season + ' terminée avec ' + state.crowns + ' couronnes : +' + prize + ' Éclats.';
    state.season++;
    state.crowns = 0;
    state.seasonStart = Date.now();
    save();
  }
  function viewSeasonNote() {
    if (!state.seasonNote) return '';
    return '<div class="panel"><h3>Nouvelle saison</h3><p>' + esc(state.seasonNote) + '</p><button class="btn alt" data-act="season-ok">Continuer</button></div>';
  }

  // Messagers : un envoi voyage de téléphone en téléphone jusqu'à son destinataire
  var LIFE = 7, MAX_BOX = 12;
  function todayNum() { return Math.floor(Date.now() / DAY); }
  function parcelsToCarry() {
    var now = todayNum();
    var pool = state.outbox.concat(state.carry).filter(function (p) { return now - p.d < LIFE; });
    // Le QR doit rester lisible : au plus 3 envois et 320 caractères, les autres partiront au prochain code
    var picked = [], size = 0;
    for (var i = 0; i < pool.length && picked.length < 3; i++) {
      var p = pool[(state.rot + i) % pool.length], len = JSON.stringify(p).length;
      if (size + len > 320) continue;
      picked.push(p);
      size += len;
    }
    return picked;
  }
  function sendParcel(to, kind, value) {
    state.seq++;
    state.outbox.push({ i: state.id + '-' + state.seq, f: state.id, n: state.name, t: to, k: kind, v: value, d: todayNum() });
    state.outbox = state.outbox.slice(-MAX_BOX);
    track('send');
  }
  function addInbox(entry) {
    entry.at = Date.now();
    state.inbox.unshift(entry);
    state.inbox = state.inbox.slice(0, 30);
  }
  function resName(id) {
    var r = GV.RES.filter(function (x) { return x.id === id; })[0];
    return r ? r.name : 'Or';
  }
  function validRes(id) { return GV.RES.some(function (x) { return x.id === id; }) ? id : 'or'; }
  function amount(n) { return Math.max(0, Math.min(5000, n | 0)); }
  function deliver(p) {
    var v = p.v || {};
    var from = String(p.n || 'Inconnu').slice(0, 16);
    var link = state.links[p.f];
    if (p.k === 'm') addInbox({ text: from + ' t’écrit : « ' + GV.PHRASES[(v.m | 0) % GV.PHRASES.length] + ' »' });
    else if (p.k === 'g') {
      var r = validRes(v.r), q = amount(v.n);
      state.res[r] = (state.res[r] || 0) + q;
      addInbox({ text: from + (v.note === 'ref' ? ' a refusé ton échange : ' : ' t’envoie ') + q + ' ' + resName(r) + '.' });
    } else if (p.k === 'x') {
      addInbox({ text: from + ' propose ' + amount(v.n) + ' ' + resName(v.r) + ' contre ' + amount(v.wn) + ' ' + resName(v.wr) + '.', trade: { to: p.f, r: validRes(v.r), n: amount(v.n), wr: validRes(v.wr), wn: amount(v.wn) } });
    } else if (p.k === 'r') {
      resolveRaid(p, from);
    } else if (p.k === 'R') {
      if (v.w) { state.res.or += amount(v.n); state.crowns += 1; addInbox({ text: 'Ton raid contre ' + from + ' a réussi : +' + amount(v.n) + ' Or, +1 couronne.' }); }
      else addInbox({ text: 'Ton raid contre ' + from + ' a échoué.' });
    } else if (p.k === 'a') {
      addInbox({ text: from + ' te propose une alliance.', ally: p.f });
    } else if (p.k === 'A') {
      if (link) link.ally = true;
      addInbox({ text: from + ' a accepté ton alliance.' });
    } else if (p.k === 'b') {
      if (link) link.ally = false;
      addInbox({ text: from + ' a rompu votre alliance.' });
    }
  }
  function resolveRaid(p, from) {
    var foe = decodeSide(p.v || {}, (p.v && p.v.r) | 0);
    var mine = sideOf();
    if (!foe.squad.length) return;
    var map = GVB.hashStr(p.i) % GVM.MAPS.length;
    var won = !mine.squad.length || GVB.simulate(foe, mine, p.i, map).winner === 0;
    var loot = won ? Math.floor(Math.min(300, state.res.or * 0.1)) : 0;
    state.res.or -= loot;
    sendParcel(p.f, 'R', { w: won ? 1 : 0, n: loot });
    addInbox({ text: from + ' t’a attaqué par messager : ' + (won ? 'tes défenses tombent, ' + loot + ' Or perdus.' : 'tes défenses tiennent bon.'), replay: mine.squad.length ? { foe: foe, mine: mine, seed: p.i, map: map, name: from } : null });
  }
  function receiveParcels(list, courier) {
    list.forEach(function (p) {
      if (state.seen[p.i]) return;
      state.seen[p.i] = todayNum();
      if (p.t === state.id) {
        deliver(p);
        state.acks.unshift(p.i);
        state.acks = state.acks.slice(0, 4);
      } else if (p.f !== state.id && todayNum() - p.d < LIFE) {
        state.carry.push(p);
        state.carry = state.carry.slice(-MAX_BOX);
        state.res.lumiere += 2;
      }
    });
    state.rot++;
    // Oublie les vieux envois pour ne pas gonfler la sauvegarde
    var now = todayNum();
    Object.keys(state.seen).forEach(function (k) { if (now - state.seen[k] > 30) delete state.seen[k]; });
  }
  function viewMail() {
    var items = state.inbox.slice(0, 8).map(function (m, i) {
      var acts = '';
      if (m.trade) acts = '<div class="row"><button class="btn" data-act="trade-yes" data-v="' + i + '">Accepter</button><button class="btn alt" data-act="trade-no" data-v="' + i + '">Refuser</button></div>';
      else if (m.ally) acts = '<div class="row"><button class="btn" data-act="ally-yes" data-v="' + i + '">Accepter</button><button class="btn alt" data-act="mail-del" data-v="' + i + '">Refuser</button></div>';
      else if (m.replay) acts = '<div class="row"><button class="btn alt" data-act="replay" data-v="' + i + '">Revoir la bataille</button></div>';
      return '<div class="unit" style="display:block"><p>' + esc(m.text) + '</p>' + acts + '</div>';
    }).join('');
    var keys = Object.keys(state.links);
    var form = '<p class="note">Relie d’abord ton éclat à un ami pour lui faire porter des envois.</p>';
    if (keys.length) {
      var who = keys.map(function (k) { return '<option value="' + esc(k) + '">' + esc(state.links[k].name) + '</option>'; }).join('');
      var res = GV.RES.filter(function (r) { return r.id !== 'eclats'; }).map(function (r) { return '<option value="' + r.id + '">' + r.name + '</option>'; }).join('');
      var phrases = GV.PHRASES.map(function (t, i) { return '<option value="' + i + '">' + esc(t) + '</option>'; }).join('');
      form = '<label class="field" for="m-to">Destinataire<select id="m-to">' + who + '</select></label>' +
        '<label class="field" for="m-kind">Envoi<select id="m-kind"><option value="m">Message</option><option value="g">Cadeau</option><option value="x">Proposition d’échange</option><option value="r">Raid (20 Lumière)</option><option value="a">Alliance</option></select></label>' +
        '<label class="field" for="m-text">Message<select id="m-text">' + phrases + '</select></label>' +
        '<div class="row2"><label class="field" for="m-res">Je donne<select id="m-res">' + res + '</select></label><label class="field" for="m-n">Quantité<input type="number" id="m-n" min="1" max="5000" value="100"></label></div>' +
        '<div class="row2"><label class="field" for="m-wres">Je demande<select id="m-wres">' + res + '</select></label><label class="field" for="m-wn">Quantité<input type="number" id="m-wn" min="1" max="5000" value="100"></label></div>' +
        '<button class="btn" data-act="send">Confier au messager</button>' +
        '<p class="note">Un envoi part avec tes prochains codes. Tout joueur qui le lit le transporte vers le destinataire, pendant 7 jours. ' + state.outbox.length + ' envois en route, ' + state.carry.length + ' transportés pour d’autres.</p>';
    }
    return '<div class="panel"><h2>Courrier</h2>' + (items ? '<div class="units">' + items + '</div>' : '<p class="note">Aucun message pour l’instant.</p>') + '</div><div class="panel"><h3>Envoyer par messager</h3>' + form + '</div>';
  }

  // --- Héros ---
  var HERO_MAX = 30;
  var HERO_WEAPON = ['wdx', 'wha', 'wst'];
  function heroXpNeed(l) { return Math.round(60 * Math.pow(l, 1.5)); }
  function heroName(a) { return GV.HERO_NAMES[state.race][a]; }
  function itemById(id) { return state.items.filter(function (i) { return i.id === id; })[0] || null; }
  function heroGear(a) {
    var g = state.gear[a] || {};
    return ['w', 'a', 'r'].map(function (s) { return g[s] ? itemById(g[s]) : null; }).filter(Boolean);
  }
  function heroStats(a) {
    var h = state.heroes[a], arch = GV.HERO_ARCH[a], s = h.skills;
    var atkP = 6 * (s.atk || 0), hpP = 8 * (s.hp || 0), aura = 2 * (s.aura || 0), spd = 5 * (s.spd || 0), ab = 1 + 0.12 * (s.ab || 0), cdM = 1 - 0.06 * (s.cd || 0);
    heroGear(a).forEach(function (it) {
      atkP += it.atk || 0; hpP += it.hp || 0; aura += it.aura || 0; spd += it.spd || 0; ab += (it.ab || 0) / 100;
    });
    return {
      hp: arch.hp * (1 + 0.08 * (h.lv - 1)) * (1 + hpP / 100), atk: arch.atk * (1 + 0.07 * (h.lv - 1)) * (1 + atkP / 100),
      aura: Math.min(10, aura), spd: Math.min(15, spd), ab: Math.min(2, ab), cd: Math.round(Math.max(4, 12 * cdM) * 10) / 10
    };
  }
  function heroSide() {
    var a = state.heroActive, st = heroStats(a), g = state.gear[a] || {}, wp = g.w ? itemById(g.w) : null;
    var forms = GV.WEAPONS.map(function (x) { return x[0]; });
    var w = forms.indexOf(wp ? wp.form : HERO_WEAPON[a]);
    return { a: a, hp: st.hp, atk: st.atk, aura: st.aura, cd: st.cd, ab: st.ab, spd: st.spd, w: w, lv: state.heroes[a].lv, name: heroName(a) };
  }
  function pointsLeft(a) {
    var h = state.heroes[a], used = 0;
    Object.keys(h.skills).forEach(function (k) { used += h.skills[k]; });
    return (h.lv - 1) - used;
  }
  function giveHeroXp(n) {
    var h = state.heroes[state.heroActive], ups = 0;
    h.xp += n;
    while (h.lv < HERO_MAX && h.xp >= heroXpNeed(h.lv)) { h.xp -= heroXpNeed(h.lv); h.lv++; ups++; }
    if (h.lv >= HERO_MAX) h.xp = 0;
    if (ups) { state.stats.herolv = Math.max(state.stats.herolv || 0, h.lv); }
    return ups;
  }
  function rollItem(level, minRar, slotWanted) {
    var total = 0, r = Math.random(), rar = 0, list = GV.RARITY;
    list.forEach(function (x, i) { if (i >= minRar) total += x.w; });
    var pick = r * total, acc = 0;
    for (var i = minRar; i < list.length; i++) { acc += list[i].w; if (pick <= acc) { rar = i; break; } }
    var slot = slotWanted || ['w', 'a', 'r'][Math.floor(Math.random() * 3)];
    var base = (2 + level * 0.35) * list[rar].m;
    var names = GV.ITEM_NAMES[slot], ni = Math.floor(Math.random() * names.length);
    var it = { id: ++state.itemSeq, slot: slot, rar: rar, name: names[ni] + ' ' + GV.ITEM_OF[Math.floor(Math.random() * GV.ITEM_OF.length)], level: level };
    if (slot === 'w') { it.atk = Math.round(base * 1.3); it.form = GV.ITEM_FORMS[ni]; }
    else if (slot === 'a') { it.hp = Math.round(base * 1.8); }
    else {
      it.aura = Math.min(4, Math.round(base * 0.25 * 10) / 10);
      it.ab = Math.round(base * 1.2);
      if (rar >= 2) it.spd = Math.min(6, Math.round(base * 0.3));
    }
    return it;
  }
  function itemText(it) {
    var p = [];
    if (it.atk) p.push('+' + it.atk + ' % ATQ');
    if (it.hp) p.push('+' + it.hp + ' % PV');
    if (it.aura) p.push('+' + it.aura + ' % armée');
    if (it.ab) p.push('+' + it.ab + ' % capacité');
    if (it.spd) p.push('+' + it.spd + ' % vitesse');
    return p.join(' · ');
  }
  function gainFame(n) {
    state.fame += n;
    var ups = [];
    while (state.fame >= fameNeed(state.fameLevel)) {
      state.fame -= fameNeed(state.fameLevel);
      state.fameLevel++;
      var L = state.fameLevel, rew = { or: 150 * L, lumiere: 5 + L, eclats: 2 + Math.floor(L / 3) };
      Object.keys(rew).forEach(function (r) { state.res[r] = (state.res[r] || 0) + rew[r]; });
      ups.push(L);
      if (L % 5 === 0) state.items.push(rollItem(L * 2, 2));
    }
    if (ups.length) toast('Renommée ' + state.fameLevel + ' : récompenses reçues');
  }
  function fameNeed(l) { return Math.round(80 * Math.pow(l, 1.45)); }
  // Après un combat : expérience, butin, renommée
  function battleSpoils(level, boss) {
    var xp = 30 + level * 8 + (boss ? 40 : 0), ups = giveHeroXp(xp);
    var txt = '<br>' + esc(heroName(state.heroActive)) + ' : +' + xp + ' XP' + (ups ? ' · Niveau ' + state.heroes[state.heroActive].lv + ' !' : '');
    gainFame(15 + level * 3 + (boss ? 30 : 0));
    if (boss || Math.random() < 0.4) {
      var it = rollItem(level, boss ? 1 : 0);
      if (state.items.length < 40) {
        state.items.push(it);
        track('loot');
        txt += '<br><span style="color:' + GV.RARITY[it.rar].color + '">Butin : ' + esc(it.name) + ' (' + GV.RARITY[it.rar].name + ')</span>';
      }
    }
    checkTrophies();
    return txt;
  }
  function trophyCount(a) { return state.stats[a.key] || 0; }
  function checkTrophies() {
    GV.ACHIEVEMENTS.forEach(function (a) {
      if (state.trophies[a.id] || trophyCount(a) < a.goal) return;
      state.trophies[a.id] = 1;
      state.res.eclats += a.eclats;
      gainFame(25);
      toast('Succès : ' + a.name + ' · +' + a.eclats + ' Éclats');
    });
  }
  function viewTrophies() {
    var done = GV.ACHIEVEMENTS.filter(function (a) { return state.trophies[a.id]; }).length;
    return '<h2>Succès : ' + done + ' sur ' + GV.ACHIEVEMENTS.length + '</h2><div class="units">' + GV.ACHIEVEMENTS.map(function (a) {
      var got = state.trophies[a.id], n = Math.min(a.goal, trophyCount(a));
      return '<div class="unit trophy' + (got ? ' got' : '') + '" style="grid-template-columns:40px minmax(0,1fr) auto"><i class="gem big" style="background:' + (got ? '#ffd75a' : '#3f3756') + '"></i><div><strong>' + esc(a.name) + '</strong><span class="note">' + n + ' sur ' + a.goal + '</span></div><span class="note">+' + a.eclats + ' Éclats</span></div>';
    }).join('') + '</div>';
  }
  function viewHeros() {
    var a = state.heroActive, h = state.heroes[a], arch = GV.HERO_ARCH[a], st = heroStats(a), side = heroSide();
    var cards = GV.HERO_ARCH.map(function (ar, i) {
      var own = state.heroes[i], on = i === a;
      var cost = 60;
      var btn = own ? (on ? '<span class="note">En campagne</span>' : '<button class="chip" data-act="hero-pick" data-v="' + i + '">Choisir</button>') : '<button class="chip" data-act="hero-buy" data-v="' + i + '"' + (state.res.eclats < cost ? ' disabled' : '') + '>Engager : ' + cost + ' Éclats</button>';
      return '<div class="bes' + (on ? ' on' : '') + '">' + unitSvg(state.race, 10, heroName(i), HERO_WEAPON[i], state.skin) + '<span>' + esc(heroName(i)) + '</span><small class="note">' + ar.name + (own ? ' · Niv. ' + own.lv : '') + '</small>' + btn + '</div>';
    }).join('');
    var need = h.lv >= HERO_MAX ? 1 : heroXpNeed(h.lv), pct = h.lv >= HERO_MAX ? 100 : Math.round(h.xp / need * 100), pts = pointsLeft(a);
    var weaponId = side.w >= 0 ? GV.WEAPONS[side.w][0] : null;
    var head = '<div class="panel hero-card"><div class="hero-art">' + unitSvg(state.race, 10, heroName(a), weaponId, state.skin) + '</div><div><h2>' + esc(heroName(a)) + '</h2><p class="note">' + arch.name + ' · Niveau ' + h.lv + ' sur ' + HERO_MAX + '</p><div class="xp"><i style="width:' + pct + '%"></i></div><p class="note">' + (h.lv >= HERO_MAX ? 'Niveau maximal' : h.xp + ' / ' + need + ' XP') + '</p><div class="stat-grid"><span>' + Math.round(st.hp) + ' PV</span><span>' + Math.round(st.atk) + ' ATQ</span><span>Armée +' + st.aura + ' %</span><span>Capacité ' + st.cd + ' s</span></div><p class="note"><strong>' + esc(arch.ability) + '</strong> : ' + esc(arch.desc) + '</p></div></div>';
    var skills = GV.HERO_SKILLS.map(function (sk) {
      var rank = h.skills[sk.id] || 0, locked = h.lv < sk.lv, maxed = rank >= sk.max;
      var pips = ''; for (var i = 0; i < sk.max; i++) pips += '<i class="pip' + (i < rank ? ' on' : '') + '"></i>';
      return '<div class="unit' + (locked ? ' locked' : '') + '" style="grid-template-columns:minmax(0,1fr) auto"><div><strong>' + esc(sk.name) + '</strong><span class="note">' + esc(sk.desc) + (locked ? ' · Niveau ' + sk.lv + ' requis' : '') + '</span><div class="pips">' + pips + '</div></div><button class="btn" data-act="skill" data-v="' + sk.id + '" aria-label="Améliorer ' + esc(sk.name) + '"' + (locked || maxed || pts < 1 ? ' disabled' : '') + '>+</button></div>';
    }).join('');
    var g = state.gear[a] || (state.gear[a] = {});
    var slots = [['w', 'Arme'], ['a', 'Armure'], ['r', 'Relique']].map(function (sl) {
      var it = g[sl[0]] ? itemById(g[sl[0]]) : null;
      if (!it) return '<div class="gear empty"><strong>' + sl[1] + '</strong><span class="note">Vide</span></div>';
      return '<div class="gear" style="border-color:' + GV.RARITY[it.rar].color + '"><strong style="color:' + GV.RARITY[it.rar].color + '">' + esc(it.name) + '</strong><span class="note">' + itemText(it) + '</span><button class="chip" data-act="unequip" data-v="' + sl[0] + '">Retirer</button></div>';
    }).join('');
    var worn = {};
    Object.keys(state.gear).forEach(function (k) { ['w', 'a', 'r'].forEach(function (s) { if (state.gear[k][s]) worn[state.gear[k][s]] = 1; }); });
    var bag = state.items.filter(function (i) { return !worn[i.id]; }).sort(function (x, y) { return y.rar - x.rar; }).map(function (it) {
      return '<div class="unit" style="grid-template-columns:minmax(0,1fr) auto;border-color:' + GV.RARITY[it.rar].color + '"><div><strong style="color:' + GV.RARITY[it.rar].color + '">' + esc(it.name) + '</strong><span class="note">' + GV.RARITY[it.rar].name + ' · ' + itemText(it) + '</span></div><div class="row" style="flex-wrap:nowrap"><button class="chip" data-act="wear" data-v="' + it.id + '">Équiper</button><button class="chip" data-act="scrap" data-v="' + it.id + '" aria-label="Recycler ' + esc(it.name) + '">+' + (it.rar + 1) + ' Éclats</button></div></div>';
    }).join('');
    return head + '<div class="panel"><h3>Compagnons</h3><div class="hero-row">' + cards + '</div></div><div class="panel"><h3>Compétences : ' + pts + ' point' + (pts > 1 ? 's' : '') + ' à dépenser</h3><div class="units">' + skills + '</div></div><div class="panel"><h3>Équipement</h3><div class="gear-row">' + slots + '</div><h3>Inventaire (' + state.items.length + ' sur 40)</h3>' + (bag ? '<div class="units">' + bag + '</div>' : '<p class="note">Gagne des combats pour trouver du butin.</p>') + '</div>';
  }

  function rankClass(uid) { return uid >= 100 ? 'm' : GV.RANK_CLASS[uid]; }
  function ownedFor(uid) {
    var cl = rankClass(uid);
    return GV.WEAPONS.map(function (w, i) { return i; }).filter(function (i) { return state.arsenal[i] && GV.WEAPON_STATS[i].c === cl; });
  }
  function upgradeButton(uid) {
    var l = unitLevel(uid);
    if (l >= UNIT_MAX) return '<p class="cost">Niveau maximal</p>';
    if (l >= upgradeCap()) return '<p class="cost">Caserne niveau ' + l + ' requise pour le niveau ' + (l + 1) + '</p>';
    var c = upgradeCost(uid);
    return '<button class="chip" data-act="upgrade" data-v="' + uid + '"' + (canPay(c) ? '' : ' disabled') + '>Améliorer au niveau ' + (l + 1) + ' : +12 % PV et ATQ</button><p class="cost">' + costHtml(c) + '</p>';
  }
  function viewBarracks() {
    var opts = GV.ROLES.slice(0, 10).map(function (r, i) {
      if (r.tier > lvl('cas')) return '';
      return '<option value="' + i + '"' + (state.auto.uid === i ? ' selected' : '') + '>' + esc(GV.RACES[state.race].u[i]) + ' (' + Math.round(autoPeriod(i) / 60000) + ' min)</option>';
    }).join('');
    var full = armyTotal() >= autoLimit();
    return '<div class="panel"><h2>Caserne</h2><p class="note">Elle forme une recrue gratuite à intervalle régulier, même sans or.</p><label class="field" for="auto-unit">Recrue à former<select id="auto-unit">' + opts + '</select></label><p>' + (full ? 'Caserne pleine : ' + autoLimit() + ' unités au maximum.' : 'Prochaine recrue dans ' + countdown(nextUnitAt())) + '</p><p class="note">Armée : ' + armyTotal() + ' unités sur ' + autoLimit() + ' pour les recrues gratuites.</p></div>';
  }
  function equipButton(uid) {
    if (!ownedFor(uid).length) return '';
    var w = equipped(uid);
    return '<button class="chip" data-act="equip" data-v="' + uid + '">Arme : ' + (w >= 0 ? esc(GV.WEAPONS[w][1]) : 'de base') + '</button>';
  }
  function weaponKnown(i) {
    var r = GV.WEAPON_STATS[i].race;
    if (r === undefined || r === state.race) return true;
    return Object.keys(state.links).some(function (k) { return state.links[k].race === r; });
  }
  function viewForge() {
    var fl = lvl('for');
    var known = GV.WEAPONS.filter(function (w, i) { return weaponKnown(i); }).length;
    var head = '<h2>Forge</h2><p class="note">' + known + ' armes sur ' + GV.WEAPONS.length + ' connues. Rencontre d\u2019autres peuples pour découvrir les leurs.</p><p class="note">' + (fl ? 'Forge niveau ' + fl + '. Une arme forgée s\u2019équipe sur tout un rang, depuis la liste ci-dessus.' : 'Construis la Forge dans ta base pour fabriquer des armes.') + '</p>';
    var groups = [['m', 'Mêlée'], ['t', 'Tir'], ['s', 'Magie']].map(function (gr) {
      var rows = GV.WEAPONS.map(function (w, i) { return i; }).filter(function (i) { return GV.WEAPON_STATS[i].c === gr[0] && weaponKnown(i); }).sort(function (x, y) { return GV.WEAPON_STATS[x].tier - GV.WEAPON_STATS[y].tier; }).map(function (i) {
        var st = GV.WEAPON_STATS[i], owned = !!state.arsenal[i], c = GV.weaponCost(i), locked = st.tier > fl;
        var line = owned ? 'Forgée' : (locked ? 'Forge niveau ' + st.tier + ' requise' : costHtml(c));
        return '<div class="unit' + (locked && !owned ? ' locked' : '') + '"><svg class="' + GV.RACES[state.race].cls + '" viewBox="0 0 80 80" aria-hidden="true"><use href="#' + GV.WEAPONS[i][0] + '" width="80" height="80"></use></svg><div><strong>' + esc(GV.WEAPONS[i][1]) + '</strong><span class="note">' + GV.weaponText(i) + '</span><div class="cost">' + line + '</div></div>' + (owned ? '<span></span>' : '<button class="btn" data-act="forge" data-v="' + i + '" aria-label="Forger ' + esc(GV.WEAPONS[i][1]) + '"' + (locked || !canPay(c) ? ' disabled' : '') + '>+</button>') + '</div>';
      }).join('');
      return '<h3>' + gr[1] + '</h3><div class="units">' + rows + '</div>';
    }).join('');
    return head + groups;
  }

  function viewRencontre() {
    if (encounter) return viewEncounter();
    var code = makeCode();
    shownCode = code;
    var canScan = !!(window.jsQR && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    return viewMail() + '<div class="panel"><h2>1. Montre ton code</h2><p class="note">Ton ami scanne ce QR code avec son jeu. S’il est loin, envoie-lui ton code par message.</p>' + codeBlock(code) + '</div>' +
      '<div class="panel"><h2>2. Lis le code de ton ami</h2>' + (canScan ? '<button class="btn" data-act="scan">Scanner avec la caméra</button><video id="cam" playsinline muted hidden></video>' : '') + '<label class="field" for="paste">Coller un code<textarea id="paste" placeholder="' + CODE_PREFIX + '..."></textarea></label><button class="btn alt" data-act="use-code">Valider ce code</button></div>' +
      '<p class="note">Chaque joueur doit lire le code de l’autre. Ne change pas ton armée entre les deux, sinon vos batailles seraient différentes.</p>';
  }
  function iosInstallHint() {
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!ios || window.navigator.standalone || window.GVNative) return '';
    return '<div class="panel"><p><strong>Installe d’abord le jeu.</strong></p><p class="note">Dans Safari, touche Partager, puis « Sur l’écran d’accueil », et ouvre le jeu depuis sa nouvelle icône. Ton royaume y sera gardé, et le jeu marchera sans réseau.</p></div>';
  }
  function codeBlock(code) {
    var qr = '';
    try { qr = GVQR.toSvg(code); } catch (e) { qr = '<p class="note">Formation trop grande pour un QR. Envoie le code en texte.</p>'; }
    return qr + '<div class="row"><button class="btn alt" data-act="share">Envoyer mon code</button><button class="btn alt" data-act="copy">Copier mon code</button></div>';
  }
  // Empreinte du couple de codes : deux téléphones qui affichent le même sceau joueront la même bataille
  function battleSeal() {
    var n = GVB.hashStr(encounterSeed() + 'sceau') >>> 0, abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ', out = '';
    for (var i = 0; i < 4; i++) { out += abc[n % abc.length]; n = Math.floor(n / abc.length); }
    return out;
  }

  function encounterSeed() { return [encounter.mine, encounter.other.raw].sort().join('|'); }
  function encounterMap() { return GVB.hashStr(encounterSeed() + 'map') % GVM.MAPS.length; }
  function viewEncounter() {
    var o = encounter.other, r = GV.RACES[o.race];
    var today = dayKey();
    var link = state.links[o.id] || {};
    var ranked = link.battleDay !== today && !link.ally;
    var canHybrid = o.race !== state.race && state.hybrids.indexOf(o.race) < 0;
    var hy = canHybrid ? GV.unitInfo(state.race, 100 + o.race) : null;
    return '<div class="panel"><h2>Éclats reliés</h2><div class="row"><svg class="' + r.cls + '" width="90" height="90" viewBox="-14 0 148 140" aria-hidden="true">' + GV.unitMarkup(o.race, 10) + '</svg><div><strong>' + esc(o.name) + '</strong><p class="note">' + r.name + ' · Citadelle ' + o.level + ' · ' + o.crowns + ' couronnes · ' + o.side.squad.length + ' unités</p></div></div><p class="note">Votre lien produit de la lumière pendant 7 jours.</p></div>' +
      '<div class="panel"><h2>Sceau de bataille : <span class="seal">' + battleSeal() + '</span></h2><p class="note">Avant de lancer, comparez : vos deux téléphones doivent afficher le même sceau. Sinon, ton ami n’a pas encore lu ce code :</p><details open id="my-code"><summary>Mon code</summary>' + codeBlock(encounter.mine) + '</details></div>' +
      '<div class="panel"><h2>Bataille</h2><img class="banner" src="' + GVM.image(encounterMap(), 720, 300, false) + '" alt=""><p><strong>' + esc(GVM.MAPS[encounterMap()].name) + '</strong></p><p class="note">' + esc(GVM.MAPS[encounterMap()].rule) + '</p><p class="note">' + (ranked ? 'Bataille classée disponible aujourd’hui.' : (link.ally ? 'Vous êtes alliés : bataille amicale, sans récompense.' : 'Déjà jouée aujourd’hui : celle-ci sera amicale, sans récompense.')) + '</p><div class="row"><button class="btn war" data-act="fight">Sur ce téléphone</button><button class="btn war" data-act="fight2">Sur 2 écrans côte à côte</button></div><p class="note">Pour 2 écrans, lancez en même temps et posez les téléphones côte à côte : l’un affiche la moitié gauche, l’autre la droite.</p></div>' +
      (hy ? '<div class="panel"><h2>Hybride de verre</h2><div class="row"><svg class="' + GV.unitClass(state.race, hy.uid) + '" width="90" height="90" viewBox="-14 0 148 140" aria-hidden="true">' + GV.unitMarkup(state.race, hy.uid) + '</svg><div><strong>' + esc(hy.name) + '</strong><p class="note">' + GV.RACES[state.race].name + ' + ' + r.name + '. Ajoute cette unité à tes recrues.</p><p class="cost">30 Lumière</p></div></div><button class="btn" data-act="hybrid"' + (state.res.lumiere >= 30 ? '' : ' disabled') + '>Fusionner les verres</button></div>' : '') +
      (link.ally ? '<div class="panel"><h2>Alliance</h2><p class="note">Votre alliance donne +3 Lumière par heure tant que le lien est actif.</p><button class="btn alt" data-act="betray">Rompre l\u2019alliance</button></div>' : '') + '<button class="btn alt" data-act="end-enc">Terminer la rencontre</button>';
  }

  function shardPath(seed, cx, cy, rad) {
    var rand = GVB.rng32(GVB.hashStr(seed)), pts = [], n = 6;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + rand() * 0.4, rr = rad * (0.75 + rand() * 0.35);
      pts.push((cx + Math.cos(a) * rr).toFixed(0) + ' ' + (cy + Math.sin(a) * rr).toFixed(0));
    }
    return 'M' + pts.join('L') + 'Z';
  }

  function viewCarte() {
    var seg = '<div class="seg"><button class="' + (draft.monde !== 'best' && draft.monde !== 'tro' ? 'btn' : 'btn alt') + '" data-act="monde" data-v="map">Carte</button><button class="' + (draft.monde === 'tro' ? 'btn' : 'btn alt') + '" data-act="monde" data-v="tro">Succès</button><button class="' + (draft.monde === 'best' ? 'btn' : 'btn alt') + '" data-act="monde" data-v="best">Bestiaire</button></div>';
    if (draft.monde === 'best') return seg + viewBestiaire();
    if (draft.monde === 'tro') return seg + viewTrophies();
    return seg + viewCarteMap();
  }
  function viewCarteMap() {
    var keys = Object.keys(state.links), now = Date.now();
    var parts = '', W = 400, H = 400, cx = W / 2, cy = H / 2;
    keys.forEach(function (k, i) {
      var l = state.links[k];
      var a = i / Math.max(keys.length, 1) * Math.PI * 2 - Math.PI / 2;
      var ring = 118 + (i % 3) * 22;
      var x = cx + Math.cos(a) * ring, y = cy + Math.sin(a) * ring;
      var on = now - l.last < LINK_LIFE;
      parts += '<path d="M' + cx + ' ' + cy + 'L' + x.toFixed(0) + ' ' + y.toFixed(0) + '" stroke="' + (on ? '#ffd75a' : '#3f3756') + '" stroke-width="' + (on ? 5 : 2) + '" fill="none"' + (on ? '' : ' stroke-dasharray="6 6"') + '></path>';
      parts += '<g class="' + GV.RACES[l.race].cls + '"><path class="p ' + (on ? 'g' : 'd') + '" d="' + shardPath(k, x, y, 40) + '"></path></g>';
      parts += '<text x="' + x.toFixed(0) + '" y="' + (y + 5).toFixed(0) + '" text-anchor="middle" font-weight="700" font-size="14" fill="#ffffff" stroke="#120e0a" stroke-width="3" paint-order="stroke">' + esc(l.name) + '</text>';
    });
    parts += '<g class="' + GV.RACES[state.race].cls + '"><path class="p g" d="' + shardPath(state.id, cx, cy, 62) + '"></path></g><text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-weight="700" font-size="18" fill="#ffffff" stroke="#120e0a" stroke-width="3" paint-order="stroke">Toi</text>';
    var rows = keys.map(function (k) {
      var l = state.links[k], left = Math.ceil((LINK_LIFE - (now - l.last)) / DAY);
      return '<div class="unit" style="grid-template-columns:minmax(0,1fr) auto"><div><strong>' + esc(l.name) + '</strong><span class="note">' + GV.RACES[l.race].name + '</span></div><span class="note">' + (left > 0 ? left + ' j de lumière' : 'Lien éteint') + '</span></div>';
    }).join('');
    var empty = keys.length ? '' : '<p class="note">Ton éclat est encore seul. Va dans Rencontre avec un ami : son éclat apparaîtra ici.</p>';
    var seasonDay = Math.min(28, Math.floor((now - state.seasonStart) / DAY) + 1);
    return '<h2>Ta carte</h2><svg class="map" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Carte des éclats reliés au tien">' + parts + '</svg>' + empty + '<div class="units">' + rows + '</div>' + viewRanking() + '<div class="panel"><h3>Saison ' + state.season + '</h3><p class="note">Jour ' + seasonDay + ' sur 28 · ' + state.wins + ' victoires · ' + state.losses + ' défaites · ' + state.crowns + ' couronnes</p></div>' + viewTerrains();
  }

  function viewRanking() {
    var rows = Object.keys(state.links).map(function (k) { return state.links[k]; }).map(function (l) { return { name: l.name, crowns: l.crowns || 0, ally: l.ally }; });
    rows.push({ name: state.name + ' (toi)', crowns: state.crowns, me: true });
    rows.sort(function (a, b) { return b.crowns - a.crowns; });
    return '<div class="panel"><h3>Classement de ton cercle</h3><div class="units">' + rows.map(function (r, i) {
      return '<div class="unit" style="grid-template-columns:32px minmax(0,1fr) auto"><strong>' + (i + 1) + '</strong><span>' + esc(r.name) + (r.ally ? ' · allié' : '') + '</span><span class="note">' + r.crowns + ' couronnes</span></div>';
    }).join('') + '</div><p class="note">Les scores sont ceux de votre dernière rencontre.</p></div>';
  }
  function viewTerrains() {
    return '<h2>Terrains de bataille</h2><div class="maps">' + GVM.MAPS.map(function (m, i) {
      return '<div class="map-card"><img src="' + GVM.image(i, 720, 540, false) + '" alt="Terrain : ' + esc(m.name) + '"><div><strong>' + esc(m.name) + '</strong><p class="note">' + esc(m.rule) + '</p></div></div>';
    }).join('') + '</div>';
  }

  function viewBestiaire() {
    var races = GV.RACES.map(function (r, ri) {
      var us = r.u.map(function (n, i) { return '<div class="bes">' + unitSvg(ri, i, n) + esc(n) + '</div>'; }).join('');
      return '<div class="panel"><h3 style="color:' + r.color + '">' + r.name + '</h3><p class="note">' + r.trait + '</p><div class="bes-row">' + us + '</div></div>';
    }).join('');
    var ws = GV.WEAPONS.map(function (w, i) {
      var r = GV.WEAPON_STATS[i].race;
      return '<div class="bes"><svg class="r' + ((r === undefined ? i : r) % 8 + 1) + '" viewBox="0 0 80 80" aria-hidden="true"><use href="#' + w[0] + '" width="80" height="80"></use></svg>' + esc(w[1]) + '</div>';
    }).join('');
    var bs = GV.RACES.map(function (r, ri) {
      var list = GV.buildingsFor(ri).filter(function (b) { return b.unique; }).concat([{ name: r.citadelName, sym: r.citadel }]);
      return '<div class="panel"><h3 style="color:' + r.color + '">' + r.name + '</h3><div class="bes-row">' + list.map(function (b) {
        return '<div class="bes"><svg class="' + r.cls + '" viewBox="0 0 200 180" aria-hidden="true"><use href="#' + b.sym + '" width="200" height="180"></use>' + (b.orn ? '<use href="#' + b.orn + '" width="200" height="180"></use>' : '') + '</svg>' + esc(b.name) + '</div>';
      }).join('') + '</div></div>';
    }).join('');
    var commons = GV.BUILDINGS.filter(function (b) { return b.sym; }).map(function (b) {
      return '<div class="bes"><svg class="r1" viewBox="0 0 200 180" aria-hidden="true"><use href="#' + b.sym + '" width="200" height="180"></use></svg>' + esc(b.name) + '</div>';
    }).join('');
    var pw = GV.RACES.map(function (r, i) { return '<div class="unit" style="grid-template-columns:minmax(0,1fr)"><div><strong style="color:' + r.color + '">' + r.name + ' : ' + esc(GV.POWERS[i].name) + '</strong><span class="note">' + esc(GV.POWERS[i].desc) + '</span></div></div>'; }).join('');
    return '<h2>96 unités, 8 races</h2>' + races + '<h2>Pouvoirs</h2><div class="units">' + pw + '</div><h2>' + GV.WEAPONS.length + ' armes</h2><div class="panel"><div class="bes-row">' + ws + '</div></div><h2>112 bâtiments</h2><div class="panel"><h3>Communs</h3><div class="bes-row">' + commons + '</div></div>' + bs;
  }

  // Remplace peu à peu les dessins plats par leurs versions éclairées, quand ils arrivent à l'écran
  var spriteWatch = null;
  function swapSprite(el) {
    var GVG = window.GVG;
    var spr = el.getAttribute('data-spr'), bld = el.getAttribute('data-bld');
    var job;
    if (spr) {
      var p = spr.split('|');
      job = GVG.unit(+p[0], +p[1], p[2] || null, +p[3]).then(function (s) { return GVG.portrait(s); });
    } else {
      var q = bld.split('|');
      job = GVG.building(q[0], q[1] || null, q[2]);
    }
    job.then(function (art) {
      if (!el.isConnected) return;
      var c = document.createElement('canvas');
      c.width = art.width; c.height = art.height;
      c.getContext('2d').drawImage(art, 0, 0);
      c.className = 'art' + (el.getAttribute('width') ? ' fixed' : '');
      if (el.getAttribute('width')) { c.style.width = el.getAttribute('width') + 'px'; }
      var label = el.getAttribute('aria-label');
      if (label) { c.setAttribute('role', 'img'); c.setAttribute('aria-label', label); } else c.setAttribute('aria-hidden', 'true');
      el.parentNode.replaceChild(c, el);
    });
  }
  function hydrateSprites() {
    if (spriteWatch) spriteWatch.disconnect();
    var list = document.querySelectorAll('#view svg[data-spr], #view svg[data-bld]');
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(list, swapSprite); return; }
    spriteWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { spriteWatch.unobserve(e.target); swapSprite(e.target); }
      });
    }, { root: $('view'), rootMargin: '160px' });
    Array.prototype.forEach.call(list, function (el) { spriteWatch.observe(el); });
  }

  var lastRenderTab = null;
  function render() {
    stopScan();
    var view = $('view');
    var top = view.scrollTop;
    // Changement d'onglet : la page entre doucement, sans rejouer l'effet à chaque mise à jour
    if (lastRenderTab !== tab) {
      lastRenderTab = tab;
      top = 0;
      view.classList.remove('enter');
      void view.offsetWidth;
      view.classList.add('enter');
    }
    if (!state) view.innerHTML = viewCreate();
    else {
      var v = { base: viewBase, campagne: viewCampagne, armee: viewArmee, heros: viewHeros, rencontre: viewRencontre, carte: viewCarte, bestiaire: viewBestiaire }[tab];
      view.innerHTML = v();
    }
    view.scrollTop = top;
    renderHud();
    renderTabs();
    hydrateSprites();
    if (state && tab === 'base' && $('base-stage')) window.GVBase.attach($('base-stage'), baseModel(), tileAction);
  }

  function toast(msg) {
    Array.prototype.forEach.call(document.querySelectorAll('.toast'), function (old) { old.remove(); });
    var t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // Scanner
  function stopScan() {
    if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
    if (scanStream) { scanStream.getTracks().forEach(function (t) { t.stop(); }); scanStream = null; }
  }
  function startScan() {
    var video = $('cam');
    if (!video) return;
    stopScan();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } }).then(function (stream) {
      scanStream = stream;
      video.hidden = false;
      video.srcObject = stream;
      return video.play();
    }).then(function () {
      var shot = document.createElement('canvas'), c = shot.getContext('2d', { willReadFrequently: true }), seen = null;
      scanTimer = setInterval(function () {
        if (video.readyState < 2 || !video.videoWidth) return;
        var k = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        shot.width = Math.round(video.videoWidth * k); shot.height = Math.round(video.videoHeight * k);
        c.drawImage(video, 0, 0, shot.width, shot.height);
        var hit = window.jsQR(c.getImageData(0, 0, shot.width, shot.height).data, shot.width, shot.height, { inversionAttempts: 'dontInvert' });
        // Un même code refusé ne doit pas répéter son message à chaque image
        if (hit && hit.data && hit.data !== seen) { seen = hit.data; acceptCode(hit.data); }
      }, 300);
    }).catch(function () {
      toast('Caméra indisponible. Autorise-la, ou colle le code en texte.');
    });
  }
  function acceptCode(text) {
    var other;
    try { other = readCode(text); } catch (e) { toast(e.message); return; }
    if (other.id === state.id) { toast('C’est ton propre code : lis celui de ton ami.'); return; }
    stopScan();
    var mineCode = shownCode || makeCode();
    var isNew = !state.links[other.id];
    var old = state.links[other.id] || {};
    state.links[other.id] = { name: other.name, race: other.race, crowns: other.crowns, level: other.level, ally: !!old.ally, last: Date.now(), battleDay: old.battleDay || null };
    receiveParcels(other.parcels);
    // Les envois que l'ami confirme avoir reçus n'ont plus besoin de voyager
    function notAcked(p) { return other.acks.indexOf(p.i) < 0; }
    state.outbox = state.outbox.filter(notAcked);
    state.carry = state.carry.filter(notAcked);
    if (isNew) track('meet');
    if (isNew) { state.crowns += 2; toast('Nouvel éclat relié : +2 couronnes'); }
    encounter = { other: other, mine: mineCode };
    save();
    render();
  }

  function perdues(n) { return n + (n > 1 ? ' unités perdues' : ' unité perdue'); }
  function applyLosses(sim, team, keepChance, seed) {
    var rand = GVB.rng32(GVB.hashStr(seed + 'loss'));
    var mine = sim.units.filter(function (u) { return u.team === team && !u.fort && !u.deployed && !u.hero; });
    var lost = 0, idx = 0;
    state.slots = state.slots.map(function (u) {
      if (u === null) return null;
      var su = mine[idx++];
      if (su && !su.alive && rand() >= keepChance) { lost++; return null; }
      return u;
    });
    return lost;
  }

  function fightEncounter(twoScreens) {
    var o = encounter.other;
    var mine = readCode(encounter.mine).side;
    if (!mine.squad.length) { toast('Ton code a été montré sans armée. Recrute, puis refaites l’échange de codes.'); return; }
    if (!o.side.squad.length) { toast('Ton ami n’a aucune unité en formation.'); return; }
    var seed = encounterSeed();
    var mineFirst = (state.id < o.id) === ((GVB.hashStr(seed + 'side') & 1) === 0);
    var a = mineFirst ? mine : o.side, b = mineFirst ? o.side : mine;
    var today = dayKey();
    var link = state.links[o.id];
    var ranked = link.battleDay !== today && !link.ally;
    var myTeam = mineFirst ? 0 : 1;
    GVView.play(a, b, seed, {
      map: encounterMap(), onClose: render, sound: state.sound,
      nameA: mineFirst ? state.name : o.name, nameB: mineFirst ? o.name : state.name, mine: myTeam,
      half: twoScreens ? myTeam : null,
      startAt: twoScreens ? Math.ceil((Date.now() + 4000) / 10000) * 10000 : null,
      onEnd: function (sim) {
        var won = sim.winner === myTeam;
        var msg;
        if (ranked) {
          link.battleDay = today;
          var lost = applyLosses(sim, myTeam, won ? 0.5 : 0, seed);
          if (won) {
            var haul = Math.floor(Math.min(600, 200 + 60 * o.level));
            state.res.or += haul; state.res.eclats += 5; state.crowns += 3; state.wins++; track('win');
            msg = '+3 couronnes · +' + haul + ' Or · +5 Éclats · ' + perdues(lost) + battleSpoils(Math.max(1, o.level * 3), false);
          } else {
            state.crowns += 1; state.losses++;
            msg = '+1 couronne de rencontre · ' + perdues(lost) + '';
          }
        } else {
          msg = 'Bataille amicale : aucune perte, aucune récompense.';
        }
        save();
        return msg;
      }
    });
  }

  function campaign(level) {
    var chapter = Math.floor((level - 1) / 5);
    var map = chapter % 8;
    var step = (level - 1) % 5 + 1;
    return { chapter: chapter, map: map, race: map, step: step, boss: step === 5 };
  }
  function fortFor(level, towers, wallHp, keepHp) {
    var out = [{ t: 'keep', x: 3.5, y: 15, hp: keepHp }];
    var towerY = towers >= 4 ? [4, 9, 21, 26] : (towers === 3 ? [6, 15, 24] : (towers === 2 ? [7, 23] : (towers === 1 ? [15] : [])));
    towerY.forEach(function (y) { out.push({ t: 'tower', x: towers === 3 && y === 15 ? 9 : 7.5, y: y, hp: 160 + level * 25, atk: 9 + level * 1.2, range: 13, rate: 1.7 }); });
    if (wallHp > 0) [6, 12, 18, 24].forEach(function (y) { out.push({ t: 'wall', x: 12, y: y, hp: wallHp }); });
    return out;
  }
  function aiSide(level, seed) {
    var rand = GVB.rng32(GVB.hashStr(seed));
    var camp = campaign(level);
    var race = camp.race;
    var size = Math.min(12, 1 + Math.ceil(level / 2) - (camp.boss ? 1 : 0));
    var maxTier = Math.min(8, 1 + Math.floor((level - 1) / 3));
    var pool = GV.ROLES.map(function (r, i) { return i; }).filter(function (i) { return GV.ROLES[i].tier <= maxTier; });
    var squad = [];
    for (var s = 0; s < size; s++) squad.push([pool[Math.floor(rand() * pool.length)], s, -1]);
    if (camp.boss) squad[squad.length - 1] = [level >= 25 ? 11 : (level >= 15 ? 10 : 5), Math.min(size - 1, 4), -1];
    var bonus = 1 + (level - 1) * 0.03;
    var foe = { race: race, squad: squad, atk: bonus, hp: bonus, spd: 1, siege: 1, pt: Math.floor(rand() * 3), skin: -1 };
    if (camp.boss) {
      var a = level % 3, ar = GV.HERO_ARCH[a];
      foe.hero = { a: a, hp: ar.hp * (0.7 + level * 0.09), atk: ar.atk * (0.7 + level * 0.06), aura: 0, cd: 14, ab: 1, spd: 0, w: -1, lv: level, name: GV.HERO_NAMES[race][a] };
    }
    if (camp.boss) foe.fort = fortFor(level, level >= 10 ? 3 : 2, 90 + level * 16, 260 + level * 55);
    return foe;
  }

  function reserveList() {
    return Object.keys(state.reserve).filter(function (u) { return state.reserve[u] > 0; }).map(function (u) {
      return { uid: +u, n: state.reserve[u], w: equipped(+u), lv: unitLevel(+u) };
    });
  }
  function soloSide() {
    autoFill();
    var mine = sideOf();
    mine.pt = -1; // en solo, le joueur déclenche son pouvoir lui-même
    mine.mana = bonus('mana');
    return mine;
  }
  function noArmy() {
    save();
    toast('Ton armée se reforme : prochaine recrue dans ' + clock(nextUnitAt()));
    tab = 'armee';
    render();
  }
  function settleDeployed(sim, keepChance) {
    sim.units.forEach(function (u) {
      if (u.deployed && (u.alive || Math.random() < keepChance)) state.reserve[u.uid] = (state.reserve[u.uid] || 0) + 1;
    });
  }
  function fightTraining(level) {
    var mine = soloSide();
    if (!mine.squad.length) { noArmy(); return; }
    var fresh = level === state.trainLevel;
    var seed = state.id + ':' + level + ':' + Date.now();
    var foe = aiSide(level, seed);
    var camp = campaign(level);
    GVView.play(mine, foe, seed, {
      map: camp.map, onClose: render, sound: state.sound, interactive: true, reserve: reserveList(),
      onDeploy: function (uid) { state.reserve[uid]--; },
      nameA: state.name, nameB: camp.boss ? 'Boss · ' + GV.RACES[camp.race].name : GV.RACES[camp.race].name + ' sauvages', mine: 0, half: null, startAt: null,
      onEnd: function (sim) {
        var won = sim.winner === 0;
        var keep = won ? 0.8 : 0.5;
        var lost = applyLosses(sim, 0, keep, seed);
        settleDeployed(sim, keep);
        var msg;
        if (won) {
          var share = fresh ? 1 : 0.33;
          var o = Math.floor((120 + level * 60) * share), f = Math.floor((30 + level * 15) * share);
          var before = state.stars[level] || 0, gained = Math.max(0, sim.stars - before);
          state.stars[level] = Math.max(before, sim.stars);
          var shards = gained * 2 + (fresh ? (camp.boss ? 6 : 1) + Math.floor(level / 3) : 0);
          state.res.or += o; state.res.ble += f; state.res.fer += f; state.res.eclats += shards;
          if (fresh) {
            if (camp.boss) state.crowns += 1;
            state.trainLevel++;
            if (camp.boss) track('boss');
          }
          state.wins++;
          track('win');
          msg = '+' + o + ' Or · +' + f + ' Blé · +' + f + ' Fer' + (shards ? ' · +' + shards + ' Éclats' : '') + ' · ' + perdues(lost) + battleSpoils(level, camp.boss && fresh);
        } else {
          state.losses++;
          msg = perdues(lost) + '. Renforce ta formation puis reviens.';
        }
        collect();
        save();
        return msg;
      }
    });
  }
  // Défense de la base : tes bâtiments deviennent des forteresses
  function fightRaid() {
    var mine = soloSide();
    if (!mine.squad.length) { noArmy(); return; }
    var level = Math.max(1, state.trainLevel);
    var seed = state.id + ':raid:' + Date.now();
    var foe = aiSide(Math.max(1, level - (campaign(level).boss ? 1 : 0)), seed);
    foe.race = GVB.hashStr(seed) % 8;
    foe.fort = null;
    mine.fort = fortFor(lvl('cit'), Math.min(4, lvl('tou') + 1), lvl('mur') ? 150 + 60 * lvl('mur') : 0, 600 + 200 * lvl('cit'));
    GVView.play(mine, foe, seed, {
      map: foe.race, onClose: render, sound: state.sound, interactive: true, reserve: reserveList(),
      onDeploy: function (uid) { state.reserve[uid]--; },
      nameA: state.name, nameB: 'Pillards · ' + GV.RACES[foe.race].name, mine: 0, half: null, startAt: null,
      onEnd: function (sim) {
        var won = sim.winner === 0;
        var keep = won ? 0.85 : 0.6;
        var lost = applyLosses(sim, 0, keep, seed);
        settleDeployed(sim, keep);
        var msg;
        if (won) {
          var o = 200 + level * 50;
          state.res.or += o; state.res.eclats += 3; state.wins++;
          track('win');
          state.raidAt = Date.now() + 3 * 3600000;
          track('raid');
          msg = 'Base défendue : +' + o + ' Or · +3 Éclats · ' + perdues(lost) + battleSpoils(level, false);
        } else {
          var robbed = Math.floor(Math.min(300, state.res.or * 0.1));
          state.res.or -= robbed; state.losses++;
          state.raidAt = Date.now() + 3600000;
          msg = 'Les pillards emportent ' + robbed + ' Or · ' + perdues(lost);
        }
        collect();
        save();
        return msg;
      }
    });
  }

  function sendFromForm() {
    var to = $('m-to').value, kind = $('m-kind').value;
    var r = $('m-res').value, n = amount(+$('m-n').value), wr = $('m-wres').value, wn = amount(+$('m-wn').value);
    collect();
    var cost = {};
    if (kind === 'g' || kind === 'x') {
      if (!n) { toast('Indique une quantité.'); return; }
      cost[r] = n;
    }
    if (kind === 'r') {
      if (!placedCount()) { toast('Place d’abord une armée pour ton raid.'); return; }
      cost.lumiere = 20;
    }
    if (!canPay(cost)) { toast('Il te manque des ressources pour cet envoi.'); return; }
    pay(cost);
    var value = {};
    if (kind === 'm') value = { m: +$('m-text').value };
    else if (kind === 'g') value = { r: r, n: n };
    else if (kind === 'x') value = { r: r, n: n, wr: wr, wn: wn };
    else if (kind === 'r') { value = encodeSide(sideOf()); value.r = state.race; }
    sendParcel(to, kind, value);
    save();
    toast('Confié au messager : il part avec ton prochain code.');
    render();
  }

  // Actions
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.getAttribute('data-act'), v = el.getAttribute('data-v');
    if (act === 'pick-race') {
      var nameEl = $('name');
      if (nameEl) draft.name = nameEl.value;
      draft.race = +v;
      render();
    } else if (act === 'start') {
      var n = ($('name').value || '').trim();
      if (!n) { toast('Donne un nom à ton royaume.'); $('name').focus(); return; }
      newGame(n, draft.race);
      render();
    } else if (act === 'tab') {
      tab = v; draft.sel = undefined; draft.confirmReset = false; draft.tile = null; draft.panel = null; draft.moving = null; draft.chapter = null;
      $('view').scrollTop = 0;
      render();
    } else if (act === 'upgrade') {
      var uu = +v, uc = upgradeCost(uu);
      collect();
      if (!canPay(uc) || unitLevel(uu) >= upgradeCap()) return;
      pay(uc);
      state.ulv[uu] = unitLevel(uu) + 1;
      save(); toast(GV.unitInfo(state.race, uu).name + ' : niveau ' + state.ulv[uu]); render();
    } else if (act === 'autofill') {
      autoFill(); save(); render();
    } else if (act === 'tax-rate') {
      collect();
      state.taxRate = +v; save(); render();
    } else if (act === 'tile') {
      tileAction(v);
    } else if (act === 'base-panel') {
      draft.panel = draft.panel === v ? null : v;
      draft.tile = null; draft.moving = null;
      render();
    } else if (act === 'place') {
      var pb = buildingById(v), pu = buildingUse(pb);
      collect();
      if (!draft.tile || pu.needs || !canPay(pu.cost) || state.base.tiles[draft.tile] || lvl(v) > 0 || jobOf(v) || buildersFree() < 1) return;
      pay(pu.cost);
      state.base.tiles[draft.tile] = v;
      startJob(pb);
      save(); toast('Chantier lancé : ' + buildingName(pb)); render();
    } else if (act === 'speedup') {
      var sj = jobOf(v);
      if (!sj) return;
      var sc = speedCost(sj.until);
      if (state.res.eclats < sc) return;
      state.res.eclats -= sc;
      sj.until = Date.now() - 1;
      collect(); flushNews(); save(); render();
    } else if (act === 'tech') {
      var tt = GV.TECHS.filter(function (x) { return x.id === v; })[0];
      collect();
      if (!tt || state.research.job || state.research.done[v] || tt.req > lvl('bib') || !canPay(tt.cost)) return;
      pay(tt.cost);
      state.research.job = { id: v, start: Date.now(), until: Date.now() + tt.min * 60000 * (1 - bonus('build') / 200) };
      save(); toast('Recherche lancée : ' + tt.name); render();
    } else if (act === 'speed-tech') {
      var rj = state.research.job;
      if (!rj) return;
      var rc = speedCost(rj.until);
      if (state.res.eclats < rc) return;
      state.res.eclats -= rc;
      rj.until = Date.now() - 1;
      collect(); flushNews(); save(); render();
    } else if (act === 'monde') {
      draft.monde = v; $('view').scrollTop = 0; render();
    } else if (act === 'hero-pick') {
      state.heroActive = +v; save(); render();
    } else if (act === 'hero-buy') {
      if (state.res.eclats < 60 || state.heroes[+v]) return;
      state.res.eclats -= 60;
      state.heroes[+v] = { lv: 1, xp: 0, skills: {} };
      state.gear[+v] = {};
      state.heroActive = +v;
      save(); toast(heroName(+v) + ' rejoint ton armée'); render();
    } else if (act === 'skill') {
      var hs = state.heroes[state.heroActive], sk = GV.HERO_SKILLS.filter(function (x) { return x.id === v; })[0];
      if (!sk || hs.lv < sk.lv || pointsLeft(state.heroActive) < 1 || (hs.skills[v] || 0) >= sk.max) return;
      hs.skills[v] = (hs.skills[v] || 0) + 1;
      save(); render();
    } else if (act === 'wear') {
      var wi2 = itemById(+v);
      if (!wi2) return;
      state.gear[state.heroActive][wi2.slot] = wi2.id;
      save(); render();
    } else if (act === 'unequip') {
      delete state.gear[state.heroActive][v];
      save(); render();
    } else if (act === 'scrap') {
      var sp2 = itemById(+v);
      if (!sp2) return;
      state.res.eclats += sp2.rar + 1;
      state.items = state.items.filter(function (i) { return i.id !== sp2.id; });
      save(); render();
    } else if (act === 'quality') {
      state.quality = state.quality === 'low' ? 'high' : 'low';
      window.GVG.quality = state.quality;
      save(); render();
    } else if (act === 'raid') {
      fightRaid();
    } else if (act === 'chapter') {
      draft.chapter = +v; render();
    } else if (act === 'move') {
      draft.moving = draft.tile; draft.tile = null;
      render();
    } else if (act === 'move-cancel') {
      draft.tile = draft.moving; draft.moving = null;
      render();
    } else if (act === 'clear') {
      var dk = draft.tile, dd = DECOR[state.base.decor[dk]];
      collect();
      if (!dd || !canPay(CLEAR_COST)) return;
      pay(CLEAR_COST);
      delete state.base.decor[dk];
      Object.keys(dd.gain).forEach(function (r) { state.res[r] = (state.res[r] || 0) + dd.gain[r]; });
      save(); toast(rewardText(dd.gain)); render();
    } else if (act === 'extend') {
      var xc = extendCost();
      collect();
      if (state.base.size >= BASE_MAX || lvl('cit') < extendNeed() || !canPay(xc)) return;
      pay(xc);
      seedDecor(state.base.size, state.base.size + 1);
      state.base.size++;
      draft.panel = null;
      save(); toast('Ta base s’agrandit'); render();
    } else if (act === 'mkt-buy' || act === 'mkt-sell') {
      var mp = v.split(':'), mr = mp[0], mn = +mp[1];
      var mit = MARKET.filter(function (x) { return x.id === mr; })[0];
      if (!mit) return;
      var pr = marketPrices(mit);
      collect();
      if (act === 'mkt-buy') {
        var mc = Math.ceil(mn * pr.buy);
        if (state.res.or < mc || state.res[mr] >= storage()) return;
        state.res.or -= mc;
        state.res[mr] = Math.min(storage(), state.res[mr] + mn);
      } else {
        if (mp[1] === 'all') mn = Math.floor(state.res[mr]);
        if (mn < 1 || state.res[mr] < mn) return;
        state.res[mr] -= mn;
        state.res.or += Math.floor(mn * pr.sell); // une vente rapporte toujours, même au-delà du stock maximal
      }
      track('market');
      save(); render();
    } else if (act === 'build') {
      var b = buildingById(v);
      collect();
      var c = buildCost(b);
      if (!canPay(c) || buildingUse(b).capped || jobOf(v) || buildersFree() < 1) return;
      pay(c);
      startJob(b);
      save(); toast('Chantier lancé : ' + buildingName(b)); render();
    } else if (act === 'recruit') {
      var id = +v;
      collect();
      var uc = unitCost(id);
      if (!canPay(uc)) return;
      pay(uc);
      addUnit(id);
      track('recruit');
      save(); render();
    } else if (act === 'quest') {
      var qi = +v, qd = GV.QUESTS[qi];
      questsToday();
      if (state.quests.done[qi] || (state.quests.prog[qd.key] || 0) < qd.goal) return;
      state.quests.done[qi] = 1;
      Object.keys(qd.reward).forEach(function (r) { state.res[r] = (state.res[r] || 0) + qd.reward[r]; });
      save(); toast(rewardText(qd.reward)); render();
    } else if (act === 'season-ok') {
      state.seasonNote = null; save(); render();
    } else if (act === 'sound') {
      state.sound = !state.sound; save(); render();
    } else if (act === 'power-time') {
      state.powerTime = +v; save(); render();
    } else if (act === 'skin') {
      var si = +v;
      if (si < 0) state.skin = -1;
      else if (state.skins[si]) state.skin = si;
      else if (state.res.eclats >= GV.SKINS[si].cost) { state.res.eclats -= GV.SKINS[si].cost; state.skins[si] = 1; state.skin = si; }
      save(); render();
    } else if (act === 'send') {
      sendFromForm();
    } else if (act === 'mail-del') {
      state.inbox.splice(+v, 1); save(); render();
    } else if (act === 'trade-yes') {
      var ty = state.inbox[+v];
      if (!ty || !ty.trade) return;
      var cy = {}; cy[ty.trade.wr] = ty.trade.wn;
      if (!canPay(cy)) { toast('Il te manque des ressources pour cet échange.'); return; }
      pay(cy);
      state.res[ty.trade.r] = (state.res[ty.trade.r] || 0) + ty.trade.n;
      sendParcel(ty.trade.to, 'g', { r: ty.trade.wr, n: ty.trade.wn });
      state.inbox.splice(+v, 1);
      save(); toast('Échange accepté : la contrepartie part par messager.'); render();
    } else if (act === 'trade-no') {
      var tn = state.inbox[+v];
      if (!tn || !tn.trade) return;
      sendParcel(tn.trade.to, 'g', { r: tn.trade.r, n: tn.trade.n, note: 'ref' });
      state.inbox.splice(+v, 1);
      save(); render();
    } else if (act === 'ally-yes') {
      var ay = state.inbox[+v];
      if (!ay || !ay.ally) return;
      if (state.links[ay.ally]) state.links[ay.ally].ally = true;
      sendParcel(ay.ally, 'A', {});
      state.inbox.splice(+v, 1);
      save(); toast('Alliance conclue.'); render();
    } else if (act === 'betray') {
      if (!encounter) return;
      state.links[encounter.other.id].ally = false;
      sendParcel(encounter.other.id, 'b', {});
      save(); toast('Alliance rompue.'); render();
    } else if (act === 'replay') {
      var rp = state.inbox[+v] && state.inbox[+v].replay;
      if (!rp) return;
      GVView.play(rp.foe, rp.mine, rp.seed, { map: rp.map, sound: state.sound, onClose: render, nameA: rp.name, nameB: state.name, mine: 1, half: null, startAt: null, onEnd: function () { return 'Revoir une bataille ne change rien.'; } });
    } else if (act === 'forge') {
      var wi = +v, wc = GV.weaponCost(wi);
      collect();
      if (!canPay(wc) || GV.WEAPON_STATS[wi].tier > lvl('for')) return;
      pay(wc);
      state.arsenal[wi] = 1;
      track('forge');
      save(); toast(GV.WEAPONS[wi][1] + ' forgée'); render();
    } else if (act === 'equip') {
      var eu = +v, owned = ownedFor(eu), cur = equipped(eu), pos = owned.indexOf(cur);
      state.equip[eu] = pos + 1 < owned.length ? owned[pos + 1] : -1;
      save(); render();
    } else if (act === 'sel') {
      draft.sel = draft.sel === +v ? undefined : +v;
      render();
    } else if (act === 'slot') {
      var i = +v;
      if (state.slots[i] !== null) {
        var u = state.slots[i];
        state.slots[i] = null;
        state.reserve[u] = (state.reserve[u] || 0) + 1;
      } else if (draft.sel !== undefined && state.reserve[draft.sel] > 0) {
        if (placedCount() >= armyCap()) { toast('Armée complète : améliore la Taverne pour agrandir.'); return; }
        state.slots[i] = draft.sel;
        state.reserve[draft.sel]--;
        if (state.reserve[draft.sel] <= 0) draft.sel = undefined;
      }
      save(); render();
    } else if (act === 'train') {
      fightTraining(+v || state.trainLevel);
    } else if (act === 'copy') {
      var code = encounter ? encounter.mine : (shownCode || makeCode());
      if (window.GVNative) { window.GVNative.copy(code); toast('Code copié.'); return; }
      var done = function () { toast('Code copié.'); };
      var failed = function () { var p = $('paste'); if (p) { p.value = code; p.select(); } toast('Copie impossible : le code est dans la case, sélectionne-le.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, failed); else failed();
    } else if (act === 'share') {
      var sent = encounter ? encounter.mine : (shownCode || makeCode());
      if (window.GVNative) window.GVNative.share(sent);
      else if (navigator.share) navigator.share({ text: sent }).catch(function () {});
      else { var box = $('paste'); if (box) { box.value = sent; box.select(); } toast('Copie ce code et envoie-le à ton ami.'); }
    } else if (act === 'scan') {
      startScan();
    } else if (act === 'use-code') {
      acceptCode($('paste').value);
    } else if (act === 'fight') {
      fightEncounter(false);
    } else if (act === 'fight2') {
      fightEncounter(true);
    } else if (act === 'hybrid') {
      if (state.res.lumiere < 30 || !encounter) return;
      state.res.lumiere -= 30;
      state.hybrids.push(encounter.other.race);
      state.crowns += 1;
      save();
      toast('Nouvel hybride : à recruter dans Armée');
      render();
    } else if (act === 'end-enc') {
      encounter = null;
      render();
    } else if (act === 'reset') {
      if (!draft.confirmReset) { draft.confirmReset = true; render(); return; }
      try { localStorage.removeItem(KEY); } catch (err) { /* rien à effacer */ }
      state = null; encounter = null; draft = { name: '', race: 0 }; tab = 'base';
      render();
    }
  });

  document.addEventListener('change', function (e) {
    if (e.target.id !== 'auto-unit') return;
    state.auto.uid = +e.target.value;
    state.auto.last = Date.now();
    save(); render();
  });

  // Les cases du plan se manipulent aussi au clavier
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button') {
      e.preventDefault();
      e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + window.GV_SPRITES + '</svg>');
    load();
    if (state) { ensureBase(); collect(); checkSeason(); }
    render();
    if (state) flushNews();
    // Les comptes à rebours avancent chaque seconde, sans redessiner l'écran
    setInterval(function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-until]'), function (el) {
        el.textContent = clock(+el.getAttribute('data-until'));
      });
    }, 1000);
    // Rafraîchit les ressources sans redessiner l'écran en cours
    setInterval(function () {
      if (state && !document.getElementById('battle')) {
        collect();
        var newUnits = flushNews();
        renderHud();
        save();
        // Redessine sauf dans Rencontre, où un formulaire peut être en cours
        if (newUnits && tab !== 'rencontre') render();
      }
    }, 5000);
    if (!window.GVNative && 'serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
      // Demande au navigateur de ne pas effacer la sauvegarde quand la place manque
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
    }
  }

  window.GVDEBUG = { get state() { return state; }, makeCode: makeCode, readCode: readCode };
})();
