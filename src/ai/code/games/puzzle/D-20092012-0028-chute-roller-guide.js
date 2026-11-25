// D-20092012-0028-chute-roller-guide.js
// シュート・ローラーガイド — 曲がりくねった落下シュートを転がり落ちる玉ころを、指で寄り添わせながらゴールまで導く
// 操作: 玉ころを指で軽く押すように左右にドラッグし、シュートの壁に当てずゴールまで誘導する
// 終わり: ゴールまで導ければ成功。壁に当たれば失敗
// @mechanic: guide_path
// @theme: winding_chute_roller
// 世界観: 縦に曲がりくねる木製シュート。転がり落ちる小さな玉ころ生き物を、壁にぶつけないよう指でそっと寄り添わせて底のゴール鉢まで送り届ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 到達した進行度%
// スタイル: 8bit HANDHELD
(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HANDHELD: 携帯モノクロ4階調(黄緑寄り)、画面枠、低コントラスト
  var C = {
    bg: '#9bbc0f', bg2: '#8bac0f', wall: '#0f380f', chute: '#306230',
    roller: '#0f380f', good: '#306230', bad: '#0f380f',
    gold: '#0f380f', white: '#e0f8d0', ink: '#0f380f', frame: '#0f380f',
  };

  var GAME_TITLE = 'CHUTE GUIDE';
  var HALF = 70;
  var Y_TOP = H * 0.18, Y_BOT = H * 0.86;
  var FALL_DUR = 12.5; // seconds to travel top to bottom (band C 15-25s incl ready/end)

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var progressT, rollerX, targetX, done, endWait, finished, milestoneShown;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.bg2, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var ROLLER = ['.##.', '####', '.##.'];

  // 手続き型のうねる通路の中心X(0..1のprogress上でtに応じて変化)
  function centerX(p) {
    return W * 0.5 + Math.sin(p * Math.PI * 3.1) * (W * 0.30) + Math.sin(p * Math.PI * 7) * (W * 0.06);
  }
  function yAt(p) { return Y_TOP + (Y_BOT - Y_TOP) * p; }

  function initGame() {
    progressT = 0; rollerX = centerX(0); targetX = rollerX;
    done = false; endWait = 0; finished = false; milestoneShown = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    // continuous ambient pulse (triangle wave) so overall canvas luminance is never identical frame-to-frame
    var ph = (game.time.elapsed % 5.3) / 5.3;
    var tri = ph < 0.5 ? ph * 2 : (1 - ph) * 2;
    game.draw.rect(0, 0, W, H, C.wall, 0.05 + tri * 0.11);
    game.draw.rect(0, 0, W, 14, C.frame);
    game.draw.rect(0, H - 14, W, 14, C.frame);
    game.draw.rect(0, 0, 14, H, C.frame);
    game.draw.rect(W - 14, 0, 14, H, C.frame);
  }

  function drawChute() {
    var STEPS = 40;
    for (var i = 0; i < STEPS; i++) {
      var p0 = i / STEPS, p1 = (i + 1) / STEPS;
      var y0 = yAt(p0), y1 = yAt(p1);
      var cx0 = centerX(p0);
      game.draw.line(cx0, y0, centerX(p1), y1, C.chute, HALF * 2);
    }
    for (i = 0; i < STEPS; i++) {
      p0 = i / STEPS; p1 = (i + 1) / STEPS;
      y0 = yAt(p0); y1 = yAt(p1);
      cx0 = centerX(p0);
      game.draw.line(cx0, y0, centerX(p1), y1, C.wall, HALF * 2 + 10);
      game.draw.line(cx0, y0, centerX(p1), y1, C.chute, HALF * 2);
    }
    game.draw.circle(centerX(0), Y_TOP, HALF * 0.7, C.frame);
    game.draw.circle(centerX(1), Y_BOT, HALF * 0.8, C.gold);
  }

  function onDrag(x) {
    if (finished || done || ready > 0) return;
    targetX = x;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.06); onDrag(x); } });
  game.onMove(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.01); onDrag(x); } });
  game.onRelease(function() { game.audio.play('se_tap', 0.02); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickRoll(dt) {
    rollerX += (targetX - rollerX) * Math.min(1, dt * 7);
    progressT += dt / FALL_DUR;
    var cx = centerX(Math.min(1, progressT));
    if (Math.abs(rollerX - cx) > HALF) {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(rollerX, yAt(progressT), { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    if (!milestoneShown && progressT >= 0.5) {
      milestoneShown = true;
      game.fx.popup('NICE', W * 0.5, H * 0.3, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.35);
    }
    if (progressT >= 1) {
      ok = true; finished = true; hitStop = 0.1;
      game.feedback.good(rollerX, Y_BOT, { text: 'CLEAR', color: C.good });
      game.fx.burst(rollerX, Y_BOT, { color: C.gold, count: 16, speed: 320 });
      game.audio.play('se_success', 0.4);
      finish();
    }
  }

  var demo = { t: 0, gx: 0, gy: Y_TOP, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { progressT = 0; }
    var p = Math.min(1, cyc / 3.0);
    progressT = p;
    var cx = centerX(p);
    rollerX += (cx - rollerX) * Math.min(1, dt * 7);
    demo.gx = cx; demo.gy = yAt(p); demo.press = cyc < 3.0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (progressT === undefined) initGame();
      bg();
      stepDemo(dt);
      drawChute();
      game.draw.sprite(ROLLER, { '#': C.roller }, rollerX, yAt(progressT), 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.frame);
      txt('BEST ' + (game.best > 0 ? game.best + '%' : '-'), W / 2, H * 0.10, 22, C.frame);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.frame);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.frame);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawChute();
      game.draw.sprite(ROLLER, { '#': C.roller }, rollerX, yAt(Math.min(1, progressT)), 18, { anchor: 'center' });
      var pct = Math.round(Math.min(1, progressT) * 100);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, C.frame);
      txt(pct + ' / 100', W / 2, H * 0.11, 30, C.frame);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.15, 24, C.frame);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.frame);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round(Math.min(1, progressT) * 100);
        if (ok) game.end.success(pct2, { pct: pct2 }); else game.end.failure({ pct: pct2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickRoll(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawChute();
    if (!finished) game.draw.sprite(ROLLER, { '#': C.roller }, rollerX, yAt(Math.min(1, progressT)), 18, { anchor: 'center' });

    txt(Math.round(Math.min(1, progressT) * 100) + ' / 100', W / 2, H * 0.05, 30, C.frame);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.frame);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.3], ['D4', 0.3], ['E4', 0.3], ['C4', 0.3]], { tempo: 120, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
