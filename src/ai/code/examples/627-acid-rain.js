// 627-acid-rain.js
// アシッドレイン — 傘を左右に動かして、降り注ぐ酸性雨からキャラを守り抜く
// 操作: タップした位置へ傘が移動（左右スワイプでも寄せられる）。傘で雨を受け止める
// 成功: 15秒 守り切る  失敗: HPが0 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、酸性雨） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ACID RAIN';
  var HOW_TO_PLAY = 'TAP OR SWIPE TO MOVE THE UMBRELLA · SHIELD YOURSELF FROM THE ACID RAIN';
  var MAX_TIME = 15;         // 修正2: 30 → 15
  var UMB_W = 280, UMB_H = 30, UMB_Y = snap(H * 0.72), PLAYER_Y = snap(H * 0.72) + 90;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var umbX, targetX, drops, hp, timeLeft, done, particles, flash, spawnTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnDrop() { drops.push({ x: 20 + Math.random() * (W - 40), y: -20, vy: 340 + Math.random() * 180 + (MAX_TIME - timeLeft) * 8, r: 10 + Math.random() * 8 }); }

  function initGame() { umbX = W / 2; targetX = W / 2; drops = []; hp = 100; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; spawnTimer = 0; for (var i = 0; i < 5; i++) spawnDrop(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(hp) * 100 + MAX_TIME * 100) : Math.round(Math.ceil(hp) * 50);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var di = 0; di < drops.length; di++) { var d = drops[di]; pc(d.x, d.y, d.r, C.b, 0.9); pc(d.x, d.y - d.r * 0.4, d.r * 0.4, C.g, 0.6); }
    var ux = umbX - UMB_W / 2;
    pc(umbX, UMB_Y, UMB_W / 2, C.f, 0.9);
    game.draw.rect(snap(ux), UMB_Y, UMB_W, UMB_H / 2, C.f, 0.7);
    game.draw.rect(snap(umbX) - 4, UMB_Y + UMB_H / 2, 8, 70, C.c, 0.8);
    pc(W / 2, PLAYER_Y, 40, C.e, 0.9); pc(W / 2 - 12, PLAYER_Y - 12, 14, C.g, 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') targetX = Math.max(UMB_W / 2 + 20, targetX - 200); else if (dir === 'right') targetX = Math.min(W - UMB_W / 2 - 20, targetX + 200); game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = Math.max(UMB_W / 2 + 20, Math.min(W - UMB_W / 2 - 20, tx)); game.audio.play('se_tap', 0.08);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!drops) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STAYED SAFE!' : 'DISSOLVED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4;
      umbX += (targetX - umbX) * Math.min(1, dt * 10);
      spawnTimer += dt; var rate = Math.max(0.05, 0.18 - (MAX_TIME - timeLeft) * 0.006);
      if (spawnTimer > rate) { spawnTimer = 0; spawnDrop(); }
      for (var di = drops.length - 1; di >= 0; di--) {
        var d = drops[di]; d.y += d.vy * dt;
        if (d.y + d.r >= UMB_Y && d.y - d.r <= UMB_Y + UMB_H && d.x >= umbX - UMB_W / 2 && d.x <= umbX + UMB_W / 2) {
          for (var p = 0; p < 3; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: d.x, y: UMB_Y, vx: Math.cos(a) * 80, vy: -Math.abs(Math.sin(a)) * 120, life: 0.3, col: C.g }); }
          drops.splice(di, 1); continue;
        }
        if (d.y >= PLAYER_Y - 50 && d.y <= PLAYER_Y + 50 && Math.abs(d.x - W / 2) < 60) {
          hp = Math.max(0, hp - (8 + Math.random() * 5)); drops.splice(di, 1); flash = 0.3; game.audio.play('se_failure', 0.2);
          for (var p2 = 0; p2 < 4; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: PLAYER_Y, vx: Math.cos(a2) * 100, vy: Math.sin(a2) * 100, life: 0.3, col: C.a }); }
          if (hp <= 0) { finish(false); return; } continue;
        }
        if (d.y > H + 20) drops.splice(di, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 3; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    // HP bar
    var hpR = Math.max(0, hp / 100);
    game.draw.rect(W / 2 - 200, snap(H * 0.90), 400, 20, '#002200', 0.7);
    game.draw.rect(W / 2 - 200, snap(H * 0.90), 400 * hpR, 20, hpR > 0.4 ? C.b : C.a, 0.9);
    txt('HP ' + Math.ceil(hp), W / 2, snap(H * 0.90) + 44, 30, hpR > 0.4 ? C.b : C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
