// 190-wave-surf.js
// 波乗り — サーファーが波の頂点に乗り続けるバランス感覚ゲーム
// 操作: タップで上下にサーファーを動かす
// 成功: 25秒波に乗り続ける  失敗: 波から外れる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a14',
    sky:     '#0c1a2e',
    wave1:   '#0d4a7a',
    wave2:   '#1565c0',
    waveTop: '#1e88e5',
    foam:    '#90caf9',
    surfer:  '#f59e0b',
    surferHi:'#fde68a',
    board:   '#7c3aed',
    danger:  '#ef4444',
    ui:      '#334155'
  };

  var SURFER_X = W * 0.35;
  var surferY = H * 0.5;
  var surferVY = 0;
  var SURFER_SPEED = 600;
  var SURF_R = 28;

  var waveTime = 0;
  var WAVE_SPEED = 1.8;
  var survived = 0;
  var NEEDED = 25;
  var done = false;
  var elapsed = 0;
  var goingUp = false;

  var foam = [];

  function waveY(t) {
    return H * 0.5
      + Math.sin(t * WAVE_SPEED) * 160
      + Math.sin(t * WAVE_SPEED * 1.7 + 0.5) * 60
      + Math.sin(t * WAVE_SPEED * 0.5 + 1.2) * 90;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    goingUp = ty < surferY;
    surferVY = goingUp ? -SURFER_SPEED : SURFER_SPEED;
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') { surferVY = -SURFER_SPEED; goingUp = true; }
    else if (dir === 'down') { surferVY = SURFER_SPEED; goingUp = false; }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      waveTime += dt;
    }
    if (feedback > 0) feedback -= dt;

    // Move surfer
    surferY += surferVY * dt;
    surferVY *= Math.pow(0.88, dt * 60);
    surferY = Math.max(SURF_R + 80, Math.min(H - SURF_R - 80, surferY));

    var targetWaveY = waveY(waveTime);
    var diff = Math.abs(surferY - targetWaveY);
    var SAFE_ZONE = 80;

    if (!done) {
      if (diff < SAFE_ZONE) {
        survived += dt;
        if (survived >= NEEDED) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 500); }, 400);
        }
      } else if (diff > 200) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    // Foam particles
    if (Math.random() < 0.3) {
      foam.push({ x: Math.random() * W, y: targetWaveY + (Math.random() - 0.5) * 40, life: 0.8 + Math.random() * 0.5, vx: -80 - Math.random() * 60 });
    }
    for (var fi = foam.length - 1; fi >= 0; fi--) {
      foam[fi].x += foam[fi].vx * dt;
      foam[fi].life -= dt;
      if (foam[fi].life <= 0 || foam[fi].x < -20) foam.splice(fi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.sky);

    // Ocean layers
    game.draw.rect(0, targetWaveY + 30, W, H - targetWaveY - 30, C.wave1, 0.9);
    game.draw.rect(0, targetWaveY + 10, W, 40, C.wave2, 0.8);

    // Wave crest
    for (var wx = 0; wx < W; wx += 20) {
      var wyOff = targetWaveY + Math.sin((wx + elapsed * 200) * 0.02) * 8;
      game.draw.circle(wx, wyOff, 14, C.waveTop, 0.7);
    }

    // Foam
    for (var fi2 = 0; fi2 < foam.length; fi2++) {
      var f2 = foam[fi2];
      game.draw.circle(f2.x, f2.y, 16 * f2.life, C.foam, f2.life * 0.5);
    }

    // Safe zone indicator
    game.draw.rect(SURFER_X - 60, targetWaveY - SAFE_ZONE, 120, SAFE_ZONE * 2, '#22c55e', 0.08);
    game.draw.line(SURFER_X - 60, targetWaveY - SAFE_ZONE, SURFER_X + 60, targetWaveY - SAFE_ZONE, '#22c55e', 2);
    game.draw.line(SURFER_X - 60, targetWaveY + SAFE_ZONE, SURFER_X + 60, targetWaveY + SAFE_ZONE, '#22c55e', 2);

    // Danger indicator
    if (diff > SAFE_ZONE) {
      var dangerAlpha = Math.min(1, (diff - SAFE_ZONE) / 120) * 0.25;
      game.draw.rect(0, 0, W, H, C.danger, dangerAlpha);
    }

    // Surfer board
    game.draw.rect(SURFER_X - 56, surferY + SURF_R - 8, 112, 20, C.board, 0.9);
    game.draw.rect(SURFER_X - 56, surferY + SURF_R - 8, 112, 8, '#a78bfa', 0.5);

    // Surfer body
    game.draw.circle(SURFER_X, surferY, SURF_R + 8, C.surferHi, 0.25);
    game.draw.circle(SURFER_X, surferY, SURF_R, C.surfer, 0.9);
    game.draw.circle(SURFER_X - 8, surferY - 10, SURF_R * 0.3, '#fff', 0.5);

    // Survived display
    var surviveRatio = Math.min(1, survived / NEEDED);
    game.draw.text(survived.toFixed(1) + 's / ' + NEEDED + 's', W / 2, H * 0.12, { size: 44, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * surviveRatio, 72, diff < SAFE_ZONE ? '#22c55e' : '#ef4444');
    game.draw.text(Math.ceil(NEEDED - survived) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  var feedback = 0;

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
