// I-Switch-0004-chasm-hook-swing.js
// チャズムフック — 遠い足場へ指を引いて放ち、フックを引っ掛けて体を引き寄せる
// 操作: 画面を狙う方向に指で引いてから離す(パチンコ動作)。フックが足場に届けば自動で引き寄せられる
// 終わり: 規定回数(3回)すべて足場へ届かせれば成功。届かず谷へ落ちれば失敗
// @mechanic: slingshot
// @theme: canyon_ledge_hookline
// 世界観: 切り立った峡谷を渡る旅人。腕を伸ばして遠い足場にフックを引っ掛け、体を引き寄せながら渡っていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 渡り切った足場数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭線+平坦な陰影2段、彩度高め
  var C = {
    sky: '#8fd0f0', sky2: '#dff4ff', cliffFar: '#6a9878', cliffNear: '#3a6048',
    rock: '#a08060', rockDark: '#6a5038', rope: '#e8c060', hook: '#c0c0c8',
    traveler: '#e06840', travelerAccent: '#ffe0a0',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#101418',
  };

  var GAME_TITLE = 'CHASM HOOK';
  var TOTAL = 3;
  var PLAYER_X = W * 0.28, PLAYER_Y = H * 0.62;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var crossed, done, endWait, finished;
  var ready, hitStop, shake;
  var round, ledgeX, ledgeY, ledgeR, drift, aiming, dragX, dragY, hook, swinging;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var TRAVELER_SPRITE = ['.##.', '####', '.##.', '#..#'];

  function bg() {
    game.draw.gradient(0, H * 0.6, [[0, C.sky2], [1, C.sky]]);
    game.draw.rect(0, H * 0.55, W, H * 0.1, C.cliffFar);
    game.draw.rect(0, H * 0.6, W * 0.32, H * 0.4, C.rock);
    game.draw.rect(0, H * 0.6, W * 0.32, 10, C.rockDark);
    game.draw.rect(0, H * 0.6, 10, H * 0.4, C.rockDark);
  }

  function newLedge(r) {
    ledgeX = W * (0.62 + Math.min(0.16, r * 0.05));
    ledgeY = H * (0.5 - Math.min(0.1, r * 0.03));
    ledgeR = 70;
    drift = 30 + r * 14;
  }

  function initGame() {
    crossed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; aiming = false; hook = null; swinging = false;
    newLedge(0);
  }

  function beginAim(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished || hook) return;
    aiming = true; dragX = x; dragY = y;
    game.audio.play('se_tap', 0.06);
  }

  function updateAim(x, y) {
    if (!aiming) return;
    dragX = x; dragY = y;
  }

  function releaseAim() {
    if (!aiming) return;
    aiming = false;
    var dx = PLAYER_X - dragX, dy = PLAYER_Y - dragY;
    var len = Math.max(1, Math.hypot(dx, dy));
    var dirX = dx / len, dirY = dy / len;
    var pull = Math.min(1, len / 260);
    hook = { x: PLAYER_X, y: PLAYER_Y, vx: dirX * 1600 * pull, vy: dirY * 1600 * pull, t: 0 };
    game.audio.play('se_tap', 0.08);
  }

  function resolveArrival(success) {
    if (success) {
      crossed++;
      swinging = true;
      hitStop = 0.08;
      game.feedback.good(ledgeX, ledgeY, { text: 'HOOKED', color: C.good });
      game.fx.burst(ledgeX, ledgeY, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_good', 0.4);
      if (crossed === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 40 });
      if (crossed >= TOTAL) { ok = true; finished = true; finish(); return; }
    } else {
      hitStop = 0.35;
      game.feedback.bad(PLAYER_X, PLAYER_Y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish(); return;
    }
    round++;
    newLedge(round);
    hook = null;
    ready = 0.35;
    swinging = false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { beginAim(x, y); });
  game.onMove(function(x, y) { updateAim(x, y); if (aiming) game.fx.burst(x, y, { color: C.rope, count: 1, speed: 30 }); });
  game.onRelease(function() { releaseAim(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawLedge() {
    // telegraph: 足場がわずかに上下に揺れる予告
    var wob = Math.sin(game.time.elapsed * 2) * drift * 0.3;
    game.draw.circle(ledgeX, ledgeY + wob, ledgeR + 10, C.rockDark);
    game.draw.circle(ledgeX, ledgeY + wob, ledgeR, C.rock);
  }

  function drawAimLine() {
    if (!aiming) return;
    game.draw.line(PLAYER_X, PLAYER_Y, dragX, dragY, C.rope, 8);
    game.draw.circle(dragX, dragY, 16, C.hook);
  }

  function drawHook() {
    if (!hook) return;
    game.draw.line(PLAYER_X, PLAYER_Y, hook.x, hook.y, C.rope, 8);
    game.draw.circle(hook.x, hook.y, 18, C.hook);
  }

  function drawTraveler() {
    game.draw.sprite(TRAVELER_SPRITE, { '#': C.traveler }, PLAYER_X, PLAYER_Y, 22, { anchor: 'center' });
    game.draw.circle(PLAYER_X - 18, PLAYER_Y - 60, 8, C.travelerAccent);
  }

  var demo = { t: 0, gx: PLAYER_X, gy: PLAYER_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) { round = 0; newLedge(0); hook = null; }
    if (!hook) {
      if (cyc < 0.6) {
        var p2 = cyc / 0.6;
        demo.gx = PLAYER_X + (ledgeX - PLAYER_X) * -0.3 * p2;
        demo.gy = PLAYER_Y + (ledgeY - PLAYER_Y) * -0.3 * p2;
        demo.press = true;
      } else if (cyc < 0.7) {
        var dx = PLAYER_X - demo.gx, dy = PLAYER_Y - demo.gy;
        var len = Math.max(1, Math.hypot(dx, dy));
        hook = { x: PLAYER_X, y: PLAYER_Y, vx: (dx / len) * 1600, vy: (dy / len) * 1600, t: 0 };
        demo.press = false;
      }
    } else {
      hook.t += dt;
      hook.x += hook.vx * dt; hook.y += hook.vy * dt;
      if (Math.hypot(hook.x - ledgeX, hook.y - ledgeY) < ledgeR) {
        hook = null; round = 0; newLedge(0);
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawLedge();
      drawHook();
      drawTraveler();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawLedge();
      drawTraveler();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(crossed + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - crossed) + '本!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(crossed, { crossed: crossed, total: TOTAL });
        else game.end.failure({ crossed: crossed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished && hook) {
      hook.t += dt;
      hook.x += hook.vx * dt; hook.y += hook.vy * dt;
      if (Math.hypot(hook.x - ledgeX, hook.y - ledgeY) < ledgeR) {
        resolveArrival(true);
      } else if (hook.x < -80 || hook.x > W + 80 || hook.y < -80 || hook.y > H + 80 || hook.t > 0.7) {
        resolveArrival(false);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawLedge();
    if (aiming) drawAimLine();
    if (hook) drawHook();
    drawTraveler();

    txt(crossed + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (crossed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.30, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.4], ['F4', 0.4], ['A4', 0.4], ['D5', 0.8]], { tempo: 120, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
