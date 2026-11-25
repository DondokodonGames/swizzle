// I-GBA-0036-fortune-charm-polish.js
// フォーチュン・チャーム・ポリッシュ — 屋台に置かれた曇った護符を指で往復させてこすり、運勢の輝きを時間内に磨き出す
// 操作: 護符の上で指を素早く往復させてこする。往復のたびに曇りが晴れていく
// 終わり: 曇りを磨き切れば成功。時間切れなら失敗
// @mechanic: rub
// @theme: fortune_stall_charm
// 世界観: 夜店の占い屋台。店主マスコットが、客に渡す前の曇った護符を指でこすり、内に眠る運勢の光を磨き出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 磨き上げた進行度%
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値中心、ディザで階調、線の太さで語る。護符の輝きだけ金を許す
  var C = {
    bg: '#0c0c0e', bg2: '#000000', stall: '#1a1a1e', stallLine: '#333338',
    charm: '#26262c', charmRim: '#e8e8ee', dust: '#55555c',
    glow: '#ffd85a', good: '#e8e8ee', bad: '#ff3d3d', gold: '#ffd85a', white: '#e8e8ee', ink: '#000000',
  };

  var GAME_TITLE = 'CHARM POLISH';
  var TIME_LIMIT = 12;
  var CX = W * 0.5, CY = H * 0.44, R = 180;
  var MIN_STROKE = 34;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var progress, pressing, lastX, lastY, strokeAccum, lastDir, strokes, milestoneShown;
  var timeLeft, telegraphWarned;
  var done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#00000060', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var KEEPER_A = ['.##.', '####', '.##.', '#..#'];
  var KEEPER_B = ['.##.', '####', '.##.', '.##.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * (H / 8), W, 1, C.stallLine, 0.4);
    game.draw.rect(W * 0.12, H * 0.22, W * 0.76, H * 0.5, C.stall, 0.6);
  }

  function initGame() {
    progress = 0; pressing = false; lastX = CX; lastY = CY; strokeAccum = 0; lastDir = 0; strokes = 0; milestoneShown = false;
    timeLeft = TIME_LIMIT; telegraphWarned = false;
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

  function fail() {
    hitStop = 0.3; ok = false; finished = true;
    game.feedback.bad(CX, CY, { text: 'MISS' });
    shake = 0.25;
    finish();
  }

  function addProgress(x, y) {
    progress = Math.min(100, progress + 15);
    strokes++;
    game.feedback.good(x, y, { text: strokes % 3 === 0 ? 'NICE' : 'GOOD', color: C.gold, size: 26 });
    game.fx.burst(x, y, { color: C.gold, count: 10, speed: 220 });
    if (!milestoneShown && progress >= 50) {
      milestoneShown = true;
      game.fx.popup('HALFWAY!', W / 2, H * 0.16, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.5);
    }
    if (progress >= 100) { ok = true; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    pressing = true; lastX = x; lastY = y; strokeAccum = 0; lastDir = 0;
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) {
    if (!pressing || state !== S.PLAYING || finished) return;
    var dx = x - lastX;
    if (Math.hypot(x - CX, y - CY) < R) {
      strokeAccum += Math.abs(dx);
      var dir = dx > 0.5 ? 1 : (dx < -0.5 ? -1 : lastDir);
      if (lastDir !== 0 && dir !== lastDir && strokeAccum >= MIN_STROKE) {
        addProgress(x, y);
        strokeAccum = 0;
      }
      lastDir = dir;
    }
    lastX = x; lastY = y;
  });
  game.onRelease(function() { pressing = false; });

  function drawCharm() {
    game.draw.circle(CX, CY, R + 26, C.charmRim, 0.5);
    game.draw.circle(CX, CY, R, C.glow, 0.5 + 0.5 * (progress / 100));
    game.draw.circle(CX, CY, R * 0.7, C.charm);
    game.draw.circle(CX, CY, R * 0.7, C.dust, Math.max(0, 1 - progress / 100));
    for (var i = 0; i < 6; i++) {
      var ang = (i / 6) * Math.PI * 2 + game.time.elapsed * 0.4;
      var vis = progress / 100 > i / 6;
      if (vis) game.draw.circle(CX + Math.cos(ang) * R * 0.45, CY + Math.sin(ang) * R * 0.45, 8, C.gold);
    }
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.6;
    if (cyc < dt || demo.t <= dt) { progress = 0; }
    var swing = Math.sin(cyc * 7) * 90;
    demo.gx = CX + swing; demo.gy = CY; demo.press = true;
    if (cyc < 3.2) progress = Math.min(100, (cyc / 3.2) * 100);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawCharm();
      game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? KEEPER_A : KEEPER_B, { '#': C.white }, W * 0.5, H * 0.86, 18, { anchor: 'center' });
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 36, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCharm();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.gold : C.bad);
      var pct = Math.round(progress);
      txt(pct + ' / 100', W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (100 - pct) + '%!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct2 = Math.round(progress);
        if (ok) game.end.success(pct2, { pct: pct2, strokes: strokes }); else game.end.failure({ pct: pct2, strokes: strokes });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!telegraphWarned && timeLeft <= 3) {
        telegraphWarned = true;
        game.audio.tone(700, 0.12, { wave: 'square', volume: 0.15 });
      }
      if (timeLeft <= 0) fail();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawCharm();
    game.draw.sprite(Math.floor(game.time.elapsed * 3) % 2 === 0 ? KEEPER_A : KEEPER_B, { '#': hitStop > 0 ? C.bad : C.white }, W * 0.5, H * 0.86, 18, { anchor: 'center' });

    txt(Math.round(progress) + ' / 100', W / 2, H * 0.06, 28, C.white);
    game.draw.rect(60, 150, W - 120, 14, '#ffffff20', 1);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, timeLeft / TIME_LIMIT), 14, telegraphWarned ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.3], ['C4', 0.3], ['E4', 0.3], ['A4', 0.6]], { tempo: 100, wave: 'sine', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
