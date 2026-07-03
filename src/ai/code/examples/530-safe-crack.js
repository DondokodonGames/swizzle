// 530-safe-crack.js
// 金庫破り — ダイヤルをスワイプで回し、正しい数字でタップ確定。3桁そろえて解錠する
// 操作: 右スワイプ=時計回り / 左スワイプ=反時計回り / タップ=その数字で確定（±1許容）
// 成功: 金庫 2個 解錠  失敗: 3回ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ゴールド金庫） ──
  var C = { bg:'#0a0800', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAFE CRACK';
  var HOW_TO_PLAY = 'SWIPE TO SPIN THE DIAL · TAP TO LOCK IN EACH DIGIT';
  var MAX_TIME = 20;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var NOTCH_COUNT = 40;
  var DIAL_R = 220, DIAL_X = W / 2, DIAL_Y = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var TARGET, currentDigit, dialAngle, dialVel, locked, opened, misses, timeLeft, done, particles, flash, flashCol, confirmed, openAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#1a1400');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(W / 2 - 340, snap(H * 0.16), 680, snap(H * 0.68), '#1c1608', 0.95);
    game.draw.rect(W / 2 - 300, snap(H * 0.19), 600, snap(H * 0.62), '#0a0800', 0.9);
  }

  function angleToDigit(angle) { return Math.floor(((360 - (angle % 360 + 360) % 360) / 360) * NOTCH_COUNT) % NOTCH_COUNT; }

  function newSafe() { TARGET = [Math.floor(Math.random() * 40), Math.floor(Math.random() * 40), Math.floor(Math.random() * 40)]; currentDigit = 0; confirmed = []; dialAngle = 0; dialVel = 0; openAnim = 0; }

  function initGame() { opened = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; locked = false; newSafe(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (opened * 1000 + Math.ceil(timeLeft) * 100) : opened * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 16, C.f, 0.5);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 8, '#5a4a10', 0.9);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, '#8b7a1a', 0.9);
    for (var ni = 0; ni < NOTCH_COUNT; ni++) {
      var na = (dialAngle + ni * 360 / NOTCH_COUNT) * Math.PI / 180, nr = DIAL_R - 18, big = ni % 8 === 0, nLen = big ? 28 : 14;
      game.draw.line(DIAL_X + Math.cos(na) * nr, DIAL_Y + Math.sin(na) * nr, DIAL_X + Math.cos(na) * (nr - nLen), DIAL_Y + Math.sin(na) * (nr - nLen), big ? C.c : C.f, big ? 4 : 2);
      if (big) txt(ni + '', DIAL_X + Math.cos(na) * (nr - 48), DIAL_Y + Math.sin(na) * (nr - 48) + 12, 26, C.c);
    }
    game.draw.circle(DIAL_X, DIAL_Y, 40, '#3a3008', 0.9);
    game.draw.circle(DIAL_X, DIAL_Y, 28, C.c, 0.9);
    game.draw.rect(DIAL_X - 6, DIAL_Y - DIAL_R - 30, 12, 30, C.g, 0.9);
    var curD = angleToDigit(dialAngle), tgt = TARGET[currentDigit], diff = Math.abs(curD - tgt), near = diff <= 1 || diff >= 39;
    txt(curD + '', DIAL_X, DIAL_Y + 20, 72, near ? C.b : C.c);
    for (var di = 0; di < 3; di++) {
      var sx = W / 2 - 130 + di * 130, sy = snap(H * 0.74), isC = di < confirmed.length, isCur = di === currentDigit;
      game.draw.rect(sx - 48, sy - 48, 96, 96, isC ? '#052010' : '#0a0800', 0.9);
      if (isC) txt('OK', sx, sy + 14, 40, C.b);
      else if (isCur && Math.floor(game.time.elapsed * 5) % 2 === 0) { game.draw.rect(sx - 48, sy - 48, 96, 96, C.c, 0.15); txt('' + (di + 1), sx, sy + 14, 40, C.c); }
      else txt('?', sx, sy + 14, 44, C.f);
    }
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || locked) return;
    if (dir === 'right') { dialVel += 90; game.audio.play('se_tap', 0.2); }
    else if (dir === 'left') { dialVel -= 90; game.audio.play('se_tap', 0.2); }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || locked) return;
    var d = angleToDigit(dialAngle), tgt = TARGET[currentDigit], diff = Math.abs(d - tgt), match = diff <= 1 || diff >= 39;
    if (match) {
      confirmed.push(d); game.audio.play('se_success', 0.6); flash = 0.3; flashCol = C.b;
      for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: DIAL_X, y: DIAL_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.b }); }
      currentDigit++;
      if (currentDigit >= 3) {
        locked = true; openAnim = 1.0; flash = 0.5; game.audio.play('se_success', 0.9); opened++;
        if (opened >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) { locked = false; newSafe(); } }, 1000);
      }
    } else { misses++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!TARGET) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.09, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.125, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRACKED!' : 'JAMMED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (openAnim > 0) openAnim -= dt * 1.5;
      if (!locked) { dialAngle += dialVel * dt; dialVel *= 0.88; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (openAnim > 0) game.draw.rect(W / 2 - 340, snap(H * 0.16), snap(680 * openAnim), snap(H * 0.68), C.b, openAnim * 0.3);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(opened + ' / ' + NEEDED, W / 2, 168, 48, C.c);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
