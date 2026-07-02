// 319-shadow-match.js
// シャドウマッチ — 上に映る黒いシルエットと同じ形を、下の選択肢から選んで当てる形あわせクイズ
// 操作: 左右スワイプで選択肢を移動、タップで決定
// 成功: 3問正解  失敗: 3問不正解 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影絵劇場） ──
  var C = { bg:'#0c0c1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', shadow:'#181830' };
  var SHAPE_COL = [C.f, C.d, C.b, C.a, C.e, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW MATCH';
  var HOW_TO_PLAY = 'SWIPE TO MOVE · TAP TO PICK THE MATCHING SHAPE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 15 → 3
  var MAX_WRONG = 3;         // 修正2: 5 → 3
  var NCHOICE = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var answer, choices, sel, phase, correct, wrong, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101020');
  }

  function background() { game.draw.clear(C.bg); }

  // 6形状をピクセルで描画: 0=三角 1=四角 2=星 3=円 4=ひし形 5=十字
  function drawShape(type, x, y, size, col, alpha) {
    if (type === 0) { for (var yy = -size; yy <= size; yy += 8) { var half = (yy + size) / (2 * size) * size; game.draw.rect(snap(x - half), snap(y + yy), snap(half * 2), 8, col, alpha); } }
    else if (type === 1) { game.draw.rect(snap(x - size), snap(y - size), snap(size * 2), snap(size * 2), col, alpha); }
    else if (type === 2) { pc(x, y, size * 0.6, col, alpha); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + i * Math.PI * 2 / 5; pc(x + Math.cos(a) * size * 0.85, y + Math.sin(a) * size * 0.85, size * 0.35, col, alpha); } }
    else if (type === 3) { pc(x, y, size, col, alpha); }
    else if (type === 4) { for (var yy2 = -size; yy2 <= size; yy2 += 8) { var half2 = (1 - Math.abs(yy2) / size) * size * 0.75; game.draw.rect(snap(x - half2), snap(y + yy2), snap(half2 * 2), 8, col, alpha); } }
    else { game.draw.rect(snap(x - size * 0.32), snap(y - size), snap(size * 0.64), snap(size * 2), col, alpha); game.draw.rect(snap(x - size), snap(y - size * 0.32), snap(size * 2), snap(size * 0.64), col, alpha); }
  }

  function newQuestion() {
    answer = Math.floor(Math.random() * 6); choices = [answer];
    while (choices.length < NCHOICE) { var c = Math.floor(Math.random() * 6); if (choices.indexOf(c) === -1) choices.push(c); }
    for (var i = choices.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = choices[i]; choices[i] = choices[j]; choices[j] = t; }
    sel = 0; phase = 'question';
  }

  function initGame() { correct = 0; wrong = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; newQuestion(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 500 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function choiceX(i) { var cw = snap(W * 0.28); return snap(W * 0.12 + i * (cw + W * 0.06) + cw / 2); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'question') return;
    phase = 'result';
    if (choices[sel] === answer) {
      correct++; fbText = 'CORRECT!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.6);
      for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: choiceX(sel), y: H * 0.70, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.6, col: C.b }); }
      if (correct >= NEEDED) { finish(true); return; }
    } else { wrong++; fbText = 'WRONG'; fbCol = C.a; fbTimer = 0.7; game.audio.play('se_failure', 0.5); if (wrong >= MAX_WRONG) { finish(false); return; } }
    setTimeout(function() { if (!done) newQuestion(); }, 700);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || phase !== 'question') return;
    if (d === 'right') sel = (sel + 1) % NCHOICE; else if (d === 'left') sel = (sel - 1 + NCHOICE) % NCHOICE;
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); game.draw.rect(snap(W * 0.1), snap(H * 0.22), snap(W * 0.8), snap(W * 0.7), C.shadow, 0.85); drawShape(2, W / 2, snap(H * 0.22) + snap(W * 0.35), 130, '#000', 0.9);
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'FOOLED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    txt('MATCH THE SHADOW', W / 2, snap(H * 0.20), 36, C.d);
    game.draw.rect(snap(W * 0.1), snap(H * 0.24), snap(W * 0.8), snap(W * 0.66), C.shadow, 0.85);
    drawShape(answer, W / 2, snap(H * 0.24) + snap(W * 0.33), 120, '#000', 0.9);
    // 選択肢
    var cw = snap(W * 0.28);
    for (var i = 0; i < NCHOICE; i++) {
      var cx = choiceX(i), cy = snap(H * 0.72), on = i === sel;
      game.draw.rect(cx - cw / 2 - 8, cy - cw / 2 - 8, cw + 16, cw + 16, on ? C.e : '#20203a', on ? 0.4 : 0.2);
      drawShape(choices[i], cx, cy, 66, SHAPE_COL[choices[i]], 0.9);
    }
    txt('v', choiceX(sel), snap(H * 0.62), 44, C.e);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.85), 60, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrong ? C.a : '#101020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
