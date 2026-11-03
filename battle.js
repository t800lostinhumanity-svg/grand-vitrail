// Moteur de bataille déterministe et pas à pas : les mêmes codes donnent le même combat sur les deux téléphones.
// En solo, le joueur peut intervenir : ses ordres entrent dans le moteur au tour où il les donne.
(function () {
  var FIELD_W = 80, FIELD_H = 60, TICK = 0.1, MAX_TICKS = 2400;
  var BATTLE_PACE = 0.55; // plus bas, les combats durent plus longtemps

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Avantages : chaque type bat un autre type
  var DODGE_TICKS = 5, DODGE_COOLDOWN = 40; // esquive : 0,5 s d'intouchabilité, recharge de 4 s
  var ADV = { heavy: { monster: 1.3, hero: 1.3, melee: 1.15 }, ranged: { heavy: 1.25, siege: 1.3 }, fast: { ranged: 1.4, magic: 1.4, healer: 1.4, siege: 1.4 }, melee: { fast: 1.25 }, magic: { tank: 1.35, monster: 1.1 }, siege: { tank: 1.3, fort: 2.2 }, monster: { melee: 1.2, tank: 1.15, fort: 1.4 }, tank: { melee: 1.1 }, heavy2: {} };

  var COSTS = { smite: 40, heal: 50, charge: 30, power: 60, deploy: 25 };

  // Un pouvoir de race se transmet aux hybrides : tr est un masque de races
  function has(u, race) { return (u.tr & (1 << race)) !== 0; }

  function makeUnit(side, team, idx, entry, x, y, mapId) {
    var GV = window.GV;
    var map = window.GVM.MAPS[mapId];
    var uid = entry[0], wIdx = entry[2];
    var info = GV.unitInfo(side.race, uid);
    var race = GV.RACES[side.race];
    var tr = 1 << side.race;
    if (uid >= 100) tr |= 1 << (uid - 100);
    var w = wIdx >= 0 ? GV.WEAPON_STATS[wIdx] : null;
    var lvM = 1 + 0.12 * ((entry[3] || 1) - 1);
    var range = info.range + (w && w.range ? w.range : 0);
    if ((tr & (1 << 2)) && (info.kind === 'ranged' || info.kind === 'magic')) range += 2;
    var atk = info.atk * race.atk * side.atk * BATTLE_PACE * (1 + (w && w.atk ? w.atk : 0) / 100) * lvM;
    if (info.kind === 'siege') atk *= side.siege;
    if (map.home >= 0 && (tr & (1 << map.home))) atk *= 1.1;
    if (mapId === 3) atk *= 1.1;
    var hp = info.hp * race.hp * side.hp * (1 + (w && w.hp ? w.hp : 0) / 100) * lvM;
    return {
      idx: idx, team: team, uid: uid, race: side.race, tr: tr, kind: info.kind, wIdx: wIdx,
      x: x, y: y, px: x, py: y,
      hp: hp, maxHp: hp, atk: atk, range: range,
      spd: info.spd * side.spd * (1 + (w && w.spd ? w.spd : 0) / 100),
      rate: info.rate * (1 + (w && w.rate ? w.rate : 0) / 100),
      cd: 0.4, splash: info.splash || 0, revived: false, alive: true, fort: null
    };
  }

  function spawnSide(side, team, startIdx, mapId) {
    var out = [];
    var rows = side.squad.map(function (e) { return Math.floor(e[1] / 3); });
    var midRow = rows.length ? (Math.min.apply(null, rows) + Math.max.apply(null, rows)) / 2 : 0;
    side.squad.forEach(function (entry) {
      var slot = entry[1], col = slot % 3, row = Math.floor(slot / 3);
      var bx = 16 - col * 5;
      var u = makeUnit(side, team, startIdx + out.length, entry, team === 0 ? bx : FIELD_W - bx, FIELD_H / 2 + (row - midRow) * 6.5, mapId);
      u.cd = 0.4 + col * 0.15;
      out.push(u);
    });
    // Le héros combat en première ligne et lance sa capacité à intervalle régulier
    if (side.hero) {
      var hb = 18;
      var hu = makeUnit(side, team, startIdx + out.length, [10, 0, side.hero.w === undefined ? -1 : side.hero.w, 1], team === 0 ? hb : FIELD_W - hb, FIELD_H / 2, mapId);
      hu.hero = side.hero;
      hu.hp = hu.maxHp = side.hero.hp;
      hu.atk = side.hero.atk * BATTLE_PACE;
      hu.spd = hu.spd * (1 + (side.hero.spd || 0) / 100);
      hu.abCd = side.hero.cd * 0.6;
      out.push(hu);
    }
    // Fortifications : immobiles, elles arrêtent l'ennemi et certaines tirent
    (side.fort || []).forEach(function (f) {
      var fx = team === 0 ? f.x : FIELD_W - f.x;
      out.push({
        idx: startIdx + out.length, team: team, uid: -1, race: side.race, tr: 1 << side.race, kind: 'fort', wIdx: -1,
        x: fx, y: f.y + (FIELD_H - 30) / 2, px: fx, py: f.y + (FIELD_H - 30) / 2, hp: f.hp, maxHp: f.hp, atk: (f.atk || 0) * BATTLE_PACE, range: f.range || 0,
        spd: 0, rate: f.rate || 1.6, cd: 1, splash: 0, revived: true, alive: true, fort: f.t
      });
    });
    return out;
  }

  function create(sideA, sideB, seedStr, mapId, tactical) {
    var GVM = window.GVM;
    var rand = rng32(hashStr(seedStr));
    var units = spawnSide(sideA, 0, 0, mapId);
    units = units.concat(spawnSide(sideB, 1, units.length, mapId));
    units.forEach(function (x) { x.cd += rand() * 0.5; });
    var events = [];
    var reviveChance = mapId === 6 ? 0.4 : 0.25;
    var sides = [sideA, sideB];
    var fired = [false, false];
    var atkUntil = [0, 0], defUntil = [0, 0], rushUntil = [0, 0], burnUntil = [0, 0];
    var eng = { units: units, events: events, ticks: 0, done: false, winner: 0, map: mapId, mana: [30, 30], manaMax: [100 * (1 + ((sideA.mana || 0) / 100)), 100], tick: TICK, width: FIELD_W, height: FIELD_H, fired: fired, costs: COSTS };
    var orders = [];
    var aura = [sideA.hero ? sideA.hero.aura || 0 : 0, sideB.hero ? sideB.hero.aura || 0 : 0];

    function heroCast(h) {
      var a = h.hero.a, pw = h.hero.ab || 1, i, x, best = null, bd = Infinity;
      h.abCd = h.hero.cd;
      events.push([eng.ticks, 'hero', h.idx, a, 0]);
      if (a === 0) {
        for (i = 0; i < units.length; i++) {
          x = units[i];
          if (x.alive && x.team !== h.team && (x.x - h.x) * (x.x - h.x) + (x.y - h.y) * (x.y - h.y) <= 30) damage(x, h.atk * 0.9 * pw);
        }
      } else if (a === 1) {
        atkUntil[h.team] = Math.max(atkUntil[h.team], eng.ticks + Math.round(80 * pw));
      } else {
        for (i = 0; i < units.length; i++) {
          x = units[i];
          if (!x.alive) continue;
          if (x.team === h.team && !x.fort) x.hp = Math.min(x.maxHp, x.hp + x.maxHp * 0.13 * pw);
          else if (x.team !== h.team) {
            var dd = (x.x - h.x) * (x.x - h.x) + (x.y - h.y) * (x.y - h.y);
            if (dd < bd) { bd = dd; best = x; }
          }
        }
        if (best) damage(best, h.atk * 3.5 * pw);
      }
    }

    function damage(to, amount) {
      if (to.dodgeUntil > eng.ticks) return 0;
      if (has(to, 1) && !to.fort) amount *= 0.94;
      if (defUntil[to.team] > eng.ticks) amount *= 0.65;
      to.hp -= amount;
      return amount;
    }

    // Les morts sont résolues en fin de tour : deux unités qui se frappent en même temps se touchent toutes les deux
    function resolveDeaths() {
      for (var i = 0; i < units.length; i++) {
        var to = units[i];
        if (!to.alive || to.hp > 0) continue;
        if (has(to, 6) && !to.revived && rand() < reviveChance) {
          to.revived = true;
          to.hp = to.maxHp * 0.4;
          events.push([eng.ticks, 'rise', to.idx, to.idx, 0]);
        } else {
          to.hp = 0;
          to.alive = false;
          events.push([eng.ticks, 'die', to.idx, to.idx, 0]);
        }
      }
    }

    function strike(u, t) {
      var mult = (ADV[u.kind] && ADV[u.kind][t.kind]) || 1;
      if (has(u, 3) && u.hp < u.maxHp * 0.5) mult *= 1.35;
      var ranged = u.range > 4;
      if (ranged && !t.fort) {
        var cover = GVM.KINDS[GVM.kindAt(mapId, t.x, t.y)].cover;
        if (cover) mult *= cover;
      }
      if (atkUntil[u.team] > eng.ticks) mult *= 1.25;
      if (rushUntil[u.team] > eng.ticks) mult *= 1.15;
      if (aura[u.team] && u.team !== undefined) mult *= 1 + aura[u.team] / 100;
      var dmg = u.atk * mult * (0.9 + rand() * 0.2);
      var dealt = damage(t, dmg);
      events.push([eng.ticks, tactical ? (ranged ? 'landed' : 'struck') : (ranged ? 'shot' : 'hit'), u.idx, t.idx, dealt]);
      var splash = u.splash || (has(u, 7) && !u.hero ? 2.4 : 0);
      if (splash) {
        var share = u.splash ? 0.5 : 0.3;
        for (var i = 0; i < units.length; i++) {
          var o = units[i];
          if (!o.alive || o.team === u.team || o === t) continue;
          var dx = o.x - t.x, dy = o.y - t.y;
          if (dx * dx + dy * dy <= splash * splash) damage(o, dmg * share);
        }
      }
    }

    // Pouvoirs de race : au moment choisi avant le combat, ou à la demande en solo
    function usePower(team) {
      fired[team] = true;
      var race = sides[team].race, foe = 1 - team, i, x;
      var power = 30 * sides[team].atk * BATTLE_PACE;
      events.push([eng.ticks, 'power', team, race, 0]);
      if (race === 0) atkUntil[team] = eng.ticks + 80;
      else if (race === 1) defUntil[team] = eng.ticks + 50;
      else if (race === 3) rushUntil[team] = eng.ticks + 70;
      else if (race === 7) burnUntil[foe] = eng.ticks + 60;
      else if (race === 2) {
        for (i = 0; i < units.length; i++) { x = units[i]; if (x.alive && x.team === foe) damage(x, power * 1.8); }
      } else if (race === 4) {
        for (i = 0; i < units.length; i++) { x = units[i]; if (x.alive && x.team === team && !x.fort) x.hp = Math.min(x.maxHp, x.hp + x.maxHp * 0.18); }
      } else if (race === 5) {
        var cx = 0, cy = 0, c = 0;
        for (i = 0; i < units.length; i++) { x = units[i]; if (x.alive && x.team === foe) { cx += x.x; cy += x.y; c++; } }
        if (c) {
          cx /= c; cy /= c;
          for (i = 0; i < units.length; i++) {
            x = units[i];
            if (x.alive && x.team === foe && (x.x - cx) * (x.x - cx) + (x.y - cy) * (x.y - cy) <= 49) damage(x, power * 2.3);
          }
        }
      } else if (race === 6) {
        var back = 0;
        for (i = 0; i < units.length && back < 2; i++) {
          x = units[i];
          if (!x.alive && x.team === team && !x.fort) {
            x.alive = true; x.hp = x.maxHp * 0.5; x.revived = true; back++;
            events.push([eng.ticks, 'rise', x.idx, x.idx, 0]);
          }
        }
      }
    }

    function share(team) {
      var cur = 0, max = 0;
      units.forEach(function (x) { if (x.team === team && !x.fort) { cur += Math.max(0, x.hp); max += x.maxHp; } });
      return max ? cur / max : 0;
    }
    eng.share = share;

    function checkPowers() {
      for (var team = 0; team < 2; team++) {
        if (fired[team]) continue;
        var when = sides[team].pt === undefined ? 1 : sides[team].pt;
        if (when < 0) continue; // le joueur le déclenche lui-même
        if (when === 0 ? eng.ticks >= 25 : share(team) < (when === 1 ? 0.6 : 0.3)) usePower(team);
      }
    }

    // --- Ordres donnés unité par unité (combats en solo) ---
    var bolts = [];
    function applyUnitOrder(o) {
      o.ids.forEach(function (id) {
        var u = units[id];
        if (!u || !u.alive || u.team !== 0 || u.fort) return;
        if (o.cmd === 'dodge') {
          if ((u.dodgeReady || 0) > eng.ticks) return;
          var dx = o.dx, dy = o.dy;
          if (dx === undefined) {
            var near = null, nd = Infinity;
            units.forEach(function (e) { if (e.alive && e.team !== u.team) { var q = (e.x - u.x) * (e.x - u.x) + (e.y - u.y) * (e.y - u.y); if (q < nd) { nd = q; near = e; } } });
            dx = near ? u.x - near.x : -1; dy = near ? u.y - near.y : 0;
          }
          var l = Math.sqrt(dx * dx + dy * dy) || 1;
          u.dashX = dx / l * 0.9; u.dashY = dy / l * 0.9; u.dash = 4;
          u.dodgeUntil = eng.ticks + DODGE_TICKS;
          u.dodgeReady = eng.ticks + DODGE_COOLDOWN;
          u.pend = null;
          events.push([eng.ticks, 'dodge', u.idx, u.idx, 0]);
        } else {
          // Réappuyer sur « attaquer » la même cible ne doit pas annuler le coup déjà lancé
          if (!(o.cmd === 'attack' && u.pend && u.pend.t === o.target)) u.pend = null;
          if (o.cmd === 'auto') u.cmd = null;
          else if (o.cmd === 'hold') u.cmd = { t: 'hold' };
          else if (o.cmd === 'attack') u.cmd = { t: 'attack', id: o.target };
          else if (o.cmd === 'move') u.cmd = { t: 'move', k: o.k || 1, x: Math.max(1.5, Math.min(FIELD_W - 1.5, o.x + (o.ox || 0))), y: Math.max(3, Math.min(FIELD_H - 3, o.y + (o.oy || 0))) };
        }
      });
    }
    // Le coup part après le geste : on peut s'écarter ou esquiver avant qu'il ne touche
    function windup(u) { return (u.kind === 'heavy' || u.kind === 'monster' || u.kind === 'hero') ? 5 : ((u.range > 4 || u.kind === 'siege') ? 4 : 3); }
    function resolvePending(u) {
      var p = u.pend;
      if (eng.ticks < p.at) return;
      u.pend = null;
      var tg = units[p.t];
      if (!tg.alive) return;
      var dd = Math.sqrt((tg.x - u.x) * (tg.x - u.x) + (tg.y - u.y) * (tg.y - u.y));
      if (u.range > 4) {
        var fly = Math.max(1, Math.round(dd / (u.splash ? 17 : 36) / TICK));
        bolts.push({ from: u, t: tg, at: eng.ticks + fly, ax: tg.x, ay: tg.y });
        events.push([eng.ticks, 'shot', u.idx, tg.idx, fly]);
      } else if (dd > u.range + (tg.fort ? 1.5 : 0) + 1.6 || tg.dodgeUntil > eng.ticks) {
        events.push([eng.ticks, 'missed', u.idx, tg.idx, 0]);
      } else strike(u, tg);
    }
    function stepBolts() {
      for (var i = bolts.length - 1; i >= 0; i--) {
        var b = bolts[i];
        if (eng.ticks < b.at) continue;
        bolts.splice(i, 1);
        if (!b.from.alive && !b.from.fort) continue;
        var moved = (b.t.x - b.ax) * (b.t.x - b.ax) + (b.t.y - b.ay) * (b.t.y - b.ay);
        if (!b.t.alive || b.t.dodgeUntil > eng.ticks || moved > 16) events.push([eng.ticks, 'missed', b.from.idx, b.t.idx, 0]);
        else strike(b.from, b.t);
      }
    }

    function applyOrder(o) {
      if (o.type === 'unit') { applyUnitOrder(o); return; }
      if (eng.mana[0] < COSTS[o.type]) return;
      if (o.type === 'power' && fired[0]) return;
      eng.mana[0] -= COSTS[o.type];
      var i, x;
      if (o.type === 'power') usePower(0);
      else if (o.type === 'charge') {
        rushUntil[0] = eng.ticks + 50;
        events.push([eng.ticks, 'order', 0, 0, 0]);
      } else if (o.type === 'heal') {
        for (i = 0; i < units.length; i++) { x = units[i]; if (x.alive && x.team === 0 && !x.fort) x.hp = Math.min(x.maxHp, x.hp + x.maxHp * 0.22); }
        events.push([eng.ticks, 'healall', 0, 0, 0]);
      } else if (o.type === 'smite') {
        var dmg = 62 * sides[0].atk * BATTLE_PACE;
        for (i = 0; i < units.length; i++) {
          x = units[i];
          if (x.alive && x.team === 1 && (x.x - o.x) * (x.x - o.x) + (x.y - o.y) * (x.y - o.y) <= 30) damage(x, dmg * (x.fort ? 0.5 : 1));
        }
        events.push([eng.ticks, 'smite', o.x, o.y, 0]);
      } else if (o.type === 'deploy') {
        var u = makeUnit(sides[0], 0, units.length, [o.uid, 0, o.w === undefined ? -1 : o.w, o.lv || 1], 3, FIELD_H / 2 - 7 + rand() * 14, mapId);
        u.deployed = true;
        units.push(u);
        events.push([eng.ticks, 'deploy', u.idx, u.idx, 0]);
      }
    }

    // Une armée avec un donjon tombe avec lui ; sinon elle tombe avec sa dernière unité
    function standing(team) {
      var keep = false, keepUp = false, any = false;
      for (var i = 0; i < units.length; i++) {
        var x = units[i];
        if (x.team !== team) continue;
        if (x.fort === 'keep') { keep = true; if (x.alive) keepUp = true; }
        if (x.alive && !x.fort) any = true;
      }
      return keep ? keepUp : any;
    }

    eng.order = function (o) { orders.push(o); };

    eng.step = function () {
      if (eng.done) return;
      var ticks = eng.ticks, n = units.length;
      while (orders.length) applyOrder(orders.shift());
      if (eng.mana[0] < eng.manaMax[0]) eng.mana[0] = Math.min(eng.manaMax[0], eng.mana[0] + 0.22);
      checkPowers();
      for (var p = 0; p < n; p++) { units[p].px = units[p].x; units[p].py = units[p].y; }
      // L'ordre s'inverse à chaque tour pour qu'aucun camp n'agisse toujours en premier
      for (var oi = 0; oi < n; oi++) {
        var u = units[ticks % 2 ? n - 1 - oi : oi];
        if (!u.alive) continue;
        if (tactical && u.pend) resolvePending(u);
        if (has(u, 4) && u.hp < u.maxHp && !u.fort) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.004 * TICK);
        u.cd -= TICK;
        if (u.hero) {
          u.abCd -= TICK;
          if (u.abCd <= 0) heroCast(u);
        }

        // Effets du sol sous l'unité
        var ground = GVM.KINDS[GVM.kindAt(mapId, u.x, u.y)];
        if (!u.fort) {
          if (ground.burn && !(ground === GVM.KINDS.lava && has(u, 7))) u.hp -= u.maxHp * ground.burn * TICK;
          if (burnUntil[u.team] > ticks) u.hp -= u.maxHp * 0.03 * TICK;
          if (ground.heal) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * ground.heal * TICK);
        }

        // Élan de l'esquive, puis déplacement commandé
        if (tactical && u.dash > 0) {
          u.dash--;
          u.x = Math.max(1, Math.min(FIELD_W - 1, u.x + u.dashX));
          u.y = Math.max(3, Math.min(FIELD_H - 3, u.y + u.dashY));
          continue;
        }
        if (tactical && u.pend) continue;
        if (tactical && u.cmd && u.cmd.t === 'move') {
          var mdx = u.cmd.x - u.x, mdy = u.cmd.y - u.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
          // Sur ordre, l'unité court : plus vite que la marche au combat, mais elle ne frappe pas en chemin
          var ms = u.spd * ground.speed * TICK * (rushUntil[u.team] > ticks ? 1.4 : 1) * 1.8 * u.cmd.k;
          if (md <= ms + 0.05) { u.x = u.cmd.x; u.y = u.cmd.y; u.cmd = { t: 'hold' }; }
          else { u.x += mdx / md * ms; u.y += mdy / md * ms; }
          continue;
        }

        // Le soigneur vise l'allié le plus blessé à sa portée
        if (u.kind === 'healer') {
          var hurt = null, worst = 0.95;
          for (var h = 0; h < n; h++) {
            var ally = units[h];
            if (!ally.alive || ally.team !== u.team || ally === u || ally.fort) continue;
            var hdx = ally.x - u.x, hdy = ally.y - u.y;
            var ratio = ally.hp / ally.maxHp;
            if (ratio < worst && hdx * hdx + hdy * hdy <= u.range * u.range) { worst = ratio; hurt = ally; }
          }
          if (hurt && u.cd <= 0) {
            hurt.hp = Math.min(hurt.maxHp, hurt.hp + u.atk);
            u.cd = u.rate;
            events.push([ticks, 'heal', u.idx, hurt.idx, 0]);
            continue;
          }
        }

        if (u.fort && !u.atk) continue;
        var target = null, best = Infinity;
        for (var j = 0; j < n; j++) {
          var e = units[j];
          if (!e.alive || e.team === u.team) continue;
          var dx = e.x - u.x, dy = e.y - u.y;
          var d = dx * dx + dy * dy;
          if (d < best) { best = d; target = e; }
        }
        if (!target) continue;
        if (tactical && u.cmd && u.cmd.t === 'attack') {
          var forced = units[u.cmd.id];
          if (forced && forced.alive) { target = forced; best = (forced.x - u.x) * (forced.x - u.x) + (forced.y - u.y) * (forced.y - u.y); }
          else u.cmd = null;
        }
        var dist = Math.sqrt(best);
        var reach = u.range + (target.fort ? 1.5 : 0);
        if (dist > reach) {
          if (u.fort || (tactical && u.cmd && u.cmd.t === 'hold')) continue;
          var step = u.spd * ground.speed * TICK * (rushUntil[u.team] > ticks ? 1.4 : 1);
          u.x += (target.x - u.x) / dist * step;
          u.y += (target.y - u.y) / dist * step;
          // Écarte légèrement les unités pour éviter qu'elles se superposent
          for (var s = 0; s < n; s++) {
            var o = units[s];
            if (o === u || !o.alive || o.fort) continue;
            var sx = u.x - o.x, sy = u.y - o.y;
            var sd = sx * sx + sy * sy;
            if (sd > 0.0001 && sd < 4) {
              var push = (2 - Math.sqrt(sd)) * 0.05;
              u.y += (sy >= 0 ? 1 : -1) * push;
            }
          }
          u.y = Math.max(3, Math.min(FIELD_H - 3, u.y));
        } else if (u.cd <= 0) {
          u.cd = u.rate;
          if (tactical) {
            var wu = windup(u);
            u.pend = { t: target.idx, at: ticks + wu };
            events.push([ticks, 'swing', u.idx, target.idx, wu]);
          } else strike(u, target);
        }
      }
      if (tactical) {
        stepBolts();
        // Les troupes s'écartent : on distingue mieux chaque unité et les manœuvres restent lisibles
        for (var a0 = 0; a0 < n; a0++) {
          var q0 = units[a0];
          if (!q0.alive || q0.fort || q0.dash > 0) continue;
          for (var b0 = a0 + 1; b0 < n; b0++) {
            var q1 = units[b0];
            if (!q1.alive || q1.fort || q1.dash > 0) continue;
            var gx = q1.x - q0.x, gy = q1.y - q0.y, gd = gx * gx + gy * gy;
            if (gd >= 7.3 || gd < 0.0001) continue;
            var gl = Math.sqrt(gd), gp = (2.7 - gl) * 0.08;
            gx *= gp / gl; gy *= gp / gl;
            q0.x = Math.max(1, Math.min(FIELD_W - 1, q0.x - gx)); q0.y = Math.max(3, Math.min(FIELD_H - 3, q0.y - gy));
            q1.x = Math.max(1, Math.min(FIELD_W - 1, q1.x + gx)); q1.y = Math.max(3, Math.min(FIELD_H - 3, q1.y + gy));
          }
        }
      }
      resolveDeaths();
      eng.ticks++;
      var a = standing(0), b = standing(1);
      if (!a || !b || eng.ticks >= MAX_TICKS) {
        eng.done = true;
        if (a && !b) eng.winner = 0;
        else if (b && !a) eng.winner = 1;
        else if (share(0) === share(1)) eng.winner = rand() < 0.5 ? 0 : 1; // morts simultanées : aucun camp n'est favorisé
        else eng.winner = share(0) > share(1) ? 0 : 1;
      }
    };
    return eng;
  }

  // Bataille calculée d'un seul coup, pour les raids par messager et les vérifications
  function simulate(sideA, sideB, seedStr, mapId) {
    var eng = create(sideA, sideB, seedStr, mapId);
    var n = eng.units.length, frames = [];
    function snapshot() {
      var f = new Float32Array(n * 3);
      for (var i = 0; i < n; i++) {
        f[i * 3] = eng.units[i].x;
        f[i * 3 + 1] = eng.units[i].y;
        f[i * 3 + 2] = eng.units[i].alive ? eng.units[i].hp / eng.units[i].maxHp : 0;
      }
      frames.push(f);
    }
    snapshot();
    while (!eng.done) { eng.step(); snapshot(); }
    return { winner: eng.winner, frames: frames, events: eng.events, map: mapId, units: eng.units, tick: TICK, width: FIELD_W, height: FIELD_H };
  }

  window.GVB = { DODGE_COOLDOWN: DODGE_COOLDOWN, create: create, simulate: simulate, hashStr: hashStr, rng32: rng32, FIELD_W: FIELD_W, FIELD_H: FIELD_H };
})();
