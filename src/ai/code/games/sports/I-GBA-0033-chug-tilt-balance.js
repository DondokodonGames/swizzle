// I-GBA-0033-chug-tilt-balance.js
// チャグ・チルト — 大ジョッキの傾け具合を左右タップで保ち、こぼさず一気飲みを完走する
// 操作: ジョッキが傾きすぎたら逆側をタップして戻す。中央の安全帯を保てば飲み進む
// 終わり: 飲み干しゲージが満タンになれば成功。傾けすぎてこぼすか制限時間切れで失敗
// @mechanic: balance
// @theme: festival_chug_contest
// 世界観: 収穫祭の一気飲み大会。丸っこい参加者マスコットが、大ジョッキの傾きを保ってこぼさず飲み干す
// 残るもの: 正誤(CLEAR/GAME OVER) + 飲み干しゲージ%
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s ARCADE POP: 原色+白縁、明るい背景、光の柱と祝祭演出
  var C = {
    bg: '#fff2cc', bg2: '#ffd94a', banner: '#ff5d3a', mug: '#f7d774', mugDark: '#c9a13a',
    liquid: '#ffb020', liquidDeep: '#d97e00',
    blob: '#ff8fb0', blobDark: '#c85f82', outline: '#2c1a10',
    good: '#2fb857', bad: '#ff3b3b', gold: '#ffdd33', white: '#2c1a10', ink: '#ffffff',
  };

  var GAME_TITLE = 'CHUG TILT';
  var TIME_LIMIT = 17;
  var SAFE = 35, WARN = 65, SPILL = 82;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var balance, vel, fill, timeLeft, gustTimer, inDanger, milestoneShown;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000030', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BLOB_A = ['.##.', '####', '.##.', '#..#'];
  var BLOB_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) {
      game.draw.rect(W * (0.05 + i * 0.22), 0, 20, H * 0.2, C.banner, 0.35);
    }
  }

  function initGame() {
    balance = 0; vel = 0; fill = 0; timeLeft = TIME_LIMIT; gustTimer = 0.9;
    inDanger = false; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function spill() {
    hitStop = 0.35;
    ok = false; finished = true;
    game.feedback.bad(W / 2, H * 0.42, { text: 'MISS' });
    shake = 0.3;
    finish();
  }

  function resolveTap(x, y) {
    if (state !== S.PLAYING || finished || ready > 0 || hitStop > 0) return;
    var pushDir = x < W * 0.5 ? -1 : 1;
    vel += pushDir * 60;
    var towardCenter = (balance > 6 && pushDir < 0) || (balance < -6 && pushDir > 0) || Math.abs(balance) < 6;
    if (towardCenter) {
      game.feedback.good(x, H * 0.42, { text: 'GOOD', color: C.good, size: 26 });
    } else {
      game.feedback.bad(x, H * 0.42, { text: 'MISS', size: 26 });
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    resolveTap(x, y);
  });

  function drawScene(bx, danger) {
    var mugX = W * 0.5, mugY = H * 0.42, mugW = 220, mugH = 260;
    game.draw.rect(mugX - mugW / 2 - 8, mugY - mugH / 2 - 8, mugW + 16, mugH + 16, C.mugDark);
    game.draw.rect(mugX - mugW / 2, mugY - mugH / 2, mugW, mugH, C.mug, 0.9);
    var tiltRad = (bx / 100) * 0.5;
    var fillH = mugH * Math.min(1, 0.15 + fill / 130);
    var cy = mugY + mugH / 2 - fillH;
    var lx1 = mugX - mugW / 2 + 10, lx2 = mugX + mugW / 2 - 10;
    var ly1 = cy - Math.sin(tiltRad) * 60, ly2 = cy + Math.sin(tiltRad) * 60;
    game.draw.rect(mugX - mugW / 2 + 10, mugY + mugH / 2 - fillH, mugW - 20, fillH, danger ? C.bad : C.liquidDeep, 0.9);
    game.draw.line(lx1, ly1, lx2, ly2, danger ? C.bad : C.liquid, 10);
    game.draw.circle(mugX + (bx / 100) * (mugW / 2 - 20), mugY - mugH / 2 + 6, 10, C.ink, 0.6);
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? BLOB_A : BLOB_B, { '#': C.blob }, mugX + bx * 1.2, H * 0.78, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { balance = -50; vel = 0; fill = 0; }
    if (cyc < 2.2) {
      // 成功例: 傾きすぎたら逆をタップして中央へ戻す
      var target = -50 + (cyc / 2.2) * 50;
      var dir = balance < target ? 1 : -1;
      vel += dir * 70 * dt * 6;
      demo.gx = dir > 0 ? W * 0.75 : W * 0.25; demo.gy = H * 0.6; demo.press = true;
      fill = Math.min(100, fill + 40 * dt);
    } else {
      // 危険例: 補正を怠って傾きすぎ、こぼれる寸前まで見せる
      vel += 90 * dt * 3;
      demo.gx = W * 0.5; demo.gy = H * 0.9; demo.press = false;
    }
    balance += vel * dt; vel *= 0.9;
    balance = Math.max(-100, Math.min(100, balance));
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(balance, Math.abs(balance) > WARN);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.12, 22, C.banner);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.banner);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawScene(balance, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      var pct = Math.round(fill);
      txt(pct + ' / 100', W / 2, H * 0.13, 28, C.banner);
      if (!ok) txt('あと' + Math.max(1, 100 - pct) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round(fill);
        if (ok) game.end.success(pct2, { fill: pct2 }); else game.end.failure({ fill: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      gustTimer -= dt;
      if (gustTimer <= 0) {
        var pressure = 1 + (TIME_LIMIT - timeLeft) / TIME_LIMIT * 0.7;
        vel += (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30) * pressure;
        gustTimer = Math.max(0.55, 1.1 - (TIME_LIMIT - timeLeft) * 0.03);
      }
      balance += vel * dt; vel *= 0.92;
      balance = Math.max(-100, Math.min(100, balance));
      var absB = Math.abs(balance);
      if (absB <= SAFE) fill += 24 * dt;
      if (!milestoneShown && fill >= 50) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', W / 2, H * 0.28, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.5);
      }
      if (absB > WARN && absB < SPILL && !inDanger) {
        inDanger = true;
        game.audio.tone(700, 0.12, { wave: 'square', volume: 0.15 });
      } else if (absB <= WARN) inDanger = false;
      if (absB >= SPILL) { spill(); }
      else if (fill >= 100) { ok = true; finished = true; finish(); }
      else {
        timeLeft -= dt;
        if (timeLeft <= 0) { ok = false; finished = true; finish(); }
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(balance, Math.abs(balance) > WARN);

    txt(Math.round(fill) + ' / 100', W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 14, '#00000020', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, inDanger ? C.bad : C.banner);
    // 安全帯メーター
    game.draw.rect(W * 0.5 - 160, H * 0.9, 320, 22, '#00000020', 1);
    game.draw.rect(W * 0.5 - 160 + (320 * (100 + (0 - SAFE)) / 200), H * 0.9, 320 * (SAFE * 2 / 200), 22, C.good, 0.6);
    game.draw.circle(W * 0.5 + (balance / 100) * 160, H * 0.9 + 11, 12, inDanger ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.62, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['F#4', 0.25], ['A4', 0.25], ['D5', 0.5]], { tempo: 140, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
