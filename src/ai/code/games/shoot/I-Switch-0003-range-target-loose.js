// I-Switch-0003-range-target-loose.js
// レンジターゲット — 左右に動く的へ狙いを定め、ボタンで矢を放つ
// 操作: 動く的の中心に照準を重ねてタップし、矢を放つ
// 終わり: 規定本数(5本)命中させれば成功。3回外せば失敗
// @mechanic: aim_shoot
// @theme: archery_range_gallery
// 世界観: 屋外の射的場。左右に揺れ動く的を見切り、狙いを合わせて矢を放つ射手
// 残るもの: 正誤(CLEAR/GAME OVER) + 命中数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 淡いアイソメ風パステル×濃紺、幾何学的な輪郭線
  var C = {
    bg: '#1a1442', bg2: '#2a2266', ground: '#3a3080', groundLine: '#5648b0',
    target: '#ffd040', targetRing: '#e04858', bull: '#ffffff',
    arrow: '#40e0d0', archer: '#ff8060', archerAccent: '#ffe0a0',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0eaff', ink: '#100a2a',
  };

  var GAME_TITLE = 'RANGE TARGET';
  var TOTAL = 5;
  var MISS_LIMIT = 3;
  var ARCHER_X = W * 0.5, ARCHER_Y = H * 0.82, TARGET_Y = H * 0.32;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var hits, misses, done, endWait, finished;
  var ready, hitStop, shake;
  var round, targetX, targetDir, targetSpeed, arrow, combo;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ARCHER_SPRITE = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.ground);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * 0.62 + i * 40, W, H * 0.62 + i * 40, C.groundLine, 2);
  }

  function newRound(r) {
    targetX = W * 0.5;
    targetDir = Math.random() < 0.5 ? 1 : -1;
    targetSpeed = 220 + r * 30;
  }

  function initGame() {
    hits = 0; misses = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; combo = 0; arrow = null;
    newRound(0);
  }

  function fireArrow(tapX, tapY) {
    if (state !== S.PLAYING || ready > 0 || finished || arrow) return;
    var dist = Math.abs(tapX - targetX);
    var hit = dist <= 90;
    arrow = { x: tapX, y: ARCHER_Y - 40, tx: targetX, ty: TARGET_Y, t: 0, hit: hit };
    game.audio.play('se_tap', 0.1);
  }

  function resolveArrow() {
    var hit = arrow.hit;
    if (hit) {
      hits++; combo++;
      hitStop = 0.1;
      game.feedback.good(targetX, TARGET_Y, { text: combo >= 2 ? 'COMBO x' + combo : 'HIT', color: C.good });
      game.fx.burst(targetX, TARGET_Y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_good', 0.4);
      if (hits === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 40 });
      if (hits >= TOTAL) { ok = true; finished = true; finish(); return; }
    } else {
      misses++; combo = 0;
      hitStop = 0.2;
      game.feedback.bad(targetX, TARGET_Y, { text: 'MISS' });
      shake = 0.2;
      game.audio.play('se_bad', 0.35);
      if (misses >= MISS_LIMIT) { ok = false; finished = true; finish(); return; }
    }
    round++;
    newRound(round);
    arrow = null;
    ready = 0.1;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) fireArrow(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawTarget() {
    game.draw.circle(targetX, TARGET_Y, 90, C.targetRing);
    game.draw.circle(targetX, TARGET_Y, 60, C.target);
    game.draw.circle(targetX, TARGET_Y, 26, C.bull);
  }

  function drawArcher() {
    game.draw.sprite(ARCHER_SPRITE, { '#': C.archer }, ARCHER_X, ARCHER_Y, 22, { anchor: 'center' });
    game.draw.circle(ARCHER_X + 20, ARCHER_Y - 60, 8, C.archerAccent);
  }

  function drawArrow(a) {
    if (!a) return;
    var p = Math.min(1, a.t / 0.28);
    var x = a.x + (a.tx - a.x) * p;
    var y = a.y + (a.ty - a.y) * p;
    game.draw.line(x, y + 30, x, y - 10, C.arrow, 8);
  }

  var demo = { t: 0, gx: W * 0.5, gy: ARCHER_Y - 40, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.4;
    if (cyc < dt || demo.t <= dt) { round = 0; newRound(0); combo = 0; arrow = null; }
    if (!arrow) {
      targetX += targetDir * targetSpeed * dt;
      if (targetX > W * 0.78) { targetX = W * 0.78; targetDir = -1; }
      if (targetX < W * 0.22) { targetX = W * 0.22; targetDir = 1; }
      demo.gx = targetX;
      if (cyc > 1.1 && cyc < 1.3) {
        demo.press = true;
        arrow = { x: targetX, y: ARCHER_Y - 40, tx: targetX, ty: TARGET_Y, t: 0, hit: true };
        game.feedback.good(targetX, TARGET_Y, { text: 'HIT', color: C.good });
        game.audio.play('se_good', 0.2);
      }
    } else {
      arrow.t += dt;
      demo.press = arrow.t < 0.28;
      if (arrow.t >= 0.28) { arrow = null; round = 0; newRound(0); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawTarget();
      drawArcher();
      drawArrow(arrow);
      game.draw.hand(demo.gx, ARCHER_Y - 40, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTarget();
      drawArcher();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(hits + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - hits) + '本!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hits, { hits: hits, misses: misses, total: TOTAL });
        else game.end.failure({ hits: hits, misses: misses, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (arrow) {
        arrow.t += dt;
        if (arrow.t >= 0.28) resolveArrow();
      } else {
        targetX += targetDir * targetSpeed * dt;
        if (targetX > W * 0.78) { targetX = W * 0.78; targetDir = -1; }
        if (targetX < W * 0.22) { targetX = W * 0.22; targetDir = 1; }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTarget();
    drawArcher();
    if (!finished) drawArrow(arrow);

    txt(hits + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    txt('MISS ' + misses + '/' + MISS_LIMIT, W / 2, H * 0.14, 22, C.bad);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 132, wave: 'triangle', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
