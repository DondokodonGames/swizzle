// 407-speed-reader.js
// スピードリーダー — 一瞬だけ光る単語を読み取り、隠れたあと3択から同じ単語を選ぶ速読ゲーム
// 操作: フラッシュ中に単語を読み、選択肢から正しいものをタップ
// 成功: 4問 正解  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電光掲示板） ──
  var C = { bg:'#030610', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var WORDS = ['APPLE', 'MOON', 'STAR', 'RIVER', 'CLOUD', 'CAT', 'DOG', 'FIRE', 'STONE', 'LEAF', 'WIND', 'RAIN', 'SNOW', 'BIRD', 'FISH', 'ROAD', 'HOUSE', 'LIGHT', 'OCEAN', 'FLAME'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPEED READER';
  var HOW_TO_PLAY = 'READ THE FLASH · PICK THE SAME WORD';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_WRONG = 3;
  var CH = 170, CY = snap(H * 0.60);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var iphase, target, choices, flashTime, flashTimer, flashAlpha, resultTimer, correct, wrong, timeLeft, done, particles, flash, flashCol, fbText;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101828');
  }

  function background() { game.draw.clear(C.bg); }

  function pickUnique(exclude) { var f = WORDS.filter(function(w) { return exclude.indexOf(w) === -1; }); return f[Math.floor(Math.random() * f.length)]; }

  function genRound() {
    flashTime = Math.max(0.2, 0.42 - correct * 0.04);
    target = WORDS[Math.floor(Math.random() * WORDS.length)];
    var cp = Math.floor(Math.random() * 3); choices = []; var used = [target];
    for (var ci = 0; ci < 3; ci++) { if (ci === cp) choices.push(target); else { var w = pickUnique(used); choices.push(w); used.push(w); } }
    flashTimer = flashTime; flashAlpha = 1.0; iphase = 'flash';
  }

  function initGame() { correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; fbText = ''; genRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'choose') return;
    if (y < CY || y > CY + CH * 3) return;
    var idx = Math.floor((y - CY) / CH); if (idx < 0 || idx > 2) return;
    if (choices[idx] === target) { correct++; flashCol = C.b; flash = 0.7; fbText = 'CORRECT!'; game.audio.play('se_success', 0.5); for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.4, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.6, col: C.b }); } if (correct >= NEEDED) { finish(true); return; } }
    else { wrong++; flashCol = C.a; flash = 0.7; fbText = 'IT WAS ' + target; game.audio.play('se_failure', 0.4); if (wrong >= MAX_WRONG) { finish(false); return; } }
    iphase = 'result'; resultTimer = 1.0;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE, W / 2, H * 0.22, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 24, C.b);
      txt('WORD', W / 2, H * 0.46, 100, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.78, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP READER!' : 'TOO SLOW', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (iphase === 'flash') { flashTimer -= dt; flashAlpha = Math.max(0, flashTimer / flashTime); if (flashTimer <= 0) { iphase = 'choose'; flashAlpha = 0; } }
      else if (iphase === 'result') { resultTimer -= dt; if (resultTimer <= 0) genRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (iphase === 'flash') { pc(W / 2, H * 0.36, 180, C.e, flashAlpha * 0.12); txt(target, W / 2, H * 0.38, 110, C.g); txt('READ!', W / 2, H * 0.54, 52, C.e); }
    else if (iphase === 'choose') {
      txt('WHICH WAS IT?', W / 2, snap(H * 0.36), 52, C.g); txt(Math.round(flashTime * 1000) + 'ms', W / 2, snap(H * 0.46), 36, '#889');
      for (var ci = 0; ci < 3; ci++) { var cy = CY + ci * CH; game.draw.rect(60, cy + 8, W - 120, CH - 16, C.d, 0.7); game.draw.rect(60, cy + 8, W - 120, 6, C.e, 0.5); txt(choices[ci], W / 2, cy + CH / 2 + 20, 66, C.g); }
    } else { txt(fbText, W / 2, snap(H * 0.42), 60, flashCol); txt(target, W / 2, snap(H * 0.54), 80, C.g); }

    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#101828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
