// Données du jeu : races, rangs d'unités, bâtiments, armes
(function () {
  var ROLES = [
    { key: 'recrue', label: 'Recrue', kind: 'melee', hp: 60, atk: 8, range: 2.4, spd: 2.2, rate: 1.0, tier: 1, cost: { or: 30, ble: 15 } },
    { key: 'soldat', label: 'Soldat', kind: 'melee', hp: 95, atk: 12, range: 2.4, spd: 2.2, rate: 1.0, tier: 1, cost: { or: 55, ble: 20, fer: 10 }, over: 'sh' },
    { key: 'garde', label: 'Garde', kind: 'tank', hp: 175, atk: 9, range: 2.4, spd: 1.8, rate: 1.1, tier: 2, cost: { or: 80, ble: 25, fer: 30 }, over: 'sh' },
    { key: 'tireur', label: 'Tireur', kind: 'ranged', hp: 55, atk: 12, range: 11, spd: 2.0, rate: 1.2, tier: 2, cost: { or: 70, ble: 20, bois: 25 } },
    { key: 'rapide', label: 'Rapide', kind: 'fast', hp: 70, atk: 14, range: 2.4, spd: 3.8, rate: 0.9, tier: 3, cost: { or: 95, ble: 30, fer: 15 } },
    { key: 'lourd', label: 'Lourd', kind: 'heavy', hp: 160, atk: 24, range: 3.2, spd: 1.7, rate: 1.4, tier: 3, cost: { or: 130, ble: 40, fer: 45 }, big: true },
    { key: 'elite', label: 'Tireur d’élite', kind: 'ranged', hp: 65, atk: 22, range: 14, spd: 1.9, rate: 1.5, tier: 4, cost: { or: 150, ble: 30, bois: 45, fer: 20 } },
    { key: 'mage', label: 'Mage', kind: 'magic', hp: 65, atk: 17, range: 9, spd: 1.9, rate: 1.5, tier: 4, cost: { or: 170, ble: 30, lumiere: 8 }, over: 'orb', splash: 2.6 },
    { key: 'soin', label: 'Soigneur', kind: 'healer', hp: 75, atk: 16, range: 8, spd: 2.0, rate: 1.4, tier: 5, cost: { or: 170, ble: 40, lumiere: 12 } },
    { key: 'siege', label: 'Siège', kind: 'siege', hp: 90, atk: 34, range: 17, spd: 1.3, rate: 2.6, tier: 6, cost: { or: 220, bois: 90, fer: 60 }, splash: 3 },
    { key: 'heros', label: 'Héros', kind: 'hero', hp: 340, atk: 32, range: 3, spd: 2.3, rate: 1.0, tier: 7, cost: { or: 500, ble: 120, fer: 120, lumiere: 30 }, big: true, under: 'cp', over: 'cr' },
    { key: 'monstre', label: 'Monstre', kind: 'monster', hp: 560, atk: 44, range: 3.6, spd: 2.0, rate: 1.5, tier: 8, cost: { or: 800, ble: 240, fer: 160, lumiere: 60 } }
  ];

  var RACES = [
    { name: 'Humains', glass: 'Saphir', color: '#8fb8ff', cls: 'r1', body: 't1', wx: 52, wy: 18, cy: 0, sx: 0, sy: 0, mon: 'm1', citadel: 'c1', citadelName: 'Palais royal',
      trait: 'Discipline : +15 % de points de vie', hp: 1.15, atk: 1, costM: 1,
      w: ['wdg', 'wsw', 'wmc', 'wcb', 'wsw', 'wsp', 'wbw', 'wst', 'wsk', 'wbm', 'wmc'],
      u: ['Recrue', 'Homme d’armes', 'Garde royal', 'Arbalétrier', 'Éclaireur', 'Piquier', 'Archer d’élite', 'Mage', 'Prêtresse', 'Bombardier', 'Roi-Paladin', 'Griffon'] },
    { name: 'Nains', glass: 'Ambre', color: '#ffd680', cls: 'r2', body: 't2', wx: 53, wy: 34, cy: 20, sx: -2, sy: 12, mon: 'm2', citadel: 'c2', citadelName: 'Forteresse naine',
      trait: 'Armure : 6 % de dégâts reçus en moins', hp: 1.06, atk: 1, costM: 1,
      w: ['wax', 'wax', 'whm', 'wbl', 'wdg', 'wdx', 'wbl', 'wsk', 'wst', 'wbm', 'whm'],
      u: ['Mineur', 'Brise-fer', 'Bouclier d’ambre', 'Tromblonnier', 'Coureur des tunnels', 'Marteleur', 'Arquebusier', 'Runiste', 'Forgesoin', 'Canonnier', 'Seigneur des Forges', 'Golem d’acier'] },
    { name: 'Elfes', glass: 'Émeraude', color: '#9af0c0', cls: 'r3', body: 't3', wx: 49, wy: 16, cy: 6, sx: 2, sy: -6, mon: 'm3', citadel: 'c3', citadelName: 'Arbre-cité',
      trait: 'Œil vif : plus de portée et +5 % d’attaque', hp: 0.83, atk: 1.05, costM: 1,
      w: ['wdg', 'wcv', 'wsp', 'wbw', 'wcv', 'wha', 'wbw', 'wst', 'wst', 'wja', 'wsk'],
      u: ['Sylvain', 'Lame-Sylve', 'Gardien des bois', 'Archère', 'Danseuse', 'Danse-Lame', 'Tireuse de lune', 'Enchanteresse', 'Druidesse', 'Lance-épines', 'Reine d’Émeraude', 'Tréant'] },
    { name: 'Orques', glass: 'Rubis', color: '#ff8a8f', cls: 'r4', body: 't4', wx: 58, wy: 24, cy: 6, sx: -8, sy: 6, mon: 'm4', citadel: 'c4', citadelName: 'Camp de guerre',
      trait: 'Rage : +6 % d’attaque, +35 % sous la moitié des points de vie', hp: 1.01, atk: 1.06, costM: 1,
      w: ['wdg', 'wci', 'wmc', 'wja', 'wci', 'wcl', 'wja', 'wbn', 'wbn', 'wro', 'wdx'],
      u: ['Peau-Verte', 'Égorgeur', 'Brute à bouclier', 'Javelinier', 'Loup-Coureur', 'Berserker', 'Œil-de-Sang', 'Chaman', 'Rebouteux', 'Lance-roc', 'Chef de Guerre', 'Sanglier de guerre'] },
    { name: 'Trolls', glass: 'Turquoise', color: '#9ff3ea', cls: 'r5', body: 't5', wx: 67, wy: 40, cy: 10, sx: -14, sy: 20, mon: 'm5', citadel: 'c5', citadelName: 'Antre osseux',
      trait: 'Régénération : 0,4 % de points de vie par seconde', hp: 1.11, atk: 1, costM: 1,
      w: ['wcl', 'wcl', 'wbn', 'wro', 'wcl', 'wbn', 'wro', 'wst', 'wst', 'wro', 'wtr'],
      u: ['Trollon', 'Cogneur', 'Peau-de-pierre', 'Lanceur de rocs', 'Bondisseur', 'Mâchefer', 'Frappe-loin', 'Sorcier des marais', 'Guérisseur', 'Broyeur', 'Troll-Roi', 'Hydre'] },
    { name: 'Gobelins', glass: 'Citrine', color: '#f0f59a', cls: 'r6', body: 't6', wx: 45, wy: 50, cy: 28, sx: 8, sy: 24, mon: 'm6', citadel: 'c6', citadelName: 'Ville-ferraille',
      trait: 'Pas cher : unités 25 % moins coûteuses', hp: 0.93, atk: 1, costM: 0.75,
      w: ['wdg', 'wdg', 'wmc', 'wsb', 'wdg', 'wfl', 'wsb', 'wst', 'wst', 'wbm', 'wfl'],
      u: ['Morveux', 'Surineur', 'Porte-Planche', 'Sarbacanier', 'Filou', 'Cogne-tout', 'Tireur fourbe', 'Bricoleur', 'Rafistoleur', 'Artificier', 'Grand Filou', 'Araignée géante'] },
    { name: 'Morts-Vivants', glass: 'Améthyste', color: '#d2aaff', cls: 'r7', body: 't7', wx: 51, wy: 14, cy: 0, sx: 0, sy: -6, mon: 'm7', citadel: 'c7', citadelName: 'Nécropole',
      trait: 'Relève : 25 % de chances de revenir une fois au combat', hp: 0.98, atk: 1, costM: 1,
      w: ['wdg', 'wsw', 'wmc', 'wbw', 'wdg', 'wsc', 'wbw', 'wbn', 'wbn', 'wbn', 'wsk'],
      u: ['Squelette', 'Revenant', 'Garde d’os', 'Archer d’os', 'Goule', 'Moissonneur', 'Œil-Mort', 'Nécromant', 'Embaumeur', 'Jeteur de crânes', 'Liche', 'Dragon d’os'] },
    { name: 'Drakéides', glass: 'Verre de feu', color: '#ffc080', cls: 'r8', body: 't8', wx: 51, wy: 18, cy: 0, sx: 0, sy: 0, mon: 'm8', citadel: 'c8', citadelName: 'Volcan-nid',
      trait: 'Brasier : chaque coup brûle aussi les ennemis proches', hp: 1.01, atk: 1, costM: 1,
      w: ['wdg', 'wfb', 'wmc', 'wja', 'wfb', 'wha', 'wja', 'wst', 'wst', 'wbm', 'wtr'],
      u: ['Écailleux', 'Griffe-de-feu', 'Garde-Écaille', 'Javelinier ardent', 'Coureur des cendres', 'Hallebardier', 'Souffle-loin', 'Pyromancien', 'Prêtre des cendres', 'Cracheur', 'Prince-Dragon', 'Wyverne'] }
  ];

  var HY_PRE = ['Ost', 'Forge', 'Sylve', 'Croc', 'Mâche', 'Filou', 'Mort', 'Braise'];
  var HY_SUF = ['royal', 'fer', 'sève', 'croc', 'roc', 'filou', 'morte', 'braise'];

  var RES = [
    { id: 'or', name: 'Or', color: '#ffd75a' },
    { id: 'ble', name: 'Blé', color: '#f0f59a' },
    { id: 'bois', name: 'Bois', color: '#d79a5c' },
    { id: 'pierre', name: 'Pierre', color: '#b4b8d2' },
    { id: 'fer', name: 'Fer', color: '#8fb8ff' },
    { id: 'lumiere', name: 'Lumière', color: '#fff6c9' },
    { id: 'eclats', name: 'Éclats', color: '#d2aaff' }
  ];

  var BUILDINGS = [
    { id: 'cit', sym: null, name: 'Citadelle', desc: 'Augmente le stock et le niveau maximal des bâtiments', cost: { or: 220, bois: 120, pierre: 140 } },
    { id: 'cas', sym: 'd1', name: 'Caserne', desc: 'Chaque niveau débloque un rang d’unités', cost: { or: 120, bois: 90, pierre: 40 } },
    { id: 'fer', sym: 'd2', name: 'Ferme', desc: 'Produit du blé', cost: { or: 60, bois: 50 }, prod: { ble: 140 } },
    { id: 'mou', sym: 'd3', name: 'Moulin', desc: '+8 % de blé par niveau', cost: { or: 90, bois: 70, pierre: 20 } },
    { id: 'min', sym: 'd4', name: 'Mine', desc: 'Produit de l’or et du fer', cost: { or: 70, bois: 70 }, prod: { or: 150, fer: 40 } },
    { id: 'sci', sym: 'd6', name: 'Scierie', desc: 'Produit du bois', cost: { or: 60, pierre: 20 }, prod: { bois: 110 } },
    { id: 'por', sym: 'd13', name: 'Port', desc: 'Importe de la pierre et de l’or', cost: { or: 90, bois: 110 }, prod: { pierre: 90, or: 40 } },
    { id: 'mar', sym: 'd7', name: 'Marché', desc: 'Produit de l’or et améliore les prix au marché', cost: { or: 100, bois: 80 }, prod: { or: 110 } },
    { id: 'for', sym: 'd5', name: 'Forge', desc: '+3 % d’attaque par niveau', cost: { or: 140, pierre: 70, fer: 40 } },
    { id: 'mur', sym: 'd12', name: 'Muraille', desc: '+3 % de points de vie par niveau', cost: { or: 110, pierre: 130 } },
    { id: 'tou', sym: 'd11', name: 'Tour d’archers', desc: '+1,5 % d’attaque par niveau', cost: { or: 100, bois: 60, pierre: 70 } },
    { id: 'ecu', sym: 'd10', name: 'Écurie', desc: '+2 % de vitesse par niveau', cost: { or: 110, bois: 100, ble: 60 } },
    { id: 'ate', sym: 'd14', name: 'Atelier de siège', desc: '+5 % de dégâts de siège par niveau', cost: { or: 150, bois: 130, fer: 50 } },
    { id: 'bib', sym: 'd9', name: 'Bibliothèque', desc: '-2 % sur le coût des unités par niveau', cost: { or: 170, bois: 80, pierre: 60 } },
    { id: 'tav', sym: 'd15', name: 'Taverne', desc: 'Agrandit l’armée en bataille', cost: { or: 120, bois: 90, ble: 50 } },
    { id: 'tem', sym: 'd8', name: 'Temple', desc: 'Produit de la lumière', cost: { or: 180, pierre: 110 }, prod: { lumiere: 3 } },
    { id: 'pui', sym: 'd16', name: 'Puits de lumière', desc: 'Produit beaucoup de lumière', cost: { or: 260, pierre: 160, fer: 40 }, prod: { lumiere: 6 } }
  ];

  var WEAPONS = [
    ['wsw', 'Épée'], ['wfb', 'Flamberge'], ['wci', 'Cimeterre'], ['wcv', 'Lame sylve'], ['wdg', 'Dague'], ['wax', 'Hache'], ['wdx', 'Hache double'], ['wmc', 'Masse'], ['whm', 'Marteau'],
    ['wcl', 'Gourdin'], ['wbn', 'Massue d’os'], ['wfl', 'Fléau'], ['wsp', 'Lance'], ['wtr', 'Trident'], ['wha', 'Hallebarde'], ['wsc', 'Faux'], ['wja', 'Javelot'], ['wbw', 'Arc'],
    ['wcb', 'Arbalète'], ['wbl', 'Tromblon'], ['wsb', 'Sarbacane'], ['wbm', 'Bombe'], ['wro', 'Roc'], ['wst', 'Bâton de cristal'], ['wsk', 'Sceptre']
  ];

  // Armes forgeables, dans l'ordre de WEAPONS. c : m mêlée, t tir, s magie. tier : niveau de Forge requis.
  var WEAPON_STATS = [
    { c: 'm', tier: 1, atk: 8 }, { c: 'm', tier: 6, atk: 32 }, { c: 'm', tier: 3, atk: 12, spd: 4 }, { c: 'm', tier: 3, atk: 10, rate: -10 }, { c: 'm', tier: 1, atk: 4, spd: 6 },
    { c: 'm', tier: 1, atk: 12, rate: 5 }, { c: 'm', tier: 5, atk: 28, rate: 8 }, { c: 'm', tier: 2, atk: 10, hp: 5 }, { c: 'm', tier: 5, atk: 24, spd: -5 },
    { c: 'm', tier: 2, atk: 14, spd: -4 }, { c: 'm', tier: 4, atk: 18, hp: 4 }, { c: 'm', tier: 4, atk: 20, rate: 5 }, { c: 'm', tier: 2, atk: 8, range: 0.6 }, { c: 'm', tier: 4, atk: 14, rate: -5 },
    { c: 'm', tier: 3, atk: 14, range: 0.8 }, { c: 'm', tier: 6, atk: 26, range: 0.8, rate: -5 }, { c: 't', tier: 1, atk: 10 }, { c: 't', tier: 2, atk: 10, range: 1.5 },
    { c: 't', tier: 3, atk: 20 }, { c: 't', tier: 4, atk: 26, range: -1.5 }, { c: 't', tier: 1, atk: 6, rate: -10 }, { c: 't', tier: 5, atk: 30 }, { c: 't', tier: 2, atk: 18, rate: 10 },
    { c: 's', tier: 1, atk: 10 }, { c: 's', tier: 3, atk: 20, hp: 10 }
  ];
  var RANK_CLASS = ['m', 'm', 'm', 't', 'm', 'm', 't', 's', 's', 't', 'm', null];
  function weaponCost(i) {
    var t = WEAPON_STATS[i].tier;
    return { or: 80 * t, fer: 60 * t, eclats: (t - 1) * 3 };
  }
  function weaponText(i) {
    var w = WEAPON_STATS[i], out = [];
    if (w.atk) out.push('+' + w.atk + ' % ATQ');
    if (w.hp) out.push('+' + w.hp + ' % PV');
    if (w.spd) out.push((w.spd > 0 ? '+' : '') + w.spd + ' % vitesse');
    if (w.rate) out.push(w.rate < 0 ? 'Frappe plus vite' : 'Frappe plus lentement');
    if (w.range) out.push(w.range > 0 ? 'Portée accrue' : 'Portée réduite');
    return out.join(' · ');
  }

  // Un hybride tient de son second verre : Nain robuste, Drakéide puissant, Gobelin rapide...
  var HY_MOD = [{ hp: 1.1, atk: 1.05 }, { hp: 1.25 }, { atk: 1.1, spd: 1.1 }, { atk: 1.2 }, { hp: 1.2 }, { spd: 1.3 }, { atk: 1.1, hp: 1.05 }, { atk: 1.25 }];

  // Une unité est soit un rang (0 à 11), soit un hybride (100 + race de l'autre verre)
  function unitInfo(race, uid) {
    var r = RACES[race];
    if (uid >= 100) {
      var other = uid - 100;
      var base = ROLES[5];
      var a = Math.min(race, other), b = Math.max(race, other);
      return {
        uid: uid, name: HY_PRE[a] + HY_SUF[b], hybrid: true, other: other, role: base, kind: 'heavy', tier: 1,
        hp: base.hp * 1.2 * (HY_MOD[other].hp || 1), atk: base.atk * 1.2 * (HY_MOD[other].atk || 1), range: base.range, spd: base.spd * (HY_MOD[other].spd || 1), rate: base.rate,
        cost: { or: 200, ble: 50, fer: 60, lumiere: 15 }
      };
    }
    var role = ROLES[uid];
    return { uid: uid, name: r.u[uid], role: role, kind: role.kind, tier: role.tier, hp: role.hp, atk: role.atk, range: role.range, spd: role.spd, rate: role.rate, cost: role.cost, splash: role.splash };
  }

  var HELD = { wbw: 1, wcb: 1, wro: 1, wbm: 1 };

  // Assemble un personnage à partir des pièces du Bestiaire
  function unitMarkup(race, uid, weapon) {
    var r = RACES[race];
    if (uid === 11) return '<use href="#' + r.mon + '" width="120" height="140"></use>';
    var hybrid = uid >= 100;
    var role = hybrid ? ROLES[5] : ROLES[uid];
    var w = weapon || (hybrid ? RACES[uid - 100].w[5] : r.w[uid]);
    var ws = role.big ? (role.under ? 78 : 96) : 70;
    var k = ws / 80;
    var wx = r.wx + 35 - 40 * k;
    var wy = r.wy + 58 - 65 * k - (HELD[w] ? 20 : 0);
    var s = '';
    if (role.under) s += '<use href="#' + role.under + '" width="120" height="140"></use>';
    s += '<use href="#' + r.body + '" width="120" height="140"></use>';
    s += '<use href="#' + w + '" x="' + wx + '" y="' + wy + '" width="' + ws + '" height="' + ws + '"></use>';
    s += '<circle class="p sk" cx="' + (r.wx + 35) + '" cy="' + (r.wy + 58) + '" r="5"></circle>';
    if (role.over) {
      var ox = role.over === 'cr' ? 0 : r.sx;
      var oy = role.over === 'cr' ? r.cy : r.sy;
      s += '<use href="#' + role.over + '" x="' + ox + '" y="' + oy + '" width="120" height="140"></use>';
    }
    return s;
  }

  // Corps et arme séparés : l'arme bouge pendant le combat
  function unitParts(race, uid, weapon) {
    var r = RACES[race];
    if (uid === 11) return { body: '<use href="#' + r.mon + '" width="120" height="140"></use>', w: null };
    var hybrid = uid >= 100;
    var role = hybrid ? ROLES[5] : ROLES[uid];
    var w = weapon || (hybrid ? RACES[uid - 100].w[5] : r.w[uid]);
    var hx = r.wx + 35, hy = r.wy + 58;
    var s = '';
    if (role.under) s += '<use href="#' + role.under + '" width="120" height="140"></use>';
    s += '<use href="#' + r.body + '" width="120" height="140"></use>';
    s += '<circle class="p sk" cx="' + hx + '" cy="' + hy + '" r="5"></circle>';
    if (role.over) {
      var ox = role.over === 'cr' ? 0 : r.sx;
      var oy = role.over === 'cr' ? r.cy : r.sy;
      s += '<use href="#' + role.over + '" x="' + ox + '" y="' + oy + '" width="120" height="140"></use>';
    }
    return { body: s, w: w, ws: role.big ? (role.under ? 78 : 96) : 70, hx: hx, hy: hy, held: !!HELD[w], grip: HELD[w] ? 0.5 : 65 / 80 };
  }

  function unitClass(race, uid) {
    return uid >= 100 ? RACES[uid - 100].cls : RACES[race].cls;
  }

  window.GV = { ROLES: ROLES, RACES: RACES, RES: RES, BUILDINGS: BUILDINGS, WEAPONS: WEAPONS, WEAPON_STATS: WEAPON_STATS, RANK_CLASS: RANK_CLASS, weaponCost: weaponCost, weaponText: weaponText, unitInfo: unitInfo, unitMarkup: unitMarkup, unitParts: unitParts, unitClass: unitClass };
})();
