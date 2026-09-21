// K-DS-0002-campfire-call-turn.js
// 焚き火のかけ声 — 火の粉が自分の位置に巡ってきた瞬間に声を出すタイミングゲーム
// 操作: 輪になった仲間を巡る火の粉が自分(手前)の位置に来た瞬間にタップして声を出す
// 終わり: 規定回数(5回)続けて正しいタイミングで声を出せば成功。一度でも早すぎ/遅すぎれば失敗
// @mechanic: reaction_duel
// @theme: campfire_circle_call
// 世界観: 夜の焚き火を囲む輪。火の粉が仲間の間をぐるりと巡り、自分の番に来た刹那だけ声を上げて受け取る遊び
// 残るもの: 正誤(CLEAR/GAME OVER) + 成功した巡回数
// スタイル: 1BIT INK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 1BIT INK: ほぼ2階調の暗い紙面に、火の粉の一色だけが強く発光する
  var C = {
    bg: '#0b0b12', bg2: '#050508', ink: '#000000',
    friend: '#1c1c26', friendEdge: '#38384a',
    ember: '#ff8a3d', emberCore: '#ffe0a8', emberGlow: '#5a2a08',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f2f0ea',
  };

  var GAME_TITLE = 'CALL TURN';
  var TOTAL = 5;
  var N_SLOTS = 6;
  var CX = W * 0.5, CY = H * 0.42, R = W * 0.32;
  var WINDOW_T = 0.42;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FRIEND = ['.##.', '####', '.##.', '.##.'];

  function posAt(theta) {
    return { x: CX + R * Math.sin(theta), y: CY - R * Math.cos(theta) * 0.62 };
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.rect(0, H * 0.7 + i * 40, W, 2, '#ffffff05');
  }

  function drawCircle(theta, glowWin, playerLit) {
    for (var i = 0; i < N_SLOTS; i++) {
      var a = (i / N_SLOTS) * Math.PI * 2;
      var p = posAt(a);
      var isPlayer = i === 0;
      game.draw.circle(p.x, p.y, 60, C.friendEdge, isPlayer ? (playerLit ? 0.9 : 0.5) : 0.35);
      game.draw.sprite(FRIEND, { '#': isPlayer ? (playerLit ? C.gold : C.white) : C.friend }, p.x, p.y, 16, { anchor: 'center' });
    }
    // campfire center
    game.draw.circle(CX, CY, 34, C.emberGlow, 0.7);
    game.draw.circle(CX, CY, 18, C.ember, 0.8);
    // ember traveling
    var ep = posAt(theta);
    var mid = { x: (ep.x + CX) / 2, y: (ep.y + CY) / 2 };
    game.draw.circle(mid.x, mid.y, glowWin ? 26 : 18, C.ember, glowWin ? 0.9 : 0.6);
    game.draw.circle(mid.x, mid.y, glowWin ? 14 : 9, C.emberCore);
  }

  var round, lap, theta, win, resolved, done, endWait, finished, ready, hitStop, shake, flashPlayer;

  function lapDur() { return Math.max(0.85, 1.9 - round * 0.16); }

  function initGame() {
    round = 0; lap = 0; theta = 0; win = false; resolved = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; flashPlayer = null;
  }

  function windowFrac() { return Math.min(0.34, WINDOW_T / lapDur()); }

  function inWindow() {
    var half = windowFrac() / 2;
    var d = Math.abs(theta - Math.PI * 2);
    return d < half * Math.PI * 2 || theta > Math.PI * 2 - half * Math.PI * 2;
  }

  function callOut() {
    if (ready > 0 || done || finished || hitStop > 0) return;
    if (win && !resolved) {
      resolved = true;
      round++;
      hitStop = 0.12;
      flashPlayer = { ok: true, t: 0.2 };
      game.feedback.good(CX, CY, { text: 'CALL', color: C.good });
      game.fx.burst(posAt(Math.PI * 2 * 0 + Math.PI).x, posAt(Math.PI).y, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.35);
      if (round === Math.ceil(TOTAL / 2)) { game.fx.popup(round + ' / ' + TOTAL, CX, CY - 220, { color: C.gold, size: 38 }); game.audio.play('se_milestone', 0.3); }
      if (round >= TOTAL) { ok = true; finished = true; finish(); }
    } else {
      resolved = true;
      hitStop = 0.35;
      shake = 0.25;
      flashPlayer = { ok: false, t: 0.3 };
      game.feedback.bad(CX, CY, { text: 'MISS' });
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) callOut();
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepRound(dt) {
    var LAP = lapDur();
    theta += (Math.PI * 2 / LAP) * dt;
    win = inWindow();
    if (theta >= Math.PI * 2) {
      if (!resolved) {
        // missed the window entirely without tapping
        resolved = true; hitStop = 0.35; shake = 0.25;
        flashPlayer = { ok: false, t: 0.3 };
        game.feedback.bad(CX, CY, { text: 'MISS' });
        ok = false; finished = true; finish();
        return;
      }
      theta -= Math.PI * 2;
      resolved = false; win = false;
    }
  }

  var demo = { t: 0, gx: CX, gy: H * 0.86, press: false, theta: 0, resolved: false };
  function stepDemo(dt) {
    demo.t += dt;
    var LAP = 1.5;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { demo.theta = 0; demo.resolved = false; }
    demo.theta += (Math.PI * 2 / LAP) * dt;
    var half = Math.min(0.34, 0.42 / LAP) / 2;
    var win2 = demo.theta > Math.PI * 2 - half * Math.PI * 2;
    demo.press = false;
    if (win2 && !demo.resolved) {
      demo.resolved = true;
      demo.press = true;
      var pp = posAt(Math.PI);
      demo.gx = pp.x; demo.gy = pp.y;
      game.feedback.good(CX, CY, { text: 'CALL', color: C.good });
      game.audio.play('se_good', 0.2);
    }
    if (demo.theta >= Math.PI * 2) { demo.theta -= Math.PI * 2; demo.resolved = false; }
    theta = demo.theta;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      bg();
      stepDemo(dt);
      drawCircle(theta, demo.press, demo.press);
      game.draw.hand(demo.gx, demo.gy - 90, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawCircle(theta, false, false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 50, ok ? C.good : C.bad);
      txt(round + ' / ' + TOTAL, W / 2, H * 0.13, 32, C.gold);
      if (!ok && TOTAL - round <= 2) txt('あと' + (TOTAL - round) + '回!', W / 2, H * 0.18, 26, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(round, { round: round, total: TOTAL });
        else game.end.failure({ round: round, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepRound(dt);
    }
    if (flashPlayer) { flashPlayer.t -= dt; if (flashPlayer.t <= 0) flashPlayer = null; }
    if (shake > 0) shake -= dt;

    bg();
    drawCircle(theta, win, !!flashPlayer);
    if (flashPlayer) {
      var pp = posAt(Math.PI);
      game.draw.circle(pp.x, pp.y, 78, flashPlayer.ok ? C.good : C.bad, 0.4);
    }

    txt(round + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (round / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_dark', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
