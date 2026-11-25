// GH-PS-0113-tag-chase.js
// タグチェイス — 鬼ごっこ。触られる前に逃げる。決まった場所(安全マット)なら捕まらない(2人)
// 操作: 左半分をP1(逃げる側)、右半分をP2(追う側)が指で押さえたままドラッグで自分のコマを操作
// 終わり: 捕まえた/逃げ切った + 何秒だったか
// @mechanic: duel_2p
// @theme: schoolyard_tag
// 世界観: 校庭の鬼ごっこ。安全マットの上に乗っていれば捕まらない。制限時間まで逃げ切れば勝ち
// 残るもの: P1/P2 どちらが勝ったか(ラベル) + 経過秒数(SCORE)
// スタイル: 8bit HANDHELD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit HANDHELD: 4階調(黄緑寄り)、残像・低コントラスト・画面枠
  var C = {
    bg0: '#0f1a10', bg1: '#294a2a', bg2: '#4a7a3a', bg3: '#8ac878',
    runner: '#0f1a10', oni: '#0f1a10', safe: '#8ac878', frame: '#0f1a10', accent: '#ffb04a',
  };

  var GAME_TITLE = 'TAG CHASE';
  var ROUND_TIME = 18;
  var FIELD_Y0 = H * 0.18, FIELD_Y1 = H * 0.86;
  var CATCH_R = 60, AVATAR_R = 34, STICK_MAX = 130, SPEED = 560;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var winner = '', elapsedRound = 0;

  var runnerX, runnerY, oniX, oniY, done, endWait, caught;
  var ready, hitStop, shake;
  var stick1, stick2;
  var SAFE_ZONES = [
    { x: W * 0.5, y: FIELD_Y0 + (FIELD_Y1 - FIELD_Y0) * 0.20, r: 90 },
    { x: W * 0.22, y: FIELD_Y0 + (FIELD_Y1 - FIELD_Y0) * 0.55, r: 80 },
    { x: W * 0.78, y: FIELD_Y0 + (FIELD_Y1 - FIELD_Y0) * 0.55, r: 80 },
    { x: W * 0.5, y: FIELD_Y0 + (FIELD_Y1 - FIELD_Y0) * 0.86, r: 90 },
  ];

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.bg0, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER_SPRITE = ['.#.', '###', '.#.', '#.#'];
  var RUNNER_PAL = { '#': C.bg3 };
  var ONI_SPRITE = ['##.', '###', '.#.', '#.#'];
  var ONI_PAL = { '#': C.bg0 };

  function fieldBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg1]]);
    game.draw.rect(0, 0, W, FIELD_Y0, C.bg0, 0.85);
    game.draw.rect(0, FIELD_Y1, W, H - FIELD_Y1, C.bg0, 0.85);
    game.draw.rect(0, FIELD_Y0, W, FIELD_Y1 - FIELD_Y0, C.bg2, 0.5);
    // 画面枠(8bit HANDHELD の残像感)
    for (var gx = 0; gx < W; gx += 60) game.draw.rect(gx, FIELD_Y0, 2, FIELD_Y1 - FIELD_Y0, C.bg1, 0.3);
    for (var gy = FIELD_Y0; gy < FIELD_Y1; gy += 60) game.draw.rect(0, gy, W, 2, C.bg1, 0.3);
    for (var i = 0; i < SAFE_ZONES.length; i++) {
      var z = SAFE_ZONES[i];
      game.draw.circle(z.x, z.y, z.r, C.safe, 0.8);
      game.draw.circle(z.x, z.y, z.r, C.bg0, 0.0);
      game.draw.circle(z.x, z.y, z.r - 10, C.bg2, 0.4);
    }
    game.draw.rect(0, FIELD_Y0 - 6, W, 6, C.frame);
    game.draw.rect(0, FIELD_Y1, W, 6, C.frame);
  }

  function inSafeZone(x, y) {
    for (var i = 0; i < SAFE_ZONES.length; i++) {
      var z = SAFE_ZONES[i];
      if (Math.hypot(x - z.x, y - z.y) < z.r) return true;
    }
    return false;
  }

  function initGame() {
    runnerX = W * 0.30; runnerY = FIELD_Y0 + (FIELD_Y1 - FIELD_Y0) * 0.3;
    oniX = W * 0.70; oniY = FIELD_Y1 - (FIELD_Y1 - FIELD_Y0) * 0.3;
    done = false; endWait = 0; caught = false; elapsedRound = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    stick1 = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    stick2 = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  }

  function onDown(x, y, id) {
    if (state !== S.PLAYING || done) return;
    if (x < W / 2 && !stick1.active) { stick1.active = true; stick1.id = id; stick1.ox = x; stick1.oy = y; stick1.dx = 0; stick1.dy = 0; }
    else if (x >= W / 2 && !stick2.active) { stick2.active = true; stick2.id = id; stick2.ox = x; stick2.oy = y; stick2.dx = 0; stick2.dy = 0; }
  }
  function onMove2(x, y, id) {
    if (stick1.active && stick1.id === id) {
      var dx1 = x - stick1.ox, dy1 = y - stick1.oy, len1 = Math.hypot(dx1, dy1);
      if (len1 > STICK_MAX) { dx1 = dx1 / len1 * STICK_MAX; dy1 = dy1 / len1 * STICK_MAX; }
      stick1.dx = dx1; stick1.dy = dy1;
      if (Math.random() < 0.04) game.audio.play('se_tap', 0.04);
    } else if (stick2.active && stick2.id === id) {
      var dx2 = x - stick2.ox, dy2 = y - stick2.oy, len2 = Math.hypot(dx2, dy2);
      if (len2 > STICK_MAX) { dx2 = dx2 / len2 * STICK_MAX; dy2 = dy2 / len2 * STICK_MAX; }
      stick2.dx = dx2; stick2.dy = dy2;
      if (Math.random() < 0.04) game.audio.play('se_tap', 0.04);
    }
  }
  function onUp(x, y, id) {
    if (stick1.active && stick1.id === id) { stick1.active = false; stick1.dx = 0; stick1.dy = 0; }
    if (stick2.active && stick2.id === id) { stick2.active = false; stick2.dx = 0; stick2.dy = 0; }
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });
  game.onPress(function(x, y, id) { game.audio.play('se_tap', 0.08); onDown(x, y, id); });
  game.onMove(onMove2);
  game.onRelease(function(x, y, id) { game.audio.play('se_tap', 0.05); onUp(x, y, id); });

  function resolveEnd(w) {
    if (caught) return;
    caught = true;
    winner = w;
    elapsedRound = Math.round(elapsedRound * 10) / 10;
    if (w === 'P1') { game.feedback.good(runnerX, runnerY, { text: 'SAFE', color: C.bg3 }); game.fx.burst(runnerX, runnerY, { color: C.bg3, count: 14, speed: 340 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(runnerX, runnerY, { text: 'CAUGHT' }); game.fx.burst(runnerX, runnerY, { color: C.bg0, count: 14, speed: 340 }); shake = 0.25; game.audio.play('se_failure', 0.5); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.4;
  }

  // ── ATTRACT ゴースト実演: 追う側の指と逃げる側の指が左右で動く ──
  var demoT = 0;
  function stepDemo(dt) {
    demoT += dt;
    var cyc = demoT % 4;
    runnerX = W * 0.30 + Math.sin(cyc * 1.6) * 80;
    runnerY = FIELD_Y0 + (FIELD_Y1 - FIELD_Y0) * (0.3 + Math.sin(cyc * 1.1) * 0.12);
    oniX = W * 0.70 + Math.cos(cyc * 1.4) * 70;
    oniY = FIELD_Y1 - (FIELD_Y1 - FIELD_Y0) * (0.3 + Math.cos(cyc * 1.2) * 0.12);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (runnerX === undefined) initGame();
      fieldBg();
      stepDemo(dt);
      game.draw.sprite(RUNNER_SPRITE, RUNNER_PAL, runnerX, runnerY, 14, { anchor: 'center' });
      game.draw.sprite(ONI_SPRITE, ONI_PAL, oniX, oniY, 14, { anchor: 'center' });
      game.draw.hand(W * 0.22, FIELD_Y1 + 50, { press: Math.floor(game.time.elapsed * 3) % 2 === 0, scale: 14 });
      game.draw.hand(W * 0.78, FIELD_Y0 - 50, { press: Math.floor(game.time.elapsed * 3) % 2 === 1, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.075, 56, C.bg3);
      txt('P1 にげる', W * 0.5, H * 0.125, 28, C.bg3);
      txt('P2 おう', W * 0.5, H * 0.885, 28, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 44, C.bg3);
        txt('TAP TO START', W / 2, H * 0.98, 32, C.bg3);
      } else {
        txt('INSERT COIN', W / 2, H * 0.98, 30, C.bg3);
      }
      return;
    }

    if (state === S.RESULT) {
      fieldBg();
      game.draw.sprite(RUNNER_SPRITE, RUNNER_PAL, runnerX, runnerY, 16, { anchor: 'center' });
      game.draw.sprite(ONI_SPRITE, ONI_PAL, oniX, oniY, 16, { anchor: 'center' });
      var loser = winner === 'P1' ? 'P2' : 'P1';
      txt(winner + ' WIN', W / 2, H * 0.08, 66, winner === 'P1' ? C.bg3 : C.accent);
      txt(loser + ' LOSE', W / 2, H * 0.13, 30, C.accent);
      txt(elapsedRound.toFixed(1) + 's', W / 2, H * 0.90, 44, C.bg3);
      var best = Math.max(game.best, elapsedRound);
      txt('BEST ' + best.toFixed(1) + 's', W / 2, H * 0.95, 32, C.bg3);
      if (elapsedRound > game.best && game.best > 0) txt('NEW RECORD', W / 2, H * 0.99, 28, C.bg3);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(elapsedRound, { label: winner + ' WIN' }); }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!caught) {
      elapsedRound += dt;
      var len1b = Math.hypot(stick1.dx, stick1.dy);
      if (len1b > 8) { runnerX += (stick1.dx / len1b) * SPEED * dt; runnerY += (stick1.dy / len1b) * SPEED * dt; }
      var len2b = Math.hypot(stick2.dx, stick2.dy);
      if (len2b > 8) { oniX += (stick2.dx / len2b) * SPEED * dt; oniY += (stick2.dy / len2b) * SPEED * dt; }
      runnerX = Math.max(AVATAR_R, Math.min(W - AVATAR_R, runnerX));
      runnerY = Math.max(FIELD_Y0 + AVATAR_R, Math.min(FIELD_Y1 - AVATAR_R, runnerY));
      oniX = Math.max(AVATAR_R, Math.min(W - AVATAR_R, oniX));
      oniY = Math.max(FIELD_Y0 + AVATAR_R, Math.min(FIELD_Y1 - AVATAR_R, oniY));
      var dist = Math.hypot(runnerX - oniX, runnerY - oniY);
      if (dist < CATCH_R && !inSafeZone(runnerX, runnerY)) resolveEnd('P2');
      else if (elapsedRound >= ROUND_TIME) resolveEnd('P1');
      else if (Math.floor(elapsedRound) > Math.floor(elapsedRound - dt) && Math.floor(elapsedRound) % 5 === 0) game.fx.popup(Math.floor(elapsedRound) + 's', W / 2, H * 0.30, { color: C.bg3, size: 48 });
    }
    if (shake > 0) shake -= dt;

    fieldBg();
    game.draw.sprite(RUNNER_SPRITE, RUNNER_PAL, runnerX, runnerY, 16, { anchor: 'center' });
    game.draw.sprite(ONI_SPRITE, ONI_PAL, oniX, oniY, 16, { anchor: 'center' });
    if (inSafeZone(runnerX, runnerY) && !caught) game.draw.circle(runnerX, runnerY, AVATAR_R + 14, C.bg3, 0.4);

    txt(Math.floor(ROUND_TIME - elapsedRound) + ' / ' + ROUND_TIME + 's', W / 2, H * 0.11, 40, C.bg3);
    txt('P1', W * 0.20, H * 0.94, 32, C.bg3);
    txt('P2', W * 0.80, H * 0.94, 32, C.accent);
    game.draw.circle(runnerX, runnerY, STICK_MAX, C.bg3, stick1.active ? 0.06 : 0);
    // 両手の位置(multi-touch 可視化)
    var liveTouches = game.touches;
    for (var lt = 0; lt < liveTouches.length; lt++) game.draw.circle(liveTouches[lt].x, liveTouches[lt].y, 50, C.bg3, 0.15);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 84, C.bg3);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
