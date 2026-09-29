// J-Switch-0056-chestnut-burr-balloons.js
// 栗林の風船合戦 — 三方の木から飛んでくる栗のイガを、来た方向へスワイプで打ち返して木の風船を割る
// 操作: イガが自分のまわりの輪に入ったら、飛んできた方向(左/右/上)へスワイプして打ち返す。違う向き・遅れると自分の風船が割れる(社内メモ。画面には出さない)
// 終わり: 木に結ばれた風船を全部(6個)割ればCLEAR。自分の風船3個を全部割られる/時間切れでGAME OVER
// @mechanic: swipe_direction
// @theme: chestnut_grove_balloon_battle
// 世界観: 秋の栗林の風船合戦で、背中に3つの風船を結んだイノシシの子が、三方の木陰から投げ込まれる栗のイガを葉うちわで打ち返し、木の枝に結ばれた風船を全部割って最後まで自分の風船を守り切る
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った風船の数・打ち返し数・残った自分の風船
// スタイル: MODERN AD-GAME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // MODERN AD-GAME: 高彩度・高コントラスト、太い黒縁、飛ぶ数字
  var STYLE = { bg: ['#ffb347', '#ffd86a', '#6ac048'], main: ['#7a4a2a', '#3a2a1a', '#ffffff'], accent: ['#ff3a6a', '#2ad0ff'] };
  var C = {
    sky1: '#ff9a3a', sky2: '#ffe08a', grass: '#5ab83a', grassD: '#3a8a2a', trunk: '#6a3a1a', leaf: '#e06a1a', leafD: '#b04a10',
    boar: '#8a5a3a', burr: '#6ab02a', burrD: '#2a5a10', pink: '#ff3a6a', blue: '#2ad0ff', yellow: '#ffe23a', white: '#ffffff', ink: '#1a1008', bad: '#ff2a2a', gold: '#ffd000'
  };

  var GAME_TITLE = 'BURR BALLOONS';
  var TIME_LIMIT = 14;
  var TARGETS_PER = 2;
  var LIVES = 3;
  var BX = W * 0.5, BY = H * 0.51;
  var ZONE = 330, HIT_R = 80;
  var TREES = [
    { dir: 'left', x: 80, y: H * 0.44, col: C.pink },
    { dir: 'right', x: W - 80, y: H * 0.44, col: C.blue },
    { dir: 'up', x: W * 0.5, y: H * 0.235, col: C.yellow }
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var phase, ready, timeLeft, burrs, warn, nextThrow, left, lives, popped, returns, perfects, hitStop, outro, ok, focus, elapsedPlay, milestone, swingT, swingDir;

  // ── sprites ───────────────────────────────────────────────────────
  var BOAR = [
    ['..kk....kk..', '.kbbk..kbbk.', '.kbbbbbbbbk.', 'kbbwbbbbwbbk', 'kbbkbbbbkbbk', 'kbbbbppbbbbk', '.kbwbppbwbk.', '..kbbbbbbk..', '..kbk..kbk..'],
    ['..kk....kk..', '.kbbk..kbbk.', '.kbbbbbbbbk.', 'kbbwbbbbwbbk', 'kbbkbbbbkbbk', 'kbbbbppbbbbk', '.kbwbppbwbk.', '..kbbbbbbk..', '.kbk....kbk.']
  ];
  var BURR = [
    ['k.k.k', '.ggg.', 'kgGgk', '.ggg.', 'k.k.k'],
    ['.k.k.', 'kgggk', '.gGg.', 'kgggk', '.k.k.']
  ];
  var FAN = ['.lll.', 'lllll', 'lllll', '.lll.', '..k..', '..k..'];
  var RIVAL = ['.kk.', 'kkkk', '.kk.', 'kkkk', 'k..k'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; burrs = []; warn = []; nextThrow = 0.6;
    left = [TARGETS_PER, TARGETS_PER, TARGETS_PER]; lives = LIVES; popped = 0; returns = 0; perfects = 0;
    hitStop = 0; outro = 0; ok = false; focus = null; elapsedPlay = 0; milestone = false; swingT = 0; swingDir = 'up';
  }

  function liveTrees() {
    var list = [];
    for (var i = 0; i < 3; i++) if (left[i] > 0) list.push(i);
    return list;
  }

  // 投げの予告(0.6秒)→発射。後半は2方向からの時間差
  function schedule(dt, isDemo) {
    nextThrow -= dt;
    if (nextThrow > 0) return;
    var trees = liveTrees();
    if (trees.length === 0) return;
    var prog = Math.min(1, elapsedPlay / 10);
    var ti = trees[Math.floor(Math.random() * trees.length)];
    var gold = !isDemo && popped >= 3 && Math.random() < 0.25;
    warn.push({ tree: ti, t: 0.6, gold: gold });
    if (!isDemo) game.audio.tone(ti === 2 ? 'E6' : (ti === 0 ? 'C6' : 'G6'), 0.18, { wave: 'triangle', volume: 0.05, slide: 200 });
    if (prog > 0.45 && trees.length > 1 && Math.random() < 0.5) {
      var other = trees[(trees.indexOf(ti) + 1) % trees.length];
      warn.push({ tree: other, t: 0.95, gold: false });
    }
    nextThrow = 1.35 - prog * 0.45;
  }

  function stepBurrs(dt, isDemo) {
    for (var w = warn.length - 1; w >= 0; w--) {
      warn[w].t -= dt;
      if (warn[w].t <= 0) {
        var tr = TREES[warn[w].tree];
        var dx = BX - tr.x, dy = BY - tr.y, L = Math.hypot(dx, dy);
        var sp = 640 + Math.min(1, elapsedPlay / 10) * 260;
        burrs.push({ x: tr.x, y: tr.y, vx: dx / L * sp, vy: dy / L * sp, tree: warn[w].tree, back: false, gold: warn[w].gold, spin: 0 });
        if (!isDemo) game.audio.play('se_jump', 0.25);
        warn.splice(w, 1);
      }
    }
    for (var i = burrs.length - 1; i >= 0; i--) {
      var b = burrs[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 12;
      if (b.back) {
        var T = TREES[b.tree];
        if (Math.hypot(b.x - T.x, b.y - T.y) < 60) { burrs.splice(i, 1); popTarget(b, isDemo); }
        continue;
      }
      if (Math.hypot(b.x - BX, b.y - BY) < HIT_R) { burrs.splice(i, 1); hurt(b, isDemo); if (phase !== 'play' && !isDemo) return; }
    }
  }

  function popTarget(b, isDemo) {
    var T = TREES[b.tree];
    var n = b.gold ? 2 : 1;
    for (var k = 0; k < n; k++) {
      var ti = left[b.tree] > 0 ? b.tree : (liveTrees()[0]);
      if (ti === undefined) break;
      left[ti]--; if (!isDemo) popped++;
    }
    game.fx.burst(T.x, T.y - 60, { color: T.col, count: isDemo ? 8 : 18, speed: 320 });
    if (isDemo) { if (liveTrees().length === 0) left = [TARGETS_PER, TARGETS_PER, TARGETS_PER]; return; }
    game.audio.play('se_break', 0.45);
    game.fx.popup('+' + n, T.x + (b.tree === 0 ? 80 : (b.tree === 1 ? -80 : 0)), T.y - 150, { color: C.yellow, size: 60 });
    if (!milestone && popped >= 3) {
      milestone = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup(popped + ' / 6', W / 2, H * 0.3, { color: C.white, size: 72 });
    }
    if (liveTrees().length === 0) finish(true);
  }

  function hurt(b, isDemo) {
    if (isDemo) { game.fx.burst(BX, BY - 120, { color: C.bad, count: 10, speed: 260 }); return; }
    lives--;
    focus = { x: b.x, y: b.y, t: 0.45 };
    hitStop = 0.4;
    game.feedback.bad(BX, BY - 200, { text: 'MISS', color: C.bad, shake: true });
    if (lives <= 0) finish(false);
  }

  // スワイプ: 輪の中のイガのうち、来た方向と一致するものを打ち返す
  function swat(dir, isDemo) {
    swingT = 0.2; swingDir = dir;
    var inZone = [];
    for (var i = 0; i < burrs.length; i++) {
      var b = burrs[i];
      if (!b.back && Math.hypot(b.x - BX, b.y - BY) <= ZONE) inZone.push(b);
    }
    if (inZone.length === 0) {
      if (!isDemo) { game.audio.tone('D4', 0.06, { wave: 'triangle', volume: 0.04 }); game.fx.burst(BX, BY, { color: C.white, count: 5, speed: 150 }); }
      return;
    }
    var hit = null;
    for (var j = 0; j < inZone.length; j++) if (TREES[inZone[j].tree].dir === dir) { hit = inZone[j]; break; }
    if (hit) {
      var T = TREES[hit.tree];
      var dx = T.x - hit.x, dy = T.y - hit.y, L = Math.hypot(dx, dy);
      hit.vx = dx / L * 1500; hit.vy = dy / L * 1500; hit.back = true;
      if (isDemo) { game.fx.burst(hit.x, hit.y, { color: C.yellow, count: 8, speed: 220 }); return; }
      var dist = Math.hypot(hit.x - BX, hit.y - BY);
      var perf = dist < 200;
      returns++; if (perf) perfects++;
      game.feedback.good(hit.x, hit.y - 60, { text: perf ? 'PERFECT' : 'GOOD', color: C.yellow, count: perf ? 14 : 8 });
      return;
    }
    if (isDemo) return;
    game.feedback.bad(BX, BY - 60, { text: 'MISS', color: C.bad });
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    if (win) {
      game.fx.flash(C.white, 0.25);
      game.fx.burst(BX, BY - 120, { color: C.gold, count: 30, speed: 460 });
      game.audio.play('se_success', 0.6);
    } else {
      game.feedback.bad(BX, BY - 260, { text: timeLeft <= 0 ? 'TIME UP' : 'GAME OVER', color: C.bad });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase === 'play') { game.audio.play('se_tap', 0.15); game.fx.burst(x, y, { color: C.white, count: 4, speed: 100 }); }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || phase !== 'play' || hitStop > 0) return;
    game.audio.play('se_tap', 0.3);
    swat(dir, false);
  });

  // ── demo(輪に入ったイガを来た方向へ払う。周期ごとに1回だけ逆へ払う)──
  var demo = { t: 0, gx: BX, gy: BY + 200, sx: 0, sy: 0, anim: 0, wrong: false };
  var DEMO_CYC = 7.5;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { burrs = []; warn = []; nextThrow = 0.3; left = [TARGETS_PER, TARGETS_PER, TARGETS_PER]; demo.wrong = false; elapsedPlay = 2; }
    schedule(dt, true);
    stepBurrs(dt, true);
    for (var i = 0; i < burrs.length; i++) {
      var b = burrs[i];
      if (b.back || b.demoDone) continue;
      if (Math.hypot(b.x - BX, b.y - BY) < 230) {
        b.demoDone = true;
        var dir = TREES[b.tree].dir;
        if (!demo.wrong && cyc > 4) { demo.wrong = true; dir = dir === 'left' ? 'right' : 'left'; }
        swat(dir, true);
        demo.anim = 0.3; demo.sx = dir === 'left' ? -1 : (dir === 'right' ? 1 : 0); demo.sy = dir === 'up' ? -1 : 0;
      }
    }
    if (demo.anim > 0) demo.anim -= dt;
    var k = demo.anim > 0 ? 1 - demo.anim / 0.3 : 0;
    demo.gx = BX + demo.sx * 260 * k;
    demo.gy = BY + 260 + demo.sy * 260 * k;
  }

  // ── drawing ───────────────────────────────────────────────────────
  function drawGrove() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky1], [0.4, C.sky2], [0.62, C.grass], [1, C.grassD]]);
    // 遠くの栗の木
    for (var f = 0; f < 6; f++) game.draw.circle(90 + f * 190, H * 0.6, 110, C.leafD, 0.35);
    // 落ち葉
    for (var i = 0; i < 16; i++) {
      var lx = (i * 131 + t * 40) % W, ly = (i * 211 + t * (60 + i * 3)) % H;
      game.draw.rect(lx, ly, 14, 8, i % 2 ? C.leaf : C.yellow, 0.5);
    }
    // 三方の木
    for (var k = 0; k < 3; k++) {
      var T = TREES[k];
      var shake = 0;
      for (var w = 0; w < warn.length; w++) if (warn[w].tree === k) shake = Math.sin(t * 50) * 10;
      if (k < 2) game.draw.rect(T.x - 30 + (k === 0 ? -60 : 60), T.y - 40, 60, H * 0.62 - T.y + 40, C.trunk);
      else game.draw.rect(T.x - 280, T.y - 30, 560, 40, C.trunk);
      game.draw.circle(T.x + shake, T.y - 60, 150, C.ink);
      game.draw.circle(T.x + shake, T.y - 60, 140, C.leaf);
      game.draw.circle(T.x + shake - 40, T.y - 90, 70, C.yellow, 0.25);
      // 木陰の相手(演出のみ)
      if (left[k] > 0) game.draw.sprite(RIVAL, { k: C.ink }, T.x + shake, T.y - 40 + Math.sin(t * 3 + k) * 6, 16, { anchor: 'center', alpha: 0.55 });
      // 枝に結ばれた風船
      for (var n = 0; n < TARGETS_PER; n++) {
        var ox = (n === 0 ? -1 : 1) * 70, oy = -200 + Math.sin(t * 2 + n + k) * 10;
        var alive = n < left[k];
        if (alive) {
          game.draw.line(T.x + shake, T.y - 100, T.x + ox + shake, T.y + oy + 40, C.ink, 3);
          game.draw.circle(T.x + ox + shake, T.y + oy, 46, C.ink);
          game.draw.circle(T.x + ox + shake, T.y + oy, 40, T.col);
          game.draw.circle(T.x + ox + shake - 12, T.y + oy - 14, 10, C.white, 0.7);
        }
      }
    }
    game.draw.rect(0, 0, W, H, C.white, 0.02 + 0.02 * Math.sin(t * 1.4));
  }

  function drawPlayer() {
    var t = game.time.elapsed;
    // 自分の風船
    for (var i = 0; i < LIVES; i++) {
      var bx = BX - 90 + i * 90, by = BY - 150 + Math.sin(t * 2.3 + i) * 10;
      if (i < lives) {
        game.draw.line(BX, BY - 20, bx, by + 40, C.ink, 3);
        game.draw.circle(bx, by, 50, C.ink);
        game.draw.circle(bx, by, 44, i === 1 ? C.yellow : C.pink);
        game.draw.circle(bx - 14, by - 14, 11, C.white, 0.7);
      }
    }
    // 打ち返しの輪
    var nearAny = false;
    for (var b = 0; b < burrs.length; b++) if (!burrs[b].back && Math.hypot(burrs[b].x - BX, burrs[b].y - BY) <= ZONE) nearAny = true;
    game.draw.circle(BX, BY, ZONE, nearAny ? C.white : C.ink, nearAny ? 0.18 : 0.06);
    // イノシシの子と葉うちわ
    var bob = Math.sin(t * 3) * 6;
    game.draw.sprite(BOAR[Math.floor(t * 3) % 2], { k: C.ink, b: C.boar, w: C.white, p: '#e08a7a' }, BX, BY + 80 + bob, 16, { anchor: 'center' });
    var fx = BX + 120, fy = BY + 40;
    if (swingT > 0) { var s = swingT / 0.2; fx = BX + (swingDir === 'left' ? -200 : (swingDir === 'right' ? 200 : 0)) * (1 - s) + 60; fy = BY + (swingDir === 'up' ? -200 : 0) * (1 - s); }
    game.draw.sprite(FAN, { l: C.leaf, k: C.trunk }, fx, fy + bob, 14, { anchor: 'center' });
  }

  function drawBurrs() {
    var t = game.time.elapsed;
    // 予告: 木から自分への点線
    for (var w = 0; w < warn.length; w++) {
      if (warn[w].t > 0.6) continue;
      var T = TREES[warn[w].tree];
      if (Math.floor(t * 12) % 2 === 0) {
        for (var d = 0; d < 8; d++) {
          var k = d / 8;
          game.draw.circle(T.x + (BX - T.x) * k, T.y + (BY - T.y) * k, 8, warn[w].gold ? C.gold : C.white, 0.7);
        }
      }
    }
    for (var i = 0; i < burrs.length; i++) {
      var b = burrs[i];
      var hl = focus && focus.t > 0 && Math.hypot(b.x - focus.x, b.y - focus.y) < 1;
      game.draw.sprite(BURR[Math.floor(b.spin) % 2], { k: C.burrD, g: b.gold ? C.gold : C.burr, G: '#7a4a1a' }, b.x, b.y, b.gold ? 20 : 15, { anchor: 'center' });
      if (b.back) game.draw.circle(b.x, b.y, 50, C.yellow, 0.3);
    }
    if (focus && focus.t > 0 && Math.floor(t * 14) % 2 === 0) {
      game.draw.circle(focus.x, focus.y, 90, C.white, 0.6);
      game.draw.sprite(BURR[0], { k: C.burrD, g: C.white, G: C.bad }, focus.x, focus.y, 24, { anchor: 'center' });
    }
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 228, C.ink, 0.6);
    txt(String(Math.ceil(Math.max(0, timeLeft))), 70, 96, 56, C.white, 'left');
    txt(popped + ' / 6', W / 2, 96, 70, C.yellow);
    for (var i = 0; i < LIVES; i++) game.draw.circle(W - 200 + i * 60, 90, 20, i < lives ? C.pink : '#5a4a3a');
    game.draw.rect(60, 170, W - 120, 18, '#5a4a3a');
    game.draw.rect(60, 170, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 18, timeLeft < 4 ? C.bad : C.yellow);
    // 親指ゾーン: 三方向の矢じり(記号)
    var t = game.time.elapsed;
    var a = 0.25 + 0.1 * Math.sin(t * 3);
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.25);
    game.draw.circle(W * 0.2, H * 0.88, 50, C.pink, a);
    game.draw.circle(W * 0.5, H * 0.85, 50, C.yellow, a);
    game.draw.circle(W * 0.8, H * 0.88, 50, C.blue, a);
  }

  function score() { return popped * 150 + perfects * 40 + lives * 120 + Math.round(Math.max(0, timeLeft) * 15); }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (swingT > 0) swingT -= dt;
    if (focus && focus.t > 0 && phase !== 'stop') focus.t -= dt;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawGrove(); drawBurrs(); drawPlayer();
      game.draw.hand(demo.gx, demo.gy, { press: demo.anim > 0, scale: 13 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.6);
      txt(GAME_TITLE, W / 2 + Math.sin(t * 1.4) * 8, 100 + Math.sin(t * 2) * 6, 76, C.yellow);
      txt('HI-SCORE ' + game.best, W / 2, 190, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.985, 40, C.yellow);
      else txt('INSERT COIN', W / 2, H * 0.985, 34, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawGrove(); drawPlayer();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.36, 48, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.4, 36, C.white);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.985, 38, C.white);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      if (hitStop > 0) hitStop -= dt;
      else {
        timeLeft -= dt; elapsedPlay += dt;
        schedule(dt, false);
        stepBurrs(dt, false);
        if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
      }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var stats = { popped: popped, returns: returns, perfect: perfects, balloonsLeft: lives };
        if (ok) game.end.success(score(), stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawGrove(); drawBurrs(); drawPlayer(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 100, C.yellow);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.25, W, H * 0.17, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 96, ok ? C.gold : C.bad);
      txt('SCORE ' + (ok ? score() : 0), W / 2, H * 0.35, 44, C.white);
      if (ok && score() > game.best) txt('NEW RECORD', W / 2, H * 0.395, 42, C.gold);
      else if (!ok) txt('あと' + Math.max(1, 6 - popped) + '個!', W / 2, H * 0.395, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.395, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 1]
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['G2', 2], ['C3', 2], ['A2', 2], ['D3', 2]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
