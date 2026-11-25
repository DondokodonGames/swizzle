// GH-PS-0003-stroke-count.js
// ストロークカウント — 現れる線の数を数える。数え終えると吉凶が出る
// 操作: 線が1本現れるたびにタップして数える
// 終わり: 数え違いなく数えられたか(正誤) + 吉凶の結果(ラベル)
// @mechanic: counting
// @theme: fortune_paper
// 世界観: 紙に線が1本ずつ引かれていく。全部数え終えると、その本数から吉凶が決まる
// 残るもの: 正誤(CLEAR/GAME OVER) + 吉凶(ラベル)
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var C = {
    bg1: '#ffe8ef', bg2: '#ffd6e6', card: '#fffaf5', ink: '#5a4a5a',
    good: '#5ac88a', bad: '#ff6a80', gold: '#ffb020', white: '#ffffff', line: '#8a5aa0',
  };

  var GAME_TITLE = 'STROKE COUNT';
  var FORTUNES = ['大吉', '吉', '中吉', '凶', '大凶'];
  var FORTUNE_COL = [C.good, C.good, C.gold, C.bad, C.bad];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, fortuneStr = '', finalScore = 0;

  var strokeN, strokes, shown, showT, playerCount, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CARD_X = W * 0.5, CARD_Y = H * 0.44, CARD_W = W * 0.72, CARD_H = H * 0.36;
  var BRUSH_SPRITE = ['..#', '.#.', '#..', '#..'];
  var BRUSH_PAL = { '#': C.line };

  function paperBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(CARD_X - CARD_W / 2, CARD_Y - CARD_H / 2, CARD_W, CARD_H, C.card);
    game.draw.rect(CARD_X - CARD_W / 2, CARD_Y - CARD_H / 2, CARD_W, CARD_H, C.white, 0);
    game.draw.line(CARD_X - CARD_W / 2, CARD_Y - CARD_H / 2, CARD_X + CARD_W / 2, CARD_Y - CARD_H / 2, C.line, 5);
    game.draw.line(CARD_X - CARD_W / 2, CARD_Y - CARD_H / 2, CARD_X - CARD_W / 2, CARD_Y + CARD_H / 2, C.line, 5);
    game.draw.line(CARD_X + CARD_W / 2, CARD_Y - CARD_H / 2, CARD_X + CARD_W / 2, CARD_Y + CARD_H / 2, C.line, 5);
    game.draw.line(CARD_X - CARD_W / 2, CARD_Y + CARD_H / 2, CARD_X + CARD_W / 2, CARD_Y + CARD_H / 2, C.line, 5);
    // 装飾の丸(パステル、白縁)
    game.draw.circle(W * 0.14, H * 0.14, 50, C.gold, 0.35);
    game.draw.circle(W * 0.86, H * 0.14, 34, C.good, 0.35);
    game.draw.circle(W * 0.12, H * 0.90, 40, C.bad, 0.25);
    game.draw.circle(W * 0.88, H * 0.90, 56, C.line, 0.20);
    game.draw.sprite(BRUSH_SPRITE, BRUSH_PAL, W * 0.14, H * 0.14, 12, { anchor: 'center' });
  }

  function genStrokes(n) {
    var arr = [];
    var cols = 4, rows = Math.ceil(n / cols);
    for (var i = 0; i < n; i++) {
      var cx = i % cols, cy = Math.floor(i / cols);
      var x0 = CARD_X - CARD_W / 2 + CARD_W * (0.16 + (cx + 0.5) / cols * 0.68);
      var y0 = CARD_Y - CARD_H / 2 + CARD_H * (0.18 + (cy + 0.5) / rows * 0.64);
      var ang = Math.random() * Math.PI;
      var len = 60 + Math.random() * 40;
      arr.push({ x1: x0 - Math.cos(ang) * len / 2, y1: y0 - Math.sin(ang) * len / 2, x2: x0 + Math.cos(ang) * len / 2, y2: y0 + Math.sin(ang) * len / 2 });
    }
    return arr;
  }

  function initGame() {
    strokeN = 6 + Math.floor(Math.random() * 6);
    strokes = genStrokes(strokeN);
    shown = 0; showT = 0; playerCount = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function countTap() {
    if (done || ready > 0 || finished || shown === 0) return;
    playerCount++;
    hitStop = 0.04;
    game.feedback.good(strokes[Math.min(shown, strokes.length) - 1].x2, strokes[Math.min(shown, strokes.length) - 1].y2, { text: playerCount, color: C.line });
    game.audio.play('se_tap', 0.2);
  }

  function resolve() {
    if (finished) return;
    finished = true;
    ok = playerCount === strokeN;
    var idx = strokeN % FORTUNES.length;
    fortuneStr = FORTUNES[idx];
    finalScore = ok ? 100 : 0;
    if (ok) { game.feedback.good(W / 2, H * 0.30, { text: 'CLEAR', color: C.good }); game.fx.burst(W / 2, H * 0.30, { color: C.good, count: 14, speed: 340 }); game.audio.play('se_success', 0.5); }
    else { game.feedback.bad(W / 2, H * 0.30, { text: playerCount + ' / ' + strokeN }); game.audio.play('se_failure', 0.5); }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    countTap();
  });

  // ── ATTRACT ゴースト実演: 線が出るたびにタップして数える ──
  var demo = { t: 0, gx: CARD_X, gy: CARD_Y + CARD_H / 2 + 70, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.5;
    if (cyc < dt || demo.t <= dt) { strokeN = 5; strokes = genStrokes(5); shown = 0; showT = 0; }
    showT += dt;
    if (showT > 0.45 && shown < strokes.length) { shown++; showT = 0; }
    demo.press = (showT > 0.05 && showT < 0.20);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (strokes === undefined) initGame();
      paperBg();
      stepDemo(dt);
      for (var i = 0; i < shown; i++) { var s = strokes[i]; game.draw.line(s.x1, s.y1, s.x2, s.y2, C.line, 10); }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 56, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 46, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 36, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 32, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      paperBg();
      for (var i2 = 0; i2 < strokes.length; i2++) { var s2 = strokes[i2]; game.draw.line(s2.x1, s2.y1, s2.x2, s2.y2, C.line, 10); }
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, ok ? C.good : C.bad);
      var fidx = FORTUNES.indexOf(fortuneStr);
      txt(fortuneStr, W / 2, H * 0.62, 90, FORTUNE_COL[fidx]);
      txt(playerCount + ' / ' + strokeN, W / 2, H * 0.70, 40, C.ink);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.76, 32, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.82, 34, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 34, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: fortuneStr }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      showT += dt;
      if (showT > 0.55 && shown < strokes.length) { shown++; showT = 0; game.audio.tone(520 + shown * 20, 0.08, { wave: 'triangle', volume: 0.14 }); if (shown === Math.ceil(strokeN / 2)) game.fx.popup(shown + ' / ' + strokeN, W / 2, H * 0.20, { color: C.gold, size: 44 }); }
      else if (shown >= strokes.length && showT > 0.9) resolve();
    }
    if (shake > 0) shake -= dt;

    paperBg();
    for (var i3 = 0; i3 < shown; i3++) { var s3 = strokes[i3]; game.draw.line(s3.x1, s3.y1, s3.x2, s3.y2, C.line, 10); }

    txt('COUNT ' + playerCount, W / 2, H * 0.10, 42, C.line);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.20, 70, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
