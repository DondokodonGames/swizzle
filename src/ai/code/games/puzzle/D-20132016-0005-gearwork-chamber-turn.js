// D-20132016-0005-gearwork-chamber-turn.js
// ギアワーク・チェンバー・ターン — 機械仕掛けの小部屋を回して、隠しロボットを出口の光へ導く
// 操作: 部屋中央のダイヤルを指で円を描くように回し、通過点で正しい向きに合わせて先へ落とす
// 終わり: 2つの分岐点を正しい向きで通過し出口まで導けば成功。誤った向きなら失敗
// @mechanic: rotate_gesture
// @theme: gearwork_chamber_turn
// 世界観: 発明家の工房の奥、歯車で四方に回転する試験用の小部屋。閉じ込められた小型ロボットを、部屋を回して開く通路づたいに出口の光まで導く
// 残るもの: 正誤(CLEAR/GAME OVER) + 通過した分岐点数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: ほぼ白黒の製図線、アクセントは1色のみ
  var C = {
    bg: '#101216', bg2: '#0a0c0f', ink: '#eef1f5', inkDim: '#5a626e',
    accent: '#ffb020', good: '#5dffb0', bad: '#ff5a5a', gold: '#ffd24d', white: '#f4f6f8', dark: '#050607',
  };

  var GAME_TITLE = 'GEAR CHAMBER';
  var CX = W * 0.5;
  var DIAL_Y = H * 0.82;
  var GATE_A_Y = H * 0.34, GATE_B_Y = H * 0.5;
  var EXIT_Y = H * 0.62;
  var START_Y = H * 0.2;
  var REQ_A = 1, REQ_B = 3; // 通過に必要な向き(0-3)
  var TRAVEL_A = 3.0, TRAVEL_B = 3.0, TRAVEL_EXIT = 1.6;
  var ROTATE_THRESHOLD = 1.9; // rad。円を描く指の累積角度がこれを超えると向きが1つ進む

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var orient, stage, stageT, passed, done, endWait, finished, playElapsed;
  var ready, hitStop, shake;
  var dragging, dragLastA, dragAccum;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.dark, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BOT_SPRITE = ['.##.', '####', '.##.', '.#.#'];

  function bg() {
    var el = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    for (var i = 0; i < 10; i++) game.draw.line(0, i * (H / 10), W, i * (H / 10), '#ffffff', 0.03);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.025 + 0.02 * Math.sin(el * 1.4));
  }

  function initGame() {
    orient = 0; stage = 0; stageT = TRAVEL_A; passed = 0;
    done = false; endWait = 0; finished = false; playElapsed = 0;
    ready = 0.8; hitStop = 0; shake = 0;
    dragging = false; dragLastA = 0; dragAccum = 0;
  }

  function angleFromDial(x, y) { return Math.atan2(y - DIAL_Y, x - CX); }

  function applyRotateDelta(delta) {
    dragAccum += delta;
    while (dragAccum >= ROTATE_THRESHOLD) { dragAccum -= ROTATE_THRESHOLD; setOrient((orient + 1) % 4); }
    while (dragAccum <= -ROTATE_THRESHOLD) { dragAccum += ROTATE_THRESHOLD; setOrient((orient + 3) % 4); }
  }
  function setOrient(o) {
    orient = o;
    game.audio.play('se_tap', 0.08);
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    dragging = true; dragLastA = angleFromDial(x, y); dragAccum = 0;
    game.audio.play('se_tap', 0.08);
  });
  game.onMove(function(x, y) {
    if (!dragging) return;
    var a = angleFromDial(x, y);
    var d = a - dragLastA;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    dragLastA = a;
    if (Math.random() < 0.06) game.audio.play('se_tap', 0.02);
    applyRotateDelta(d);
  });
  game.onRelease(function(x, y) {
    dragging = false;
    if (state === S.PLAYING) game.audio.play('se_tap', 0.05);
  });

  function failAt(y, why) {
    hitStop = 0.35; ok = false; finished = true;
    game.feedback.bad(CX, y, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    finish();
  }

  function advanceStage() {
    if (stage === 0) {
      if (orient !== REQ_A) { failAt(GATE_A_Y); return; }
      passed++;
      game.feedback.good(CX, GATE_A_Y, { text: 'GOOD', color: C.good, size: 26 });
      game.fx.burst(CX, GATE_A_Y, { color: C.accent, count: 12, speed: 280 });
      game.audio.play('se_good', 0.35);
      game.fx.popup('HALFWAY!', CX, H * 0.2, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.35);
      stage = 1; stageT = TRAVEL_B;
    } else if (stage === 1) {
      if (orient !== REQ_B) { failAt(GATE_B_Y); return; }
      passed++;
      game.feedback.good(CX, GATE_B_Y, { text: 'GOOD', color: C.good, size: 26 });
      game.fx.burst(CX, GATE_B_Y, { color: C.accent, count: 12, speed: 280 });
      game.audio.play('se_good', 0.35);
      stage = 2; stageT = TRAVEL_EXIT;
    } else if (stage === 2) {
      ok = true; finished = true;
      game.feedback.good(CX, EXIT_Y, { text: 'CLEAR', color: C.good });
      game.fx.burst(CX, EXIT_Y, { color: C.gold, count: 20, speed: 380 });
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function botY() {
    if (stage === 0) return START_Y + (GATE_A_Y - START_Y) * (1 - Math.max(0, stageT) / TRAVEL_A);
    if (stage === 1) return GATE_A_Y + (GATE_B_Y - GATE_A_Y) * (1 - Math.max(0, stageT) / TRAVEL_B);
    if (stage === 2) return GATE_B_Y + (EXIT_Y - GATE_B_Y) * (1 - Math.max(0, stageT) / TRAVEL_EXIT);
    return EXIT_Y;
  }

  function drawGate(y, req, curOrient, bobT) {
    var r = 64;
    game.draw.line(W * 0.2, y, W * 0.8, y, C.inkDim, 4);
    for (var k = 0; k < 4; k++) {
      var a = -Math.PI / 2 + k * (Math.PI / 2);
      var nx = CX + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      game.draw.circle(nx, ny, k === req ? 16 : 10, k === req ? C.gold : C.inkDim, k === req ? 1 : 0.6);
    }
    var pa = -Math.PI / 2 + curOrient * (Math.PI / 2);
    var px = CX + Math.cos(pa) * (r - 6), py = y + Math.sin(pa) * (r - 6);
    game.draw.circle(px, py, 9, C.accent);
  }

  function drawDial(curOrient) {
    game.draw.circle(CX, DIAL_Y, 110, C.inkDim, 0.5);
    game.draw.circle(CX, DIAL_Y, 96, C.dark);
    var a = -Math.PI / 2 + curOrient * (Math.PI / 2);
    var px = CX + Math.cos(a) * 78, py = DIAL_Y + Math.sin(a) * 78;
    game.draw.line(CX, DIAL_Y, px, py, C.accent, 12);
    game.draw.circle(px, py, 16, C.accent);
  }

  function drawScene(curStage, curOrient, curBotY, elapsed) {
    drawGate(GATE_A_Y, REQ_A, curOrient, elapsed);
    drawGate(GATE_B_Y, REQ_B, curOrient, elapsed);
    game.draw.circle(CX, EXIT_Y, 36, C.gold, 0.5 + 0.2 * Math.sin(elapsed * 3));
    var bx = CX + Math.sin(elapsed * 2.4) * 4;
    game.draw.sprite(BOT_SPRITE, { '#': C.ink }, bx, curBotY, 20, { anchor: 'center' });
    drawDial(curOrient);
  }

  var DEMO_CYC = 4.2;
  var demo = { t: 0, gx: CX, gy: DIAL_Y, press: false };
  var demoOrient = 0, demoStage = 0, demoStageT = TRAVEL_A;
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % DEMO_CYC;
    if (cyc < dt || demo.t <= dt) { demoOrient = 0; demoStage = 0; demoStageT = TRAVEL_A; }
    // タイムライン: 0.6sでREQ_Aへ回し、通過。1.9sでREQ_Bへ回し、通過。3.6sで出口通過。
    if (cyc < 0.8) {
      var p1 = cyc / 0.8;
      var a1 = -Math.PI / 2 + p1 * (REQ_A * (Math.PI / 2));
      demo.gx = CX + Math.cos(a1) * 78; demo.gy = DIAL_Y + Math.sin(a1) * 78; demo.press = true;
      demoOrient = REQ_A;
    } else if (cyc < 1.4) {
      demo.press = false; demoStage = 0; demoStageT = TRAVEL_A * (1 - (cyc - 0.8) / 0.6);
      if (cyc > 1.35) { demoStage = 1; demoStageT = TRAVEL_B; }
    } else if (cyc < 2.2) {
      var p2 = (cyc - 1.4) / 0.8;
      var a2 = -Math.PI / 2 + REQ_A * (Math.PI / 2) + p2 * ((REQ_B - REQ_A) * (Math.PI / 2));
      demo.gx = CX + Math.cos(a2) * 78; demo.gy = DIAL_Y + Math.sin(a2) * 78; demo.press = true;
      demoOrient = REQ_B;
    } else if (cyc < 3.4) {
      demo.press = false; demoStage = 1; demoStageT = TRAVEL_B * (1 - (cyc - 2.2) / 1.2);
      if (cyc > 3.35) { demoStage = 2; demoStageT = TRAVEL_EXIT; }
    } else if (cyc < 4.0) {
      demo.press = false; demoStage = 2; demoStageT = TRAVEL_EXIT * (1 - (cyc - 3.4) / 0.6);
    } else {
      demo.press = false; demoStage = 2; demoStageT = 0;
    }
  }
  function demoBotY() {
    if (demoStage === 0) return START_Y + (GATE_A_Y - START_Y) * (1 - Math.max(0, demoStageT) / TRAVEL_A);
    if (demoStage === 1) return GATE_A_Y + (GATE_B_Y - GATE_A_Y) * (1 - Math.max(0, demoStageT) / TRAVEL_B);
    return GATE_B_Y + (EXIT_Y - GATE_B_Y) * (1 - Math.max(0, demoStageT) / TRAVEL_EXIT);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawScene(demoStage, demoOrient, demoBotY(), game.time.elapsed);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
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
      drawScene(2, orient, EXIT_Y, game.time.elapsed);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(passed + ' / ' + 2, W / 2, H * 0.13, 32, C.gold);
      if (!ok) txt('あと' + (2 - passed) + '個!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(passed, { passed: passed, total: 2 });
        else game.end.failure({ passed: passed, total: 2 });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      playElapsed += dt;
      if (playElapsed > 12) {
        failAt(botY());
      } else {
        stageT -= dt;
        if (stageT <= 0) advanceStage();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawScene(stage, orient, botY(), game.time.elapsed);

    txt(passed + ' / ' + 2, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.dark, 0.5);
    game.draw.rect(60, 150, (W - 120) * (passed / 2), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.44, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
