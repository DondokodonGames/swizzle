// 028-chain-burst.js
// チェーンバースト — 連鎖爆発の気持ちよさ、最大コンボを狙え
// 操作: タップで爆弾を起動、爆発が他の爆弾を誘爆する
// 成功: 1回のタップで1個以上の爆弾を連鎖爆発させる  失敗: 3回チャレンジ全敗

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'CHAIN BURST';
  var HOW_TO_PLAY = 'TAP A BOMB TO IGNITE';
  var BOMB_R = 56, EXPLODE_R = 200, CHAIN_DELAY = 0.06;
  var NEEDED = 1;            // 修正2: 10連鎖 → 1
  var MAX_ATTEMPTS = 3;
  var TOP = 240, BOTTOM = H - 220;   // 修正1: 爆弾を縦全域に配置

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var bombs, explosions, pendingExplode, bestChain, currentChain, attempts, done, phase, resultTimer, resultOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function placeBombs() {
    bombs = []; explosions = []; pendingExplode = []; currentChain = 0;
    var count = 18 + Math.floor(Math.random() * 6), tries = 0;
    while (bombs.length < count && tries < 1000) {
      tries++;
      var bx = snap(game.random(BOMB_R + 40, W - BOMB_R - 40)), by = snap(game.random(TOP, BOTTOM));
      var ok = true;
      for (var i = 0; i < bombs.length; i++) { var dx = bombs[i].x - bx, dy = bombs[i].y - by; if (Math.sqrt(dx * dx + dy * dy) < BOMB_R * 2.2) { ok = false; break; } }
      if (ok) bombs.push({ x: bx, y: by, alive: true, exploding: false });
    }
    phase = 'place';
  }
  function initGame() { bestChain = 0; attempts = 0; done = false; resultTimer = 0; resultOk = false; placeBombs(); }

  function triggerBomb(i, delay) {
    if (i < 0 || i >= bombs.length || !bombs[i].alive || bombs[i].exploding) return;
    bombs[i].exploding = true; pendingExplode.push({ idx: i, delay: delay });
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (currentChain * 100 + (MAX_ATTEMPTS - attempts) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1500);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'place') return;
    var hit = -1;
    for (var i = 0; i < bombs.length; i++) { if (!bombs[i].alive) continue; var dx = bombs[i].x - x, dy = bombs[i].y - y; if (Math.sqrt(dx * dx + dy * dy) < BOMB_R + 24) { hit = i; break; } }
    if (hit === -1) return;
    attempts++; phase = 'exploding'; triggerBomb(hit, 0);
    game.audio.play('se_tap', 0.8);
  });

  function background() { game.draw.clear(C.bg); }

  // ── ドット絵スプライト: 爆弾（球体＋ハイライト＋導火線＋火花）──
  function drawBomb(x, y, exploding) {
    var bx = snap(x), by = snap(y);
    drawPixelCircle(bx, by, BOMB_R, exploding ? C.e : C.a, 1);
    game.draw.rect(bx - BOMB_R + 16, by - BOMB_R + 16, 16, 16, C.g, 0.6);  // ハイライト
    game.draw.rect(bx - 6, by - BOMB_R - 28, 12, 32, C.d);                 // 導火線基部
    game.draw.rect(bx + 6, by - BOMB_R - 40, 12, 16, C.d);                 // 導火線曲がり
    var on = Math.floor(game.time.elapsed * 16) % 2 === 0;                 // 火花点滅
    game.draw.rect(bx + 8, by - BOMB_R - 52, 16, 16, exploding || on ? C.f : '#ff8800');
  }

  function drawScene() {
    for (var ex = 0; ex < explosions.length; ex++) { var exp = explosions[ex], ea = exp.life / 0.5; drawPixelCircle(exp.x, exp.y, exp.r, C.f, ea * 0.7); }
    for (var b = 0; b < bombs.length; b++) {
      var bomb = bombs[b]; if (!bomb.alive) continue;
      drawBomb(bomb.x, bomb.y, bomb.exploding);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bombs) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.12, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.2, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.89, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (phase === 'exploding') {
      for (var i = pendingExplode.length - 1; i >= 0; i--) {
        pendingExplode[i].delay -= dt;
        if (pendingExplode[i].delay <= 0) {
          var bIdx = pendingExplode[i].idx; pendingExplode.splice(i, 1);
          if (bombs[bIdx].alive) {
            bombs[bIdx].alive = false; currentChain++; if (currentChain > bestChain) bestChain = currentChain;
            explosions.push({ x: bombs[bIdx].x, y: bombs[bIdx].y, r: 0, maxR: EXPLODE_R, life: 0.5 });
            game.audio.play('se_tap', Math.min(1, 0.5 + currentChain * 0.05));
            for (var j = 0; j < bombs.length; j++) {
              if (!bombs[j].alive || bombs[j].exploding) continue;
              var dx = bombs[j].x - bombs[bIdx].x, dy = bombs[j].y - bombs[bIdx].y;
              if (Math.sqrt(dx * dx + dy * dy) < EXPLODE_R + BOMB_R) triggerBomb(j, CHAIN_DELAY + Math.random() * 0.04);
            }
          }
        }
      }
      if (pendingExplode.length === 0) {
        resultOk = currentChain >= NEEDED; resultTimer = 1.0; phase = 'result';
        if (resultOk) finish(true);
        else if (attempts >= MAX_ATTEMPTS) finish(false);
        else game.audio.play('se_failure', 0.5);
      }
    } else if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0 && !done) placeBombs();
    }

    for (var e = explosions.length - 1; e >= 0; e--) { var exp2 = explosions[e]; exp2.r = exp2.maxR * (1 - exp2.life / 0.5); exp2.life -= dt; if (exp2.life <= 0) explosions.splice(e, 1); }

    // ---- draw ----
    background();
    drawScene();
    if (phase === 'exploding' && currentChain > 0) txt('CHAIN ' + currentChain + '!', W / 2, H * 0.5, 96, C.f);
    if (phase === 'result' && !done) txt('AGAIN!', W / 2, H * 0.5, 72, C.c);
    txt('BEST CHAIN ' + bestChain, W / 2, 96, 48, C.d);
    txt('CHANCE ' + (MAX_ATTEMPTS - attempts), W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
