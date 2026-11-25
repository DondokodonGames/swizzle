// K-DS-0007v3-dawn-coop-rooster-crow.js
// 夜明けの鶏舎 二番鶏 — 屋根の先輩雄鶏が鳴き終わるまで息を溜め、その次の裏拍でちょうど指を離して自分の声を上げる
// 操作: 画面を押し続けると若い雄鶏が胸をふくらませて息が溜まる(下の息ゲージ)。先輩が鳴き終えて頭を下げたら、その次の裏拍(拍と拍の間・下のランプの小さい四角)で指を離すと鳴く。裏拍の頭からのずれでPERFECT/GOOD、ずれ過ぎはMISS。先輩が鳴いている途中や、頭を上げたまま息継ぎしている間に離すと割り込みでMISS。溜めが短すぎると声が出ずMISS、溜めすぎ(ゲージの点線の先)はむせてMISS(0.6秒前からゲージが点滅して警告音)。押し漏らし・遅れもMISS
// 終わり: 6回(約14秒)鳴き継いでMISS2回以内ならCLEAR(判定の点+溜めた息の点)。MISS3回でGAME OVER
// @mechanic: hold_charge
// @theme: dawn_coop_rooster_offbeat
// 世界観: 夜明けの鶏舎で、若い雄鶏が屋根の上の先輩の鳴き声に耳を澄まして息を溜め、鳴き終わりのすぐ後の裏拍で自分の番の声を上げて朝を告げる
// 残るもの: 正誤(CLEAR/GAME OVER) + スコア・PERFECT/GOOD/MISS数・鳴き継いだ回数
// スタイル: 70s MONO
var STYLE = { bg: ['#000000', '#0c0c0c'], main: ['#ffffff', '#9a9a9a', '#4a4a4a'], accent: ['#ff9a20', '#30ff60'] };

(function (game) {
  // 70s MONO: 黒地に白ドットだけで描き、画面の帯ごとに単色セロハンを重ねる(上=橙の朝焼け / 中=素の白 / 下=緑)。音は矩形波の単音
  var W = game.canvas.width;
  var H = game.canvas.height;
  var C = { black: STYLE.bg[0], white: STYLE.main[0], gray: STYLE.main[1], dark: STYLE.main[2], amber: STYLE.accent[0], green: STYLE.accent[1] };
  var BAND_A = [236, 760], BAND_C = [1440, 1920];

  var GAME_TITLE = 'DAWN CROW';
  var BPM = 120;
  var SPB = 60 / BPM;
  var SONG_BEATS = 27;
  var TIME_LIMIT = 14.5;
  var PERFECT_W = 0.05;
  var GOOD_W = 0.11;
  var MIN_HOLD = 0.2;
  var FULL_HOLD = 1.0;
  var MAX_HOLD = 2.0;
  var WARN_HOLD = 1.4;
  var MISS_MAX = 3;
  var HIT_STOP = 0.4;

  // 先輩の鳴き声(拍で: [始まり, 終わり] の並び。間の空白は息継ぎで、まだ終わっていない)
  var ROUNDS = [
    { segs: [[4, 6]] },
    { segs: [[8, 10.5]] },
    { segs: [[12.5, 13.5], [14, 15]] },
    { segs: [[16, 17.5]] },
    { segs: [[19, 20], [20.5, 22]] },
    { segs: [[23.5, 25]] }
  ];
  for (var ri = 0; ri < ROUNDS.length; ri++) {
    var R = ROUNDS[ri], e = R.segs[R.segs.length - 1][1];
    R.start = R.segs[0][0];
    R.end = e;
    R.target = e % 1 === 0 ? e + 0.5 : e + 1;   // 鳴き終わりの次の裏拍
  }

  // ---- ドット絵(白と灰だけ) ----
  var BODY = [
    '..G.....WWW.....',
    '.GGG...WWWWW....',
    'GGWG..WWWWWWW...',
    'GWWGWWWWWWWWW...',
    '.GWWWWWWWWWWW...',
    '..GWWWWWWWWW....',
    '...GWWWWWWW.....',
    '.....G...G......',
    '.....G...G......',
    '....GG..GG......'
  ];
  var BODY_PUFF = [
    '..G.....WWW.....',
    '.GGG..WWWWWW....',
    'GGWG.WWWWWWWW...',
    'GWWGWWWWWWWWWW..',
    '.GWWWWWWWWWWWW..',
    '..GWWWWWWWWWW...',
    '...GWWWWWWWW....',
    '.....G...G......',
    '.....G...G......',
    '....GG..GG......'
  ];
  var H_IDLE = ['........GG......', '.......GGGG.....', '.......WWWWW....', '.......WWKWWW...', '.......WWWWWWG..', '........WWGG....'];
  var H_CROW = ['.........GG.....', '........GGGG....', '........WWWWW.G.', '........WWKWWG..', '........WWWWW.G.', '.........WWGG...'];
  var H_HOLD = ['.........GG.....', '........GGGG....', '........WWWWW...', '........WWKWWWG.', '........WWWWW...', '.........WWGG...'];
  var H_DOWN = ['................', '........GG......', '.......GGGG.....', '.......WWWWW....', '.......WWWKWW...', '........WWWWWG..'];
  function mk(head, body) { return head.concat(body); }
  var R_IDLE = mk(H_IDLE, BODY), R_CROW = mk(H_CROW, BODY), R_HOLD = mk(H_HOLD, BODY_PUFF), R_DOWN = mk(H_DOWN, BODY);
  var R_PUFF = mk(H_HOLD, BODY_PUFF), R_YELL = mk(H_CROW, BODY_PUFF);
  var RPAL = { W: C.white, G: C.gray, K: C.black };
  var RPAL_INV = { W: C.black, G: C.dark, K: C.white };
  var HEN = ['..WW....', '.WKWW...', 'WWWWWG..', '.WWWWWW.', '..WWWW..'];
  var HEN_B = ['..WW....', '.WWWW...', 'WWWWWG..', '.WWWWWW.', '..WWWW..'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var armed = false;

  var demoMode, running, beatN, beatT, songT, nextBar, readyT, hitStop, lampT, offT, flashT, waveT, yellT, coughT, glareT;
  var holding, holdStart, rIdx, res, segPlayed, chargeTickT, alarmT;
  var score, combo, maxCombo, perfects, goods, misses, hits, over, won, outroT, prevBest, milestone;

  function vol() { return demoMode ? 0.45 : 1; }
  function tone(f, d, o) { if (armed) game.audio.tone(f, d, o); }

  function initGame(isDemo) {
    demoMode = !!isDemo;
    running = false; beatN = 0; beatT = 0; songT = 0; nextBar = 0;
    readyT = isDemo ? 0 : 0.8;
    hitStop = 0; lampT = 0; offT = 0; flashT = 0; waveT = 0; yellT = 0; coughT = 0; glareT = 0;
    holding = false; holdStart = 0; rIdx = 0; res = []; segPlayed = {}; chargeTickT = 0; alarmT = 0;
    score = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; misses = 0; hits = 0;
    over = false; won = false; outroT = 0; prevBest = game.best || 0; milestone = false;
    if (isDemo) startClock();
  }

  // ---- 拍クロック(1本だけ)。伴奏は表拍に低い矩形波、裏拍に小さな刻み ----
  function playBar(b) {
    if (!armed || b > 6) return;
    var root = ['C3', 'C3', 'F2', 'G2', 'C3', 'A2', 'G2'][b];
    game.audio.melody([['R', 0.5], ['E5', 0.5], ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['E5', 0.5]], {
      tempo: BPM, wave: 'square', volume: 0.018 * vol(), bass: [[root, 1], ['R', 1], [root, 1], ['R', 1]], bassWave: 'square', bassVolume: 0.05 * vol()
    });
  }

  function startClock() {
    running = true; beatN = 0; beatT = 0; songT = 0; nextBar = 1;
    playBar(0);
    onBeat(0);
  }

  function onBeat(k) {
    if (k >= SONG_BEATS) { if (!demoMode) finish(misses < MISS_MAX); return; }
    lampT = 1;
    if (k < 4) tone(k === 0 ? 1200 : 900, 0.04, { wave: 'square', volume: 0.05 * vol() });
  }
  function onOffbeat() { offT = 1; }

  function curRound() { return rIdx < ROUNDS.length ? ROUNDS[rIdx] : null; }
  function crowingAt(T) {
    var R = curRound();
    if (!R) return 0;
    for (var i = 0; i < R.segs.length; i++) if (T >= R.segs[i][0] * SPB && T < R.segs[i][1] * SPB) return 1;
    if (T >= R.start * SPB && T < R.end * SPB) return 2;   // 息継ぎ(まだ終わっていない)
    return 0;
  }

  function stepPlay(dt) {
    if (!running) return;
    var half = beatT >= SPB / 2;
    beatT += dt;
    while (beatT >= SPB) { beatT -= SPB; beatN++; half = false; onBeat(beatN); if (!running) return; }
    if (!half && beatT >= SPB / 2) onOffbeat();
    songT = beatN * SPB + beatT;
    if (nextBar <= 6 && songT >= nextBar * 4 * SPB - 0.06) { playBar(nextBar); nextBar++; }
    var R = curRound();
    if (!R) return;
    // 先輩の鳴き声(区間ごとに矩形波の単音)
    for (var s = 0; s < R.segs.length; s++) {
      var key = rIdx + '_' + s;
      if (!segPlayed[key] && songT >= R.segs[s][0] * SPB) {
        segPlayed[key] = true;
        var len = (R.segs[s][1] - R.segs[s][0]) * SPB;
        tone(s === R.segs.length - 1 ? 392 : 440, len * 0.95, { wave: 'square', volume: 0.06 * vol(), slide: s === R.segs.length - 1 ? -120 : 180 });
        waveT = len;
      }
    }
    // 溜めすぎ(むせる)
    if (holding) {
      var held = songT - holdStart;
      if (held > WARN_HOLD) {
        alarmT -= dt;
        if (alarmT <= 0) { alarmT = 0.12; tone(1600, 0.04, { wave: 'square', volume: 0.04 * vol() }); }
      }
      if (held > MAX_HOLD) {
        holding = false; coughT = 0.6;
        tone(180, 0.3, { wave: 'square', volume: 0.06 * vol(), slide: -80 });
        if (songT >= R.start * SPB - 0.25) { res[rIdx] = 'miss'; rIdx++; }
        missCommon();
        return;
      }
    }
    // 鳴き遅れ・鳴き漏らし
    if (songT > R.target * SPB + GOOD_W) {
      if (holding) { holding = false; yellT = 0.3; tone(500, 0.2, { wave: 'square', volume: 0.04 * vol(), slide: -100 }); }
      res[rIdx] = 'miss'; rIdx++;
      missCommon();
    }
  }

  // ---- 判定(離した瞬間 vs 鳴き終わりの次の裏拍) ----
  function beginHold() {
    if (!running || over || holding) return;
    holding = true; holdStart = songT; chargeTickT = 0;
  }

  function releaseHold() {
    if (!holding || !running || over) return;
    holding = false;
    var held = songT - holdStart;
    var R = curRound();
    yellT = 0.35;
    tone(660, 0.18 + Math.min(1, held / FULL_HOLD) * 0.2, { wave: 'square', volume: 0.06 * vol(), slide: 330 });
    if (!R || songT < R.start * SPB - 0.25) {
      if (held < MIN_HOLD) return;                 // 息を溜めていない一押しは声にならない
      glareT = 0.6; missCommon(); return;          // 誰も鳴いていない時に鳴いた
    }
    if (songT < R.end * SPB) { glareT = 0.6; res[rIdx] = 'miss'; rIdx++; missCommon(); return; }   // 割り込み
    if (held < MIN_HOLD) { res[rIdx] = 'miss'; rIdx++; missCommon(); return; }   // 息が足りない
    var off = songT - R.target * SPB;
    if (Math.abs(off) <= GOOD_W) { crowOk(off, held); return; }
    res[rIdx] = 'miss'; rIdx++;
    missCommon();
  }

  function crowOk(off, held) {
    var perfect = Math.abs(off) <= PERFECT_W;
    var breath = Math.min(1, held / FULL_HOLD);
    res[rIdx] = perfect ? 'perfect' : 'good'; rIdx++;
    hits++; combo++;
    if (combo > maxCombo) maxCombo = combo;
    score += (perfect ? 100 + Math.min(combo, 6) * 15 : 50) + Math.round(breath * 50);
    waveT = 0.6;
    var vv = armed ? (perfect ? 0.22 : 0.16) : 0.001;
    if (perfect) { perfects++; game.feedback.good(760, 960, { text: 'PERFECT', color: C.white, size: 54, count: 12, volume: vv }); }
    else { goods++; game.feedback.good(760, 960, { text: 'GOOD', color: C.white, size: 48, count: 7, volume: vv }); }
    if (breath >= 1) game.fx.popup('+50', 760, 880, { color: C.amber, size: 44 });
    if (!demoMode && hits === 3 && !milestone) {
      milestone = true;
      game.audio.play('se_milestone', 0.45);
      game.fx.popup(hits + ' / ' + ROUNDS.length, W / 2, 400, { color: C.white, size: 76 });
    }
  }

  function missCommon() {
    misses++; combo = 0;
    hitStop = HIT_STOP; flashT = HIT_STOP;
    game.feedback.bad(760, 960, { text: 'MISS', shake: demoMode ? 4 : 10, volume: armed ? 0.5 : 0.001 });
    if (!demoMode && misses >= MISS_MAX) finish(false);
  }

  function finish(ok) {
    if (over) return;
    over = true; won = ok; outroT = 1.5; running = false; holding = false;
    game.audio.stopBgm();
    if (ok) {
      game.audio.play('se_success', 0.55);
      for (var i = 0; i < 4; i++) game.fx.burst(game.random(160, 920), game.random(400, 1100), { color: i % 2 ? C.amber : C.white, count: 22, speed: 420 });
      if (score > prevBest && prevBest > 0) game.fx.popup('NEW RECORD', W / 2, 400, { color: C.white, size: 70 });
    } else {
      game.audio.play('se_failure', 0.5);
    }
  }

  // ---- 入力 ----
  game.onPress(function (x, y) {
    armed = true;
    if (state !== S.PLAYING || over) return;
    if (readyT > 0) { game.audio.play('se_tap', 0.2); return; }
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: C.white, count: 4, speed: 100 });
    beginHold();
  });
  game.onRelease(function (x, y) {
    if (state !== S.PLAYING || over || !holding) return;
    game.fx.burst(760, 1080, { color: C.white, count: 6, speed: 200 });
    releaseHold();
  });
  game.onTap(function () {
    armed = true;
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(false); return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(true); demo.t = 0; demo.i = 0; return; }
  });

  // ---- 描画 ----
  function label(str, x, y, sz, col, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.dark, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }
  function dotLine(x1, y1, x2, y2, step, sz, col) {
    var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.floor(Math.sqrt(dx * dx + dy * dy) / step));
    for (var i = 0; i <= n; i++) game.draw.rect(x1 + dx * i / n - sz / 2, y1 + dy * i / n - sz / 2, sz, sz, col);
  }

  function seniorSprite() {
    if (!running) return R_IDLE;
    var c = crowingAt(songT);
    if (c === 1) return R_CROW;
    if (c === 2) return R_HOLD;
    var R = curRound();
    if (R && songT >= R.end * SPB) return R_DOWN;
    return R_IDLE;
  }
  function youngSprite() {
    if (coughT > 0) return R_DOWN;
    if (yellT > 0) return R_YELL;
    if (holding) return songT - holdStart > 0.4 ? R_PUFF : R_HOLD;
    return R_IDLE;
  }

  function drawWorld(t) {
    game.draw.gradient(0, H, [[0, C.black], [0.35, '#141414'], [0.55, STYLE.bg[1]], [1, C.black]]);
    // 帯A: 星と昇る朝日(白ドット)
    var dawn = running ? Math.min(1, songT / (SONG_BEATS * SPB)) : 0.3 + 0.2 * Math.sin(t * 0.5);
    for (var s = 0; s < 30; s++) {
      var sx = (s * 137) % W, sy = 260 + (s * 89) % 360;
      if ((s + Math.floor(t * 3)) % 7 !== 0 && s / 30 > dawn * 0.8) game.draw.rect(sx, sy, 5, 5, C.white);
    }
    var sunY = 700 - dawn * 160;
    for (var a = 0; a < 24; a++) {
      var ang = Math.PI + a / 23 * Math.PI;
      game.draw.rect(830 + Math.cos(ang) * 120 - 5, sunY + Math.sin(ang) * 120 - 5, 10, 10, C.white);
    }
    for (var r = 0; r < 5; r++) dotLine(830 - 100 + r * 10, sunY - r * 22, 830 + 100 - r * 10, sunY - r * 22, 18, 6, C.gray);
    // 鶏舎の屋根(帯Aの下端)と壁(帯B)
    dotLine(60, 720, 540, 600, 14, 8, C.white);
    dotLine(540, 600, 1020, 720, 14, 8, C.white);
    for (var p = 0; p < 9; p++) dotLine(80, 780 + p * 70, 1000, 780 + p * 70, 24, 4, C.dark);
    dotLine(80, 740, 80, 1420, 14, 6, C.white);
    dotLine(1000, 740, 1000, 1420, 14, 6, C.white);
    // 巣箱の窓とめんどり(瞬き)
    for (var h = 0; h < 3; h++) {
      var hx = 170 + h * 150, hy = 880;
      dotLine(hx - 55, hy - 50, hx + 55, hy - 50, 12, 4, C.gray);
      dotLine(hx - 55, hy + 40, hx + 55, hy + 40, 12, 4, C.gray);
      dotLine(hx - 55, hy - 50, hx - 55, hy + 40, 12, 4, C.gray);
      dotLine(hx + 55, hy - 50, hx + 55, hy + 40, 12, 4, C.gray);
      game.draw.sprite((Math.floor(t * 1.3 + h) % 4 === 0) ? HEN_B : HEN, RPAL, hx, hy, 9, { anchor: 'center', flipX: glareT > 0 });
    }
    // 若い雄鶏の止まり木
    dotLine(560, 1250, 960, 1250, 12, 10, C.white);
    dotLine(620, 1250, 620, 1420, 14, 8, C.gray);
    dotLine(900, 1250, 900, 1420, 14, 8, C.gray);
  }

  function drawRoosters(t) {
    // 先輩(屋根の上)
    var sb = Math.sin(t * 2) * 3;
    game.draw.sprite(seniorSprite(), RPAL, 380, 520 + sb, 13, { anchor: 'center' });
    if (running && crowingAt(songT) === 1) {
      for (var w = 0; w < 3; w++) {
        var rr = 40 + ((t * 160 + w * 40) % 120);
        dotLine(500 + rr * 0.6, 440 - rr * 0.5, 500 + rr, 440, 16, 6, C.white);
      }
    }
    // 若い雄鶏(自分)
    var big = hitStop > 0 ? 13.5 : 11;
    var yb = holding ? Math.sin(t * 30) * 2 : Math.sin(t * 2.5) * 3;
    if (hitStop > 0) game.draw.circle(760, 1150, 140, C.white, 0.9 * hitStop / HIT_STOP);
    game.draw.sprite(youngSprite(), hitStop > 0 ? RPAL_INV : RPAL, 760, 1160 + yb, big, { anchor: 'center', flipX: true });
    if (yellT > 0) {
      for (var y2 = 0; y2 < 3; y2++) {
        var r2 = 30 + y2 * 40 + (0.35 - yellT) * 300;
        dotLine(660 - r2, 1040 - r2 * 0.4, 660 - r2 * 0.6, 1040 - r2 * 0.9, 16, 6, C.white);
      }
    }
  }

  // 帯C: 息ゲージと拍のランプ(大きい四角 = 表拍 / 小さい四角 = 裏拍)
  function drawThumb(t) {
    var held = holding ? songT - holdStart : 0;
    var n = 14, x0 = 140, sw = 52;
    for (var i = 0; i < n; i++) {
      var x = x0 + i * (sw + 6), danger = i >= 10;
      var filled = held > (i + 1) / 10 * FULL_HOLD - 0.001 && holding;
      if (danger && !filled) { dotLine(x, 1500, x + sw, 1500, 10, 4, C.gray); dotLine(x, 1560, x + sw, 1560, 10, 4, C.gray); continue; }
      var blink = held > WARN_HOLD && Math.floor(t * 14) % 2 === 0;
      game.draw.rect(x, 1500, sw, 60, filled ? (blink ? C.black : C.white) : C.dark);
    }
    // 拍のランプ(今の小節の8分)
    var bar = running ? Math.floor(beatN / 4) : 0;
    var R = curRound();
    for (var s = 0; s < 8; s++) {
      var lx = 150 + s * 112, ly = 1700, big = s % 2 === 0, sz = big ? 64 : 40;
      var slotT = (bar * 4 + s * 0.5) * SPB;
      var cur = running && songT >= slotT && songT < slotT + SPB / 2;
      game.draw.rect(lx - sz / 2, ly - sz / 2, sz, sz, cur ? C.white : C.dark);
      // 先輩の鳴き声が乗った8分(鳴いた所だけ残る)
      if (running && R) {
        var sb = bar * 4 + s * 0.5;
        for (var g = 0; g < R.segs.length; g++) {
          if (sb >= R.segs[g][0] && sb < R.segs[g][1] && songT >= sb * SPB) game.draw.rect(lx - 50, ly - 62, 100, 12, C.white);
        }
        // 鳴き終わったら次の裏拍に枠(拍の頭で閉じる)
        if (sb === R.target && songT >= R.end * SPB && Math.floor(R.target / 4) === bar) {
          var u = Math.max(0, R.target * SPB - songT) / (SPB * 1.2);
          var e = sz / 2 + 10 + u * 60;
          dotLine(lx - e, ly - e, lx + e, ly - e, 10, 6, C.white);
          dotLine(lx - e, ly + e, lx + e, ly + e, 10, 6, C.white);
          dotLine(lx - e, ly - e, lx - e, ly + e, 10, 6, C.white);
          dotLine(lx + e, ly - e, lx + e, ly + e, 10, 6, C.white);
        }
      }
    }
    // 回数の印
    for (var m = 0; m < ROUNDS.length; m++) {
      var mx = 540 + (m - 2.5) * 70, my = 1810;
      if (res[m] === 'perfect' || res[m] === 'good') game.draw.rect(mx - 18, my - 18, 36, 36, C.white);
      else if (res[m] === 'miss') { dotLine(mx - 18, my - 18, mx + 18, my + 18, 6, 6, C.white); dotLine(mx + 18, my - 18, mx - 18, my + 18, 6, 6, C.white); }
      else { dotLine(mx - 18, my - 18, mx + 18, my - 18, 9, 4, C.gray); dotLine(mx - 18, my + 18, mx + 18, my + 18, 9, 4, C.gray); }
    }
  }

  function cellophane() {
    game.draw.rect(0, BAND_A[0], W, BAND_A[1] - BAND_A[0], C.amber, 0.42);
    game.draw.rect(0, BAND_C[0], W, BAND_C[1] - BAND_C[0], C.green, 0.36);
    for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, C.black, 0.22);
  }

  function drawScene(t) {
    drawWorld(t);
    drawRoosters(t);
    drawThumb(t);
    cellophane();
    if (flashT > 0) game.draw.rect(0, 0, W, H, C.white, 0.2 * flashT / HIT_STOP);
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 236, C.black);
    dotLine(0, 230, W, 230, 12, 4, C.white);
    label('SCORE ' + score, 56, 92, 52, C.white, 'left');
    label('BEST ' + prevBest, 56, 164, 32, C.gray, 'left');
    label(hits + ' / ' + ROUNDS.length, W - 56, 92, 54, C.white, 'right');
    for (var m = 0; m < MISS_MAX; m++) {
      var x = W - 200 + m * 64;
      if (m < misses) { dotLine(x - 18, 146, x + 18, 182, 6, 6, C.white); dotLine(x + 18, 146, x - 18, 182, 6, 6, C.white); }
      else game.draw.rect(x - 16, 148, 32, 32, C.dark);
    }
  }

  // ---- ATTRACT: 実ロジックで 鳴き終わりの次の裏拍で2回鳴く → 息継ぎの間に離して割り込みMISS ----
  var DEMO = [[5.0, 6.5], [9.5, 11.5], [13.0, 13.75]];
  var DEMO_LEN = 16.5 * SPB;
  var demo = { t: 0, i: 0, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_LEN;
    if (cyc < dt || demo.t <= dt) { initGame(true); demo.i = 0; demo.press = false; }
    stepPlay(dt);
    if (demo.i < DEMO.length) {
      var d = DEMO[demo.i];
      if (!demo.press && songT >= d[0] * SPB) { demo.press = true; beginHold(); }
      if (demo.press && songT >= d[1] * SPB) { demo.press = false; demo.i++; releaseHold(); }
    }
  }

  game.onUpdate(function (dt) {
    var t = game.time.elapsed;
    if (hitStop > 0) hitStop -= dt;
    if (flashT > 0) flashT -= dt;
    if (lampT > 0) lampT -= dt * 4;
    if (offT > 0) offT -= dt * 4;
    if (waveT > 0) waveT -= dt;
    if (yellT > 0) yellT -= dt;
    if (coughT > 0) coughT -= dt;
    if (glareT > 0) glareT -= dt;
    // 溜めている間は音程の上がる刻み(チャージ音)
    if (holding && running) {
      chargeTickT -= dt;
      if (chargeTickT <= 0) { chargeTickT = 0.12; tone(300 + Math.min(1.4, songT - holdStart) * 420, 0.03, { wave: 'square', volume: 0.02 * vol() }); }
    }

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(760, demo.press ? 1620 : 1580 + Math.sin(t * 3) * 14, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, 236, C.black);
      dotLine(0, 230, W, 230, 12, 4, C.white);
      label(GAME_TITLE, W / 2, 110, 86 + Math.sin(t * 3) * 3, C.white);
      label('HI-SCORE ' + (game.best > 0 ? game.best : 0), W / 2, 190, 34, C.gray);
      if (Math.floor(t * 2) % 2 === 0) label('► 100円 投入 ◄', W / 2, H * 0.975, 44, C.white);
      else label('TAP TO START', W / 2, H * 0.975, 40, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawHud();
      game.draw.rect(100, H * 0.19, W - 200, H * 0.3, C.black, 0.92);
      dotLine(100, H * 0.19, W - 100, H * 0.19, 12, 6, C.white);
      dotLine(100, H * 0.49, W - 100, H * 0.49, 12, 6, C.white);
      label(won ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 100, C.white);
      label('SCORE ' + score, W / 2, H * 0.3, 60, C.white);
      label('PERFECT ' + perfects + '  GOOD ' + goods + '  MISS ' + misses, W / 2, H * 0.345, 34, C.gray);
      if (won && score > prevBest) label('NEW RECORD', W / 2, H * 0.395, 54, C.white);
      else label('BEST ' + Math.max(prevBest, won ? score : 0), W / 2, H * 0.395, 42, C.gray);
      if (!won) label('あと' + Math.max(1, ROUNDS.length - rIdx) + '回!', W / 2, H * 0.45, 52, C.white);
      else label('x' + maxCombo, W / 2, H * 0.45, 48, C.white);
      if (Math.floor(t * 2) % 2 === 0) label('TAP TO CONTINUE', W / 2, H * 0.975, 40, C.white);
      return;
    }

    // ---- PLAYING ----
    if (over) {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { score: score, crows: hits, total: ROUNDS.length, perfect: perfects, good: goods, miss: misses, maxCombo: maxCombo };
        if (won) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) startClock();
    } else {
      stepPlay(dt);
      if (!over && songT > TIME_LIMIT) finish(misses < MISS_MAX);
    }

    drawScene(t);
    drawHud();
    if (readyT > 0) label(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 110, C.white);
    if (over && won) label('FINISH', W / 2, H * 0.36, 100, C.white);
  });

  game.onStart(function () {
    state = S.ATTRACT;
    initGame(true);
  });
})(game);
