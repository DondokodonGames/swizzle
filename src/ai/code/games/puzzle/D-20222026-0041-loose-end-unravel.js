// D-20222026-0041-loose-end-unravel.js
// ルーズエンド・アンラベル — 絡んだ結び目の中で今だけ緩んでいる端を見つけ、順につまんで引き抜く
// 操作: 結び目の周りでかすかに揺れている端だけを見つけてタップし、順に引き抜いてほどく
// 終わり: 全ての端を正しい順に引き抜けば成功。揺れていない端に触れる/時間切れは失敗
// @mechanic: spot
// @theme: loose_end_unravel
// 世界観: 荷造り場で絡んだ結び目を任された係が、今だけ緩んでいる端をその都度見つけ出し、順につまんで引き抜いてほどく
// 残るもの: 正誤(CLEAR/GAME OVER) + 引き抜いた数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#241c30', bg2: '#141020', knot: '#4a3a5a', string: '#8a7aa0', stringDim: '#5a4e70',
    active: '#ffd24d', good: '#8ac878', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f0eaf8',
  };

  var GAME_TITLE = 'LOOSE END';
  var MAX_TIME = 13;
  var NEEDED = 5;
  var CX = W * 0.5, CY = H * 0.44, KNOT_R = 90, END_R = 340;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0810', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var HAND_S = ['.##.', '####', '.##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.14);
  }

  var strands, activeIdx, pulled, roundClock, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    strands = [];
    var order = [];
    for (var i = 0; i < NEEDED; i++) order.push(i);
    for (var i2 = 0; i2 < NEEDED; i2++) {
      var ang = (i2 / NEEDED) * Math.PI * 2 + game.random(-0.15, 0.15);
      strands.push({ ang: ang, alive: true });
    }
    activeIdx = 0; pulled = 0; roundClock = 0; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function endPos(s) { return { x: CX + Math.cos(s.ang) * END_R, y: CY + Math.sin(s.ang) * END_R * 0.62 }; }

  function drawScene() {
    bg();
    game.draw.circle(CX, CY, KNOT_R, C.knot);
    for (var i = 0; i < strands.length; i++) {
      var s = strands[i];
      if (!s.alive) continue;
      var p = endPos(s);
      var isActive = i === activeIdx;
      var wig = isActive ? Math.sin(game.time.elapsed * 8) * 14 : 0;
      var ex = p.x + Math.cos(s.ang + Math.PI / 2) * wig;
      var ey = p.y + Math.sin(s.ang + Math.PI / 2) * wig;
      game.draw.line(CX, CY, ex, ey, isActive ? C.string : C.stringDim, isActive ? 8 : 6);
      var glow = isActive ? 0.4 + 0.3 * Math.sin(game.time.elapsed * 8) : 0;
      if (glow > 0) game.draw.circle(ex, ey, 44, C.active, glow);
      game.draw.circle(ex, ey, 26, isActive ? C.active : C.stringDim);
    }
    game.draw.sprite(HAND_S, { '#': '#c8b8e0' }, CX, CY - KNOT_R - 60, 12, { anchor: 'center' });
  }

  function tryPull(x, y) {
    var hit = -1;
    for (var i = 0; i < strands.length; i++) {
      var s = strands[i];
      if (!s.alive) continue;
      var p = endPos(s);
      if (Math.hypot(x - p.x, y - p.y) < 60) { hit = i; break; }
    }
    if (hit < 0) { game.audio.play('se_tap', 0.1); return; }
    if (hit !== activeIdx) {
      finished = true; ok = false; hitStop = 0.35; shake = 0.3;
      var pp = endPos(strands[hit]);
      game.feedback.bad(pp.x, pp.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.4);
      finish();
      return;
    }
    strands[hit].alive = false;
    pulled += 1;
    var pos = endPos(strands[hit]);
    game.feedback.good(pos.x, pos.y, { text: 'GOOD', color: C.good });
    game.fx.burst(pos.x, pos.y, { color: C.active, count: 16, speed: 320 });
    game.audio.play('se_good', 0.4);
    if (pulled === Math.ceil(NEEDED * 0.5)) {
      game.fx.popup('NICE', CX, CY - 200, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    if (pulled >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    } else {
      var next = activeIdx;
      for (var k = 1; k <= strands.length; k++) {
        var idx = (activeIdx + k) % strands.length;
        if (strands[idx].alive) { next = idx; break; }
      }
      activeIdx = next;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) tryPull(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: CX, gy: CY, press: false };
  function resetDemo() { initGame(); }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.6;
    if (cyc < dt || demo.t <= dt) resetDemo();
    var s = strands[activeIdx];
    var p = endPos(s);
    demo.gx = p.x; demo.gy = p.y;
    demo.press = Math.floor(cyc * 2) % 2 === 0;
    if (demo.press && Math.floor(cyc * 2) !== Math.floor((cyc - dt) * 2) && !finished) tryPull(p.x, p.y);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (strands === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(pulled + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - pulled) + '本!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(pulled, { pulled: pulled, needed: NEEDED });
        else game.end.failure({ pulled: pulled, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', CX, CY - 200, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(pulled + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.stringDim, 0.5);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.7, 50, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.4]], { tempo: 140, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
