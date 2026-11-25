// D-20172021-0055-deepglow-eel-ward.js
// ディープグロウ・イールウォード — 自動で光弾を放つ潜水灯を指で動かし、群がる発光ウツボを避け続ける
// 操作: 指で潜水灯を押さえたまま動かし、四方から寄ってくる発光ウツボの体当たりを避ける
// 終わり: 制限時間いっぱい生き延びれば成功。3回体当たりを受けると失敗
// @mechanic: dodge
// @theme: deepglow_eel_ward
// 世界観: 深海探査に出た潜水灯の担い手が、自動で放たれる光弾に守られながらも、四方から群がる発光ウツボの体当たりを紙一重で避け続け、漂う発光プランクトンで一時的な守りを得る
// 残るもの: 正誤(CLEAR/GAME OVER) + 生存できた秒数
// スタイル: 90s LOW POLY

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s LOW POLY: 深海の暗い群青、平坦な塊状シルエット、粗いフラットシェード
  var C = {
    bg: '#04162a', bg2: '#082238', diver: '#5ad4ff', diverDark: '#1a6a9a',
    eel: '#ff6a4a', eelWarn: '#ffb347', mote: '#8bffb0',
    good: '#5aff9a', bad: '#ff4d5e', gold: '#ffd24a', white: '#eaf8ff', ink: '#020a14',
  };

  var GAME_TITLE = 'EEL WARD';
  var TIME_LIMIT = 11;
  var MAX_HIT = 3;
  var DIVER_R = 42;
  var SPAWN_GAP = 1.1;
  var WARN_T = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var DIVER_SPR = ['.##.', '####', '.##.'];
  var EEL_SPR = ['##.', '###', '##.'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#5ad4ff', pulse * 0.3);
    for (var i = 0; i < 10; i++) {
      var bx = (i * 137 + game.time.elapsed * 20) % W;
      var by = (i * 271) % (H * 0.7) + H * 0.1;
      game.draw.circle(bx, by, 3, '#ffffff', 0.15);
    }
  }

  var diverX, diverY, hits, elapsed, halfCalled, shieldOn, motes, eels, holding;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    diverX = W * 0.5; diverY = H * 0.5; hits = 0; elapsed = 0; halfCalled = false;
    shieldOn = false; motes = []; eels = []; holding = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    spawnTimer = 0; moteTimer = 1.4;
  }
  var spawnTimer, moteTimer;

  function edgeSpawn() {
    var side = Math.floor(game.random(0, 4));
    var pt;
    if (side === 0) pt = { x: -60, y: game.random(H * 0.2, H * 0.8) };
    else if (side === 1) pt = { x: W + 60, y: game.random(H * 0.2, H * 0.8) };
    else if (side === 2) pt = { x: game.random(W * 0.15, W * 0.85), y: H * 0.14 - 60 };
    else pt = { x: game.random(W * 0.15, W * 0.85), y: H * 0.9 + 60 };
    var ang = Math.atan2((H * 0.5) - pt.y, (W * 0.5) - pt.x) + game.random(-0.5, 0.5);
    return { x: pt.x, y: pt.y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, t: 0, warn: WARN_T, seed: game.random(0, 10) };
  }

  function drawDiver() {
    var flash = shieldOn ? (Math.floor(game.time.elapsed * 8) % 2 === 0) : false;
    game.draw.circle(diverX, diverY, DIVER_R + (shieldOn ? 16 : 6), shieldOn ? C.mote : C.diver, shieldOn ? 0.35 : 0.25);
    game.draw.sprite(DIVER_SPR, { '#': flash ? C.mote : C.diver }, diverX, diverY, 20, { anchor: 'center' });
  }
  function drawEels() {
    for (var i = 0; i < eels.length; i++) {
      var e = eels[i];
      var warning = e.t < e.warn;
      if (warning) {
        var a = 0.3 + 0.3 * Math.sin(game.time.elapsed * 12);
        game.draw.circle(e.x, e.y, 30, C.eelWarn, a);
      } else {
        game.draw.circle(e.x, e.y, 20, C.eel, 0.3);
        game.draw.sprite(EEL_SPR, { '#': C.eel }, e.x, e.y, 14, { anchor: 'center' });
      }
    }
  }
  function drawMotes() {
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      var bob = Math.sin(game.time.elapsed * 3 + m.seed) * 6;
      game.draw.circle(m.x, m.y + bob, 14, C.mote, 0.8);
    }
  }

  function moveDiver(x, y) {
    if (ready > 0 || finished || done) return;
    diverX = Math.max(80, Math.min(W - 80, x));
    diverY = Math.max(H * 0.16, Math.min(H * 0.92, y));
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) { holding = true; game.audio.play('se_tap', 0.06); moveDiver(x, y); }
  });
  game.onMove(function(x, y) { if (state === S.PLAYING && holding) moveDiver(x, y); });
  game.onRelease(function() { holding = false; });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function stepWorld(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { eels.push(edgeSpawn()); spawnTimer = SPAWN_GAP + game.random(-0.2, 0.3); }
    moteTimer -= dt;
    if (moteTimer <= 0) { motes.push({ x: game.random(W * 0.2, W * 0.8), y: game.random(H * 0.2, H * 0.8), seed: game.random(0, 10) }); moteTimer = 2.4; }

    for (var i = eels.length - 1; i >= 0; i--) {
      var e = eels[i];
      e.t += dt;
      if (e.t < e.warn) continue;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.x < -100 || e.x > W + 100 || e.y < -100 || e.y > H + 100) { eels.splice(i, 1); continue; }
      if (game.hit.circle(diverX, diverY, DIVER_R, e.x, e.y, 22)) {
        eels.splice(i, 1);
        if (shieldOn) {
          shieldOn = false;
          game.feedback.good(diverX, diverY, { text: 'GUARD', color: C.mote });
          game.audio.play('se_powerup', 0.3);
        } else {
          hits++;
          hitStop = 0.3; shake = 0.3;
          game.feedback.bad(diverX, diverY, { text: 'MISS' });
          game.audio.play('se_bad', 0.4);
          if (hits >= MAX_HIT) { ok = false; finished = true; finish(); return; }
        }
      }
    }
    for (var j = motes.length - 1; j >= 0; j--) {
      var m = motes[j];
      if (game.hit.circle(diverX, diverY, DIVER_R, m.x, m.y, 20)) {
        motes.splice(j, 1);
        shieldOn = true;
        game.feedback.good(m.x, m.y, { text: 'GUARD+', color: C.mote });
        game.audio.play('se_milestone', 0.3);
      }
    }
  }

  var demo = { t: 0, gx: W * 0.5, gy: H * 0.5, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.5;
    if (cyc < dt || demo.t <= dt) initGame();
    var nearest = null, best = 1e9;
    for (var i = 0; i < eels.length; i++) {
      var e = eels[i]; if (e.t < e.warn) continue;
      var d = Math.hypot(e.x - diverX, e.y - diverY);
      if (d < best) { best = d; nearest = e; }
    }
    var tx = W * 0.5, ty = H * 0.5;
    if (nearest) { tx = diverX - (nearest.x - diverX) * 0.4; ty = diverY - (nearest.y - diverY) * 0.4; }
    demo.gx += (tx - demo.gx) * Math.min(1, dt * 3);
    demo.gy += (ty - demo.gy) * Math.min(1, dt * 3);
    moveDiver(demo.gx, demo.gy);
    stepWorld(dt);
    elapsed += dt;
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (eels === undefined) initGame();
      bg();
      stepDemo(dt);
      drawMotes();
      drawEels();
      drawDiver();
      game.draw.hand(demo.gx, demo.gy, { press: true, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 40, C.white);
      txt('BEST ' + (game.best > 0 ? game.best + 's' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 38, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawMotes(); drawEels(); drawDiver();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(Math.floor(elapsed) + 's / ' + TIME_LIMIT + 's', W / 2, H * 0.13, 28, C.gold);
      if (!ok && elapsed >= TIME_LIMIT - 3) txt('あと少し!', W / 2, H * 0.17, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(Math.floor(elapsed) * 10, { survived: Math.floor(elapsed), hits: hits });
        else game.end.failure({ survived: Math.floor(elapsed), hits: hits });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      elapsed += dt;
      stepWorld(dt);
      if (!halfCalled && elapsed >= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('折り返し!', diverX, diverY - 120, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (elapsed >= TIME_LIMIT) { ok = true; finished = true; finish(); }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawMotes();
    drawEels();
    drawDiver();

    txt(Math.min(TIME_LIMIT, Math.floor(elapsed)) + ' / ' + TIME_LIMIT, W / 2, H * 0.06, 30, C.white);
    var barW = W - 120;
    game.draw.rect(60, 150, barW, 16, C.ink, 0.5);
    game.draw.rect(60, 150, barW * Math.min(1, elapsed / TIME_LIMIT), 16, C.gold);
    for (var m2 = 0; m2 < MAX_HIT; m2++) game.draw.circle(W - 60 - m2 * 40, 210, 12, m2 < hits ? C.bad : '#204058');
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D3', 0.3], ['F3', 0.3], ['A3', 0.3], ['D4', 0.5]], { tempo: 100, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
