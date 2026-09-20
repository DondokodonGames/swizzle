// I-GBA-0038-bud-snap-close.js
// バドスナップクローズ — 開いたままの花のつぼみを、2本指で同時につまんで虫が来る前に閉じる
// 操作: 開いた花に2本の指を同時に置いて(2本指同時タップ)つぼみを閉じる
// 終わり: 規定回数(6回)閉じきれば成功。1回でも虫に先に止まられれば失敗
// @mechanic: pinch_zone
// @theme: garden_bud_pinch
// 世界観: おもちゃ箱のような庭。次々に開くつぼみを、虫が止まる前に両側からつまんで閉じてあげる花の番人
// 残るもの: 正誤(CLEAR/GAME OVER) + 閉じられたつぼみの数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 明るい平面色+太い輪郭線、影は単純な楕円
  var C = {
    bg: '#bff0c8', bg2: '#eafff0', outline: '#1c3a22', stem: '#2f8f3f',
    petal: '#ff7fb0', petalDark: '#e0508a', bug: '#5a3a1a',
    good: '#2fbf5a', bad: '#ff4d5e', gold: '#ffcf3f', white: '#ffffff', ink: '#12240f',
  };

  var GAME_TITLE = 'BUD SNAP';
  var TOTAL = 6;
  var CX = W * 0.5, CY = H * 0.42;
  var CLOSE_R = 150;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BUD_OPEN = ['#.....#', '.#...#.', '..###..', '.#####.', '#######'];
  var BUD_SHUT = ['.......', '.......', '..###..', '.#####.', '#######'];
  var BUG = ['.#.', '###', '.#.'];

  var closed, done, endWait, finished;
  var ready, hitStop, shake, halfShown;
  var round, bud, openness;

  function newBud() {
    var dur = Math.max(0.85, 1.5 - round * 0.09);
    return { t: 0, dur: dur, telegraphed: false, resolved: false, closing: false, closeT: 0 };
  }

  function initGame() {
    closed = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0; halfShown = false;
    round = 0; openness = 1;
    bud = newBud();
    activePresses = {};
  }

  var activePresses = {};

  function resolveClose(now) {
    if (!bud || bud.resolved || ready > 0 || done || finished) return;
    // 現在保持中のタッチのうち花の範囲内にあるものを数える
    var count = 0;
    for (var id in activePresses) {
      var p = activePresses[id];
      if (!p) continue;
      if (now - p.t > 0.35) continue;
      if (Math.hypot(p.x - CX, p.y - CY) < CLOSE_R) count++;
    }
    if (count >= 2) {
      bud.resolved = true;
      bud.closing = true;
      hitStop = 0.1;
      closed++;
      game.feedback.good(CX, CY, { text: 'CLOSE', color: C.good });
      game.fx.burst(CX, CY, { color: C.gold, count: 14, speed: 300 });
      game.audio.play('se_good', 0.4);
      if (!halfShown && closed >= Math.ceil(TOTAL / 2)) {
        halfShown = true;
        game.fx.popup('HALFWAY!', CX, CY - 220, { color: C.gold, size: 38 });
        game.audio.play('se_milestone', 0.4);
      }
      if (closed >= TOTAL) { ok = true; finished = true; finish(); return; }
      round++;
      bud = newBud();
      openness = 1;
    }
  }

  game.onPress(function(x, y, id) {
    if (state !== S.PLAYING) return;
    activePresses[id] = { x: x, y: y, t: game.time.elapsed };
    game.audio.play('se_tap', 0.15);
    resolveClose(game.time.elapsed);
  });
  game.onMove(function(x, y, id) {
    if (state !== S.PLAYING) return;
    if (activePresses[id]) { activePresses[id].x = x; activePresses[id].y = y; }
  });
  game.onRelease(function(x, y, id) {
    if (activePresses[id]) delete activePresses[id];
    if (state === S.PLAYING) game.fx.burst(x, y, { color: C.petalDark, count: 3, speed: 50 });
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

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg2], [1, C.bg]]);
    for (var i = 0; i < 4; i++) {
      game.draw.circle(W * (0.2 + i * 0.25), H * 0.85, 40, C.stem, 0.15);
    }
    game.draw.rect(CX - 10, CY + 40, 20, 260, C.stem);
  }

  function drawBud(b, o) {
    var bugP = b && !b.resolved ? Math.min(1, b.t / b.dur) : 0;
    var frame = o > 0.5 ? BUD_OPEN : BUD_SHUT;
    game.draw.sprite(frame, { '#': C.petal }, CX, CY, 26, { anchor: 'center' });
    game.draw.circle(CX, CY, CLOSE_R, C.outline, 0.08);
    if (b && !b.resolved && bugP > 0.35) {
      var blink = Math.floor(game.time.elapsed * 10) % 2 === 0;
      if (blink) {
        var bx = CX + (1 - bugP) * 260;
        var by = CY - 200;
        game.draw.sprite(BUG, { '#': C.bug }, bx, by, 10, { anchor: 'center' });
      }
    }
  }

  var demo = { t: 0, gx: [CX - 60, CX + 60], gy: [CY, CY], press: false, k: null, closing: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      round = 0; closed = 0; bud = newBud(); bud.dur = 1.8; openness = 1;
      demo.closing = 0;
    }
    bud.t += dt;
    var p = bud.t / bud.dur;
    if (p > 0.55 && demo.closing === 0) {
      demo.closing = 1;
      demo.press = true;
      bud.resolved = true;
      openness = 0;
      game.feedback.good(CX, CY, { text: 'CLOSE', color: C.good });
      game.audio.play('se_good', 0.25);
    }
    if (!demo.closing) {
      demo.gx = [CX - 90 + Math.sin(demo.t * 3) * 10, CX + 90 - Math.sin(demo.t * 3) * 10];
    } else {
      demo.gx = [CX - 30, CX + 30];
    }
    demo.gy = [CY - 20, CY + 20];
    if (p >= 1) { demo.closing = 0; demo.press = false; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bud === undefined) initGame();
      bg();
      stepDemo(dt);
      drawBud(bud, openness);
      game.draw.hand(demo.gx[0], demo.gy[0], { press: demo.press, scale: 13 });
      game.draw.hand(demo.gx[1], demo.gy[1], { press: demo.press, scale: 13 });
      txt(GAME_TITLE, W / 2, H * 0.1, 46, C.outline);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.14, 24, C.petalDark);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 40, C.petalDark);
      } else {
        txt('INSERT COIN', W / 2, H * 0.92, 28, C.outline);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBud(null, ok ? 0 : 1);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.1, 50, ok ? C.good : C.bad);
      txt(closed + ' / ' + TOTAL, W / 2, H * 0.16, 32, C.gold);
      if (!ok) txt('あと' + (TOTAL - closed) + '個!', W / 2, H * 0.21, 26, C.outline);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 26, C.outline);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(closed, { closed: closed, total: TOTAL });
        else game.end.failure({ closed: closed, total: TOTAL });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      bud.t += dt;
      openness = bud.closing ? Math.max(0, 1 - bud.t * 6) : 1;
      if (bud.t / bud.dur >= 1 && !bud.resolved) {
        bud.resolved = true;
        hitStop = 0.35;
        game.feedback.bad(CX, CY, { text: 'MISS' });
        shake = 0.3;
        game.audio.play('se_bad', 0.4);
        ok = false; finished = true; finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    if (!finished) drawBud(bud, openness);

    txt(closed + ' / ' + TOTAL, W / 2, H * 0.06, 32, C.ink);
    game.draw.rect(60, 150, W - 120, 16, C.outline, 0.3);
    game.draw.rect(60, 150, (W - 120) * (closed / TOTAL), 16, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.3], ['G4', 0.3], ['B4', 0.3], ['G4', 0.3]], { tempo: 150, wave: 'triangle', volume: 0.06, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
