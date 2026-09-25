// D-20132016-0044-dune-drift-steer.js
// デューンドリフトステア — 自動で進む砂上バギーを、押さえたまま横にずらして道からはみ出さず操る
// 操作: 画面を押さえたまま左右にドラッグして、うねる砂道の中にバギーを収め続ける
// 終わり: 規定距離(100%)走りきれば成功。砂道の外に出れば失敗
// @mechanic: guide_path
// @theme: dune_courier_run
// 世界観: 砂丘を横断する速達バギー便。刻一刻とうねる一本道からはみ出さぬよう、荷を抱えた配達人が駆け抜ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 走破した距離%
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るい単純グラデーション、太い縁取り、影は簡易
  var C = {
    sky: '#ffd77a', sky2: '#ff9a5a', sand: '#e8b85a', sandDark: '#c8963a',
    road: '#f4dca0', roadEdge: '#a86a2a', buggy: '#ff4d5e', buggyDark: '#a02030',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#fff8ec', ink: '#1a0e04',
  };

  var GAME_TITLE = 'DUNE DRIFT';
  var VEH_Y = H * 0.72;
  var AMP = 300, FREQ = 0.0026;
  var HALF_WIDTH = 175;
  var RUN_LEN = 4200;
  var SPEED = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dist, done, endWait, finished;
  var ready, hitStop, shake;
  var vehX, targetX, pressing, milestoneHit;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function centerAt(d) { return W * 0.5 + AMP * Math.sin(d * FREQ); }

  function bg() {
    game.draw.gradient(0, H * 0.42, [[0, C.sky2], [1, C.sky]]);
    game.draw.rect(0, H * 0.42, W, H - H * 0.42, C.sandDark);
    for (var i = 0; i < 6; i++) {
      var cx = W * 0.5 + Math.sin((dist + i * 400) * 0.001) * 500;
      var cy = H * (0.46 + i * 0.02);
      game.draw.circle(cx, cy, 90, C.sand, 0.35);
    }
    game.draw.rect(0, 0, W, H, '#ffffff', 0.02 + 0.02 * Math.sin(game.time.elapsed * 1.2));
  }

  function drawRoad() {
    var step = 40;
    for (var y = VEH_Y - 900; y < VEH_Y + 200; y += step) {
      var d = dist + (VEH_Y - y);
      if (d < 0 || d > RUN_LEN + 400) continue;
      var cx = centerAt(d);
      var scale = Math.max(0.15, 1 - (VEH_Y - y) / 1400);
      var hw = HALF_WIDTH * scale;
      var alpha = Math.max(0.15, scale);
      game.draw.rect(cx - hw - 10, y, 10, step + 2, C.roadEdge, alpha);
      game.draw.rect(cx + hw, y, 10, step + 2, C.roadEdge, alpha);
      game.draw.rect(cx - hw, y, hw * 2, step + 2, C.road, alpha * 0.85);
    }
  }

  function initGame() {
    dist = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    vehX = centerAt(0); targetX = vehX; pressing = false; milestoneHit = 0;
  }

  var BUGGY_SPRITE = ['.####.', '######', '.####.', '.#..#.'];
  function drawVehicle(x) {
    var bob = Math.sin(game.time.elapsed * 5) * 3;
    game.draw.circle(x, VEH_Y + 40 + bob, 60, C.buggyDark, 0.35);
    game.draw.sprite(BUGGY_SPRITE, { '#': C.buggy }, x, VEH_Y + bob, 22, { anchor: 'center' });
  }

  function offRoadCheck() {
    var c = centerAt(dist);
    return Math.abs(vehX - c) > HALF_WIDTH - 30;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    pressing = true; targetX = x;
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    targetX = x;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) game.fx.burst(vehX, VEH_Y, { color: C.buggy, count: 4, speed: 100 });
    pressing = false;
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * 0.5, gy: VEH_Y, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4;
    if (cyc < dt || demo.t <= dt) { dist = 0; vehX = centerAt(0); targetX = vehX; }
    dist += SPEED * dt;
    var c = centerAt(dist + 60);
    targetX = c;
    demo.gx = c; demo.gy = VEH_Y; demo.press = true;
    vehX += (targetX - vehX) * Math.min(1, dt * 6);
    if (dist >= RUN_LEN) dist = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      bg();
      stepDemo(dt);
      drawRoad();
      drawVehicle(vehX);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      var demoPct = Math.round(Math.min(100, (dist / RUN_LEN) * 100));
      txt(demoPct + '%', W / 2, H * 0.06, 28, C.ink);
      game.draw.rect(60, 150, W - 120, 16, C.ink, 0.25);
      game.draw.rect(60, 150, (W - 120) * demoPct / 100, 16, C.gold);
      txt(GAME_TITLE, W / 2, H * 0.08 + 40, 42, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12 + 40, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 36, C.ink);
      else txt('INSERT COIN', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawRoad();
      drawVehicle(vehX);
      var pct = Math.round(Math.min(100, (dist / RUN_LEN) * 100));
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(pct + '%', W / 2, H * 0.13, 32, C.ink);
      game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
      game.draw.rect(60, 150, (W - 120) * pct / 100, 16, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.96, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(Math.min(100, (dist / RUN_LEN) * 100));
        if (ok) game.end.success(pct, { pct: pct });
        else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      dist += SPEED * dt;
      vehX += (targetX - vehX) * Math.min(1, dt * 7);
      var pctNow = dist / RUN_LEN;
      if (pctNow >= 0.25 && milestoneHit < 1) { milestoneHit = 1; game.fx.popup('25%!', vehX, VEH_Y - 140, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.3); }
      if (pctNow >= 0.5 && milestoneHit < 2) { milestoneHit = 2; game.fx.popup('50%!', vehX, VEH_Y - 140, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.3); }
      if (pctNow >= 0.75 && milestoneHit < 3) { milestoneHit = 3; game.fx.popup('75%!', vehX, VEH_Y - 140, { color: C.gold, size: 34 }); game.audio.play('se_milestone', 0.3); }
      if (offRoadCheck()) {
        ok = false; finished = true;
        hitStop = 0.35;
        game.feedback.bad(vehX, VEH_Y, { text: 'MISS' });
        shake = 0.35;
        game.audio.play('se_bad', 0.4);
        finish();
      } else if (dist >= RUN_LEN) {
        ok = true; finished = true;
        hitStop = 0.1;
        game.feedback.good(vehX, VEH_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_good', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawRoad();
    if (!finished) drawVehicle(vehX); else drawVehicle(vehX);

    var pctHud = Math.round(Math.min(100, (dist / RUN_LEN) * 100));
    txt(pctHud + '%', W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.3);
    game.draw.rect(60, 150, (W - 120) * pctHud / 100, 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.25], ['A3', 0.25], ['C4', 0.25], ['F4', 0.5]], { tempo: 132, wave: 'sawtooth', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
