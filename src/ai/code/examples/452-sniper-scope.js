// 452-sniper-scope.js
// スナイパースコープ — 揺れるスコープを安定させてターゲットを撃つ
// 操作: タップでスコープを固定、もう一度タップで発射
// 成功: 5体撃破  失敗: 5回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0e12',
    scope:  '#1a2540',
    scopeHi:'#243060',
    crossH: '#22c55e',
    crossM: '#84cc16',
    target: '#ef4444',
    targetHi:'#fca5a5',
    hit:    '#fbbf24',
    hitHi:  '#fef3c7',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    night:  '#0f172a'
  };

  var SCOPE_R = 220;
  var CX = W / 2;
  var CY = H * 0.44;

  var scopeX = CX;
  var scopeY = CY;
  var scopeVX = (Math.random() - 0.5) * 120;
  var scopeVY = (Math.random() - 0.5) * 80;
  var targetX = CX;
  var targetY = CY;
  var targetR = 50;
  var targetVX = 0;
  var targetVY = 0;

  var phase = 'aim';  // aim, locked, fire
  var lockAnim = 0;
  var fireAnim = 0;
  var lockedX = 0;
  var lockedY = 0;

  var hits = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;

  function newTarget() {
    var angle = Math.random() * Math.PI * 2;
    var dist = 80 + Math.random() * 100;
    targetX = CX + Math.cos(angle) * dist;
    targetY = CY + Math.sin(angle) * dist;
    targetR = 55 - hits * 4;
    if (targetR < 25) targetR = 25;
    var speed = 60 + hits * 15;
    var tAng = Math.random() * Math.PI * 2;
    targetVX = Math.cos(tAng) * speed;
    targetVY = Math.sin(tAng) * speed;
    phase = 'aim';
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'aim') {
      // Lock scope position
      lockedX = scopeX;
      lockedY = scopeY;
      lockAnim = 0.4;
      phase = 'locked';
      game.audio.play('se_tap', 0.4);
    } else if (phase === 'locked') {
      // Fire!
      phase = 'fire';
      fireAnim = 0.3;
      var dx = targetX - lockedX;
      var dy = targetY - lockedY;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < targetR + 20) {
        // Hit!
        hits++;
        flashCol = C.correct;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 14; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: targetX, y: targetY, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life: 0.6, col: C.hit });
        }
        if (hits >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(hits * 600 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
        setTimeout(function() { newTarget(); }, 800);
      } else {
        // Miss
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.6;
        game.audio.play('se_failure', 0.5);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
        setTimeout(function() { newTarget(); }, 600);
      }
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (lockAnim > 0) lockAnim -= dt * 3;
    if (fireAnim > 0) fireAnim -= dt * 4;

    // Scope sway (random walk)
    if (phase === 'aim') {
      scopeVX += (Math.random() - 0.5) * 400 * dt;
      scopeVY += (Math.random() - 0.5) * 300 * dt;
      scopeVX *= (1 - dt * 1.5);
      scopeVY *= (1 - dt * 1.5);
      scopeX += scopeVX * dt;
      scopeY += scopeVY * dt;
      // Bounce in circle
      var sdx = scopeX - CX;
      var sdy = scopeY - CY;
      var sdist = Math.sqrt(sdx*sdx + sdy*sdy);
      if (sdist > SCOPE_R - 40) {
        scopeX = CX + (sdx / sdist) * (SCOPE_R - 40);
        scopeY = CY + (sdy / sdist) * (SCOPE_R - 40);
        scopeVX = -scopeVX * 0.5;
        scopeVY = -scopeVY * 0.5;
      }
    }

    // Target movement
    if (phase === 'aim' || phase === 'locked') {
      targetX += targetVX * dt;
      targetY += targetVY * dt;
      var tdx = targetX - CX;
      var tdy = targetY - CY;
      if (Math.abs(tdx) > 300) { targetVX = -targetVX; targetX = CX + Math.sign(tdx) * 300; }
      if (Math.abs(tdy) > 400) { targetVY = -targetVY; targetY = CY + Math.sign(tdy) * 400; }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Night-vision scope overlay
    game.draw.circle(CX, CY, SCOPE_R + 20, C.scope, 0.15);
    game.draw.circle(CX, CY, SCOPE_R, C.scope, 0.4);

    // Target
    var tpulse = Math.sin(elapsed * 8) * 0.2;
    game.draw.circle(targetX, targetY, targetR * (1.5 + tpulse), C.targetHi, 0.08);
    game.draw.circle(targetX, targetY, targetR, C.target, 0.7);
    game.draw.circle(targetX, targetY, targetR * 0.6, C.targetHi, 0.5);
    game.draw.circle(targetX, targetY, targetR * 0.3, '#fff', 0.4);

    // Scope circle
    var currentScopeX = phase !== 'aim' ? lockedX : scopeX;
    var currentScopeY = phase !== 'aim' ? lockedY : scopeY;

    // Crosshair
    var cSize = SCOPE_R * 0.35;
    var cCol = phase === 'locked' ? C.hit : C.crossH;
    var cAlpha = phase === 'locked' ? 0.9 : 0.6;
    game.draw.line(currentScopeX - cSize, currentScopeY, currentScopeX - 20, currentScopeY, cCol, 4);
    game.draw.line(currentScopeX + 20, currentScopeY, currentScopeX + cSize, currentScopeY, cCol, 4);
    game.draw.line(currentScopeX, currentScopeY - cSize, currentScopeX, currentScopeY - 20, cCol, 4);
    game.draw.line(currentScopeX, currentScopeY + 20, currentScopeX, currentScopeY + cSize, cCol, 4);
    game.draw.circle(currentScopeX, currentScopeY, 18, cCol, cAlpha);

    // Scope rim
    game.draw.circle(currentScopeX, currentScopeY, 100, cCol, 0.12);
    game.draw.circle(currentScopeX, currentScopeY, 100, cCol, 0.25 * (phase === 'locked' ? 1 : 0.3));

    // Lock flash
    if (lockAnim > 0) {
      game.draw.circle(currentScopeX, currentScopeY, 110, C.hit, lockAnim * 0.4);
    }
    if (fireAnim > 0) {
      game.draw.rect(0, 0, W, H, C.hit, fireAnim * 0.3);
    }

    // Phase instruction
    var phaseText = phase === 'aim' ? 'タップで照準固定' : 'タップで発射！';
    var phaseCol = phase === 'aim' ? C.crossH : C.hit;
    game.draw.text(phaseText, W/2, H*0.88, { size: 44, color: phaseCol, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.crossH : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    newTarget();
  });
})(game);
