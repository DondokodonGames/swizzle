// 426-light-switch.js
// 電灯パズル — 全てのライトを消すパズルゲーム（ライツアウト）
// 操作: タップでライトを切り替える（隣接するライトも連動して切り替わる）
// 成功: 全消灯を3回達成  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040a0f',
    room:   '#0a1520',
    onLight:'#fde68a',
    onGlow: '#f59e0b',
    offLight:'#1e293b',
    offInner:'#0f172a',
    switch0:'#64748b',
    switch1:'#94a3b8',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 4;
  var CELL_W = 200;
  var CELL_H = 200;
  var GAP = 20;
  var BOARD_W = GRID * CELL_W + (GRID-1) * GAP;
  var BOARD_H = GRID * CELL_H + (GRID-1) * GAP;
  var BOARD_X = (W - BOARD_W) / 2;
  var BOARD_Y = (H - BOARD_H) / 2;

  var lights = [];  // 16 values: true = on, false = off
  var solved = 0;
  var NEEDED = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var tapAnim = [];  // { idx, t }

  function initPuzzle() {
    lights = [];
    for (var i = 0; i < GRID * GRID; i++) lights.push(false);
    tapAnim = [];

    // Make a random solvable puzzle by doing N random valid moves
    var moves = 5 + Math.floor(Math.random() * 8);
    for (var m = 0; m < moves; m++) {
      var idx = Math.floor(Math.random() * GRID * GRID);
      toggleGroup(idx, true);
    }
    // If accidentally solved, retry
    if (allOff()) initPuzzle();
  }

  function toggleGroup(idx, silent) {
    toggle(idx);
    var row = Math.floor(idx / GRID);
    var col = idx % GRID;
    if (row > 0) toggle(idx - GRID);
    if (row < GRID-1) toggle(idx + GRID);
    if (col > 0) toggle(idx - 1);
    if (col < GRID-1) toggle(idx + 1);
    if (!silent) {
      tapAnim.push({ idx: idx, t: 0 });
      game.audio.play('se_tap', 0.3);
    }
  }

  function toggle(idx) {
    lights[idx] = !lights[idx];
  }

  function allOff() {
    for (var i = 0; i < lights.length; i++) {
      if (lights[i]) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - BOARD_X) / (CELL_W + GAP));
    var row = Math.floor((ty - BOARD_Y) / (CELL_H + GAP));
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = row * GRID + col;
    toggleGroup(idx, false);

    if (allOff()) {
      solved++;
      flashCol = C.correct;
      flashAnim = 0.9;
      game.audio.play('se_success', 0.7);
      if (solved >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(solved * 1500 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
      setTimeout(function() { initPuzzle(); }, 1000);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 1.5;

    for (var ai = tapAnim.length-1; ai >= 0; ai--) {
      tapAnim[ai].t = Math.min(1, tapAnim[ai].t + dt * 4);
      if (tapAnim[ai].t >= 1) tapAnim.splice(ai, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.room, 0.5);

    // Ambient light from on-lights
    var onCount = 0;
    for (var li = 0; li < lights.length; li++) if (lights[li]) onCount++;
    if (onCount > 0) {
      game.draw.rect(0, 0, W, H, C.onGlow, onCount / lights.length * 0.08);
    }

    // Board
    game.draw.rect(BOARD_X - 20, BOARD_Y - 20, BOARD_W + 40, BOARD_H + 40, '#0a1020', 0.7);

    // Lights
    for (var li2 = 0; li2 < GRID * GRID; li2++) {
      var lr = Math.floor(li2 / GRID);
      var lc = li2 % GRID;
      var lx = BOARD_X + lc * (CELL_W + GAP);
      var ly = BOARD_Y + lr * (CELL_H + GAP);
      var isOn = lights[li2];

      if (isOn) {
        // Glow
        game.draw.circle(lx + CELL_W/2, ly + CELL_H/2, CELL_W * 0.65, C.onGlow, 0.3);
        game.draw.rect(lx, ly, CELL_W, CELL_H, C.onLight, 0.9);
        game.draw.rect(lx + 8, ly + 8, CELL_W/3, CELL_H/4, '#fff', 0.3);
        // Filament
        game.draw.circle(lx + CELL_W/2, ly + CELL_H/2, 20, '#fff', 0.9);
      } else {
        game.draw.rect(lx, ly, CELL_W, CELL_H, C.offLight, 0.85);
        game.draw.rect(lx + 8, ly + 8, CELL_W/3, CELL_H/4, '#fff', 0.05);
        game.draw.circle(lx + CELL_W/2, ly + CELL_H/2, 18, C.offInner, 0.9);
      }

      // Tap ripple
      for (var ai2 = 0; ai2 < tapAnim.length; ai2++) {
        if (tapAnim[ai2].idx === li2) {
          var t = tapAnim[ai2].t;
          game.draw.circle(lx + CELL_W/2, ly + CELL_H/2, t * CELL_W * 0.8, '#fff', (1-t) * 0.25);
        }
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Progress dots
    for (var si = 0; si < NEEDED; si++) {
      game.draw.circle(W/2 - (NEEDED-1)*44 + si*88, H*0.88, 22, si < solved ? C.correct : C.ui, 0.9);
    }

    // On count indicator
    var onNum = 0;
    for (var k = 0; k < lights.length; k++) if (lights[k]) onNum++;
    game.draw.text('点灯: ' + onNum, W/2, 148, { size: 56, color: onNum === 0 ? C.correct : C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.switch1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initPuzzle();
  });
})(game);
