// I-GBA-0062-reel-exact-wind.js
// ぴったりリール巻き — 針にかかった大物を、規定回数ぴったりクランクを回して引き寄せる
// 操作: リールのハンドルをタップして巻く。指定回数ちょうどで止める(多すぎても少なすぎても糸が切れる)
// 終わり: ちょうどの回数で止められれば成功。回数を外せば失敗
// @mechanic: count_exact
// @theme: reel_exact_wind
// 世界観: 桟橋の一本釣り。大物がかかった竿のリールを、糸が切れないよう指示された回数だけぴったり巻き上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + 巻いた回数
// スタイル: 90s BIG SPRITE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s BIG SPRITE: 巨大キャラ、床影、間合いで見せる
  var C = {
    bg: '#1a4a6a', bg2: '#0d2c40', water: '#2a6a8a', dock: '#8a6440', dockDark: '#5a3f22',
    fish: '#ff9a4d', fishDark: '#c46a20', reel: '#c0c0c8', reelDark: '#707078',
    good: '#4dff9a', bad: '#ff5c5c', gold: '#ffe14d', white: '#eaf6ff', ink: '#04141c',
  };

  var GAME_TITLE = 'EXACT REEL';
  var CX = W * 0.5, ROD_Y = H * 0.5;
  var TARGET = 7;
  var COOLDOWN = 1.9;      // 1回巻くごとに必要な最短間隔(連打では巻けない=すべらせない)
  var SETTLE_WAIT = 1.7;   // 規定回数に達してから、これ以上巻かず耐える猶予

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var winds, reelAngle, fishY, cooldown, settleT, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FISH_SPRITE = ['..####', '.######', '########', '.######', '..####'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(0, H * 0.7, W, H * 0.3, C.water, 0.5);
    for (var i = 0; i < 6; i++) game.draw.line(0, H * (0.74 + i * 0.03), W, H * (0.74 + i * 0.03), '#ffffff10', 3);
    game.draw.rect(0, H * 0.86, W, H * 0.14, C.dockDark);
    game.draw.rect(0, H * 0.86, W, 10, C.dock);
  }

  function drawReel(angle) {
    game.draw.circle(CX, ROD_Y, 70, C.reelDark);
    game.draw.circle(CX, ROD_Y, 54, C.reel);
    game.draw.line(CX, ROD_Y, CX + Math.cos(angle) * 60, ROD_Y + Math.sin(angle) * 60, C.reelDark, 10);
    game.draw.circle(CX + Math.cos(angle) * 60, ROD_Y + Math.sin(angle) * 60, 12, C.ink);
  }

  function drawFish(depthPct) {
    var y = H * 0.86 - depthPct * H * 0.42;
    var scale = 10 + depthPct * 10;
    game.draw.circle(CX, y + 20, 40 + depthPct * 30, '#00000030');
    game.draw.sprite(FISH_SPRITE, { '#': depthPct > 0.9 ? C.fish : C.fishDark }, CX, y, scale, { anchor: 'center' });
    game.draw.line(CX, ROD_Y + 60, CX, y - 10, C.ink, 3);
  }

  function initGame() {
    winds = 0; reelAngle = 0; fishY = 0; cooldown = 0; settleT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function resolve(overshoot) {
    finished = true;
    if (overshoot) {
      ok = false; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, ROD_Y, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
    } else {
      ok = true; hitStop = 0.25;
      game.feedback.good(CX, H * 0.44, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, H * 0.44, { color: C.gold, count: 22, speed: 400 });
      game.audio.play('se_success', 0.5);
    }
    finish();
  }

  // 規定回数ちょうどで「これ以上巻かない」ことも判定に含む: count_exact の核
  function crank() {
    if (finished || done || ready > 0) return;
    if (cooldown > 0) {
      // 早すぎる連打はすべって数えない(連打封じ)
      game.feedback.bad(CX, ROD_Y, { text: 'MISS', shake: 3 });
      return;
    }
    if (winds >= TARGET) {
      // 規定量に達したあとに巻けば糸が切れて失敗(telegraphは赤点滅ですでに予告済み)
      resolve(true);
      return;
    }
    winds++;
    reelAngle += Math.PI / 3;
    cooldown = COOLDOWN;
    game.audio.play('se_tap', 0.15);
    game.feedback.good(CX, ROD_Y, { color: C.gold, count: 6 });
    if (winds === Math.ceil(TARGET / 2)) {
      game.fx.popup('あと半分!', CX, ROD_Y - 160, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (winds === TARGET) settleT = SETTLE_WAIT;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) crank();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: H * 0.7, press: false };
  var DEMO_CYCLE = TARGET * COOLDOWN + SETTLE_WAIT + 0.8;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYCLE;
    if (cyc < dt || demo.t <= dt) { winds = 0; reelAngle = 0; cooldown = 0; settleT = 0; }
    if (cooldown > 0) cooldown -= dt;
    if (settleT > 0) { settleT -= dt; if (settleT <= 0 && winds >= TARGET) { ok = true; } }
    var idx = Math.floor(cyc / COOLDOWN);
    var within = cyc - idx * COOLDOWN;
    demo.press = within < 0.18;
    if (within < dt && idx < TARGET && cooldown <= 0) crank();
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (winds === undefined) initGame();
      bg();
      stepDemo(dt);
      drawFish(winds / TARGET);
      drawReel(reelAngle);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawFish(ok ? 1 : Math.min(1, winds / TARGET));
      drawReel(reelAngle);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(winds + ' / ' + TARGET, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt(winds > TARGET ? '巻きすぎ!' : 'あと' + (TARGET - winds) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(winds, { winds: winds, target: TARGET });
        else game.end.failure({ winds: winds, target: TARGET });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (cooldown > 0) cooldown -= dt;
      if (settleT > 0) {
        settleT -= dt;
        if (settleT <= 0 && winds >= TARGET) resolve(false);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawFish(Math.min(1, winds / TARGET));
    drawReel(reelAngle);
    // telegraph: 規定量に達したら「これ以上巻くと切れる」を赤点滅で予告
    if (settleT > 0 && Math.floor(game.time.elapsed * 6) % 2 === 0) {
      game.draw.circle(CX, ROD_Y, 84, C.bad, 0.25);
    }

    txt(winds + ' / ' + TARGET, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, winds / TARGET), 16, settleT > 0 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.35], ['F4', 0.35], ['A4', 0.35], ['D5', 0.7]], { tempo: 116, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
