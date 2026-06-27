// 739-orbit-keeper.js
// 軌道維持 — 衛星の軌道が崩れる前にタップしてスラスターを噴射せよ
// 操作: タップで軌道ブースト（軌道半径を押し上げる）
// 成功: 90秒間軌道を維持  失敗: 3回墜落

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010510',
    planet:  '#1d4ed8',
    planetHi:'#93c5fd',
    sat:     '#f97316',
    satHi:   '#ffffff',
    safeCol: '#22c55e',
    dangerLo:'#ef4444',
    dangerHi:'#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#020816'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var PLANET_R = 70;
  var MIN_R   = 160;
  var MAX_R   = 370;
  var SAFE_LO = 205;
  var SAFE_HI = 305;

  var orbitR = 255;
  var orbitAngle = 0;
  var ORBIT_SPEED = 1.8;
  var DECAY_RATE = 18;
  var BOOST = 65;

  var bgStars = [];
  for (var bsi = 0; bsi < 50; bsi++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.5 });
  }

  var thrustParts = [];
  var survived = 0;
  var TARGET_TIME = 90;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  game.onTap(function(tx, ty) {
    if (done) return;
    orbitR = Math.min(orbitR + BOOST, MAX_R);
    game.audio.play('se_tap', 0.08);
    var satX = CX + Math.cos(orbitAngle) * orbitR;
    var satY = CY + Math.sin(orbitAngle) * orbitR;
    for (var p = 0; p < 4; p++) {
      var pa = orbitAngle + Math.PI + (Math.random() - 0.5) * 0.9;
      thrustParts.push({ x: satX, y: satY, vx: Math.cos(pa) * 130, vy: Math.sin(pa) * 130, life: 0.4 });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived += dt;
      DECAY_RATE = Math.min(42, 18 + Math.floor(survived / 15) * 4);
      orbitR -= DECAY_RATE * dt;

      if (survived >= TARGET_TIME) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(survived) * 120 + (MAX_CRASH - crashes) * 2000); }, 700);
        return;
      }

      if (orbitR <= MIN_R) {
        crashes++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        resultText = '墜落しかけ！';
        resultTimer = 0.7;
        game.audio.play('se_failure', 0.5);
        if (crashes >= MAX_CRASH) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          orbitR = SAFE_LO + 30;
        }
      }
    }

    orbitAngle += ORBIT_SPEED * dt;

    for (var tp = thrustParts.length - 1; tp >= 0; tp--) {
      thrustParts[tp].x += thrustParts[tp].vx * dt;
      thrustParts[tp].y += thrustParts[tp].vy * dt;
      thrustParts[tp].life -= dt * 2.5;
      if (thrustParts[tp].life <= 0) thrustParts.splice(tp, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    var satX = CX + Math.cos(orbitAngle) * orbitR;
    var satY = CY + Math.sin(orbitAngle) * orbitR;
    var inSafe = orbitR >= SAFE_LO && orbitR <= SAFE_HI;
    var nearDanger = orbitR < SAFE_LO + 28;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) {
      game.draw.circle(bgStars[bsi2].x, bgStars[bsi2].y, bgStars[bsi2].r, '#fde68a', 0.3);
    }

    // Orbit boundary rings
    for (var ri = 0; ri < 24; ri++) {
      var ra = ri * Math.PI * 2 / 24;
      game.draw.circle(CX + Math.cos(ra) * MIN_R, CY + Math.sin(ra) * MIN_R, 3, C.dangerLo, 0.5);
      game.draw.circle(CX + Math.cos(ra) * MAX_R, CY + Math.sin(ra) * MAX_R, 3, C.dangerHi, 0.4);
    }
    for (var ri2 = 0; ri2 < 36; ri2++) {
      var ra2 = ri2 * Math.PI * 2 / 36;
      game.draw.circle(CX + Math.cos(ra2) * SAFE_LO, CY + Math.sin(ra2) * SAFE_LO, 3, C.safeCol, 0.28);
      game.draw.circle(CX + Math.cos(ra2) * SAFE_HI, CY + Math.sin(ra2) * SAFE_HI, 3, C.safeCol, 0.28);
    }

    // Current orbit
    var orbitCol = inSafe ? C.safeCol : C.dangerLo;
    for (var ri3 = 0; ri3 < 48; ri3++) {
      var ra3 = ri3 * Math.PI * 2 / 48;
      game.draw.circle(CX + Math.cos(ra3) * orbitR, CY + Math.sin(ra3) * orbitR, 2, orbitCol, 0.55);
    }

    // Planet
    game.draw.circle(CX + 5, CY + 5, PLANET_R, '#000', 0.3);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.25, C.planetHi, 0.3);

    // Thrust particles
    for (var tp2 = 0; tp2 < thrustParts.length; tp2++) {
      var tp3 = thrustParts[tp2];
      game.draw.circle(tp3.x, tp3.y, 7 * tp3.life, C.satHi, tp3.life * 0.8);
    }

    // Satellite
    game.draw.circle(satX + 3, satY + 3, 20, '#000', 0.3);
    game.draw.circle(satX, satY, 20, C.sat, 0.9);
    game.draw.circle(satX - 6, satY - 6, 7, C.satHi, 0.5);

    // Orbit height bar
    var rFrac = Math.max(0, Math.min(1, (orbitR - MIN_R) / (MAX_R - MIN_R)));
    var safeFrac0 = (SAFE_LO - MIN_R) / (MAX_R - MIN_R);
    var safeFrac1 = (SAFE_HI - MIN_R) / (MAX_R - MIN_R);
    var barX = W / 2 - 220, barY = H * 0.78, barW = 440, barH = 22;
    game.draw.rect(barX - 4, barY - 4, barW + 8, barH + 8, '#111', 0.8);
    game.draw.rect(barX, barY, barW, barH, '#1a1a2a', 0.9);
    game.draw.rect(barX + safeFrac0 * barW, barY, (safeFrac1 - safeFrac0) * barW, barH, C.safeCol, 0.28);
    game.draw.rect(barX, barY, rFrac * barW, barH, orbitCol, 0.85);
    game.draw.text('軌道高度', W / 2, barY - 24, { size: 28, color: C.text + '77' });

    if (nearDanger && !done) {
      game.draw.text('タップでブースト！', W / 2, H * 0.87, { size: 48, color: C.dangerLo, bold: true });
    } else if (!done && !inSafe) {
      game.draw.text('高すぎ — 待て', W / 2, H * 0.87, { size: 42, color: C.dangerHi, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.93, { size: 44, color: flashCol, bold: true });
    }

    for (var ci = 0; ci < MAX_CRASH; ci++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 80 + ci * 160, H * 0.955, 26, ci < crashes ? C.wrong : C.ui, 0.9);
    }

    var sRatio = Math.min(1, survived / TARGET_TIME);
    game.draw.text(Math.floor(survived) + ' / ' + TARGET_TIME + 's', W / 2, 148, { size: 56, color: C.text, bold: true });
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * sRatio, 12, sRatio < 0.7 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(TARGET_TIME - survived) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
  });
})(game);
