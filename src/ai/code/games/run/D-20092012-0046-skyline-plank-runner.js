// D-20092012-0046-skyline-plank-runner.js
// 高架ランナーの板渡し — 自動で走るランナーの少し先に指で板を描き、欠けた橋をつないで落下を防ぐ
// 操作: ランナーの少し先の空中を指でなぞって板(足場)を描き、欠けた区間を途切れないよう繋ぐ
// 終わり: 対岸まで走りきれば成功。足元の板が途切れて落下すれば失敗
// @mechanic: guide_path
// @theme: skyline_plank_runner
// 世界観: 崩れた高架橋を自動で走り続ける配達ランナーの少し先に、指で板を描いて即席の橋を繋ぎ、対岸まで導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した距離%
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 面ベタ塗り、輪郭はline、フォグ色の遠景で奥行き
  var C = {
    sky1: '#6a8fd8', sky2: '#2c3f6e', gapCol: '#141a30', ink: '#0a0c18',
    white: '#ffffff', gold: '#ffd23d',
    good: '#4dff9e', bad: '#ff4d5e', plank: '#c98a4a', plankEdge: '#7a5228',
  };

  var GAME_TITLE = 'PLANK RUNNER';
  var GROUND_Y = H * 0.60;
  var RUNNER_SX = W * 0.22; // ランナーの画面上の固定X(世界座標がここを基準にスクロール)
  var RUN_SPEED = 54; // px/s
  var TOTAL_DIST = 1000; // ゴールまでの世界距離
  var SEG = 40;
  var GAPS = [[260, 340], [520, 600], [780, 860]]; // 世界座標での欠落区間

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var dist, planks, drawing, drawPts, halfShown;
  var done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var RUNNER = ['.##.', '####', '.##.', '#.##', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.sky1], [0.6, C.sky2], [1, C.sky2]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * 0.5 + i * 6, W, 2, '#ffffff08');
  }

  function segCount() { return Math.ceil((TOTAL_DIST + W) / SEG) + 4; }
  function inGap(worldX) {
    for (var i = 0; i < GAPS.length; i++) if (worldX >= GAPS[i][0] && worldX < GAPS[i][1]) return true;
    return false;
  }

  function screenXOf(worldX) { return RUNNER_SX + (worldX - dist); }
  function worldXOf(screenX) { return screenX - RUNNER_SX + dist; }

  function drawTrack() {
    game.draw.line(0, GROUND_Y + 30, W, GROUND_Y + 30, C.gapCol, 3);
    for (var i = 0; i < planks.length; i++) {
      var wx = i * SEG;
      var sx = screenXOf(wx);
      if (sx < -SEG || sx > W + SEG) continue;
      if (!planks[i]) {
        var blink = Math.floor(game.time.elapsed * 6) % 2 === 0;
        if (blink) game.draw.rect(sx, GROUND_Y + 18, SEG - 2, 6, C.bad, 0.7);
        continue;
      }
      game.draw.rect(sx, GROUND_Y + 14, SEG - 2, 16, C.plankEdge);
      game.draw.rect(sx, GROUND_Y + 14, SEG - 2, 8, C.plank);
    }
    if (drawing && drawPts.length > 1) {
      for (var j = 1; j < drawPts.length; j++) {
        game.draw.line(drawPts[j - 1].x, drawPts[j - 1].y, drawPts[j].x, drawPts[j].y, C.gold, 8);
      }
    }
  }

  function initGame() {
    planks = new Array(segCount()).fill(1);
    for (var i = 0; i < planks.length; i++) if (inGap(i * SEG)) planks[i] = 0;
    dist = 0; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    drawing = false; drawPts = [];
  }

  function addDrawPoint(sx, sy) {
    if (Math.abs(sy - GROUND_Y) > 170) return;
    drawPts.push({ x: sx, y: GROUND_Y });
    if (drawPts.length > 12) drawPts.shift();
    var wx = worldXOf(sx);
    var idx = Math.floor(wx / SEG);
    if (idx >= 0 && idx < planks.length && !planks[idx]) {
      planks[idx] = 1;
      game.audio.play('se_tap', 0.15);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    addDrawPoint(x, y);
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    drawing = true; drawPts = [];
    game.audio.play('se_tap', 0.1);
    addDrawPoint(x, y);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !drawing) return;
    addDrawPoint(x, y);
  });
  game.onRelease(function(x, y) {
    if (state === S.PLAYING) game.audio.play('se_tap', 0.08);
    drawing = false; drawPts = [];
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: RUNNER_SX + 80, gy: GROUND_Y, press: false };
  function stepDemo(dt) {
    if (planks === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      planks = new Array(segCount()).fill(1);
      for (var g = 2; g < 5; g++) planks[g] = 0; // worldX 80-200 に欠落
      dist = 0; halfShown = false;
      demo.drawn = false;
    }
    if (cyc > 0.3 && cyc < 0.85 && !demo.drawn) {
      var p = (cyc - 0.3) / 0.55;
      var wx = SEG * 2 + p * SEG * 3;
      demo.gx = screenXOf(wx); demo.gy = GROUND_Y; demo.press = true;
      var idx = Math.floor(wx / SEG);
      if (idx < planks.length) planks[idx] = 1;
    } else {
      demo.press = false;
      if (cyc >= 0.85) demo.drawn = true;
      if (cyc < 0.3) demo.drawn = false;
    }
    dist += RUN_SPEED * dt * 0.3;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawTrack();
      var bob = Math.sin(game.time.elapsed * 6) * 6;
      game.draw.sprite(RUNNER, { '#': C.white, '.': null }, RUNNER_SX, GROUND_Y - 22 + bob, 16, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.95, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawTrack();
      var bob3 = Math.sin(game.time.elapsed * 6) * 6;
      game.draw.sprite(RUNNER, { '#': ok ? C.white : C.bad, '.': null }, RUNNER_SX, GROUND_Y - 22 + bob3, 16, { anchor: 'center' });
      var pct = Math.round(Math.min(1, dist / TOTAL_DIST) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(pct + ' / ' + 100, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(Math.min(1, dist / TOTAL_DIST) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      dist += RUN_SPEED * dt;
      var idx = Math.floor(dist / SEG);
      if (!planks[idx]) {
        ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(RUNNER_SX, GROUND_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
      } else if (dist >= TOTAL_DIST) {
        ok = true; finished = true; hitStop = 0.1;
        game.feedback.good(RUNNER_SX, GROUND_Y, { text: 'CLEAR', color: C.good });
        game.audio.play('se_success', 0.4);
        finish();
      } else if (!halfShown && dist >= TOTAL_DIST * 0.5) {
        halfShown = true;
        game.fx.popup('HALFWAY!', W * 0.5, H * 0.4, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.5);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawTrack();
    var bob2 = Math.sin(game.time.elapsed * 6) * 6;
    game.draw.sprite(RUNNER, { '#': C.white, '.': null }, RUNNER_SX, GROUND_Y - 22 + bob2, 16, { anchor: 'center' });

    txt(Math.round(Math.min(1, dist / TOTAL_DIST) * 100) + ' / ' + 100, W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, dist / TOTAL_DIST), 16, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
