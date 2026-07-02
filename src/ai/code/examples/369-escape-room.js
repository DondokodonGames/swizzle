// 369-escape-room.js
// エスケープルーム — マスターマインド式ヒントを頼りに3桁の暗証番号を当てて扉を開ける
// 操作: 数字パッドをタップして3桁入力、DELで訂正。黒=位置一致 白=数字のみ一致
// 成功: 2部屋 脱出  失敗: 4回 間違える or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、密室） ──
  var C = { bg:'#080614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ESCAPE ROOM';
  var HOW_TO_PLAY = 'CRACK THE 3-DIGIT CODE · BLACK=SPOT  WHITE=DIGIT';
  var MAX_TIME = 30;
  var ROOMS = 2;             // 修正2: 3 → 2
  var DIGITS = 3;            // 修正2: 4桁 → 3桁
  var MAX_MISTAKES = 4;      // 修正2: 5 → 4

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var room, code, input, clues, mistakes, timeLeft, done, particles, shake, openAnim, locked;

  var PAD = [1,2,3,4,5,6,7,8,9,0];
  var PCOLS = 3, PW = snap(W * 0.26), PH = 130, PSX = snap(W / 2 - PCOLS * snap(W * 0.26) / 2), PSY = snap(H * 0.60);

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); }

  function genCode() {
    var digs = [0,1,2,3,4,5,6,7,8,9];
    for (var i = digs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = digs[i]; digs[i] = digs[j]; digs[j] = t; }
    code = digs.slice(0, DIGITS); input = []; clues = []; locked = false;
  }

  function checkGuess(g) {
    var blacks = 0, whites = 0, cc = code.slice(), gc = g.slice();
    for (var i = 0; i < DIGITS; i++) if (gc[i] === cc[i]) { blacks++; cc[i] = -1; gc[i] = -2; }
    for (var k = 0; k < DIGITS; k++) { if (gc[k] === -2) continue; var idx = cc.indexOf(gc[k]); if (idx >= 0) { whites++; cc[idx] = -1; } }
    return { blacks: blacks, whites: whites };
  }

  function initGame() { room = 0; mistakes = 0; timeLeft = MAX_TIME; done = false; particles = []; shake = 0; openAnim = 0; genCode(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (room * 800 + Math.ceil(timeLeft) * 60 - mistakes * 80) : room * 300;
    if (finalScore < 0) finalScore = 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function submit() {
    var res = checkGuess(input);
    clues.push({ guess: input.slice(), blacks: res.blacks, whites: res.whites });
    if (res.blacks === DIGITS) {
      openAnim = 1.2; locked = true; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.30, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 - 60, life: 0.8, col: C.b }); }
      setTimeout(function() {
        if (done) return; room++;
        if (room >= ROOMS) { finish(true); return; }
        genCode(); openAnim = 0;
      }, 1300);
    } else {
      mistakes++; shake = 0.4; input = []; game.audio.play('se_failure', 0.3);
      if (mistakes >= MAX_MISTAKES) { finish(false); return; }
    }
  }

  function drawDoor() {
    var dW = 440, dH = 480, dX = W / 2 - dW / 2, dY = snap(H * 0.10);
    var open = openAnim > 0 ? (1 - openAnim / 1.2) * dW * 0.5 : 0;
    var sh = shake > 0 ? Math.sin(game.time.elapsed * 40) * 14 * shake : 0;
    game.draw.rect(snap(dX + sh - open), dY, snap(dW - open * 2), dH, '#1a2036', 0.95);
    game.draw.rect(snap(dX + sh - open + 10), dY + 10, snap(dW - open * 2 - 20), dH - 20, C.d, 0.25);
    if (openAnim <= 0) { pc(W / 2 + sh, dY + dH * 0.6, 24, '#04060e', 0.95); game.draw.rect(snap(W / 2 - 8 + sh), snap(dY + dH * 0.6), 16, 40, '#04060e', 0.95); }
    else pc(W / 2, dY + dH * 0.5, 40, C.c, 0.5 * (openAnim / 1.2));
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || locked) return;
    for (var i = 0; i < 10; i++) {
      var col = i % PCOLS, row = Math.floor(i / PCOLS), px = PSX + col * PW, py = PSY + row * PH;
      if (x >= px && x < px + PW && y >= py && y < py + PH) {
        if (input.length < DIGITS) { input.push(PAD[i]); game.audio.play('se_tap', 0.3); if (input.length === DIGITS) submit(); }
        return;
      }
    }
    // DEL
    if (input.length > 0 && y > PSY + 3 * PH && x < W * 0.4) { input.pop(); game.audio.play('se_tap', 0.2); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawDoor();
      txt(GAME_TITLE, W / 2, H * 0.66, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'LOCKED IN', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (shake > 0) shake -= dt * 3; if (openAnim > 0) openAnim -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawDoor();
    txt('ROOM ' + (room + 1) + ' / ' + ROOMS, W / 2, snap(H * 0.075), 34, C.e);

    // 入力表示
    var iy = snap(H * 0.50);
    for (var d = 0; d < DIGITS; d++) { var ix = snap(W / 2 - (DIGITS - 1) * 70 + d * 140); game.draw.rect(ix - 48, iy - 48, 96, 96, C.d, 0.4); txt(d < input.length ? input[d] + '' : '_', ix, iy + 16, 56, d < input.length ? C.e : '#556', 'center'); }

    // ヒント履歴（直近3件）
    var hs = Math.max(0, clues.length - 3);
    for (var ci = hs; ci < clues.length; ci++) {
      var cl = clues[ci], hy = iy + 100 + (ci - hs) * 56;
      for (var gi = 0; gi < DIGITS; gi++) txt(cl.guess[gi] + '', snap(W / 2 - 200 + gi * 70), hy, 34, '#889', 'center');
      for (var bi = 0; bi < cl.blacks; bi++) pc(snap(W / 2 + 60 + bi * 40), hy - 8, 12, C.g, 0.95);
      for (var wi = 0; wi < cl.whites; wi++) pc(snap(W / 2 + 60 + (cl.blacks + wi) * 40), hy - 8, 12, C.e, 0.7);
    }

    // 数字パッド
    for (var pi2 = 0; pi2 < 10; pi2++) {
      var col2 = pi2 % PCOLS, row2 = Math.floor(pi2 / PCOLS), px2 = PSX + col2 * PW, py2 = PSY + row2 * PH;
      game.draw.rect(px2 + 8, py2 + 8, PW - 16, PH - 16, C.d, 0.7); game.draw.rect(px2 + 8, py2 + 8, PW - 16, 4, C.e, 0.5);
      txt(PAD[pi2] + '', px2 + PW / 2, py2 + PH / 2 + 16, 56, C.g, 'center');
    }
    txt('DEL', W * 0.16, PSY + 3 * PH + PH / 2 + 12, 40, C.a);

    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('ROOM ' + (room + 1) + '/' + ROOMS, W / 2, 168, 44, C.b);
    for (var mi = 0; mi < MAX_MISTAKES; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISTAKES - 1) / 2) * 56) - 10, 224, 20, 20, mi < mistakes ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
