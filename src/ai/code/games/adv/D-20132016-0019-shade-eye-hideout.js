// D-20132016-0019-shade-eye-hideout.js
// シェイドハイド — 影に沈んだ廃墟を進む小さな影法師が、見張りの目が来た瞬間だけ指を押さえ続けて息を潜める
// 操作: 見張りの目が光る直前に指を画面に押し当て、目が去るまで離さず潜み続ける
// 終わり: 規定回数すべて見つからずやり過ごせば成功。目が来た瞬間に指を離していれば失敗
// @mechanic: freeze
// @theme: ruined_shadow_hideout
// 世界観: 影に沈んだ廃墟を進む小さな影法師。徘徊する見張りの目に照らされる瞬間だけ息を潜め、見つからずに奥へ進む
// 残るもの: 正誤(CLEAR/GAME OVER) + やり過ごした回数
// スタイル: 70s MONO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 70s MONO: 白ドット + カラーセロハンの帯
  var C = {
    bg1: '#141414', bg2: '#050505', ruin: '#2a2a2a', ruinDark: '#1a1a1a',
    eye: '#ff3344', eyeDim: '#5a1018', shadow: '#e8e8e8',
    good: '#e8e8e8', bad: '#ff3344', gold: '#ffe08a', white: '#f0f0f0', ink: '#000000',
  };

  var GAME_TITLE = 'SHADE HIDE';
  var TOTAL = 4;
  var CX = W * 0.5, CY = H * 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var cleared, holding, done, endWait, finished;
  var ready, hitStop, shake, round, gaze;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 5; i++) game.draw.rect(W * 0.1 + i * W * 0.2, H * 0.62, 60, H * 0.2, C.ruinDark);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  // gaze phase: 'wait' -> 'telegraph'(0.6s) -> 'active'(1.0s) -> 完了で次round or 判定
  function newGaze() { return { phase: 'wait', t: Math.max(0.7, 1.5 - round * 0.08) }; }

  function initGame() {
    cleared = 0; holding = false; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; gaze = newGaze();
  }

  function drawShadow() {
    var bob = holding ? 0 : Math.sin(game.time.elapsed * 3) * 6;
    var sway = holding ? 0 : Math.cos(game.time.elapsed * 2.1) * 5;
    var scale = holding ? 10 : 14;
    var frame = holding ? ['.##.', '####', '.##.'] : (Math.floor(game.time.elapsed * 3) % 2 === 0 ? ['.##.', '####', '.##.', '#..#'] : ['.##.', '####', '.##.', '.##.']);
    game.draw.circle(CX + sway, CY + 60 + bob, holding ? 30 : 40, '#00000060');
    game.draw.sprite(frame, { '#': C.shadow }, CX + sway, CY + bob, scale, { anchor: 'center' });
  }

  function drawGaze() {
    if (gaze.phase === 'wait') return;
    var col = gaze.phase === 'telegraph' ? C.eyeDim : C.eye;
    var r = gaze.phase === 'telegraph' ? 140 : 220;
    var blink = gaze.phase === 'telegraph' ? (Math.floor(game.time.elapsed * 8) % 2 === 0) : true;
    if (blink) {
      game.draw.circle(CX, CY, r, col, gaze.phase === 'active' ? 0.30 : 0.18);
      game.draw.sprite(['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], { '#': col }, CX, H * 0.18, 14, { anchor: 'center' });
    }
  }

  function resolveRoundSuccess() {
    cleared++;
    hitStop = 0.1;
    game.feedback.good(CX, CY, { text: 'GOOD', color: C.good });
    game.audio.play('se_good', 0.4);
    if (cleared === Math.ceil(TOTAL / 2)) { game.fx.popup(cleared + ' / ' + TOTAL, CX, H * 0.3, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
    if (cleared >= TOTAL) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); return; }
    round++;
    gaze = newGaze();
  }

  function caught(px, py) {
    if (finished || done) return;
    hitStop = 0.35;
    game.feedback.bad(px, py, { text: 'MISS' });
    shake = 0.3;
    game.audio.play('se_bad', 0.4);
    ok = false; finished = true; finish();
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    holding = true;
    game.audio.play('se_tap', 0.06);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || done || finished || ready > 0) { holding = false; return; }
    holding = false;
    if (gaze.phase === 'active') caught(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (!ok) game.audio.play('se_failure', 0.5);
    endWait = 1.3;
  }

  function tickGaze(dt) {
    if (done || finished) return;
    gaze.t -= dt;
    if (gaze.phase === 'wait' && gaze.t <= 0) { gaze.phase = 'telegraph'; gaze.t = 0.6; }
    else if (gaze.phase === 'telegraph' && gaze.t <= 0) { gaze.phase = 'active'; gaze.t = 0.9; }
    else if (gaze.phase === 'active') {
      if (!holding) { caught(CX, CY); return; }
      if (gaze.t <= 0) { resolveRoundSuccess(); }
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    tickGaze(dt);
    var wantHold = gaze.phase === 'telegraph' || gaze.phase === 'active';
    demo.press = wantHold;
    if (wantHold && !holding) holding = true;
    if (!wantHold && holding) holding = false;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (cleared === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGaze();
      drawShadow();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.11, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawShadow();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 46, ok ? C.good : C.bad);
      txt(cleared + ' / ' + TOTAL, W / 2, H * 0.11, 28, C.gold);
      if (!ok) txt('あと' + (TOTAL - cleared) + '回!', W / 2, H * 0.16, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(cleared, { cleared: cleared, total: TOTAL });
        else game.end.failure({ cleared: cleared, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      tickGaze(dt);
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGaze();
    drawShadow();

    txt(cleared + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, H * 0.90, W - 120, 16, '#00000040');
    game.draw.rect(60, H * 0.90, (W - 120) * (cleared / TOTAL), 16, C.gold);
    txt(holding ? 'GOOD' : '', W / 2, H * 0.96, 22, C.good);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.6], ['F3', 0.6], ['A3', 0.6], ['D4', 1.2]], { tempo: 84, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
