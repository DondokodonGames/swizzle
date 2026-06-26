// 542-mud-stomp.js
// マッドストンプ — 地面から飛び出すモグラを素早くタップで踏む
// 操作: タップで叩く
// 成功: 30匹撃破  失敗: 10匹逃がす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#1a0e06',
    ground:  '#2d1a08',
    hole:    '#0a0604',
    mole:    '#8b5e3c',
    moleHi:  '#c4874a',
    moleEye: '#111',
    star:    '#fbbf24',
    text:    '#f1f5f9',
    ui:      '#374151',
    miss:    '#ef4444',
    hit:     '#22c55e',
    special: '#a855f7',
    speHi:   '#d8b4fe'
  };

  var COLS = 3;
  var ROWS = 4;
  var HOLE_R = 100;
  var OX = W / 2 - COLS * 200;
  var OY = H * 0.22;
  var CELL_W = W / COLS;
  var CELL_H = (H * 0.62) / ROWS;

  var holes = [];
  var smacked = 0;
  var NEEDED = 30;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var stars = [];
  var flashCol = C.hit;
  var flashAnim = 0;
  var smackAnim = 0;
  var nextSpawn = 0.6;

  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      holes.push({
        x: CELL_W * c + CELL_W / 2,
        y: OY + CELL_H * r + CELL_H / 2 + 60,
        mole: null
      });
    }
  }

  function spawnMole() {
    var empties = holes.filter(function(h) { return h.mole === null; });
    if (empties.length === 0) return;
    var hole = empties[Math.floor(Math.random() * empties.length)];
    var duration = 1.0 + Math.random() * 1.5 - Math.min(smacked * 0.02, 0.7);
    hole.mole = {
      phase: 'rising',
      t: 0,
      riseTime: 0.25,
      holdTime: duration,
      fallTime: 0.2,
      rise: 0,
      special: Math.random() < 0.15
    };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      if (!h.mole) continue;
      if (h.mole.phase === 'falling') continue;
      var moleY = h.y - h.mole.rise * 80;
      var dx = tx - h.x, dy = ty - moleY;
      if (Math.sqrt(dx * dx + dy * dy) < HOLE_R) {
        // Hit!
        var pts = h.mole.special ? 2 : 1;
        smacked += pts;
        smackAnim = 0.3;
        flashCol = C.hit;
        flashAnim = 0.2;
        game.audio.play('se_success', h.mole.special ? 0.9 : 0.6);
        for (var pi = 0; pi < (h.mole.special ? 12 : 6); pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: h.x, y: moleY, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220 - 60, life: 0.4, col: h.mole.special ? C.speHi : C.moleHi });
        }
        stars.push({ x: h.x, y: moleY - 80, t: 0.8, pts: '+' + pts });
        h.mole = null;
        hit = true;
        if (smacked >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(smacked * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }
    if (!hit) {
      game.audio.play('se_tap', 0.1);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (smackAnim > 0) smackAnim -= dt * 4;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnMole();
      nextSpawn = Math.max(0.3, 0.6 - smacked * 0.005);
    }

    // Update moles
    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      if (!h.mole) continue;
      var m = h.mole;
      m.t += dt;
      if (m.phase === 'rising') {
        m.rise = Math.min(1, m.t / m.riseTime);
        if (m.t >= m.riseTime) { m.phase = 'hold'; m.t = 0; m.rise = 1; }
      } else if (m.phase === 'hold') {
        if (m.t >= m.holdTime) { m.phase = 'falling'; m.t = 0; }
      } else if (m.phase === 'falling') {
        m.rise = Math.max(0, 1 - m.t / m.fallTime);
        if (m.t >= m.fallTime) {
          // Escaped
          escaped++;
          flashCol = C.miss;
          flashAnim = 0.3;
          game.audio.play('se_failure', 0.3);
          h.mole = null;
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }
    for (var ss = stars.length - 1; ss >= 0; ss--) {
      stars[ss].t -= dt * 1.5;
      stars[ss].y -= 40 * dt;
      if (stars[ss].t <= 0) stars.splice(ss, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, OY - 20, W, H, C.ground, 0.7);

    // Holes and moles
    for (var i2 = 0; i2 < holes.length; i2++) {
      var h2 = holes[i2];
      game.draw.circle(h2.x, h2.y, HOLE_R, C.hole, 1);
      game.draw.circle(h2.x, h2.y, HOLE_R - 8, '#0c0805', 0.8);

      if (h2.mole) {
        var m2 = h2.mole;
        var moleY = h2.y - m2.rise * 80;
        var bodyR = 68;

        // Clip by drawing ground over bottom
        game.draw.circle(h2.x, moleY + bodyR * 0.5, bodyR * 0.7, C.ground, 0.9);

        // Body
        var col = m2.special ? C.special : C.mole;
        var hi = m2.special ? C.speHi : C.moleHi;
        game.draw.circle(h2.x, moleY, bodyR + 4, col, 0.15);
        game.draw.circle(h2.x, moleY, bodyR, col, 0.95);
        // Face
        game.draw.circle(h2.x - 20, moleY - 16, 12, C.moleEye, 0.9);
        game.draw.circle(h2.x + 20, moleY - 16, 12, C.moleEye, 0.9);
        game.draw.circle(h2.x, moleY + 12, 18, '#5a2a00', 0.7);
        // Highlight
        game.draw.circle(h2.x - 24, moleY - 28, 14, hi, 0.4);
        if (m2.special) {
          game.draw.circle(h2.x, moleY, bodyR + 16 + Math.sin(elapsed * 6) * 4, col, 0.2);
          game.draw.text('★', h2.x, moleY - bodyR - 20, { size: 40, color: C.star });
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Score popups
    for (var ss2 = 0; ss2 < stars.length; ss2++) {
      var st = stars[ss2];
      game.draw.text(st.pts, st.x, st.y, { size: 52, color: C.star, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Escaped dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 44 + ei * 88, H * 0.955, 18, ei < escaped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(smacked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.mole : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnMole();
  });
})(game);
