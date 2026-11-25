// I-3DS-0006-valve-align-turn.js
// バルブアライン — 円を描いて指でバルブを回し、示された矢印の向きにぴったり合わせる
// 操作: バルブの上で指を円を描くように動かして回転させ、示された矢印の角度に合わせて指を離す
// 終わり: 規定回数(3回)すべて許容角度内で止めれば成功。1回でも外せば失敗
// @mechanic: rotate_gesture
// @theme: pipe_valve_alignment
// 世界観: 地下水路の配管室。示された矢印の向きに合わせてバルブを回し切る整備士。合わせ損なえば水が噴き出す
// 残るもの: 正誤(CLEAR/GAME OVER) + 合わせ切った本数
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit PC MONITOR: 緑/琥珀の蛍光文字風、走査線、荒いドット
  var C = {
    bg: '#081008', bg2: '#040a04', screen: '#0c1c0c', screenEdge: '#1a3a1a',
    valve: '#2a4a2a', valveRing: '#3fae3f', target: '#ffb000', targetDim: '#7a5800',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#c8ffc8', ink: '#020602',
  };

  var GAME_TITLE = 'VALVE ALIGN';
  var TOTAL = 3;
  var CX = W * 0.5, CY = H * 0.46, R = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  var aligned, done, endWait, finished;
  var ready, hitStop, shake;
  var round, valveAng, targetAng, tol, turning, lastPointerAng;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var MECH_SPRITE = ['.##.', '####', '.##.', '#.##'];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    game.draw.rect(W * 0.06, H * 0.14, W * 0.88, H * 0.62, C.screenEdge);
    game.draw.rect(W * 0.08, H * 0.16, W * 0.84, H * 0.58, C.screen);
    for (var i = 0; i < 40; i++) game.draw.rect(W * 0.08, H * 0.16 + i * ((H * 0.58) / 40), W * 0.84, 1, '#00ff0006');
  }

  function newRound(r) {
    targetAng = game.random(0, Math.PI * 2);
    tol = Math.max(0.16, 0.34 - r * 0.06);
    turning = false;
  }

  function initGame() {
    aligned = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    round = 0; valveAng = 0;
    newRound(0);
  }

  function angDiff(a, b) {
    var d = (a - b) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }

  function pointerAngle(x, y) { return Math.atan2(y - CY, x - CX); }

  function onValvePress(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var dist = Math.hypot(x - CX, y - CY);
    if (dist < 60 || dist > R + 60) {
      game.fx.burst(x, y, { color: C.bad, count: 5, speed: 120 });
      game.audio.play('se_tap', 0.03);
      return;
    }
    turning = true;
    lastPointerAng = pointerAngle(x, y);
    game.fx.burst(x, y, { color: C.valveRing, count: 8, speed: 160 });
    game.audio.play('se_tap', 0.08);
  }

  function onValveMove(x, y) {
    if (!turning || state !== S.PLAYING) return;
    var a = pointerAngle(x, y);
    var d = a - lastPointerAng;
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    valveAng += d;
    lastPointerAng = a;
    if (Math.random() < 0.15) {
      game.fx.burst(x, y, { color: C.valveRing, count: 3, speed: 90 });
      game.audio.play('se_tap', 0.02);
    }
  }

  function onValveRelease() {
    if (!turning || state !== S.PLAYING) return;
    turning = false;
    var diff = angDiff(valveAng, targetAng);
    var success = diff <= tol;
    var tip = { x: CX + Math.cos(targetAng) * (R - 40), y: CY + Math.sin(targetAng) * (R - 40) };
    if (success) {
      aligned++;
      hitStop = 0.12;
      game.feedback.good(tip.x, tip.y, { text: 'PERFECT', color: C.good });
      game.fx.burst(tip.x, tip.y, { color: C.gold, count: 16, speed: 340 });
      game.audio.play('se_powerup', 0.4);
      if (aligned === Math.ceil(TOTAL / 2)) game.fx.popup('HALFWAY!', CX, CY - R - 40, { color: C.gold, size: 40 });
      if (aligned >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      newRound(round);
      valveAng = 0;
      ready = 0.3;
    } else {
      hitStop = 0.35;
      game.feedback.bad(tip.x, tip.y, { text: 'MISS' });
      shake = 0.3;
      game.audio.play('se_bad', 0.4);
      ok = false; finished = true; finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) { game.audio.play('se_tap', 0.02); onValvePress(x, y); });
  game.onMove(function(x, y) { if (Math.random() < 0.2) game.fx.burst(x, y, { color: C.valveRing, count: 2, speed: 60 }); onValveMove(x, y); });
  game.onRelease(function(x, y) { game.audio.play('se_tap', 0.02); onValveRelease(); });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function drawValve() {
    game.draw.circle(CX, CY, R + 14, C.valveRing, 0.4);
    // 許容ゾーンの弧
    var segs = 18;
    for (var i = 0; i < segs; i++) {
      var t = i / (segs - 1);
      var a = targetAng - tol + t * (tol * 2);
      var px = CX + Math.cos(a) * (R - 40);
      var py = CY + Math.sin(a) * (R - 40);
      game.draw.circle(px, py, 10, C.targetDim);
    }
    var tx = CX + Math.cos(targetAng) * (R - 40);
    var ty = CY + Math.sin(targetAng) * (R - 40);
    game.draw.circle(tx, ty, 16, C.target);
    // バルブ本体: 十字型のハンドル
    game.draw.circle(CX, CY, 70, C.valve);
    var a1 = valveAng, a2 = valveAng + Math.PI / 2;
    var arms = [a1, a1 + Math.PI, a2, a2 + Math.PI];
    for (var j = 0; j < arms.length; j++) {
      var ex = CX + Math.cos(arms[j]) * 130;
      var ey = CY + Math.sin(arms[j]) * 130;
      game.draw.line(CX, CY, ex, ey, C.valveRing, 22);
      game.draw.circle(ex, ey, 16, C.valveRing);
    }
    game.draw.circle(CX, CY, 30, C.ink);
    game.draw.circle(CX, CY, 20, C.valveRing);
    game.draw.sprite(MECH_SPRITE, { '#': C.white }, CX, CY + R * 0.62, 14, { anchor: 'center' });
  }

  var demo = { t: 0, gx: CX, gy: CY - 130, press: false, ang: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      round = 0; newRound(0); targetAng = Math.PI * 0.6; tol = 0.3; valveAng = 0; demo.ang = 0;
    }
    var p = Math.min(1, cyc / 2.2);
    demo.ang = targetAng * p;
    valveAng = demo.ang;
    demo.press = cyc < 2.3;
    var handR = 130;
    demo.gx = CX + Math.cos(demo.ang - Math.PI / 2) * handR;
    demo.gy = CY + Math.sin(demo.ang - Math.PI / 2) * handR;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (round === undefined) initGame();
      bg();
      stepDemo(dt);
      drawValve();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 38, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 26, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawValve();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 48, ok ? C.good : C.bad);
      txt(aligned + ' / ' + TOTAL, W / 2, H * 0.13, 30, C.gold);
      if (!ok) txt('あと' + (TOTAL - aligned) + '本!', W / 2, H * 0.18, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(aligned, { aligned: aligned, total: TOTAL });
        else game.end.failure({ aligned: aligned, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    }
    if (shake > 0) shake -= dt;

    bg();
    drawValve();

    txt(aligned + ' / ' + TOTAL, W / 2, H * 0.06, 30, C.white);
    game.draw.rect(60, 150, W - 120, 16, C.ink, 0.5);
    game.draw.rect(60, 150, (W - 120) * (aligned / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.80, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.4], ['G4', 0.4], ['B4', 0.4], ['E5', 0.8]], { tempo: 128, wave: 'square', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
