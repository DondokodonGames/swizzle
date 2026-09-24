// D-20092012-0037-comet-gate-breaker.js
// コメットゲート破し — 夜空の関所に迫る彗星の列へ、色を選んで光弾を撃ち込み3つ揃えて消す
// 操作: 下部の3色ボタンをタップして同色の光弾を発射し、列の先頭に合わせて3つ揃えると消える
// 終わり: 列を全て消せば成功。列が門(危険ライン)に届けば失敗
// @mechanic: aim_shoot
// @theme: comet_gate_guardian
// 世界観: 夜空の関所を守る門番ロボットが、迫りくる彗星の隊列に同色の光弾を撃ち込み、3つ揃えて消し去る
// 残るもの: 正誤(CLEAR/GAME OVER) + 撃破数と最大コンボ
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 濃紺グラデ + シアン/マゼンタ/イエロー/白の発光4色
  var C = {
    bg: '#050014', bg2: '#12053a', gate: '#ff2e6d', gateDark: '#5a0f2c',
    ink: '#04030a', white: '#ffffff', gold: '#ffe94d',
    good: '#39ff9e', bad: '#ff3355',
  };
  var COLORS = ['#00e5ff', '#ff2ea6', '#ffe94d'];
  var COLOR_NAME = ['C', 'M', 'Y'];

  var GAME_TITLE = 'GATE BREAKER';
  var SPAWN_Y = H * 0.20, DANGER_Y = H * 0.66, GAP = 78;
  var GX = W * 0.5, GY = H * 0.80; // guardian position
  var ADV_RATE = 1 / 15; // 未介入で約15秒で到達
  var INIT_LEN = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var chain, advance, initLen, popped, maxCombo, combo, halfShown;
  var done, endWait, finished, ready, hitStop, shake;
  var shots; // 発射エフェクト用の一過性リスト

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var GUARDIAN = ['.####.', '#o##o#', '######', '.####.', '#.##.#'];
  var COMET = ['.###.', '#o#o#', '#####', '.###.'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 40; i++) {
      var sx = (i * 137) % W, sy = (i * 293) % (H * 0.6);
      game.draw.rect(sx, sy, 3, 3, '#ffffff', 0.25 + (i % 5) * 0.05);
    }
  }

  function orbY(idx) { return SPAWN_Y + advance * (DANGER_Y - SPAWN_Y) - idx * GAP; }

  function drawChain() {
    // 危険ライン
    var warn = advance > 0.8;
    var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.line(0, DANGER_Y, W, DANGER_Y, warn && blink ? C.bad : C.gateDark, warn ? 10 : 6);
    for (var i = chain.length - 1; i >= 0; i--) {
      var y = orbY(i);
      if (y < SPAWN_Y - GAP) continue;
      var pal = { '#': COLORS[chain[i]], 'o': C.ink };
      game.draw.sprite(COMET, pal, GX, y, 16, { anchor: 'center' });
    }
  }

  function drawGuardian() {
    var bob = Math.sin(game.time.elapsed * 3) * 8;
    var pal = { '#': C.white, 'o': C.gold };
    game.draw.sprite(GUARDIAN, pal, GX, GY + bob, 20, { anchor: 'center' });
  }

  function drawButtons() {
    for (var c = 0; c < 3; c++) {
      var bx = W * (0.22 + c * 0.28), by = H * 0.90;
      game.draw.circle(bx, by, 78, COLORS[c], 0.9);
      game.draw.circle(bx, by, 78, C.white, 0.15);
      game.draw.sprite(COMET, { '#': C.white, 'o': C.ink }, bx, by, 14, { anchor: 'center' });
    }
  }

  function initGame() {
    chain = [];
    for (var i = 0; i < INIT_LEN; i++) chain.push(Math.floor(game.random(0, 3)));
    // 初期状態で3連が偶然できていたら壊す
    for (var j = 2; j < chain.length; j++) {
      if (chain[j] === chain[j - 1] && chain[j] === chain[j - 2]) chain[j] = (chain[j] + 1) % 3;
    }
    initLen = chain.length;
    advance = 0; popped = 0; maxCombo = 0; combo = 0; halfShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    shots = [];
  }

  function hitButton(x, y) {
    for (var c = 0; c < 3; c++) {
      var bx = W * (0.22 + c * 0.28), by = H * 0.90;
      if (Math.hypot(x - bx, y - by) <= 90) return c;
    }
    return -1;
  }

  function fireColor(c, bx, by) {
    shots.push({ x1: bx, y1: by, x2: GX, y2: orbY(0), t: 0.15 });
    chain.unshift(c);
    var run = 1;
    while (run < chain.length && chain[run] === chain[0]) run++;
    if (run >= 3) {
      var px = GX, py = orbY(Math.floor(run / 2));
      chain.splice(0, run);
      popped += run;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      advance = Math.max(0, advance - 0.05 * run);
      game.feedback.good(px, py, { text: 'NICE', color: C.good, sound: 'se_break' });
      game.fx.burst(px, py, { color: COLORS[c], count: 16, speed: 340 });
      if (!halfShown && popped >= Math.floor(initLen / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', GX, H * 0.4, { color: C.gold, size: 40 });
        game.audio.play('se_milestone', 0.5);
      }
      if (chain.length === 0) {
        ok = true; finished = true; hitStop = 0.12;
        finish();
      }
    } else {
      combo = 0;
      game.audio.play('se_tap', 0.3);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING || ready > 0 || done || finished) return;
    var c = hitButton(x, y);
    if (c < 0) return;
    fireColor(c, x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: W * (0.22), gy: H * 0.90, press: false };
  var DEMO_SCRIPT = [
    { t: 0.35, col: 0 },
    { t: 0.85, col: 0 },
  ];
  function stepDemo(dt) {
    if (chain === undefined) initGame();
    demo.t += dt;
    var cyc = demo.t % 1.4;
    if (cyc < dt || demo.t <= dt) {
      chain = [0, 0, 1, 2, 0]; initLen = chain.length; advance = 0.15;
      popped = 0; combo = 0; halfShown = false; shots = [];
    }
    advance = Math.min(0.7, advance + dt * ADV_RATE * 0.6);
    demo.press = false;
    for (var i = 0; i < DEMO_SCRIPT.length; i++) {
      var ev = DEMO_SCRIPT[i];
      if (cyc >= ev.t && cyc < ev.t + 0.18) {
        var bx = W * (0.22 + ev.col * 0.28), by = H * 0.90;
        demo.gx = bx; demo.gy = by; demo.press = true;
        if (!ev.done || demo.t - ev.firedAt > 1.3) { ev.firedAt = demo.t; fireColor(ev.col, bx, by); }
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawChain();
      drawGuardian();
      drawButtons();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawChain();
      drawGuardian();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(popped + ' / ' + initLen, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + Math.max(1, chain.length) + '個!', W / 2, H * 0.18, 26, C.white);
      txt('MAX COMBO ' + maxCombo, W / 2, H * 0.22, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { popped: popped, total: initLen, maxCombo: maxCombo };
        if (ok) game.end.success(popped, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      advance += dt * ADV_RATE;
      if (advance >= 1) {
        ok = false; finished = true; hitStop = 0.35;
        game.feedback.bad(GX, DANGER_Y, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;
    for (var i = shots.length - 1; i >= 0; i--) {
      shots[i].t -= dt;
      if (shots[i].t <= 0) shots.splice(i, 1);
    }

    bg();
    drawChain();
    drawGuardian();
    drawButtons();
    for (var s = 0; s < shots.length; s++) {
      var sh = shots[s];
      game.draw.line(sh.x1, sh.y1, sh.x2, sh.y2, C.white, 4);
    }

    txt(popped + ' / ' + initLen, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.min(1, advance), 16, C.bad);
    if (combo >= 2) txt('COMBO x' + combo, W / 2, H * 0.24, 26, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.4], ['C4', 0.4], ['E4', 0.4], ['A4', 0.8]], { tempo: 108, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
