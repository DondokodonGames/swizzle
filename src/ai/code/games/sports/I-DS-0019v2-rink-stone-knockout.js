// I-DS-0019v2-rink-stone-knockout.js
// リンク・ノックアウト — 手前ではじいた黄色い石をぶつけ、ハウスの赤い邪魔石を押し出して自分の石を輪の中に残す
// 操作: 下のゾーンを上向きに指ではじくと、はじいた向きと速さで黄色い石が滑り出す(はじく途中は矢印が伸びる)。赤い石に当たるとはじき合う。弱すぎてホグラインに届かない石は取り除かれる
// 終わり: 赤い石を全部ハウスの外へ出し、黄色い石を1つ以上ハウスに残すとその回は勝ち。3回勝てばCLEAR。持ち石を使い切って残せない回が2回でGAME OVER(時間切れも)
// @mechanic: push_out
// @theme: winter_rink_curling_class
// 世界観: 冬の屋外リンクのカーリング教室で、生徒が黄色い石を滑らせてハウスに陣取る赤い邪魔石をはじき出し、自分の石だけを輪の中に残していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 勝った回数・はじき出した赤い石の数・余らせた持ち石
// スタイル: 90s HANDHELD COLOR
var STYLE = { bg: ['#d8e4e6', '#b4c6cc'], main: ['#6f8fa8', '#b46a60', '#2e3a44'], accent: ['#e0b850', '#f4f0e0'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'KNOCK OUT';
  var TIME_LIMIT = 24;
  var NEEDED = 3;
  var MISS_MAX = 2;
  var HCX = W * 0.5, HCY = H * 0.34;
  var R_OUT = 250, R_MID = 168, R_IN = 86;
  var SR = 42;
  var LANE_L = W * 0.12, LANE_R = W * 0.88, BACK_Y = 250, HOG_Y = H * 0.58;
  var HACK_X = W * 0.5, HACK_Y = H * 0.8;
  var FRICTION = 520;
  var ENDS = [
    { reds: [[0, 0]], shots: 2 },
    { reds: [[-90, -60], [100, 40]], shots: 3 },
    { reds: [[0, 150], [-120, -40], [110, -90]], shots: 3 },
    { reds: [[-70, 10], [70, 10], [0, -150]], shots: 3 },
  ];
  var C = {
    ice: STYLE.bg[0], iceShade: STYLE.bg[1], blue: STYLE.main[0], red: STYLE.main[1], ink: STYLE.main[2],
    yel: STYLE.accent[0], white: STYLE.accent[1], yelRim: '#8a7238', redStone: '#a84a40', redRim: '#5a2622',
    board: '#4a5a68',
  };

  var STU_A = [
    '....hhhh....',
    '...hhhhhh...',
    '...ffffff...',
    '...fkffkf...',
    '...ffffff...',
    '....ffff....',
    '..jjjjjjjj..',
    '.jjjjjjjjjj.',
    '.ff.jjjj.ff.',
    '....jjjj....',
    '...pp..pp...',
    '...pp..pp...',
    '..ss....ss..',
  ];
  var STU_B = [
    '....hhhh....',
    '...hhhhhh...',
    '...ffffff...',
    '...fkffkf...',
    '...ffffff...',
    '....ffff....',
    '..jjjjjjjj..',
    '.jjjjjjjjjj.',
    'ff..jjjj..ff',
    '....jjjj....',
    '...pp..pp...',
    '..pp....pp..',
    '..ss....ss..',
  ];
  var STU_WIN = [
    'ff..hhhh..ff',
    '.f.hhhhhh.f.',
    '.j.ffffff.j.',
    '.j.fkffkf.j.',
    '.j.ffmmff.j.',
    '..jjffffjj..',
    '...jjjjjj...',
    '...jjjjjj...',
    '....jjjj....',
    '....jjjj....',
    '...pp..pp...',
    '..pp....pp..',
    '..ss....ss..',
  ];
  var STU_SAD = [
    '............',
    '....hhhh....',
    '...hhhhhh...',
    '...ffffff...',
    '...kkffkk...',
    '....ffff....',
    '..jjjjjjjj..',
    '.jjjjjjjjjj.',
    '.ff.jjjj.ff.',
    '....jjjj....',
    '...pppppp...',
    '..pp....pp..',
    '.ss......ss.',
  ];
  var STU_PAL = { h: C.red, f: '#e8c8a8', k: C.ink, m: C.red, j: C.blue, p: C.ink, s: '#1e262e' };
  var HANDLE = ['.hhhh.', 'hhhhhh', 'h....h'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, endIx, endsWon, misses, score, knocked, savedShots, stones, shooter, shotsLeft, phase, phT, idle;
  var drag, inAtShot, hitStop, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, celebT, clackCd;

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 3, y + 4, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
  function inHouse(s) { return !s.out && dist(s.x, s.y, HCX, HCY) < R_OUT + SR * 0.5; }
  function makeStone(team, x, y) { return { team: team, x: x, y: y, vx: 0, vy: 0, out: false, fade: 0, flash: 0 }; }

  function initGame() {
    clock = TIME_LIMIT; endIx = 0; endsWon = 0; misses = 0; score = 0; knocked = 0; savedShots = 0;
    drag = null; inAtShot = []; hitStop = 0; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; celebT = 0; clackCd = 0;
    setupEnd(0);
  }

  function setupEnd(i) {
    var cfg = ENDS[Math.min(i, ENDS.length - 1)];
    stones = [];
    for (var r = 0; r < cfg.reds.length; r++) stones.push(makeStone('r', HCX + cfg.reds[r][0], HCY + cfg.reds[r][1]));
    shotsLeft = cfg.shots;
    spawnShooter();
  }

  function spawnShooter() {
    shooter = makeStone('y', HACK_X, HACK_Y);
    stones.push(shooter);
    phase = 'aim'; phT = 0; idle = 0; drag = null;
  }

  function flick(vx, vy, real) {
    if (phase !== 'aim') return false;
    var sp = Math.hypot(vx, vy);
    if (sp < 260 || vy > -150) {
      game.audio.play('se_tap', 0.3);
      game.fx.burst(shooter.x, shooter.y + SR, { color: C.white, count: 5, speed: 120 });
      shooter.flash = 0.15;
      return false;
    }
    if (sp > 2100) { vx *= 2100 / sp; vy *= 2100 / sp; }
    shooter.vx = vx; shooter.vy = vy;
    shotsLeft--;
    phase = 'slide'; phT = 0;
    inAtShot = [];
    for (var i = 0; i < stones.length; i++) if (stones[i].team === 'r' && inHouse(stones[i])) inAtShot.push(stones[i]);
    game.audio.play('se_jump', real ? 0.4 : 0.2);
    return true;
  }

  function physics(dt, real) {
    var steps = 3, h = dt / steps;
    for (var s = 0; s < steps; s++) {
      for (var i = 0; i < stones.length; i++) {
        var a = stones[i];
        if (a.out) continue;
        var sp = Math.hypot(a.vx, a.vy);
        if (sp > 0) {
          var ns = Math.max(0, sp - FRICTION * h);
          a.vx *= ns / sp; a.vy *= ns / sp;
          a.x += a.vx * h; a.y += a.vy * h;
        }
        if (a.x < LANE_L + SR * 0.6 || a.x > LANE_R - SR * 0.6 || a.y < BACK_Y - SR) {
          a.out = true; a.fade = 0.5;
          if (a.team === 'r') game.audio.play('se_break', real ? 0.3 : 0.15);
        }
      }
      for (var p = 0; p < stones.length; p++) {
        for (var q = p + 1; q < stones.length; q++) {
          var A = stones[p], B = stones[q];
          if (A.out || B.out) continue;
          var dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
          if (d > 0 && d < SR * 2) {
            var nx = dx / d, ny = dy / d, ov = SR * 2 - d;
            A.x -= nx * ov / 2; A.y -= ny * ov / 2; B.x += nx * ov / 2; B.y += ny * ov / 2;
            var rel = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
            if (rel > 0) {
              var j = rel * 0.95;
              A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny;
              if (clackCd <= 0) {
                clackCd = 0.08;
                game.audio.tone(rel > 700 ? 'C4' : 'G4', 0.06, { wave: 'square', volume: real ? 0.12 : 0.06 });
                game.fx.burst(A.x + nx * SR, A.y + ny * SR, { color: C.white, count: 8, speed: 260 });
              }
            }
          }
        }
      }
    }
    if (clackCd > 0) clackCd -= dt;
    for (var f = 0; f < stones.length; f++) {
      if (stones[f].fade > 0) stones[f].fade -= dt;
      if (stones[f].flash > 0) stones[f].flash -= dt;
    }
  }

  function allStopped() {
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      if (!s.out && Math.hypot(s.vx, s.vy) > 6) return false;
      if (s.out && s.fade > 0) return false;
    }
    return true;
  }

  function evaluate(real) {
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i];
      if (!s.out && s.team === 'y' && s.y > HOG_Y) { s.out = true; s.fade = 0.5; game.fx.burst(s.x, s.y, { color: C.iceShade, count: 6, speed: 140 }); }
    }
    var gone = 0;
    for (var k = 0; k < inAtShot.length; k++) {
      if (!inHouse(inAtShot[k])) {
        gone++;
        var px = Math.max(LANE_L + 60, Math.min(LANE_R - 60, inAtShot[k].x));
        game.fx.popup('+150', px, Math.max(BACK_Y + 60, Math.min(H * 0.55, inAtShot[k].y)), { color: C.red, size: 54 });
      }
    }
    if (gone > 0) {
      game.audio.play('se_coin', 0.4);
      if (real) { knocked += gone; score += gone * 150; }
      if (gone >= 2) { game.fx.popup('x2', HCX, HCY - R_OUT - 50, { color: C.yel, size: 90 }); game.audio.play('se_milestone', 0.4); if (real) score += 200; }
    }
    var redsIn = 0, yelIn = 0;
    for (var m = 0; m < stones.length; m++) {
      if (!inHouse(stones[m])) continue;
      if (stones[m].team === 'r') redsIn++; else yelIn++;
    }
    if (redsIn === 0 && yelIn > 0) { endClear(real); return; }
    if (shotsLeft > 0) { phase = 'next'; phT = 0; return; }
    endFail(real);
  }

  function endClear(real) {
    game.feedback.good(HCX, HCY, { text: 'NICE', color: C.yel });
    for (var i = 0; i < stones.length; i++) if (stones[i].team === 'y' && inHouse(stones[i])) stones[i].flash = 0.6;
    if (real) {
      endsWon++;
      score += 300 + shotsLeft * 100;
      savedShots += shotsLeft;
      if (endsWon === 2) { game.fx.popup('NICE', W * 0.5, H * 0.16 + 60, { color: C.yel, size: 80 }); game.audio.play('se_milestone', 0.45); }
      if (endsWon >= NEEDED) { finish(true); return; }
    }
    phase = 'between'; phT = 0;
  }

  function endFail(real) {
    hitStop = 0.45; badPending = { real: real };
    for (var i = 0; i < stones.length; i++) if (stones[i].team === 'r' && inHouse(stones[i])) stones[i].flash = 0.5;
    game.audio.tone('D3', 0.16, { wave: 'square', volume: 0.12 });
    game.fx.flash('#ffffff', 0.12);
    phase = 'failed';
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    game.feedback.bad(HCX, HCY, { text: 'MISS' });
    if (b && b.real) {
      misses++;
      if (misses >= MISS_MAX) { finish(false); return; }
    }
    phase = 'between'; phT = 0;
  }

  function nextEnd(real) {
    if (real) {
      endIx++;
      if (endIx >= ENDS.length) { finish(endsWon >= NEEDED); return; }
    }
    setupEnd(endIx);
  }

  function simulate(dt, real) {
    phT += dt;
    if (phase === 'aim') {
      idle += dt;
      if (idle > 3.5) flick(0, -640, real);
    } else if (phase === 'slide') {
      physics(dt, real);
      if (phT > 0.3 && allStopped()) { phase = 'settle'; phT = 0; }
    } else if (phase === 'settle') {
      if (phT > 0.3) evaluate(real);
    } else if (phase === 'next') {
      if (phT > 0.35) spawnShooter();
    } else if (phase === 'between') {
      physics(dt, real);
      if (phT > 0.9) nextEnd(real);
    }
  }

  function finish(ok) {
    if (done) return;
    done = true; won = ok; endT = ok ? 1.4 : 1.1; celebT = 0;
    finalScore = score + (ok ? Math.round(Math.max(0, clock) * 15) : 0);
    newRec = ok && finalScore > (game.best || 0);
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
  }

  function sendEnd() {
    if (endSent) return;
    endSent = true;
    var stats = { ends: endsWon, knocked: knocked, savedStones: savedShots, misses: misses };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 下から上へ素早くはじき、真ん中の赤い石を弾き出す ──
  var demo = { t: 0, gx: HACK_X, gy: H * 0.9, press: false, shot: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.2;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.shot = 0; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else if (phase !== 'between' || phT < 0.85) simulate(dt, false);
    else physics(dt, false);
    if (demo.shot === 0 && phase === 'aim') {
      if (cyc < 0.8) { demo.gx = HACK_X; demo.gy = H * 0.9; demo.press = false; }
      else if (cyc < 1.0) { demo.press = true; demo.gy = H * 0.9 - (cyc - 0.8) / 0.2 * 150; }
      else { demo.press = false; demo.shot = 1; flick(game.random(-25, 25), -1480, false); }
    } else {
      demo.press = false;
      demo.gx += (W * 0.72 - demo.gx) * Math.min(1, dt * 2);
      demo.gy += (H * 0.88 - demo.gy) * Math.min(1, dt * 2);
    }
  }

  // ── 描画 ─────────────────────────────────────────────────────
  function drawSheet() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#a8bcc4'], [0.12, C.ice], [0.8, C.ice], [1, C.iceShade]]);
    game.draw.rect(0, 0, LANE_L, H, '#8ea2ac');
    game.draw.rect(LANE_R, 0, W - LANE_R, H, '#8ea2ac');
    game.draw.rect(LANE_L - 14, 0, 14, H, C.board);
    game.draw.rect(LANE_R, 0, 14, H, C.board);
    for (var i = 0; i < 18; i++) {
      var px = LANE_L + 30 + ((i * 173) % (LANE_R - LANE_L - 60)), py = 300 + ((i * 331) % Math.floor(H * 0.6));
      game.draw.rect(px, py, 10, 6, C.white, 0.6);
    }
    game.draw.circle(HCX, HCY, R_OUT, C.blue);
    game.draw.circle(HCX, HCY, R_MID, C.white);
    game.draw.circle(HCX, HCY, R_IN, C.red);
    game.draw.circle(HCX, HCY, 30, C.white);
    game.draw.rect(LANE_L, HCY - 3, LANE_R - LANE_L, 6, C.ink, 0.35);
    game.draw.rect(HCX - 3, BACK_Y, 6, H * 0.84 - BACK_Y, C.ink, 0.2);
    for (var b = LANE_L; b < LANE_R; b += 60) game.draw.rect(b, BACK_Y - 6, 36, 10, C.red, 0.7);
    game.draw.rect(LANE_L, HOG_Y - 7, LANE_R - LANE_L, 14, C.blue, 0.85);
    game.draw.rect(HACK_X - 70, HACK_Y + 70, 140, 26, C.ink, 0.6);
    // 吹き込む雪(周囲の動き)
    for (var s = 0; s < 14; s++) {
      var sx = (s * 97 + t * 40) % W, sy = (s * 233 + t * 70) % H;
      game.draw.rect(sx, sy, 8, 8, C.white, 0.7);
    }
  }

  function drawStone(s) {
    if (s.out && s.fade <= 0) return;
    var a = s.out ? Math.max(0, s.fade / 0.5) : 1;
    var hit = s.flash > 0 && Math.floor(game.time.elapsed * 18) % 2 === 0;
    var big = (hitStop > 0 && s.flash > 0) ? 1.3 : 1;
    var r = SR * big;
    game.draw.circle(s.x + 6, s.y + 10, r, C.ink, 0.25 * a);
    game.draw.circle(s.x, s.y, r, hit ? '#ffffff' : (s.team === 'y' ? C.yelRim : C.redRim), a);
    game.draw.circle(s.x, s.y, r * 0.8, hit ? '#ffffff' : (s.team === 'y' ? C.yel : C.redStone), a);
    game.draw.sprite(HANDLE, { h: s.team === 'y' ? C.yelRim : C.redRim }, s.x, s.y - 4, 8 * big, { anchor: 'center', alpha: a });
    if (s.team === 'r' && !s.out) {
      for (var k = 0; k < 6; k++) {
        var ang = k * Math.PI / 3 + game.time.elapsed * 0.5;
        game.draw.rect(s.x + Math.cos(ang) * r - 4, s.y + Math.sin(ang) * r - 4, 8, 8, C.redRim, a);
      }
    }
  }

  function drawAim() {
    if (!drag || phase !== 'aim') return;
    var v = flickVelocity(drag, game.time.elapsed, drag.lx, drag.ly);
    var sp = Math.hypot(v.x, v.y);
    if (sp < 60) return;
    var len = Math.min(420, sp * 0.22);
    var ex = shooter.x + (v.x / sp) * len, ey = shooter.y + (v.y / sp) * len;
    game.draw.line(shooter.x, shooter.y, ex, ey, C.yel, 10);
    game.draw.circle(ex, ey, 16, C.yel);
  }

  function drawStudent(mood) {
    var t = game.time.elapsed;
    var spr = mood === 'win' ? STU_WIN : mood === 'sad' ? STU_SAD : (Math.floor(t * 2) % 2 === 0 ? STU_A : STU_B);
    var bob = mood === 'win' ? -Math.abs(Math.sin(t * 7)) * 50 : Math.sin(t * 3) * 3;
    game.draw.circle(W * 0.22, H * 0.92, 70, C.ink, 0.2);
    game.draw.sprite(spr, STU_PAL, W * 0.22, H * 0.86 + bob, 12, { anchor: 'center' });
    game.draw.line(W * 0.3, H * 0.8 + bob, W * 0.36, H * 0.93, '#6a4a30', 8);
    game.draw.rect(W * 0.34, H * 0.925, 70, 18, C.red);
  }

  function drawShots() {
    for (var i = 0; i < shotsLeft; i++) {
      var x = W * 0.66 + i * 70, y = H * 0.93;
      game.draw.circle(x, y, 26, C.yelRim);
      game.draw.circle(x, y, 20, C.yel);
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.88);
    for (var i = 0; i < NEEDED; i++) {
      game.draw.circle(90 + i * 84, 84, 30, i < endsWon ? C.yel : '#55606a');
      game.draw.circle(90 + i * 84, 84, 18, i < endsWon ? C.white : '#3e4852');
    }
    for (var m = 0; m < MISS_MAX; m++) {
      game.draw.circle(W - 90 - m * 76, 84, 28, m < MISS_MAX - misses ? C.red : '#3e4852');
    }
    say(endsWon + ' / ' + NEEDED, W * 0.5, 74, 60, C.white);
    say('SCORE ' + score, W * 0.5, 136, 32, C.yel);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(70, 184, W - 140, 18, '#3e4852');
    game.draw.rect(70, 184, (W - 140) * frac, 18, frac < 0.25 ? C.red : C.blue);
  }

  function scanlines() {
    for (var y = 0; y < H; y += 8) game.draw.rect(0, y, W, 2, '#000000', 0.06);
  }

  // 直近0.1秒の指の速さ(はじき)
  function flickVelocity(d, now, x, y) {
    var ref = d.samples[0];
    for (var i = d.samples.length - 1; i >= 0; i--) { if (now - d.samples[i].t >= 0.1) { ref = d.samples[i]; break; } }
    var span = Math.max(0.05, now - ref.t);
    return { x: (x - ref.x) / span, y: (y - ref.y) / span };
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onPress(function (x, y) {
    if (state !== S.PLAYING || done || ready > 0 || hitStop > 0) return;
    if (phase === 'aim' && y > H * 0.6) {
      var now = game.time.elapsed;
      drag = { samples: [{ x: x, y: y, t: now }], lx: x, ly: y };
      game.audio.play('se_tap', 0.2);
    } else {
      game.audio.tone('A3', 0.04, { wave: 'triangle', volume: 0.05 });
    }
  });
  game.onMove(function (x, y) {
    if (!drag) return;
    drag.samples.push({ x: x, y: y, t: game.time.elapsed });
    if (drag.samples.length > 12) drag.samples.shift();
    drag.lx = x; drag.ly = y;
    if (drag.samples.length % 4 === 0) game.audio.tone('E5', 0.02, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function (x, y) {
    if (!drag) return;
    var v = flickVelocity(drag, game.time.elapsed, x, y);
    drag = null;
    if (state !== S.PLAYING || phase !== 'aim') return;
    if (flick(v.x * 0.5, v.y * 0.5, true)) game.fx.burst(shooter.x, shooter.y + SR, { color: C.white, count: 10, speed: 220 });
  });
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'aim') game.fx.burst(x, y, { color: C.white, count: 3, speed: 90 });
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawSheet();
      for (var i = 0; i < stones.length; i++) drawStone(stones[i]);
      drawStudent(phase === 'between' ? 'win' : '');
      drawShots();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.ink, 0.88);
      say(TITLE, W * 0.5, H * 0.05, 92, C.yel);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.965, 44, C.red);
      else say('TAP TO START', W * 0.5, H * 0.965, 40, C.ink);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      drawSheet();
      for (var r = 0; r < stones.length; r++) drawStone(stones[r]);
      drawStudent(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 540, C.ink, 0.9);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.yel : C.red);
      say(endsWon + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.white);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.white);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.yel);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.yel); }
      else if (!won) say('あと' + Math.max(1, NEEDED - endsWon) + '回!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.955, 40, C.ink);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      physics(dt, false);
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.2, H * 0.55), { color: Math.random() < 0.5 ? C.yel : C.white, count: 14, speed: 420 });
      }
      if (endT <= 0) { state = S.RESULT; resultT = 0; }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) resolveBad();
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.35);
    } else {
      simulate(dt, true);
      if (phase === 'aim' || phase === 'slide') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }

    drawSheet();
    for (var k = 0; k < stones.length; k++) drawStone(stones[k]);
    if (phase === 'aim' && idle > 2.5 && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.circle(shooter.x, shooter.y, SR + 14, C.red, 0.5);
    drawAim();
    drawStudent(done ? (won ? 'win' : 'sad') : '');
    drawShots();
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.5, 100, C.red);
      game.draw.hand(HACK_X, H * 0.9 - (0.8 - ready) * 150, { press: true, scale: 14 });
    }
    scanlines();
  });

  game.onStart(function () {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 1], ['C5', 0.5], ['B4', 0.5], ['A4', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5], ['E4', 1], ['D4', 1],
    ], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true, bass: [['G2', 2], ['C3', 2], ['E2', 2], ['D2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
