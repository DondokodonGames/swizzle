// K-DS-0005-gallery-pop-shot.js
// ギャラリーポップショット — 射的の的が現れる順番とタイミングに合わせて撃ち抜く
// 操作: 柵の後ろからひょっこり現れる的が出ている間にタップして撃つ
// 終わり: 規定数(8体)を撃ち抜けば成功。3回外せば失敗
// @mechanic: aim_shoot
// @theme: carnival_shooting_gallery
// 世界観: 縁日の射的屋台。柵の後ろから順番にひょっこり顔を出す的を、出ている一瞬だけ狙って撃ち抜く
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃ち抜いた数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドットに柔らかいライティング
  var C = {
    bg: '#3a5a3a', bg2: '#274027', fence: '#8a6a3a', fenceDark: '#5a4222',
    target: '#e8c060', targetDark: '#a67a2a', targetHit: '#ff5a5a',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f5f5f5', ink: '#0a0e08',
  };

  var GAME_TITLE = 'GALLERY SHOT';
  var TOTAL = 8;
  var MISS_LIMIT = 3;
  var LANES = 5;
  var ROW_Y = H * 0.44;
  var FENCE_Y = H * 0.56;
  var HIT_R = 78;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TARGET_SPRITE = ['.####.', '######', '.####.', '.#..#.'];

  function laneX(i) { return W * (0.14 + i * (0.72 / (LANES - 1))); }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < LANES; i++) game.draw.rect(laneX(i) - 60, ROW_Y - 20, 120, 200, '#00000012');
    game.draw.rect(0, FENCE_Y, W, 40, C.fenceDark);
    game.draw.rect(0, FENCE_Y, W, 24, C.fence);
  }

  var round, hits, misses, lane, prevLane, popT, visT, dur, resolved, done, endWait, finished, ready, hitStop, shake, flashPos;

  function initGame() {
    round = 0; hits = 0; misses = 0; lane = -1; prevLane = -1;
    popT = 0; visT = 0; dur = 0.85; resolved = true;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashPos = null;
    spawnGap = 0.3;
  }
  var spawnGap = 0.3;

  function pickLane() {
    var l;
    do { l = Math.floor(Math.random() * LANES); } while (l === prevLane && LANES > 1);
    prevLane = l;
    return l;
  }

  function spawnTarget() {
    lane = pickLane();
    popT = 0.2; visT = 0; resolved = false;
    dur = Math.max(0.5, 0.85 - round * 0.03);
  }

  function riseP() { return popT > 0 ? 1 - popT / 0.2 : 1; }

  function targetY() { return ROW_Y + (1 - riseP()) * 160; }

  function resolveHit(x, y) {
    if (ready > 0 || done || finished || hitStop > 0 || resolved || popT > 0) return;
    var tx = laneX(lane), ty = targetY();
    if (game.hit.circle(x, y, 1, tx, ty, HIT_R)) {
      resolved = true; hits++;
      hitStop = 0.1;
      flashPos = { x: tx, y: ty, ok: true, t: 0.16 };
      game.feedback.good(tx, ty, { text: 'HIT' });
      game.audio.play('se_good', 0.35);
      if (hits === Math.floor(TOTAL / 2)) { game.fx.popup(hits + ' / ' + TOTAL, W / 2, ROW_Y - 220, { color: C.gold, size: 36 }); game.audio.play('se_milestone', 0.3); }
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
      lane = -1; spawnGap = 0.22;
    } else {
      resolved = true; misses++;
      hitStop = 0.28; shake = 0.2;
      flashPos = { x: x, y: y, ok: false, t: 0.2 };
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      lane = -1; spawnGap = 0.22;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) resolveHit(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.2;
  }

  function stepRound(dt) {
    if (lane < 0) {
      spawnGap -= dt;
      if (spawnGap <= 0) spawnTarget();
      return;
    }
    if (popT > 0) { popT -= dt; return; }
    visT += dt;
    if (visT >= dur && !resolved) {
      resolved = true; misses++;
      hitStop = 0.28; shake = 0.2;
      var tx = laneX(lane), ty = targetY();
      flashPos = { x: tx, y: ty, ok: false, t: 0.2 };
      game.feedback.bad(tx, ty, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
      lane = -1; spawnGap = 0.22;
    }
  }

  var demo = { t: 0, gx: W / 2, gy: ROW_Y, press: false, lane: -1, popT: 0, visT: 0, dur: 0.85, gap: 0.3, resolved: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { demo.lane = -1; demo.gap = 0.3; }
    demo.press = false;
    if (demo.lane < 0) {
      demo.gap -= dt;
      if (demo.gap <= 0) { demo.lane = pickLane(); demo.popT = 0.2; demo.visT = 0; demo.resolved = false; }
    } else if (demo.popT > 0) {
      demo.popT -= dt;
    } else {
      demo.visT += dt;
      if (!demo.resolved && demo.visT > 0.25) {
        demo.resolved = true; demo.press = true;
        demo.gx = laneX(demo.lane); demo.gy = ROW_Y;
        game.feedback.good(demo.gx, demo.gy, { text: 'HIT' });
        game.audio.play('se_good', 0.2);
        demo.lane = -1; demo.gap = 0.35;
      }
    }
    lane = demo.lane; popT = demo.popT; visT = demo.visT; dur = 0.85;
  }

  function drawTarget() {
    if (lane < 0) return;
    var tx = laneX(lane), ty = targetY();
    game.draw.sprite(TARGET_SPRITE, { '#': C.target }, tx, ty, 18, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawTarget();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - hits <= 3) txt('あと' + (TOTAL - hits) + '体!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, total: TOTAL, misses: misses });
        else game.end.failure({ hits: hits, total: TOTAL, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashPos) { flashPos.t -= dt; if (flashPos.t <= 0) flashPos = null; }
    if (shake > 0) shake -= dt;

    bg();
    drawTarget();
    if (flashPos) game.draw.circle(flashPos.x, flashPos.y, 55, flashPos.ok ? C.good : C.bad, 0.35);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (hits / TOTAL), 16, C.gold);
    for (var m = 0; m < MISS_LIMIT; m++) {
      game.draw.circle(W - 60 - m * 34, 190, 10, m < misses ? C.bad : '#ffffff30');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.4]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
