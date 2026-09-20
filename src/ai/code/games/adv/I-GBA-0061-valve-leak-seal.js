// I-GBA-0061-valve-leak-seal.js
// バルブシール — 潜水服の技師が、海中の配管から噴き出す水漏れを弁を回して止める
// 操作: 弁の周りで指を円を描くように回し、漏れが止まるまで回し切る
// 終わり: 規定回転量を回しきれば成功。噴き出しが強まりすぎれば失敗
// @mechanic: rotate_gesture
// @theme: valve_leak_seal
// 世界観: 海底基地の配管室。旧式の潜水服を着た技師が、割れた弁から噴き出す水を手動で回して止める
// 残るもの: 正誤(CLEAR/GAME OVER) + 締め切った回転量
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    bg: '#0a3a4a', bg2: '#052430', pipe: '#3a5a66', pipeDark: '#1e343c',
    valve: '#d9c04a', valveDark: '#8a7420', leak: '#bfe8ff', leakDark: '#6ec0e6',
    good: '#4dffa0', bad: '#ff5c6a', gold: '#ffe14d', white: '#eafbff', ink: '#031218',
  };

  var GAME_TITLE = 'VALVE SEAL';
  var CX = W * 0.5, VY = H * 0.52;
  var NEEDED_TURNS = 3.5; // 目標周回数
  var LEAK_MAX = 100;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var turns, prevAng, leakLevel, done, endWait, finished, lastMilestone;
  var ready, hitStop, shake, dragging;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPRITE = ['.####.', '#.##.#', '######', '.####.', '#.##.#'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 8; i++) game.draw.circle(W * ((i * 37) % 100) / 100, H * ((i * 53) % 100) / 100, 6, '#ffffff10');
    game.draw.rect(0, H * 0.62, W, 40, C.pipeDark);
    game.draw.rect(0, H * 0.64, W, 8, C.pipe);
    game.draw.sprite(DIVER_SPRITE, { '#': C.pipe }, W * 0.18, H * 0.78, 18, { anchor: 'center' });
  }

  function drawValve(ang, leak) {
    game.draw.circle(CX, VY, 90, C.valveDark);
    game.draw.circle(CX, VY, 74, C.valve);
    for (var i = 0; i < 4; i++) {
      var a = ang + i * (Math.PI / 2);
      game.draw.line(CX, VY, CX + Math.cos(a) * 92, VY + Math.sin(a) * 92, C.valveDark, 14);
    }
    game.draw.circle(CX, VY, 22, C.ink);
    if (leak > 0) {
      var spread = 8 + (leak / LEAK_MAX) * 60;
      var blink = Math.floor(game.time.elapsed * 8) % 2 === 0;
      if (leak > LEAK_MAX * 0.6 && blink) {
        game.draw.circle(CX, VY, 110 + spread, C.bad, 0.15);
      }
      for (var j = 0; j < 5; j++) {
        game.draw.circle(CX + (j - 2) * 14, VY - 100 - spread - j * 6, 6 + (leak / LEAK_MAX) * 8, C.leak, 0.7);
      }
    }
  }

  function initGame() {
    turns = 0; prevAng = null; leakLevel = LEAK_MAX * 0.4; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; lastMilestone = 0; dragging = false;
  }

  function angleAt(x, y) { return Math.atan2(y - VY, x - CX); }

  function onRotateInput(x, y) {
    if (finished || done || ready > 0) return;
    var a = angleAt(x, y);
    if (prevAng !== null) {
      var da = a - prevAng;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      // 時計回り(正)のみ締める方向として有効
      if (da > 0) {
        turns += da / (Math.PI * 2);
        leakLevel = Math.max(0, leakLevel - da * 60);
        game.audio.play('se_tap', 0.04);
      } else {
        leakLevel = Math.min(LEAK_MAX, leakLevel - da * 24);
      }
    }
    prevAng = a;
    var pct = Math.min(1, turns / NEEDED_TURNS);
    if (Math.floor(pct * 4) > lastMilestone) {
      lastMilestone = Math.floor(pct * 4);
      game.fx.popup(Math.round(pct * 100) + '%', CX, VY - 160, { color: C.gold, size: 34 });
      game.audio.play('se_milestone', 0.3);
    }
    if (turns >= NEEDED_TURNS) {
      ok = true; finished = true; hitStop = 0.25;
      game.feedback.good(CX, VY, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, VY, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    } else if (leakLevel >= LEAK_MAX) {
      ok = false; finished = true; hitStop = 0.35; shake = 0.3;
      game.feedback.bad(CX, VY, { text: 'MISS' });
      game.audio.play('se_failure', 0.4);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = true; prevAng = angleAt(x, y);
    game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging) return;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    onRotateInput(x, y);
  });
  game.onRelease(function() {
    if (state !== S.PLAYING) return;
    dragging = false; prevAng = null;
    game.audio.play('se_tap', 0.05);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: VY, press: false, ang: -Math.PI / 2 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.0;
    if (cyc < dt || demo.t <= dt) { turns = 0; leakLevel = LEAK_MAX * 0.4; prevAng = null; lastMilestone = 0; demo.ang = -Math.PI / 2; }
    if (cyc < 4.2) {
      demo.ang += dt * (Math.PI * 2 * (NEEDED_TURNS / 4.2));
      demo.gx = CX + Math.cos(demo.ang) * 130;
      demo.gy = VY + Math.sin(demo.ang) * 130;
      demo.press = true;
      var x = CX + Math.cos(demo.ang) * 130, y = VY + Math.sin(demo.ang) * 130;
      if (prevAng === null) prevAng = angleAt(x, y);
      onRotateInput(x, y);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (turns === undefined) initGame();
      bg();
      stepDemo(dt);
      drawValve(demo.ang, leakLevel);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawValve(0, ok ? 0 : leakLevel);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(Math.round(Math.min(1, turns / NEEDED_TURNS) * 100) + ' / ' + 100, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var pct = Math.round(Math.min(1, turns / NEEDED_TURNS) * 100);
        if (ok) game.end.success(pct, { pct: pct }); else game.end.failure({ pct: pct });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      // 締めていない間も漏れは緩やかに悪化(緊張感の源)
      if (!dragging) leakLevel = Math.min(LEAK_MAX, leakLevel + dt * 6);
      if (leakLevel >= LEAK_MAX) {
        ok = false; finished = true; hitStop = 0.35; shake = 0.3;
        game.feedback.bad(CX, VY, { text: 'MISS' });
        game.audio.play('se_failure', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var showAng = prevAng !== null ? prevAng : demo.ang;
    drawValve(showAng, leakLevel);

    txt(Math.round(Math.min(1, turns / NEEDED_TURNS) * 100) + ' / ' + 100, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.pipeDark);
    game.draw.rect(60, 150, (W - 120) * (leakLevel / LEAK_MAX), 16, leakLevel > LEAK_MAX * 0.7 ? C.bad : C.leak);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
