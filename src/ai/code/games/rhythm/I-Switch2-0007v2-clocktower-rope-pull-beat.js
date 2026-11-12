// I-Switch2-0007v2-clocktower-rope-pull-beat.js
// 時計塔の綱引き拍子 — 鐘から綱を伝って降りてくる光の結び目が手元の輪に届く拍で、綱をぐいと下へ引く。拍どおりに引くほど鐘の音が澄む
// 操作: 手元の輪のあたりを押して、そのまま下へ引き下ろすと鐘綱を引く(引き下ろした瞬間で判定)。結び目は2拍前に鐘の下から降りてきて、輪に重なる拍で引く。結び目の来ない拍は休み(引くと濁った音で澄み度が下がる)。最初の1小節は時計の針と鐘のカウント
// 終わり: 7小節(約15秒)を引き終えた時点で澄み度ゲージが6割以上ならCLEAR、足りなければGAME OVER
// @mechanic: rhythm
// @theme: cobblestone_clocktower_bell
// 世界観: 石畳の港町の時計塔で、見習いの鐘撞き少年が正午の時鐘を、塔の拍に合わせて鐘綱を引き下ろし、町いちばんの澄んだ音で鳴らしきる
// 残るもの: 正誤(CLEAR/GAME OVER) + 澄み度%・PERFECT数・最大コンボ・スコア
// スタイル: 2010s FLAT MOBILE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2010s FLAT MOBILE: ベタ塗り数色、丸角、大きい余白、判定はUIの色変化
  var STYLE = { bg: ['#bfe3f2', '#d6eef6'], main: ['#f2b84b', '#e8624a', '#3d5a80'], accent: ['#3ec98e', '#ffffff'] };
  var SUN = STYLE.main[0], BRICK = STYLE.main[1], SLATE = STYLE.main[2], MINT = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#26324a', STONE = '#c9c2b6', STONE_D = '#a9a196', MISSC = '#ff4d6d', ROPEC = '#b8875a';

  var GAME_TITLE = 'BELL ROPE BEAT';
  var BPM = 112;
  var SPB = 60 / BPM;
  var BARS = 7;
  var TIME_LIMIT = 15;
  var CHART = [[1, 0, 1, 0], [1, 0, 1, 1], [1, 1, 0, 1], [0, 1, 1, 1], [1, 1, 1, 0], [1, 0, 1, 1]];
  var DEMO_CHART = [[1, 0, 1, 1], [1, 0, 1, 1]];
  var PASS = 0.6, PERF = 0.07, GOODW = 0.15, EDGE = 0.22, TRAVEL = SPB * 2;
  var ROPE_X = W / 2 + 40, BELL_Y = 520, GRIP_Y = 1460, TOP_Y = 860;
  var BELLS = ['C6', 'B5', 'A5', 'G5', 'F5', 'E5', 'D5', 'C5'];
  var BASS = ['C3', 'G2', 'A2', 'F2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var notes, songT, lastBeat, clarity, maxClar, combo, maxCombo, perfects, goods, missN, strays, score, finalScore, readyT;
  var fin, cleared, postT, stopT, grab, bellAng, bellDir, ringT, ringPure, pullT, bellI, joyT, sadT, wobT, chart, songLen;

  var BOY_A = ['....bbbb....', '...bbbbbb...', '...ssssss...', '...skssks...', '....ssss....', '..rrrrrrrr..', '.srrrwwrrrs.', '.s.rrwwrr.s.', '...rrrrrr...', '...nn..nn...', '...nn..nn...', '..kkk..kkk..'];
  var BOY_PULL = ['............', '....bbbb....', '...bbbbbb...', '...ssssss...', '...skssks...', '..srrrrrrs..', '..srrwwrrs..', '...rrwwrr...', '...rrrrrr...', '..nnn..nnn..', '..nn....nn..', '.kkk....kkk.'];
  var BOY_SAD = ['............', '............', '....bbbb....', '...bbbbbb...', '...ssssss...', '...sksskS...', '..rrrrrrrr..', '.srrrwwrrrs.', '...rrrrrr...', '...nn..nn...', '...nn..nn...', '..kkk..kkk..'];
  var BOY_PAL = { b: '#5a3a2a', s: '#f4c9a0', k: INK, S: '#7fd0ff', r: BRICK, w: WHITE, n: SLATE };
  var PIGEON = ['.ww...', 'wwwwk.', '.wwwww', '..ww..'];

  function out(str, x, y, sz, col) {
    game.draw.text(str, x, y + 4, { size: sz, color: 'rgba(38,50,74,0.25)', bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }
  function rrect(x, y, w, h, r, col, a) {
    game.draw.rect(x + r, y, w - 2 * r, h, col, a);
    game.draw.rect(x, y + r, w, h - 2 * r, col, a);
    game.draw.circle(x + r, y + r, r, col, a); game.draw.circle(x + w - r, y + r, r, col, a);
    game.draw.circle(x + r, y + h - r, r, col, a); game.draw.circle(x + w - r, y + h - r, r, col, a);
  }

  function buildNotes(ch) {
    notes = [];
    for (var b = 0; b < ch.length; b++) for (var q = 0; q < 4; q++) if (ch[b][q]) notes.push({ t: ((b + 1) * 4 + q) * SPB, done: false, res: '', fx: 0 });
    maxClar = notes.length;
    songLen = (ch.length + 1) * 4 * SPB;
  }

  function initGame(isDemo) {
    chart = isDemo ? DEMO_CHART : CHART;
    buildNotes(chart);
    songT = 0; lastBeat = -1; clarity = 0; combo = 0; maxCombo = 0; perfects = 0; goods = 0; missN = 0; strays = 0;
    score = 0; finalScore = 0; readyT = 0.8; fin = false; cleared = false; postT = 0; stopT = 0; grab = null;
    bellAng = 0; bellDir = 1; ringT = 0; ringPure = true; pullT = 0; bellI = 0; joyT = 0; sadT = 0; wobT = 0;
  }

  function onBeat(k) {
    var bar = Math.floor(k / 4), q = k % 4;
    game.audio.tone(q === 0 ? 2400 : 1800, 0.02, { wave: 'square', volume: q === 0 ? 0.035 : 0.02 });
    if (bar === 0) game.audio.tone(['G4', 'G4', 'G4', 'C5'][q], 0.12, { wave: 'triangle', volume: 0.09 });
    else game.audio.tone(BASS[(bar + (q > 1 ? 1 : 0)) % BASS.length], 0.2, { wave: 'triangle', volume: q === 0 ? 0.1 : 0.06 });
  }

  // 綱を引く(本番もデモも同じ処理)
  function pull() {
    pullT = 0.18;
    var best = null, bd = 9;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.done) continue;
      var d = Math.abs(songT - n.t);
      if (d < bd) { bd = d; best = n; }
    }
    if (!best || bd > EDGE) {
      // 結び目の来ない拍で引いた: 濁った音
      strays++; combo = 0; wobT = 0.2;
      clarity = Math.max(0, clarity - 0.5);
      game.audio.tone('D3', 0.12, { wave: 'sawtooth', volume: 0.07 });
      game.fx.shake(4, 0.1);
      return;
    }
    best.done = true; best.fx = 0.35;
    bellDir = -bellDir; bellAng = 0.5 * bellDir; ringT = 0.5;
    if (bd <= PERF || bd <= GOODW) {
      var perfect = bd <= PERF;
      best.res = perfect ? 'PERFECT' : 'GOOD';
      combo++; if (combo > maxCombo) maxCombo = combo;
      if (perfect) { perfects++; clarity += 1; } else { goods++; clarity += 0.6; }
      ringPure = perfect;
      var pts = (perfect ? 100 : 50) + Math.min(combo, 10) * 10;
      if (mode === S.PLAYING) score += pts;
      var note = BELLS[bellI % BELLS.length]; bellI++;
      game.audio.tone(note, 0.5, { wave: perfect ? 'sine' : 'triangle', volume: 0.16 });
      if (perfect) game.audio.tone(note.replace(/\d/, function(o) { return String(+o - 1); }), 0.5, { wave: 'sine', volume: 0.07 });
      game.feedback.good(ROPE_X, GRIP_Y - 120, { text: best.res, color: perfect ? SUN : MINT, size: 56, volume: 0.3 });
      if (combo === 8 && mode === S.PLAYING) {
        game.audio.play('se_milestone', 0.5);
        game.fx.popup('x8 NICE', W / 2, 760, { color: SUN, size: 80 });
      }
    } else {
      best.res = 'MISS'; missN++; combo = 0; ringPure = false;
      game.audio.tone('C4', 0.25, { wave: 'square', volume: 0.07, slide: -40 });
      game.feedback.bad(ROPE_X, GRIP_Y - 120, { text: 'MISS', color: MISSC, size: 56 });
    }
  }

  function stepSong(dt) {
    if (pullT > 0) pullT -= dt;
    if (ringT > 0) ringT -= dt;
    if (joyT > 0) joyT -= dt;
    if (sadT > 0) sadT -= dt;
    if (wobT > 0) wobT -= dt;
    bellAng *= Math.pow(0.15, dt);
    for (var f = 0; f < notes.length; f++) if (notes[f].fx > 0) notes[f].fx -= dt;
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) ending(); return; }
    songT += dt;
    var k = Math.floor(songT / SPB);
    if (k !== lastBeat && songT < songLen) { lastBeat = k; onBeat(k); }
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (!n.done && songT > n.t + EDGE) {
        n.done = true; n.res = 'MISS'; n.fx = 0.4; missN++; combo = 0;
        game.feedback.bad(ROPE_X, GRIP_Y - 120, { text: 'MISS', color: MISSC, size: 56 });
      }
    }
    if (songT >= songLen) {
      // 最後の小節のあと: 止めて澄み度ゲージを光らせてから判定
      stopT = 0.5;
      game.fx.flash(WHITE, 0.12);
      game.audio.tone('C5', 0.2, { wave: 'sine', volume: 0.08 });
    }
  }

  function clarRatio() { return maxClar > 0 ? Math.max(0, clarity) / maxClar : 0; }

  function ending() {
    if (fin) return;
    if (mode !== S.PLAYING) { stopT = 0; return; }
    fin = true; postT = 1.4;
    cleared = clarRatio() >= PASS;
    finalScore = cleared ? score + Math.round(clarRatio() * 1000) + maxCombo * 20 : 0;
    game.audio.play(cleared ? 'se_success' : 'se_failure', 0.55);
    if (cleared) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, 500 + (i % 2) * 140, { color: i % 2 ? SUN : MINT, count: 18, speed: 460 });
      game.fx.flash(WHITE, 0.2);
      joyT = 3;
    } else {
      sadT = 3;
      game.feedback.bad(150, 1000, { text: Math.round(clarRatio() * 100) + '%', color: MISSC, size: 56 });
    }
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < 230) { game.audio.play('se_tap', 0.08); return; }
    grab = { y0: y, fired: false };
    game.audio.tone('E4', 0.02, { wave: 'square', volume: 0.04 });
  });
  game.onMove(function(x, y) {
    if (!grab || grab.fired || mode !== S.PLAYING) return;
    if (y - grab.y0 > 55) {
      grab.fired = true;
      game.fx.burst(ROPE_X, GRIP_Y, { color: ROPEC, count: 5, speed: 140 });
      pull();
    }
  });
  game.onRelease(function(x, y) {
    if (!grab) return;
    if (!grab.fired && mode === S.PLAYING && !fin) {
      // 引き下ろさずに離した: 綱がゆれるだけ
      wobT = 0.2;
      game.audio.tone('A3', 0.04, { wave: 'triangle', volume: 0.05 });
    }
    grab = null;
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); game.audio.stopBgm(); mode = S.PLAYING; initGame(false); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(true); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawTown(t) {
    game.draw.clear(STYLE.bg[0]);
    game.draw.gradient(0, 1200, [[0, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    game.draw.circle(160, 380, 60, '#ffe7a0');
    // 雲(ベタ)
    for (var c = 0; c < 3; c++) {
      var cx = ((c * 420 + t * 20) % (W + 300)) - 150;
      rrect(cx, 300 + c * 90, 200, 50, 25, WHITE, 0.9);
    }
    // 家並み(左右)
    var houses = [[0, 900, 200, BRICK], [190, 980, 160, SUN], [W - 360, 960, 170, '#7fb3d5'], [W - 200, 880, 200, BRICK]];
    for (var h = 0; h < houses.length; h++) {
      var hs = houses[h];
      game.draw.rect(hs[0], hs[1], hs[2], 1220 - hs[1], hs[3]);
      game.draw.rect(hs[0] - 10, hs[1] - 30, hs[2] + 20, 40, SLATE);
      for (var wi = 0; wi < 2; wi++) rrect(hs[0] + 30 + wi * (hs[2] - 90), hs[1] + 60, 40, 60, 10, WHITE, 0.9);
    }
    // 時計塔
    var tx = W / 2 - 150;
    game.draw.rect(tx, 380, 300, 840, '#e9dcc4');
    game.draw.rect(tx - 20, 360, 340, 40, SLATE);
    game.draw.rect(tx + 30, 280, 240, 90, SLATE);
    game.draw.rect(tx + 140, 230, 20, 60, SLATE);
    // 鐘楼の窓
    rrect(tx + 50, 420, 200, 230, 30, '#4a5a78');
    // 時計(針は拍ごとに進む)
    var ccx = W / 2, ccy = 780;
    game.draw.circle(ccx, ccy, 105, SLATE);
    game.draw.circle(ccx, ccy, 92, WHITE);
    var beatK = Math.max(0, lastBeat);
    var ha = -Math.PI / 2 + beatK * Math.PI / 6;
    game.draw.line(ccx, ccy, ccx + Math.cos(ha) * 76, ccy + Math.sin(ha) * 76, INK, 8);
    game.draw.line(ccx, ccy, ccx, ccy - 50, INK, 10);
    game.draw.circle(ccx, ccy, 10, BRICK);
    // 石畳
    game.draw.rect(0, 1220, W, H - 1220, STONE);
    for (var r = 0; r < 12; r++) for (var k = 0; k < 9; k++) rrect(k * 130 - (r % 2) * 65, 1230 + r * 58, 118, 46, 14, STONE_D);
    // 鳩
    for (var p = 0; p < 3; p++) {
      var px = (p * 300 + t * (60 + p * 20)) % (W + 100) - 50, py = 330 + p * 60 + Math.sin(t * 4 + p) * 10;
      game.draw.sprite(PIGEON, { w: WHITE, k: INK }, px, py, 9, { anchor: 'center' });
    }
  }

  function drawBell(t) {
    var cx = W / 2, cy = BELL_Y;
    var a = bellAng;
    var ox = Math.sin(a) * 40;
    game.draw.rect(cx - 8, 420, 16, 40, SLATE);
    // 鐘(フラットな台形)
    for (var i = 0; i < 8; i++) {
      var w = 60 + i * 12;
      game.draw.rect(cx + ox * (i / 8) - w, cy - 60 + i * 18, w * 2, 18, SUN);
    }
    rrect(cx + ox - 170, cy + 84, 340, 26, 13, '#d8962e');
    game.draw.circle(cx + ox * 1.6, cy + 110, 18, INK);
    if (ringT > 0) {
      var k = 1 - ringT / 0.5;
      for (var r = 0; r < 3; r++) {
        var rad = 180 + r * 50 + k * 160;
        if (ringPure) game.draw.circle(cx, cy + 30, rad, WHITE, 0.18 * (1 - k));
        else for (var s = 0; s < 12; s++) { var an = s / 12 * Math.PI * 2; game.draw.rect(cx + Math.cos(an) * rad - 6, cy + 30 + Math.sin(an) * rad * 0.6 - 6, 12, 12, WHITE, 0.4 * (1 - k)); }
      }
    }
  }

  function drawRope(t) {
    var pullOff = pullT > 0 ? Math.sin(pullT / 0.18 * Math.PI) * 60 : 0;
    var wob = wobT > 0 ? Math.sin(t * 60) * 8 : 0;
    game.draw.line(ROPE_X, 640, ROPE_X + wob, GRIP_Y + 160 + pullOff, ROPEC, 12);
    // 判定の輪(拍で脈打つ)
    var beatPh = (songT % SPB) / SPB;
    var pulse = mode === S.PLAYING && readyT <= 0 && !fin ? 1 - beatPh : 0.3;
    game.draw.circle(ROPE_X, GRIP_Y, 70 + pulse * 14, WHITE, 0.35 + pulse * 0.3);
    game.draw.circle(ROPE_X, GRIP_Y, 54, '#f7f2ea');
    game.draw.circle(ROPE_X, GRIP_Y, 40, ROPEC);
    // 降りてくる結び目(サリー)
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      if (n.done && n.fx <= 0) continue;
      var dtn = n.t - songT;
      if (dtn > TRAVEL) continue;
      var y = n.done ? GRIP_Y : GRIP_Y - (dtn / TRAVEL) * (GRIP_Y - TOP_Y);
      if (y < TOP_Y - 10) continue;
      var col = n.done ? (n.res === 'MISS' ? (Math.floor(t * 16) % 2 ? WHITE : MISSC) : (n.res === 'PERFECT' ? SUN : MINT)) : BRICK;
      var sz = n.done ? 46 * (1 + (n.res === 'MISS' ? 0.5 : 0.3) * (1 - n.fx / 0.4)) : 40;
      rrect(ROPE_X - sz * 0.7, y - sz, sz * 1.4, sz * 2, sz * 0.5, col, n.done ? Math.max(0, n.fx / 0.35) : 1);
      if (!n.done) { game.draw.rect(ROPE_X - sz * 0.7, y - 8, sz * 1.4, 16, WHITE); game.draw.rect(ROPE_X - sz * 0.7, y - sz + 10, sz * 1.4, 10, WHITE); }
    }
    // 少年
    var fr = (fin && !cleared) || sadT > 0 ? BOY_SAD : pullT > 0 ? BOY_PULL : BOY_A;
    var hop = joyT > 0 ? -Math.abs(Math.sin(t * 10)) * 18 : 0;
    game.draw.sprite(fr, BOY_PAL, ROPE_X - 150, 1600 + hop + (pullT > 0 ? 20 : 0), 14, { anchor: 'center' });
  }

  function drawGauge(t) {
    // 澄み度ゲージ(左)
    var cr = clarRatio(), gx = 60, gy = 300, gh = 820;
    var fl = stopT > 0 && cr < PASS && Math.floor(t * 16) % 2 === 0;
    rrect(gx, gy, 70, gh, 35, '#ffffff', 0.7);
    if (cr > 0) rrect(gx + 8, gy + 8 + (gh - 16) * (1 - Math.min(1, cr)), 54, Math.max(54, (gh - 16) * Math.min(1, cr)), 27, fl ? MISSC : cr >= PASS ? MINT : '#9fb8d0');
    else if (fl) rrect(gx, gy, 70, gh, 35, MISSC, 0.5);
    game.draw.rect(gx - 10, gy + gh * (1 - PASS), 90, 6, BRICK);
    out(Math.round(cr * 100) + '%', gx + 35, gy - 20, 34, INK);
  }

  function drawHud(t) {
    // 進行(小節)バー
    var prog = Math.min(1, songT / songLen);
    rrect(60, 30, W - 120, 24, 12, '#ffffff', 0.6);
    rrect(60, 30, Math.max(24, (W - 120) * prog), 24, 12, SLATE);
    for (var b = 1; b < BARS; b++) game.draw.rect(60 + (W - 120) * b / BARS, 30, 4, 24, WHITE);
    drawGauge(t);
    out('' + score, W - 150, 130, 46, INK);
    if (combo >= 2) out('x' + combo, W - 150, 190, 40, combo >= 8 ? SUN : SLATE);
    out(perfects + ' / ' + notes.length, W / 2, 130, 40, INK);
  }

  function drawScene(t) {
    drawTown(t);
    drawBell(t);
    drawRope(t);
  }

  // ---- ATTRACT: 本物の pull() で実演。カウント1小節 → 結び目どおりに2回PERFECT、3つ目は引き遅れてMISS ----
  var demo = { t: 0, x: ROPE_X + 120, y: GRIP_Y, press: false, gi: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (3 * 4 * SPB);
    if (cyc < dt || demo.t <= dt) { initGame(true); readyT = 0; demo.gi = 0; }
    stepSong(dt);
    var tgt = notes[demo.gi];
    var hy = GRIP_Y;
    demo.press = false;
    if (tgt && demo.gi < 4 && demo.gi !== 2) {
      var d = tgt.t - songT;
      if (d < 0.1 && !tgt.done) { demo.press = true; hy = GRIP_Y + Math.max(0, (0.1 - d) / 0.1) * 70; }
      if (d <= 0.0 && !tgt.done) { pull(); demo.gi++; }
    } else if (tgt && tgt.done) demo.gi++;
    demo.y += (hy - demo.y) * Math.min(1, dt * 20);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawGauge(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 84, BRICK);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, SLATE);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, BRICK);
      else out('TAP TO START', W / 2, H * 0.975, 40, INK);
      return;
    }

    if (mode === S.RESULT) {
      drawScene(t);
      rrect(90, H * 0.3, W - 180, 540, 40, WHITE, 0.94);
      out(cleared ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 100, cleared ? MINT : MISSC);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, INK);
      out(Math.round(clarRatio() * 100) + '%   PERFECT ' + perfects, W / 2, H * 0.46, 44, INK);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, BRICK);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, SLATE);
      if (!cleared) out('あと' + Math.max(1, Math.ceil((PASS - clarRatio()) * 100)) + '%!', W / 2, H * 0.27, 64, MISSC);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, INK);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepSong(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { clarity: Math.round(clarRatio() * 100), perfect: perfects, good: goods, miss: missN, strays: strays, maxCombo: maxCombo };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      stepSong(dt);
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 120, BRICK);
  });

  function startBgm() {
    game.audio.melody([
      ['G4', 1], ['A4', 1], ['C5', 1], ['E5', 2], ['R', 1],
      ['D5', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['C5', 2], ['R', 1],
    ], { tempo: BPM, wave: 'triangle', volume: 0.05, loop: true, bass: [['C3', 2], ['G2', 2], ['A2', 2], ['F2', 2], ['C3', 2], ['G2', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame(true);
  });
})(game);
