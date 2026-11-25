// J-GC4-0001-reef-ring-ascent.js
// 珊瑚の輪くぐり浮上 — 左右のひと蹴りで斜めに浮き上がり、海中に浮かぶ輪を下からくぐり抜けながら水面を目指す
// 操作: 画面の左半分タップで左上へ、右半分タップで右上へひと蹴り。何もしないとゆっくり沈む
// 終わり: 水面に着いた時点で輪を7つ以上くぐっていれば成功。クラゲに触れる/息切れ(時間切れ)/くぐった輪が足りないと失敗
// @mechanic: camera_climb
// @theme: reef_ring_ascent
// 世界観: 珊瑚礁の村の素潜り見習いが、海底の祠から水面の舟まで一息で浮上する成人の試し。漁師たちが沈めた目印の輪を下からくぐり、漂うクラゲを避けて息が続くうちに舟へ上がる
// 残るもの: 正誤(CLEAR/GAME OVER) + くぐった輪の数・浮上タイム
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドット、タイル反復背景、縦1方向スクロール
  var STYLE = { bg: ['#0b1a4a', '#1f4fa8'], main: ['#5fd3ff', '#ffffff', '#000000'], accent: ['#ffcc33', '#ff5a8a'] };
  var C = { deep: '#0b1a4a', mid: '#1f4fa8', light: '#5fd3ff', white: '#ffffff', black: '#000000', gold: '#ffcc33', pink: '#ff5a8a', rock: '#123070' };

  var GAME_TITLE = 'RING ASCENT';
  var TIME_LIMIT = 20;
  var NEEDED = 7;
  var SURF = 4600;
  var RING_GAP = 400;
  var RING_HW = 90;
  var KICK_VY = -620, KICK_VX = 240, GRAV = 420, SINK_MAX = 260;
  var JELLY_R = 52;
  var FOCUS_Y = H * 0.64;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var dx, dy, vx, vy, camY, rings, jellies, passed, kicks, kickAnim, timeLeft, ready, hitStop, finished, ok, done, endWait, score, stung, surfaced;
  var bubbles = [];

  function txt(s, x, y, sz, col, align) {
    game.draw.text(s, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(s, x, y, { size: sz, color: col, bold: true, align: align || 'center', font: 'monospace' });
  }

  var DIVER_A = ['..yy....', '.yyyy...', '.ysss...', '..ss....', '.wwww...', 'w.ww.w..', '..ww....', '.y..y...'];
  var DIVER_B = ['..yy....', '.yyyy...', '.ysss...', '..ss....', 'wwwwww..', '..ww....', '.w..w...', 'y....y..'];
  var DIVER_PAL = { y: '#ffcc33', s: '#ffd8b0', w: '#ff5a8a' };
  var JELLY_A = ['...pppp...', '.pppwpppp.', 'ppwwpppppp', 'pppppppppp', '.t..t..t..', '..t..t..t.', '.t..t..t..', '..t..t..t.', '...t..t...'];
  var JELLY_B = ['..........', '...pppp...', '.ppwwpppp.', 'pppppppppp', '.t..t..t..', '.t..t..t..', '..t..t..t.', '..t..t..t.', '.t..t..t..'];
  var RING_BACK = ['..gggggggggg..', 'gg..........gg'];
  var RING_FRONT = ['gg..........gg', '..gggggggggg..'];
  var FISH = ['.cc.c', 'cccc.', '.cc.c'];
  var BOAT = ['.....mm.....', '.....mm.....', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '..bbbbbbbb..'];

  function initGame() {
    dx = W / 2; dy = 0; vx = 0; vy = 0; camY = dy - FOCUS_Y;
    rings = []; jellies = [];
    var n = Math.floor(SURF / RING_GAP) - 1;
    for (var i = 1; i <= n; i++) {
      var rx = game.random(230, 850);
      rings.push({ x: rx, y: -i * RING_GAP, got: false, missed: false });
      if (i >= 2 && i % 2 === 0) {
        var jx = rx < W / 2 ? game.random(rx + 180, 960) : game.random(120, rx - 180);
        jellies.push({ x: jx, y: -i * RING_GAP + RING_GAP * 0.5, bx: jx, ph: game.random(0, 6), amp: game.random(40, 120) });
      }
    }
    passed = 0; kicks = 0; kickAnim = 0; timeLeft = TIME_LIMIT; ready = 0.8; hitStop = 0; finished = false; ok = false;
    done = false; endWait = 0; score = 0; stung = null; surfaced = false;
  }

  // 蹴る — プレイもデモもここを通る
  function kick(side, live) {
    vy = KICK_VY; vx = side * KICK_VX; kickAnim = 0.25; kicks++;
    bubbles.push({ x: dx - side * 20, y: dy + 30, t: 0 });
    if (live) game.audio.play('se_jump', 0.25);
  }

  function stepSwim(dt, live) {
    vy = Math.min(SINK_MAX, vy + GRAV * dt);
    vx *= Math.pow(0.5, dt);
    var prevY = dy;
    dx += vx * dt; dy += vy * dt;
    if (dx < 80) { dx = 80; vx = Math.abs(vx) * 0.5; }
    if (dx > W - 80) { dx = W - 80; vx = -Math.abs(vx) * 0.5; }
    if (dy > 60) { dy = 60; vy = 0; }
    if (kickAnim > 0) kickAnim -= dt;
    // カメラは上方向だけ素早く追う
    var want = dy - FOCUS_Y;
    camY += (want - camY) * Math.min(1, dt * (want < camY ? 6 : 2));
    // 輪: 下から上へ横切った瞬間に判定
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      if (r.got || r.missed) continue;
      if (prevY > r.y && dy <= r.y) {
        if (Math.abs(dx - r.x) < RING_HW - 16) {
          r.got = true; passed++; score += 100;
          if (live) {
            game.feedback.good(r.x, r.y - camY - 60, { text: 'GOOD', color: C.gold, count: 10 });
            if (passed === 4) { game.audio.play('se_milestone', 0.5); game.fx.popup(passed + ' / ' + NEEDED, W / 2, H * 0.3, { color: C.gold, size: 64 }); }
          }
        } else {
          r.missed = true;
          if (live) { game.audio.play('se_bad', 0.2); game.fx.popup('MISS', r.x, r.y - camY - 40, { color: C.pink, size: 40 }); }
        }
      }
    }
    for (var j = 0; j < jellies.length; j++) {
      var jl = jellies[j];
      jl.ph += dt;
      jl.x = jl.bx + Math.sin(jl.ph * 0.9) * jl.amp;
      if (live && !finished && Math.hypot(dx - jl.x, dy - jl.y) < JELLY_R + 20) {
        stung = jl; finished = true; ok = false; hitStop = 0.5;
        game.audio.play('se_break', 0.35);
      }
    }
    if (dy <= -SURF) {
      dy = -SURF; surfaced = true;
      if (live && !finished) {
        finished = true; ok = passed >= NEEDED; hitStop = 0.45;
        if (ok) score += Math.round(timeLeft * 40);
      }
    }
    for (var b = bubbles.length - 1; b >= 0; b--) {
      bubbles[b].t += dt; bubbles[b].y -= 160 * dt;
      if (bubbles[b].t > 1.2) bubbles.splice(b, 1);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; music(); return; }
    if (finished || ready > 0) return;
    kick(x < W / 2 ? -1 : 1, true);
    game.fx.burst(dx, dy - camY + 40, { color: C.white, count: 4, speed: 120 });
  });

  // ── ATTRACT: 本物の kick/stepSwim。次の輪の真下へ寄せながら蹴り上がる(クラゲが近いと反対へ) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.84, press: false, cd: 0.2, side: 1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6.5;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; demo.cd = 0.3; }
    stepSwim(dt, false);
    demo.cd -= dt;
    if (demo.cd <= 0) {
      var next = null;
      for (var i = 0; i < rings.length; i++) if (!rings[i].got && !rings[i].missed) { next = rings[i]; break; }
      var side = next ? (next.x > dx + 30 ? 1 : (next.x < dx - 30 ? -1 : -demo.side)) : 1;
      for (var j = 0; j < jellies.length; j++) {
        var jl = jellies[j];
        if (jl.y < dy && dy - jl.y < 260 && Math.abs(jl.x - dx) < 160) side = jl.x > dx ? -1 : 1;
      }
      demo.side = side;
      kick(side, false);
      demo.cd = 0.42;
    }
    demo.gx += ((demo.side > 0 ? W * 0.76 : W * 0.24) - demo.gx) * Math.min(1, dt * 12);
    demo.press = demo.cd > 0.28;
  }

  function drawWorld(t) {
    var pulse = 0.05 + 0.05 * Math.sin(t * 1.5);
    var depthK = Math.max(0, Math.min(1, -camY / SURF));
    game.draw.gradient(0, H, [[0, depthK > 0.8 ? C.light : C.mid], [1, C.deep]]);
    game.draw.rect(0, 0, W, H, C.light, pulse * (0.3 + depthK));
    // タイル反復の岩壁(縦スクロール)
    var tile = 64;
    var off = ((-camY) % tile + tile) % tile;
    for (var y = -tile; y < H + tile; y += tile) {
      var row = Math.floor((y - off + camY) / tile);
      var wl = 40 + ((row * 37) % 3) * 16, wr = 40 + ((row * 53) % 3) * 16;
      game.draw.rect(0, y + off, wl, tile - 8, C.rock);
      game.draw.rect(W - wr, y + off, wr, tile - 8, C.rock);
    }
    // 遠景の魚の群れ(演出)
    for (var f = 0; f < 5; f++) {
      var fx = (t * 90 + f * 240) % (W + 200) - 100;
      var fy = ((f * 380 - camY * 0.3) % H + H) % H;
      game.draw.sprite(FISH, { c: C.light }, fx, fy + Math.sin(t * 3 + f) * 8, 8, { anchor: 'center' });
    }
    // 水面と舟
    var sy = -SURF - camY;
    if (sy > -200) {
      game.draw.rect(0, sy - 400, W, 400, '#9fe8ff');
      for (var wv = 0; wv < W; wv += 48) game.draw.rect(wv + Math.sin(t * 2 + wv) * 6, sy - 8, 32, 8, C.white);
      game.draw.sprite(BOAT, { b: '#8a5a2b', m: C.white }, W / 2 + Math.sin(t) * 20, sy - 60, 16, { anchor: 'center' });
    }
    // 海底の祠(スタート)
    var by = 140 - camY;
    if (by < H + 100) {
      game.draw.rect(W / 2 - 160, by, 320, 60, C.rock);
      game.draw.rect(W / 2 - 40, by - 90, 80, 90, C.rock);
      game.draw.rect(W / 2 - 20, by - 60, 40, 40, C.gold, 0.4 + pulse);
    }
  }

  function drawRingsBack() {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i], sy = r.y - camY;
      if (sy < -60 || sy > H + 60) continue;
      game.draw.sprite(RING_BACK, { g: r.got ? C.white : (r.missed ? C.rock : C.gold) }, r.x, sy - 8, 13, { anchor: 'center' });
    }
  }
  function drawRingsFront(t) {
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i], sy = r.y - camY;
      if (sy < -60 || sy > H + 60) continue;
      if (!r.got && !r.missed) game.draw.circle(r.x, sy, RING_HW, C.gold, 0.08 + 0.05 * Math.sin(t * 5 + i));
      game.draw.sprite(RING_FRONT, { g: r.got ? C.white : (r.missed ? C.rock : C.gold) }, r.x, sy + 18, 13, { anchor: 'center' });
    }
  }
  function drawJellies(t) {
    for (var j = 0; j < jellies.length; j++) {
      var jl = jellies[j], sy = jl.y - camY;
      if (sy < -80 || sy > H + 80) continue;
      var near = jl.y < dy && dy - jl.y < 420;
      // 予告: 近づくと点滅する輪で警告
      if (near) game.draw.circle(jl.x, sy, JELLY_R + 30 + Math.sin(t * 14) * 8, C.pink, 0.22);
      if (stung === jl) game.draw.circle(jl.x, sy, 120, C.white, 0.6);
      game.draw.sprite(Math.floor(t * 3 + j) % 2 ? JELLY_A : JELLY_B, { p: C.pink, w: C.white, t: '#ffb0cc' }, jl.x, sy + Math.sin(t * 2 + j) * 10, 11, { anchor: 'center' });
    }
  }
  function drawDiver(t) {
    for (var b = 0; b < bubbles.length; b++) game.draw.circle(bubbles[b].x + Math.sin(bubbles[b].t * 8) * 6, bubbles[b].y - camY, 8, C.white, 0.6 - bubbles[b].t * 0.4);
    var fr = kickAnim > 0 ? DIVER_B : DIVER_A;
    game.draw.sprite(fr, DIVER_PAL, dx + Math.sin(t * 2) * 3, dy - camY + Math.sin(t * 3.3) * 4, 12, { anchor: 'center', flipX: vx < -20 });
  }

  function drawHud() {
    txt(passed + ' / ' + NEEDED, W / 2, 80, 64, C.white);
    // 息ゲージ(残時間)
    var lowTime = timeLeft < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(90, 150, W - 180, 20, C.black, 0.7);
    game.draw.rect(90, 150, (W - 180) * Math.max(0, timeLeft / TIME_LIMIT), 20, lowTime ? C.pink : C.light);
    // 深さの目盛り(右端)
    var prog = Math.max(0, Math.min(1, -dy / SURF));
    game.draw.rect(W - 40, H * 0.2, 12, H * 0.55, C.black, 0.5);
    game.draw.rect(W - 46, H * 0.2 + H * 0.55 * (1 - prog) - 6, 24, 12, C.gold);
    // 親指ゾーンの左右パッド
    game.draw.rect(0, H * 0.8, W, H * 0.2, C.black, 0.25);
    game.draw.rect(W * 0.1, H * 0.84, W * 0.3, 120, C.light, 0.18);
    game.draw.rect(W * 0.6, H * 0.84, W * 0.3, 120, C.light, 0.18);
    game.draw.sprite(DIVER_A, DIVER_PAL, W * 0.25, H * 0.84 + 60, 8, { anchor: 'center', flipX: true });
    game.draw.sprite(DIVER_A, DIVER_PAL, W * 0.75, H * 0.84 + 60, 8, { anchor: 'center' });
  }

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (rings === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawWorld(t);
      drawRingsBack();
      drawJellies(t);
      drawDiver(t);
      drawRingsFront(t);
      drawHud();
      game.draw.hand(demo.gx, demo.gy + 40, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.2, 76, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.245, 34, C.white);
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.965, 38, C.white);
      return;
    }

    if (state === S.RESULT) {
      drawWorld(t);
      drawRingsBack();
      drawDiver(t);
      drawRingsFront(t);
      game.draw.rect(0, H * 0.34, W, H * 0.28, C.black, 0.75);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 96, ok ? C.gold : C.pink);
      txt(passed + ' / ' + NEEDED + '   ' + (TIME_LIMIT - timeLeft).toFixed(1), W / 2, H * 0.47, 44, C.white);
      if (ok) {
        txt('SCORE ' + score, W / 2, H * 0.53, 48, C.gold);
        if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 44, C.light);
        else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 36, C.white);
      } else {
        txt('あと' + Math.max(1, NEEDED - passed) + '個!', W / 2, H * 0.53, 52, C.gold);
        txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 36, C.white);
      }
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) { game.audio.play('se_success', 0.6); game.end.success(score, { rings: passed, kicks: kicks, time: +(TIME_LIMIT - timeLeft).toFixed(1) }); }
        else { game.audio.play('se_failure', 0.6); game.end.failure({ rings: passed, kicks: kicks }); }
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        if (ok) game.feedback.good(W / 2, H * 0.3, { text: 'CLEAR', color: C.gold, count: 28 });
        else game.feedback.bad(dx, dy - camY - 60, { text: timeLeft <= 0 ? 'TIME UP' : (stung ? 'MISS' : 'GAME OVER') });
        done = true; endWait = 0.9;
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.4);
    } else if (!finished) {
      timeLeft -= dt;
      stepSwim(dt, true);
      if (!finished && timeLeft <= 0) { timeLeft = 0; finished = true; ok = false; hitStop = 0.45; }
    }

    drawWorld(t);
    drawRingsBack();
    drawJellies(t);
    drawDiver(t);
    drawRingsFront(t);
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.36, 96, C.gold);
  });

  function music() {
    game.audio.melody([['D5', 0.5], ['F5', 0.5], ['A5', 1], ['G5', 0.5], ['F5', 0.5], ['E5', 1], ['C5', 0.5], ['D5', 1.5]], { tempo: 132, wave: 'square', volume: 0.04, loop: true, bass: true });
  }
  game.onStart(function() {
    music();
    state = S.ATTRACT;
    initGame();
  });
})(game);
