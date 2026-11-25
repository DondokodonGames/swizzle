// I-DS-0021v2-udon-steam-pull-count.js
// 湯気の一引き — 一引きごとに同じ長さだけ伸びるうどん生地を、湯気の向こうの札の高さぴったりの回数で止める
// 操作: タップ1回で職人が生地を一引き(毎回同じ長さ)伸ばす。最初の二引きで一引きぶんの長さを見て、湯気に隠れた先が柱の札の高さまで何引きかを数える。手を止めると包丁の輪が満ちて湯気が晴れ、判定
// 終わり: 3玉を札ぴったりで止めればCLEAR。ずれが2回、または時間切れでGAME OVER
// @mechanic: count_exact
// @theme: udon_steam_pull_count
// 世界観: 手打ちうどん屋の厨房で、うどん職人が釜の湯気の立ちこめる中、吊るした生地を一引きずつ伸ばして柱に掛かった客の札の長さぴったりで止める
// 残るもの: 正誤(CLEAR/GAME OVER) + ぴったりで仕上げた玉の数・引いた回数
// スタイル: 90s BIG SPRITE
var STYLE = { bg: ['#e8d8b8', '#c8a878'], main: ['#2c3a6a', '#f4ecd8', '#a8382c'], accent: ['#f0c040', '#d84a3a'] };

(function (game) {
  var W = game.canvas.width, H = game.canvas.height;
  var TITLE = 'UDON PULL';
  var TIME_LIMIT = 22;
  var NEEDED = 3;
  var MISS_MAX = 2;
  var DX = W * 0.55, HY = H * 0.24;
  var POT_Y = H * 0.8;
  var PILLAR_X = W * 0.86;
  var STEAM_L = W * 0.4, STEAM_R = W * 0.71;
  var SETTLE = 1.0;
  var DOUGHS = [
    { u: 170, n: 4 }, { u: 130, n: 6 }, { u: 110, n: 7 }, { u: 150, n: 5 }, { u: 120, n: 6 },
  ];
  var C = {
    wall: STYLE.bg[0], wood: STYLE.bg[1], indigo: STYLE.main[0], cream: STYLE.main[1], brick: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], ink: '#2a1c14', steam: '#f2f4f2', dough: '#f6eed6', doughEdge: '#d8c8a0',
  };

  var CHEF_A = [
    '.....wwwwww.....',
    '....wwwwwwww....',
    '....rrrrrrrr....',
    '....ffffffff....',
    '...ffkffffkff...',
    '...ffffffffff...',
    '....ffmmmmff....',
    '.....ffffff.....',
    '...aaaaaaaaaa...',
    '..aaaaaaaaaaaa..',
    '..aawwwwwwwwaa..',
    '..aawwwwwwwwaa..',
    '..aawwwwwwwwaa..',
    '...awwwwwwwwa...',
    '....wwwwwwww....',
    '....pppppppp....',
    '....ppp..ppp....',
    '....ppp..ppp....',
    '...sss....sss...',
  ];
  var CHEF_B = [
    '.....wwwwww.....',
    '....wwwwwwww....',
    '....rrrrrrrr....',
    '....ffffffff....',
    '...ffkffffkff...',
    '...ffffffffff...',
    '....ffffffff....',
    '.....fmmmmf.....',
    '...aaaaaaaaaa...',
    '..aaaaaaaaaaaa..',
    '..aawwwwwwwwaa..',
    '..aawwwwwwwwaa..',
    '..aawwwwwwwwaa..',
    '...awwwwwwwwa...',
    '....wwwwwwww....',
    '....pppppppp....',
    '....ppp..ppp....',
    '...ppp....ppp...',
    '...sss....sss...',
  ];
  var CHEF_SAD = [
    '................',
    '.....wwwwww.....',
    '....wwwwwwww....',
    '....rrrrrrrr....',
    '....ffffffff....',
    '...fkkffffkkf...',
    '...ffffffffff...',
    '.....fmmmmf.....',
    '...aaaaaaaaaa...',
    '..aaaaaaaaaaaa..',
    '..aawwwwwwwwaa..',
    '..aawwwwwwwwaa..',
    '..aawwwwwwwwaa..',
    '...awwwwwwwwa...',
    '....wwwwwwww....',
    '....pppppppp....',
    '...ppp....ppp...',
    '..ppp......ppp..',
    '..sss......sss..',
  ];
  var CHEF_PAL = { w: C.cream, r: C.red, f: '#e8b890', k: C.ink, m: '#8a3020', a: C.indigo, p: '#3a3028', s: C.ink };
  var TAG = ['oooooo', 'oyyyyo', 'oykkyo', 'oyyyyo', 'oykkyo', 'oyyyyo', 'oooooo'];
  var BOWL = ['bbbbbbbbbb', '.bwwwwwwb.', '..bbbbbb..'];
  var KNIFE = ['hhhhhhhh..', 'hhhhhhhhhh', '......bbbb'];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var clock, dIx, wins, misses, totalPulls, score, perfectRun, cfg, pulls, shownLen, idle, phase, phT, steamA, lastDiff, jerk;
  var hitStop, badPending, ready, done, endT, won, resultT, endSent, newRec, finalScore, celebT, bowls;

  function say(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 5, { size: size, color: C.ink, bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }
  var BASE = 40;
  function oval(cx, cy, rx, ry, col, a) {
    for (var i = 0; i < 6; i++) {
      var yy = -ry + (2 * ry) * (i + 0.5) / 6;
      var w = rx * Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry)));
      game.draw.rect(cx - w, cy + yy - ry / 6, w * 2, (2 * ry) / 6 + 1, col, a);
    }
  }
  function tipAt(k) { return HY + BASE + k * cfg.u; }
  function tagY() { return tipAt(cfg.n); }
  function steamTop() { return tipAt(2.35); }

  function initGame() {
    clock = TIME_LIMIT; dIx = 0; wins = 0; misses = 0; totalPulls = 0; score = 0; perfectRun = 0; lastDiff = 0; jerk = 0;
    hitStop = 0; badPending = null; ready = 0.8; done = false; endT = 0; won = false;
    resultT = 0; endSent = false; newRec = false; finalScore = 0; celebT = 0; bowls = 0;
    setupDough(0);
  }
  function setupDough(i) {
    cfg = DOUGHS[Math.min(i, DOUGHS.length - 1)];
    pulls = 0; shownLen = BASE; idle = 0; phase = 'pull'; phT = 0; steamA = 1;
  }

  function pull(real) {
    if (phase !== 'pull') return false;
    pulls++; idle = 0; jerk = 0.16;
    if (real) totalPulls++;
    var notes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5'];
    game.audio.tone(notes[Math.min(8, pulls - 1)], 0.09, { wave: 'square', volume: 0.07, slide: 80 });
    game.audio.play('se_tap', real ? 0.25 : 0.12);
    var tipY = tipAt(pulls);
    if (tipY < steamTop()) game.fx.burst(DX, tipY, { color: C.cream, count: 6, speed: 140 });
    if (pulls >= 9) { phase = 'reveal'; phT = 0; game.audio.play('se_jump', 0.3); }
    return true;
  }

  function simulate(dt, real) {
    phT += dt;
    var target = BASE + pulls * cfg.u;
    shownLen += (target - shownLen) * Math.min(1, dt * 16);
    if (jerk > 0) jerk -= dt;
    if (phase === 'pull') {
      idle += dt;
      if (pulls > 0 && idle >= SETTLE) { phase = 'reveal'; phT = 0; game.audio.play('se_jump', real ? 0.35 : 0.18); }
      else if (pulls === 0 && idle > 3) { phase = 'reveal'; phT = 0; }
    } else if (phase === 'reveal') {
      steamA = Math.max(0, 1 - phT / 0.3);
      if (phT > 0.45) judge(real);
    } else if (phase === 'served') {
      if (phT > 0.6) nextDough(real);
    }
  }

  function judge(real) {
    lastDiff = cfg.n - pulls;
    var tipY = tipAt(pulls);
    if (pulls === cfg.n) {
      game.feedback.good(DX, tipY, { text: 'PERFECT', color: C.gold });
      game.audio.play('se_coin', 0.4);
      if (real) {
        wins++; perfectRun++; bowls++;
        score += 300 + perfectRun * 50 + Math.round(Math.max(0, 6 - phT) * 10);
        if (wins === 2) { game.fx.popup('NICE', W * 0.5, H * 0.16 + 60, { color: C.gold, size: 80 }); game.audio.play('se_milestone', 0.45); }
      }
      phase = 'served'; phT = 0;
    } else {
      hitStop = 0.5; badPending = { real: real, y: tipY };
      game.audio.tone('D3', 0.16, { wave: 'square', volume: 0.12 });
      game.fx.flash('#ffffff', 0.12);
      phase = 'failed';
    }
  }

  function resolveBad() {
    var b = badPending;
    badPending = null;
    game.feedback.bad(DX, b ? b.y : H * 0.5, { text: 'MISS' });
    if (b && b.real) { misses++; perfectRun = 0; }
    phase = 'served'; phT = 0.2;
  }

  function nextDough(real) {
    if (real) {
      dIx++;
      if (wins >= NEEDED) { finish(true); return; }
      if (misses >= MISS_MAX || dIx >= DOUGHS.length) { finish(false); return; }
    }
    setupDough(real ? dIx : 0);
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
    var stats = { bowls: wins, pulls: totalPulls, misses: misses };
    if (won) game.end.success(finalScore, stats);
    else game.end.failure(stats);
  }

  // ── ATTRACT ゴースト: 1玉目は札まで4引きでPERFECT、2玉目は1回多く引いてMISS ──
  var demo = { t: 0, gx: W * 0.6, gy: H * 0.9, press: 0, plan: 0, next: 0.6 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.plan = 0; demo.next = 0.7; }
    if (hitStop > 0) { hitStop -= dt; if (hitStop <= 0) resolveBad(); }
    else if (phase === 'served') {
      phT += dt;
      if (phT > 0.6 && demo.plan === 0) { demo.plan = 1; setupDough(1); demo.next = 0.5; }
    } else simulate(dt, false);
    var want = demo.plan === 0 ? cfg.n : cfg.n + 1;
    if (phase === 'pull' && pulls < want) {
      demo.next -= dt;
      if (demo.next <= 0) { demo.next = 0.34; demo.press = 0.14; pull(false); idle = 0; }
      else if (pulls > 0) idle = Math.min(idle, 0.2);
    }
    demo.press = Math.max(0, demo.press - dt);
    demo.gx += (W * 0.6 - demo.gx) * Math.min(1, dt * 4);
    demo.gy += (H * 0.9 - demo.gy) * Math.min(1, dt * 4);
  }

  // ── 描画 ─────────────────────────────────────────────────────
  function drawKitchen() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, '#f4e6c8'], [0.6, C.wall], [1, C.wood]]);
    for (var y = 240; y < H * 0.72; y += 60) game.draw.rect(0, y, W, 3, '#c8b088', 0.6);
    for (var x = 0; x < W; x += 90) game.draw.rect(x + ((Math.floor(x / 90) % 2) * 45), 240, 3, H * 0.48, '#c8b088', 0.35);
    // のれん
    for (var n = 0; n < 5; n++) {
      var sway = Math.sin(t * 1.4 + n) * 6;
      game.draw.rect(W * 0.38 + n * 66 + sway, 230, 60, 70, C.indigo);
      game.draw.rect(W * 0.38 + n * 66 + sway, 290, 60, 8, C.cream);
    }
    // 吊り棒
    game.draw.rect(W * 0.4, HY - 30, W * 0.3, 16, C.wood);
    // 床とカウンター
    game.draw.rect(0, H * 0.84, W, H * 0.16, '#8a6a48');
    game.draw.rect(0, H * 0.84, W, 10, '#b08a60');
    // 柱
    game.draw.rect(PILLAR_X - 30, 230, 60, H * 0.62, '#9a7448');
    game.draw.rect(PILLAR_X - 30, 230, 12, H * 0.62, '#b88e5a');
  }

  function drawTag(hit) {
    var ty = tagY();
    var t = game.time.elapsed;
    var blink = hit && Math.floor(t * 18) % 2 === 0;
    game.draw.line(PILLAR_X, ty - 70, PILLAR_X, ty - 40, C.ink, 3);
    game.draw.sprite(TAG, { o: blink ? '#ffffff' : '#7a5230', y: blink ? '#ffffff' : '#f2e2b8', k: C.ink }, PILLAR_X, ty, hit ? 16 : 13, { anchor: 'center' });
    for (var x = PILLAR_X - 60; x > DX + 40; x -= 40) game.draw.rect(x - 20, ty - 3, 22, 6, C.red, 0.85);
  }

  function drawDough(hit) {
    var len = shownLen;
    var tipY = HY + len;
    var thick = Math.max(16, 54 - len * 0.035);
    game.draw.line(DX, HY, DX, tipY, C.doughEdge, thick + 8);
    game.draw.line(DX, HY, DX, tipY, C.dough, thick);
    for (var k = 1; k < pulls; k++) {
      var yy = tipAt(k);
      if (yy < tipY - 10) game.draw.rect(DX - thick / 2, yy, thick, 3, C.doughEdge, 0.8);
    }
    var big = hit ? 1.6 : 1;
    game.draw.circle(DX, tipY, (thick / 2 + 6) * big, hit && Math.floor(game.time.elapsed * 18) % 2 === 0 ? '#ffffff' : C.doughEdge);
    game.draw.circle(DX, tipY, (thick / 2) * big, C.dough);
  }

  function drawSteam() {
    var t = game.time.elapsed;
    if (steamA <= 0) return;
    var top = steamTop();
    game.draw.rect(STEAM_L, top + 40, STEAM_R - STEAM_L, POT_Y - top - 40, C.steam, 0.94 * steamA);
    for (var i = 0; i < 9; i++) {
      var cx = STEAM_L + 20 + i * ((STEAM_R - STEAM_L - 40) / 8);
      var cy = top + 40 + Math.sin(t * 2 + i) * 14;
      game.draw.circle(cx, cy, 58 + (i % 3) * 10, C.steam, 0.94 * steamA);
    }
    for (var j = 0; j < 6; j++) {
      var ry = POT_Y - ((t * 120 + j * 110) % (POT_Y - top));
      game.draw.circle(STEAM_L - 10 + (j % 2) * (STEAM_R - STEAM_L + 20), ry, 40, C.steam, 0.7 * steamA);
    }
  }

  function drawPot() {
    var t = game.time.elapsed;
    oval(DX, POT_Y + 128, 250, 34, '#000000', 0.25);
    game.draw.rect(DX - 200, POT_Y, 400, 120, '#3a3a40');
    game.draw.rect(DX - 220, POT_Y - 12, 440, 26, '#5a5a62');
    game.draw.rect(DX - 180, POT_Y + 4, 360, 14, '#7ab0c8');
    for (var f = 0; f < 5; f++) game.draw.circle(DX - 140 + f * 70, POT_Y + 140 + Math.sin(t * 9 + f) * 6, 26, f % 2 ? C.gold : C.red, 0.85);
  }

  function drawChef(mood) {
    var t = game.time.elapsed;
    var spr = mood === 'sad' ? CHEF_SAD : (mood === 'win' || Math.floor(t * 2) % 2 === 0 ? CHEF_A : CHEF_B);
    var bob = mood === 'win' ? -Math.abs(Math.sin(t * 6)) * 30 : Math.sin(t * 2.5) * 4;
    var j = jerk > 0 ? -28 : 0;
    var cx = W * 0.2, cy = H * 0.5;
    oval(cx, cy + 212, 190, 30, '#000000', 0.25);
    game.draw.sprite(spr, CHEF_PAL, cx, cy + bob, 22, { anchor: 'center' });
    var shY = cy - 90 + bob;
    game.draw.line(cx + 120, shY, DX - 40, HY + 10 + j, C.indigo, 46);
    game.draw.line(cx + 120, shY, DX - 40, HY + 10 + j, '#e8b890', 26);
    game.draw.circle(DX - 30, HY + 6 + j, 34, '#e8b890');
    game.draw.circle(DX + 30, HY + 6 + j, 34, '#e8b890');
  }

  function drawSettle() {
    if (phase !== 'pull' || pulls === 0) return;
    var f = Math.min(1, idle / SETTLE);
    var kx = W * 0.86, ky = H * 0.88;
    game.draw.circle(kx, ky, 70, C.ink, 0.25);
    var n = 16;
    for (var i = 0; i < n * f; i++) {
      var a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      game.draw.circle(kx + Math.cos(a) * 62, ky + Math.sin(a) * 62, 10, C.gold);
    }
    game.draw.sprite(KNIFE, { h: '#c8ccd4', b: '#6a4a30' }, kx, ky, 9, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.85);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(BOWL, { b: i < wins ? C.red : '#5a4a3a', w: i < wins ? C.cream : '#4a3a2a' }, 90 + i * 110, 84, 9, { anchor: 'center' });
    for (var m = 0; m < MISS_MAX; m++) game.draw.circle(W - 90 - m * 70, 84, 24, m < MISS_MAX - misses ? C.gold : '#4a3a2a');
    say(wins + ' / ' + NEEDED, W * 0.5, 76, 60, C.cream);
    say('SCORE ' + score, W * 0.5, 138, 32, C.gold);
    var frac = Math.max(0, clock / TIME_LIMIT);
    game.draw.rect(70, 186, W - 140, 18, '#4a3a2a');
    game.draw.rect(70, 186, (W - 140) * frac, 18, frac < 0.25 ? C.red : C.gold);
  }

  function drawPullCount() {
    if (pulls <= 0) return;
    say(String(pulls), DX + 150, HY + 30, 90, C.indigo);
  }

  function drawScene(mood) {
    drawKitchen();
    var hit = phase === 'failed' && hitStop > 0;
    drawPot();
    drawDough(hit);
    drawSteam();
    drawTag(hit);
    drawChef(mood);
    drawPullCount();
    drawSettle();
  }

  // ── 入力 ─────────────────────────────────────────────────────
  game.onTap(function (x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { sendEnd(); state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (done || hitStop > 0 || ready > 0) { game.audio.tone('E3', 0.04, { wave: 'triangle', volume: 0.05 }); return; }
    if (!pull(true)) game.fx.burst(x, y, { color: C.cream, count: 3, speed: 80 });
  });

  // ── メインループ ───────────────────────────────────────────────
  game.onUpdate(function (dt) {
    if (state === S.ATTRACT) {
      if (clock === undefined) initGame();
      stepDemo(dt);
      drawScene('');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press > 0, scale: 15 });
      game.draw.rect(0, 0, W, H * 0.125, C.ink, 0.85);
      say(TITLE, W * 0.5, H * 0.05, 92, C.gold);
      say('HI-SCORE ' + (game.best || 0), W * 0.5, H * 0.1, 36, C.cream);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('► 100円 投入 ◄', W * 0.5, H * 0.965, 44, C.gold);
      else say('INSERT COIN', W * 0.5, H * 0.965, 40, C.cream);
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      if (resultT > 1.4) sendEnd();
      steamA = 0;
      drawScene(won ? 'win' : 'sad');
      game.draw.rect(90, H * 0.2, W - 180, 540, C.ink, 0.88);
      say(won ? 'CLEAR' : 'GAME OVER', W * 0.5, H * 0.25, 100, won ? C.gold : C.red);
      say(wins + ' / ' + NEEDED, W * 0.5, H * 0.32, 68, C.cream);
      say('SCORE ' + finalScore, W * 0.5, H * 0.38, 48, C.cream);
      say('BEST ' + Math.max(game.best || 0, won ? finalScore : 0), W * 0.5, H * 0.425, 38, C.gold);
      if (newRec) { if (Math.floor(resultT * 4) % 2 === 0) say('NEW RECORD', W * 0.5, H * 0.47, 56, C.gold); }
      else if (!won && lastDiff > 0) say('あと' + lastDiff + '回!', W * 0.5, H * 0.47, 52, C.red);
      else if (!won) say('あと' + Math.max(1, NEEDED - wins) + '玉!', W * 0.5, H * 0.47, 52, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) say('TAP TO CONTINUE', W * 0.5, H * 0.955, 40, C.cream);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endT -= dt; celebT += dt;
      if (won && celebT > 0.2) {
        celebT = 0;
        game.fx.burst(game.random(160, W - 160), game.random(H * 0.22, H * 0.6), { color: Math.random() < 0.5 ? C.gold : C.cream, count: 14, speed: 420 });
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
      if (phase === 'pull') clock -= dt;
      if (clock <= 0 && !done) {
        clock = 0;
        game.fx.popup('TIME UP', W * 0.5, H * 0.45, { color: C.red, size: 90 });
        finish(false);
      }
    }

    drawScene(done ? (won ? 'win' : 'sad') : '');
    drawHud();
    if (ready > 0) {
      say(ready > 0.35 ? 'READY?' : 'GO!', W * 0.5, H * 0.42, 100, C.red);
      game.draw.hand(W * 0.6, H * 0.9, { press: ready < 0.4, scale: 14 });
    }
  });

  game.onStart(function () {
    game.audio.melody([
      ['A4', 0.5], ['C5', 0.5], ['D5', 1], ['E5', 0.5], ['D5', 0.5], ['C5', 1],
      ['A4', 0.5], ['G4', 0.5], ['A4', 1], ['C5', 0.5], ['A4', 0.5], ['G4', 1],
    ], { tempo: 112, wave: 'square', volume: 0.045, loop: true, bass: [['A2', 2], ['D3', 2], ['E2', 2], ['A2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
