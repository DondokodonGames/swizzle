// J-Switch-0013-castle-lawn-detector.js
// 城跡の芝生さがし — 指についてくる探知機の輪を芝の上で滑らせ、澄んだ金色の音が強まる場所で輪を止めて古い品を掘り出す。濁った赤い音は錆びた空き缶
// 操作: 指を置いたまま動かすと探知機の輪が少し遅れてついてくる。音と輪が強まる場所で輪を止めると自動で掘る(社内メモ。画面には出さない)
// 終わり: 古い品を5つ掘り出せばCLEAR。時間切れでGAME OVER(空き缶を掘ると時間が減る)
// @mechanic: drag_follow
// @theme: castle_lawn_relic_search
// 世界観: 霧の朝の古い城跡、刈りそろえた中庭の芝生の下に眠る昔の古銭や飾りボタンを、見習いの学芸員が探知機の輪を滑らせて聞き分け、開館の鐘までに錆びた空き缶を避けて5つ掘り当てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 掘り当てた品の数・空き缶を掘った回数・芯で当てた(PERFECT)数
// スタイル: 90s PRE-RENDER

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s PRE-RENDER: 暗めで金属質、1枚絵の背景、粒状ノイズとビネット
  var STYLE = { bg: ['#1c2630', '#3a4a4a', '#5a6a5a'], main: ['#3f6a3a', '#2c4a2a', '#6a8a5a'], accent: ['#ffd76a', '#e0503a'] };
  var C = {
    fog1: STYLE.bg[0], fog2: STYLE.bg[1], fog3: STYLE.bg[2], grass: STYLE.main[0], grassD: STYLE.main[1], grassL: STYLE.main[2],
    stone: '#6a6a72', stoneD: '#44444c', gold: STYLE.accent[0], bad: STYLE.accent[1], metal: '#b8c0c8', metalD: '#6a7480',
    dirt: '#5a3e2a', ink: '#0c1014', white: '#f4f4ec', good: '#8ae07a', coat: '#3a5a8a'
  };

  var GAME_TITLE = 'RELIC LAWN';
  var TIME_LIMIT = 22;
  var NEEDED = 5;
  var JUNK = 3;
  var TOP = H * 0.2, BOT = H * 0.72, LEFT = 90, RIGHT = W - 90;
  var LOCK_R = 60, LOCK_T = 0.5, JUNK_COST = 2.5;
  var FOLLOW = 9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var COIN = ['.gggg.', 'gGggGg', 'ggGGgg', 'ggGGgg', 'gGggGg', '.gggg.'];
  var CREST = ['g.gg.g', 'gggggg', 'gGggGg', '.gGGg.', '..gg..'];
  var CAN = ['.rrrr.', 'rkrrkr', 'rrrrrr', 'rkrrrr', 'rrrrkr', '.rrrr.'];
  var MOUND = ['..dddd..', '.dddddd.', 'dddddddd'];
  var CURATOR = ['..hhh...', '.hssh...', '.hssh...', '..cc..mm', '.cccccm.', 'cccccc..', '.cccc...', '.p..p...', '.p..p...'];
  var TOWER = ['..ww.ww..', '..wwwww..', '..wwwww..', '..wwkww..', '..wwwww..', '.wwwwwww.', '.wwwkwww.', 'wwwwwwwww'];

  var mode, readyT, timeLeft, coil, target, finding, found, junkDug, perfects, lockT, lockOn, beepT, stopT, outroT, win, digAnim, halfShown, pressing;

  function initGame() {
    mode = 'ready'; readyT = 0.8; timeLeft = TIME_LIMIT; found = 0; junkDug = 0; perfects = 0;
    coil = { x: W / 2, y: H * 0.6, vx: 0, vy: 0 }; target = { x: W / 2, y: H * 0.6 };
    finding = []; lockT = 0; lockOn = null; beepT = 0; stopT = 0; outroT = 0; win = false; digAnim = []; halfShown = false; pressing = false;
    var total = NEEDED + JUNK, guard = 0;
    while (finding.length < total && guard++ < 500) {
      var nx = game.random(LEFT + 60, RIGHT - 60), ny = game.random(TOP + 70, BOT - 60);
      var ok = Math.hypot(nx - W / 2, ny - H * 0.6) > 170;
      for (var i = 0; i < finding.length; i++) if (Math.hypot(finding[i].x - nx, finding[i].y - ny) < 190) ok = false;
      if (ok) finding.push({ x: nx, y: ny, junk: finding.length >= NEEDED, crest: finding.length === 4, dug: false });
    }
  }

  function range() { return Math.max(190, 290 - found * 22); }

  // いちばん近い未発掘の埋没物
  function nearest() {
    var best = null, bd = 1e9;
    for (var i = 0; i < finding.length; i++) {
      var f = finding[i];
      if (f.dug) continue;
      var d = Math.hypot(f.x - coil.x, f.y - coil.y);
      if (d < bd) { bd = d; best = f; }
    }
    return best ? { f: best, d: bd } : null;
  }

  function sweep(dt, isDemo) {
    var px = coil.x, py = coil.y;
    if (pressing) {
      coil.x += (target.x - coil.x) * Math.min(1, dt * FOLLOW);
      coil.y += (target.y - coil.y) * Math.min(1, dt * FOLLOW);
    }
    coil.x = Math.max(LEFT, Math.min(RIGHT, coil.x));
    coil.y = Math.max(TOP, Math.min(BOT, coil.y));
    var speed = Math.hypot(coil.x - px, coil.y - py) / Math.max(dt, 0.001);
    for (var a = digAnim.length - 1; a >= 0; a--) { digAnim[a].t += dt; if (digAnim[a].t > 1.2) digAnim.splice(a, 1); }
    var n = nearest();
    lockOn = null;
    if (!n) return;
    var s = Math.max(0, 1 - n.d / range());
    if (s > 0) {
      beepT -= dt;
      if (beepT <= 0) {
        beepT = 0.55 - 0.45 * s;
        if (!isDemo) {
          if (n.f.junk) game.audio.tone(110 + s * 60, 0.07, { wave: 'sawtooth', volume: 0.03 + s * 0.03 });
          else game.audio.tone(600 + s * 700, 0.06, { wave: 'sine', volume: 0.03 + s * 0.04 });
        }
      }
    }
    if (pressing && n.d < LOCK_R && speed < 260) {
      lockOn = n.f;
      lockT += dt * (n.f.crest ? 0.65 : 1);
      if (lockT >= LOCK_T) dig(n.f, n.d, isDemo);
    } else {
      lockT = Math.max(0, lockT - dt * 2);
    }
  }

  function dig(f, d, isDemo) {
    f.dug = true; lockT = 0;
    digAnim.push({ x: f.x, y: f.y, junk: f.junk, crest: f.crest, t: 0 });
    if (f.junk) {
      junkDug++;
      if (isDemo) return;
      timeLeft = Math.max(0.1, timeLeft - JUNK_COST);
      game.feedback.bad(f.x, f.y - 90, { text: 'MISS', color: C.bad });
      mode = 'hit'; stopT = 0.4;
      return;
    }
    found++;
    var sweet = d < 28;
    if (sweet) perfects++;
    if (isDemo) return;
    game.audio.play('se_coin', 0.5);
    game.feedback.good(f.x, f.y - 90, { text: sweet ? 'PERFECT' : (f.crest ? 'NICE' : 'GOOD'), color: f.crest ? C.gold : C.good, count: f.crest ? 18 : 10 });
    if (!halfShown && found === 3) {
      halfShown = true; game.audio.play('se_milestone', 0.5);
      game.fx.popup(found + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.gold, size: 72 });
    }
    if (found >= NEEDED) finish(true);
  }

  function finish(ok) {
    win = ok; mode = 'stop'; stopT = 0.55; pressing = false;
    game.audio.stopBgm();
    if (ok) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); }
    else game.audio.play('se_failure', 0.6);
  }

  // ── 入力 ─────────────────────────────────────────────────────────
  function aim(x, y) { target.x = x; target.y = y - 150; }
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || mode !== 'play') return;
    pressing = true; aim(x, y);
    game.audio.play('se_tap', 0.2);
    game.fx.burst(x, y - 150, { color: C.metal, count: 4, speed: 80 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || mode !== 'play') return;
    if (!pressing) { pressing = true; game.audio.play('se_tap', 0.15); }
    aim(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    pressing = false;
    if (lockT > 0) game.audio.tone('C4', 0.05, { wave: 'triangle', volume: 0.03 });
  });

  // ── ATTRACT デモ(ジグザグに探って品の上で止まる。3回目は空き缶を掘る) ──────
  var demo = { t: 0, gx: W / 2, gy: H * 0.75, n: 0, goal: null, zig: 0 };
  function pickDemoGoal() {
    var wantJunk = demo.n % 3 === 2, best = null, bd = 1e9;
    for (var i = 0; i < finding.length; i++) {
      var f = finding[i];
      if (f.dug || f.junk !== wantJunk) continue;
      var d = Math.hypot(f.x - coil.x, f.y - coil.y);
      if (d < bd) { bd = d; best = f; }
    }
    demo.goal = best; demo.zig = 0;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 8;
    if (cyc < dt || demo.t <= dt) { initGame(); mode = 'play'; demo.n = 0; pickDemoGoal(); }
    if (!demo.goal || demo.goal.dug) { demo.n++; pickDemoGoal(); if (!demo.goal) { initGame(); mode = 'play'; pickDemoGoal(); } }
    pressing = true;
    var g = demo.goal;
    if (g) {
      demo.zig += dt;
      var dx = g.x - target.x, dy = g.y - target.y, d = Math.hypot(dx, dy);
      var sp = 420 * dt;
      if (d > 8) {
        var wig = d > 90 ? Math.sin(demo.zig * 7) * 16 : 0;
        target.x += dx / d * Math.min(sp, d) + (-dy / d) * wig;
        target.y += dy / d * Math.min(sp, d) + (dx / d) * wig;
      }
    }
    sweep(dt, true);
    demo.gx = target.x; demo.gy = target.y + 150;
  }

  // ── 描画 ─────────────────────────────────────────────────────────
  function grain(n, a) {
    var t = Math.floor(game.time.elapsed * 12);
    for (var i = 0; i < n; i++) {
      var h = (i * 7919 + t * 104729) % 100003;
      game.draw.rect(h % W, (h * 31) % H, 4, 4, i % 2 ? C.white : C.ink, a);
    }
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.fog1], [0.12, C.fog2], [0.19, C.fog3], [0.2, C.grassD], [0.74, C.grass], [0.75, C.stoneD], [1, C.ink]]);
    // 城壁の1枚絵
    for (var b = 0; b < 12; b++) game.draw.rect(b * 92, H * 0.13 - (b % 2) * 26, 80, H * 0.07 + (b % 2) * 26, b % 2 ? C.stone : C.stoneD);
    game.draw.sprite(TOWER, { w: C.stone, k: C.ink }, W * 0.8, H * 0.1, 18, { anchor: 'center' });
    game.draw.rect(0, H * 0.1, W, H * 0.1, C.fog3, 0.25 + 0.08 * Math.sin(t * 0.8));
    // 芝の刈り目(ストリップ)
    for (var y = TOP; y < BOT + 40; y += 64) game.draw.rect(0, y, W, 32, C.grassL, 0.18);
    for (var k = 0; k < 40; k++) {
      var gx = (k * 173) % W, gy = TOP + (k * 97) % (BOT - TOP);
      game.draw.line(gx, gy, gx + Math.sin(t * 2 + k) * 5, gy - 16, C.grassL, 3);
    }
    // 生け垣
    game.draw.rect(0, TOP - 20, 60, BOT - TOP + 60, C.grassD); game.draw.rect(W - 60, TOP - 20, 60, BOT - TOP + 60, C.grassD);
    // 掘った跡
    for (var i = 0; i < finding.length; i++) {
      var f = finding[i];
      if (f.dug) game.draw.sprite(MOUND, { d: C.dirt }, f.x, f.y + 26, 10, { anchor: 'center' });
    }
    game.draw.rect(0, 0, W, H, C.fog3, 0.03 + 0.03 * Math.sin(t * 1.2));
  }

  function drawDetector() {
    var t = game.time.elapsed;
    var n = nearest();
    var s = n ? Math.max(0, 1 - n.d / range()) : 0;
    var junk = n && n.f.junk;
    var hx = W / 2 + (coil.x - W / 2) * 0.35, hy = H * 0.83;
    // 反応リング(金=品 / 赤いトゲ=空き缶)
    if (s > 0) {
      var ph = (t * (2 + s * 6)) % 1;
      var col = junk ? C.bad : C.gold;
      game.draw.circle(coil.x, coil.y, 50 + ph * 120 * (0.5 + s), col, (1 - ph) * 0.5 * s + 0.05);
      if (junk) for (var sp = 0; sp < 8; sp++) {
        var an = sp / 8 * Math.PI * 2 + t;
        game.draw.line(coil.x + Math.cos(an) * 64, coil.y + Math.sin(an) * 64, coil.x + Math.cos(an) * (80 + s * 30), coil.y + Math.sin(an) * (80 + s * 30), C.bad, 5);
      }
    }
    // 竿と輪
    game.draw.line(hx + 40, hy - 60, coil.x, coil.y + 20, C.metalD, 12);
    game.draw.line(hx + 40, hy - 60, coil.x, coil.y + 20, C.metal, 5);
    game.draw.circle(coil.x, coil.y + 8, 58, C.ink, 0.35);
    game.draw.circle(coil.x, coil.y, 56, C.metal);
    game.draw.circle(coil.x, coil.y, 42, lockT > 0 ? (lockOn && lockOn.junk ? C.bad : C.gold) : C.grassD);
    if (lockT > 0) {
      var seg = Math.floor(lockT / LOCK_T * 12);
      for (var q = 0; q < seg; q++) { var aa = -Math.PI / 2 + q / 12 * Math.PI * 2; game.draw.circle(coil.x + Math.cos(aa) * 72, coil.y + Math.sin(aa) * 72, 8, C.white); }
    }
    game.draw.circle(coil.x - 16, coil.y - 18, 10, C.white, 0.6);
    // 学芸員
    game.draw.sprite(CURATOR, { h: '#2a1a14', s: '#e8c09a', c: C.coat, m: C.metal, p: C.ink }, hx, hy + Math.sin(t * 2.4) * 5, 16, { anchor: 'center' });
    // 掘り出し演出
    for (var d = 0; d < digAnim.length; d++) {
      var a = digAnim[d];
      var up = Math.min(1, a.t / 0.3) * 90;
      if ((mode === 'hit' || mode === 'stop') && d === digAnim.length - 1 && Math.floor(t * 14) % 2 === 0) game.draw.circle(a.x, a.y - up, 90, C.white, 0.5);
      game.draw.sprite(a.junk ? CAN : (a.crest ? CREST : COIN), { g: C.gold, G: '#b08a2a', r: '#8a4a3a', k: '#4a2a1a' }, a.x, a.y - up, a.t < 0.5 ? 16 : 14, { anchor: 'center', alpha: Math.max(0, 1.2 - a.t) });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink, 0.75);
    txt(found + ' / ' + NEEDED, W / 2, 88, 66, C.gold);
    txt(String(Math.ceil(timeLeft)), 64, 88, 50, C.white, 'left');
    game.draw.rect(60, 172, W - 120, 20, C.stoneD);
    game.draw.rect(60, 172, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 20, timeLeft < 5 ? C.bad : C.gold);
    for (var i = 0; i < NEEDED; i++) game.draw.sprite(i === 4 ? CREST : COIN, { g: i < found ? C.gold : C.stoneD, G: i < found ? '#b08a2a' : C.ink }, W * 0.62 + i * 76, H * 0.93, 7, { anchor: 'center' });
    game.draw.rect(0, 0, 50, H, C.ink, 0.25); game.draw.rect(W - 50, 0, 50, H, C.ink, 0.25);
  }

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function scoreNow() { return found * 200 + perfects * 80 - junkDug * 60 + Math.round(timeLeft * 12); }

  // ── ループ ───────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (mode === undefined) initGame();
      stepDemo(dt);
      drawWorld(); drawDetector(); grain(40, 0.12);
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 14 });
      game.draw.rect(0, 0, W, 225, C.ink, 0.75);
      txt(GAME_TITLE, W / 2, 86 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 176, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(); drawDetector(); grain(40, 0.12);
      if (win) for (var f = 0; f < 10; f++) game.draw.sprite(COIN, { g: C.gold, G: '#b08a2a' }, (f * 167 + t * 180) % W, (f * 211 + t * 260) % (H * 0.7), 6);
      game.draw.rect(0, H * 0.14, W, H * 0.2, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.19, 96, win ? C.gold : C.bad);
      txt('SCORE ' + (win ? scoreNow() : 0), W / 2, H * 0.25, 46, C.white);
      if (win && scoreNow() >= game.best) txt('NEW RECORD', W / 2, H * 0.3, 42, C.gold);
      else if (!win) txt('あと' + Math.max(1, NEEDED - found) + '個!', W / 2, H * 0.3, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.3, 38, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (mode === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { mode = 'play'; game.audio.play('se_tap', 0.4); }
    } else if (mode === 'play') {
      timeLeft -= dt;
      sweep(dt, false);
      if (mode === 'play' && timeLeft <= 0) {
        timeLeft = 0;
        game.feedback.bad(coil.x, coil.y - 90, { text: 'TIME UP', color: C.bad });
        finish(false);
      }
    } else if (mode === 'hit') {
      stopT -= dt;
      for (var a = 0; a < digAnim.length; a++) digAnim[a].t = Math.min(digAnim[a].t + dt * 0.3, 0.9);
      if (stopT <= 0) mode = 'play';
    } else if (mode === 'stop') {
      stopT -= dt;
      if (stopT <= 0) { mode = 'outro'; outroT = 1.3; }
    } else if (mode === 'outro') {
      outroT -= dt;
      if (outroT <= 0) {
        state = S.RESULT;
        var stats = { found: found, cans: junkDug, perfect: perfects };
        if (win) game.end.success(scoreNow(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawWorld(); drawDetector(); grain(40, 0.12); drawHud();
    if (mode === 'ready') txt(readyT > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, C.gold);
    if (mode === 'outro') {
      game.draw.rect(0, H * 0.36, W, 150, C.ink, 0.8);
      txt(win ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 92, win ? C.gold : C.bad);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['A3', 1], ['C4', 0.5], ['E4', 0.5], ['D4', 1], ['B3', 1],
      ['C4', 1], ['E4', 0.5], ['A4', 0.5], ['G#4', 1.5], ['R', 0.5]
    ], { tempo: 96, wave: 'sine', volume: 0.05, loop: true, bass: [['A2', 2], ['F2', 2], ['E2', 2], ['E2', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
