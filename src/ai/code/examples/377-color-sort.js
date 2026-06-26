// 377-color-sort.js
// カラーソート — 試験管の液体を移し替えて色ごとに分ける
// 操作: タップで試験管を選んで別の試験管にタップして注ぐ
// 成功: 全部の色を分ける  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a18',
    tube:   '#1e293b',
    tubeHi: '#334155',
    tubeSel:'#4f46e5',
    glass:  '#7dd3fc',
    glassHi:'#e0f2fe',
    colors: ['#ef4444','#22c55e','#3b82f6','#f59e0b','#a855f7'],
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var NUM_COLORS = 4;
  var TUBE_CAP = 4;   // layers per tube
  var NUM_TUBES = NUM_COLORS + 2;  // extra empty tubes

  var tubes = [];
  var selected = -1;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var pourAnim = null;   // { from, to, color, progress }

  var TUBE_W = 80;
  var TUBE_H = 280;
  var TUBE_GAP = 20;
  var totalW = NUM_TUBES * (TUBE_W + TUBE_GAP) - TUBE_GAP;
  var OX = (W - totalW) / 2;
  var OY = H * 0.38;

  function shuffleTubes() {
    // Create a solvable mix
    var all = [];
    for (var c = 0; c < NUM_COLORS; c++) {
      for (var l = 0; l < TUBE_CAP; l++) {
        all.push(c);
      }
    }
    // Fisher-Yates shuffle
    for (var i = all.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = all[i]; all[i] = all[j]; all[j] = tmp;
    }
    tubes = [];
    for (var t = 0; t < NUM_TUBES; t++) {
      if (t < NUM_COLORS) {
        tubes.push(all.slice(t * TUBE_CAP, (t + 1) * TUBE_CAP));
      } else {
        tubes.push([]); // empty
      }
    }
  }

  function isSolved() {
    var filled = 0;
    for (var t = 0; t < NUM_TUBES; t++) {
      if (tubes[t].length === 0) continue;
      if (tubes[t].length !== TUBE_CAP) return false;
      var c = tubes[t][0];
      for (var l = 1; l < TUBE_CAP; l++) {
        if (tubes[t][l] !== c) return false;
      }
      filled++;
    }
    return filled === NUM_COLORS;
  }

  function canPour(from, to) {
    if (from === to) return false;
    if (tubes[from].length === 0) return false;
    if (tubes[to].length === TUBE_CAP) return false;
    if (tubes[to].length === 0) return true;
    return tubes[from][tubes[from].length - 1] === tubes[to][tubes[to].length - 1];
  }

  function pour(from, to) {
    if (!canPour(from, to)) return;
    var col = tubes[from].pop();
    tubes[to].push(col);
    pourAnim = { from: from, to: to, color: col, progress: 0 };
    game.audio.play('se_tap', 0.3);
    if (isSolved() && !done) {
      done = true;
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250, life:0.8, col: C.colors[Math.floor(Math.random()*NUM_COLORS)] });
      }
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 200); }, 1000);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || pourAnim) return;
    // Find which tube was tapped
    for (var t = 0; t < NUM_TUBES; t++) {
      var tx2 = OX + t * (TUBE_W + TUBE_GAP);
      var ty2 = OY;
      if (tx >= tx2 && tx < tx2 + TUBE_W && ty >= ty2 && ty < ty2 + TUBE_H + 40) {
        if (selected === -1) {
          if (tubes[t].length > 0) {
            selected = t;
            game.audio.play('se_tap', 0.2);
          }
        } else {
          if (t === selected) {
            selected = -1;
          } else {
            if (canPour(selected, t)) {
              pour(selected, t);
            } else {
              game.audio.play('se_failure', 0.2);
            }
            selected = -1;
          }
        }
        return;
      }
    }
    selected = -1;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (pourAnim) {
      pourAnim.progress += dt * 5;
      if (pourAnim.progress >= 1) pourAnim = null;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    game.draw.text('カラーソート', W / 2, 160, { size: 52, color: C.text, bold: true });

    // Tubes
    for (var t2 = 0; t2 < NUM_TUBES; t2++) {
      var tx3 = OX + t2 * (TUBE_W + TUBE_GAP);
      var ty3 = OY;
      var isSel = selected === t2;

      // Glass tube outline
      game.draw.rect(tx3 - 4, ty3 - 4, TUBE_W + 8, TUBE_H + 8, isSel ? C.tubeSel : C.tubeHi, isSel ? 0.9 : 0.5);
      game.draw.rect(tx3, ty3, TUBE_W, TUBE_H, C.tube, 0.85);

      // Liquid layers
      var tube = tubes[t2];
      for (var l2 = 0; l2 < tube.length; l2++) {
        var layerH = TUBE_H / TUBE_CAP;
        var layerY = ty3 + TUBE_H - (l2 + 1) * layerH;
        game.draw.rect(tx3 + 2, layerY + 2, TUBE_W - 4, layerH - 4, C.colors[tube[l2]], 0.88);
        // Shine
        game.draw.rect(tx3 + 4, layerY + 4, (TUBE_W - 8) * 0.4, layerH * 0.35, '#fff', 0.2);
      }

      // Glass reflection
      game.draw.line(tx3 + 12, ty3 + 10, tx3 + 12, ty3 + TUBE_H - 10, C.glass, 4);
    }

    // Pour animation
    if (pourAnim) {
      var fromX = OX + pourAnim.from * (TUBE_W + TUBE_GAP) + TUBE_W / 2;
      var toX = OX + pourAnim.to * (TUBE_W + TUBE_GAP) + TUBE_W / 2;
      var fromY = OY;
      var arc = pourAnim.progress;
      var px2 = fromX + (toX - fromX) * arc;
      var py2 = fromY - 60 + arc * 120;
      game.draw.circle(px2, py2, 14, C.colors[pourAnim.color], 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life * 0.8);
    }

    // Instruction
    game.draw.text(selected >= 0 ? '注ぐ先をタップ' : 'タップして選択', W / 2, H * 0.84, { size: 42, color: selected >= 0 ? C.glass : C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.glass : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    shuffleTubes();
    // Ensure not already solved
    while (isSolved()) shuffleTubes();
  });
})(game);
