// D-20222026-0002-mineral-vault-stacker.js
// ミネラル・ヴォルトスタッカー — 狭い縦穴に落ちる鉱石を3本の柱へ振り分け、同じ大きさを積み重ねて合体させる
// 操作: 落下中の鉱石を指で押さえたまま左右の柱へ動かし、着地位置を選んで積む
// 終わり: いずれかの柱で規定の段位まで育てば成功。柱が積み過ぎて溢れたら失敗
// @mechanic: stack
// @theme: mineral_vault_stacker
// 世界観: 地下金庫の管理人が狭い縦穴から落ちてくる鉱石を3本の柱へ振り分け、同じ大きさ同士を積み重ねて合体させながら溢れさせずに育てる
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した最高段位
// スタイル: HD POST 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HD POST 3D: 深いコントラストのグラデーション+強いハイライト、宝石らしい艶
  var C = {
    bg: '#0a0f2a', bg2: '#04061a', pillar: '#2a3560', pillarDark: '#161c38',
    good: '#5affc0', bad: '#ff4d5e', gold: '#ffd24a', ink: '#04060f', white: '#eef2ff',
  };
  var GEM_COL = ['#7fd8ff', '#8affb0', '#ffe27a', '#ff9fd0', '#c79bff', '#ff8a5a'];

  var GAME_TITLE = 'VAULT STACKER';
  var LANES = 3;
  var LANE_W = 240;
  var BOARD_X0 = W * 0.5 - (LANES * LANE_W) / 2;
  var FLOOR_Y = H * 0.84;
  var SLOT_H = 108;
  var MAX_STACK = 4;
  var TARGET_TIER = 4;
  var TIME_LIMIT = 15;
  var FALL_TIME = 1.15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#02030a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.1);
    game.draw.rect(0, 0, W, H, C.good, pulse * 0.05);
  }

  function laneX(l) { return BOARD_X0 + l * LANE_W + LANE_W / 2; }

  var lanes, maxTier, falling, roundClock, lockLane;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    lanes = []; for (var i = 0; i < LANES; i++) lanes.push([]);
    maxTier = 1; roundClock = 0; milestoneShown = false; lockLane = 1;
    falling = { lane: 1, y: H * 0.16, t: 0, tier: 1 + Math.floor(Math.random() * 2) };
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function landGem() {
    var l = falling.lane;
    var stack = lanes[l];
    stack.push(falling.tier);
    var p = { x: laneX(l), y: FLOOR_Y - stack.length * SLOT_H };
    var merges = 0;
    while (stack.length >= 2 && stack[stack.length - 1] === stack[stack.length - 2]) {
      var t = stack.pop(); stack.pop();
      stack.push(t + 1);
      merges++;
      if (stack[stack.length - 1] > maxTier) maxTier = stack[stack.length - 1];
    }
    if (merges > 0) {
      game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
      game.fx.burst(p.x, p.y, { color: C.gold, count: 18, speed: 380 });
      game.audio.play('se_good', 0.4);
      if (maxTier >= Math.ceil(TARGET_TIER / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, H * 0.22, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
    } else {
      game.audio.play('se_break', 0.25);
    }
    if (maxTier >= TARGET_TIER) { succeedNow(); return; }
    if (stack.length > MAX_STACK) {
      hitStop = 0.3; shake = 0.26;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      failNow();
      return;
    }
    falling = { lane: lockLane, y: H * 0.16, t: 0, tier: 1 + Math.floor(Math.random() * 2) };
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.24;
    game.fx.burst(W / 2, FLOOR_Y - 200, { color: C.gold, count: 26, speed: 420 });
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var l = Math.max(0, Math.min(LANES - 1, Math.floor((x - BOARD_X0) / LANE_W)));
    lockLane = l; falling.lane = l;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    var l = Math.max(0, Math.min(LANES - 1, Math.floor((x - BOARD_X0) / LANE_W)));
    lockLane = l; falling.lane = l;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawScene() {
    for (var c = 0; c <= LANES; c++) {
      game.draw.rect(BOARD_X0 + c * LANE_W - 8, H * 0.38, 16, FLOOR_Y - H * 0.38 + 20, C.pillar);
    }
    game.draw.rect(BOARD_X0 - 8, FLOOR_Y + 16, LANES * LANE_W + 16, 18, C.pillarDark);
    for (var i = 0; i < LANES; i++) {
      var stack = lanes[i];
      for (var s = 0; s < stack.length; s++) {
        var tier = stack[s];
        var col = GEM_COL[Math.min(tier - 1, GEM_COL.length - 1)];
        var r = 34 + tier * 9;
        var py = FLOOR_Y - s * SLOT_H - r * 0.9;
        game.draw.circle(laneX(i), py, r, col);
        game.draw.circle(laneX(i) - r * 0.25, py - r * 0.3, r * 0.28, '#ffffff', 0.5);
      }
    }
    if (falling && !finished) {
      var col2 = GEM_COL[Math.min(falling.tier - 1, GEM_COL.length - 1)];
      game.draw.circle(laneX(falling.lane), falling.y, 34 + falling.tier * 9, col2);
    }
    var kf = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(KEEPER_F[kf], { '#': C.white }, W * 0.86, H * 0.86, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: laneX(1), gy: H * 0.95, press: true };
  function resetDemo() { initGame(); }
  function stepDemoFall(dt) {
    if (!falling) return;
    falling.t += dt;
    var targetLane = 1;
    for (var i = 0; i < LANES; i++) {
      if (lanes[i].length > 0 && lanes[i][lanes[i].length - 1] === falling.tier) { targetLane = i; break; }
    }
    falling.lane = targetLane;
    var ty = FLOOR_Y - lanes[falling.lane].length * SLOT_H;
    falling.y = H * 0.16 + (ty - H * 0.16) * (falling.t / FALL_TIME);
    if (falling.t >= FALL_TIME) landGem();
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 10;
    if (cyc < dt || demo.t <= dt) resetDemo();
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    stepDemoFall(dt);
    var tx = laneX(falling ? falling.lane : 1);
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = H * 0.95;
    demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.PLAYING && !finished && ready <= 0) stepDemoFall(dt);
    if (state === S.ATTRACT) {
      if (lanes === undefined) initGame();
      stepDemo(dt);
      bg();
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 34, C.white);
      txt('BEST ' + (game.best > 0 ? 'T' + game.best : '-'), W / 2, H * 0.1, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 40, ok ? C.good : C.bad);
      txt('T' + maxTier + ' / ' + 'T' + TARGET_TIER, W / 2, H * 0.1, 26, C.gold);
      if (!ok) txt('あと1段!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(maxTier, { maxTier: maxTier, target: TARGET_TIER });
        else game.end.failure({ maxTier: maxTier, target: TARGET_TIER });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene();

    txt('T' + maxTier + ' / ' + 'T' + TARGET_TIER, W / 2, H * 0.04, 24, C.white);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 92, W - 120, 14, '#00000055', 1);
    game.draw.rect(60, 92, (W - 120) * barPct, 14, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.3], ['G3', 0.3], ['C4', 0.6]], { tempo: 104, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
