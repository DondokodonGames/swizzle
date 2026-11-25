// J-GC4-0042-thaw-slope-postgoat.js
// 雪解け坂の郵便ヤギ — 雪庇から転がり落ちてくる雪玉を、ぶつかる直前の一瞬に跳び越えて山小屋へ登る
// 操作: 画面タップで一回跳ぶ(空中では跳べない)。雪玉が足元に来る直前に跳ぶほどPERFECTで大きく前へ進む
// 終わり: 時間内に頂上の山小屋に着けばCLEAR。雪玉にぶつかる/時間切れでGAME OVER
// @mechanic: timing_one_shot
// @theme: spring_thaw_slope_courier
// 世界観: 春の雪解けの朝、郵便袋を背負ったヤギの配達人が、日差しで崩れた雪庇から転がってくる雪玉を一つずつ跳び越え、昼までに一本道の斜面の上の山小屋へ手紙を届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECT数・到着までの残り時間
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 8x8ドット、3〜4色+黒、タイル反復背景
  var STYLE = { bg: ['#5c94fc', '#a4e4fc', '#fcfcfc'], main: ['#f8f8f8', '#bcbcbc', '#7c7c7c'], accent: ['#d82800', '#fca044'] };
  var C = {
    sky: '#5c94fc', sky2: '#a4e4fc', snow: '#fcfcfc', snowS: '#bcbcbc', rock: '#7c7c7c', ink: '#000000',
    red: '#d82800', orange: '#fca044', brown: '#ac7c00', green: '#00a800', white: '#fcfcfc', gold: '#f8b800', bad: '#d82800', good: '#00a800'
  };

  var GAME_TITLE = 'THAW SLOPE';
  var TIME_LIMIT = 15;
  var AX = 120, AY = H * 0.8, BX = 960, BY = H * 0.3;
  var L = Math.hypot(BX - AX, BY - AY);
  var UX = (BX - AX) / L, UY = (BY - AY) / L;
  var NX = UY, NY = -UX;   // 斜面の上向き法線
  var WALK = 82;           // px/s(斜面沿い)
  var AIR = 0.56;          // 滞空時間
  var IDEAL_TC = 0.19;     // 跳んでから雪玉と重なるまでの理想時間
  var GOAL_S = L - 70;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var phase, ready, timeLeft, gs, air, jumpTc, balls, spawnT, perfects, goods, boost, hitStop, outro, ok, focus, halfShown, playT;

  // ── sprites ───────────────────────────────────────────────────────
  var GOAT = [
    ['.hh.....', 'hwwh....', '.wkw....', '.wwwwww.', '..wwwwwwr', '..wbbwwr.', '..w.w.w.', '..k.k.k.'],
    ['.hh.....', 'hwwh....', '.wkw....', '.wwwwww.', '..wwwwwwr', '..wbbwwr.', '...w.w.w', '...k.k.k']
  ];
  var GOAT_PAL = { h: C.brown, w: '#f8d878', k: C.ink, b: C.red, r: C.orange };
  var BALL = [
    ['..wwww..', '.wwwwws.', 'wwwwwwss', 'wwwwwwss', 'wwwwwsss', 'wwwwssss', '.wssss s', '..ssss..'],
    ['..wwss..', '.wwwsss.', 'wwwwwsss', 'wwwwwwss', 'swwwwwws', 'sswwwwws', '.sswwww.', '..ssww..']
  ];
  var HUT = ['...rr...', '..rrrr..', '.rrrrrr.', 'rrrrrrrr', '.bbbbbb.', '.bwbbdb.', '.bwbbdb.', '.bbbbbb.'];
  var WARN = ['.r.', '.r.', '.r.', '...', '.r.'];
  var CLOUD = ['.ww.ww.', 'wwwwwww', '.wwwww.'];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  function pos(s, h) { return { x: AX + UX * s + NX * h, y: AY + UY * s + NY * h }; }

  function initGame() {
    phase = 'ready'; ready = 0.8; timeLeft = TIME_LIMIT; gs = 60; air = -1; jumpTc = null; balls = []; spawnT = 0.6;
    perfects = 0; goods = 0; boost = 0; hitStop = 0; outro = 0; ok = false; focus = null; halfShown = false; playT = 0;
  }

  function spawnBall() {
    var fast = playT > 5 && Math.random() < 0.4;
    balls.push({ s: L - 10, v: fast ? game.random(420, 500) : game.random(290, 360), warn: 0.65, bounce: playT > 8 && Math.random() < 0.3, graded: false, rot: 0, hit: false });
    game.audio.tone('C6', 0.07, { wave: 'square', volume: 0.05 });
  }

  function ballR(b) { return 26 + (L - b.s) * 0.018; }

  // 一発の跳躍(実プレイ・デモ共用)。直前の雪玉までの到達時間を記録して採点に使う
  function jump(isDemo) {
    if (air >= 0) return false;
    air = 0;
    var next = null;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      if (b.warn > 0 || b.graded || b.s < gs - 20) continue;
      if (!next || b.s < next.s) next = b;
    }
    jumpTc = next ? (next.s - gs - ballR(next)) / (next.v + WALK) : null;
    jumpTc = jumpTc === null ? null : { tc: jumpTc, ball: next };
    game.audio.play('se_jump', isDemo ? 0.2 : 0.45);
    return true;
  }

  function goatH() { return air >= 0 ? Math.sin(Math.min(1, air / AIR) * Math.PI) * 170 : 0; }

  function stepWorld(dt, isDemo) {
    playT += dt;
    var adv = WALK * dt;
    if (boost > 0) { var b0 = Math.min(boost, 260 * dt); adv += b0; boost -= b0; }
    gs = Math.min(GOAL_S, gs + adv);
    if (air >= 0) { air += dt; if (air >= AIR) air = -1; }
    spawnT -= dt;
    if (spawnT <= 0) { spawnBall(); spawnT = Math.max(0.85, 1.45 - playT * 0.04) + game.random(0, 0.35); }
    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.warn > 0) { b.warn -= dt; continue; }
      b.s -= b.v * dt; b.rot += dt * b.v / 40;
      var r = ballR(b);
      var bh = b.bounce ? Math.abs(Math.sin(b.s * 0.012)) * 60 : 0;
      if (!b.graded && Math.abs(b.s - gs) < r + 26) {
        var gh = goatH();
        if (gh < bh + r * 1.6 && gh + 60 > bh) {
          if (!isDemo) { b.hit = true; focus = b; finish(false); return; }
          b.graded = true; game.fx.burst(pos(gs, 40).x, pos(gs, 40).y, { color: C.snow, count: 10, speed: 220 });
          continue;
        }
      }
      if (!b.graded && b.s < gs - r - 26) {
        b.graded = true;
        if (!isDemo) grade(b);
      }
      if (b.s < -80) balls.splice(i, 1);
    }
    if (!isDemo && gs >= GOAL_S && phase === 'play') finish(true);
  }

  function grade(b) {
    var p = pos(gs, 120);
    var tc = jumpTc && jumpTc.ball === b ? jumpTc.tc : null;
    if (tc !== null && Math.abs(tc - IDEAL_TC) < 0.06) {
      perfects++; boost += 95;
      game.feedback.good(p.x, p.y - 40, { text: 'PERFECT', color: C.gold, count: 16 });
    } else {
      goods++; boost += 30;
      game.feedback.good(p.x, p.y - 40, { text: 'GOOD', color: C.good, count: 8 });
    }
    if (!halfShown && gs > L / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.5);
      game.fx.popup('50%', W / 2, H * 0.2, { color: C.gold, size: 64 });
    }
  }

  function finish(win) {
    if (phase === 'stop' || phase === 'outro') return;
    ok = win; phase = 'stop'; hitStop = 0.55;
    game.audio.stopBgm();
    var p = pos(gs, 60);
    if (win) { game.fx.flash(C.gold, 0.25); game.audio.play('se_success', 0.6); game.fx.burst(BX, BY - 80, { color: C.gold, count: 24, speed: 380 }); }
    else {
      game.feedback.bad(p.x, p.y - 80, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
      game.audio.play('se_failure', 0.6);
    }
  }

  // ── input ─────────────────────────────────────────────────────────
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.6); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (phase !== 'play') return;
    if (!jump(false)) {
      game.audio.tone('A2', 0.05, { wave: 'square', volume: 0.06 });
      game.fx.burst(x, y, { color: C.snowS, count: 3, speed: 80 });
    } else {
      game.fx.burst(pos(gs, 0).x, pos(gs, 0).y, { color: C.snow, count: 5, speed: 140 });
    }
  });

  // ── demo(実ロジックで登る。3回に1回は跳ぶのが遅れてぶつかる)──────────
  var demo = { t: 0, gx: W * 0.5, gy: H * 0.9, press: false, n: 0, pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5;
    if (cyc < dt || demo.t <= dt) { gs = 60; balls = []; spawnT = 0.2; air = -1; playT = 3; demo.n = 0; boost = 0; }
    stepWorld(dt, true);
    if (gs >= GOAL_S) gs = 60;
    demo.pt -= dt;
    demo.press = demo.pt > 0;
    if (air < 0) {
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        if (b.warn > 0 || b.graded || b.s < gs) continue;
        var tc = (b.s - gs - ballR(b)) / (b.v + WALK);
        var late = demo.n % 3 === 2;
        if (tc < (late ? 0.05 : IDEAL_TC)) {
          jump(true); demo.n++; demo.pt = 0.2;
          var p = pos(gs, 0); demo.gx = p.x + 60; demo.gy = p.y + 100;
          break;
        }
      }
    }
  }

  // ── drawing ───────────────────────────────────────────────────────
  function slopeY(x) { return AY + (x - AX) * (BY - AY) / (BX - AX); }

  function drawMountain() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.sky], [0.5, C.sky2], [1, C.sky2]]);
    game.draw.sprite(CLOUD, { w: C.white }, ((t * 20) % (W + 200)) - 100, H * 0.1, 16, {});
    game.draw.sprite(CLOUD, { w: C.white }, ((t * 12 + 600) % (W + 200)) - 100, H * 0.17, 12, {});
    // 遠くの山並み(タイル階段)
    for (var x = 0; x < W; x += 24) {
      var hh = 120 + Math.abs(((x / 24) % 16) - 8) * 26;
      game.draw.rect(x, H * 0.42 - hh, 24, hh, '#a0a0f8');
      game.draw.rect(x, H * 0.42 - hh, 24, 16, C.white);
    }
    // 斜面(8pxの段差で塗る)
    for (var sx = 0; sx < W; sx += 24) {
      var y = Math.max(BY, slopeY(Math.max(AX, Math.min(BX, sx))));
      if (sx > BX) y = BY;
      y = Math.round(y / 24) * 24;
      game.draw.rect(sx, y, 24, H - y, '#c8dcf8');
      game.draw.rect(sx, y, 24, 16, C.snow);
      game.draw.rect(sx, y + 24, 24, 8, '#a8c0e8');
      for (var yy = y + 72; yy < H; yy += 72) game.draw.rect(sx + ((yy / 72) % 2) * 12, yy, 8, 8, '#a8c0e8');
    }
    // 雪庇(頂上の張り出し。雪玉はここから崩れる)
    game.draw.rect(BX - 60, BY - 40, 180, 40, C.snow);
    game.draw.rect(BX - 60, BY - 8, 180, 8, C.snowS);
    game.draw.sprite(HUT, { r: C.red, b: C.brown, w: C.gold, d: C.ink }, BX + 20, BY - 150, 13, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, C.white, 0.03 + 0.03 * Math.sin(t * 1.4));
  }

  function drawBalls() {
    var t = game.time.elapsed;
    for (var i = 0; i < balls.length; i++) {
      var b = balls[i];
      var r = ballR(b);
      if (b.warn > 0) {
        if (Math.floor(t * 12) % 2 === 0) game.draw.sprite(WARN, { r: C.red }, BX - 20, BY - 150, 12, { anchor: 'center' });
        game.draw.sprite(BALL[0], { w: C.white, s: C.snowS }, BX - 30 + Math.sin(t * 50) * 4, BY - 40, r / 4, { anchor: 'center' });
        continue;
      }
      var bh = b.bounce ? Math.abs(Math.sin(b.s * 0.012)) * 60 : 0;
      var p = pos(b.s, r + bh);
      var sc = r / 4 * (b.hit && phase === 'stop' ? 1.4 : 1);
      game.draw.circle(p.x, p.y, r * (sc / (r / 4)) + 5, C.ink);
      game.draw.sprite(BALL[Math.floor(b.rot) % 2], { w: C.white, s: C.snowS }, p.x, p.y, sc, { anchor: 'center' });
      if (b.hit && Math.floor(t * 14) % 2 === 0) game.draw.circle(p.x, p.y, r * 1.6, C.white, 0.6);
    }
  }

  function drawGoat() {
    var t = game.time.elapsed;
    var h = goatH();
    var p = pos(gs, 44 + h);
    var fr = GOAT[air >= 0 ? 0 : Math.floor(t * 8) % 2];
    var g0 = pos(gs, 0);
    game.draw.rect(g0.x - 30, g0.y - 6, 60, 8, C.snowS);
    game.draw.sprite(fr, GOAT_PAL, p.x, p.y, 11, { anchor: 'center' });
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 225, C.ink);
    var progress = Math.min(1, gs / GOAL_S);
    txt(Math.round(progress * 100) + '%', W / 2, 80, 60, C.white);
    txt(String(Math.ceil(timeLeft)), 70, 80, 56, timeLeft < 4 ? C.red : C.gold, 'left');
    txt('x' + perfects, W - 70, 80, 48, C.gold, 'right');
    game.draw.rect(60, 160, W - 120, 24, '#3c3c3c');
    game.draw.rect(60, 160, (W - 120) * progress, 24, C.green);
    game.draw.rect(60 + (W - 120) * (1 - Math.max(0, timeLeft / TIME_LIMIT)) - 4, 150, 8, 44, C.red);
    // 親指ゾーンの地面帯
    game.draw.rect(0, H * 0.9, W, H * 0.1, C.snowS);
  }

  // ── main loop ─────────────────────────────────────────────────────
  game.onUpdate(function(dt) {
    var t = game.time.elapsed;

    if (state === S.ATTRACT) {
      if (phase === undefined) initGame();
      stepDemo(dt);
      drawMountain(); drawBalls(); drawGoat();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 230, C.ink, 0.8);
      txt(GAME_TITLE, W / 2, 90 + Math.sin(t * 2) * 6, 76, C.gold);
      txt('HI-SCORE ' + game.best, W / 2, 180, 36, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 44, C.red);
      else txt('INSERT COIN', W / 2, H * 0.95, 36, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawMountain(); drawGoat();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.2, 90, ok ? C.gold : C.red);
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.ink);
      return;
    }

    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_tap', 0.5); }
    } else if (phase === 'play') {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (phase === 'play' && timeLeft <= 0) { timeLeft = 0; finish(false); }
    } else if (phase === 'stop') {
      hitStop -= dt;
      if (hitStop <= 0) { phase = 'outro'; outro = 1.4; }
    } else if (phase === 'outro') {
      outro -= dt;
      if (outro <= 0) {
        state = S.RESULT;
        var score = perfects * 100 + goods * 30 + (ok ? Math.round(timeLeft * 50) : 0);
        var stats = { perfects: perfects, goods: goods, percent: Math.round(gs / GOAL_S * 100) };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
        return;
      }
    }

    drawMountain(); drawBalls(); drawGoat(); drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.red);
    if (phase === 'outro') {
      game.draw.rect(0, H * 0.14, W, H * 0.17, C.ink, 0.85);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.18, 96, ok ? C.gold : C.red);
      var sc = perfects * 100 + goods * 30 + (ok ? Math.round(timeLeft * 50) : 0);
      txt('SCORE ' + sc, W / 2, H * 0.24, 44, C.white);
      var pct = Math.round(gs / GOAL_S * 100);
      if (ok && sc > game.best) txt('NEW RECORD', W / 2, H * 0.28, 40, C.gold);
      else if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.28, 44, C.white);
      else txt('BEST ' + game.best, W / 2, H * 0.28, 36, C.white);
    }
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1],
      ['A4', 0.5], ['C5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['C5', 1]
    ], { tempo: 144, wave: 'square', volume: 0.05, loop: true, bass: [['C3', 1], ['G2', 1], ['G2', 1], ['D3', 1], ['F2', 1], ['C3', 1], ['G2', 1], ['C3', 1]] });
    state = S.ATTRACT;
    initGame();
  });
})(game);
