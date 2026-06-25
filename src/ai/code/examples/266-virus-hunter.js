// 266-virus-hunter.js
// ウイルスハンター — 体内に侵入したウイルスをタップして退治、免疫細胞と区別して
// 操作: タップでウイルス（赤・鋭角）を撃退、白血球（白・丸）は避ける
// 成功: 30体退治  失敗: 白血球5体誤射 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04020a',
    vessel: '#1a0a1e',
    vesHi:  '#2d1838',
    virus:  '#ef4444',
    virHi:  '#fca5a5',
    wbc:    '#e2e8f0',
    wbcHi:  '#ffffff',
    kill:   '#22c55e',
    kilHi:  '#86efac',
    wrong:  '#f59e0b',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var entities = [];
  var killed = 0;
  var NEEDED = 30;
  var mistakes = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.5;

  function spawnEntity() {
    var isVirus = Math.random() < 0.55;
    var x = Math.random() * W;
    var y = Math.random() < 0.5 ? -50 : H + 50;
    var vx = (Math.random() - 0.5) * 80;
    var vy = y < 0 ? 40 + Math.random() * 60 : -(40 + Math.random() * 60);
    entities.push({
      x: x, y: y,
      vx: vx, vy: vy,
      r: isVirus ? 28 + Math.random() * 14 : 32 + Math.random() * 16,
      isVirus: isVirus,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1 + Math.random() * 2,
      hitFlash: 0,
      spikes: isVirus ? 5 + Math.floor(Math.random() * 3) : 0,
      age: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    for (var i = entities.length - 1; i >= 0; i--) {
      var e = entities[i];
      var dx = tx - e.x, dy = ty - e.y;
      if (dx * dx + dy * dy < (e.r + 10) * (e.r + 10)) {
        if (e.isVirus) {
          killed++;
          feedback = '退治！ ' + killed + '/' + NEEDED;
          feedbackCol = C.kilHi;
          feedbackTimer = 0.4;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: e.x, y: e.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.virHi });
          }
          entities.splice(i, 1);
          if (killed >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(killed * 80 + Math.ceil(timeLeft) * 60); }, 400);
          }
        } else {
          mistakes++;
          feedback = '白血球を攻撃！ (' + mistakes + '/' + MAX_MISS + ')';
          feedbackCol = C.wrong;
          feedbackTimer = 0.6;
          game.audio.play('se_failure', 0.5);
          e.hitFlash = 0.4;
          if (mistakes >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done && entities.length < 12) {
      spawnEntity();
      spawnTimer = SPAWN_INTERVAL * (0.6 + Math.random() * 0.8);
    }

    for (var i = entities.length - 1; i >= 0; i--) {
      var e = entities[i];
      e.wobble += e.wobbleSpeed * dt;
      e.age += dt;
      if (e.hitFlash > 0) e.hitFlash -= dt;
      e.x += (e.vx + Math.cos(e.wobble) * 20) * dt;
      e.y += e.vy * dt;
      if (e.x < -100 || e.x > W + 100 || e.y < -100 || e.y > H + 100) {
        entities.splice(i, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Blood vessel background
    for (var vi = 0; vi < 6; vi++) {
      var vx2 = vi * W / 5;
      game.draw.rect(vx2, 0, W / 6, H, C.vessel, 0.3);
    }

    // Entities
    for (var i2 = 0; i2 < entities.length; i2++) {
      var e2 = entities[i2];
      var flash = e2.hitFlash > 0;

      if (e2.isVirus) {
        var vcol = flash ? C.wbcHi : C.virus;
        var vhiCol = flash ? C.wrong : C.virHi;
        game.draw.circle(e2.x, e2.y, e2.r, vcol, 0.85);
        // Spikes
        for (var si = 0; si < e2.spikes; si++) {
          var sang = (si / e2.spikes) * Math.PI * 2 + e2.wobble * 0.3;
          var sx = e2.x + Math.cos(sang) * (e2.r + 14);
          var sy = e2.y + Math.sin(sang) * (e2.r + 14);
          game.draw.line(e2.x + Math.cos(sang) * e2.r, e2.y + Math.sin(sang) * e2.r, sx, sy, vhiCol, 6);
          game.draw.circle(sx, sy, 5, vhiCol, 0.9);
        }
        game.draw.circle(e2.x - e2.r * 0.3, e2.y - e2.r * 0.3, e2.r * 0.2, '#fff', 0.4);
      } else {
        var wcol = flash ? C.wrong : C.wbc;
        var pulse = 0.85 + 0.15 * Math.abs(Math.sin(e2.age * 2));
        game.draw.circle(e2.x, e2.y, e2.r * pulse + 6, C.wbcHi, 0.1);
        game.draw.circle(e2.x, e2.y, e2.r * pulse, wcol, 0.85);
        // Nucleus
        game.draw.circle(e2.x - 8, e2.y - 8, e2.r * 0.3, '#94a3b8', 0.7);
        game.draw.circle(e2.x - e2.r * 0.3, e2.y - e2.r * 0.3, e2.r * 0.15, '#fff', 0.5);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.5), p.col, p.life * 0.9);
    }

    // Legend
    game.draw.circle(50, H * 0.15, 18, C.virus, 0.9);
    game.draw.text('ウイルス → タップ', 200, H * 0.154, { size: 32, color: C.virHi });
    game.draw.circle(50, H * 0.2, 18, C.wbc, 0.85);
    game.draw.text('白血球 → 避ける', 200, H * 0.204, { size: 32, color: C.ui });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.88, { size: 44, color: feedbackCol, bold: true });
    }

    // Mistake dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.93, 16, mi < mistakes ? C.wrong : '#04020a');
    }

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.kill : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.3;
  });
})(game);
