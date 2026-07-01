// 095-crowd-control.js
// 群衆整列 — バラバラに動く人々を障害物で誘導して全員ゴールへ導く
// 操作: タップで障害物を置いて群衆の流れを制御する
// 成功: 全2人をゴールへ  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'CROWD CONTROL';
  var HOW_TO_PLAY = 'TAP TO PLACE WALLS, HERD TO GOAL';
  var MAX_TIME = 30;
  var NUM_PEOPLE = 2;       // 修正2: 15 → 2
  var PERSON_R = 32, GOAL_X = W * 0.8, GOAL_Y = H * 0.55, GOAL_R = 100, SPAWN_X = W * 0.15, MAX_WALLS = 6;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var people, walls, score, timeLeft, done;

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
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() {
    people = [];
    for (var i = 0; i < NUM_PEOPLE; i++) people.push({ x: SPAWN_X + Math.random() * 40 - 20, y: H * 0.35 + i * (H * 0.3) + Math.random() * 60, vx: 70 + Math.random() * 40, vy: (Math.random() - 0.5) * 40, reached: false });
    walls = []; score = 0; timeLeft = MAX_TIME; done = false;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    if (walls.length < MAX_WALLS) { walls.push({ x: tx, y: ty, r: 48 }); game.audio.play('se_tap', 0.4); }
  });

  // 世界観: 避難誘導。障害物を置いて群衆の流れを作り全員をゴールへ導く。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(0, 300, W, H - 500, '#000822');
    txt('EVACUATION', W / 2, 250, 34, C.b);
  }

  function drawPerson(px, py) {
    drawPixelCircle(px, py, PERSON_R, C.b, 1);
    game.draw.rect(snap(px) - 12, snap(py) - PERSON_R - 8, 24, 24, C.b);   // 頭
    game.draw.rect(snap(px) - 8, snap(py) - PERSON_R - 4, 6, 6, '#000011');
    game.draw.rect(snap(px) + 2, snap(py) - PERSON_R - 4, 6, 6, '#000011');
  }

  function drawScene() {
    var lit = Math.floor(game.time.elapsed * 4) % 2 === 0;
    drawPixelCircle(GOAL_X, GOAL_Y, GOAL_R, C.f, lit ? 0.3 : 0.18);
    txt('GOAL', GOAL_X, GOAL_Y, 44, C.f);
    for (var w = 0; w < walls.length; w++) drawPixelCircle(walls[w].x, walls[w].y, walls[w].r, '#556', 1);
    for (var pi = 0; pi < people.length; pi++) { if (!people[pi].reached) drawPerson(people[pi].x, people[pi].y); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!people) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
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
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var i = 0; i < people.length; i++) {
        var p = people[i]; if (p.reached) continue;
        var dx = GOAL_X - p.x, dy = GOAL_Y - p.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < GOAL_R) { p.reached = true; score++; game.audio.play('se_tap', 0.7); if (score >= NUM_PEOPLE) { finish(true); return; } continue; }
        var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
        p.vx += (dx / dist) * spd * 0.03 + (Math.random() - 0.5) * 20 * dt;
        p.vy += (dy / dist) * spd * 0.03 + (Math.random() - 0.5) * 20 * dt;
        var ns = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (ns > 130) { p.vx *= 130 / ns; p.vy *= 130 / ns; } if (ns < 50) { p.vx *= 50 / ns; p.vy *= 50 / ns; }
        for (var w = 0; w < walls.length; w++) {
          var wdx = p.x - walls[w].x, wdy = p.y - walls[w].y, wd = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
          if (wd < walls[w].r + PERSON_R + 20) { var f = (walls[w].r + PERSON_R + 20 - wd) * 3; p.vx += (wdx / wd) * f * dt; p.vy += (wdy / wd) * f * dt; }
        }
        if (p.x < 50) p.vx = Math.abs(p.vx); if (p.x > W - 50) p.vx = -Math.abs(p.vx);
        if (p.y < 320) p.vy = Math.abs(p.vy); if (p.y > H - 320) p.vy = -Math.abs(p.vy);
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('GOAL ' + score + ' / ' + NUM_PEOPLE, W / 2, 96, 44, C.c);
    txt('WALLS LEFT ' + (MAX_WALLS - walls.length), W / 2, H - 90, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
