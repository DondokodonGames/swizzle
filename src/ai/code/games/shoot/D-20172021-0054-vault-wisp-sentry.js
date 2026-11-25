// D-20172021-0054-vault-wisp-sentry.js
// ヴォールト・ウィスプセントリー — 闇から滲み出す光の怨霊を、門に届く前に狙い撃って打ち払う
// 操作: 光る輪が満ちて撃てる状態になった怨霊をタップして撃つ。門に届く前に仕留める
// 終わり: 規定数(8体)撃破で成功。3体を門まで通すと失敗
// @mechanic: aim_shoot
// @theme: vault_wisp_sentry
// 世界観: 遺跡の最深部を守るからくりの門番が、闇から滲み出す怨霊の光球を狙い、門に届く前に一体ずつ撃ち払って封印を保つ
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺の闇に発光ライン、マゼンタ/シアンの強アクセント
  var C = {
    bg: '#0a0620', bg2: '#160c30', gate: '#1c1440', gateEdge: '#ff2ad1',
    wisp: '#2adfff', wispWarn: '#ffe14d', wispCore: '#ffffff',
    good: '#39ff9e', bad: '#ff3355', gold: '#ffe14d', white: '#eaf6ff', ink: '#05030f',
  };

  var GAME_TITLE = 'VAULT SENTRY';
  var NEEDED = 8;
  var MAX_MISS = 3;
  var TELEGRAPH = 0.4;
  var ACTIVE_WIN = 1.15;
  var GATE_X = W * 0.5, GATE_Y = H * 0.86;

  var SPOTS = [
    { x: W * 0.22, y: H * 0.28 }, { x: W * 0.78, y: H * 0.26 },
    { x: W * 0.5, y: H * 0.22 }, { x: W * 0.3, y: H * 0.42 },
    { x: W * 0.7, y: H * 0.44 }, { x: W * 0.5, y: H * 0.5 },
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GATE_SPR = ['#####', '#...#', '#...#', '#####'];
  var WISP_SPR = ['.#.', '###', '.#.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ff2ad1', pulse * 0.4);
    for (var i = 0; i < 5; i++) {
      var yy = H * 0.1 + i * H * 0.09;
      game.draw.line(0, yy, W, yy, '#2adfff', 2, 0.05 + 0.03 * Math.sin(game.time.elapsed * 1.5 + i));
    }
  }

  function drawGate(hp) {
    var flash = hitStop > 0 && Math.floor(game.time.elapsed * 30) % 2 === 0;
    game.draw.rect(GATE_X - 120, GATE_Y - 60, 240, 120, C.gate, 0.9);
    game.draw.rect(GATE_X - 120, GATE_Y - 60, 240, 8, flash ? '#ffffff' : C.gateEdge);
    game.draw.sprite(GATE_SPR, { '#': flash ? '#ffffff' : C.gateEdge }, GATE_X, GATE_Y, 20, { anchor: 'center' });
    for (var m = 0; m < MAX_MISS; m++) {
      game.draw.circle(GATE_X - 60 + m * 60, GATE_Y + 80, 12, m < misses ? C.bad : '#3a2a60');
    }
  }

  function wispPhase(w) {
    if (w.t < TELEGRAPH) return 'telegraph';
    if (w.t < TELEGRAPH + ACTIVE_WIN) return 'active';
    return 'expired';
  }

  function drawWisp(w) {
    var ph = wispPhase(w);
    var bob = Math.sin(game.time.elapsed * 4 + w.seed) * 6;
    var col = ph === 'telegraph' ? C.wispWarn : (ph === 'active' ? C.wisp : C.bad);
    var alpha = ph === 'telegraph' ? 0.4 + 0.3 * Math.sin(game.time.elapsed * 14) : 0.85;
    game.draw.circle(w.x, w.y + bob, 46, col, alpha * 0.5);
    game.draw.sprite(WISP_SPR, { '#': ph === 'telegraph' ? C.wispCore : col }, w.x, w.y + bob, 15, { anchor: 'center' });
  }

  var wisps, hitCount, misses, halfCalled, spawnGap;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    wisps = []; hitCount = 0; misses = 0; halfCalled = false; spawnGap = 0.15;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function spawnWisp() {
    if (wisps.length > 0) return;
    var p = SPOTS[Math.floor(game.random(0, SPOTS.length))];
    wisps.push({ x: p.x, y: p.y, t: 0, seed: game.random(0, 10), hit: false });
  }

  function resolveHit(x, y) {
    for (var i = 0; i < wisps.length; i++) {
      var w = wisps[i];
      if (w.hit) continue;
      if (wispPhase(w) !== 'active') continue;
      if (game.hit.circle(x, y, 1, w.x, w.y, 60)) {
        w.hit = true; hitCount++;
        hitStop = 0.05;
        game.feedback.good(w.x, w.y, { text: 'HIT', color: C.good });
        game.fx.burst(w.x, w.y, { color: C.wisp, count: 18, speed: 360 });
        game.audio.play('se_good', 0.3);
        if (hitCount === Math.ceil(NEEDED / 2)) game.fx.popup(hitCount + ' / ' + NEEDED, W / 2, H * 0.16, { color: C.gold, size: 34 });
        if (hitCount >= NEEDED) { ok = true; finished = true; finish(); }
        return true;
      }
    }
    return false;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      if (!resolveHit(x, y)) game.audio.play('se_tap', 0.08);
    }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function updateWisps(dt) {
    for (var i = wisps.length - 1; i >= 0; i--) {
      var w = wisps[i];
      if (w.hit) { wisps.splice(i, 1); continue; }
      w.t += dt;
      if (wispPhase(w) === 'expired') {
        wisps.splice(i, 1);
        misses++;
        hitStop = 0.28; shake = 0.25;
        game.feedback.bad(GATE_X, GATE_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.35);
        if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
      }
    }
    if (!finished && wisps.length === 0 && hitStop <= 0) spawnWisp();
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.35, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.55;
    if (cyc < dt || demo.t <= dt) { wisps = []; misses = 0; spawnWisp(); }
    if (wisps.length) {
      var w = wisps[0];
      demo.gx += (w.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (w.y - demo.gy) * Math.min(1, dt * 6);
      if (wispPhase(w) === 'active' && !w.hit && cyc > TELEGRAPH + 0.25) {
        resolveHit(w.x, w.y);
        demo.press = true;
      } else demo.press = false;
    }
    updateWisps(dt);
    if (hitCount >= NEEDED) hitCount = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (wisps === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGate();
      for (var i = 0; i < wisps.length; i++) drawWisp(wisps[i]);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGate();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(hitCount + ' / ' + NEEDED, W / 2, H * 0.13, 28, C.gold);
      if (!ok && hitCount >= NEEDED - 1) txt('あと1体!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(hitCount * 15, { hits: hitCount, misses: misses });
        else game.end.failure({ hits: hitCount, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) { game.audio.play('se_tap'); spawnWisp(); }
    } else if (!finished) {
      updateWisps(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGate();
    for (var j = 0; j < wisps.length; j++) drawWisp(wisps[j]);

    txt(hitCount + ' / ' + NEEDED, W / 2, H * 0.06, 30, C.white);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.ink, 0.5);
    game.draw.rect(60, 150, barW * (hitCount / NEEDED), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 150, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
