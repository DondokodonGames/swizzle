// K-DS-0040-forge-strip-cut.js
// 試し斬り連斬 — 師匠が放る試し斬り材を、宙にある間に次々と斬る
// 操作: 材が斬撃ラインに重なった瞬間にタップ。複数本同時の回もある。早すぎ/遅すぎ/取りこぼしは失敗数に加算
// 終わり: 規定本数(7本)を斬れば成功。3回外せば失敗
// @mechanic: slice
// @theme: forge_test_strip_cut
// 世界観: 刃物鍛冶の裏庭。見習いが、師匠が次々放り投げる試し斬り材(和紙を巻いた検品用の帯材)を、火花散る炉の前で間合いに入った瞬間だけ斬り続ける修練
// 残るもの: 正誤(CLEAR/GAME OVER) + 斬った本数と最大連続数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 彩度高めの多色パレット、太い輪郭線、明快なグラデ
  var C = {
    bg: '#2a1810', bg2: '#140a06', anvil: '#4a3428', anvilDark: '#241610',
    strip: '#e8dcc0', stripEdge: '#b8a878', spark: '#ffcc33', emberGlow: '#ff6a1a',
    good: '#5aff7a', bad: '#ff4444', gold: '#ffd400', white: '#fff4e0', ink: '#100804',
  };

  var GAME_TITLE = 'FORGE CUT';
  var TOTAL = 7;
  var MAX_MISS = 3;
  var LINE_Y = H * 0.52;
  var CX = W * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cut, miss, done, endWait, finished;
  var ready, hitStop, shake;
  var strips, spawnT, nextSpawn, wave;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var SMITH = ['..##..', '.####.', '..##..', '#####.', '.#.#..'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.circle(W * 0.18, H * 0.4, 260, C.emberGlow, 0.10);
    game.draw.rect(0, H * 0.78, W, H * 0.22, C.anvilDark);
    game.draw.rect(W * 0.1, H * 0.74, W * 0.8, 36, C.anvil);
    game.draw.sprite(SMITH, { '#': C.gold }, W * 0.15, H * 0.86, 24, { anchor: 'center' });
    for (var i = 0; i < 4; i++) {
      var ex = W * 0.1 + Math.random() * W * 0.16;
      var ey = H * 0.35 + Math.random() * H * 0.15;
      if (Math.random() < 0.35) game.draw.circle(ex, ey, 2 + Math.random() * 3, C.spark, 0.6);
    }
    game.draw.line(0, LINE_Y, W, LINE_Y, C.stripEdge, 4);
  }

  function newStrip(dir, speed, delay) {
    var startX = dir < 0 ? -100 : W + 100;
    return {
      dir: dir, x: startX, y: LINE_Y - 340, speed: speed,
      delay: delay, born: false, resolved: false, telegraphed: false,
    };
  }

  function spawnWave() {
    wave++;
    var n = wave <= 4 ? 1 : 2; // 後半は2本同時
    var arr = [];
    for (var i = 0; i < n; i++) {
      var dir = Math.random() < 0.5 ? -1 : 1;
      arr.push(newStrip(dir, 620 + wave * 22, i * 0.12));
    }
    return arr;
  }

  function initGame() {
    cut = 0; miss = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    strips = []; wave = 0; spawnT = 0; nextSpawn = 0.4;
  }

  function updateStrip(s, dt) {
    s.t = (s.t || 0) + dt;
    var dur = 1.05;
    var p = Math.min(1, s.t / dur);
    var startX = s.dir < 0 ? -100 : W + 100;
    var endX = s.dir < 0 ? W + 100 : -100;
    s.px = startX + (endX - startX) * p;
    // 山なりの縦位置: 頂点(p=0.5)でLINE_Yに最接近
    var arc = 1 - Math.pow((p - 0.5) * 2, 2); // 0..1..0
    s.py = LINE_Y - arc * 300;
    s.nearLine = Math.abs(s.py - LINE_Y) < 60 && p > 0.3 && p < 0.7;
    s.telegraphed = s.telegraphed || (p > 0.28 && p < 0.7);
    return p >= 1;
  }

  function onStrike(x, y) {
    if (ready > 0 || done || hitStop > 0) return;
    game.audio.play('se_tap', 0.05);
    var hitAny = false;
    for (var i = 0; i < strips.length; i++) {
      var s = strips[i];
      if (s.resolved) continue;
      var d = Math.hypot(x - s.px, y - s.py);
      if (d < 130 && s.nearLine) {
        s.resolved = true; hitAny = true;
        cut++;
        hitStop = 0.12;
        game.feedback.good(s.px, s.py, { text: 'CUT', color: C.good });
        game.fx.burst(s.px, s.py, { color: C.spark, count: 16, speed: 340 });
        game.audio.play('se_good', 0.4);
        if (cut === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, H * 0.3, { color: C.gold, size: 40 });
        break;
      }
    }
    if (!hitAny) {
      // 空振り: 斬撃ライン付近に何もない/タイミング外
      game.fx.flash('#ffffff', 0.05);
    }
    checkEnd();
  }

  function registerMiss(s) {
    if (s.resolved) return;
    s.resolved = true;
    miss++;
    hitStop = 0.3;
    game.feedback.bad(s.px, LINE_Y, { text: 'MISS' });
    shake = 0.25;
    game.audio.play('se_bad', 0.4);
    checkEnd();
  }

  function checkEnd() {
    if (finished) return;
    if (cut >= TOTAL) { ok = true; finished = true; finish(); }
    else if (miss >= MAX_MISS) { ok = false; finished = true; finish(); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) onStrike(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawStrip(s) {
    if (!s || s.resolved) return;
    var blink = s.nearLine && Math.floor(game.time.elapsed * 14) % 2 === 0;
    if (s.telegraphed) {
      game.draw.line(s.px, LINE_Y - 90, s.px, LINE_Y + 90, blink ? C.bad : '#ff444455', 4);
    }
    game.draw.line(s.px - 40 * s.dir, s.py, s.px + 40 * s.dir, s.py, C.stripEdge, 12);
    game.draw.rect(s.px - 26, s.py - 8, 52, 16, C.strip);
  }

  var demo = { t: 0, gx: CX, gy: H * 0.9, press: false, arr: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      demo.arr = [newStrip(demo.t % 6 < 3 ? -1 : 1, 650, 0)];
      demo.hitDone = false;
    }
    for (var i = 0; i < demo.arr.length; i++) {
      var s = demo.arr[i];
      updateStrip(s, dt);
      if (!s.resolved && s.nearLine && !demo.hitDone) {
        s.resolved = true; demo.hitDone = true;
        demo.gx = s.px; demo.gy = s.py; demo.press = true;
        game.fx.burst(s.px, s.py, { color: C.spark, count: 12, speed: 300 });
        game.audio.play('se_good', 0.2);
      }
    }
    strips = demo.arr;
    if (cyc > 1.4) demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      for (var i = 0; i < strips.length; i++) drawStrip(strips[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(cut + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - cut) + '本!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cut, { cut: cut, miss: miss });
        else game.end.failure({ cut: cut, miss: miss });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnT += dt;
      if (spawnT >= nextSpawn) {
        spawnT = 0;
        nextSpawn = Math.max(0.75, 1.3 - wave * 0.06);
        var arr = spawnWave();
        for (var j = 0; j < arr.length; j++) strips.push(arr[j]);
      }
      for (var k = strips.length - 1; k >= 0; k--) {
        var s = strips[k];
        if (s.resolved) { strips.splice(k, 1); continue; }
        var expired = updateStrip(s, dt);
        if (expired) registerMiss(s);
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    for (var m = 0; m < strips.length; m++) drawStrip(strips[m]);

    txt(cut + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (cut / TOTAL), 16, C.gold);
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W - 70 - mi * 44, 200, 14, mi < miss ? C.bad : '#ffffff33');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C3', 0.25], ['C3', 0.25], ['G3', 0.5], ['A3', 0.5]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
