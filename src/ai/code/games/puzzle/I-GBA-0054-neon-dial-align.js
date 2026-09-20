// I-GBA-0054-neon-dial-align.js
// ネオンダイヤルアライン — 指で円を描くようにダイヤルを回し、示された向きにぴったり合わせる
// 操作: ダイヤル中心の周りを指でなぞって回し、光る目標マークの向きに針を合わせて少し保つ
// 終わり: 規定回数(5回)合わせきれば成功。時間切れの回が出れば失敗
// @mechanic: rotate_gesture
// @theme: neon_vault_dial
// 世界観: 夜の金庫室に浮かぶ発光ダイヤル。円を描く指の動きで針を回し、示された向きにぴったり合わせて解錠していく錠前師
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせきれた回数
// スタイル: 80s NEON

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s NEON: 黒背景に発光する原色ライン、太いネオン管の縁取り
  var C = {
    bg: '#0a0018', bg2: '#160028', ring: '#2a1050', ringGlow: '#4a1878',
    needle: '#00e5ff', target: '#ff2e88', targetGlow: '#7a1042',
    good: '#39ff6a', bad: '#ff3355', gold: '#ffe600', white: '#ffffff', ink: '#050008',
  };

  var GAME_TITLE = 'DIAL ALIGN';
  var TOTAL = 5;
  var CX = W * 0.5, CY = H * 0.42, DIAL_R = 320;
  var TOL = 0.24; // ラジアン(約14度)
  var HOLD_NEED = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var NEEDLE_SPR = ['.#.', '.#.', '###'];

  function angDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  var round, targetAngle, pointerAngle, matchTimer, roundT, roundDur, holding;
  var solved, done, endWait, finished;
  var ready, hitStop, shake, halfShown;

  function newRound() {
    targetAngle = game.random(0, Math.PI * 2);
    pointerAngle = targetAngle + Math.PI + game.random(-0.6, 0.6);
    matchTimer = 0; roundT = 0;
    roundDur = Math.max(2.0, 3.2 - round * 0.2);
  }

  function initGame() {
    round = 0; solved = 0; newRound(); holding = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 5; i++) game.draw.circle(CX, CY, DIAL_R + 40 + i * 26, C.ringGlow, 0.04);
  }

  function drawDial(warn) {
    game.draw.circle(CX, CY, DIAL_R, C.ring);
    game.draw.circle(CX, CY, DIAL_R - 14, C.bg2);
    // 目標ゾーン(許容範囲を扇で表示)
    var tx1 = CX + Math.cos(targetAngle - TOL) * DIAL_R, ty1 = CY + Math.sin(targetAngle - TOL) * DIAL_R;
    var tx2 = CX + Math.cos(targetAngle + TOL) * DIAL_R, ty2 = CY + Math.sin(targetAngle + TOL) * DIAL_R;
    game.draw.line(CX, CY, tx1, ty1, C.targetGlow, 3);
    game.draw.line(CX, CY, tx2, ty2, C.targetGlow, 3);
    var tcol = warn ? C.bad : C.target;
    game.draw.circle(CX + Math.cos(targetAngle) * DIAL_R, CY + Math.sin(targetAngle) * DIAL_R, 20, tcol);
    game.draw.line(CX, CY, CX + Math.cos(targetAngle) * (DIAL_R - 20), CY + Math.sin(targetAngle) * (DIAL_R - 20), tcol, 6);
    // 現在針
    var nx = CX + Math.cos(pointerAngle) * (DIAL_R - 60);
    var ny = CY + Math.sin(pointerAngle) * (DIAL_R - 60);
    var matched = Math.abs(angDiff(pointerAngle, targetAngle)) < TOL;
    game.draw.line(CX, CY, nx, ny, matched ? C.good : C.needle, 10);
    game.draw.circle(CX, CY, 22, C.needle);
    game.draw.sprite(NEEDLE_SPR, { '#': matched ? C.good : C.needle }, nx, ny, 10, { anchor: 'center' });
    if (matched) game.draw.circle(CX, CY, DIAL_R + 6, C.good, 0.15 + 0.1 * Math.sin(game.time.elapsed * 12));
  }

  function resolveMatch() {
    solved++;
    hitStop = 0.1;
    game.feedback.good(CX, CY, { text: 'LOCK', color: C.good });
    game.fx.burst(CX + Math.cos(targetAngle) * DIAL_R, CY + Math.sin(targetAngle) * DIAL_R, { color: C.gold, count: 16, speed: 320 });
    game.audio.play('se_good', 0.4);
    if (!halfShown && solved >= Math.ceil(TOTAL / 2)) {
      halfShown = true;
      game.fx.popup('HALFWAY!', CX, CY - DIAL_R - 40, { color: C.gold, size: 36 });
      game.audio.play('se_milestone', 0.4);
    }
    if (solved >= TOTAL) { ok = true; finished = true; finish(); return; }
    round++;
    newRound();
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (Math.hypot(x - CX, y - CY) < 40) { game.fx.burst(x, y, { color: C.needle, count: 3, speed: 40 }); return; }
    holding = true;
    pointerAngle = Math.atan2(y - CY, x - CX);
    game.audio.play('se_tap', 0.1);
  });
  game.onMove(function(x, y) {
    if (!holding || state !== S.PLAYING || ready > 0 || finished) return;
    pointerAngle = Math.atan2(y - CY, x - CX);
  });
  game.onRelease(function(x, y) {
    if (holding) {
      holding = false;
      game.fx.burst(x, y, { color: C.needle, count: 4, speed: 60 });
    }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) { round = 0; solved = 0; newRound(); }
    var p = Math.min(1, cyc / 2.4);
    pointerAngle = (pointerAngle === undefined ? targetAngle + Math.PI : pointerAngle);
    var startA = targetAngle + Math.PI;
    var a = startA + angDiff(targetAngle, startA) * Math.min(1, p * 1.3);
    pointerAngle = a;
    demo.gx = CX + Math.cos(a) * (DIAL_R - 60);
    demo.gy = CY + Math.sin(a) * (DIAL_R - 60);
    demo.press = true;
    if (Math.abs(angDiff(pointerAngle, targetAngle)) < TOL) {
      matchTimer += dt;
      if (matchTimer >= HOLD_NEED) { solved++; round++; newRound(); }
    } else matchTimer = 0;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetAngle === undefined) initGame();
      bg();
      stepDemo(dt);
      drawDial(false);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.93, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.93, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawDial(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(solved + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - solved) + '回!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.93, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(solved, { solved: solved, total: TOTAL });
        else game.end.failure({ solved: solved, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundT += dt;
      if (Math.abs(angDiff(pointerAngle, targetAngle)) < TOL) {
        matchTimer += dt;
        if (matchTimer >= HOLD_NEED) resolveMatch();
      } else {
        matchTimer = 0;
      }
      if (!finished && roundT >= roundDur) {
        hitStop = 0.35; shake = 0.25;
        game.feedback.bad(CX, CY, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    var warn = !finished && (roundDur - roundT) < 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0;
    drawDial(warn);

    txt(solved + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * Math.max(0, 1 - roundT / roundDur), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.86, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.25], ['D#4', 0.25], ['G4', 0.25], ['D#4', 0.25]], { tempo: 150, wave: 'sawtooth', volume: 0.055, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
