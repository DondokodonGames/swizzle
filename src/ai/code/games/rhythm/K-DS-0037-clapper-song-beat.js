// K-DS-0037-clapper-song-beat.js
// クラッパーソング — 流れる曲のリズムに合わせて拍子木を打ち鳴らす
// 操作: 画面上部から降りてくる拍のマーカーが打点ラインに重なった瞬間にタップする
// 終わり: 規定拍数(8拍)を通し終えれば成功。3回外せば失敗
// @mechanic: rhythm
// @theme: stagehand_clapper_cue
// 世界観: 舞台袖の進行係が、曲の拍に合わせて拍子木を打って場面転換の合図を出す
// 残るもの: 正誤(CLEAR/GAME OVER) + PERFECT数と外した回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: 白黒2値+差し色1色のみ。塗りは線描の集積で表現
  var C = {
    bg: '#eae4d8', ink: '#1a1610', line: '#1a1610', accent: '#c0392b',
    good: '#1a1610', bad: '#c0392b', gold: '#c0392b', white: '#eae4d8', paper: '#f4efe4',
  };

  var GAME_TITLE = 'CLAPPER SONG';
  var TOTAL_BEATS = 8;
  var MAX_MISS = 3;
  var CX = W * 0.5;
  var HIT_Y = H * 0.62;
  var TRAVEL = 0.9; // seconds a marker takes to fall from spawn to hit line
  var GAP = 0.72;   // seconds between beats

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var beatsDone, misses, perfects, done, endWait, finished;
  var ready, hitStop, shake;
  var markers, spawnT, beatIdx, clapT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CLAPPER_OPEN = ['#....#', '#....#', '#....#', '#....#'];
  var CLAPPER_SHUT = ['######', '......', '......', '######'];

  function stageBg() {
    game.draw.gradient(0, H, [[0, C.paper], [1, C.bg]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), '#00000008', 2);
    game.draw.line(0, HIT_Y, W, HIT_Y, C.ink, 4);
  }

  function newMarkers() {
    var arr = [];
    for (var i = 0; i < TOTAL_BEATS; i++) arr.push({ t: i * GAP, done: false });
    return arr;
  }

  function initGame() {
    beatsDone = 0; misses = 0; perfects = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    markers = newMarkers(); spawnT = 0; beatIdx = 0; clapT = 0;
  }

  function markerY(t) {
    var p = t / TRAVEL;
    return HIT_Y - (1 - p) * (HIT_Y - H * 0.18);
  }

  function resolveTap() {
    if (ready > 0 || done || finished) return;
    // find nearest unresolved marker near hit line
    var best = null, bestDist = 1e9;
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      if (m.done) continue;
      var y = markerY(spawnT - m.t);
      var d = Math.abs(y - HIT_Y);
      if (d < bestDist) { bestDist = d; best = m; }
    }
    clapT = 0.15;
    if (best && bestDist < 130) {
      best.done = true;
      var perfect = bestDist < 55;
      hitStop = perfect ? 0.08 : 0.05;
      if (perfect) perfects++;
      beatsDone++;
      game.feedback.good(CX, HIT_Y, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.ink });
      game.fx.burst(CX, HIT_Y, { color: C.accent, count: 10, speed: 260 });
      game.audio.play('se_good', 0.35);
      if (beatsDone === Math.ceil(TOTAL_BEATS / 2)) game.fx.popup('HALFWAY!', CX, H * 0.30, { color: C.accent, size: 38 });
      if (beatsDone >= TOTAL_BEATS) { ok = true; finished = true; finish(); }
    } else {
      misses++;
      hitStop = 0.18;
      shake = 0.14;
      game.feedback.bad(CX, HIT_Y, { text: 'MISS' });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    resolveTap();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawMarkers() {
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      if (m.done) continue;
      var dt2 = spawnT - m.t;
      if (dt2 < -0.2 || dt2 > TRAVEL + 0.15) continue;
      var y = markerY(dt2);
      var near = Math.abs(y - HIT_Y) < 90;
      game.draw.circle(CX, y, near ? 30 : 22, near ? C.accent : C.ink, near ? 1 : 0.6);
    }
  }

  function drawClapper(open) {
    game.draw.sprite(open ? CLAPPER_OPEN : CLAPPER_SHUT, { '#': C.ink }, CX, HIT_Y - 210, 34, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { markers = newMarkers(); beatsDone = 0; clapT = 0; }
    spawnT = cyc;
    for (var i = 0; i < markers.length; i++) {
      var m = markers[i];
      if (m.done) continue;
      var d = spawnT - m.t;
      if (d >= 0 && d <= dt * 1.5 + 0.02) {
        // marker crosses spawn moment isn't the hit; wait for reaching hit line instead
      }
      var y = markerY(d);
      if (!m.done && d >= 0 && Math.abs(y - HIT_Y) < 20) {
        m.done = true; demo.press = true; clapT = 0.15;
        game.feedback.good(CX, HIT_Y, { text: 'PERFECT', color: C.gold });
        game.audio.play('se_good', 0.2);
      }
    }
    if (clapT > 0) clapT -= dt; else demo.press = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (markers === undefined) initGame();
      stageBg();
      stepDemo(dt);
      drawMarkers();
      drawClapper(clapT <= 0);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 20 });
      txt(GAME_TITLE, W / 2, H * 0.08, 46, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.accent);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.accent);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      stageBg();
      drawClapper(true);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.ink : C.bad);
      txt('PERFECT ' + perfects + ' / MISS ' + misses, W / 2, H * 0.13, 28, C.accent);
      if (!ok) txt('あと' + (TOTAL_BEATS - beatsDone) + '拍!', W / 2, H * 0.18, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(perfects, { perfects: perfects, misses: misses, beats: TOTAL_BEATS });
        else game.end.failure({ perfects: perfects, misses: misses, beats: TOTAL_BEATS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      spawnT += dt;
      // auto-miss markers that fell past the line unclapped
      for (var i = 0; i < markers.length; i++) {
        var m = markers[i];
        if (m.done) continue;
        var d = spawnT - m.t;
        if (d > TRAVEL + 0.16) {
          m.done = true; misses++;
          game.feedback.bad(CX, HIT_Y, { text: 'MISS' });
          shake = 0.1;
          game.audio.play('se_bad', 0.3);
          if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
        }
      }
    }
    if (clapT > 0) clapT -= dt;
    if (shake > 0) shake -= dt;

    stageBg();
    if (!finished) drawMarkers();
    drawClapper(clapT <= 0);

    txt(beatsDone + ' / ' + TOTAL_BEATS, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, '#00000022');
    for (var k = 0; k < MAX_MISS; k++) {
      game.draw.circle(W - 90 - k * 44, 158, 12, k < misses ? C.bad : '#00000030');
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 58, C.accent);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.25], ['A4', 0.25], ['D5', 0.25], ['A4', 0.25]], { tempo: 84, wave: 'triangle', volume: 0.07, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
