// Contenu complet : armes de race, bâtiments de race, skins, pouvoirs, quêtes, courrier
(function () {
  var GV = window.GV;

  // --- 55 armes de race, à ajouter aux 25 armes communes : 80 au total ---
  // [forme, nom, classe, niveau de forge, attaque %, autres effets]
  var SIGNATURE = [
    [['wsw', 'Lame du Serment', 'm', 2, 10, { hp: 4 }], ['wmc', 'Masse de Justice', 'm', 3, 14, { hp: 4 }], ['wsp', 'Lance de Croisade', 'm', 3, 12, { range: 0.8 }], ['wcb', 'Arbalète royale', 't', 3, 22], ['wbw', 'Arc du Héraut', 't', 4, 20, { range: 1.5 }], ['wst', 'Bâton de Vêpres', 's', 2, 14], ['wsk', 'Sceptre du Sacre', 's', 5, 30, { hp: 12 }]],
    [['wax', 'Hache de Mineur', 'm', 1, 14], ['whm', 'Marteau-Tonnerre', 'm', 4, 26], ['wdx', 'Fend-Montagne', 'm', 6, 36, { rate: 8 }], ['wmc', 'Masse de Fonte', 'm', 3, 16, { hp: 6 }], ['wbl', 'Tromblon à runes', 't', 3, 24], ['wbl', 'Canon de poing', 't', 5, 32, { range: -1 }], ['wsk', 'Sceptre runique', 's', 4, 26]],
    [['wcv', 'Murmure', 'm', 2, 10, { rate: -12 }], ['wcv', 'Feuille d’Argent', 'm', 4, 18, { rate: -12 }], ['wha', 'Danse-Lune', 'm', 3, 16, { range: 1 }], ['wbw', 'Arc de Sève', 't', 2, 12, { range: 2 }], ['wbw', 'Long-Regard', 't', 5, 24, { range: 3 }], ['wst', 'Rameau d’Aube', 's', 2, 14], ['wst', 'Bâton des Anciens', 's', 5, 30, { hp: 8 }]],
    [['wci', 'Mord-Chair', 'm', 2, 14, { spd: 3 }], ['wdx', 'Fend-Crâne', 'm', 4, 28, { rate: 6 }], ['wcl', 'Os-Broyeur', 'm', 3, 20, { spd: -3 }], ['wfl', 'Chaîne-Sang', 'm', 5, 30, { rate: 5 }], ['wja', 'Javelot barbelé', 't', 2, 14], ['wro', 'Roc d’Assaut', 't', 3, 24, { rate: 10 }], ['wbn', 'Totem de Guerre', 's', 3, 20]],
    [['wcl', 'Tronc Noueux', 'm', 1, 16, { spd: -4 }], ['wbn', 'Fémur de Géant', 'm', 3, 22, { hp: 5 }], ['whm', 'Massif', 'm', 5, 32, { spd: -6 }], ['wtr', 'Harpon des Marais', 'm', 4, 20, { rate: -5 }], ['wro', 'Bloc Moussu', 't', 2, 20, { rate: 10 }], ['wro', 'Éboulis', 't', 5, 34, { rate: 12 }], ['wst', 'Bâton de Mangrove', 's', 3, 20, { hp: 8 }]],
    [['wdg', 'Rouillée', 'm', 1, 6, { spd: 8 }], ['wdg', 'Surin Fourbe', 'm', 3, 14, { spd: 10 }], ['wfl', 'Fléau à Clous', 'm', 4, 22, { rate: 5 }], ['wsb', 'Sarbacane à Venin', 't', 2, 10, { rate: -12 }], ['wbm', 'Bombe à Clous', 't', 3, 26], ['wbm', 'Grosse Boum', 't', 6, 40, { rate: 12 }], ['wst', 'Clé Magique', 's', 2, 12]],
    [['wsc', 'Faux du Passeur', 'm', 4, 24, { range: 0.8 }], ['wsw', 'Lame Funèbre', 'm', 2, 12, { hp: 3 }], ['wmc', 'Masse de Tombe', 'm', 3, 16, { hp: 5 }], ['wbw', 'Arc Spectral', 't', 3, 16, { range: 2 }], ['wbn', 'Crâne-Hurlant', 's', 3, 20], ['wsk', 'Sceptre de la Liche', 's', 5, 30, { hp: 10 }], ['wsc', 'Grande Moisson', 'm', 6, 36, { range: 1 }]],
    [['wfb', 'Croc de Braise', 'm', 3, 18], ['wfb', 'Flamberge Ardente', 'm', 5, 30], ['wtr', 'Trident de Cendres', 'm', 4, 20, { rate: -6 }], ['wha', 'Glaive d’Obsidienne', 'm', 4, 22, { range: 0.8 }], ['wja', 'Trait de Feu', 't', 2, 16], ['wst', 'Bâton Volcanique', 's', 4, 26]]
  ];
  SIGNATURE.forEach(function (list, race) {
    list.forEach(function (w) {
      GV.WEAPONS.push([w[0], w[1]]);
      var st = { c: w[2], tier: w[3], atk: w[4], race: race };
      if (w[5]) Object.keys(w[5]).forEach(function (k) { st[k] = w[5][k]; });
      GV.WEAPON_STATS.push(st);
    });
  });

  // --- 88 bâtiments de race : 11 par race, soit 112 avec les 16 communs et les 8 citadelles ---
  var SLOTS = [
    { sym: 'd4', req: 1, cost: { or: 110, bois: 80 }, desc: 'Produit beaucoup d’or', prod: { or: 130 } },
    { sym: 'd2', req: 1, cost: { or: 90, bois: 70 }, desc: 'Produit des vivres et du fer', prod: { ble: 110, fer: 25 } },
    { sym: 'd5', req: 2, cost: { or: 160, pierre: 80, fer: 60 }, desc: '+2 % d’attaque par niveau', eff: { atk: 2 } },
    { sym: 'd12', req: 2, cost: { or: 130, pierre: 150 }, desc: '+2 % de points de vie par niveau', eff: { hp: 2 } },
    { sym: 'd10', req: 3, cost: { or: 140, bois: 110, ble: 70 }, desc: '+1,5 % de vitesse par niveau', eff: { spd: 1.5 } },
    { sym: 'd7', req: 3, cost: { or: 180, bois: 100 }, desc: '-1,5 % sur le coût des unités par niveau', eff: { cost: 1.5 } },
    { sym: 'd8', req: 4, cost: { or: 220, pierre: 130, fer: 40 }, desc: 'Produit de la lumière', prod: { lumiere: 3 } },
    { sym: 'd1', req: 4, cost: { or: 200, bois: 120, ble: 90 }, desc: 'Une place d’armée tous les 4 niveaux', eff: { cap: 0.25 } },
    { sym: 'd14', req: 5, cost: { or: 230, bois: 150, fer: 80 }, desc: '+4 % de dégâts de siège par niveau', eff: { siege: 4 } },
    { sym: 'd9', req: 5, cost: { or: 240, pierre: 180 }, desc: '+15 % de stock maximal par niveau', eff: { storage: 15 } },
    { sym: null, req: 6, cost: { or: 400, pierre: 260, fer: 120, lumiere: 30 }, desc: 'Produit des éclats de verre', prod: { eclats: 1 } }
  ];
  var RACE_BUILDINGS = [
    ['Hôtel des Monnaies', 'Domaine Royal', 'Salle d’Armes', 'Bastion', 'Relais de Poste', 'Intendance', 'Cathédrale', 'Grande Garnison', 'Arsenal Royal', 'Greniers du Roi', 'Salle du Trône'],
    ['Filon Profond', 'Brasserie', 'Grande Enclume', 'Porte de Fer', 'Rails de Mine', 'Guilde des Comptes', 'Salle des Runes', 'Halle des Clans', 'Fonderie de Canons', 'Coffres-Montagne', 'Trésor des Ancêtres'],
    ['Bosquet Nourricier', 'Source d’Argent', 'Cercle des Lames', 'Haie d’Épines', 'Sentiers Cachés', 'Tisserands', 'Autel de Lune', 'Clairière du Conseil', 'Atelier de Ronces', 'Réserve de Sève', 'Arbre-Mémoire'],
    ['Fosse à Butin', 'Enclos à Bêtes', 'Arène de Sang', 'Palissade de Crocs', 'Piste de Guerre', 'Tente du Pillard', 'Totem des Ancêtres', 'Grand Campement', 'Tourneur de Rocs', 'Cache de Guerre', 'Trône de Crânes'],
    ['Vasière Nourricière', 'Carrière de Mousse', 'Fosse à Massues', 'Cuir de Pierre', 'Gué Secret', 'Troc des Marais', 'Hutte du Sorcier', 'Grand Terrier', 'Lance-Blocs', 'Panse Géante', 'Tas de Trophées'],
    ['Tas d’Or Volé', 'Champignonnière', 'Atelier à Piques', 'Rempart de Bric', 'Tunnels Filous', 'Marché Noir', 'Lampe Étrange', 'Grande Cambuse', 'Usine à Boum', 'Entrepôt Bancal', 'Coffre du Grand Filou'],
    ['Fosse aux Pièces', 'Jardin de Cendres', 'Salle des Os', 'Caveau Scellé', 'Voie des Ombres', 'Ossuaire', 'Cierge Éternel', 'Légion des Tombes', 'Catapulte d’Os', 'Crypte Profonde', 'Trône de la Liche'],
    ['Lit de Braise d’Or', 'Serre de Cendres', 'Forge-Souffle', 'Écailles de Rempart', 'Courant Chaud', 'Tribut du Clan', 'Flamme Sacrée', 'Nid de la Garde', 'Cracheur de Siège', 'Grotte au Trésor', 'Couvée Royale']
  ];
  function buildingsFor(race) {
    var own = RACE_BUILDINGS[race].map(function (name, i) {
      var s = SLOTS[i];
      return { id: 'r' + race + '_' + i, name: name, sym: s.sym || GV.RACES[race].citadel, orn: 'o' + race, req: s.req, cost: s.cost, desc: s.desc, prod: s.prod, eff: s.eff, unique: true };
    });
    return GV.BUILDINGS.concat(own);
  }

  // Sceau de la race, posé sur ses bâtiments propres
  var seals = [
    '<path class="p y" d="M154 38V22L161 30L168 20L175 30L182 22V38Z"></path>',
    '<path class="p m" d="M154 18H182V30H172V44H164V30H154Z"></path>',
    '<path class="p l" d="M168 16Q186 28 168 46Q150 28 168 16Z"></path>',
    '<circle class="p b" cx="168" cy="28" r="12"></circle><path class="k" d="M162 25h4v4h-4zM170 25h4v4h-4z"></path>',
    '<path class="p b" d="M156 40L176 20L172 16L180 18L182 26L178 22L160 44L154 44Z"></path>',
    '<circle class="p m" cx="168" cy="30" r="13"></circle><circle class="p g" cx="168" cy="30" r="5"></circle>',
    '<path class="p b" d="M162 28H174V46H162Z"></path><path class="p y" d="M168 12Q176 22 168 28Q160 22 168 12Z"></path>',
    '<path class="p g" d="M168 12Q182 28 174 44H162Q154 28 168 12Z"></path><path class="p y" d="M168 26Q173 34 170 42H166Q163 34 168 26Z"></path>'
  ];
  window.GV_SPRITES += seals.map(function (s, i) {
    return '<symbol id="o' + i + '" viewBox="0 0 200 180"><circle class="p k" cx="168" cy="30" r="24"></circle>' + s + '</symbol>';
  }).join('');

  // Décors à défricher sur la base
  window.GV_SPRITES += '<symbol id="dcTree" viewBox="0 0 52 58"><path class="p w" d="M22 58V36H30V58Z"></path><path class="p" fill="#3fbe58" d="M26 2L6 28L14 40H26Z"></path><path class="p" fill="#1f8a3e" d="M26 2L46 28L38 40H26Z"></path></symbol>' +
    '<symbol id="dcRock" viewBox="0 0 52 58"><path class="p s" d="M6 54L14 26L28 16V54Z"></path><path class="p sd" d="M28 16L44 30L48 54H28Z"></path></symbol>' +
    '<symbol id="dcBush" viewBox="0 0 52 58"><path class="p" fill="#57b84a" d="M6 52L12 32L26 24V52Z"></path><path class="p" fill="#2f8a3a" d="M26 24L40 32L46 52H26Z"></path><circle fill="#ff8ad1" cx="18" cy="38" r="3"></circle><circle fill="#ffd75a" cx="34" cy="40" r="3"></circle></symbol>';

  // Détails peints sur les corps et les monstres : yeux vivants, armures, boucles, reflets
  var DETAILS = {
    t1: '<path class="p wd" d="M44 76H76V82H44Z"></path><circle class="p y" cx="60" cy="79" r="4"></circle><path class="p m" d="M42 50Q33 51 33 61L45 58Z"></path><path class="p m" d="M78 50Q87 51 87 61L75 58Z"></path><path class="y" d="M47 15H73V19H47Z"></path><circle fill="#fff" cx="54" cy="31" r="1.3"></circle><circle fill="#fff" cx="64" cy="31" r="1.3"></circle>',
    t2: '<path class="p wd" d="M36 92H84V100H36Z"></path><path class="p y" d="M54 91H66V101H54Z"></path><path class="p y" d="M46 40H74V44H46Z"></path><path class="p m" d="M34 68Q24 70 24 80L38 76Z"></path><path class="p m" d="M86 68Q96 70 96 80L82 76Z"></path><circle fill="#fff" cx="54" cy="51" r="1.3"></circle><circle fill="#fff" cx="64" cy="51" r="1.3"></circle>',
    t3: '<path class="p y" d="M49 66H71V70H49Z"></path><path class="p l" d="M60 40L54 50L60 60L66 50Z"></path><path class="y" d="M50 19L60 14L70 19L60 23Z"></path><circle fill="#fff" cx="55" cy="27.5" r="1"></circle><circle fill="#fff" cx="64" cy="27.5" r="1"></circle>',
    t4: '<path class="p wd" d="M34 84H86V92H34Z"></path><circle class="p b" cx="60" cy="88" r="6"></circle><path class="k" d="M57 86h2v2h-2zM61 86h2v2h-2z"></path><path class="p n" d="M36 62L52 80M84 62L68 80"></path><path class="p m" d="M46 52L42 42L52 48Z"></path><path class="k" d="M50 40H70V30"></path>',
    t5: '<path class="p b" d="M38 70L30 62L44 62Z"></path><path class="p b" d="M82 70L90 62L76 62Z"></path><path class="p n" d="M40 88Q60 78 80 88"></path><circle class="y" cx="54" cy="36" r="1.4"></circle><circle class="y" cx="66" cy="36" r="1.4"></circle><path class="p b" d="M52 54L50 62L56 58Z"></path>',
    t6: '<path class="p wd" d="M46 100H74V106H46Z"></path><circle class="p m" cx="60" cy="103" r="3"></circle><path class="p m" d="M44 48L60 38L76 48Z"></path><path class="p n" d="M52 72Q60 77 68 72"></path>',
    t7: '<path class="p y" d="M50 92L60 100L70 92L66 110H54Z"></path><circle fill="#b070ff" cx="53.5" cy="27.5" r="2"></circle><circle fill="#b070ff" cx="66.5" cy="27.5" r="2"></circle><path class="k" d="M55 42h2v5h-2zM59 42h2v5h-2zM63 42h2v5h-2z"></path>',
    t8: '<path class="p y" d="M46 74H74V80H46Z"></path><path class="p l" d="M44 56L60 48L76 56L60 66Z"></path><path class="p d" d="M74 22L84 16L82 26Z"></path><path class="p n" d="M46 30L60 34L78 32"></path>',
    m1: '<circle fill="#ffd75a" cx="100" cy="50" r="4"></circle><circle fill="#120e0a" cx="100" cy="50" r="2"></circle><path class="p n" d="M30 24L48 74M42 28L58 76"></path><path class="p g" d="M46 92L74 86L78 102L50 108Z"></path>',
    m2: '<path class="p n" d="M36 42H84M36 90H84M42 42V90M78 42V90"></path><circle class="p y" cx="40" cy="48" r="2.5"></circle><circle class="p y" cx="80" cy="48" r="2.5"></circle><circle class="p y" cx="40" cy="84" r="2.5"></circle><circle class="p y" cx="80" cy="84" r="2.5"></circle>',
    m3: '<path class="p n" d="M52 86L58 124M66 88L62 124M50 60L56 80"></path><circle class="p l" cx="40" cy="20" r="6"></circle><circle class="p l" cx="82" cy="24" r="6"></circle><path class="k" d="M54 88Q60 96 66 88Q60 92 54 88Z"></path>',
    m4: '<path class="p n" d="M40 56L44 76M56 54L58 78M24 64L28 86"></path><path class="p m" d="M26 62L18 52L32 56Z"></path><path class="p m" d="M46 54L40 42L54 50Z"></path><circle fill="#120e0a" cx="96" cy="68" r="1.5"></circle>',
    m5: '<path class="p n" d="M28 118Q60 100 92 118"></path><path class="p l" d="M40 110L44 100L50 110Z"></path><path class="p l" d="M60 106L64 96L70 106Z"></path><path class="p b" d="M46 34L48 42L52 34Z"></path><path class="p b" d="M68 34L70 42L74 34Z"></path>',
    m6: '<path class="p y" d="M60 94L66 100L60 110L54 100Z"></path><circle fill="#e0263c" cx="48" cy="72" r="2"></circle><circle fill="#e0263c" cx="72" cy="72" r="2"></circle>',
    m7: '<path class="p n" d="M14 32L40 72M28 42L46 74M106 32L80 72M92 42L74 74"></path><circle class="g" cx="51" cy="35" r="2.5"></circle><circle class="g" cx="69" cy="35" r="2.5"></circle>',
    m8: '<path class="p n" d="M14 26L34 78M26 36L44 76"></path><path class="p l" d="M50 88L60 80L70 92L60 104Z"></path><circle fill="#ffd75a" cx="96" cy="32" r="3"></circle><circle fill="#120e0a" cx="96" cy="32" r="1.5"></circle>'
  };
  Object.keys(DETAILS).forEach(function (id) {
    window.GV_SPRITES = window.GV_SPRITES.replace(new RegExp('(<symbol id="' + id + '"[\\s\\S]*?)</symbol>'), function (m, head) { return head + DETAILS[id] + '</symbol>'; });
  });

  // --- Héros : trois voies par peuple ---
  var HERO_ARCH = [
    { name: 'Guerrier', ability: 'Tourbillon', desc: 'Blesse tous les ennemis autour de lui', hp: 387, atk: 29 },
    { name: 'Stratège', ability: 'Ordre de bataille', desc: 'Toute l’armée frappe plus fort pendant 8 secondes', hp: 294, atk: 29 },
    { name: 'Mystique', ability: 'Rayon de vitrail', desc: 'Soigne l’armée et brûle l’ennemi le plus proche', hp: 282, atk: 28 }
  ];
  var HERO_NAMES = [
    ['Dame Aldéric', 'Connétable Maur', 'Sœur Ysaline'], ['Thrain Pied-de-Fer', 'Dorga la Maîtresse', 'Grimm le Runique'], ['Lysandre', 'Sylvaine l’Archère', 'Oriel de Lune'], ['Gorak Crâne-Fendu', 'Urzha la Rusée', 'Vieux Mogh'],
    ['Brak le Colosse', 'Mère Vase', 'Ombre-des-Marais'], ['Grik Tranche-Doigt', 'Zizi la Mèche', 'Professeur Boum'], ['Sire Oswin le Pâle', 'Maréchale Nyx', 'Vaelis la Liche'], ['Kaerth Griffe-Ardente', 'Syra des Cendres', 'Oracle Ignis']
  ];
  var HERO_SKILLS = [
    { id: 'atk', name: 'Force', desc: '+6 % d’attaque par rang', max: 5, lv: 1 },
    { id: 'hp', name: 'Endurance', desc: '+8 % de points de vie par rang', max: 5, lv: 1 },
    { id: 'aura', name: 'Commandement', desc: '+2 % d’attaque à toute l’armée par rang', max: 5, lv: 3 },
    { id: 'ab', name: 'Maîtrise', desc: '+12 % de puissance de capacité par rang', max: 5, lv: 5 },
    { id: 'cd', name: 'Vivacité', desc: 'Capacité 6 % plus fréquente par rang', max: 5, lv: 8 },
    { id: 'spd', name: 'Marche forcée', desc: '+5 % de vitesse par rang', max: 3, lv: 12 }
  ];
  var RARITY = [
    { name: 'Commun', color: '#c9c6d8', m: 1, w: 50 }, { name: 'Rare', color: '#6fb6ff', m: 1.6, w: 30 }, { name: 'Épique', color: '#c58bff', m: 2.4, w: 14 }, { name: 'Légendaire', color: '#ffb02e', m: 3.5, w: 5 }, { name: 'Vitrail', color: '#ff5fa2', m: 5, w: 1 }
  ];
  var ITEM_NAMES = {
    w: ['Lame', 'Hache', 'Masse', 'Marteau', 'Faux', 'Trident'], a: ['Cuirasse', 'Haubert', 'Plastron', 'Manteau', 'Égide', 'Heaume'], r: ['Amulette', 'Bague', 'Relique', 'Sceau', 'Talisman', 'Calice']
  };
  var ITEM_FORMS = ['wsw', 'wax', 'wmc', 'whm', 'wsc', 'wtr'];
  var ITEM_OF = ['de l’Aube', 'des Rois', 'du Crépuscule', 'de Braise', 'du Givre', 'des Anciens', 'de Lumière', 'du Vitrail'];

  var ACHIEVEMENTS = [
    { id: 'w1', key: 'win', goal: 1, name: 'Première victoire', eclats: 3 }, { id: 'w2', key: 'win', goal: 25, name: 'Vétéran', eclats: 10 }, { id: 'w3', key: 'win', goal: 100, name: 'Seigneur de guerre', eclats: 30 },
    { id: 'b1', key: 'boss', goal: 1, name: 'Briseur de donjon', eclats: 5 }, { id: 'b2', key: 'boss', goal: 8, name: 'Conquérant', eclats: 25 },
    { id: 'c1', key: 'build', goal: 10, name: 'Bâtisseur', eclats: 5 }, { id: 'c2', key: 'build', goal: 50, name: 'Architecte', eclats: 15 },
    { id: 'r1', key: 'recruit', goal: 20, name: 'Sergent recruteur', eclats: 5 }, { id: 'f1', key: 'forge', goal: 5, name: 'Maître forgeron', eclats: 8 },
    { id: 'm1', key: 'meet', goal: 1, name: 'Premier éclat relié', eclats: 5 }, { id: 'm2', key: 'meet', goal: 5, name: 'Mosaïque', eclats: 25 },
    { id: 's1', key: 'send', goal: 5, name: 'Maître des messagers', eclats: 8 }, { id: 'k1', key: 'market', goal: 20, name: 'Négociant', eclats: 8 },
    { id: 'd1', key: 'raid', goal: 3, name: 'Gardien de la cité', eclats: 10 }, { id: 'l1', key: 'loot', goal: 10, name: 'Chasseur de trésors', eclats: 10 }, { id: 'h1', key: 'herolv', goal: 10, name: 'Héros reconnu', eclats: 15 }
  ];
  GV.HERO_ARCH = HERO_ARCH; GV.HERO_NAMES = HERO_NAMES; GV.HERO_SKILLS = HERO_SKILLS; GV.RARITY = RARITY; GV.ITEM_NAMES = ITEM_NAMES; GV.ITEM_FORMS = ITEM_FORMS; GV.ITEM_OF = ITEM_OF; GV.ACHIEVEMENTS = ACHIEVEMENTS;

  // --- Pouvoirs de race : le joueur choisit le moment, les deux téléphones les calculent à l'identique ---
  var POWERS = [
    { name: 'Cri de ralliement', desc: '+25 % d’attaque pendant 8 secondes' },
    { name: 'Mur de boucliers', desc: '35 % de dégâts en moins pendant 5 secondes' },
    { name: 'Pluie de flèches', desc: 'Touche toutes les unités ennemies' },
    { name: 'Hurlement de guerre', desc: '+40 % de vitesse et +15 % d’attaque pendant 7 secondes' },
    { name: 'Peau de pierre', desc: 'Soigne 18 % des points de vie de toute l\u2019armée' },
    { name: 'Grosse explosion', desc: 'Gros dégâts au cœur de l’armée ennemie' },
    { name: 'Appel des tombes', desc: 'Relève 2 unités tombées' },
    { name: 'Souffle de feu', desc: 'Brûle toute l’armée ennemie pendant 6 secondes' }
  ];
  var POWER_TIMES = ['Dès le début', 'À 60 % de vie', 'À 30 % de vie'];

  var SKINS = [
    { name: 'Aurore', cost: 15, g: '#ff8ad1', d: '#b03c86', l: '#ffd0ec' },
    { name: 'Givre', cost: 15, g: '#9fe6ff', d: '#3f8fc0', l: '#eafaff' },
    { name: 'Forêt', cost: 15, g: '#3fae4a', d: '#1c6a2a', l: '#a9e88a' },
    { name: 'Sang-Royal', cost: 25, g: '#b5121f', d: '#5f0812', l: '#ffd75a' },
    { name: 'Nuit', cost: 25, g: '#2a2740', d: '#14121f', l: '#8d86c9' },
    { name: 'Feuille d’or', cost: 40, g: '#f2c531', d: '#a97c14', l: '#fff3b0' },
    { name: 'Nacre', cost: 40, g: '#efeaf7', d: '#a9a2c4', l: '#ffffff' },
    { name: 'Vitrail ardent', cost: 60, g: '#ff3d7f', d: '#5a1fb0', l: '#ffb02e' }
  ];

  var QUESTS = [
    { key: 'win', goal: 2, text: 'Gagner 2 combats', reward: { eclats: 3 } },
    { key: 'build', goal: 3, text: 'Construire ou améliorer 3 bâtiments', reward: { or: 400 } },
    { key: 'recruit', goal: 5, text: 'Recruter 5 unités', reward: { ble: 300, fer: 150 } },
    { key: 'forge', goal: 1, text: 'Forger une arme', reward: { eclats: 4 } },
    { key: 'meet', goal: 1, text: 'Relier ton éclat à un ami', reward: { lumiere: 25, eclats: 3 } },
    { key: 'market', goal: 2, text: 'Faire 2 affaires au marché', reward: { or: 200 } },
    { key: 'send', goal: 1, text: 'Confier un envoi à un messager', reward: { lumiere: 15 } },
    { key: 'boss', goal: 1, text: 'Vaincre un boss de campagne', reward: { eclats: 8 } },
    { key: 'win', goal: 5, text: 'Gagner 5 combats', reward: { eclats: 6 } }
  ];

  var PHRASES = ['Salut, on se voit bientôt ?', 'Je prépare une armée terrible.', 'Merci pour ton aide !', 'Tu vas le regretter.', 'Une alliance, ça te dit ?', 'Bien joué pour cette bataille.', 'Ton royaume est magnifique.', 'Prépare tes murailles.'];

  // Recherche : se mène dans la Bibliothèque, une à la fois
  var TECHS = [
    { id: 'tactique', name: 'Tactique', desc: '+5 % d’attaque pour toute l’armée', eff: { atk: 5 }, req: 1, cost: { or: 300, fer: 80 }, min: 10 },
    { id: 'armures', name: 'Armures', desc: '+5 % de points de vie pour toute l’armée', eff: { hp: 5 }, req: 1, cost: { or: 300, fer: 120 }, min: 10 },
    { id: 'agronomie', name: 'Agronomie', desc: '+10 % de production', eff: { prod: 10 }, req: 1, cost: { or: 250, ble: 150 }, min: 8 },
    { id: 'cadastre', name: 'Cadastre', desc: '+15 % d’impôts', eff: { tax: 15 }, req: 2, cost: { or: 400, pierre: 100 }, min: 15 },
    { id: 'conscription', name: 'Conscription', desc: 'Recrues gratuites 15 % plus rapides', eff: { auto: 15 }, req: 2, cost: { or: 450, ble: 200 }, min: 15 },
    { id: 'architecture', name: 'Architecture', desc: 'Chantiers 20 % plus rapides', eff: { build: 20 }, req: 2, cost: { or: 500, bois: 200, pierre: 200 }, min: 20 },
    { id: 'logistique', name: 'Logistique', desc: '+4 % de vitesse', eff: { spd: 4 }, req: 3, cost: { or: 600, ble: 250 }, min: 25 },
    { id: 'entrepots', name: 'Entrepôts', desc: '+30 % de stock maximal', eff: { storage: 30 }, req: 3, cost: { or: 600, bois: 300 }, min: 25 },
    { id: 'balistique', name: 'Balistique', desc: '+15 % de dégâts de siège', eff: { siege: 15 }, req: 4, cost: { or: 800, fer: 250 }, min: 35 },
    { id: 'economat', name: 'Économat', desc: 'Unités 5 % moins chères', eff: { cost: 5 }, req: 4, cost: { or: 900, bois: 200, fer: 150 }, min: 35 },
    { id: 'vitraux', name: 'Grands Vitraux', desc: '+25 % de Lumière maximale en combat', eff: { mana: 25 }, req: 5, cost: { or: 1200, lumiere: 60 }, min: 50 },
    { id: 'etatmajor', name: 'État-major', desc: 'Une place d’armée en plus', eff: { cap: 1 }, req: 6, cost: { or: 1600, fer: 400, lumiere: 80 }, min: 70 }
  ];
  GV.TECHS = TECHS;
  GV.buildingsFor = buildingsFor;
  GV.POWERS = POWERS;
  GV.POWER_TIMES = POWER_TIMES;
  GV.SKINS = SKINS;
  GV.QUESTS = QUESTS;
  GV.PHRASES = PHRASES;
  var baseClass = GV.unitClass;
  GV.unitClass = function (race, uid, skin) {
    return baseClass(race, uid) + (skin >= 0 && uid < 100 ? ' sk' + skin : '');
  };
})();
