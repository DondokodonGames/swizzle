// 317-spell-cast.js
// 呪文詠唱 — 魔法陣のパターンをスワイプでなぞって魔法を発動する
// 操作: 矢印の方向にスワイプして呪文を入力
// 成功: 10回詠唱成功  失敗: 5回間違い or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060210',
    circle: '#1a0a3d',
    circleHi:'#2d1464',
    rune:   '#a78bfa',
    runeHi: '#c4b5fd',
    runeGlow:'#7c3aed',
    arrow:  '#60a5fa',
    arrowHi:'#93c5fd',
    hit:    '#22c55e',
    hitHi:  '#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Spells are sequences of 3-5 directions
  var SPELLS = [
    ['up','right','down'],
    ['left','up','right','up'],
    ['down','right','up','left','down'],
    ['up','up','right'],
    ['left','left','down','right'],
    ['right','down','left','up','right'],
    ['up','left','down','right'],
    ['down','down','up'],
    ['right','right','left','up']
  ];

  var currentSpell = [];
  var playerInput = [];
  var spellIdx = 0;
  var cast = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var castAnim = 0;
  var wrongAnim = 0;
  var runeAngle = 0;
  var glowRings = [];

  var DIR_ANGLES = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 };
  var DIR_SYMBOLS = { up: '↑', down: '↓', left: '←', right: '→' };

  function newSpell() {
    currentSpell = SPELLS[spellIdx % SPELLS.length].slice();
    spellIdx++;
    playerInput = [];
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (castAnim > 0) return;

    playerInput.push(dir);
    var idx = playerInput.length - 1;
    game.audio.play('se_tap', 0.25);

    if (dir !== currentSpell[idx]) {
      // Wrong
      errors++;
      wrongAnim = 0.6;
      game.audio.play('se_failure', 0.5);
      playerInput = [];
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.wrongHi });
      }
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
      return;
    }

    // Correct step
    glowRings.push({ r: 60 + idx * 30, alpha: 0.8, dir: dir });

    if (playerInput.length === currentSpell.length) {
      // Spell complete!
      cast++;
      castAnim = 0.9;
      game.audio.play('se_success', 0.7);
      for (var pi2 = 0; pi2 < 14; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300, life: 0.8, col: C.runeHi });
      }
      if (cast >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(cast * 400 + Math.ceil(timeLeft) * 100); }, 600);
        return;
      }
      setTimeout(function() { if (!done) newSpell(); }, 800);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    runeAngle += dt * 0.8;
    if (castAnim > 0) castAnim -= dt;
    if (wrongAnim > 0) wrongAnim -= dt;

    for (var gr = glowRings.length - 1; gr >= 0; gr--) {
      glowRings[gr].r += 50 * dt;
      glowRings[gr].alpha -= dt * 1.5;
      if (glowRings[gr].alpha <= 0) glowRings.splice(gr, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var cx = W / 2, cy = H * 0.5;

    // Glow rings
    for (var gr2 = 0; gr2 < glowRings.length; gr2++) {
      game.draw.circle(cx, cy, glowRings[gr2].r, C.rune, glowRings[gr2].alpha * 0.3);
    }

    // Magic circle
    var circR = 200;
    game.draw.circle(cx, cy, circR + 8, C.runeGlow, 0.08 + castAnim * 0.2);
    game.draw.circle(cx, cy, circR, C.circleHi, 0.3 + castAnim * 0.3);
    game.draw.circle(cx, cy, circR, C.circle, 0.7);
    // Inner circles
    game.draw.circle(cx, cy, circR * 0.65, C.circleHi, 0.2);
    game.draw.circle(cx, cy, circR * 0.35, C.runeGlow, 0.3 + castAnim * 0.4);

    // Rotating rune marks
    for (var rm = 0; rm < 6; rm++) {
      var ra = runeAngle + (rm / 6) * Math.PI * 2;
      var rx = cx + Math.cos(ra) * circR * 0.85;
      var ry = cy + Math.sin(ra) * circR * 0.85;
      var runeSymbols = ['ᚠ','ᚢ','ᚦ','ᚨ','ᚱ','ᚲ'];
      game.draw.text(runeSymbols[rm], rx, ry + 10, { size: 36, color: C.rune });
    }
    // Outer rotating marks (opposite direction)
    for (var rm2 = 0; rm2 < 8; rm2++) {
      var ra2 = -runeAngle * 0.5 + (rm2 / 8) * Math.PI * 2;
      var rx2 = cx + Math.cos(ra2) * circR * 0.98;
      var ry2 = cy + Math.sin(ra2) * circR * 0.98;
      game.draw.circle(rx2, ry2, 8, C.runeHi, 0.6);
    }

    // Wrong flash
    if (wrongAnim > 0) {
      game.draw.circle(cx, cy, circR + 30, C.wrong, wrongAnim * 0.4);
    }

    // Cast flash
    if (castAnim > 0) {
      game.draw.circle(cx, cy, circR * 1.5 * castAnim, C.runeHi, castAnim * 0.5);
    }

    // Spell to input (top)
    game.draw.text('呪文:', W * 0.05, H * 0.2, { size: 34, color: C.ui });
    for (var si = 0; si < currentSpell.length; si++) {
      var sx = W * 0.2 + si * 100;
      var inputDone = si < playerInput.length;
      var isCorrect = inputDone && playerInput[si] === currentSpell[si];
      var sCol = inputDone ? (isCorrect ? C.hitHi : C.wrongHi) : C.rune;
      game.draw.text(DIR_SYMBOLS[currentSpell[si]], sx, H * 0.2 + 10, { size: 56, color: sCol, bold: true });
    }

    // Input progress dots
    for (var ii = 0; ii < currentSpell.length; ii++) {
      game.draw.circle(W / 2 - currentSpell.length * 20 + ii * 40, cy + circR + 30, 14, ii < playerInput.length ? C.rune : C.circle, ii < playerInput.length ? 0.9 : 0.4);
    }

    // Direction hints (large arrows at edges)
    game.draw.text('↑', W / 2, H * 0.27, { size: 52, color: C.arrow });
    game.draw.text('↓', W / 2, H * 0.73, { size: 52, color: C.arrow });
    game.draw.text('←', W * 0.08, cy + 14, { size: 52, color: C.arrow });
    game.draw.text('→', W * 0.92, cy + 14, { size: 52, color: C.arrow });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 22 + ei * 44, H * 0.93, 14, ei < errors ? C.wrong : '#060210');
    }

    game.draw.text(cast + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.runeGlow : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newSpell();
  });
})(game);
