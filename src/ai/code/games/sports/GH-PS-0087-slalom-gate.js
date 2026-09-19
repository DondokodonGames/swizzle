// GH-PS-0087-slalom-gate.js
// スラロームゲート — 旗門を左右に抜ける。抜け損ねると失格
// 操作: 指で左右にドラッグして旗門の間を通す
// 終わり: 5つの旗門。全部通れば成功、1つでも外せば失敗
// @mechanic: drag_follow
// @theme: slalom_slope
// 世界観: 見下ろしのゲレンデ。旗門が交互に迫る。門の間をすり抜ければ次へ、逃せば失格
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過した数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 高解像度・低色数。細線とテキスト枠のUI
  var C = {
    bg1: '#e8f0f8', bg2: '#c8dcec', gateL: '#ff5a3a', gateR: '#3a7aff', skier: '#1a1a1a',
    good: '#2ecc71', bad: '#e74c3c', gold: '#f0a020', white: '#0a0a0a', ink: '#0a0a0a',
  };

  var GAME_TITLE = 'SLALOM GATE';
  var GATES = 5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, passed = 0;

  var skiX, gateY, gateSide, gateGap, done, endWait, resolved;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function slopeBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.rect(0, i * (H / 10), W, 2, '#00000010');
  }

  var GATE_Y = H * 0.30;
  var SKI_Y = H * 0.78;

  function drawGate() {
    var cx = W * (gateSide === 0 ? 0.5 : 0.5);
    var gx = W * 0.5 + (gateSide === 0 ? -1 : 1) * gateGap;
    game.draw.rect(0, GATE_Y - 10, W, 20, '#00000008');
    game.draw.rect(W * 0.5 - gateGap - 60, GATE_Y - 90, 60, 180, C.gateL);
    game.draw.rect(W * 0.5 + gateGap, GATE_Y - 90, 60, 180, C.gateR);
  }

  var SKIER_SPRITE = ['.#.', '###', '.#.', '#.#'];
  function drawSkier() {
    game.draw.circle(skiX, SKI_Y + 40, 30, '#00000022');
    game.draw.sprite(SKIER_SPRITE, { '#': C.skier }, skiX, SKI_Y, 16, { anchor: 'center' });
  }

  function newGate() {
    gateSide = Math.random() < 0.5 ? 0 : 1;
    gateGap = 100 + Math.random() * 40;
    resolved = false;
  }

  function initGame() {
    skiX = W / 2; passed = 0; done = false; endWait = 0; finished2 = false; gateTimer = 1.2;
    ready = 0.8; hitStop = 0; shake = 0;
    newGate();
  }
  var finished2 = false;
  var gateTimer = 1.2;

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });
  game.onPress(function(x) { if (state === S.PLAYING) { skiX = x; game.audio.play('se_tap', 0.05); } });
  game.onMove(function(x) {
    if (state !== S.PLAYING) return;
    skiX = Math.max(60, Math.min(W - 60, x));
    if (Math.random() < 0.02) game.audio.play('se_tap', 0.02);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  // ── ATTRACT ゴースト実演: 門の間をすり抜ける ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.90, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 1.6;
    if (cyc < dt) newGate();
    var target = W * 0.5;
    skiX += (target - skiX) * Math.min(1, dt * 3);
    demo.gx = skiX;
    if (cyc > 1.3 && cyc < 1.33) { game.feedback.good(W / 2, GATE_Y, { text: null, color: C.good }); game.fx.burst(W / 2, GATE_Y, { color: C.good, count: 8, speed: 260 }); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (skiX === undefined) initGame();
      slopeBg();
      stepDemo(dt);
      drawGate();
      drawSkier();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.09, 48, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 42, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      slopeBg();
      drawGate();
      drawSkier();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + GATES, W / 2, H * 0.14, 32, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ passed: passed });
        else game.end.failure({ passed: passed });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished2) {
      // ゲート判定は skiX が GATE_Y ラインに近づいたと仮定する固定間隔で
      gateTimer -= dt;
      if (gateTimer <= 0 && !resolved) {
        resolved = true;
        hitStop = 0.06;
        var passOk = Math.abs(skiX - W * 0.5) > gateGap - 10 && Math.abs(skiX - W * 0.5) < gateGap + 70 && ((skiX < W * 0.5) === (gateSide === 0));
        if (passOk) {
          passed++;
          game.feedback.good(skiX, GATE_Y, { text: null, color: C.good });
          game.fx.burst(skiX, GATE_Y, { color: C.good, count: 10, speed: 300 });
          game.audio.play('se_success', 0.3);
          if (passed >= GATES) { ok = true; finished2 = true; finish(); }
          else { newGate(); gateTimer = 1.2; game.fx.popup(passed + ' / ' + GATES, W / 2, H * 0.20, { color: C.gold, size: 40 }); }
        } else {
          ok = false; finished2 = true;
          game.feedback.bad(skiX, GATE_Y, { text: 'MISS' });
          shake = 0.15;
          game.audio.play('se_failure', 0.4);
          finish();
        }
      }
    }
    if (shake > 0) shake -= dt;

    slopeBg();
    drawGate();
    drawSkier();

    txt(passed + ' / ' + GATES, W / 2, H * 0.06, 34, C.ink);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_cute', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
