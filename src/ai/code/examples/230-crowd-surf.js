// 230-crowd-surf.js
// クラウドサーフ — ライブ会場で観客の手から手へ飛び移り、ステージまで運ばれていく
// 操作: タップした方向へ飛び、次に伸びた手に着地する
// 成功: 12m進む  失敗: 手のない床に落ちる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、深夜のライブ会場） ──
  var C = { bg:'#080412', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CROWD SURF';
  var HOW_TO_PLAY = 'TAP TO LEAP ONTO THE NEXT RAISED HAND';
  var MAX_TIME = 15;
  var NEEDED   = 12;          // 修正2: 30 → 12（進行スケール調整）
  var TOP = 220, CROWD_Y = snap(H * 0.55), FLOOR = snap(H * 0.6);
  var PLAYER_R = 32, HAND_R = 44, CATCH_R = 90, SCROLL = 200, DIST_RATE = 5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, onHand, hands, spawnTimer, distance, timeLeft, done, lights;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, CROWD_Y, W, H - CROWD_Y, C.d, 0.4);
    for (var li = 0; li < lights.length; li++) { var l = lights[li], pl = Math.floor(game.time.elapsed * 2 + l.phase) % 2; game.draw.rect(snap(l.x), snap(l.y), 10, 10, C.a, pl ? 0.6 : 0.2); }
    for (var si = 0; si < 12; si++) { var cx = si * (W / 11); game.draw.rect(snap(cx) - 18, CROWD_Y + Math.sin(si * 1.3 + game.time.elapsed) * 8, 36, H - CROWD_Y, C.d, 0.6); }
  }

  function drawHand(h) {
    var hy = handY(h), active = h.phase !== 'falling', col = active ? C.c : C.d;
    game.draw.rect(snap(h.x) - 12, CROWD_Y, 24, hy - CROWD_Y + HAND_R, col, active ? 0.8 : 0.4);
    pc(h.x, hy, HAND_R, col, active ? 0.9 : 0.4);
  }

  function handY(h) { var prog = 1 - h.upTimer / h.totalUp; if (h.phase === 'rising') return h.yBase + h.riseAmt * (1 - prog * 3); if (h.phase === 'up') return h.yBase; return h.yBase + h.riseAmt * prog; }

  function drawPlayer() { pc(px, py, PLAYER_R, C.f, 0.95); game.draw.rect(snap(px) - 8, snap(py) - 8, 6, 6, C.g); game.draw.rect(snap(px) + 4, snap(py) - 8, 6, 6, C.g); }

  function spawnHand(x) {
    var up = 0.6 + Math.random() * 1.0, yb = TOP + 140 + game.random(-40, 60);
    hands.push({ x: x, yBase: yb, upTimer: up, totalUp: up, phase: 'rising', riseAmt: 80 + Math.random() * 50 });
  }

  function initGame() {
    hands = []; spawnHand(W / 2); hands[0].phase = 'up'; onHand = 0; px = W / 2; py = handY(hands[0]) - PLAYER_R; pvx = 0; pvy = 0;
    spawnTimer = 0.7; distance = 0; timeLeft = MAX_TIME; done = false;
    lights = []; for (var i = 0; i < 20; i++) lights.push({ x: Math.random() * W, y: CROWD_Y + Math.random() * (H - CROWD_Y), phase: Math.random() * Math.PI * 2 });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(distance) * 60 + Math.ceil(timeLeft) * 40) : Math.ceil(distance) * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || onHand < 0) return;
    pvx = (x - px) * 2.5; pvy = -640; onHand = -1; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lights) initGame(); background(); for (var i = 0; i < hands.length; i++) drawHand(hands[i]); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STAGE DIVE!' : 'DROPPED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (onHand >= 0) { distance += DIST_RATE * dt; if (distance >= NEEDED) { finish(true); return; } }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnHand(W + 80); spawnTimer = 0.8 * (0.7 + Math.random() * 0.6); }
      for (var hi = hands.length - 1; hi >= 0; hi--) {
        var h = hands[hi]; h.x -= SCROLL * dt; h.upTimer -= dt;
        if (h.upTimer < 0) { if (h.phase === 'up') h.phase = 'falling'; else if (h.phase === 'rising') h.phase = 'up'; h.upTimer = h.totalUp * 0.3; }
        if (h.x < -100) { if (onHand === hi) { onHand = -1; pvy = 400; } hands.splice(hi, 1); if (onHand > hi) onHand--; continue; }
        if (onHand === hi) { px = h.x; py = handY(h) - PLAYER_R; pvx = -SCROLL; pvy = 0; }
      }
      if (onHand < 0) {
        pvx *= 0.95; pvy += 800 * dt; px += pvx * dt; py += pvy * dt; px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px));
        for (var hj = 0; hj < hands.length; hj++) { if (hands[hj].phase === 'falling') continue; var hy = handY(hands[hj]); if (Math.hypot(px - hands[hj].x, py - hy) < CATCH_R && pvy > 0) { onHand = hj; py = hy - PLAYER_R; pvy = 0; game.audio.play('se_success', 0.4); break; } }
        if (py > FLOOR && onHand < 0) { finish(false); return; }
      }
    }

    // ---- 描画 ----
    background();
    for (var hk = 0; hk < hands.length; hk++) drawHand(hands[hk]);
    drawPlayer();

    game.draw.rect(0, H - 60, W * Math.min(1, distance / NEEDED), 14, C.b, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(distance) + ' / ' + NEEDED + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
