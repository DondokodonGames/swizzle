// 562-sumo-push.js
// スモウプッシュ — 土俵でスワイプして体当たりし、相手力士を俵の外へ押し出す
// 操作: スワイプで自分（青）を押し込む方向を決める（タップした方向へも突進）
// 成功: 相手を 2回 押し出す  失敗: 自分が 3回 出る or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、土俵） ──
  var C = { bg:'#1a1208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CX = W / 2, CY = snap(H * 0.44), RING_R = 300, PLAYER_R = 60;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SUMO PUSH';
  var HOW_TO_PLAY = 'SWIPE TO CHARGE · SHOVE THE RED WRESTLER OUT OF THE RING';
  var MAX_TIME = 18;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var MAX_LOSS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, enemy, wins, losses, timeLeft, done, particles, flash, flashCol, roundResult, roundTimer, roundState, waitTimer, enemyTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha, w) { w = w || 8; var n = Math.max(8, Math.ceil(r / 5)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(a) * r) - w / 2, snap(cy + Math.sin(a) * r) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2d1a08');
  }

  function background() {
    game.draw.clear(C.bg);
    pc(CX, CY, RING_R + 24, '#8b6020', 0.9); pc(CX, CY, RING_R, '#d4a030', 0.95); pc(CX, CY, RING_R - 16, '#e8c87a', 0.3);
    ring(CX, CY, RING_R, '#8b6020', 0.8, 10);
    game.draw.rect(CX - 60, CY - 3, 120, 6, '#8b6020', 0.8);
  }

  function resetRound() { player = { x: CX - 90, y: CY, vx: 0, vy: 0 }; enemy = { x: CX + 90, y: CY, vx: 0, vy: 0 }; roundState = 'fighting'; enemyTimer = 0.3; }

  function initGame() { wins = 0; losses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; roundResult = ''; roundTimer = 0; resetRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (wins * 1200 + Math.ceil(timeLeft) * 100) : wins * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(enemy.x, enemy.y, PLAYER_R, C.a, 0.9); pc(enemy.x - 14, enemy.y - 16, 16, C.g, 0.5); txt('E', enemy.x, enemy.y + 14, 40, C.g);
    pc(player.x, player.y, PLAYER_R, C.e, 0.9); pc(player.x - 14, player.y - 16, 16, C.g, 0.5); txt('P', player.x, player.y + 14, 40, C.g);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || roundState !== 'fighting') return;
    var P = 800;
    if (dir === 'up') player.vy -= P; if (dir === 'down') player.vy += P; if (dir === 'left') player.vx -= P; if (dir === 'right') player.vx += P;
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || roundState !== 'fighting') return;
    var dx = tx - player.x, dy = ty - player.y, len = Math.hypot(dx, dy); if (len > 0) { player.vx += dx / len * 600; player.vy += dy / len * 600; } game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YOKOZUNA!' : 'DEFEATED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(wins > losses); return; }
      if (flash > 0) flash -= dt * 2.5; if (roundTimer > 0) roundTimer -= dt;
      if (roundState === 'result') { waitTimer -= dt; if (waitTimer <= 0) resetRound(); }
      else {
        enemyTimer -= dt;
        if (enemyTimer <= 0) { enemyTimer = 0.3 + Math.random() * 0.4; var dx2 = player.x - enemy.x, dy2 = player.y - enemy.y, l2 = Math.hypot(dx2, dy2), edge = Math.hypot(enemy.x - CX, enemy.y - CY); if (edge > RING_R * 0.7) { var tx = CX - enemy.x, ty = CY - enemy.y, tl = Math.hypot(tx, ty); enemy.vx += tx / tl * 500; enemy.vy += ty / tl * 500; } else if (l2 > 0) { enemy.vx += dx2 / l2 * 600; enemy.vy += dy2 / l2 * 600; } }
        var upd = function(ch) { ch.x += ch.vx * dt; ch.y += ch.vy * dt; ch.vx *= Math.pow(0.15, dt); ch.vy *= Math.pow(0.15, dt); }; upd(player); upd(enemy);
        var dx3 = player.x - enemy.x, dy3 = player.y - enemy.y, dist = Math.hypot(dx3, dy3), minD = PLAYER_R * 2;
        if (dist < minD && dist > 0) { var push = (minD - dist) / 2, nx = dx3 / dist, ny = dy3 / dist; player.x += nx * push; player.y += ny * push; enemy.x -= nx * push; enemy.y -= ny * push; var rn = (player.vx - enemy.vx) * nx + (player.vy - enemy.vy) * ny; if (rn < 0) { player.vx -= rn * nx * 0.8; player.vy -= rn * ny * 0.8; enemy.vx += rn * nx * 0.8; enemy.vy += rn * ny * 0.8; } }
        var out = function(ch) { return Math.hypot(ch.x - CX, ch.y - CY) > RING_R + PLAYER_R * 0.5; };
        if (out(player)) { losses++; roundResult = 'LOSE'; flash = 0.5; flashCol = C.a; roundTimer = 1.2; game.audio.play('se_failure', 0.6); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.e }); } roundState = 'result'; waitTimer = 1.2; if (losses >= MAX_LOSS) { finish(false); return; } }
        else if (out(enemy)) { wins++; roundResult = 'WIN!'; flash = 0.5; flashCol = C.b; roundTimer = 1.2; game.audio.play('se_success', 0.8); for (var pi2 = 0; pi2 < 12; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(a2) * 220, vy: Math.sin(a2) * 220, life: 0.5, col: C.a }); } roundState = 'result'; waitTimer = 1.2; if (wins >= NEEDED) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    if (roundTimer > 0) txt(roundResult, W / 2, CY + RING_R + 80, 80, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('WIN ' + wins + '/' + NEEDED + '   LOSE ' + losses + '/' + MAX_LOSS, W / 2, 168, 42, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
