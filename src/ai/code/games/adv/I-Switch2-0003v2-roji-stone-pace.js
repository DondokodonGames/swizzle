// I-Switch2-0003v2-roji-stone-pace.js
// 露地の飛び石 — 亭主が掲げる札の数だけ飛び石を左右の足で交互に踏み、ちょうどの石で止まって一礼する。多くても少なくても失敗
// 操作: 画面の左半分を押すと左足、右半分を押すと右足で次の飛び石へ一歩。石は左右交互に並ぶので足も交互(同じ足を続けるとよろけて進まない)。札の数だけ踏んだら手を止める(0.9秒止まると判定)。先の石は霧に隠れるので歩数を数える。3枚目と5枚目の札は歩く途中で鈴が鳴り、亭主が大きい数の札に掛け替える
// 終わり: 22秒のうちに4枚の札でちょうど止まればCLEAR。踏みすぎ/足りずに止まるのが2回、または時間切れでGAME OVER
// @mechanic: count_exact
// @theme: tea_garden_stepping_stones
// 世界観: 茶室へ続く朝霧の露地で、茶会の案内役が亭主の掲げる札の数だけ飛び石を左右の足で踏み、客を迎える石でぴたりと止まって一礼する
// 残るもの: 正誤(CLEAR/GAME OVER) + ちょうど止まれた札の数・よろけた回数・PERFECT数・スコア
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 菱形グリッドの苔の床、高さは影のずれで見せる。奥ほど小さくしない
  var STYLE = { bg: ['#2f5230', '#16301c'], main: ['#7fb069', '#cfc8b4', '#6a4e38'], accent: ['#ffd25a', '#ffffff'] };
  var MOSS = STYLE.main[0], STONE = STYLE.main[1], WOOD = STYLE.main[2], GOLD = STYLE.accent[0], WHITE = STYLE.accent[1];
  var INK = '#122016', RED = '#ff5a4a', STONE_D = '#8a8472', MOSS_D = '#3f6c3a', MIST = '#dfe8dc';

  var GAME_TITLE = 'ROJI STEPS';
  var TIME_LIMIT = 22;
  var NEEDED = 4;
  var MAX_MISS = 2;
  // [最初の札, 途中で掛け替える札(0=なし)]
  var TASKS = [[3, 0], [5, 0], [4, 6], [6, 0], [5, 7], [8, 0], [6, 9]];
  var STEP_DY = 150, STEP_DX = 112, STOP_WAIT = 0.9, ROUND_IDLE = 4;
  var GUIDE_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var mode = S.ATTRACT;

  var pos, anim, camY, taskI, N, N2, changed, chimeT, count, roundStart, idleT, roundT, rStumble, wobT, padT;
  var stopT, stopKind, gapT, good, misses, stumbles, perfects, score, finalScore, timeLeft, readyT, fin, cleared, postT;
  var bowT, sadT, nodT, plaqueT, warnT, endWhy;

  // 案内役(紺の着物)。歩き2枚 + 一礼 + しょんぼり
  var GUIDE_A = ['....hhhh....', '...hhhhhh...', '...hsssss...', '...skssks...', '....ssss....', '...bbbbbb...', '..bbbddbbb..', '..sbbddbbs..', '...bbbbbb...', '...bbbbbb...', '...bb..bb...', '...ww..ww...', '...gg..gg...'];
  var GUIDE_B = ['....hhhh....', '...hhhhhh...', '...hsssss...', '...skssks...', '....ssss....', '...bbbbbb...', '..bbbddbbb..', '..sbbddbbs..', '...bbbbbb...', '..bbb..bbb..', '..bb....bb..', '..ww....ww..', '..gg....gg..'];
  var GUIDE_BOW = ['............', '............', '............', '....hhhh....', '..bbhhhhbb..', '..bbbhhbbb..', '..bbbddbbb..', '..sbbddbbs..', '...bbbbbb...', '...bbbbbb...', '...bb..bb...', '...ww..ww...', '...gg..gg...'];
  var GUIDE_SAD = ['............', '....hhhh....', '...hhhhhh...', '...hsssss...', '...sksskS...', '....ssss....', '..sbbbbbbs..', '..bbbddbbb..', '...bbddbb...', '...bbbbbb...', '...bb..bb...', '...ww..ww...', '...gg..gg...'];
  var GUIDE_PAL = { h: '#1a1a22', s: '#f2c9a0', k: INK, S: '#9fd4ff', b: '#3d5a99', d: GOLD, w: WHITE, g: WOOD };
  // 亭主(灰の着物)。両手で札を掲げる
  var HOST = ['.s........s.', '.s..hhhh..s.', '.ss.hhhh.ss.', '..m.ssss.m..', '..m.kssk.m..', '..mmssssmm..', '...mmmmmm...', '..mmmddmmm..', '..mmmddmmm..', '...mmmmmm...', '...mmmmmm...', '...mm..mm...', '...ww..ww...'];
  var HOST_PAL = { s: '#f2c9a0', h: '#cfcfcf', m: '#6f6f78', k: INK, d: '#2b2b33', w: WHITE };
  var LANTERN = ['..gggg..', '.gggggg.', 'gggggggg', '..g..g..', '..gyyg..', '..gggg..', '...gg...', '...gg...', '..gggg..', '.gggggg.'];
  var LANTERN_PAL = { g: '#9c9888', y: GOLD };
  var FOOT = ['f.f.f.', '......', '.ffff.', 'ffffff', 'ffffff', '.ffff.', '..fff.', '..fff.', '.ffff.', '.ffff.', '..ff..'];

  function out(str, x, y, sz, col) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: INK, bold: true });
    game.draw.text(str, x, y, { size: sz, color: col, bold: true });
  }
  // 横ストリップで潰れた楕円(等角の円盤)を塗る
  function disc(cx, cy, rx, ry, col, a) {
    for (var dy = -ry; dy < ry; dy += 4) {
      var v = (dy + 2) / ry, hw = rx * Math.sqrt(Math.max(0, 1 - v * v));
      game.draw.rect(cx - hw, cy + dy, hw * 2, 4, col, a);
    }
  }
  function jit(k) { var s = Math.sin(k * 91.7 + 3.1) * 43758.5; return s - Math.floor(s) - 0.5; }
  function stoneX(k) { return k <= 0 ? W / 2 : W / 2 + (k % 2 === 1 ? -STEP_DX : STEP_DX) + jit(k) * 40; }
  function stoneY(k) { return -k * STEP_DY; }
  function nextFoot() { return (pos + 1) % 2 === 1 ? 0 : 1; } // 0=左足 1=右足

  function startTask(i) {
    taskI = i;
    var tk = TASKS[i % TASKS.length];
    N = tk[0]; N2 = tk[1]; changed = false; chimeT = 0;
    count = 0; roundStart = pos; idleT = 0; roundT = 0; rStumble = 0;
  }

  function initGame() {
    pos = 0; anim = 1; camY = -GUIDE_Y; wobT = 0; padT = [0, 0];
    good = 0; misses = 0; stumbles = 0; perfects = 0; score = 0; finalScore = 0;
    timeLeft = TIME_LIMIT; readyT = 0.8; stopT = 0; stopKind = ''; gapT = 0;
    fin = false; cleared = false; postT = 0; bowT = 0; sadT = 0; nodT = 0; plaqueT = 0; warnT = 0; endWhy = '';
    startTask(0);
  }

  // 一歩(本番もデモも同じ処理)
  function step(side) {
    if (stopT > 0 || gapT > 0 || fin) return;
    padT[side] = 0.16;
    if (wobT > 0) { game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.05 }); return; }
    if (side !== nextFoot()) {
      stumbles++; rStumble++; wobT = 0.35; idleT = 0;
      game.audio.tone('D3', 0.1, { wave: 'square', volume: 0.08, slide: -50 });
      game.fx.shake(6, 0.12);
      return;
    }
    pos++; anim = 0; count++; idleT = 0;
    game.audio.tone(count % 2 ? 'G4' : 'A4', 0.06, { wave: 'triangle', volume: 0.13 });
    game.audio.tone('C6', 0.02, { wave: 'square', volume: 0.03 });
    var limit = (N2 && !changed) ? N2 : N;
    if (count > limit) {
      // 踏みすぎ: その石で止め、石を白く大きく
      stopT = 0.5; stopKind = 'over';
      game.fx.flash(WHITE, 0.15);
      game.audio.tone('C3', 0.28, { wave: 'sawtooth', volume: 0.08, slide: -60 });
    }
  }

  function judgeOk() {
    good++; bowT = 0.9; nodT = 0.9;
    var perfect = rStumble === 0;
    if (perfect) perfects++;
    var pts = 200 + N * 15 + (perfect ? 100 : 0) + (changed ? 120 : 0);
    if (mode === S.PLAYING) score += pts;
    var sx = stoneX(pos), sy = Math.max(420, stoneY(pos) - camY);
    game.feedback.good(sx, sy - 170, { text: perfect ? 'PERFECT' : 'GOOD', color: GOLD, size: 64 });
    game.fx.popup('+' + pts, sx, sy - 250, { color: WHITE, size: 44 });
    if (good === 2 && mode === S.PLAYING) {
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('NICE', W / 2, H * 0.34, { color: GOLD, size: 96 });
    }
    if (mode === S.PLAYING && good >= NEEDED) { stopT = 0.45; stopKind = 'win'; game.audio.play('se_powerup', 0.4); return; }
    gapT = 0.7;
  }

  function resolveStop() {
    if (stopKind === 'win') { ending(true); return; }
    misses++; sadT = 0.9;
    var k = stopKind === 'over' ? pos : roundStart + N;
    var sx = stoneX(k), sy = Math.max(470, stoneY(k) - camY);
    game.feedback.bad(sx, sy - 110, { text: 'MISS', color: RED, size: 64 });
    if (stopKind === 'under') game.fx.popup('あと' + (N - count) + '歩', sx, sy - 200, { color: RED, size: 54 });
    if (mode === S.PLAYING && misses >= MAX_MISS) { endWhy = 'miss'; ending(false); return; }
    gapT = 0.7;
  }

  function stepRound(dt) {
    if (anim < 1) anim = Math.min(1, anim + dt / 0.16);
    if (wobT > 0) wobT -= dt;
    padT[0] = Math.max(0, padT[0] - dt); padT[1] = Math.max(0, padT[1] - dt);
    if (bowT > 0) bowT -= dt;
    if (sadT > 0) sadT -= dt;
    if (nodT > 0) nodT -= dt;
    if (plaqueT > 0) plaqueT -= dt;
    camY += (stoneY(pos) - GUIDE_Y - camY) * Math.min(1, dt * 7);
    if (fin) return;
    if (stopT > 0) { stopT -= dt; if (stopT <= 0) resolveStop(); return; }
    if (gapT > 0) {
      gapT -= dt;
      if (gapT <= 0) { startTask(taskI + 1); game.audio.tone('E5', 0.07, { wave: 'triangle', volume: 0.08 }); }
      return;
    }
    roundT += dt; idleT += dt;
    // 札の掛け替え(フェイント): 2歩目で鈴 → 0.6秒後に大きい数へ
    if (N2 && !changed) {
      if (chimeT > 0) {
        chimeT -= dt;
        if (chimeT <= 0) {
          N = N2; changed = true; plaqueT = 0.7;
          game.audio.tone('E6', 0.22, { wave: 'sine', volume: 0.14 });
          game.fx.burst(W * 0.2, 330, { color: GOLD, count: 10, speed: 260 });
        }
      } else if (count >= 2) {
        chimeT = 0.6;
        game.audio.tone('B5', 0.18, { wave: 'sine', volume: 0.13 });
      }
    }
    var pending = N2 && !changed;
    if (count > 0 && !pending && idleT >= STOP_WAIT) {
      if (count === N) { judgeOk(); return; }
      // 足りずに止まった: 止めて、本来止まる石を白く光らせる
      stopT = 0.45; stopKind = 'under';
      game.fx.flash(WHITE, 0.12);
      game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.09 });
      return;
    }
    if (count === 0 && roundT >= ROUND_IDLE) {
      stopT = 0.45; stopKind = 'under';
      game.audio.tone('G2', 0.3, { wave: 'square', volume: 0.09 });
    }
  }

  function ending(win) {
    if (fin) return;
    fin = true; cleared = win; postT = 1.4;
    finalScore = win ? score + Math.round(timeLeft * 40) + (MAX_MISS - misses) * 120 : 0;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.55);
    if (win) {
      for (var i = 0; i < 6; i++) game.fx.burst(120 + i * 170, H * 0.36 + (i % 2) * 140, { color: i % 2 ? GOLD : '#ff9ec4', count: 18, speed: 460 });
      game.fx.flash(WHITE, 0.2);
      bowT = 3;
    } else sadT = 3;
  }

  // ---- 入力 ----
  game.onPress(function(x, y) {
    if (mode !== S.PLAYING || fin || readyT > 0) return;
    if (y < 230) { game.audio.play('se_tap', 0.08); return; }
    if (stopT > 0 || gapT > 0) { game.audio.tone('C4', 0.03, { wave: 'square', volume: 0.04 }); return; }
    step(x < W / 2 ? 0 : 1);
  });
  game.onTap(function(x, y) {
    if (mode === S.ATTRACT) { game.audio.play('se_coin'); mode = S.PLAYING; initGame(); return; }
    if (mode === S.RESULT) { game.audio.play('se_tap'); mode = S.ATTRACT; initGame(); demo.t = 0; startBgm(); return; }
  });

  // ---- 描画 ----
  function drawGarden(t) {
    game.draw.gradient(0, H, [[0, '#4a6e44'], [0.35, STYLE.bg[0]], [1, STYLE.bg[1]]]);
    var off = ((-camY) % 120 + 120) % 120;
    for (var i = -6; i < 20; i++) {
      var y0 = i * 120 + off - 560;
      game.draw.line(0, y0, W, y0 + W * 0.5, MOSS_D, 3);
      game.draw.line(W, y0, 0, y0 + W * 0.5, MOSS_D, 3);
    }
    // 苔のふくらみ(ワールド座標で流れる)
    for (var m = 0; m < 9; m++) {
      var wy = -m * 260 - 80, sy = ((wy - camY) % 2340 + 2340) % 2340 - 210;
      var mx = m % 2 ? 110 + (m * 37) % 90 : W - 120 - (m * 53) % 90;
      disc(mx, sy, 90, 40, MOSS, 0.5);
    }
    // 石灯籠(右手に並ぶ)
    for (var L = 0; L < 4; L++) {
      var ly = ((L * 620 - camY * 1 + 300) % 2480 + 2480) % 2480 - 300;
      disc(W - 150, ly + 66, 70, 22, INK, 0.3);
      game.draw.sprite(LANTERN, LANTERN_PAL, W - 150, ly, 13, { anchor: 'center' });
      game.draw.circle(W - 150, ly - 2, 26 + Math.sin(t * 3 + L) * 4, GOLD, 0.18);
    }
    // 散る紅葉
    for (var f = 0; f < 10; f++) {
      var fx = (f * 211 + Math.sin(t * 0.8 + f) * 60 + t * 25) % W;
      var fy = (f * 389 + t * 70) % H;
      game.draw.rect(fx, fy, 14, 14, f % 3 ? '#e0603a' : GOLD, 0.8);
    }
  }

  function drawStones(t) {
    var hiK = -99;
    var hiFlash = stopT > 0 && (stopKind === 'over' || stopKind === 'under') && Math.floor(t * 16) % 2 === 0;
    if (stopT > 0 && stopKind === 'over') hiK = pos;
    if (stopT > 0 && stopKind === 'under') hiK = roundStart + N;
    for (var k = pos + 11; k >= Math.max(0, pos - 4); k--) {
      var sx = stoneX(k), sy = stoneY(k) - camY;
      if (sy < 200 || sy > H + 80) continue;
      var big = k === hiK ? 1.35 : 1;
      disc(sx + 10, sy + 16, 92 * big, 40 * big, INK, 0.35);
      disc(sx, sy + 10, 86 * big, 38 * big, STONE_D);
      disc(sx, sy, 86 * big, 38 * big, k === hiK && hiFlash ? WHITE : STONE);
      game.draw.rect(sx - 40, sy - 14, 30, 6, WHITE, 0.4);
      // 今回踏んだ石には濡れた足跡
      if (k > roundStart && k <= pos) {
        game.draw.sprite(FOOT, { f: '#5d5848' }, sx, sy, 5, { anchor: 'center', flipX: k % 2 === 0 });
      }
      // 次に踏む石は白縁で明滅
      if (k === pos + 1 && stopT <= 0 && gapT <= 0 && !fin && Math.floor(t * 4) % 2 === 0) {
        for (var a = 0; a < 12; a++) {
          var ang = a / 12 * Math.PI * 2;
          game.draw.rect(sx + Math.cos(ang) * 96 - 4, sy + Math.sin(ang) * 46 - 4, 8, 8, WHITE, 0.9);
        }
      }
    }
  }

  function drawGuide(t) {
    var a = anim, x0 = stoneX(pos - 1), x1 = stoneX(pos), y0 = stoneY(pos - 1), y1 = stoneY(pos);
    if (pos === 0) { x0 = x1; y0 = y1; }
    var gx = x0 + (x1 - x0) * a, gy = y0 + (y1 - y0) * a - camY - Math.sin(Math.PI * a) * 40;
    if (wobT > 0) gx += Math.sin(t * 50) * wobT * 40;
    var fr = (fin && !cleared) || sadT > 0 ? GUIDE_SAD : bowT > 0 ? GUIDE_BOW : a < 1 ? GUIDE_B : GUIDE_A;
    disc(gx, stoneY(pos) - camY + 4, 50, 16, INK, 0.3);
    game.draw.sprite(fr, GUIDE_PAL, gx, gy - 80 + Math.sin(t * 3) * 2, 12, { anchor: 'center', flipX: wobT > 0 && Math.floor(t * 20) % 2 === 0 });
  }

  function drawGate(t) {
    // 霧の帯: 先の石は霧に隠れる
    for (var i = 0; i < 10; i++) game.draw.rect(0, 220 + i * 32, W, 32, MIST, 0.86 - i * 0.08);
    // 茶室(右上)
    var hx = W * 0.72, hy = 250;
    for (var r = 0; r < 18; r++) game.draw.rect(hx - 60 - r * 9, hy + r * 6, 120 + r * 18, 6, r < 3 ? '#4a4038' : '#6b5a48');
    game.draw.rect(hx - 150, hy + 108, 300, 130, '#d8cbb0');
    game.draw.rect(hx - 150, hy + 108, 300, 10, WOOD);
    game.draw.rect(hx - 40, hy + 170, 80, 68, INK);
    game.draw.rect(hx + 70, hy + 140, 50, 50, '#f4ecd8');
    game.draw.line(hx + 95, hy + 140, hx + 95, hy + 190, WOOD, 3);
    // 亭主と札(左上)
    var ny = nodT > 0 ? Math.abs(Math.sin(t * 10)) * 10 : 0;
    var shakeX = chimeT > 0 ? Math.sin(t * 60) * 10 : 0;
    var px = W * 0.2 + shakeX, py = 330;
    var big = (stopT > 0 && stopKind === 'under') || plaqueT > 0 ? 1.2 : 1;
    var fl = (plaqueT > 0 || (stopT > 0 && stopKind !== 'win')) && Math.floor(t * 14) % 2 === 0;
    game.draw.rect(px - 104 * big, py - 92 * big, 208 * big, 184 * big, INK);
    game.draw.rect(px - 96 * big, py - 84 * big, 192 * big, 168 * big, fl ? WHITE : '#c79a62');
    game.draw.rect(px - 96 * big, py - 84 * big, 192 * big, 12, WOOD);
    out('' + N, px, py + 40 * big, 130 * big, fl ? RED : INK);
    if (chimeT > 0) {
      game.draw.circle(px + 130, py - 70, 22, GOLD);
      game.draw.circle(px + 130, py - 70, 34 + (0.6 - chimeT) * 80, GOLD, 0.3);
    }
    game.draw.sprite(HOST, HOST_PAL, W * 0.2, 520 + ny, 11, { anchor: 'center' });
  }

  function drawPads(t) {
    var want = (stopT > 0 || gapT > 0 || fin) ? -1 : nextFoot();
    for (var s = 0; s < 2; s++) {
      var x = s === 0 ? 40 : W / 2 + 20, w = W / 2 - 60, y = H * 0.8, h = H * 0.16;
      var on = s === want, pr = padT[s] > 0;
      var pulse = on ? 0.5 + Math.sin(t * 8) * 0.15 : 0.25;
      game.draw.rect(x - 6, y - 6, w + 12, h + 12, on && Math.floor(t * 4) % 2 === 0 ? WHITE : INK, 0.8);
      game.draw.rect(x, y, w, h, pr ? GOLD : '#2a3d2c', pr ? 0.95 : 0.85);
      game.draw.sprite(FOOT, { f: on ? WHITE : MOSS }, x + w / 2, y + h / 2 + (pr ? 6 : 0), 18, { anchor: 'center', flipX: s === 1, alpha: on ? 1 : pulse + 0.3 });
    }
  }

  function drawHud(t) {
    var low = timeLeft < 5 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(60, 30, W - 120, 22, INK);
    game.draw.rect(60, 30, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 22, low ? RED : GOLD);
    for (var i = 0; i < NEEDED; i++) {
      var cx = W / 2 - 150 + i * 100;
      game.draw.rect(cx - 34, 100, 68, 46, i < good ? '#3a7a4a' : INK, 0.9);
      game.draw.rect(cx - 26, 108, 52, 12, i < good ? '#9fe08a' : '#2a3a2e');
    }
    out(good + ' / ' + NEEDED, W / 2, 200, 44, WHITE);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(70 + m * 60, 104, 42, 42, m < misses ? RED : '#2a3a2e');
    out('' + score, W - 150, 150, 46, WHITE);
  }

  function drawScene(t) {
    drawGarden(t);
    drawStones(t);
    drawGuide(t);
    drawGate(t);
    drawPads(t);
  }

  // ---- ATTRACT: 本物の step() で実演。3の札は L-R-L で止まってPERFECT、5の札は6歩踏んで踏みすぎMISS ----
  var demo = { t: 0, x: W * 0.27, y: H * 0.88, press: false, k: 0, wait: 0, task: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); readyT = 0; demo.k = 0; demo.wait = 0.6; demo.task = 0; }
    stepRound(dt);
    if (demo.task !== taskI) { demo.task = taskI; demo.k = 0; demo.wait = 0.4; }
    var plan = taskI === 0 ? 3 : taskI === 1 ? 6 : 0;
    var side = nextFoot();
    var tx = side === 0 ? W * 0.27 : W * 0.73, ty = H * 0.88;
    demo.press = false;
    if (demo.k < plan && stopT <= 0 && gapT <= 0) {
      demo.wait -= dt;
      if (demo.wait < 0.1) demo.press = true;
      if (demo.wait <= 0) { step(side); demo.k++; demo.wait = 0.36; }
    }
    demo.x += (tx - demo.x) * Math.min(1, dt * 14);
    demo.y += (ty - demo.y) * Math.min(1, dt * 14);
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (mode === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      game.draw.hand(demo.x, demo.y, { press: demo.press, scale: 13 });
      out(GAME_TITLE, W / 2, 110 + Math.sin(t * 2) * 6, 92, GOLD);
      out('HI-SCORE ' + game.best, W / 2, 190, 38, WHITE);
      if (Math.floor(t * 1.8) % 2 === 0) out('► 100円 投入 ◄', W / 2, H * 0.975, 46, GOLD);
      else out('TAP TO START', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    if (mode === S.RESULT) {
      stepRound(0);
      drawScene(t);
      game.draw.rect(90, H * 0.3, W - 180, 540, INK, 0.9);
      game.draw.rect(90, H * 0.3, W - 180, 10, cleared ? MOSS : RED);
      out(cleared ? 'CLEAR' : (endWhy === 'time' ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.35, 100, cleared ? GOLD : RED);
      out('SCORE ' + finalScore, W / 2, H * 0.41, 60, WHITE);
      out(good + ' / ' + NEEDED + '   PERFECT ' + perfects, W / 2, H * 0.46, 44, WHITE);
      if (cleared && finalScore > game.best) out('NEW RECORD', W / 2, H * 0.51, 56, GOLD);
      else out('BEST ' + Math.max(game.best, finalScore), W / 2, H * 0.51, 42, GOLD);
      if (!cleared) out('あと' + (NEEDED - good) + '枚!', W / 2, H * 0.27, 64, RED);
      if (Math.floor(t * 2) % 2 === 0) out('TAP TO CONTINUE', W / 2, H * 0.975, 40, WHITE);
      return;
    }

    // ---- PLAYING ----
    if (fin) {
      postT -= dt;
      stepRound(dt);
      if (postT <= 0) {
        mode = S.RESULT;
        var stats = { exact: good, perfect: perfects, stumbles: stumbles, misses: misses, plaques: taskI + 1 };
        if (cleared) game.end.success(finalScore, stats);
        else game.end.failure(stats);
      }
    } else if (readyT > 0) {
      readyT -= dt;
      if (readyT <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (stopT <= 0) timeLeft -= dt;
      stepRound(dt);
      if (!fin && timeLeft < 5) {
        warnT -= dt;
        if (warnT <= 0) { warnT = 0.5; game.audio.tone(timeLeft < 2 ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.06 }); }
      }
      if (!fin && stopT <= 0 && timeLeft <= 0) {
        timeLeft = 0; endWhy = 'time';
        game.feedback.bad(W / 2, H * 0.3, { text: 'TIME UP', color: RED, size: 72 });
        ending(false);
      }
    }

    drawScene(t);
    drawHud(t);
    if (readyT > 0) out(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 120, GOLD);
  });

  function startBgm() {
    game.audio.melody([
      ['D5', 1], ['E5', 0.5], ['G5', 0.5], ['A5', 1.5], ['R', 0.5],
      ['G5', 1], ['E5', 1], ['D5', 2],
      ['E5', 0.5], ['G5', 0.5], ['A5', 1], ['C6', 1], ['A5', 1],
      ['G5', 1], ['E5', 0.5], ['D5', 0.5], ['E5', 2],
    ], { tempo: 84, wave: 'triangle', volume: 0.05, loop: true, bass: [['D3', 2], ['A2', 2], ['G2', 2], ['D3', 2], ['C3', 2], ['G2', 2], ['A2', 2], ['D3', 2]] });
  }

  game.onStart(function() {
    startBgm();
    mode = S.ATTRACT;
    initGame();
  });
})(game);
