// J-N6434-0060-orchard-chute-tally.js
// 林檎どいの注文合わせ — 押している間だけ樋から林檎が転がり、3箱の合計を注文の数にぴたりと合わせる
// 操作: 押し続けると今の箱へ林檎が流れ込み、離すとその箱は締まる。3箱の合計を注文数に合わせる(箱ごとに流れる速さが違う)
// 終わり: 注文2件をどちらも±1以内で揃えれば成功。外れる/3秒放置/時間切れで失敗
// @mechanic: hold_duration
// @theme: orchard_chute_tally
// 世界観: 丘の果樹園の出荷小屋で、樋番の見習いが荷馬車の注文札を見ながら、坂の樋から転がる林檎を押し加減だけで3つの木箱に流し分け、合計を注文どおりに揃える
// 残るもの: 正誤(CLEAR/GAME OVER) + 注文との差・PERFECT数
// スタイル: 2000s BILLBOARD 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s BILLBOARD 3D: 奥行きはスプライトのpx拡縮、接地影で位置を示す
  var STYLE = { bg: ['#8fd0ff', '#d8f0ff'], main: ['#7cc05a', '#4e8a38', '#b0763c'], accent: ['#e8402f', '#ffd24a'] };
  var C = { sky1: '#8fd0ff', sky2: '#d8f0ff', grass: '#7cc05a', grassDark: '#4e8a38', wood: '#b0763c', woodDark: '#7a4c22',
    apple: '#e8402f', gold: '#ffd24a', ink: '#2a1e14', white: '#ffffff', good: '#3fbf5f', bad: '#e8402f', board: '#f4e2b8' };

  var GAME_TITLE = 'APPLE CHUTE';
  var TIME_LIMIT = 14;
  var NEEDED = 2;
  var CRATES = 3;
  var CAP = 12;
  var WAIT_LIMIT = 3;
  var CRATE_X = [230, 540, 850];
  var CRATE_Y = H * 0.6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var round, cidx, counts, target, phase, phT, holding, holdT, acc, falls, orders, perfects, lastDiff;
  var timeLeft, ready, hitStop, finished, ok, done, endWait, score;

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 3, y + 4, { size: sz, color: 'rgba(42,30,20,0.5)', bold: true, align: align || 'center' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center' });
  }

  var APPLE = ['..l.', '.aa.', 'aaaa', 'aaaa', '.aa.'];
  var APPLE_PAL = { l: '#4e8a38', a: '#e8402f' };
  var CRATE = ['wwwwwwwwww', 'wdwdwdwdww', 'wwwwwwwwww', 'wdwdwdwdww', 'wwwwwwwwww'];
  var CRATE_PAL = { w: '#b0763c', d: '#7a4c22' };
  var KEEPER_A = ['..hhh..', '.hhhhh.', '..sss..', '.ggggg.', 'g.ggg.g', '..g.g..', '.bb.bb.'];
  var KEEPER_B = ['..hhh..', '.hhhhh.', '..sss..', 'ggggggg', '..ggg..', '..g.g..', '.bb.bb.'];
  var KEEPER_PAL = { h: '#ffd24a', s: '#f0c8a0', g: '#3f7fbf', b: '#2a1e14' };
  var HORSE_A = ['....hh', 'hhhhhh', 'hhhhh.', 'h.h.h.'];
  var HORSE_B = ['....hh', 'hhhhhh', 'hhhhh.', '.h.h.h'];

  function interval(i, ht) {
    if (i === 0) return 0.13;
    if (i === 1) return 0.095;
    return Math.max(0.07, 0.16 - ht * 0.06);
  }

  function newOrder() {
    target = round === 0 ? Math.floor(game.random(12, 19.99)) : Math.floor(game.random(17, 26.99));
    counts = [0, 0, 0]; cidx = 0; phase = 'wait'; phT = 0; holding = false; holdT = 0; acc = 0;
  }

  function initGame() {
    round = 0; falls = []; orders = 0; perfects = 0; lastDiff = 0;
    timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false; done = false; endWait = 0; score = 0;
    newOrder();
  }

  function sum() { return counts[0] + counts[1] + counts[2]; }

  // 押す/離す — プレイもデモもここを通る
  function startPour(live) {
    if (phase !== 'wait') return false;
    phase = 'hold'; holding = true; holdT = 0; acc = 0; phT = 0;
    if (live) game.audio.tone('C4', 0.06, { wave: 'square', volume: 0.05 });
    return true;
  }
  function lockCrate(live) {
    if (phase !== 'hold') return false;
    holding = false; phase = 'lock'; phT = 0;
    if (live) game.audio.tone('G3', 0.08, { wave: 'triangle', volume: 0.07 });
    return true;
  }

  function judgeOrder(live) {
    var d = sum() - target;
    lastDiff = d;
    phase = 'judge'; phT = 0;
    var perfect = d === 0;
    if (Math.abs(d) <= 1) {
      orders++;
      if (perfect) perfects++;
      score += perfect ? 300 : 200;
      if (live) {
        game.feedback.good(W / 2, H * 0.36, { text: perfect ? 'PERFECT' : 'GOOD', color: perfect ? C.gold : C.good, size: 70 });
        if (orders === 1) { game.audio.play('se_milestone', 0.5); game.fx.popup(orders + ' / ' + NEEDED, W / 2, H * 0.27, { color: C.gold, size: 60 }); }
        if (orders >= NEEDED) { finished = true; ok = true; hitStop = 0.45; score += Math.round(timeLeft * 25); }
      }
    } else if (live) {
      finished = true; ok = false; hitStop = 0.5;
      game.audio.play('se_break', 0.4);
    }
  }

  function stepChute(dt, live) {
    phT += dt;
    if (phase === 'hold') {
      holdT += dt; acc += dt;
      var iv = interval(cidx, holdT);
      while (acc >= iv && counts[cidx] < CAP) {
        acc -= iv;
        counts[cidx]++;
        falls.push({ x: CRATE_X[cidx], t: 0 });
        if (live) game.audio.tone(520 + counts[cidx] * 30, 0.03, { wave: 'square', volume: 0.035 });
      }
      if (counts[cidx] >= CAP) {
        lockCrate(live);
        if (live) game.feedback.bad(CRATE_X[cidx], CRATE_Y - 160, { text: 'MISS', shake: 5 });
      }
    } else if (phase === 'wait') {
      if (live && phT > WAIT_LIMIT) {
        phase = 'lock'; phT = 0;
        game.feedback.bad(CRATE_X[cidx], CRATE_Y - 160, { text: 'MISS', shake: 5 });
      }
    } else if (phase === 'lock' && phT > 0.3) {
      cidx++;
      if (cidx >= CRATES) judgeOrder(live);
      else { phase = 'wait'; phT = 0; }
    } else if (phase === 'judge' && phT > 0.9 && !finished) {
      round++;
      if (round < NEEDED) newOrder();
      else { round = NEEDED - 1; phase = 'end'; }
    }
    for (var i = falls.length - 1; i >= 0; i--) { falls[i].t += dt; if (falls[i].t > 0.35) falls.splice(i, 1); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
  });

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || finished || ready > 0) return;
    if (startPour(true)) { game.audio.play('se_tap', 0.25); game.fx.burst(CRATE_X[cidx], CRATE_Y - 260, { color: C.gold, count: 5, speed: 120 }); }
    else game.audio.play('se_tap', 0.08);
  });

  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || finished) return;
    if (lockCrate(true)) game.fx.burst(CRATE_X[cidx], CRATE_Y - 40, { color: C.wood, count: 6, speed: 140 });
  });

  // ── ATTRACT: 本物の startPour/stepChute/lockCrate。狙いの数で離して合計をぴたりに ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, plan: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.0;
    if (cyc < dt || demo.t <= dt) {
      initGame(); ready = 0;
      var a = Math.floor(target / 3), b = Math.floor(target / 3);
      demo.plan = [a, b, target - a - b];
    }
    stepChute(dt, false);
    if (phase === 'wait' && phT > 0.35) startPour(false);
    if (phase === 'hold' && counts[cidx] >= demo.plan[cidx]) lockCrate(false);
    if (phase === 'judge' || phase === 'end') { if (phase === 'judge' && phT > 0.8) phase = 'end'; }
    demo.press = phase === 'hold';
    var tx = CRATE_X[Math.min(cidx, 2)];
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
    demo.gy = H * 0.84 + (demo.press ? 12 : 0);
  }

  function drawScene(t) {
    var pulse = 0.04 + 0.03 * Math.sin(t * 1.3);
    game.draw.gradient(0, H * 0.45, [[0, C.sky1], [1, C.sky2]]);
    game.draw.gradient(H * 0.45, H, [[0, C.grass], [1, C.grassDark]]);
    game.draw.rect(0, 0, W, H, C.white, pulse);
    // 奥の木(ビルボード: 奥ほど小さい)
    for (var i = 0; i < 7; i++) {
      var depth = 0.4 + (i % 3) * 0.2;
      var tx = (i * 170 + 60) % W, ty = H * 0.45 - 10 + (i % 3) * 16;
      game.draw.circle(tx, ty + 60 * depth, 50 * depth, '#000000', 0.12);
      game.draw.rect(tx - 8 * depth, ty, 16 * depth, 70 * depth, C.woodDark);
      game.draw.circle(tx + Math.sin(t * 1.2 + i) * 3, ty - 20 * depth, 60 * depth, i % 2 ? '#5aa844' : '#6cb850');
      game.draw.circle(tx + 20 * depth, ty - 30 * depth, 8 * depth, C.apple);
    }
    // 荷馬車(演出AI: 奥を行き来する)
    var hx = W * 0.5 + Math.sin(t * 0.4) * 380;
    game.draw.sprite(Math.floor(t * 4) % 2 ? HORSE_A : HORSE_B, { h: '#7a4c22' }, hx, H * 0.49, 9, { anchor: 'center', flipX: Math.cos(t * 0.4) < 0 });
    // 樋(坂)
    game.draw.line(0, H * 0.3, CRATE_X[2] + 60, H * 0.38, C.woodDark, 34);
    game.draw.line(0, H * 0.3 - 10, CRATE_X[2] + 60, H * 0.38 - 10, C.wood, 16);
    // 床の遠近線
    for (var l = 0; l < 7; l++) game.draw.line(W / 2 + (l - 3) * 60, H * 0.5, W / 2 + (l - 3) * 360, H, 'rgba(255,255,255,0.12)', 3);
  }

  function drawCrates(t) {
    for (var i = 0; i < CRATES; i++) {
      var x = CRATE_X[i];
      var active = i === cidx && (phase === 'wait' || phase === 'hold');
      var scl = active ? 15 : 13;
      game.draw.circle(x, CRATE_Y + 50, 110, '#000000', 0.18);
      if (active) {
        game.draw.circle(x, CRATE_Y - 20, 150, C.gold, 0.18 + 0.1 * Math.sin(t * 6));
        // 樋の口
        game.draw.rect(x - 40, CRATE_Y - 330, 80, 40, C.woodDark);
        game.draw.rect(x - 6, CRATE_Y - 380, 12, 60, C.woodDark);
      }
      // 積まれた林檎(4個ずつの段)
      var n = i < counts.length ? counts[i] : 0;
      for (var k = 0; k < n; k++) {
        var col = k % 4, row = Math.floor(k / 4);
        game.draw.sprite(APPLE, APPLE_PAL, x - 60 + col * 40 + (row % 2) * 16, CRATE_Y - 60 - row * 30 + Math.sin(t * 3 + k) * 1.5, 7, { anchor: 'center' });
      }
      game.draw.sprite(CRATE, CRATE_PAL, x, CRATE_Y + Math.sin(t * 1.5 + i) * 2, scl, { anchor: 'center' });
      txt(String(n), x, CRATE_Y + 110, 60, i < cidx || active ? C.white : 'rgba(255,255,255,0.5)');
    }
    for (var f = 0; f < falls.length; f++) {
      var fa = falls[f];
      game.draw.sprite(APPLE, APPLE_PAL, fa.x + Math.sin(fa.t * 20) * 6, CRATE_Y - 300 + fa.t / 0.35 * 220, 8, { anchor: 'center' });
    }
    var kf = Math.floor(t * 3) % 2 ? KEEPER_A : KEEPER_B;
    game.draw.circle(W - 110, H * 0.47 + 60, 50, '#000000', 0.18);
    game.draw.sprite(kf, KEEPER_PAL, W - 110, H * 0.47 + Math.sin(t * 2.4) * 4, 11, { anchor: 'center' });
  }

  function drawOrder(t) {
    // 注文札(上ゾーン)と合計ゲージ
    game.draw.rect(W / 2 - 200, 40, 400, 170, C.woodDark);
    game.draw.rect(W / 2 - 186, 54, 372, 142, C.board);
    txt(sum() + ' / ' + target, W / 2, 125, 84, C.ink);
    var gx = 70, gy = H * 0.72, gw = W - 140;
    var maxV = 36;
    game.draw.rect(gx, gy, gw, 40, C.ink, 0.5);
    game.draw.rect(gx, gy, gw * Math.min(1, sum() / maxV), 40, Math.abs(sum() - target) <= 1 ? C.good : (sum() > target ? C.bad : C.gold));
    var mx = gx + gw * target / maxV;
    game.draw.rect(mx - 4, gy - 16, 8, 72, C.white);
    game.draw.sprite(APPLE, APPLE_PAL, mx, gy - 34, 6, { anchor: 'center' });
    var lowTime = timeLeft < 4 && Math.floor(t * 6) % 2 === 0;
    game.draw.rect(gx, H * 0.77, gw * Math.max(0, timeLeft / TIME_LIMIT), 14, lowTime ? C.bad : C.white);
    for (var o = 0; o < NEEDED; o++) game.draw.circle(W / 2 + 260 + o * 50, 125, 16, o < orders ? C.good : C.white, o < orders ? 1 : 0.5);
    if (phase === 'wait' && !finished) {
      var r = Math.max(0, 1 - phT / WAIT_LIMIT);
      game.draw.rect(CRATE_X[cidx] - 90, CRATE_Y + 160, 180 * r, 10, r < 0.35 ? C.bad : C.gold);
    }
  }

  function drawPad(t) {
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.ink, 0.25);
    game.draw.circle(W / 2, H * 0.88, 110, holding ? C.gold : C.white, holding ? 0.8 : 0.35 + 0.1 * Math.sin(t * 3));
    game.draw.sprite(APPLE, APPLE_PAL, W / 2, H * 0.88, 16, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (counts === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawScene(t);
      drawCrates(t);
      drawOrder(t);
      drawPad(t);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.16, 72, C.white);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.2, 34, C.gold);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawScene(t);
      drawCrates(t);
      drawOrder(t);
      game.draw.rect(0, H * 0.3, W, H * 0.24, C.ink, 0.78);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.35, 96, ok ? C.good : C.bad);
      txt(orders + ' / ' + NEEDED + '  PERFECT ' + perfects, W / 2, H * 0.41, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.46, 48, C.gold);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.51, 44, C.good);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.51, 36, C.white);
      } else {
        txt(lastDiff < 0 ? 'あと' + (-lastDiff) + '個!' : (lastDiff > 0 ? '+' + lastDiff : 'TIME UP'), W / 2, H * 0.46, 52, C.gold);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.51, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { orders: orders, perfect: perfects, diff: lastDiff }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ orders: orders, perfect: perfects, diff: lastDiff }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.good, count: 28 });
        else game.feedback.bad(W / 2, CRATE_Y - 200, { text: timeLeft <= 0 ? 'TIME UP' : 'MISS' });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepChute(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; lastDiff = sum() - target; finished = true; ok = false; hitStop = 0.45; holding = false; }
    }

    drawScene(t);
    drawCrates(t);
    drawOrder(t);
    drawPad(t);
    if (hitStop > 0 && !ok) game.draw.circle(W / 2, H * 0.72 + 20, 120, C.white, 0.5);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.3, 96, C.gold);
  });

  function music() {
    game.audio.melody([['C5', 0.5], ['D5', 0.5], ['E5', 0.5], ['C5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 1], ['G4', 0.5], ['C5', 1.5]], { tempo: 140, wave: 'triangle', volume: 0.045, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
