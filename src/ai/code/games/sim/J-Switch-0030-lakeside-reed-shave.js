// J-Switch-0030-lakeside-reed-shave.js
// 葦笛の削りそろえ — 長さのばらばらな葦の管を、吊るされたお手本笛と同じ段の長さまで砥石でこすって削りそろえる
// 操作: 画面を左右に往復してこすると、万力に挟んだ葦の管が上から削れて短くなる(速くこするほど速く削れる)。金の線の帯に入ったら指を離して仕上げ。削りすぎて帯の下へ出ると管が割れる(社内メモ。画面には出さない)
// 終わり: 5本を順に削り終え、割れ・乾き切れが1本以下ならCLEAR(2本でGAME OVER)。1本あたり2.8秒で乾き切れ、全体15秒でTIME UP
// @mechanic: rub
// @theme: lakeside_reed_pipe_shaving
// 世界観: 夏の湖畔の葦笛工房で、見習いの笛職人が、師匠が梁に吊るしたお手本笛の段と同じ長さに、刈りたての葦の管を砥石でこすって削りそろえ、音階のそろった一本の葦笛に仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 仕上げた管の数・PERFECT数・精度%のスコア
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目の作業台、フェルト、光沢のある管。gradient と明暗の帯で厚みを作る
  var STYLE = { bg: ['#6b4a2e', '#3a2616'], main: ['#d8c27a', '#9c8a3e', '#5c7a3a'], accent: ['#f2c14e', '#d94f3d'] };
  var C = {
    wall1: '#8a6440', wall2: '#5a3c22', bench1: '#a0703e', bench2: '#6e4724', grain: '#4e3218',
    felt: '#2f5a3e', feltD: '#224430', reedL: '#e6d48c', reedM: '#c9b262', reedD: '#8f7a34', node: '#7a6428',
    cut: '#f7ecc0', band: '#8fe08a', gold: '#f2c14e', bad: '#d94f3d', white: '#fffbea', ink: '#26170a',
    stone1: '#9aa3a8', stone2: '#6a7378', lake1: '#8fc6d8', lake2: '#4d8aa0', rope: '#c8a870'
  };

  var GAME_TITLE = 'REED PIPES';
  var TIME_LIMIT = 15;
  var NEEDED = 5;
  var PIPE_TIME = 2.8;
  var MAX_MISS = 2;
  var RATE = 0.075;
  var PERFECT_TOL = 6;
  var GOOD_TOL = 15;
  var BASE_Y = Math.round(H * 0.74);
  var PAD_Y = Math.round(H * 0.875);
  var MID_Y = Math.round(H * 0.51);
  var TOP_Y = Math.round(H * 0.06);
  var PIPE_W = 150;
  var UNIT = 560;
  var PATTERNS = [
    [0.95, 0.83, 0.71, 0.59, 0.47],
    [0.47, 0.59, 0.71, 0.83, 0.95],
    [0.90, 0.68, 0.48, 0.68, 0.90],
    [0.60, 0.92, 0.50, 0.80, 0.64]
  ];
  var NOTES = [262, 294, 330, 392, 440];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var model, idx, len, target, pipeT, shaved, grades, misses, perfects, combo, score, accSum;
  var timeLeft, ready, hitStop, hitKind, flyT, finished, ok, endWait, lastX, stoneX, strokeDir, dust, crackY, bestAtStart, halfShown, warnT;

  var APPRENTICE = [
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fefe..', '..ffff..', '.aaaaaa.', 'aaaaaaaa', 'f.aaaa.f', '..bb.bb.', '..bb.bb.'],
    ['..hhhh..', '.hhhhhh.', '..ffff..', '..fefe..', '..ffff..', '.aaaaaa.', 'faaaaaaf', '..aaaa..', '..bb.bb.', '.bb...bb']
  ];
  var APP_PAL = { h: '#e8d27a', f: '#f0c8a0', e: '#26170a', a: '#4a7aa8', b: '#5a3c22' };
  var KINGFISHER = [
    ['...bbb..', '..bbbbb.', 'oobbwbb.', '..bbbbbb', '...oooo.', '....o.o.'],
    ['...bbb..', '..bbbbb.', '.obbwbb.', 'o.bbbbbb', '...oooo.', '....o.o.']
  ];
  var KF_PAL = { b: '#2a8fd0', w: '#ffffff', o: '#e87a2a' };
  var WHETSTONE = ['.gggggggg.', 'gGGGGGGGGg', 'gggggggggg', '.dddddddd.'];
  var WS_PAL = { g: C.stone1, G: '#c8d0d4', d: C.stone2 };

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function targetLen(i) { return model[i] * UNIT; }
  function topY() { return BASE_Y - len; }
  function targetY() { return BASE_Y - target; }

  function loadPipe(i, extra) {
    idx = i;
    target = targetLen(i);
    len = target + (extra !== undefined ? extra : game.random(150, 290));
    pipeT = PIPE_TIME;
    shaved = 0;
    warnT = 0;
  }

  function initGame(patternIndex) {
    var p = patternIndex !== undefined ? patternIndex : Math.floor(game.random(0, PATTERNS.length - 0.001));
    model = PATTERNS[p];
    grades = [];
    misses = 0; perfects = 0; combo = 0; score = 0; accSum = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; hitKind = ''; flyT = 0;
    finished = false; ok = false; endWait = 0; lastX = {}; stoneX = W / 2; strokeDir = 0;
    dust = []; crackY = 0; halfShown = false;
    bestAtStart = game.best || 0;
    loadPipe(0);
  }

  function pitch() { return NOTES[idx] * target / Math.max(40, len); }

  // ── 共通ロジック(本番入力とATTRACTデモの両方から呼ぶ) ─────────────
  function rubBy(dx, x) {
    if (finished || flyT > 0 || hitStop > 0 || ready > 0 || idx >= NEEDED) return false;
    var amt = Math.min(18, Math.abs(dx) * RATE);
    if (amt <= 0) return false;
    len -= amt;
    shaved += amt;
    stoneX = Math.max(200, Math.min(W - 200, stoneX + dx * 0.5));
    var dir = dx > 0 ? 1 : -1;
    var stroke = dir !== strokeDir;
    strokeDir = dir;
    if (dust.length < 40 && Math.random() < 0.6) {
      dust.push({ x: W / 2 + game.random(-PIPE_W / 2, PIPE_W / 2), y: topY(), vx: game.random(-160, 160), vy: game.random(-260, -80), t: 0.5 });
    }
    if (len < target - GOOD_TOL) { crack(); return false; }
    return stroke;
  }

  // 戻り値: 'lock' = 仕上げ / 'long' = まだ長い / '' = 対象なし
  function releasePipe() {
    if (finished || flyT > 0 || hitStop > 0 || ready > 0 || idx >= NEEDED) return '';
    if (shaved <= 0) return '';
    var err = len - target;
    if (Math.abs(err) <= GOOD_TOL) { lockPipe(err); return 'lock'; }
    return 'long';
  }

  function lockPipe(err) {
    var perfect = Math.abs(err) <= PERFECT_TOL;
    var acc = 1 - Math.abs(err) / GOOD_TOL;
    accSum += acc;
    combo = perfect ? combo + 1 : 0;
    if (perfect) perfects++;
    var pts = (perfect ? 300 : 150) + Math.round(pipeT * 40) + (perfect ? combo * 50 : 0);
    score += pts;
    grades[idx] = perfect ? 2 : 1;
    game.feedback.good(W / 2, topY() - 40, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.band });
    game.audio.tone(NOTES[idx], 0.32, { wave: 'triangle', volume: 0.09 });
    if (combo >= 2) game.fx.popup('x' + combo, W / 2 + 180, topY() - 90, { color: C.gold, size: 44 });
    flyT = 0.45;
    var doneCount = countDone();
    if (!halfShown && doneCount === 3) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('3 / ' + NEEDED, W / 2, 620, { color: C.gold, size: 52 });
    }
  }

  function crack() {
    grades[idx] = -1;
    misses++;
    combo = 0;
    hitStop = 0.5; hitKind = 'crack';
    crackY = topY();
    game.audio.play('se_break', 0.5);
    game.feedback.bad(W / 2, topY(), { text: 'MISS', shake: 10 });
  }

  function dryOut() {
    if (Math.abs(len - target) <= GOOD_TOL && shaved > 0) { lockPipe(len - target); return; }
    grades[idx] = -1;
    misses++;
    combo = 0;
    hitStop = 0.45; hitKind = 'dry';
    game.feedback.bad(W / 2, topY(), { text: 'MISS', shake: 6 });
  }

  function countDone() {
    var n = 0;
    for (var i = 0; i < grades.length; i++) if (grades[i] > 0) n++;
    return n;
  }

  function nextPipe() {
    if (misses >= MAX_MISS) { finish(false); return; }
    if (idx + 1 >= NEEDED) { finish(true); return; }
    loadPipe(idx + 1, state === S.ATTRACT ? 120 : undefined);
  }

  function finish(win) {
    if (finished) return;
    finished = true; ok = win;
    if (state !== S.PLAYING) return;
    endWait = 1.2;
    game.audio.stopBgm();
    if (win) {
      game.audio.play('se_success', 0.6);
      game.fx.burst(W / 2, 400, { color: C.gold, count: 30, speed: 520 });
      game.fx.flash(C.gold, 0.25);
    } else {
      game.audio.play('se_failure', 0.6);
    }
  }

  // 時間進行(PLAYINGとATTRACTデモ共通)
  function stepSim(dt, countTime) {
    for (var i = dust.length - 1; i >= 0; i--) {
      var d = dust[i];
      d.t -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 900 * dt;
      if (d.t <= 0) dust.splice(i, 1);
    }
    if (finished) return;
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) { hitKind = ''; nextPipe(); }
      return;
    }
    if (flyT > 0) {
      flyT -= dt;
      if (flyT <= 0) nextPipe();
      return;
    }
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_jump', 0.3);
      return;
    }
    pipeT -= dt;
    // 割れ筋に近づいたら予告(点滅+低い警告音)
    var margin = len - (target - GOOD_TOL);
    if (margin < 22) {
      warnT -= dt;
      if (warnT <= 0) { warnT = 0.22; game.audio.tone(140, 0.06, { wave: 'square', volume: 0.04 }); }
    }
    if (pipeT <= 0) { pipeT = 0; dryOut(); return; }
    if (countTime) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        hitStop = 0; flyT = 0;
        game.feedback.bad(W / 2, topY(), { text: 'TIME UP' });
        finish(false);
      }
    }
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBackdrop() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.wall1], [0.62, C.wall2], [1, '#2a1a0c']]);
    // 窓の向こうの湖と葦(常時そよぐ)
    game.draw.rect(60, 250, 300, 250, C.ink, 0.6);
    for (var y = 258; y < 492; y += 2) {
      var k = (y - 258) / 234;
      game.draw.rect(68, y, 284, 2, k < 0.55 ? '#cfe8ef' : (k < 0.6 ? C.lake1 : C.lake2), 1);
    }
    for (var r = 0; r < 9; r++) {
      var rx = 84 + r * 30 + Math.sin(t * 1.6 + r) * 6;
      game.draw.line(84 + r * 30, 492, rx, 402 + (r % 3) * 16, '#5c7a3a', 5);
      game.draw.rect(rx - 4, 396 + (r % 3) * 16, 8, 22, '#7a5a2a', 1);
    }
    game.draw.sprite(KINGFISHER[Math.floor(t * 3) % 2], KF_PAL, 290 + Math.sin(t * 0.9) * 8, 360 + Math.sin(t * 2.2) * 5, 7, { anchor: 'center' });
    game.draw.rect(52, 242, 316, 8, C.bench1, 1);
    game.draw.rect(52, 492, 316, 12, C.bench1, 1);
    // 作業台(木目)
    game.draw.gradient(1440, H, [C.bench1, C.bench2]);
    game.draw.rect(0, 1440, W, 18, '#c08a50', 1);
    for (var g = 0; g < 7; g++) {
      var gy = 1500 + g * 60 + Math.sin(g * 1.7) * 10;
      game.draw.line(0, gy, W, gy + Math.sin(g) * 14, C.grain, 3);
    }
    // フェルトの砥ぎ台(親指ゾーン)
    game.draw.rect(150, 1560, W - 300, 250, C.feltD, 1);
    game.draw.rect(160, 1570, W - 320, 230, C.felt, 1);
    var glow = 0.08 + 0.06 * Math.sin(t * 3);
    game.draw.rect(160, 1570, W - 320, 230, '#ffffff', glow);
    game.draw.sprite(WHETSTONE, WS_PAL, stoneX, PAD_Y, 14, { anchor: 'center' });
    // 見習い(左下、常時bob)
    var bob = Math.sin(t * 2.4) * 6;
    game.draw.sprite(APPRENTICE[Math.floor(t * 2) % 2], APP_PAL, 96 + Math.sin(t * 0.8) * 5, 1330 + bob, 12, { anchor: 'center' });
    // ambient pulse
    game.draw.rect(0, 0, W, H, '#fff2c0', 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawModel() {
    var t = game.time.elapsed;
    var sway = Math.sin(t * 1.1) * 6;
    var ox = 440 + sway, oy = 270, pw = 60, sc = 0.36;
    game.draw.line(ox - 10, 230, ox + 5 * pw * 0.5, oy - 10, C.rope, 4);
    game.draw.line(ox + 5 * pw + 10, 230, ox + 5 * pw * 0.5, oy - 10, C.rope, 4);
    game.draw.rect(ox - 12, oy - 12, pw * 5 + 24, 16, C.bench2, 1);
    for (var i = 0; i < model.length; i++) {
      var h = model[i] * UNIT * sc;
      var x = ox + i * pw;
      var g = grades[i];
      var col = g === 2 ? C.gold : g === 1 ? C.reedM : g === -1 ? '#5a3a2a' : '#000000';
      if (g === undefined) {
        game.draw.rect(x + 6, oy, pw - 12, h, '#000000', 0.25);
        game.draw.rect(x + 6, oy + h - 4, pw - 12, 4, C.gold, 0.9);
      } else {
        game.draw.rect(x + 6, oy, pw - 12, h, col, 1);
        game.draw.rect(x + 10, oy, 8, h, '#ffffff', 0.35);
        if (g === -1) { game.draw.line(x + 12, oy + 10, x + pw - 14, oy + h - 10, C.bad, 5); }
      }
      if (i === idx && !finished && g === undefined) {
        var pulse = 0.5 + 0.5 * Math.sin(t * 8);
        game.draw.rect(x + 2, oy - 4, pw - 4, 6, C.white, pulse);
        game.draw.rect(x + 2, oy + h - 2, pw - 4, 6, C.white, pulse);
        game.draw.rect(x + 2, oy, 4, h, C.white, pulse);
        game.draw.rect(x + pw - 6, oy, 4, h, C.white, pulse);
      }
    }
  }

  function drawPipe(highlight) {
    if (idx >= NEEDED) return;
    var t = game.time.elapsed;
    var x0 = W / 2 - PIPE_W / 2;
    var ty = topY();
    var flyK = flyT > 0 ? 1 - flyT / 0.45 : 0;
    var yOff = -flyK * 500;
    var alpha = 1 - flyK;
    // 管本体(円筒の明暗を縦帯で)
    var h = BASE_Y - ty;
    var bands = [[0, 0.18, C.reedD], [0.18, 0.4, C.reedM], [0.4, 0.62, C.reedL], [0.62, 0.8, C.reedM], [0.8, 1, C.reedD]];
    for (var b = 0; b < bands.length; b++) {
      game.draw.rect(x0 + PIPE_W * bands[b][0], ty + yOff, PIPE_W * (bands[b][1] - bands[b][0]) + 1, h, bands[b][2], alpha);
    }
    game.draw.rect(x0 + PIPE_W * 0.46, ty + yOff, 10, h, '#ffffff', 0.35 * alpha);
    for (var n = BASE_Y - 170; n > ty + 30; n -= 190) game.draw.rect(x0 - 4, n + yOff, PIPE_W + 8, 12, C.node, alpha);
    // 切り口
    game.draw.rect(x0, ty + yOff - 8, PIPE_W, 16, C.cut, alpha);
    game.draw.rect(x0 + 30, ty + yOff - 4, PIPE_W - 60, 8, C.reedD, alpha);
    // 目標帯と割れ筋(目標より下は赤いトゲ印)
    var gy = targetY();
    if (flyT <= 0) {
      game.draw.rect(x0 - 70, gy - GOOD_TOL, PIPE_W + 140, GOOD_TOL * 2, C.band, 0.45);
      for (var dx = x0 - 90; dx < x0 + PIPE_W + 90; dx += 36) game.draw.rect(dx, gy - 3, 22, 6, C.gold, 1);
      var margin = len - (target - GOOD_TOL);
      var blink = margin < 22 && Math.floor(t * 10) % 2 === 0;
      var ry = gy + GOOD_TOL;
      for (var k = 0; k < 6; k++) {
        var sx = x0 - 60 + k * 20;
        game.draw.rect(sx, ry + 4, 12, 4, C.bad, blink ? 1 : 0.6);
        game.draw.rect(sx + 3, ry + 8, 6, 6, C.bad, blink ? 1 : 0.6);
        var sx2 = x0 + PIPE_W + 60 - k * 20 - 12;
        game.draw.rect(sx2, ry + 4, 12, 4, C.bad, blink ? 1 : 0.6);
        game.draw.rect(sx2 + 3, ry + 8, 6, 6, C.bad, blink ? 1 : 0.6);
      }
    }
    if (highlight) {
      game.draw.rect(x0 - 10, ty - 10, PIPE_W + 20, h + 10, C.white, 0.55);
      if (hitKind === 'crack') {
        game.draw.line(x0 + 30, ty, x0 + 80, ty + 160, C.bad, 8);
        game.draw.line(x0 + 80, ty + 160, x0 + 50, ty + 300, C.bad, 8);
      }
    }
    // 砥石(管の上端に乗る)
    if (flyT <= 0 && !finished) game.draw.sprite(WHETSTONE, WS_PAL, W / 2 + (stoneX - W / 2) * 0.25, ty - 26, 10, { anchor: 'center' });
    // 万力
    game.draw.rect(x0 - 80, BASE_Y - 10, PIPE_W + 160, 60, '#5a5f63', 1);
    game.draw.rect(x0 - 80, BASE_Y - 10, PIPE_W + 160, 12, '#9aa3a8', 1);
    game.draw.circle(x0 - 50, BASE_Y + 20, 14, '#c8d0d4');
    game.draw.circle(x0 + PIPE_W + 50, BASE_Y + 20, 14, '#c8d0d4');
    // 管ごとの乾き時計(縮むバー)
    if (flyT <= 0 && !finished) {
      var k2 = Math.max(0, pipeT / PIPE_TIME);
      game.draw.rect(x0 + PIPE_W + 100, BASE_Y - 400, 22, 400, '#000000', 0.35);
      game.draw.rect(x0 + PIPE_W + 100, BASE_Y - 400 * k2, 22, 400 * k2, k2 < 0.3 ? C.bad : C.band, 1);
    }
  }

  function drawDust() {
    for (var i = 0; i < dust.length; i++) {
      var d = dust[i];
      game.draw.rect(d.x, d.y, 8, 5, C.cut, Math.max(0, d.t * 2));
    }
  }

  function drawHud() {
    txt(countDone() + ' / ' + NEEDED, 60, 90, 44, C.white, 'left');
    for (var m = 0; m < MAX_MISS; m++) {
      var used = m < misses;
      game.draw.rect(W - 116 - m * 60, 56, 30, 56, used ? C.bad : C.reedM, 1);
      game.draw.rect(W - 118 - m * 60, 78, 34, 8, C.node, 1);
      if (used) game.draw.line(W - 118 - m * 60, 62, W - 86 - m * 60, 108, C.white, 4);
    }
    txt('SCORE ' + score, W / 2, 90, 34, C.gold);
    var lowTime = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 176, W - 120, 18, '#000000', 0.4);
    game.draw.rect(60, 176, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, lowTime ? C.bad : C.gold, 1);
  }

  // ── ATTRACTデモ(実ロジックを流用) ─────────────────────
  var DEMO_CYC = 4.6;
  var demo = { t: 0, gx: W / 2, gy: 1680, press: false, phase: 0, px: W / 2 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) {
      initGame(0);
      ready = 0;
      loadPipe(0, 150);
      demo.phase = 0; demo.px = W / 2;
    }
    var active = !finished && flyT <= 0 && hitStop <= 0 && idx < NEEDED;
    if (active) {
      var remain = len - target;
      // 1本目は帯に入ったら離して成功、2本目はこすり過ぎて割る(失敗例)
      var careless = idx >= 1;
      if (idx >= 2) { demo.press = false; stepSim(dt, false); return; }
      var speed = careless || remain > 40 ? 2300 : 1000;
      if (!careless && Math.abs(remain) <= PERFECT_TOL - 1) {
        demo.press = false;
        releasePipe();
      } else {
        demo.press = true;
        var nx = W / 2 + Math.sin(demo.t * speed / 180) * 180;
        var dx = nx - demo.px;
        demo.px = nx;
        if (rubBy(dx, nx)) game.audio.tone(pitch(), 0.05, { wave: 'triangle', volume: 0.03 });
      }
    } else {
      demo.press = false;
    }
    demo.gx = demo.px; demo.gy = PAD_Y + 10;
    stepSim(dt, false);
  }

  // ── 入力 ─────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(0); demo.t = 0; return; }
  });
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    lastX[id] = x;
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: C.cut, count: 4, speed: 140 });
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (lastX[id] === undefined) { lastX[id] = x; return; }
    var dx = x - lastX[id];
    lastX[id] = x;
    if (rubBy(dx, x)) game.audio.tone(pitch(), 0.05, { wave: 'triangle', volume: 0.05 });
  });
  game.onRelease(function(x, y, id) {
    if (state !== S.PLAYING) return;
    delete lastX[id];
    if (releasePipe() === 'long') {
      // まだ長い: 今の音を鳴らして「高さが違う」を聞かせる
      game.audio.play('se_tap', 0.25);
      game.audio.tone(pitch(), 0.12, { wave: 'triangle', volume: 0.06 });
    }
  });

  // ── メインループ(1本だけ) ─────────────────────────────
  game.onUpdate(function(dt) {
    if (model === undefined) initGame(0);

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBackdrop();
      drawModel();
      drawPipe(hitStop > 0);
      drawDust();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var lb = Math.sin(game.time.elapsed * 2) * 6;
      txt(GAME_TITLE, W / 2, TOP_Y + 0 + lb, 72, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, 190, 32, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, 1860, 44, C.gold);
      else txt('TAP TO START', W / 2, 1860, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawBackdrop();
      drawModel();
      var t = game.time.elapsed;
      if (ok) {
        for (var s = 0; s < 6; s++) game.draw.rect(120 + s * 170, 0, 40, 1440, C.gold, 0.08 + 0.06 * Math.sin(t * 4 + s));
        txt('CLEAR', W / 2, 760 + Math.sin(t * 5) * 8, 110, C.gold);
      } else {
        txt('GAME OVER', W / 2, 760, 96, C.bad);
        var left = NEEDED - countDone();
        if (left > 0) txt('あと' + left + '本!', W / 2, 870, 54, C.white);
      }
      var accP = countDone() > 0 ? Math.round(accSum / countDone() * 100) : 0;
      txt('SCORE ' + score, W / 2, 1000, 56, C.white);
      txt('PERFECT ' + perfects + '   ' + accP + '%', W / 2, 1090, 40, C.gold);
      if (ok && score > bestAtStart) txt('NEW RECORD', W / 2, 1180, 52, C.gold);
      else txt('BEST ' + Math.max(bestAtStart, 0), W / 2, 1180, 40, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, 1860, 38, C.white);
      return;
    }

    // PLAYING
    if (finished) {
      endWait -= dt;
      stepSim(dt, false);
      if (endWait <= 0) {
        state = S.RESULT;
        var accP2 = countDone() > 0 ? Math.round(accSum / countDone() * 100) : 0;
        var stats = { pipes: countDone(), perfect: perfects, accuracy: accP2, misses: misses };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else {
      stepSim(dt, true);
    }

    drawBackdrop();
    drawModel();
    drawPipe(hitStop > 0);
    drawDust();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, MID_Y, 96, C.gold);
    if (finished) txt(ok ? 'FINISH' : (timeLeft <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, 980, 90, ok ? C.gold : C.bad);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['G5', 0.5], ['E5', 0.5], ['D5', 1],
      ['C5', 0.5], ['A4', 0.5], ['G4', 1], ['A4', 0.5], ['C5', 0.5], ['D5', 1]
    ], { tempo: 104, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame(0);
  });
})(game);
