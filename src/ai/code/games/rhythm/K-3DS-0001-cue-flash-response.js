// K-3DS-0001-cue-flash-response.js
// キューフラッシュレスポンス — 光った合図の形を見た瞬間、対応する方向へ即座にタップして返す
// 操作: 画面中央に光る合図(丸/三角/四角/菱形)を見て、決められた方向ゾーンを即タップする。合図は既出と新顔が混ざる
// 終わり: 規定回数(6回)すべて正しく即応できれば成功。誤反応か反応漏れが1回でもあれば失敗
// @mechanic: reaction_duel
// @theme: handheld_cue_response_booth
// 世界観: 小型の反射訓練ブース。次々光る合図の形を覚えたそばから、同じ合図が新顔と混ざって現れ、都度正しい方向へ即座に反応する
// 残るもの: 正誤(CLEAR/GAME OVER) + 即応できた回数
// スタイル: 90s HANDHELD COLOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s HANDHELD COLOR: 淡いグレー筐体風、彩度低めのボタン色、小さめ画面感
  var C = {
    bg: '#d8dce0', bg2: '#c0c6cc', screen: '#eef2f0', screenEdge: '#9aa4ac',
    cue: '#4a6cff', good: '#3ecf7e', bad: '#ff5a5a',
    gold: '#f0a830', white: '#20242a', ink: '#f4f6f8',
  };

  var GAME_TITLE = 'CUE FLASH';
  var ROUNDS = 6;
  var CX = W * 0.5, CY = H * 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  // 合図の形 → 対応ゾーン方向。序盤は2種類、後半に4種類まで混ざる
  var SHAPES = ['circle', 'triangle', 'square', 'diamond'];
  var SHAPE_DIR = { circle: 'up', triangle: 'right', square: 'down', diamond: 'left' };
  var CUE_CIRCLE = ['.###.', '#...#', '#...#', '#...#', '.###.'];
  var CUE_TRIANGLE = ['..#..', '.###.', '.###.', '#####', '#####'];
  var CUE_SQUARE = ['#####', '#...#', '#...#', '#...#', '#####'];
  var CUE_DIAMOND = ['..#..', '.#.#.', '#...#', '.#.#.', '..#..'];
  var CUE_SPRITE = { circle: CUE_CIRCLE, triangle: CUE_TRIANGLE, square: CUE_SQUARE, diamond: CUE_DIAMOND };

  var ZONE_POS = {
    up: { x: CX, y: H * 0.24 },
    down: { x: CX, y: H * 0.60 },
    left: { x: W * 0.22, y: H * 0.42 },
    right: { x: W * 0.78, y: H * 0.42 },
  };

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(CX - 320, H * 0.18, 640, H * 0.48, C.screenEdge, 1);
    game.draw.rect(CX - 300, H * 0.19, 600, H * 0.46, C.screen, 1);
    // 常時アニメ(ATTRACTが静止して見えないようにする明滅)
    var pulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 2.1);
    game.draw.rect(0, 0, W, H, C.cue, 0.015 + 0.03 * pulse);
  }

  var RP = { wait: 0, go: 1, resolved: 2 };
  var round, cleared, roundPhase, phaseT, curShape, curDur, unlocked;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function initGame() {
    round = 0; cleared = 0; unlocked = 2;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; milestoneShown = false;
    newRound();
  }

  function newRound() {
    unlocked = round < 2 ? 2 : (round < 4 ? 3 : 4);
    curShape = SHAPES[Math.floor(game.random(0, unlocked))];
    curDur = Math.max(0.55, 0.85 - round * 0.03);
    roundPhase = RP.wait; phaseT = game.random(0.4, 0.8);
  }

  function respond(dir) {
    if (done || ready > 0 || finished || roundPhase !== RP.go) return;
    roundPhase = RP.resolved;
    var correct = dir === SHAPE_DIR[curShape];
    hitStop = correct ? 0.08 : 0.32;
    if (correct) {
      cleared++;
      game.feedback.good(ZONE_POS[dir].x, ZONE_POS[dir].y, { text: 'GOOD', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 12, speed: 280 });
      game.audio.play('se_good', 0.4);
      if (!milestoneShown && cleared >= Math.ceil(ROUNDS / 2)) {
        milestoneShown = true;
        game.fx.popup('HALFWAY!', CX, H * 0.16, { color: C.gold, size: 36 });
        game.audio.play('se_milestone', 0.35);
      }
      if (cleared >= ROUNDS) { ok = true; finished = true; finish(); return; }
      round++;
      newRound();
    } else {
      game.feedback.bad(CX, CY, { text: 'MISS' });
      shake = 0.25;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state !== S.PLAYING) return;
    var best = null, bd = 999;
    for (var k in ZONE_POS) {
      var d = Math.hypot(x - ZONE_POS[k].x, y - ZONE_POS[k].y);
      if (d < bd) { bd = d; best = k; }
    }
    if (best) respond(best);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawZones(flashDir) {
    for (var k in ZONE_POS) {
      var p = ZONE_POS[k];
      var lit = flashDir === k;
      game.draw.circle(p.x, p.y, 78, lit ? C.gold : '#00000015', lit ? 0.9 : 1);
      game.draw.circle(p.x, p.y, 60, lit ? C.good : C.cue, lit ? 1 : 0.35);
    }
  }

  function drawCue(shape, active) {
    if (!shape) return;
    game.draw.circle(CX, CY, 100, C.cue, active ? 0.25 : 0.12);
    game.draw.sprite(CUE_SPRITE[shape], { '#': active ? C.gold : C.cue }, CX, CY, 20, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: H * 0.85, press: false, shape: 'circle', phase: 'wait', pt: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { demo.shape = SHAPES[Math.floor(demo.t / 2.6) % 4]; demo.phase = 'wait'; demo.pt = 0; demo.press = false; demo.gx = CX; demo.gy = H * 0.85; }
    demo.pt += dt;
    if (demo.phase === 'wait' && demo.pt > 0.7) { demo.phase = 'go'; demo.pt = 0; }
    else if (demo.phase === 'go' && demo.pt > 0.12 && !demo.did) {
      demo.did = true;
      var dir = SHAPE_DIR[demo.shape];
      demo.gx = ZONE_POS[dir].x; demo.gy = ZONE_POS[dir].y;
      demo.press = true;
      game.feedback.good(demo.gx, demo.gy, { text: 'GOOD', color: C.good });
      game.audio.play('se_good', 0.2);
    } else if (demo.phase === 'go' && demo.pt > 0.45) {
      demo.phase = 'done'; demo.press = false; demo.did = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawZones(demo.phase === 'go' || demo.phase === 'done' ? SHAPE_DIR[demo.shape] : null);
      drawCue(demo.shape, demo.phase !== 'wait');
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 22 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 36, C.gold);
      } else {
        txt('TAP TO START', W / 2, H * 0.92, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawZones(null);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (ROUNDS - cleared) + '回!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: ROUNDS });
        else game.end.failure({ cleared: cleared, total: ROUNDS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      phaseT -= dt;
      if (roundPhase === RP.wait && phaseT <= 0) {
        roundPhase = RP.go; phaseT = 0.62;
        game.audio.play('se_tap', 0.12);
      } else if (roundPhase === RP.go && phaseT <= 0) {
        roundPhase = RP.resolved;
        finished = true; ok = false; hitStop = 0.32;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.25;
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawZones(roundPhase === RP.go ? SHAPE_DIR[curShape] : null);
    drawCue(roundPhase !== RP.wait ? curShape : null, roundPhase === RP.go);

    txt(cleared + ' / ' + ROUNDS, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(90, 150, W - 180, 14, '#00000020', 1);
    game.draw.rect(90, 150, (W - 180) * (cleared / ROUNDS), 14, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.76, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
