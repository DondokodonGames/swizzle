// D-20092012-0001-toppling-tower-launch.js
// タワーノック — 引いて放った石弾を積み木の砦へ飛ばし、上に潜む敵ごと崩す
// 操作: 弾を下に引いて狙いと強さを決め、離して発射。石弾は積み木に当たって砦を崩す
// 終わり: 3発以内に砦の敵を全て崩せば成功。3発使い切って敵が残れば失敗
// @mechanic: slingshot
// @theme: block_fortress_siege
// 世界観: 岩山に積まれた木箱の砦。てっぺんに居座る見張りたちを、放り投げた岩弾で箱ごと崩して追い払う
// 残るもの: 正誤(CLEAR/GAME OVER) + 倒した見張り数
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 緑がかった限定パレット、粗いドット、太い輪郭
  var STYLE = {
    bg: ['#1c2a1a', '#0e160c'],
    main: ['#8a6a3a', '#c9a24a', '#5a7a3a'],
    accent: ['#e8503a', '#eee6c8'],
  };
  var C = {
    skyTop: STYLE.bg[0], skyBot: STYLE.bg[1],
    wood: STYLE.main[0], woodLight: STYLE.main[1], grass: STYLE.main[2],
    foe: STYLE.accent[0], cream: STYLE.accent[1],
    good: '#7ef07a', bad: '#ff5a4a', gold: '#eecc3a', white: '#eee6c8', ink: '#0a0e08',
  };

  var GAME_TITLE = 'TOWER KNOCK';
  var SHOTS_TOTAL = 3;
  var GROUND_Y = H * 0.80;
  var ANCHOR = { x: W * 0.22, y: H * 0.72 };
  var GRAVITY = 2100;
  var BALL_R = 26;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FOE_F = [
    ['.##.', '####', '.##.'],
    ['.##.', '####', '#..#'],
  ];
  var BALL_SPR = ['.##.', '####', '.##.'];

  // 箱1つ = {x,y,w,h,vx,vy,fallen}。見張り1体 = {bx (箱index), alive}
  function buildFortress() {
    var blocks = [];
    var baseW = 110, baseH = 90;
    var cols = 3;
    var startX = W * 0.62;
    var rows = 3;
    for (var r = 0; r < rows; r++) {
      var n = cols - r;
      var rowW = n * (baseW + 8) - 8;
      var rx = startX - rowW / 2 + baseW / 2;
      for (var i = 0; i < n; i++) {
        blocks.push({
          x: rx + i * (baseW + 8), y: GROUND_Y - baseH / 2 - r * baseH,
          w: baseW, h: baseH, vx: 0, vy: 0, settled: true,
        });
      }
    }
    var foes = [
      { x: startX - 60, y: GROUND_Y - baseH * 3 - 40, alive: true },
      { x: startX + 60, y: GROUND_Y - baseH * 3 - 40, alive: true },
    ];
    return { blocks: blocks, foes: foes };
  }

  var shotIdx, fort, defeated, ball, pull, phase, settleT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    shotIdx = 0; defeated = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    fort = buildFortress(); ball = null; pull = null; phase = 'aim'; settleT = 0;
  }

  function beginPull(x, y) {
    if (phase !== 'aim') return;
    pull = { x0: ANCHOR.x, y0: ANCHOR.y, x: x, y: y };
  }
  function movePull(x, y) {
    if (phase !== 'aim' || !pull) return;
    pull.x = x; pull.y = y;
  }
  function releasePull() {
    if (phase !== 'aim' || !pull) return;
    var dx = pull.x0 - pull.x, dy = pull.y0 - pull.y;
    var vx = Math.max(60, dx) * 3.6;
    var vy = -Math.abs(dy) * 4.6 - 300;
    ball = { x: ANCHOR.x, y: ANCHOR.y, vx: vx, vy: vy, r: BALL_R };
    phase = 'flight';
    pull = null;
    game.audio.play('se_jump', 0.5);
  }

  function updatePhysics(dt, isDemo) {
    if (!ball) return;
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // 積み木との当たり(単純化: 円 vs 矩形の中心距離)
    for (var i = 0; i < fort.blocks.length; i++) {
      var b = fort.blocks[i];
      if (!b.settled && Math.abs(b.vx) < 4 && Math.abs(b.vy) < 4) continue;
      var closestX = Math.max(b.x - b.w / 2, Math.min(ball.x, b.x + b.w / 2));
      var closestY = Math.max(b.y - b.h / 2, Math.min(ball.y, b.y + b.h / 2));
      var dx = ball.x - closestX, dy = ball.y - closestY;
      var dist = Math.hypot(dx, dy);
      if (dist < ball.r) {
        b.settled = false;
        b.vx = (dx / (dist || 1)) * 260 + ball.vx * 0.35;
        b.vy = -260 + game.random(-80, 0);
        ball.vx *= 0.5; ball.vy *= -0.3;
        if (!isDemo) { shake = Math.max(shake, 0.12); game.audio.tone(150, 0.05, { wave: 'square', volume: 0.1 }); }
      }
    }
    // 積み木の落下物理(簡易)
    for (var j = 0; j < fort.blocks.length; j++) {
      var bl = fort.blocks[j];
      if (bl.settled) continue;
      bl.vy += GRAVITY * 0.6 * dt;
      bl.x += bl.vx * dt; bl.y += bl.vy * dt;
      bl.vx *= 0.98;
      if (bl.y > GROUND_Y - bl.h / 2) { bl.y = GROUND_Y - bl.h / 2; bl.vy *= -0.2; bl.vx *= 0.6; if (Math.abs(bl.vy) < 30) bl.vy = 0; }
    }
    // 見張り判定: 支えの箱が崩れて近くに衝撃があれば落下
    for (var k = 0; k < fort.foes.length; k++) {
      var f = fort.foes[k];
      if (!f.alive) continue;
      var hitFoe = game.hit.circle(ball.x, ball.y, ball.r, f.x, f.y, 46);
      var shakenBelow = false;
      for (var m = 0; m < fort.blocks.length; m++) {
        var bb = fort.blocks[m];
        if (!bb.settled && Math.abs(bb.x - f.x) < 90 && bb.y > f.y - 20) shakenBelow = true;
      }
      if (hitFoe || (shakenBelow && game.random(0, 1) < 0.4)) {
        f.alive = false;
        if (!isDemo) {
          defeated++;
          hitStop = Math.max(hitStop, 0.15);
          game.feedback.good(f.x, f.y, { text: 'DOWN', color: C.gold });
          game.fx.burst(f.x, f.y, { color: C.gold, count: 16, speed: 340 });
          game.audio.play('se_break', 0.45);
          if (defeated === 1 && !milestoneShown) { milestoneShown = true; game.fx.popup('あと' + (fort.foes.length - defeated) + '体!', W * 0.5, H * 0.18, { color: C.white, size: 34 }); game.audio.play('se_milestone', 0.3); }
        }
      }
    }
    if (ball.y > H + 100 || ball.x > W + 200 || ball.x < -200) {
      phase = 'settle'; settleT = 0.5;
    }
  }

  function afterSettle() {
    shotIdx++;
    var aliveFoes = 0;
    for (var i = 0; i < fort.foes.length; i++) if (fort.foes[i].alive) aliveFoes++;
    if (aliveFoes === 0) { ok = true; finished = true; finish(); return; }
    if (shotIdx >= SHOTS_TOTAL) { ok = false; finished = true; finish(); return; }
    ball = null; phase = 'aim';
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done) return;
    game.audio.play('se_tap', 0.15);
    game.fx.popup('', x, y, { color: C.gold, size: 1 });
    beginPull(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    movePull(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || phase !== 'aim' || !pull) return;
    game.feedback.good(ANCHOR.x, ANCHOR.y, { text: '', sound: 'se_jump', count: 6, color: C.gold });
    releasePull();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ANCHOR.x, gy: ANCHOR.y, press: false, sub: 'wait', subT: 0.6 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { fort = buildFortress(); ball = null; phase = 'aim'; demo.sub = 'wait'; demo.subT = 0.5; }
    demo.subT -= dt;
    if (demo.sub === 'wait' && demo.subT <= 0) {
      demo.sub = 'drag'; demo.subT = 0.5; demo.gx = ANCHOR.x; demo.gy = ANCHOR.y;
      beginPull(ANCHOR.x, ANCHOR.y);
    } else if (demo.sub === 'drag') {
      var f = 1 - Math.max(0, demo.subT / 0.5);
      var tx = ANCHOR.x - 150, ty = ANCHOR.y + 110;
      demo.gx = ANCHOR.x + (tx - ANCHOR.x) * f; demo.gy = ANCHOR.y + (ty - ANCHOR.y) * f;
      demo.press = true;
      movePull(demo.gx, demo.gy);
      if (demo.subT <= 0) { releasePull(); demo.sub = 'flight'; demo.subT = 2.0; demo.press = false; }
    } else if (demo.sub === 'flight') {
      updatePhysics(dt, true);
      if (phase === 'settle') { demo.sub = 'hold'; demo.subT = 0.6; }
    } else if (demo.sub === 'hold') {
      if (demo.subT <= 0) { demo.sub = 'wait'; demo.subT = 0.5; }
    }
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.skyTop], [1, C.skyBot]]);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.grass);
    for (var i = 0; i < 6; i++) game.draw.rect(i * (W / 6), GROUND_Y, 4, H - GROUND_Y, '#00000018');
  }

  function drawFort() {
    for (var i = 0; i < fort.blocks.length; i++) {
      var b = fort.blocks[i];
      game.draw.rect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, C.wood);
      game.draw.rect(b.x - b.w / 2, b.y - b.h / 2, b.w, 10, C.woodLight);
      game.draw.rect(b.x - b.w / 2 + 6, b.y - b.h / 2 + 6, b.w - 12, b.h - 12, C.wood, 0.9);
    }
    var f = Math.floor(game.time.elapsed * 6) % 2;
    for (var k = 0; k < fort.foes.length; k++) {
      var fo = fort.foes[k];
      if (!fo.alive) continue;
      game.draw.sprite(FOE_F[f], { '#': C.foe }, fo.x, fo.y, 14, { anchor: 'center' });
    }
  }

  function drawBallAndAim() {
    var bx = ball ? ball.x : ANCHOR.x;
    var by = ball ? ball.y : ANCHOR.y;
    if (phase === 'aim' && pull) {
      game.draw.line(ANCHOR.x, ANCHOR.y, pull.x, pull.y, C.gold, 6);
      bx = ANCHOR.x; by = ANCHOR.y;
    }
    var sf = Math.floor(game.time.elapsed * 10) % 2;
    game.draw.sprite(BALL_SPR, { '#': sf === 0 ? C.cream : C.woodLight }, bx, by, 9, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawFort();
      drawBallAndAim();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.95, 30, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg(); drawFort();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(defeated + ' / ' + fort.foes.length, W / 2, H * 0.13, 30, C.white);
      if (!ok) txt('あと' + (fort.foes.length - defeated) + '体!', W / 2, H * 0.17, 26, C.white);
      if (defeated > game.best && defeated > 0) txt('NEW RECORD', W / 2, H * 0.21, 28, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { defeated: defeated, total: fort.foes.length };
        if (ok) game.end.success(defeated, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      if (phase === 'flight') updatePhysics(dt, false);
      else if (phase === 'settle') { settleT -= dt; if (settleT <= 0) afterSettle(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFort();
    if (!finished || phase !== 'settle') drawBallAndAim();

    txt('SHOT ' + Math.min(shotIdx + 1, SHOTS_TOTAL) + ' / ' + SHOTS_TOTAL, W / 2, H * 0.06, 28, C.white);
    txt(defeated + ' / ' + fort.foes.length, W / 2, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['E4', 0.3], ['G4', 0.3], ['C5', 0.6]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
