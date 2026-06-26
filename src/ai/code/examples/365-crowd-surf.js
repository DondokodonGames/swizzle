// 365-crowd-surf.js
// クラウドサーフ — 観客の手に乗って前へ前へ流れていく
// 操作: タップのタイミングでリズムよく手を叩いて前進
// 成功: 800m前進  失敗: 落ちる4回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0010',
    crowd:  '#1e1b4b',
    crowdHi:'#4338ca',
    arms:   '#a78bfa',
    armsHi: '#c4b5fd',
    surfer: '#fbbf24',
    surferHi:'#fff',
    beat:   '#f97316',
    beatHi: '#fed7aa',
    progress:'#22c55e',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var BEAT_INTERVAL = 0.55;
  var beatTimer = 0;
  var beatPhase = 0; // 0-1

  var surferX = W * 0.35;
  var surferY = H * 0.45;
  var surferVX = 150;
  var surferVY = 0;
  var onTop = true;

  var distance = 0;
  var GOAL = 800;
  var falls = 0;
  var MAX_FALLS = 4;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var arms = [];
  var tapCount = 0;
  var lastTapBeat = -2;
  var combo = 0;
  var beatFlash = 0;
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.progress;

  // Generate crowd arms
  function initArms() {
    arms = [];
    for (var i = 0; i < 18; i++) {
      arms.push({
        x: i * (W / 17),
        phase: (i / 18) * Math.PI * 2,
        raised: 0
      });
    }
  }

  function onTapBeat() {
    var beatIdx = Math.round(beatTimer / BEAT_INTERVAL);
    var diff = Math.abs(beatTimer - beatIdx * BEAT_INTERVAL);
    var isOnBeat = diff < BEAT_INTERVAL * 0.25;
    return isOnBeat;
  }

  game.onTap(function() {
    if (done) return;
    tapCount++;
    var onBeat = onTapBeat();
    if (onBeat) {
      combo++;
      surferVX = 200 + combo * 20;
      surferY -= 30;
      onTop = true;
      resultText = combo > 3 ? combo + 'コンボ！' : 'ナイス！';
      resultCol = C.beatHi;
      resultAnim = 0.5;
      game.audio.play('se_tap', 0.4);
      // Raise nearby arms
      for (var ai = 0; ai < arms.length; ai++) {
        if (Math.abs(arms[ai].x - surferX) < 120) {
          arms[ai].raised = 0.8;
        }
      }
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: surferX, y: surferY, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160-80, life:0.4, col: C.beatHi });
      }
    } else {
      combo = 0;
      surferVX = Math.max(80, surferVX - 30);
      resultText = 'ズレてる！';
      resultCol = C.danger;
      resultAnim = 0.4;
      game.audio.play('se_failure', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;
    if (beatFlash > 0) beatFlash -= dt * 4;

    beatTimer += dt;
    var beatIdx = Math.floor(beatTimer / BEAT_INTERVAL);
    beatPhase = (beatTimer % BEAT_INTERVAL) / BEAT_INTERVAL;
    if (beatPhase < dt / BEAT_INTERVAL * 2) {
      beatFlash = 0.3;
    }

    // Arms wave with beat
    for (var ai = 0; ai < arms.length; ai++) {
      var armPhase = beatPhase + arms[ai].phase / (Math.PI * 2);
      arms[ai].wave = Math.sin(armPhase * Math.PI * 2) * 0.5 + 0.5;
      if (arms[ai].raised > 0) arms[ai].raised -= dt * 2;
    }

    // Surfer physics
    surferVY += 500 * dt;
    surferX += surferVX * dt;
    surferY += surferVY * dt;
    surferVX *= (1 - 0.5 * dt);

    // Bounce off sides
    if (surferX > W - 60) surferX = W - 60;
    if (surferX < 60) surferX = 60;

    // Crowd level
    var crowdTop = H * 0.5;
    if (surferY > crowdTop) {
      surferY = crowdTop;
      surferVY = 0;
    }

    // Surfer too slow = falling
    if (surferVX < 40 && onTop) {
      onTop = false;
      falls++;
      surferVX = 100;
      combo = 0;
      resultText = '落ちた！';
      resultCol = C.danger;
      resultAnim = 0.7;
      game.audio.play('se_failure', 0.5);
      if (falls >= MAX_FALLS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      surferY = H * 0.3;
      surferVY = 0;
    }

    // Distance
    distance += surferVX * dt;
    if (distance >= GOAL && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(Math.round(distance) + (MAX_FALLS - falls) * 300 + Math.ceil(timeLeft) * 80); }, 400);
      return;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Beat flash
    if (beatFlash > 0) game.draw.rect(0, 0, W, H, C.beat, beatFlash * 0.06);

    // Crowd background
    game.draw.rect(0, H * 0.45, W, H * 0.55, C.crowd, 0.6);

    // Arms
    var armBaseY = H * 0.5;
    for (var ai2 = 0; ai2 < arms.length; ai2++) {
      var a = arms[ai2];
      var armH = 80 + (a.wave + a.raised) * 60;
      var armCol = a.raised > 0.3 ? C.armsHi : C.arms;
      // Left arm
      game.draw.line(a.x - 20, armBaseY, a.x - 10, armBaseY - armH, armCol, 14);
      game.draw.circle(a.x - 10, armBaseY - armH, 18, armCol, 0.9);
      // Right arm
      game.draw.line(a.x + 20, armBaseY, a.x + 10, armBaseY - armH + 10, C.arms, 14);
      game.draw.circle(a.x + 10, armBaseY - armH + 10, 18, C.arms, 0.8);
    }

    // Beat marker
    var beatX = W / 2 - 160 + beatPhase * 320;
    game.draw.circle(beatX, H * 0.18, 20 + beatFlash * 10, C.beat, 0.6 + beatPhase * 0.3);
    game.draw.line(W / 2 - 160, H * 0.18, W / 2 + 160, H * 0.18, C.crowd, 3);
    game.draw.text('♩', W / 2 - 160, H * 0.18 + 14, { size: 36, color: C.arms });
    game.draw.text('♩', W / 2 + 160, H * 0.18 + 14, { size: 36, color: C.arms });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Surfer
    game.draw.circle(surferX, surferY - 20, 32, C.surfer, 0.9);
    game.draw.circle(surferX, surferY - 44, 22, C.surferHi, 0.9);
    game.draw.line(surferX - 40, surferY - 20, surferX + 40, surferY - 20, C.surfer, 8);
    game.draw.line(surferX, surferY - 20, surferX, surferY - 6, C.surfer, 10);

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 52, color: resultCol, bold: true });
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 28 + fi * 56, H * 0.91, 16, fi < falls ? C.danger : '#0a0010');
    }

    // Progress
    var prog = Math.min(1, distance / GOAL);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * prog, 72, C.progress);
    game.draw.text(Math.round(distance) + 'm / ' + GOAL + 'm', W / 2, 36, { size: 40, color: '#fff', bold: true });
    game.draw.text(Math.ceil(timeLeft) + 's', W * 0.88, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initArms();
    beatTimer = 0;
  });
})(game);
