// GH-DS-0009-armor-gap.js
// アーマーギャップ — 装甲車が迫る。装甲の隙間が開く一瞬だけ撃てる
// 操作: 隙間(赤く光る部分)が開いた瞬間にタップ
// 終わり: 3両。命中数と外した数が残る
// @mechanic: timing_window
// @theme: iso_convoy
// 世界観: 見下ろし斜め視点の道。装甲車が正面から迫り、装甲板が周期的に開閉する。開いた瞬間だけ弱点が見える
// 残るもの: 命中/外した数(SCORE=命中×100) + 撃破した両数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 80s ISO: 菱形グリッド、影で高さを示す
  var C = {
    road1: '#5a5a48', road2: '#4a4a3a', grid: '#6a6a58',
    hull: '#4a5a3a', hull2: '#3a4a2c', gap: '#ff3a3a', gapOpen: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#ffffff', ink: '#141210',
  };

  var GAME_TITLE = 'ARMOR GAP';
  var VEHICLES = 3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var vIdx, hits, misses, gapPhase, gapT, vY, done, endWait, resolved;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var CX = W / 2;
  var TREAD = ['#.#.#', '#.#.#', '#.#.#'];
  var TREAD_PAL = { '#': '#2a2a20' };

  function roadBg() {
    game.draw.gradient(0, H, [[0, '#3a3a2e'], [1, '#22221a']]);
    for (var i = 0; i < 10; i++) {
      var t = i / 9;
      var yy = H * 0.16 + t * H * 0.62;
      var w = 40 + t * (W * 0.9);
      game.draw.rect(CX - w / 2, yy, w, 6, C.grid, 0.35);
    }
    for (var j = -6; j <= 6; j++) game.draw.line(CX + j * 60, H * 0.16, CX + j * 260, H * 0.80, C.grid, 2);
  }

  function newVehicle() {
    gapPhase = 'closed'; gapT = 0.6 + Math.random() * 0.5; vY = H * 0.20;
  }

  function initGame() {
    vIdx = 0; hits = 0; misses = 0; done = false; endWait = 0; resolved = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newVehicle();
  }

  function drawVehicle(y, open, scale) {
    var w = 280 * scale, h = 200 * scale;
    game.draw.circle(CX, y + h * 0.55, w * 0.5, '#000000', 0.3);
    game.draw.rect(CX - w / 2, y - h / 2, w, h, C.hull);
    game.draw.rect(CX - w / 2, y - h / 2, w, h * 0.3, C.hull2);
    game.draw.sprite(TREAD, TREAD_PAL, CX - w * 0.45, y + h * 0.35, 8 * scale, { anchor: 'center' });
    game.draw.sprite(TREAD, TREAD_PAL, CX + w * 0.45, y + h * 0.35, 8 * scale, { anchor: 'center' });
    var gw = w * 0.22, gh = h * 0.30;
    game.draw.rect(CX - gw / 2, y - gh / 2, gw, gh, open ? C.gapOpen : C.gap, open ? 1 : 0.55);
    if (open) game.draw.circle(CX, y, gw * 0.7, C.gapOpen, 0.3);
  }

  function tapNow() {
    if (done || ready > 0 || hitStop > 0 || resolved) return;
    hitStop = 0.08;
    if (gapPhase === 'open') {
      hits++;
      game.feedback.good(CX, vY, { text: 'HIT', color: C.good });
      game.fx.burst(CX, vY, { color: C.gold, count: 14, speed: 360 });
      game.audio.play('se_success', 0.4);
      resolved = true;
    } else {
      misses++;
      game.feedback.bad(CX, vY, { text: 'MISS' });
      shake = 0.15;
      game.audio.play('se_bad', 0.35);
    }
    if (misses - hits >= 0 && resolved) { /* no-op */ }
  }

  function finish() {
    if (done) return;
    done = true;
    finalScore = hits * 100;
    game.audio.stopBgm();
    game.audio.play(hits > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    tapNow();
  });

  // ── ATTRACT ゴースト実演: 隙間が開いた瞬間だけタップ ──
  var demo = { t: 0, gx: CX, gy: H * 0.55, press: false, open: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.2;
    demo.open = cyc > 1.3 && cyc < 1.7;
    demo.press = cyc > 1.3 && cyc < 1.45;
    if (cyc > 1.3 && cyc < 1.33) { game.feedback.good(CX, H * 0.34, { text: 'HIT', color: C.good }); game.fx.burst(CX, H * 0.34, { color: C.gold, count: 10, speed: 300 }); }
    drawVehicle(H * 0.34, demo.open, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (vIdx === undefined) initGame();
      roadBg();
      stepDemo(dt);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.10, 62, C.white);
      txt('BEST ' + game.best, W / 2, H * 0.15, 32, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 50, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 34, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      roadBg();
      drawVehicle(H * 0.40, false, 1.1);
      txt(hits >= 2 ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 58, hits >= 2 ? C.white : C.bad);
      txt('HIT ' + hits + ' / ' + VEHICLES, W / 2, H * 0.62, 46, C.gold);
      txt('SCORE ' + finalScore, W / 2, H * 0.68, 40, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + best, W / 2, H * 0.74, 34, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.80, 38, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.90, 36, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { label: hits + '/' + VEHICLES }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      gapT -= dt;
      if (gapPhase === 'closed' && gapT <= 0) { gapPhase = 'open'; gapT = 0.34; }
      else if (gapPhase === 'open' && gapT <= 0) {
        if (!resolved) { misses++; game.feedback.bad(CX, vY, { text: 'MISS' }); shake = 0.1; }
        vIdx++;
        if (vIdx >= VEHICLES) { finish(); }
        else { newVehicle(); resolved = false; game.fx.popup(vIdx + ' / ' + VEHICLES, W / 2, H * 0.20, { color: C.gold, size: 46 }); }
      }
    }
    if (shake > 0) shake -= dt;

    roadBg();
    if (!done) drawVehicle(H * 0.34, gapPhase === 'open', 1);

    game.draw.rect(60, 40, W - 120, 24, C.ink);
    game.draw.rect(60, 40, (W - 120) * (vIdx / VEHICLES), 24, C.gold);
    txt(vIdx + ' / ' + VEHICLES, W / 2, 106, 44, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.66, 84, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.10);
    state = S.ATTRACT;
    initGame();
  });
})(game);
