// K-DS-0020v2-harbor-bell-fist-raise.js
// 年越し岸壁の拳上げ — 1小節ぶん拳を溜め、楽隊のメドレーの拍子が切り替わる頭の拍でちょうど離して高く突き上げる。最後は新年の鐘の拍
// 操作: 画面のどこでも押し続けると拳を握って溜める(右の溜め柱が伸び、拍ごとに音程が上がる)。溜めの小節(拍ランプが色づき、右上に次の拍子の型が点滅して汽笛が鳴る)の間押し続け、次の拍子の1拍目の頭で指を離すと拳を突き上げて花火が上がる。離しのずれでPERFECT/GOOD。溜めの小節の途中で離す・頭を過ぎても押しっぱなし・押さずに迎える・溜めが半分未満はMISS。溜めの小節の前の自由な小節で押し始めても損はしない(柱は溜めの小節の頭から伸びる)
// 終わり: 4拍子→3拍子→2拍子→3拍子→4拍子(カウントダウン)の5曲メドレー(約15秒・突き上げ5回)を通してMISS2回以内ならCLEAR(判定×溜めの点+新年の鐘ボーナス)。MISS3回でGAME OVER
// @mechanic: hold_charge
// @theme: harbor_new_year_fist_medley
// 世界観: 大晦日の夜の港の岸壁で、年越しの見物客の青年が、楽隊のメドレーの拍子が切り替わるたびに溜めた拳を突き上げ、最後は新年の鐘の一打に合わせて一番高く突き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・最高の溜め(%)
// スタイル: MODE7 PSEUDO
var STYLE = { bg: ['#0b1030', '#2a1d5c', '#6b3f7f'], main: ['#2e3a5c', '#4a5a85', '#f4c24f'], accent: ['#ff5f8f', '#78e2ff'] };

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODE7 PSEUDO: 地平線へ収束する岸壁の石畳を横ストリップで描き、奥ほど横を圧縮。空は地平グラデ。人や楽隊は奥行きで縮む
  var C = {
    sky0: STYLE.bg[0], sky1: STYLE.bg[1], glow: STYLE.bg[2],
    stoneD: STYLE.main[0], stoneL: STYLE.main[1], gold: STYLE.main[2],
    pink: STYLE.accent[0], cyan: STYLE.accent[1],
    sea0: '#0a1636', sea1: '#14295a', ink: '#060818', white: '#ffffff', red: '#ff4a5a',
    coat: '#c8503a', coatD: '#8a3226', hat: '#e8e2d0', skin: '#f3c9a0', hair: '#3a2a22',
  };

  var GAME_TITLE = 'MIDNIGHT FIST';
  var BPM = 132;
  var SPB = 60 / BPM;
  var PERFECT_W = 0.07;
  var GOOD_W = 0.15;
  var MISS_MAX = 3;
  var CX = W / 2;

  // メドレー: 各曲 = 自由な小節 + 溜めの小節。溜めの小節の次の頭(拍子が切り替わる拍)で離す
  var SEGS = [
    { m: 4, col: C.gold }, { m: 3, col: C.cyan }, { m: 2, col: C.pink }, { m: 3, col: C.cyan }, { m: 4, col: C.gold, fin: true },
  ];
  var BARS = [];
  var TGT = [];
  (function buildMedley() {
    var b = 0;
    for (var i = 0; i < SEGS.length; i++) {
      BARS.push({ seg: i, charge: false, m: SEGS[i].m, start: b }); b += SEGS[i].m;
      BARS.push({ seg: i, charge: true, m: SEGS[i].m, start: b }); b += SEGS[i].m;
      TGT.push({ beat: b, cs: b - SEGS[i].m, m: SEGS[i].m, fin: !!SEGS[i].fin });
    }
    BARS.push({ seg: SEGS.length, charge: false, m: 4, start: b, fin: true });
  })();
  var TIME_LIMIT = TGT[TGT.length - 1].beat * SPB + 1.4;

  // 楽隊のメドレー(オリジナル)。1小節ずつ、小節の頭に合わせて鳴らす
  var PH = [
    { n: [['C5', 1], ['E5', 0.5], ['G5', 0.5], ['E5', 1], ['C5', 1]], b: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]] },
    { n: [['G4', 1], ['A4', 1], ['B4', 1], ['D5', 1]], b: [['G2', 1], ['G2', 1], ['G2', 1], ['B2', 1]] },
    { n: [['A4', 1], ['C5', 1], ['E5', 1]], b: [['A2', 1], ['E3', 1], ['E3', 1]] },
    { n: [['E5', 1], ['F5', 1], ['G#5', 1]], b: [['E2', 1], ['E3', 1], ['E3', 1]] },
    { n: [['D5', 0.5], ['F#5', 0.5], ['A5', 0.5], ['F#5', 0.5]], b: [['D3', 1], ['A2', 1]] },
    { n: [['A4', 0.5], ['B4', 0.5], ['C#5', 0.5], ['E5', 0.5]], b: [['A2', 1], ['E3', 1]] },
    { n: [['F5', 1], ['A5', 1], ['C6', 1]], b: [['F2', 1], ['C3', 1], ['C3', 1]] },
    { n: [['C5', 1], ['D5', 1], ['E5', 1]], b: [['C2', 1], ['G2', 1], ['G2', 1]] },
    { n: [['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 1], ['E5', 1]], b: [['C3', 1], ['G2', 1], ['C3', 1], ['G2', 1]] },
    { n: [['G4', 1], ['G4', 1], ['G4', 1], ['B4', 1]], b: [['G2', 1], ['A2', 1], ['B2', 1], ['D3', 1]] },
    { n: [['C6', 1], ['G5', 0.5], ['E5', 0.5], ['C6', 2]], b: [['C3', 2], ['C3', 2]] },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var demoMode, running, beatN, beatT, songT, readyT, schedBar;
  var cur, results, holding, pressAt, holdFor, hitStop, flashT, frameT, raiseT, raiseQ, relaxT;
  var score, perfects, goods, misses, bestCh, nearOff, over, won, outroT, prevBest, milestone;
  var rockets, sparks, crowdUpT, bellSwing, kickT;

  function barAt(b) {
    for (var i = 0; i < BARS.length; i++) if (b >= BARS[i].start && b < BARS[i].start + BARS[i].m) return i;
    return BARS.length - 1;
  }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; schedBar = 0;
    readyT = isDemo ? 0 : 0.8;
    cur = 0; results = []; holding = false; pressAt = 0; holdFor = -1;
    hitStop = 0; flashT = 0; frameT = 0; raiseT = 0; raiseQ = 0; relaxT = 0;
    score = 0; perfects = 0; goods = 0; misses = 0; bestCh = 0; nearOff = -1;
    over = false; won = false; outroT = 0; prevBest = game.best; milestone = false;
    rockets = []; sparks = []; crowdUpT = 0; bellSwing = 0; kickT = 0;
    if (isDemo) startClock();
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0;
    playBar(0); schedBar = 1;
    onBeat(0);
  }

  function playBar(i) {
    if (i >= PH.length) return;
    var v = demoMode ? 0.5 : 1;
    game.audio.melody(PH[i].n, { tempo: BPM, wave: 'square', volume: 0.045 * v, bass: PH[i].b, bassWave: 'triangle', bassVolume: 0.07 * v });
  }

  // ---- 拍クロック(1本だけ) ----
  function onBeat(b) {
    var bi = barAt(b), bar = BARS[bi], pos = b - bar.start;
    var v = demoMode ? 0.5 : 1;
    kickT = 0.16;
    if (pos === 0) game.audio.tone(120, 0.12, { wave: 'triangle', volume: 0.2 * v, slide: -60 });
    else game.audio.tone(2200, 0.03, { wave: 'square', volume: 0.025 * v });
    if (bar.charge) {
      if (pos === 0 && !bar.fin) {
        // 次の拍子の予告: 汽笛 + 右上の型が点滅
        game.audio.tone(196, 0.32, { wave: 'sawtooth', volume: 0.05 * v });
        game.audio.tone(247, 0.32, { wave: 'sine', volume: 0.06 * v });
      }
      if (SEGS[bar.seg].fin) game.audio.tone(880, 0.25, { wave: 'sine', volume: 0.12 * v });
      if (holding) game.audio.tone([523, 659, 784, 1047][Math.min(3, pos)], 0.07, { wave: 'square', volume: 0.07 * v });
      if (pos === bar.m - 1) game.audio.tone(1320, 0.05, { wave: 'triangle', volume: 0.08 * v });
    }
    // 拍子の切り替わりの頭: 見物客がそろって拳を上げる
    for (var k = 0; k < TGT.length; k++) if (TGT[k].beat === b) { crowdUpT = 0.5; if (TGT[k].fin) { bellSwing = 1; game.audio.tone(660, 0.9, { wave: 'sine', volume: 0.16 * v }); game.audio.tone(990, 0.6, { wave: 'sine', volume: 0.06 * v }); } }
  }

  function stepPlay(dt) {
    if (!running) return;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; onBeat(beatN); }
    songT = beatN * SPB + beatT;
    // 小節の頭の少し前に次の小節の旋律を仕込む(発音の遅れを吸収)
    if (schedBar < BARS.length && songT >= BARS[schedBar].start * SPB - 0.06) { playBar(schedBar); schedBar++; }
    if (cur < TGT.length && songT > TGT[cur].beat * SPB + GOOD_W) missNow(holding ? 'late' : 'none', holding ? GOOD_W : -1);
    if (!demoMode && !over && cur >= TGT.length && songT > TGT[TGT.length - 1].beat * SPB + 1.2) finish(misses < MISS_MAX);
    if (!demoMode && !over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
  }

  function chargeNow(tg) {
    if (!holding) return 0;
    var from = Math.max(pressAt, tg.cs * SPB);
    return Math.max(0, Math.min(1, (songT - from) / (tg.m * SPB)));
  }

  function judge(off) {
    var a = Math.abs(off);
    return a <= PERFECT_W ? 'PERFECT' : (a <= GOOD_W ? 'GOOD' : 'MISS');
  }

  var PX = CX - 40, PY = Math.round(H * 0.865);

  function missNow(why, off) {
    results[cur] = 'miss';
    cur++;
    misses++;
    if (off !== undefined && off >= 0 && (nearOff < 0 || off < nearOff)) nearOff = off;
    hitStop = 0.42; flashT = 0.42;
    game.feedback.bad(PX, PY - 330, { text: 'MISS', shake: demoMode ? 4 : 12 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function award(w, ch, tg) {
    results[cur] = w;
    cur++;
    var base = w === 'PERFECT' ? 100 : 60;
    var pts = Math.round(base * (0.5 + 0.5 * ch)) * (tg.fin ? 2 : 1);
    score += pts;
    if (w === 'PERFECT') perfects++; else goods++;
    bestCh = Math.max(bestCh, ch);
    raiseT = 0.7; raiseQ = ch * (w === 'PERFECT' ? 1 : 0.75);
    launch(raiseQ, tg.fin);
    game.feedback.good(PX, PY - 360, { text: w, color: w === 'PERFECT' ? C.gold : C.cyan, size: w === 'PERFECT' ? 60 : 50, count: 10, volume: 0.25 });
    if (tg.fin) {
      for (var i = 0; i < 3; i++) launch(0.6 + i * 0.15, true);
      game.fx.flash('#ffffff', 0.15);
    }
    var cleared = perfects + goods;
    if (!demoMode && cleared === 3 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(cleared + ' / ' + TGT.length, CX, 520, { color: C.gold, size: 80 });
    }
  }

  function pressAction() {
    if (!running || hitStop > 0 || holding) return 'none';
    holding = true; pressAt = songT; holdFor = cur;
    return 'ok';
  }

  function releaseAction() {
    if (!holding) return 'none';
    if (!running || cur >= TGT.length) { holding = false; return 'none'; }
    var tg = TGT[cur];
    var off = songT - tg.beat * SPB;
    var ch = chargeNow(tg);
    holding = false;
    if (songT < tg.cs * SPB) { relaxT = 0.25; return 'relax'; }   // 自由な小節で手を開いただけ
    if (off < -GOOD_W) { missNow('early', -off); return 'miss'; }
    var w = judge(off);
    if (w === 'MISS') { missNow('late', Math.abs(off)); return 'miss'; }
    if (ch < 0.5) { missNow('weak'); return 'miss'; }
    award(w, ch, tg);
    return 'ok';
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.6; running = false; holding = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) launch(0.5 + i * 0.12, true);
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 花火(拳の高さ = 花火の高さ) ----
  var ROCKET_COLS = [C.gold, C.pink, C.cyan, '#ffffff'];
  function launch(q, big) {
    var x = game.random(160, W - 160);
    rockets.push({ x: x, y: HZ, ty: HZ - 120 - q * 380, col: ROCKET_COLS[Math.floor(game.random(0, 4)) % 4], big: !!big });
  }
  function stepFx(dt) {
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      r.y -= 1100 * dt;
      if (r.y <= r.ty) {
        var n = r.big ? 22 : 14;
        for (var k = 0; k < n; k++) {
          var a = (k / n) * Math.PI * 2;
          var sp = (r.big ? 330 : 240) * (0.8 + (k % 3) * 0.1);
          sparks.push({ x: r.x, y: r.ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.1, col: r.col });
        }
        game.audio.tone(90, 0.18, { wave: 'triangle', volume: demoMode ? 0.05 : 0.1, slide: -40 });
        rockets.splice(i, 1);
      }
    }
    for (var j = sparks.length - 1; j >= 0; j--) {
      var s = sparks[j];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.vx *= 0.985; s.life -= dt;
      if (s.life <= 0) sparks.splice(j, 1);
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || over || readyT > 0) return;
    var res = pressAction();
    if (res === 'ok') game.audio.play('se_tap', 0.25);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || over) { holding = false; return; }
    var res = releaseAction();
    if (res === 'relax') game.audio.tone(330, 0.05, { wave: 'sine', volume: 0.05 });
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; return; }
  });

  // ---- 描画 ----
  var HZ = Math.round(H * 0.365), QY = Math.round(H * 0.443), CAMK = 900, UNIT = 540;
  function shiftAt(z) {
    var t = game.time.elapsed;
    return Math.sin(t * 0.21) * 0.12 + Math.sin(t * 0.35) * 0.012 * z;
  }
  function proj(wx, z) {
    return { x: CX + (wx - shiftAt(z)) * UNIT / z, y: HZ + CAMK / z, s: 1 / z };
  }

  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var STARS = [];
  for (var si = 0; si < 40; si++) STARS.push({ x: (si * 263) % W, y: 240 + ((si * 137) % 420), r: 2 + (si % 3) });
  var CITY = [];
  for (var ci = 0; ci < 18; ci++) CITY.push({ x: ci * 62, w: 50 + (ci * 17) % 30, h: 20 + (ci * 29) % 60 });

  function drawSky() {
    var t = game.time.elapsed;
    game.draw.gradient(0, HZ, [[0, C.sky0], [0.65, C.sky1], [1, C.glow]]);
    for (var i = 0; i < STARS.length; i++) {
      var st = STARS[i];
      game.draw.rect(st.x, st.y, st.r, st.r, C.white, 0.3 + 0.3 * Math.sin(t * 2 + i));
    }
    // 対岸の街の灯(地平線)
    for (var c = 0; c < CITY.length; c++) {
      var b = CITY[c];
      game.draw.rect(b.x, HZ - b.h, b.w, b.h, '#1a1438');
      if (c % 2 === 0) game.draw.rect(b.x + 10, HZ - b.h + 8, 6, 6, C.gold, 0.7);
    }
    // 灯台
    game.draw.rect(70, HZ - 150, 26, 150, '#d8d0e8');
    game.draw.rect(64, HZ - 170, 38, 22, C.gold);
    var beam = Math.sin(t * 1.3);
    game.draw.line(83, HZ - 160, 83 + beam * 260, HZ - 190, C.gold, 3);
  }

  function drawSparks() {
    for (var i = 0; i < rockets.length; i++) {
      var r = rockets[i];
      game.draw.circle(r.x, r.y, 7, r.col);
      game.draw.rect(r.x - 2, r.y, 4, 40, r.col, 0.4);
    }
    for (var j = 0; j < sparks.length; j++) {
      var s = sparks[j];
      if (s.y < HZ) {
        game.draw.circle(s.x, s.y, 9 * Math.max(0.3, s.life), s.col, Math.min(1, s.life));
        game.draw.circle(s.x, s.y, 20 * Math.max(0.3, s.life), s.col, 0.15 * s.life);
      }
    }
  }

  function drawSea() {
    var t = game.time.elapsed;
    for (var y = HZ; y < QY; y += 4) {
      var z = CAMK / (y + 2 - HZ);
      var odd = y < HZ + 16 ? 0 : (Math.floor(z * 0.6 + t * 1.4) & 1);
      game.draw.rect(0, y, W, 4, odd ? C.sea1 : C.sea0);
    }
    // 花火の映り込み(横に伸びた帯)
    for (var j = 0; j < sparks.length; j += 3) {
      var s = sparks[j];
      if (s.y < HZ) {
        var ry = HZ + (HZ - s.y) * 0.25;
        if (ry < QY) game.draw.rect(s.x - 24, ry, 48, 4, s.col, 0.35 * s.life);
      }
    }
    game.draw.rect(0, HZ, W, 3, C.glow, 0.8);
  }

  function drawFloor() {
    for (var y = QY; y < H; y += 8) {
      var z = CAMK / (y + 4 - HZ);
      var upx = UNIT / z;
      var tile = 0.5;
      var row = Math.floor(z / tile);
      var sh = shiftAt(z);
      var tw = tile * upx;
      var c0 = Math.floor((sh - CX / upx) / tile);
      var sx = CX + (c0 * tile - sh) * upx;
      game.draw.rect(0, y, W, 8, C.stoneD);
      for (var c = c0; sx < W; c++, sx += tw) {
        if (((c + row) & 1) === 0) game.draw.rect(sx, y, tw, 8, C.stoneL);
      }
    }
    // 岸壁の縁と地平のもや
    game.draw.rect(0, QY, W, 10, C.gold, 0.5);
    for (var f = 0; f < 5; f++) game.draw.rect(0, QY + f * 28, W, 28, C.glow, 0.32 - f * 0.06);
  }

  function softShadow(x, y, w) {
    for (var i = -2; i <= 2; i++) game.draw.circle(x + i * w * 0.16, y, w * (0.2 - Math.abs(i) * 0.04), C.ink, 0.22);
  }

  var CROWD = [
    ['.hhhh.', 'hhhhhh', '.kkkk.', 'cccccc', 'cccccc', 'cccccc', '.l..l.', '.l..l.'],
    ['.hhhh.', 'hhhhhh', 'ckkkkc', 'c.cc.c', '..cc..', '..cc..', '.l..l.', '.l..l.'],
  ];
  var CROWD_UP = ['c.hh.c', 'chhhhc', 'ckkkkc', '.cccc.', '.cccc.', '.cccc.', '.l..l.', '.l..l.'];
  var PEOPLE = [
    { wx: -1.7, z: 4.8, c: '#5b7fd0' }, { wx: -0.6, z: 5.4, c: '#d07a5b' }, { wx: 0.5, z: 4.4, c: '#7fbf7a' },
    { wx: 1.0, z: 3.4, c: '#b06ad0' }, { wx: -0.4, z: 2.6, c: '#d0b05b' }, { wx: 0.9, z: 2.1, c: '#5bc0d0' },
  ];
  var BAND = [
    ['..hh..', '.hhhh.', '.fefe.', '.ffff.', 'rrrrrr', 'rgrrrr', 'rgrrrr', '.l..l.'],
    ['..hh..', '.hhhh.', '.fefe.', '.ffff.', 'rrrrrr', 'rrrrgr', 'rrrrgr', '.l..l.'],
  ];

  function drawPeople() {
    var items = [];
    for (var i = 0; i < PEOPLE.length; i++) items.push({ k: 'p', o: PEOPLE[i], z: PEOPLE[i].z });
    for (var b = 0; b < 3; b++) items.push({ k: 'b', o: { wx: -2.6 + b * 0.45, z: 3.0 }, z: 3.0, i: b });
    items.push({ k: 'bell', o: { wx: 2.4, z: 4.6 }, z: 4.6 });
    items.sort(function(a, b2) { return b2.z - a.z; });
    for (var j = 0; j < items.length; j++) {
      var it = items[j], p = proj(it.o.wx, it.o.z), px = 26 * p.s;
      var dim = it.z > 4 ? 0.7 : 1;
      if (it.k === 'p') {
        softShadow(p.x, p.y, 120 * p.s * 3);
        var up = crowdUpT > 0;
        var hop = up ? -40 * p.s * 3 : Math.sin(game.time.elapsed * 3 + it.o.wx) * 2;
        game.draw.sprite(up ? CROWD_UP : CROWD[(beatN + j) % 2], { h: '#e8e2d0', k: C.hair, c: it.o.c, l: '#20243a' }, p.x, p.y - 4 * px + hop, px, { anchor: 'center', alpha: dim });
      } else if (it.k === 'b') {
        softShadow(p.x, p.y, 120 * p.s * 3);
        var bob = kickT > 0 ? -6 : 0;
        game.draw.sprite(BAND[(beatN + it.i) % 2], { h: '#1c1c40', f: C.skin, e: C.ink, r: '#c03040', g: C.gold, l: '#20243a' }, p.x, p.y - 4 * px + bob, px, { anchor: 'center', alpha: dim });
        game.draw.circle(p.x + 3 * px, p.y - 4 * px + bob, px * 1.4, C.gold, 0.9);
      } else {
        // 鐘やぐら
        var top = p.y - 360 * p.s * 3;
        game.draw.rect(p.x - 40 * p.s * 3, top, 10 * p.s * 3, p.y - top, '#4a3a2a', dim);
        game.draw.rect(p.x + 30 * p.s * 3, top, 10 * p.s * 3, p.y - top, '#4a3a2a', dim);
        game.draw.rect(p.x - 52 * p.s * 3, top - 12, 104 * p.s * 3, 16, '#6a4a2a', dim);
        var sw = Math.sin(game.time.elapsed * 14) * bellSwing * 18;
        game.draw.circle(p.x + sw, top + 70 * p.s * 3, 34 * p.s * 3, C.gold, dim);
        game.draw.rect(p.x - 36 * p.s * 3 + sw, top + 80 * p.s * 3, 72 * p.s * 3, 16, C.gold, dim);
        if (bellSwing > 0) game.draw.circle(p.x, top + 70 * p.s * 3, 90 * bellSwing, C.gold, 0.25 * bellSwing);
      }
    }
  }

  // 主役: 毛糸帽の青年(斜め後ろ姿、横顔の目が見える)
  var HERO = [
    ['....pp....', '...hhhh...', '..hhhhhh..', '..hhhhhh..', '..kkfeff..', '..kkffff..', '...kfff...', '.ssssssss.', 'cccccccccc', 'cccccccccc', 'cccdcccccc', 'cccdcccccc', '.cccccccc.', '..ll..ll..', '..ll..ll..', '.bbb..bbb.'],
    ['....pp....', '...hhhh...', '..hhhhhh..', '..hhhhhh..', '..kkfeff..', '..kkffff..', '...kfff...', '.ssssssss.', 'cccccccccc', 'cccccccccc', 'cccdcccccc', '.cccccccc.', '..ll..ll..', '.lll..lll.', '.bbb..bbb.', '..........'],
  ];
  var HPAL = { p: C.pink, h: C.hat, k: C.hair, f: C.skin, e: C.ink, s: C.pink, c: C.coat, d: C.coatD, l: '#262a40', b: '#141626' };

  function drawHero() {
    var t = game.time.elapsed;
    var tg = TGT[Math.min(cur, TGT.length - 1)];
    var ch = holding && cur < TGT.length ? chargeNow(tg) : 0;
    var crouch = holding ? 1 : 0;
    var white = flashT > 0;
    var sc = white ? 1 + (flashT / 0.42) * 0.25 : 1;
    var px = 15 * sc;
    var y = PY + crouch * 14 + (holding ? 0 : Math.sin(t * 3) * 4);
    softShadow(PX, PY + 128, 420);
    game.draw.sprite(HERO[crouch], white ? { p: '#fff', h: '#fff', k: '#fff', f: '#fff', e: '#fff', s: '#fff', c: '#fff', d: '#fff', l: '#fff', b: '#fff' } : HPAL, PX, y, px, { anchor: 'center' });
    // 腕と拳
    var shX = PX + 70, shY = y - 40;
    if (raiseT > 0) {
      var len = 140 + raiseQ * 190;
      game.draw.line(shX, shY, shX + 10, shY - len, C.coat, 26);
      game.draw.circle(shX + 10, shY - len, 30, C.skin);
      game.draw.circle(shX + 10, shY - len, 60 + raiseQ * 40, C.gold, 0.25 * (raiseT / 0.7));
    } else {
      var fx = shX + 30, fy = shY + 50 + crouch * 10;
      game.draw.line(shX, shY, fx, fy, C.coat, 26);
      if (holding) {
        var shake = ch >= 1 ? Math.sin(t * 60) * 3 : 0;
        game.draw.circle(fx + shake, fy, 40 + ch * 70, C.gold, 0.12 + ch * 0.25);
        game.draw.circle(fx + shake, fy, 24 + ch * 30, C.gold, 0.35);
      }
      game.draw.circle(fx, fy, relaxT > 0 ? 22 : 28, C.skin);
    }
  }

  function drawChargeColumn() {
    var tg = TGT[Math.min(cur, TGT.length - 1)];
    var ch = holding && cur < TGT.length ? chargeNow(tg) : 0;
    var x = 860, y0 = 1820, hgt = 380, w = 90;
    var col = SEGS[Math.min(cur, SEGS.length - 1)].col;
    game.draw.rect(x - 6, y0 - hgt - 6, w + 12, hgt + 12, C.ink, 0.7);
    game.draw.rect(x, y0 - hgt * ch, w, hgt * ch, col, 0.9);
    for (var i = 1; i < tg.m; i++) game.draw.rect(x, y0 - (hgt * i) / tg.m, w, 4, C.white, 0.6);
    game.draw.rect(x, y0 - hgt * 0.5 - 3, w, 6, C.red, 0.8);
    game.draw.circle(x + w / 2, y0 - hgt - 40, 28, ch >= 1 ? col : C.stoneL);
  }

  function drawBeatStrip() {
    var bi = running ? barAt(beatN) : 0;
    var bar = BARS[bi];
    var pos = beatN - bar.start;
    var col = bar.fin ? C.gold : SEGS[bar.seg].col;
    var gap = 120, x0 = 400 - ((bar.m - 1) * gap) / 2, y = Math.round(H * 0.156);
    game.draw.rect(0, 240, W, 120, C.ink, 0.45);
    for (var i = 0; i < bar.m; i++) {
      var lit = running && i === pos ? 1 - beatT / SPB : 0;
      var rr = i === 0 ? 34 : 26;
      game.draw.circle(x0 + i * gap, y, rr + 6, C.ink);
      game.draw.circle(x0 + i * gap, y, rr, bar.charge ? col : C.stoneL, 0.35 + lit * 0.65);
      if (lit > 0) game.draw.circle(x0 + i * gap, y, rr + 20 * lit, col, 0.3 * lit);
    }
    // 次の拍子の型(溜めの小節で点滅)
    var nb = BARS[Math.min(bi + 1 + (bar.charge ? 0 : 1), BARS.length - 1)];
    var blink = bar.charge && Math.floor(game.time.elapsed * 8) % 2 === 0;
    var bx = 760, bw = 280;
    game.draw.rect(bx, 252, bw, 96, blink ? (nb.fin ? C.gold : SEGS[nb.seg].col) : C.stoneD, blink ? 0.5 : 0.6);
    game.draw.line(bx - 50, 300, bx - 14, 300, C.white, 5);
    game.draw.line(bx - 30, 284, bx - 14, 300, C.white, 5);
    game.draw.line(bx - 30, 316, bx - 14, 300, C.white, 5);
    if (nb.fin && bar.charge) {
      game.draw.circle(bx + bw / 2, 296, 30, C.gold);
      game.draw.rect(bx + bw / 2 - 34, 316, 68, 10, C.gold);
    } else {
      for (var k = 0; k < nb.m; k++) game.draw.circle(bx + bw / 2 - ((nb.m - 1) * 56) / 2 + k * 56, 300, k === 0 ? 20 : 15, C.white, 0.9);
    }
    // 切り替わり直前の拍: 画面の縁が次の色で点滅
    if (running && bar.charge && pos === bar.m - 1 && Math.floor(game.time.elapsed * 12) % 2 === 0) {
      var fc = nb.fin ? C.gold : SEGS[nb.seg].col;
      game.draw.rect(0, 230, W, 12, fc); game.draw.rect(0, H - 12, W, 12, fc);
      game.draw.rect(0, 230, 12, H - 230, fc); game.draw.rect(W - 12, 230, 12, H - 230, fc);
    }
    // 溜めの小節のカウントダウン
    if (running && bar.charge) {
      var left = bar.m - pos;
      var big = SEGS[bar.seg].fin;
      label(String(left), PX, 1290, (big ? 150 : 110) * (1 + (1 - beatT / SPB) * 0.15), big ? C.gold : col);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 230, C.ink, 0.8);
    label('SCORE ' + score, 50, 96, 52, C.white, 'left');
    label('BEST ' + prevBest, 50, 168, 32, C.gold, 'left');
    for (var i = 0; i < TGT.length; i++) {
      var x = W - 380 + i * 70, r = results[i];
      game.draw.circle(x, 80, 26, r === 'miss' ? C.red : (r ? SEGS[i].col : C.stoneD));
      for (var d = 0; d < TGT[i].m; d++) game.draw.circle(x - ((TGT[i].m - 1) * 10) / 2 + d * 10, 80, 3, C.white, 0.8);
    }
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 240 + m * 70, 168, 18, m < misses ? C.red : C.stoneD);
  }

  function drawScene(dt) {
    drawSky();
    drawSparks();
    drawSea();
    drawFloor();
    drawPeople();
    drawHero();
    drawChargeColumn();
    drawBeatStrip();
  }

  // ---- ATTRACT: 実ロジックで1曲目はぴったり、3拍子の曲で4拍数えてしまいMISS、2拍子の曲で決める ----
  var demo = { t: 0 };
  var DEMO_LEN = (TGT[2].beat + 3) * SPB + 0.2;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) initGame(true);
    if (running && cur < TGT.length && hitStop <= 0) {
      var tg = TGT[cur], nt = songT + dt;
      var pT = (tg.cs - (cur === 0 ? 1 : 0)) * SPB;
      var rT = tg.beat * SPB + (cur === 1 ? SPB : 0);
      if (holding && holdFor !== cur) releaseAction();
      else if (!holding && nt >= pT && nt < rT) pressAction();
      else if (holding && nt >= rT - 0.005) releaseAction();
    }
    stepPlay(dt);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (raiseT > 0) raiseT -= dt;
    if (relaxT > 0) relaxT -= dt;
    if (crowdUpT > 0) crowdUpT -= dt;
    if (kickT > 0) kickT -= dt;
    if (bellSwing > 0) bellSwing = Math.max(0, bellSwing - dt * 0.6);
    stepFx(dt);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(dt);
      game.draw.hand(PX + 180, PY + 60, { press: holding, scale: 15 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      label(GAME_TITLE, W / 2, 110, 84 + Math.sin(t * 3) * 3, C.gold);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 36, C.cyan);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, 1120, 56, C.gold);
      else label('TAP TO START', W / 2, 1120, 48, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(dt);
      game.draw.rect(0, 420, W, 640, C.ink, 0.82);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, 540, 100, won ? C.gold : C.red);
      label('SCORE ' + score, W / 2, 640, 60, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, 720, 38, C.cyan);
      game.draw.circle(W / 2 - 90, 790, 26, C.skin);
      label(Math.round(bestCh * 100) + '%', W / 2 + 20, 806, 44, C.gold);
      if (won && score > prevBest) label('NEW RECORD', W / 2, 890, 56, C.pink);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, 890, 40, C.gold);
      if (!won) label(nearOff >= 0 ? 'あと' + nearOff.toFixed(2) + '秒' : 'あと' + Math.max(1, TGT.length - cur) + '回', W / 2, 470, 52, C.pink);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, 1000, 38, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, perfect: perfects, good: goods, miss: misses, maxCharge: Math.round(bestCh * 100) };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
    }

    drawScene(dt);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, 560, 120, C.gold);
    if (over && won) label('FINISH', W / 2, 560, 110, C.gold);
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
