// GH-DS-0027-cavity-rub-precision.js
// キャビティラブ — 虫歯の黒ずみだけを指で往復してこすり落とす。健康な歯先をこすると患者が跳ねる
// 操作: 黒ずんだ歯だけを指で素早く左右にこすって削る。健康な白い歯をこすると失点
// 終わり: 2本の虫歯を削り切れば成功。健康な歯への誤爆が3回、または口が閉じる時間切れで失敗
// @mechanic: rub
// @theme: dental_chair_precision
// 世界観: 診療チェアの上で開いた口。虫歯だけが黒ずんで見える。患者は健康な歯に触れられるたび跳び上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + 削り切った本数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 1BIT INK: 白黒2値。中間色はディザ(市松)で作る。線の太さで力を語る
  var C = {
    bg: '#f4f2ea', ink: '#14120e', cavity: '#14120e', clean: '#f4f2ea', warn: '#14120e',
    good: '#14120e', bad: '#14120e', white: '#f4f2ea', gold: '#14120e',
  };

  var GAME_TITLE = 'CAVITY RUB';
  var MAX_TIME = 13, MISS_LIMIT = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, cleanedN = 0, missN = 0, elapsedRound = 0;

  var TEETH = [
    { x: W * 0.30, y: H * 0.42, cavity: true,  fill: 0 },
    { x: W * 0.46, y: H * 0.38, cavity: false, fill: 0 },
    { x: W * 0.62, y: H * 0.40, cavity: false, fill: 0 },
    { x: W * 0.70, y: H * 0.48, cavity: true,  fill: 0 },
  ];
  var TR = 66;

  var rubLastX, rubDir, rubReversals, activeTooth, jumpT, done, endWait, finished, ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  // ディザ(市松)矩形塗り: 面を横1pxストリップ的に間引いて描く
  function dither(x, y, w, h, alpha) {
    var step = 6;
    for (var yy = 0; yy < h; yy += step) {
      for (var xx = 0; xx < w; xx += step) {
        if (((xx / step + yy / step) % 2 === 0)) game.draw.rect(x + xx, y + yy, step, step, C.ink, alpha);
      }
    }
  }

  var PATIENT_SPRITE = ['.####.', '#.##.#', '######', '.####.'];
  var PATIENT_JUMP = ['######', '#.##.#', '#.##.#', '.####.'];

  function sceneBg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, '#e9e6da']]);
    // 動く走査帯(1BIT INKの明滅する診療灯を表現。時間で流れるので静止画にならない)
    var off = (game.time.elapsed * 61) % 23;
    for (var sy = -23; sy < H; sy += 23) game.draw.rect(0, sy + off, W, 11, C.ink, 0.16);
    var jumping = jumpT > 0;
    game.draw.sprite(jumping ? PATIENT_JUMP : PATIENT_SPRITE, { '#': C.ink }, W * 0.5, jumping ? H * 0.15 - 20 : H * 0.15, 20, { anchor: 'center' });
  }

  function drawTeeth() {
    for (var i = 0; i < TEETH.length; i++) {
      var t = TEETH[i];
      game.draw.rect(t.x - TR - 6, t.y - TR - 6, (TR + 6) * 2, (TR + 6) * 2, C.ink);
      game.draw.rect(t.x - TR, t.y - TR, TR * 2, TR * 2, C.clean);
      if (t.cavity) {
        var pct = 1 - t.fill;
        dither(t.x - TR * 0.7, t.y - TR * 0.7, TR * 1.4, TR * 1.4 * pct, 0.9);
        if (t.fill > 0) game.draw.rect(t.x - TR * 0.7, t.y - TR * 0.7 + TR * 1.4 * pct, TR * 1.4, TR * 1.4 * t.fill, C.clean);
      }
      if (activeTooth === i) game.draw.rect(t.x - TR - 6, t.y - TR - 6, (TR + 6) * 2, 6, C.ink, 0.6);
    }
  }

  function initGame() {
    for (var i = 0; i < TEETH.length; i++) TEETH[i].fill = 0;
    cleanedN = 0; missN = 0; elapsedRound = 0; jumpT = 0;
    rubLastX = null; rubDir = 0; rubReversals = 0; activeTooth = -1;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function toothAt(x, y) {
    for (var i = 0; i < TEETH.length; i++) {
      var t = TEETH[i];
      if (Math.abs(x - t.x) < TR && Math.abs(y - t.y) < TR) return i;
    }
    return -1;
  }

  function onRubMove(x, y) {
    if (state !== S.PLAYING || done || ready > 0 || finished) return;
    var idx = toothAt(x, y);
    if (idx < 0) { rubLastX = null; rubDir = 0; return; }
    var t = TEETH[idx];
    if (rubLastX !== null && idx === activeTooth) {
      var d = x - rubLastX;
      if (Math.abs(d) > 5) {
        var dir = d > 0 ? 1 : -1;
        if (dir !== rubDir && rubDir !== 0) {
          if (t.cavity && t.fill < 1) {
            t.fill = Math.min(1, t.fill + 0.22);
            game.audio.play('se_tap', 0.15);
            game.feedback.good(x, y, { text: null });
            if (t.fill >= 1) {
              cleanedN++;
              game.feedback.good(t.x, t.y, { text: 'CLEAN', color: C.good });
              game.fx.burst(t.x, t.y, { color: C.ink, count: 12, speed: 300 });
              game.audio.play('se_break', 0.35);
              if (cleanedN >= 2) { ok = true; finished = true; finish(); }
              else game.fx.popup(cleanedN + ' / ' + 2, W / 2, H * 0.18, { color: C.ink, size: 40 });
            }
          } else if (!t.cavity) {
            missN++;
            jumpT = 0.3;
            shake = 0.14;
            game.feedback.bad(t.x, t.y, { text: 'OUCH' });
            game.audio.play('se_bad', 0.4);
            if (missN >= MISS_LIMIT) { ok = false; finished = true; finish(); }
          }
        }
        rubDir = dir;
      }
    }
    rubLastX = x; activeTooth = idx;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; demo.press = false; return; }
  });
  game.onPress(function(x, y) {
    rubLastX = x; rubDir = 0; activeTooth = toothAt(x, y);
    if (state === S.PLAYING) game.audio.play('se_tap', 0.06);
  });
  game.onMove(function(x, y) {
    onRubMove(x, y);
    if (state === S.PLAYING && Math.random() < 0.05) game.audio.tone(660, 0.02, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function() {
    rubLastX = null; rubDir = 0; activeTooth = -1;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.03);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.4);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: TEETH[0].x, gy: TEETH[0].y, press: false, dir: 1, target: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { for (var i = 0; i < TEETH.length; i++) TEETH[i].fill = 0; }
    var t = TEETH[0];
    demo.gx = t.x + Math.sin(demo.t * 16) * 40;
    demo.gy = t.y;
    demo.press = true;
    t.fill = Math.min(1, (cyc / 2.2));
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (TEETH[0].fill === undefined) initGame();
      sceneBg();
      stepDemo(dt);
      drawTeeth();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best + ' / ' + 2 : '-'), W / 2, H * 0.12, 24, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 40, C.ink);
        txt('TAP TO START', W / 2, H * 0.95, 30, C.ink);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      sceneBg();
      drawTeeth();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, C.ink);
      txt(cleanedN + ' / ' + 2, W / 2, H * 0.13, 32, C.ink);
      if (!ok && cleanedN === 1) txt('あと1本!', W / 2, H * 0.18, 28, C.ink);
      var best = Math.max(game.best, cleanedN);
      txt('BEST ' + best, W / 2, H * 0.90, 28, C.ink);
      if (cleanedN > game.best) txt('NEW RECORD', W / 2, H * 0.95, 26, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 24, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleanedN, { cleanedN: cleanedN, missN: missN });
        else game.end.failure({ cleanedN: cleanedN, missN: missN });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsedRound += dt;
      if (jumpT > 0) jumpT -= dt;
      if (elapsedRound >= MAX_TIME) { ok = false; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    sceneBg();
    drawTeeth();

    txt(cleanedN + ' / ' + 2, W * 0.28, 90, 32, C.ink);
    for (var l = 0; l < MISS_LIMIT; l++) game.draw.circle(W * 0.72 + l * 46, 80, 14, C.ink, l < MISS_LIMIT - missN ? 1 : 0.15);
    game.draw.rect(60, H - 70, (W - 120) * Math.max(0, 1 - elapsedRound / MAX_TIME), 16, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.28, 56, C.ink);
  });

  game.onStart(function() {
    game.audio.melody([['C5', 0.2], ['E5', 0.2], ['G5', 0.2]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
