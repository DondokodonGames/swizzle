// J-Switch-0019-icefest-otter-sidestep.js
// 氷祭りの身かわし — 湖上の丸い氷舞台の縁から狙いを定めて突っ込んでくるイノシシを、狙いが固まった瞬間に指をずらして寸前でかわし、勢いのまま反対側の湖へ滑り落とす
// 操作: どこでも押したまま指を動かすと、カワウソがその方向へ氷の上を滑る(指の動いた分だけ)。イノシシの狙い線が赤く固まってから線の外へ逃げる。早く逃げても狙いが追ってくる。ぶつかると弾かれて滑り、氷舞台の外に出たら落ちる(社内メモ。画面には出さない)
// 終わり: イノシシを6頭湖へ落とせばCLEAR。自分が湖へ落ちる/時間切れでGAME OVER
// @mechanic: dodge
// @theme: icefest_ring_sidestep
// 世界観: 真冬の山の湖で開かれる氷祭りの昼、湖の上に切り出して浮かべた丸い氷の舞台で、舞台番を任された若いカワウソが、雪山から下りてきて舞台を奪おうと縁から次々に這い上がって突進してくるイノシシたちを、ぎりぎりまで引きつけてはひらりとかわし、つるつるの氷を滑らせたまま反対側の冷たい湖へ落としていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 湖へ落とした頭数・寸前でかわした(PERFECT)数・弾かれた回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 白っぽい背景 + 単色の丸い塊 + 柔らかい接地影
  var STYLE = { bg: ['#bfeaff', '#7ccfee'], main: ['#ffffff', '#dff4ff', '#8fa3b5'], accent: ['#ff6a4d', '#ffd23f'] };
  var C = { ice: '#ffffff', iceS: '#d6ecf7', sea: '#6cc6ea', seaD: '#3f9fcc', seal: '#9a7a5e', sealD: '#6e5540', wal: '#6e5646', walD: '#4e3a2e', red: '#ff5a4a', gold: '#ffc83a', ink: '#23405a', good: '#34c77b' };

  var TITLE = 'ICE RING DODGE';
  var TIME_LIMIT = 22;
  var GOAL = 6;
  var CX = W / 2, CY = H * 0.49;
  var R0 = 410, R1 = 330;
  var SEAL_R = 50, WAL_R = 72;
  var CHARGE_V = 1500, KNOCK_V = 820, STUN = 0.35;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var SEAL_FACE = [['.e..e.', '......', '..nn..', '.w..w.'], ['.e..e.', '......', '..nn..', 'w....w']];
  var SEAL_PAL = { e: '#1b2530', n: '#3a2a2a', w: '#dfe7ee' };
  var WAL_FACE = [['e....e', '......', '.mmmm.', '.t..t.', '.t..t.'], ['e....e', '......', '.mmmm.', '.t..t.', 't....t']];
  var WAL_PAL = { e: '#1b1410', m: '#d9a58a', t: '#fffbe8' };
  var FISH = ['..ff..', 'ffffff', '..ff..'];

  var sealX, sealY, vx, vy, stun, walruses, spawnT, spawnN, knocked, perfects, hits, timeLeft, runT, ready, hitStop, hitObj, pendingBad, finished, done, endWait, ok, timeUp, fell, dragging, anchor, milestoneShown, splashes;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 4, { size: sz, color: 'rgba(35,64,90,0.35)', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function floeR() { return R0 - (R0 - R1) * Math.min(1, runT / TIME_LIMIT); }

  function initGame() {
    sealX = CX; sealY = CY; vx = 0; vy = 0; stun = 0;
    walruses = []; spawnT = 0.3; spawnN = 0;
    knocked = 0; perfects = 0; hits = 0; timeLeft = TIME_LIMIT; runT = 0; ready = 0.8;
    hitStop = 0; hitObj = null; pendingBad = null; finished = false; done = false; endWait = 0; ok = false; timeUp = false; fell = false;
    dragging = false; anchor = null; milestoneShown = false; splashes = [];
  }

  function spawnWalrus(angle, aimT) {
    var R = floeR();
    walruses.push({ x: CX + Math.cos(angle) * (R + 60), y: CY + Math.sin(angle) * (R + 60), ang: angle, st: 'climb', t: 0, aimT: aimT, dx: 0, dy: 0, minD: 9999, cx: 0, cy: 0 });
  }

  function finishRound(win) {
    if (finished) return;
    finished = true; done = true; ok = win; endWait = 1.5;
    if (state === S.PLAYING) { game.audio.stopBgm(); game.audio.play(win ? 'se_success' : 'se_failure', 0.5); }
  }

  function splash(x, y) {
    splashes.push({ x: x, y: y, t: 0 });
    game.fx.burst(x, y, { color: '#ffffff', count: 14, speed: 320 });
  }

  function stepWalrus(w, dt) {
    var R = floeR();
    w.t += dt;
    if (w.st === 'climb') {
      var k = Math.min(1, w.t / 0.35);
      w.x = CX + Math.cos(w.ang) * (R + 60 - 110 * k);
      w.y = CY + Math.sin(w.ang) * (R + 60 - 110 * k);
      if (w.t >= 0.35) { w.st = 'aim'; w.t = 0; }
    } else if (w.st === 'aim') {
      var ax = sealX - w.x, ay = sealY - w.y, al = Math.hypot(ax, ay) || 1;
      w.dx = ax / al; w.dy = ay / al;
      if (w.t >= w.aimT) {
        w.st = 'lock'; w.t = 0;
        game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.08 });
      }
    } else if (w.st === 'lock') {
      if (w.t >= 0.36) {
        w.st = 'charge'; w.t = 0;
        game.audio.play('se_jump', 0.25);
      }
    } else if (w.st === 'charge') {
      w.x += w.dx * CHARGE_V * dt; w.y += w.dy * CHARGE_V * dt;
      var d = Math.hypot(w.x - sealX, w.y - sealY);
      if (d < w.minD) w.minD = d;
      if (!fell && d < SEAL_R + WAL_R - 8) {
        // 衝突: 一瞬止めてから弾かれる
        w.st = 'retreat'; w.t = 0;
        hitObj = w; hitStop = 0.3;
        hits++;
        game.audio.tone('D3', 0.12, { wave: 'square', volume: 0.12 });
        pendingBad = { x: sealX, y: sealY - 80, knock: true, dx: w.dx, dy: w.dy };
        return;
      }
      if (Math.hypot(w.x - CX, w.y - CY) > R + 20) {
        w.st = 'fall'; w.t = 0;
        splash(w.x, w.y);
        knocked++;
        var close = w.minD < SEAL_R + WAL_R + 45;
        if (close) perfects++;
        game.feedback.good(w.x, w.y - 80, { text: close ? 'PERFECT' : 'GOOD', color: close ? C.gold : C.good, size: close ? 60 : 50, sound: 'se_break', volume: 0.3 });
        game.audio.play('se_good', 0.3);
        if (state === S.PLAYING) {
          if (!milestoneShown && knocked >= GOAL / 2) {
            milestoneShown = true;
            game.fx.popup(knocked + ' / ' + GOAL, W / 2, H * 0.2, { color: C.gold, size: 60 });
            game.audio.play('se_milestone', 0.4);
          }
          if (knocked >= GOAL) finishRound(true);
        }
      }
    } else if (w.st === 'retreat') {
      w.x -= w.dx * 600 * dt; w.y -= w.dy * 600 * dt;
      if (Math.hypot(w.x - CX, w.y - CY) > R + 30) { w.st = 'fall'; w.t = 0; splash(w.x, w.y); }
    } else if (w.st === 'fall') {
      if (w.t > 0.5) w.dead = true;
    }
  }

  function stepWorld(dt, live) {
    if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0 && pendingBad) {
        var pb = pendingBad; pendingBad = null;
        if (pb.fell) {
          game.feedback.bad(pb.x, pb.y, { text: 'MISS', shake: 16 });
          if (live) finishRound(false);
        } else {
          game.feedback.bad(pb.x, pb.y, { text: 'MISS', shake: 12 });
          if (pb.knock) { vx = pb.dx * KNOCK_V; vy = pb.dy * KNOCK_V; stun = STUN; }
        }
        hitObj = null;
      }
      return false;
    }
    if (fell) return false;
    runT += dt;
    // カワウソの滑り
    if (stun > 0) stun -= dt;
    var retain = Math.pow(0.5, dt);
    if (dragging && anchor && stun <= 0) {
      var tx = anchor.tx, ty = anchor.ty;
      var wantX = (tx - sealX) * 7, wantY = (ty - sealY) * 7;
      var k = Math.min(1, dt * 9);
      vx += (wantX - vx) * k; vy += (wantY - vy) * k;
    } else {
      vx *= retain; vy *= retain;
    }
    sealX += vx * dt; sealY += vy * dt;
    var R = floeR();
    if (!fell && Math.hypot(sealX - CX, sealY - CY) > R - 12) {
      fell = true;
      splash(sealX, sealY);
      hitObj = null; hitStop = 0.5;
      pendingBad = { x: sealX, y: sealY - 80, fell: true };
      game.audio.tone('C3', 0.2, { wave: 'sawtooth', volume: 0.12 });
      return false;
    }
    // 出現
    if (!finished) {
      spawnT -= dt;
      var active = 0;
      for (var i = 0; i < walruses.length; i++) if (walruses[i].st !== 'fall') active++;
      if (spawnT <= 0 && active < 2) {
        spawnN++;
        var diff = Math.min(1, runT / TIME_LIMIT);
        var a = Math.atan2(sealY - CY, sealX - CX) + Math.PI + (Math.random() - 0.5) * 2.4;
        spawnWalrus(a, 1.0 - 0.3 * diff);
        spawnT = 2.3 - 0.8 * diff;
      }
    }
    for (var j = walruses.length - 1; j >= 0; j--) {
      stepWalrus(walruses[j], dt);
      if (hitStop > 0) break;
      if (walruses[j] && walruses[j].dead) walruses.splice(j, 1);
    }
    return true;
  }

  function stepCosmetic(dt) {
    for (var i = splashes.length - 1; i >= 0; i--) { splashes[i].t += dt; if (splashes[i].t > 0.8) splashes.splice(i, 1); }
  }

  // ---------- 描画 ----------
  function drawSea() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, STYLE.bg[0]], [0.5, C.sea], [1, C.seaD]]);
    for (var i = 0; i < 12; i++) {
      var y = 260 + i * 140 + Math.sin(t + i) * 10;
      var x = ((i * 190 + t * 30 * (i % 2 ? 1 : -1)) % (W + 200) + W + 200) % (W + 200) - 100;
      game.draw.rect(x, y, 120, 8, '#ffffff', 0.35);
    }
    for (var k = 0; k < 5; k++) {
      var fx = W * (0.08 + k * 0.21) + Math.sin(t * 0.4 + k) * 30, fy = H * (0.8 + (k % 3) * 0.05) + Math.sin(t * 1.5 + k) * 8;
      var fr = 18 + (k % 3) * 8;
      game.draw.circle(fx + 6, fy + 8, fr, C.seaD, 0.3);
      game.draw.circle(fx, fy, fr, '#e8f6fd', 0.85);
    }
    // 祭りの旗飾り
    for (var fl = 0; fl < 14; fl++) {
      var fxx = fl * 80 + 20, fyy = 262 + Math.sin(t * 2 + fl * 0.6) * 6;
      game.draw.rect(fxx, fyy, 44, 34, ['#ff6a4d', '#ffd23f', '#34c77b', '#3fa9e0'][fl % 4]);
    }
    game.draw.line(0, 262, W, 262, '#23405a', 4);
    game.draw.sprite(FISH, { f: '#2f7fb0' }, W * 0.15 + Math.sin(t * 0.7) * 80, H * 0.9, 10, { anchor: 'center', flipX: Math.cos(t * 0.7) < 0 });
  }

  function drawFloe() {
    var t = game.time.elapsed;
    var R = floeR();
    game.draw.circle(CX + 14, CY + 26, R + 10, C.seaD, 0.45);
    game.draw.circle(CX, CY + 16, R, '#b8dcee');
    game.draw.circle(CX, CY, R, C.ice);
    game.draw.circle(CX - R * 0.25, CY - R * 0.3, R * 0.45, '#ffffff');
    game.draw.circle(CX + R * 0.3, CY + R * 0.25, R * 0.3, C.iceS, 0.6);
    for (var i = 0; i < 3; i++) {
      var a = t * 0.3 + i * 2.1;
      game.draw.line(CX + Math.cos(a) * R * 0.3, CY + Math.sin(a) * R * 0.3, CX + Math.cos(a + 0.4) * R * 0.75, CY + Math.sin(a + 0.4) * R * 0.75, C.iceS, 4);
    }
    // 縁の危険帯
    var edge = Math.hypot(sealX - CX, sealY - CY) / R;
    if (edge > 0.7) game.draw.circle(sealX, sealY, SEAL_R + 30, C.red, 0.15 + 0.15 * Math.sin(t * 16));
  }

  function drawWalrus(w) {
    var t = game.time.elapsed;
    var sink = w.st === 'fall' ? Math.min(1, w.t / 0.5) : 0;
    var alpha = 1 - sink;
    if (alpha <= 0) return;
    if (w.st === 'aim' || w.st === 'lock') {
      var locked = w.st === 'lock';
      var len = 900;
      var blink = locked && Math.floor(t * 18) % 2 === 0;
      for (var s = 0; s < 14; s++) {
        var s0 = 90 + s * (len / 14);
        game.draw.line(w.x + w.dx * s0, w.y + w.dy * s0, w.x + w.dx * (s0 + 36), w.y + w.dy * (s0 + 36), locked ? (blink ? '#ffd23f' : C.red) : '#ffa14a', locked ? 16 : 9);
      }
    }
    var wob = w.st === 'aim' ? Math.sin(t * 20) * 4 : (w.st === 'lock' ? Math.sin(t * 50) * 6 : 0);
    var big = hitObj === w ? 1.2 : 1;
    var r = WAL_R * big * (1 - sink * 0.4);
    game.draw.circle(w.x + 10, w.y + 18, r, C.seaD, 0.3 * alpha);
    game.draw.circle(w.x + wob, w.y, r, hitObj === w ? '#ffffff' : C.wal, alpha);
    game.draw.circle(w.x + wob - r * 0.3, w.y - r * 0.35, r * 0.4, '#8e7462', 0.8 * alpha);
    game.draw.sprite(WAL_FACE[Math.floor(t * 4) % 2], WAL_PAL, w.x + wob + w.dx * 20, w.y + w.dy * 20, 10 * big, { anchor: 'center', alpha: alpha });
    if (hitObj === w) game.draw.circle(w.x, w.y, r + 40 + (0.3 - hitStop) * 200, '#ffffff', Math.max(0, hitStop) * 1.5);
  }

  function drawSeal() {
    var t = game.time.elapsed;
    if (fell && hitStop <= 0) return;
    var squash = 1 + Math.sin(t * 5) * 0.04;
    var hl = fell && hitStop > 0;
    game.draw.circle(sealX + 8, sealY + 16, SEAL_R, C.seaD, 0.3);
    game.draw.circle(sealX, sealY, SEAL_R * squash * (hl ? 1.25 : 1), hl ? '#ffffff' : C.seal);
    game.draw.circle(sealX - 14, sealY - 16, SEAL_R * 0.4, '#bfa084');
    game.draw.sprite(SEAL_FACE[stun > 0 ? 1 : Math.floor(t * 2) % 2], SEAL_PAL, sealX, sealY + 4, 9, { anchor: 'center' });
    if (stun > 0) for (var i = 0; i < 3; i++) game.draw.circle(sealX + Math.cos(t * 12 + i * 2.1) * 50, sealY - 70 + Math.sin(t * 12 + i * 2.1) * 12, 8, C.gold);
  }

  function drawSplashes() {
    for (var i = 0; i < splashes.length; i++) {
      var s = splashes[i];
      game.draw.circle(s.x, s.y, 30 + s.t * 160, '#ffffff', 0.6 * (1 - s.t / 0.8));
    }
  }

  function drawStick() {
    if (!dragging || !anchor) return;
    game.draw.circle(anchor.px, anchor.py, 90, '#ffffff', 0.25);
    game.draw.circle(anchor.fx, anchor.fy, 40, '#ffffff', 0.55);
  }

  function drawAll() {
    drawSea();
    drawFloe();
    for (var i = 0; i < walruses.length; i++) drawWalrus(walruses[i]);
    drawSeal();
    drawSplashes();
    drawStick();
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.03 * Math.sin(game.time.elapsed * 1.6));
  }

  function drawHud() {
    game.draw.rect(0, 0, W, 226, '#ffffff', 0.75);
    game.draw.circle(96, 92, 40, C.wal);
    game.draw.sprite(WAL_FACE[0], WAL_PAL, 96, 96, 6, { anchor: 'center' });
    txt(knocked + ' / ' + GOAL, 160, 94, 62, C.ink, 'left');
    var frac = Math.max(0, timeLeft / TIME_LIMIT);
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 172, W - 120, 22, '#d6ecf7');
    game.draw.rect(60, 172, (W - 120) * frac, 22, low ? C.red : '#3fa9e0');
    txt('PERFECT ' + perfects, W - 60, 94, 40, C.gold, 'right');
  }

  // ---------- 入力(押した位置からの相対移動) ----------
  function setTarget(x, y) {
    var R = floeR() - 30;
    var tx = anchor.sx + (x - anchor.px) * 1.3, ty = anchor.sy + (y - anchor.py) * 1.3;
    var d = Math.hypot(tx - CX, ty - CY);
    if (d > R) { tx = CX + (tx - CX) / d * R; ty = CY + (ty - CY) / d * R; }
    anchor.tx = tx; anchor.ty = ty; anchor.fx = x; anchor.fy = y;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); demo.t = 0; return; }
    if (state === S.RESULT) { game.audio.play('se_tap', 0.3); state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = true;
    anchor = { px: x, py: y, sx: sealX, sy: sealY, tx: sealX, ty: sealY, fx: x, fy: y };
    game.audio.play('se_tap', 0.12);
    game.fx.burst(x, y, { color: '#ffffff', count: 4, speed: 100 });
  });
  game.onMove(function(x, y) {
    if (state !== S.PLAYING || !dragging || !anchor) return;
    setTarget(x, y);
    if (Math.random() < 0.04) game.audio.tone('C6', 0.03, { wave: 'triangle', volume: 0.03 });
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING) return;
    dragging = false; anchor = null;
    game.fx.burst(sealX, sealY + 40, { color: C.iceS, count: 3, speed: 80 });
  });

  // ---------- ATTRACT 実演(本番の stepWorld を AI の指で動かす) ----------
  var demo = { t: 0, gx: W / 2, gy: H * 0.8, press: false, fail: false };
  function stepDemo(dt) {
    demo.t += dt;
    var P = 3.4;
    var cyc = demo.t % P;
    if (cyc < dt || demo.t <= dt) {
      demo.fail = Math.floor(demo.t / P) % 2 === 1;
      initGame(); ready = 0; spawnT = 999;
      spawnWalrus(-Math.PI / 2 + (demo.fail ? 0.4 : -0.4), 0.9);
    }
    var w = walruses[0];
    var dodge = !demo.fail && w && (w.st === 'lock' || w.st === 'charge') && cyc < 2.4;
    if (dodge) {
      if (!dragging) {
        dragging = true;
        anchor = { px: W / 2, py: H * 0.8, sx: sealX, sy: sealY, tx: sealX, ty: sealY, fx: W / 2, fy: H * 0.8 };
      }
      var side = -w.dy >= 0 ? 1 : -1;
      var push = Math.min(1, w.t / 0.2 + (w.st === 'charge' ? 1 : 0));
      setTarget(W / 2 + side * 180 * push, H * 0.8);
      demo.gx = anchor.fx; demo.gy = anchor.fy; demo.press = true;
    } else {
      if (cyc > 2.4) { dragging = false; anchor = null; }
      demo.press = dragging;
      if (!dragging) { demo.gx = W / 2; demo.gy = H * 0.8; }
    }
    stepWorld(dt, false);
  }

  game.onUpdate(function(dt) {
    if (walruses === undefined) initGame();

    if (state === S.ATTRACT) {
      stepDemo(dt);
      stepCosmetic(dt);
      drawAll();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      game.draw.rect(0, 0, W, 226, '#ffffff', 0.75);
      txt(TITLE, W / 2, 86, 76, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 172, 36, C.wal);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.955, 44, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.955, 36, '#ffffff');
      return;
    }

    if (state === S.RESULT) {
      stepCosmetic(dt);
      drawAll();
      game.draw.rect(0, H * 0.3, W, H * 0.34, '#ffffff', 0.88);
      txt(ok ? 'CLEAR' : (timeUp ? 'TIME UP' : 'GAME OVER'), W / 2, H * 0.36, 96, ok ? C.good : C.red);
      txt(knocked + ' / ' + GOAL, W / 2, H * 0.44, 72, C.ink);
      txt('PERFECT ' + perfects + '   MISS ' + hits, W / 2, H * 0.51, 40, C.ink);
      if (ok && resultScore() >= game.best) txt('NEW RECORD', W / 2, H * 0.565, 50, C.gold);
      else txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.565, 40, C.ink);
      if (!ok) txt('あと' + (GOAL - knocked) + '頭!', W / 2, H * 0.61, 46, C.red);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.955, 40, '#ffffff');
      return;
    }

    // PLAYING
    if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else {
      var running = stepWorld(dt, true);
      if (done) {
        if (hitStop <= 0) {
          endWait -= dt;
          if (endWait <= 0) {
            state = S.RESULT;
            var stats = { knocked: knocked, perfect: perfects, hit: hits };
            if (ok) game.end.success(resultScore(), stats);
            else game.end.failure(stats);
          }
        }
      } else if (running && !finished && !fell) {
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0; timeUp = true;
          game.feedback.bad(sealX, sealY - 90, { text: 'TIME UP' });
          finishRound(false);
        }
      }
    }
    stepCosmetic(dt);
    drawAll();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.49, 100, C.red);
  });

  function resultScore() { return knocked * 100 + perfects * 50 + Math.round(timeLeft * 10); }

  game.onStart(function() {
    game.audio.melody([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['D5', 0.5], ['B4', 1], ['C5', 0.5], ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['C5', 2]], { tempo: 138, wave: 'triangle', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
