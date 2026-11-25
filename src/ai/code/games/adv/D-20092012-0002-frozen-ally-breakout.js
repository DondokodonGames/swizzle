// D-20092012-0002-frozen-ally-breakout.js
// フローズンレスキュー — 放り投げた温石を弧を描いて飛ばし、氷塊の奥の仲間を割って助け出す
// 操作: 石を下に引いて放物線の角度と強さを決め、離して発射。石は氷塊に当たって割る
// 終わり: 3投以内に仲間を覆う氷塊をすべて割れば成功。3投使い切って割れなければ失敗
// @mechanic: trajectory
// @theme: frozen_ally_rescue
// 世界観: 吹雪の岩棚に閉じ込められた仲間。投げた温石の弧を読みながら、氷塊を順に割って助け出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 割った氷塊数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 中彩度の寒色パレット、輪郭くっきり、階調のあるグラデ
  var STYLE = {
    bg: ['#1a2c44', '#0c1622'],
    main: ['#7ec8e3', '#4a7fa8', '#e8e0d0'],
    accent: ['#ff8a3d', '#3dff9e'],
  };
  var C = {
    skyTop: STYLE.bg[0], skyBot: STYLE.bg[1],
    ice: STYLE.main[0], iceDark: STYLE.main[1], snow: STYLE.main[2],
    stone: STYLE.accent[0], ally: STYLE.accent[1],
    good: '#3dff9e', bad: '#ff5a5a', gold: '#ffd85a', white: '#eef4f8', ink: '#081018',
  };

  var GAME_TITLE = 'FROZEN RESCUE';
  var THROWS_TOTAL = 3;
  var GROUND_Y = H * 0.82;
  var ANCHOR = { x: W * 0.24, y: H * 0.70 };
  var GRAVITY = 1650;
  var STONE_R = 22;
  var ALLY = { x: W * 0.72, y: GROUND_Y - 130 };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ALLY_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];
  var STONE_SPR = ['.#.', '###', '.#.'];

  function buildBlocks() {
    // 仲間の前に立ちはだかる氷塊を3枚、縦に配置(手前→奥)
    return [
      { x: ALLY.x - 10, y: GROUND_Y - 90, w: 130, h: 120, hp: 1, cracked: false },
      { x: ALLY.x + 40, y: GROUND_Y - 220, w: 110, h: 110, hp: 1, cracked: false },
      { x: ALLY.x - 60, y: GROUND_Y - 330, w: 100, h: 100, hp: 1, cracked: false },
    ];
  }

  var throwIdx, blocks, broken, stone, pull, phase, settleT;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    throwIdx = 0; broken = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    blocks = buildBlocks(); stone = null; pull = null; phase = 'aim'; settleT = 0;
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
    var vx = Math.max(80, dx) * 3.4;
    var vy = -Math.abs(dy) * 4.0 - 280;
    stone = { x: ANCHOR.x, y: ANCHOR.y, vx: vx, vy: vy, r: STONE_R };
    phase = 'flight';
    pull = null;
    game.audio.play('se_jump', 0.5);
  }

  function updatePhysics(dt, isDemo) {
    if (!stone) return;
    stone.vy += GRAVITY * dt;
    stone.x += stone.vx * dt;
    stone.y += stone.vy * dt;

    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.hp <= 0) continue;
      var closestX = Math.max(b.x - b.w / 2, Math.min(stone.x, b.x + b.w / 2));
      var closestY = Math.max(b.y - b.h / 2, Math.min(stone.y, b.y + b.h / 2));
      var dx = stone.x - closestX, dy = stone.y - closestY;
      var dist = Math.hypot(dx, dy);
      if (dist < stone.r) {
        b.hp = 0;
        stone.vx *= 0.4; stone.vy *= -0.25;
        if (!isDemo) {
          broken++;
          hitStop = Math.max(hitStop, 0.15);
          game.feedback.good(b.x, b.y, { text: 'CRACK', color: C.gold });
          game.fx.burst(b.x, b.y, { color: C.ice, count: 16, speed: 340 });
          game.audio.play('se_break', 0.45);
          if (broken === 1 && !milestoneShown) { milestoneShown = true; game.fx.popup('あと' + (blocks.length - broken) + '枚!', W * 0.5, H * 0.18, { color: C.white, size: 34 }); game.audio.play('se_milestone', 0.3); }
        }
        break;
      }
    }
    if (stone.y > H + 100 || stone.x > W + 200 || stone.x < -200) {
      phase = 'settle'; settleT = 0.4;
    }
  }

  function afterSettle() {
    throwIdx++;
    var remaining = 0;
    for (var i = 0; i < blocks.length; i++) if (blocks[i].hp > 0) remaining++;
    if (remaining === 0) { ok = true; finished = true; finish(); return; }
    if (throwIdx >= THROWS_TOTAL) { ok = false; finished = true; finish(); return; }
    stone = null; phase = 'aim';
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done) return;
    game.audio.play('se_tap', 0.15);
    beginPull(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    movePull(x, y);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || phase !== 'aim' || !pull) return;
    game.feedback.good(ANCHOR.x, ANCHOR.y, { text: '', sound: 'se_jump', count: 6, color: C.stone });
    releasePull();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: ANCHOR.x, gy: ANCHOR.y, press: false, sub: 'wait', subT: 0.6, idx: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { blocks = buildBlocks(); stone = null; phase = 'aim'; demo.sub = 'wait'; demo.subT = 0.5; demo.idx = 0; }
    demo.subT -= dt;
    if (demo.sub === 'wait' && demo.subT <= 0) {
      demo.sub = 'drag'; demo.subT = 0.5; demo.gx = ANCHOR.x; demo.gy = ANCHOR.y;
      beginPull(ANCHOR.x, ANCHOR.y);
    } else if (demo.sub === 'drag') {
      var f = 1 - Math.max(0, demo.subT / 0.5);
      var tx = ANCHOR.x - 130, ty = ANCHOR.y + 140;
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
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.snow);
    for (var i = 0; i < 5; i++) game.draw.circle(W * (0.1 + i * 0.2), H * 0.15 + (i % 2) * 40, 3, '#ffffff88');
  }

  function drawScene() {
    var f = Math.floor(game.time.elapsed * 5) % 2;
    game.draw.sprite(ALLY_F[f], { '#': C.ally }, ALLY.x, ALLY.y, 16, { anchor: 'center' });
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.hp <= 0) continue;
      game.draw.rect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h, C.ice, 0.85);
      game.draw.rect(b.x - b.w / 2, b.y - b.h / 2, b.w, 8, C.snow, 0.6);
      game.draw.line(b.x - b.w / 3, b.y - b.h / 3, b.x + b.w / 4, b.y + b.h / 4, C.iceDark, 3);
    }
  }

  function drawStoneAndAim() {
    var bx = stone ? stone.x : ANCHOR.x;
    var by = stone ? stone.y : ANCHOR.y;
    if (phase === 'aim' && pull) {
      game.draw.line(ANCHOR.x, ANCHOR.y, pull.x, pull.y, C.gold, 6);
      bx = ANCHOR.x; by = ANCHOR.y;
    }
    game.draw.sprite(STONE_SPR, { '#': C.stone }, bx, by, 9, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene();
      drawStoneAndAim();
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
      bg(); drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(broken + ' / ' + blocks.length, W / 2, H * 0.13, 30, C.white);
      if (!ok) txt('あと' + (blocks.length - broken) + '枚!', W / 2, H * 0.17, 26, C.white);
      if (broken > game.best && broken > 0) txt('NEW RECORD', W / 2, H * 0.21, 28, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { broken: broken, total: blocks.length };
        if (ok) game.end.success(broken, stats); else game.end.failure(stats);
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
    drawScene();
    if (!finished || phase !== 'settle') drawStoneAndAim();

    txt('THROW ' + Math.min(throwIdx + 1, THROWS_TOTAL) + ' / ' + THROWS_TOTAL, W / 2, H * 0.06, 28, C.white);
    txt(broken + ' / ' + blocks.length, W / 2, H * 0.10, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
