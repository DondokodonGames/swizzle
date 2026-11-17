// K-GBA-0002v2-moon-sprout-pinch.js
// 月面間引きピンチ — 裏拍で鳴る電子音のピッと同時に、伸びきった芽を二本指で挟んで抜く
// 操作: 芽の左右に指を1本ずつ同時に置いて挟む。表拍(ドン)で芽が伸び、裏拍(ピッ)の瞬間に挟むと抜ける。1本指では抜けない
// 終わり: 6小節(約14秒)を乗り切ればCLEAR。抜き損ねて芽を3本咲かせる/ちぎるとGAME OVER
// @mechanic: pinch_zone
// @theme: lunar_dome_sprout_thinning
// 世界観: 月面の温室ドーム。天井レールに吊られた園芸ロボットが、人工土から伸びる細い芽を二本のアームで裏拍ごとに間引く
// 残るもの: 正誤(CLEAR/GAME OVER) + 判定スコア(PERFECT/GOOD/MISS数・最大コンボ)
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 黒地に白ドット、画面の帯ごとにセロハン色を重ねる。矩形波の単音と無音の間
  var STYLE = { bg: ['#000000', '#0c0c12'], main: ['#f2f2f2', '#9a9a9a', '#4a4a4a'], accent: ['#ffb43c', '#5cff8a'] };
  var C = {
    bg0: STYLE.bg[0], bg1: STYLE.bg[1], white: STYLE.main[0], gray: STYLE.main[1], dim: STYLE.main[2],
    amber: STYLE.accent[0], green: STYLE.accent[1], cyan: '#5ce0ff', red: '#ff4a4a', ink: '#000000'
  };

  var GAME_TITLE = 'MOON PINCH';
  var BPM = 100;
  var SPB = 60 / BPM;
  var BARS = 6;
  var SONG_BEATS = BARS * 4;
  var WIN_P = 0.07, WIN_G = 0.15, WIN_TEAR = 0.32;
  var LIVES = 3;
  var SLOTS = [W * 0.14, W * 0.32, W * 0.5, W * 0.68, W * 0.86];
  var TRAY_Y = H * 0.6;
  var GROW_H = 230;
  var PAIR_T = 0.15, SPAN_MIN = 30, SPAN_MAX = 440;
  var RAIL_Y = H * 0.27;
  // [拍, 溝]: 拍 b の裏(b + 0.5 拍)で抜く
  var CHART = [[1, 2], [3, 1], [5, 3], [7, 2], [8, 1], [9, 2], [11, 4], [12, 3], [13, 4], [15, 2], [16, 1], [17, 0], [19, 2], [20, 3], [21, 4], [22, 3]];
  var DEMO_CHART = [[0, 1], [1, 3], [2, 2], [3, 4]];
  var DEMO_BEATS = 5.5;
  var MEL = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5'];
  var BASS = ['C3', 'C3', 'A2', 'A2', 'F2', 'F2', 'G2', 'G2'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var R = null;
  var demo = { t: 0, press: false, pressT: 0, l: [W * 0.35, H * 0.8], r: [W * 0.65, H * 0.8] };
  var STARS = [];
  for (var si0 = 0; si0 < 70; si0++) STARS.push([(si0 * 397) % W, 240 + ((si0 * 241) % 520), (si0 % 3) + 2]);

  // 園芸ロボット(レールから吊り下がる)
  var BOT_A = ['....y....', '....w....', '.wwwwwww.', '.wkwwwkw.', '.wwwwwww.', '.wwkkkww.', '..wwwww..', '.w.w.w.w.'];
  var BOT_B = ['....y....', '....w....', '.wwwwwww.', '.wwwwwww.', '.wkwwwkw.', '.wwkkkww.', '..wwwww..', 'w..w.w..w'];
  var BOT_OOPS = ['....y....', '....w....', '.wwwwwww.', '.wkwwwkw.', '.wwwwwww.', '.wwwkwww.', '..wwwww..', '.w.w.w.w.'];
  var LEAF_A = ['w...w', 'ww.ww', '.www.', '..w..'];
  var LEAF_B = ['.w..w', 'ww.ww', '.www.', '..w..'];
  var BLOOM = ['.w.w.', 'wwwww', '.wkw.', 'wwwww', '.w.w.'];
  var CLAW = ['w.w', 'w.w', 'www'];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function newRun(isDemo) {
    var chart = isDemo ? DEMO_CHART : CHART;
    var sp = [];
    for (var i = 0; i < chart.length; i++) {
      sp.push({ b: chart[i][0], slot: chart[i][1], T: (chart[i][0] + 0.5) * SPB, st: 'wait', flash: 0, lift: 0, seedT: 0, kind: '', hit: false });
    }
    return {
      demo: isDemo, sp: sp, songT: 0, stepIdx: -1, ready: isDemo ? 0 : 0.8,
      lives: LIVES, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0,
      stop: 0, stopSp: null, over: false, ok: false, endWait: 0,
      pip: 0, thump: 0, presses: [], clack: 0, clackX: W / 2, lone: 0, loneX: 0, loneY: 0,
      botX: W / 2, oops: 0
    };
  }

  function startAttractBgm() {
    game.audio.melody([
      ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['G5', 0.5], ['R', 0.5], ['A5', 0.5], ['R', 0.5], ['G5', 0.5],
      ['R', 0.5], ['E5', 0.5], ['R', 0.5], ['D5', 0.5], ['R', 0.5], ['C5', 0.5], ['R', 0.5], ['D5', 0.5]
    ], {
      tempo: BPM, wave: 'square', volume: 0.05, loop: true,
      bass: [['C3', 0.5], ['R', 0.5], ['C3', 0.5], ['R', 0.5], ['A2', 0.5], ['R', 0.5], ['A2', 0.5], ['R', 0.5],
        ['F2', 0.5], ['R', 0.5], ['F2', 0.5], ['R', 0.5], ['G2', 0.5], ['R', 0.5], ['G2', 0.5], ['R', 0.5]]
    });
  }

  function initGame() {
    R = newRun(state !== S.PLAYING);
    if (state === S.PLAYING) game.audio.stopBgm();
    else startAttractBgm();
  }

  // 8分ステップ: 表拍は低いドン、裏拍は電子音のピッ(=抜く合図)と旋律
  function onStep(s) {
    if (s % 2 === 0) {
      R.thump = 1;
      if (!R.demo) {
        game.audio.tone(BASS[(s / 2) % 8], SPB * 0.35, { wave: 'triangle', volume: 0.08 });
        game.audio.tone(70, 0.06, { wave: 'square', volume: 0.05 });
      }
    } else {
      R.pip = 1;
      if (!R.demo) {
        game.audio.tone(2093, 0.04, { wave: 'square', volume: 0.07 });
        game.audio.tone(MEL[((s - 1) / 2) % 8], SPB * 0.3, { wave: 'square', volume: 0.05 });
      }
    }
  }

  // 二本指の挟み: 指と指の間(xl〜xr)にある芽を、裏拍からのずれで判定
  function pinch(xl, xr) {
    if (!R || R.over || R.ready > 0 || R.stop > 0) return 'none';
    R.clack = 0.22; R.clackX = (xl + xr) / 2;
    var best = null, bestD = 1e9;
    for (var i = 0; i < R.sp.length; i++) {
      var s = R.sp[i];
      if (s.st !== 'tel' && s.st !== 'grow') continue;
      var x = SLOTS[s.slot];
      if (x < xl - 30 || x > xr + 30) continue;
      var d = R.songT - s.T;
      if (Math.abs(d) < Math.abs(bestD)) { bestD = d; best = s; }
    }
    if (!best || Math.abs(bestD) > WIN_TEAR) return 'air';
    R.clackX = SLOTS[best.slot];
    if (Math.abs(bestD) > WIN_G) { missSprout(best, 'tear'); return 'tear'; }
    var grade = Math.abs(bestD) <= WIN_P ? 'PERFECT' : 'GOOD';
    best.st = 'pluck'; best.lift = 0;
    R.combo++;
    if (R.combo > R.maxCombo) R.maxCombo = R.combo;
    if (grade === 'PERFECT') { R.perfect++; R.score += 100 + R.combo * 10; }
    else { R.good++; R.score += 50 + R.combo * 5; }
    var px = SLOTS[best.slot];
    game.feedback.good(px, TRAY_Y - GROW_H - 40, { text: grade, color: grade === 'PERFECT' ? C.amber : C.green, count: grade === 'PERFECT' ? 16 : 8 });
    game.fx.burst(px, TRAY_Y, { color: C.white, count: 10, speed: 220 });
    if (!R.demo && R.combo % 5 === 0) {
      game.fx.popup(R.combo + ' COMBO', W / 2, H * 0.4, { color: C.amber, size: 64 });
      game.audio.play('se_milestone', 0.5);
    }
    return grade;
  }

  function missSprout(s, kind) {
    s.st = 'stop'; s.kind = kind; s.flash = 0.4;
    R.stop = 0.4; R.stopSp = s; R.oops = 1.2;
    R.combo = 0; R.miss++; R.lives--;
    if (!R.demo) game.audio.tone(150, 0.25, { wave: 'sawtooth', volume: 0.1, slide: -60 });
  }

  function releaseStop() {
    var s = R.stopSp;
    R.stopSp = null;
    if (!s) return;
    var x = SLOTS[s.slot];
    if (s.kind === 'seed') { s.st = 'seed'; s.seedT = 1.4; } else { s.st = 'gone'; game.fx.burst(x, TRAY_Y - 40, { color: C.gray, count: 12, speed: 200 }); }
    game.feedback.bad(x, TRAY_Y - GROW_H - 40, { text: 'MISS' });
    if (R.lives <= 0 && !R.demo) endRun(false);
  }

  function endRun(ok) {
    if (R.over) return;
    R.over = true; R.ok = ok; R.endWait = 1.8;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    if (ok) {
      for (var i = 0; i < 5; i++) game.fx.burst(SLOTS[i], TRAY_Y - 120, { color: i % 2 ? C.green : C.white, count: 16, speed: 420 });
    }
    if (R.score > game.best && game.best > 0) {
      game.fx.popup('NEW RECORD', W / 2, H * 0.36, { color: C.amber, size: 72 });
      game.audio.play('se_milestone', 0.5);
    }
  }

  function stepRun(dt) {
    R.pip = Math.max(0, R.pip - dt * 5);
    R.thump = Math.max(0, R.thump - dt * 5);
    R.clack = Math.max(0, R.clack - dt);
    R.lone = Math.max(0, R.lone - dt);
    R.oops = Math.max(0, R.oops - dt);
    for (var j = 0; j < R.sp.length; j++) {
      var q = R.sp[j];
      if (q.st === 'pluck') { q.lift += dt * 3; if (q.lift >= 1) q.st = 'gone'; }
      if (q.st === 'seed') { q.seedT -= dt; if (q.seedT <= 0) q.st = 'gone'; }
    }
    if (R.over) return;
    if (R.stop > 0) {
      R.stop -= dt;
      if (R.stop <= 0) releaseStop();
      return;
    }
    if (R.ready > 0) {
      var was = R.ready;
      R.ready -= dt;
      if (was > 0.4 && R.ready <= 0.4) game.audio.tone('C5', 0.08, { wave: 'square', volume: 0.08 });
      if (R.ready <= 0) game.audio.play('se_tap', 0.6);
      return;
    }
    R.songT += dt;
    var si = Math.floor(R.songT / (SPB / 2));
    while (R.stepIdx < si) { R.stepIdx++; onStep(R.stepIdx); }
    for (var i = 0; i < R.sp.length; i++) {
      var s = R.sp[i];
      if (s.flash > 0) s.flash -= dt;
      if (s.st === 'wait' && R.songT >= s.T - SPB) {
        s.st = 'tel';
        if (!R.demo) game.audio.tone(330, 0.04, { wave: 'square', volume: 0.05 });
      }
      if (s.st === 'tel' && R.songT >= s.T - 0.5 * SPB) s.st = 'grow';
      if (s.st === 'grow' && R.songT > s.T + WIN_G) { missSprout(s, 'seed'); return; }
    }
    // 相方の指が来なかった1本指: 片腕だけ空を切る
    for (var k = 0; k < R.presses.length; k++) {
      var p = R.presses[k];
      if (!p.done && game.time.elapsed - p.t > PAIR_T) { p.done = true; R.lone = 0.25; R.loneX = p.x; R.loneY = p.y; }
    }
    if (!R.demo && R.songT >= SONG_BEATS * SPB) endRun(true);
  }

  // ATTRACT: 2本のゴースト手が芽を挟んで裏拍で抜く。4本目は見送って咲かせる(失敗例)
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % (DEMO_BEATS * SPB + 0.8);
    if (cyc < dt || demo.t <= dt) { R = newRun(true); demo.pressT = 0; }
    demo.pressT = Math.max(0, demo.pressT - dt);
    var tl = [W * 0.36, H * 0.8], tr = [W * 0.64, H * 0.8];
    var next = null;
    for (var i = 0; i < R.sp.length - 1; i++) {
      var s = R.sp[i];
      if (s.st === 'wait' || s.st === 'tel' || s.st === 'grow') { next = s; break; }
    }
    if (next) {
      var x = SLOTS[next.slot], dtA = next.T - R.songT;
      if (dtA < 0.45) { tl = [x - 110, TRAY_Y - 90]; tr = [x + 110, TRAY_Y - 90]; }
      if (dtA <= 0 && !next.hit && R.stop <= 0) { next.hit = true; pinch(x - 110, x + 110); demo.pressT = 0.15; }
    }
    var k = Math.min(1, dt * 12);
    demo.l = [demo.l[0] + (tl[0] - demo.l[0]) * k, demo.l[1] + (tl[1] - demo.l[1]) * k];
    demo.r = [demo.r[0] + (tr[0] - demo.r[0]) * k, demo.r[1] + (tr[1] - demo.r[1]) * k];
    demo.press = demo.pressT > 0;
  }

  // ── 描画 ──────────────────────────────────────────────
  function drawBg() {
    var e = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg0]]);
    for (var i = 0; i < STARS.length; i++) {
      var tw = (Math.floor(e * 2 + i) % 7 === 0) ? C.gray : C.white;
      game.draw.rect(STARS[i][0], STARS[i][1], STARS[i][2], STARS[i][2], tw);
    }
    // 地球(白い輪+点の大陸)
    game.draw.circle(W * 0.8, H * 0.2, 86, C.white);
    game.draw.circle(W * 0.8, H * 0.2, 78, C.ink);
    for (var c = 0; c < 9; c++) game.draw.rect(W * 0.8 - 46 + (c * 37) % 90, H * 0.2 - 40 + (c * 23) % 80, 10, 10, C.gray);
    // ドームの骨組み(白ドットの弧)
    for (var a = 0; a <= 48; a++) {
      var ang = Math.PI + (a / 48) * Math.PI;
      game.draw.rect(W / 2 + Math.cos(ang) * 560 - 4, H * 0.66 + Math.sin(ang) * 480 - 4, 8, 8, C.white);
      game.draw.rect(W / 2 + Math.cos(ang) * 380 - 3, H * 0.66 + Math.sin(ang) * 330 - 3, 6, 6, C.dim);
    }
    // 天井レール
    game.draw.rect(0, RAIL_Y, W, 10, C.gray);
    for (var r = 0; r < 12; r++) game.draw.rect(r * 96 + ((e * 40) % 96), RAIL_Y + 2, 6, 6, C.ink);
    // 月面の床と制御盤(表拍でランプ)
    game.draw.rect(0, H * 0.68, W, H * 0.32, C.dim, 0.5);
    for (var d = 0; d < 40; d++) game.draw.rect((d * 263) % W, H * 0.7 + ((d * 157) % 500), 6, 6, C.gray);
    for (var l = 0; l < 6; l++) {
      var on = (l % 2 === 0) ? R.thump > 0.3 : R.pip > 0.3;
      game.draw.rect(W * 0.18 + l * 120, H * 0.88, 64, 36, on ? C.white : C.dim);
    }
  }

  function drawTray() {
    game.draw.rect(60, TRAY_Y, W - 120, 26, C.white);
    game.draw.rect(60, TRAY_Y + 26, W - 120, 70, C.dim);
    for (var x = 80; x < W - 80; x += 28) game.draw.rect(x, TRAY_Y + 40 + (x % 3) * 12, 8, 8, C.gray);
    if (R.thump > 0) game.draw.rect(60, TRAY_Y - 6, W - 120, 6, C.white, R.thump);
    for (var i = 0; i < SLOTS.length; i++) game.draw.rect(SLOTS[i] - 40, TRAY_Y + 4, 80, 10, C.ink);
  }

  function drawSprouts() {
    var e = game.time.elapsed;
    for (var i = 0; i < R.sp.length; i++) {
      var s = R.sp[i];
      var x = SLOTS[s.slot];
      if (s.st === 'tel') {
        if (Math.floor(e * 12) % 2 === 0) {
          for (var c = -2; c <= 2; c++) game.draw.rect(x + c * 14 - 4, TRAY_Y - 10 - Math.abs(c) * 4, 8, 8, C.white);
        }
      } else if (s.st === 'grow' || s.st === 'stop') {
        var g = Math.max(0, Math.min(1, (R.songT - (s.T - 0.5 * SPB)) / (0.5 * SPB)));
        if (s.st === 'stop') g = 1;
        var h = GROW_H * g;
        var big = s.st === 'stop' ? 1.4 : 1;
        if (s.st === 'stop') game.draw.rect(x - 70, TRAY_Y - h * big - 50, 140, h * big + 50, C.white, Math.floor(e * 20) % 2 ? 0.8 : 0.3);
        game.draw.line(x, TRAY_Y, x, TRAY_Y - h * big, s.st === 'stop' ? C.ink : C.white, 8 * big);
        game.draw.sprite(Math.floor(e * 3) % 2 ? LEAF_A : LEAF_B, { w: s.st === 'stop' ? C.ink : C.white }, x, TRAY_Y - h * big - 20, 14 * big, { anchor: 'center' });
        // 迫る点の輪: 裏拍の瞬間に芽の先へ収束
        if (s.st === 'grow') {
          var rr = 30 + Math.max(0, s.T - R.songT) / (0.5 * SPB) * 130;
          for (var a = 0; a < 12; a++) {
            var an = (a / 12) * Math.PI * 2;
            game.draw.rect(x + Math.cos(an) * rr - 4, TRAY_Y - h - 20 + Math.sin(an) * rr - 5, 10, 10, C.white);
          }
        }
      } else if (s.st === 'pluck') {
        var yy = TRAY_Y - GROW_H - s.lift * 380;
        game.draw.line(x, yy + GROW_H * 0.8, x, yy, C.white, 8);
        game.draw.sprite(LEAF_A, { w: C.white }, x, yy - 20, 14, { anchor: 'center' });
      } else if (s.st === 'seed') {
        game.draw.line(x, TRAY_Y, x, TRAY_Y - GROW_H, C.gray, 8);
        game.draw.sprite(BLOOM, { w: C.white, k: C.ink }, x, TRAY_Y - GROW_H - 20, 14, { anchor: 'center' });
      }
    }
  }

  function drawBot(targets) {
    var e = game.time.elapsed;
    var tx = targets.length ? (targets[0][0] + targets[targets.length - 1][0]) / 2 : W / 2;
    R.botX += (tx - R.botX) * Math.min(1, game.time.delta * 6);
    var bx = R.botX, by = RAIL_Y + 70 + Math.sin(e * 3) * 6;
    var frame = R.oops > 0 ? BOT_OOPS : (Math.floor(e * 2) % 2 ? BOT_A : BOT_B);
    game.draw.line(bx, RAIL_Y + 8, bx, by - 40, C.gray, 8);
    var tips = [];
    if (R.clack > 0) {
      var gap = 20 + (R.clack / 0.22) * 60;
      tips = [[R.clackX - gap, TRAY_Y - GROW_H * 0.6], [R.clackX + gap, TRAY_Y - GROW_H * 0.6]];
    } else if (targets.length >= 2) {
      tips = [targets[0], targets[1]];
    } else if (targets.length === 1) {
      tips = [targets[0], [bx + 120, TRAY_Y - 280]];
    } else {
      tips = [[bx - 120, TRAY_Y - 280], [bx + 120, TRAY_Y - 280]];
    }
    if (R.lone > 0) tips[0] = [R.loneX, R.loneY];
    for (var i = 0; i < 2; i++) {
      var sx = bx + (i === 0 ? -56 : 56), sy = by + 20;
      var ex = (sx + tips[i][0]) / 2 + (i === 0 ? -40 : 40), ey = (sy + tips[i][1]) / 2 - 30;
      game.draw.line(sx, sy, ex, ey, C.white, 10);
      game.draw.line(ex, ey, tips[i][0], tips[i][1], C.white, 8);
      game.draw.sprite(CLAW, { w: C.white }, tips[i][0], tips[i][1] + 10, 10, { anchor: 'center' });
    }
    game.draw.sprite(frame, { w: C.white, k: C.ink, y: R.pip > 0.3 ? C.white : C.dim }, bx, by, 14, { anchor: 'center' });
  }

  function drawBands() {
    // セロハン帯: 上=琥珀 / 中=緑 / 下=水色
    game.draw.rect(0, 0, W, 230, C.amber, 0.3);
    game.draw.rect(0, H * 0.44, W, H * 0.24, C.green, 0.26);
    game.draw.rect(0, H * 0.74, W, H * 0.26, C.cyan, 0.2);
  }

  function drawWorld(targets) {
    drawBg();
    drawTray();
    drawSprouts();
    drawBot(targets);
    drawBands();
  }

  function drawHud() {
    txt('SCORE ' + R.score, 40, 64, 44, C.white, 'left');
    txt('BEST ' + game.best, W - 40, 64, 34, C.white, 'right');
    for (var i = 0; i < LIVES; i++) game.draw.sprite(LEAF_A, { w: i < R.lives ? C.white : C.dim }, W - 70 - i * 70, 150, 9, { anchor: 'center' });
    // 8分の拍列(大=表拍ドン / 小=裏拍ピッ)。光る小マスが抜く瞬間
    var cur = R.ready > 0 ? -1 : R.stepIdx % 8;
    for (var c = 0; c < 8; c++) {
      var off = c % 2 === 1;
      var sz = off ? 30 : 46;
      var x = 120 + c * 78;
      var lit = c === cur;
      game.draw.rect(x - sz / 2, 150 - sz / 2, sz, sz, lit ? C.white : (off ? C.gray : C.dim));
    }
    var progress = Math.min(1, R.songT / (SONG_BEATS * SPB));
    game.draw.rect(40, 204, W - 80, 12, C.dim);
    game.draw.rect(40, 204, (W - 80) * progress, 12, C.white);
    if (R.combo >= 2) txt(R.combo + ' COMBO', W / 2, H * 0.71, 40, C.white);
    if (R.ready > 0) txt(R.ready > 0.4 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, C.white);
  }

  function drawResult() {
    game.draw.rect(0, H * 0.3, W, H * 0.3, C.ink, 0.8);
    txt(R.ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.36, 92, R.ok ? C.green : C.red);
    txt('SCORE ' + R.score, W / 2, H * 0.43, 60, C.white);
    txt('PERFECT ' + R.perfect + '   GOOD ' + R.good + '   MISS ' + R.miss, W / 2, H * 0.48, 34, C.white);
    txt('MAX COMBO ' + R.maxCombo, W / 2, H * 0.52, 34, C.white);
    if (R.score > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.565, 48, C.amber);
    else txt('BEST ' + Math.max(game.best, R.score), W / 2, H * 0.565, 40, C.amber);
    if (!R.ok) {
      var left = Math.max(1, Math.ceil((SONG_BEATS * SPB - R.songT) / (4 * SPB)));
      txt('あと' + left + '小節', W / 2, H * 0.6, 44, C.amber);
    }
  }

  function drawAttractHud() {
    var bob = Math.sin(game.time.elapsed * 2) * 8;
    game.draw.text(GAME_TITLE, W / 2 + 6, H * 0.075 + 6 + bob, { size: 108, color: C.dim, bold: true, align: 'center' });
    game.draw.text(GAME_TITLE, W / 2, H * 0.075 + bob, { size: 108, color: C.white, bold: true, align: 'center' });
    txt('BEST ' + game.best, W / 2, H * 0.115, 40, C.white);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 48, C.white);
    else txt('INSERT COIN', W / 2, H * 0.95, 40, C.gray);
  }

  // ── 入力 ──────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  // 2本の指がほぼ同時(0.15秒以内)に触れたら挟み。判定は2本目が触れた瞬間
  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING || !R) return;
    game.audio.tone(520, 0.03, { wave: 'square', volume: 0.05 });
    var now = game.time.elapsed, mate = null;
    for (var i = R.presses.length - 1; i >= 0; i--) {
      var q = R.presses[i];
      if (!q.done && q.id !== id && now - q.t <= PAIR_T) { mate = q; break; }
    }
    if (mate) {
      mate.done = true;
      var span = Math.abs(x - mate.x);
      var band = Math.abs(y - (TRAY_Y - 80)) < 440 && Math.abs(mate.y - (TRAY_Y - 80)) < 440;
      var res = (band && span >= SPAN_MIN && span <= SPAN_MAX) ? pinch(Math.min(x, mate.x), Math.max(x, mate.x)) : 'air';
      if (res === 'air') { R.clack = 0.22; R.clackX = (x + mate.x) / 2; game.audio.play('se_tap', 0.3); }
      return;
    }
    R.presses.push({ id: id, x: x, y: y, t: now, done: false });
    if (R.presses.length > 8) R.presses.shift();
  });

  game.onUpdate(function(dt) {
    if (!R) initGame();
    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepRun(dt);
      drawWorld([demo.l, demo.r]);
      game.draw.hand(demo.l[0], demo.l[1], { press: demo.press, scale: 14 });
      game.draw.hand(demo.r[0], demo.r[1], { press: demo.press, scale: 14 });
      drawAttractHud();
      return;
    }
    if (state === S.RESULT) {
      drawWorld([]);
      drawResult();
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
      return;
    }
    stepRun(dt);
    var ts = game.touches || [];
    var targets = [];
    for (var i = 0; i < ts.length && i < 2; i++) targets.push([ts[i].x, ts[i].y]);
    drawWorld(targets);
    drawHud();
    if (R.over) {
      drawResult();
      R.endWait -= dt;
      if (R.endWait <= 0) {
        state = S.RESULT;
        var stats = { score: R.score, perfect: R.perfect, good: R.good, miss: R.miss, maxCombo: R.maxCombo };
        if (R.ok) game.end.success(R.score, stats);
        else game.end.failure(stats);
      }
    }
  });

  game.onStart(function() {
    state = S.ATTRACT;
    initGame();
  });
})(game);
