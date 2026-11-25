// I-GBA-0013-claw-pit-escape.js
// クロークピット・エスケープ — 景品箱のうさぎ、降りてくるクレーンから逃げる
// 操作: 指でうさぎをドラッグして動かし、降りてくるクレーンのアームに掴まれないよう逃げる
// 終わり: 制限時間を逃げ切れば成功。クレーンに掴まれると失敗
// @mechanic: drag_follow
// @theme: claw_machine_plush_escape
// 世界観: 景品箱の中のうさぎのぬいぐるみが主役。頭上から降りてくるクレーンのアームに掴まれる前に、山の中を逃げ回る
// 残るもの: 正誤(CLEAR/GAME OVER) + 生き延びた秒数
// スタイル: 2000s ARCADE POP

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 2000s ARCADE POP: 明るいパステル背景、太い白縁取り、光の柱
  var C = {
    bg1: '#ffe9f5', bg2: '#ffd0ea', box: '#ffffff', boxEdge: '#ff7ac0',
    plush: '#ffcf4d', plushDark: '#e0a020', claw: '#8a94a8', clawDark: '#5a6478',
    good: '#39d17a', bad: '#ff5a7a', gold: '#ff3d8f', white: '#ffffff', ink: '#3a2040',
  };

  var GAME_TITLE = 'CLAW PIT ESCAPE';
  var SURVIVE_T = 12; // 生き延びるべき秒数

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var FX0 = W * 0.22, FX1 = W * 0.78, FY0 = H * 0.30, FY1 = H * 0.68;

  var px, py, clawX, clawTargetX, clawY, clawPhase, clawT, survived, done, endWait, finished;
  var ready, hitStop, shake, milestoneShown, grabbed;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var PLUSH_SPRITE = ['.##.', '####', '.##.', '#..#'];
  var PLUSH_SPRITE2 = ['.##.', '####', '.##.', '.##.'];

  function toys() {
    // 背景の景品の山(小さいぬいぐるみのシルエット、遠景)
    var pts = [[0.15, 0.62], [0.35, 0.66], [0.62, 0.60], [0.85, 0.65], [0.25, 0.72], [0.75, 0.72]];
    for (var i = 0; i < pts.length; i++) {
      game.draw.circle(W * pts[i][0], H * pts[i][1], 34, '#ffffffaa');
    }
  }

  function scene() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    // 光の柱(祝祭演出)
    for (var i = 0; i < 4; i++) {
      game.draw.rect(W * (0.15 + i * 0.24), 0, 40, H, C.white, 0.06);
    }
    // ガラス箱
    game.draw.rect(FX0 - 20, FY0 - 20, FX1 - FX0 + 40, FY1 - FY0 + 40, C.boxEdge, 0.9);
    game.draw.rect(FX0, FY0, FX1 - FX0, FY1 - FY0, C.box, 0.9);
    toys();
  }

  function drawPlush(x, y, scared) {
    game.draw.circle(x, y + 30, 30, '#00000022');
    game.draw.sprite(scared ? PLUSH_SPRITE2 : PLUSH_SPRITE, { '#': C.plushDark }, x, y, 20, { anchor: 'center' });
    game.draw.circle(x, y, 34, C.plush);
    game.draw.sprite(scared ? PLUSH_SPRITE2 : PLUSH_SPRITE, { '#': C.plushDark }, x, y, 18, { anchor: 'center' });
  }

  function drawClaw(x, y, open) {
    game.draw.line(x, 0, x, y, C.clawDark, 10);
    var spread = open ? 46 : 14;
    game.draw.line(x - spread, y, x, y + 60, C.claw, 14);
    game.draw.line(x + spread, y, x, y + 60, C.claw, 14);
    game.draw.circle(x, y, 20, C.clawDark);
    if (clawPhase === 'telegraph') {
      if (Math.floor(game.time.elapsed * 12) % 2 === 0) {
        game.draw.line(x, y + 60, x, FY1, C.gold, 4);
      }
    }
  }

  function newClawCycle() {
    clawTargetX = FX0 + Math.random() * (FX1 - FX0);
    clawX = clawTargetX;
    clawY = -40; clawPhase = 'telegraph'; clawT = 0.6;
  }

  function initGame() {
    px = W * 0.5; py = (FY0 + FY1) / 2;
    survived = 0; done = false; endWait = 0; finished = false; grabbed = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newClawCycle();
  }

  function moveTo(x, y) {
    if (done || ready > 0 || hitStop > 0 || finished) return;
    px = Math.max(FX0 + 30, Math.min(FX1 - 30, x));
    py = Math.max(FY0 + 30, Math.min(FY1 - 30, y));
  }

  function onGrab() {
    hitStop = 0.35; shake = 0.3; grabbed = true;
    game.feedback.bad(px, py, { text: 'CAUGHT' });
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { if (state === S.PLAYING) { game.audio.play('se_tap', 0.05); moveTo(x, y); } });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING) return;
    if (Math.random() < 0.04) game.audio.play('se_tap', 0.02);
    moveTo(x, y);
  });

  function stepClaw(dt) {
    clawT -= dt;
    if (clawPhase === 'telegraph') {
      if (clawT <= 0) { clawPhase = 'drop'; }
    } else if (clawPhase === 'drop') {
      clawY += dt * 900;
      if (clawY >= FY0 + 60) {
        clawY = FY0 + 60;
        var d = Math.hypot(px - clawX, py - clawY);
        if (d < 70) { onGrab(); return; }
        clawPhase = 'retreat';
      }
    } else if (clawPhase === 'retreat') {
      clawY -= dt * 700;
      if (clawY <= -40) { newClawCycle(); }
    }
  }

  // ── ATTRACT ゴースト実演: 実ロジックで1回逃げ切る ──
  var demo = { t: 0, gx: W * 0.5, gy: (FY0 + FY1) / 2, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { newClawCycle(); px = W * 0.5; py = (FY0 + FY1) / 2; }
    stepClaw(dt);
    // 実ロジック流用: クローが降りてきたら逆方向へ逃げる
    if (clawPhase === 'drop' || clawPhase === 'telegraph') {
      var away = px < clawX ? -1 : 1;
      var tx = Math.max(FX0 + 30, Math.min(FX1 - 30, px + away * 220 * dt * 2));
      px = tx;
    }
    demo.gx = px; demo.gy = py; demo.press = true;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (px === undefined) initGame();
      scene();
      stepDemo(dt);
      drawClaw(clawX, clawY, clawPhase !== 'drop');
      drawPlush(px, py, clawPhase === 'drop');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.10, 44, C.ink);
      txt('BEST ' + (game.best > 0 ? Math.round(game.best) + 's' : '-'), W / 2, H * 0.15, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 26, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      scene();
      drawClaw(clawX, Math.min(clawY, FY0 + 60), false);
      drawPlush(px, py, !ok);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.10, 50, ok ? C.good : C.bad);
      txt(survived.toFixed(1) + 's / ' + SURVIVE_T + 's', W / 2, H * 0.16, 30, C.gold);
      if (!ok) txt('あと' + Math.max(0.1, (SURVIVE_T - survived)).toFixed(1) + '秒!', W / 2, H * 0.21, 24, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { survived: Math.round(survived * 10) / 10 };
        if (ok) game.end.success(Math.round(survived * 10) / 10, stats); else game.end.failure(stats);
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      survived += dt;
      stepClaw(dt);
      if (Math.floor(survived) === 6 && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('6.0 / ' + SURVIVE_T, px, py - 90, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.4);
      }
      if (survived >= SURVIVE_T) { ok = true; finished = true; game.feedback.good(px, py, { text: 'ESCAPE!', color: C.good }); game.fx.burst(px, py, { color: C.gold, count: 20, speed: 380 }); finish(); }
    }
    if (shake > 0) shake -= dt;

    scene();
    drawClaw(clawX, clawY, clawPhase !== 'drop');
    if (!finished || ok) drawPlush(px, py, clawPhase === 'drop');

    txt(survived.toFixed(1) + ' / ' + SURVIVE_T, W / 2, H * 0.06, 30, C.ink);
    game.draw.rect(60, 100, W - 120, 14, C.boxEdge, 0.3);
    game.draw.rect(60, 100, (W - 120) * Math.min(1, survived / SURVIVE_T), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.50, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['C5', 0.3], ['G4', 0.3]], { tempo: 150, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
