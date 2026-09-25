// D-20132016-0020-vault-dial-turn.js
// ヴォールトダイヤル — 円を描くように指でダイヤルを回し、光る刻印に合わせて封印を解いていく
// 操作: ダイヤルの縁を指でなぞるように円を描いて回し、光る刻印の位置に針を合わせて静止させる
// 終わり: 規定数の刻印を全て合わせれば成功。制限時間内に合わせきれなければ失敗
// @mechanic: rotate_gesture
// @theme: sealed_vault_dial
// 世界観: 古い金庫室に埋め込まれた多重ダイヤル錠。光る刻印の位置に針を合わせて回し続け、封印を一つずつ解いていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせた刻印数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 木目・フェルト・光沢ボタン、gradient で厚みを作る
  var C = {
    bg1: '#3a2a1a', bg2: '#1e140c', dialFace: '#c9a25a', dialEdge: '#8a6a34',
    dialDark: '#7a5c2c', notch: '#4a3a20', mark: '#ffd76a', needle: '#7a1414',
    good: '#4dbf6a', bad: '#c0392b', gold: '#ffd76a', white: '#f2e6cf', ink: '#241608',
  };

  var GAME_TITLE = 'VAULT DIAL';
  var TARGETS = 4;
  var MAX_TIME = 14;
  var CX = W * 0.5, CY = H * 0.46;
  var DR = 300;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var solved, dialAngle, targetAngle, settle, timeLeft, done, endWait, finished;
  var ready, hitStop, shake, pressing, lastAngle, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 8; i++) game.draw.rect(0, i * H / 8, W, 2, '#00000018');
    game.draw.rect(0, 0, W, H, '#ffffff', pulse);
  }

  function angleOf(x, y) { return Math.atan2(y - CY, x - CX); }
  function norm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }

  function newTarget() { targetAngle = game.random(-Math.PI, Math.PI); settle = 0; }

  function initGame() {
    solved = 0; dialAngle = 0; timeLeft = MAX_TIME; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; pressing = false; lastAngle = 0; milestoneShown = false;
    newTarget();
  }

  function drawDial() {
    for (var r = DR; r > DR - 30; r -= 6) game.draw.circle(CX, CY, r, C.dialEdge, 0.5);
    game.draw.circle(CX, CY, DR - 30, C.dialFace);
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2;
      game.draw.line(CX + Math.cos(a) * (DR - 40), CY + Math.sin(a) * (DR - 40), CX + Math.cos(a) * (DR - 60), CY + Math.sin(a) * (DR - 60), C.notch, 4);
    }
    // 目標刻印
    var glow = 0.6 + 0.4 * Math.sin(game.time.elapsed * 6);
    game.draw.circle(CX + Math.cos(targetAngle) * (DR - 70), CY + Math.sin(targetAngle) * (DR - 70), 24, C.mark, glow);
    // 針
    game.draw.line(CX, CY, CX + Math.cos(dialAngle) * (DR - 55), CY + Math.sin(dialAngle) * (DR - 55), C.needle, 10);
    game.draw.circle(CX, CY, 24, C.dialDark);
    var kbob = Math.sin(game.time.elapsed * 2.6) * 3;
    game.draw.sprite(['.#.', '###', '.#.', '.#.'], { '#': C.ink }, CX, CY + kbob, 6, { anchor: 'center' });
  }

  function onRotateInput(x, y) {
    if (!pressing) return;
    var a = angleOf(x, y);
    var diff = norm(a - lastAngle);
    dialAngle = norm(dialAngle + diff);
    lastAngle = a;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || done || finished || ready > 0) return;
    pressing = true; lastAngle = angleOf(x, y);
    game.audio.play('se_tap', 0.05);
  });
  game.onMove(function(x, y) { if (state === S.PLAYING) onRotateInput(x, y); });
  game.onRelease(function() { pressing = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function tickAlign(dt) {
    if (done || finished) return;
    var d = Math.abs(norm(dialAngle - targetAngle));
    if (d < 0.22) {
      settle += dt;
      if (settle >= 0.35) {
        solved++;
        hitStop = 0.1;
        game.feedback.good(CX + Math.cos(targetAngle) * (DR - 70), CY + Math.sin(targetAngle) * (DR - 70), { text: 'GOOD', color: C.good });
        game.fx.burst(CX, CY, { color: C.gold, count: 16, speed: 300 });
        game.audio.play('se_powerup', 0.5);
        if (solved === Math.ceil(TARGETS / 2)) { game.fx.popup(solved + ' / ' + TARGETS, CX, H * 0.2, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.4); }
        if (solved >= TARGETS) { ok = true; finished = true; game.audio.play('se_success', 0.5); finish(); return; }
        newTarget();
      }
    } else settle = 0;
  }

  var demo = { t: 0, gx: CX + DR - 40, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) { initGame(); }
    var diff = norm(targetAngle - dialAngle);
    var step = Math.max(-2.4 * dt, Math.min(2.4 * dt, diff * 2.2));
    dialAngle = norm(dialAngle + step);
    demo.gx = CX + Math.cos(dialAngle) * (DR - 40);
    demo.gy = CY + Math.sin(dialAngle) * (DR - 40);
    demo.press = true;
    tickAlign(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (solved === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDial();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 42, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.13, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg(); drawDial();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(solved + ' / ' + TARGETS, W / 2, H * 0.13, 28, C.gold);
      if (!ok) txt('あと' + (TARGETS - solved) + '個!', W / 2, H * 0.18, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved, { solved: solved, targets: TARGETS });
        else game.end.failure({ solved: solved, targets: TARGETS });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      tickAlign(dt);
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.3;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.25;
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawDial();

    txt(solved + ' / ' + TARGETS, W / 2, H * 0.08, 30, C.white);
    game.draw.rect(60, H * 0.84, W - 120, 16, '#00000040');
    game.draw.rect(60, H * 0.84, (W - 120) * (timeLeft / MAX_TIME), 16, timeLeft < 3 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.68, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A2', 0.5], ['C3', 0.5], ['E3', 0.5], ['A3', 1]], { tempo: 96, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
