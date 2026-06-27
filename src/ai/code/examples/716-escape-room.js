// 716-escape-room.js
// 脱出ゲーム — 光ったパネルを順番通りタップして扉のコードを解け
// 操作: タップでパネルを押す（光った順番通りに）
// 成功: 10回扉を開ける  失敗: 5回間違える or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    panel:   '#0a1a28',
    panelOn: '#f59e0b',
    panelHi: '#fde68a',
    door:    '#1e3a5f',
    doorHi:  '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060c14'
  };

  var PANEL_COUNT = 6;
  var PANEL_R = 100;
  var PANEL_POSITIONS = [
    { x: W * 0.25, y: H * 0.32 },
    { x: W * 0.75, y: H * 0.32 },
    { x: W * 0.15, y: H * 0.52 },
    { x: W * 0.5,  y: H * 0.52 },
    { x: W * 0.85, y: H * 0.52 },
    { x: W * 0.5,  y: H * 0.72 }
  ];

  var sequence = [];
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_DUR = 0.5;
  var inputSeq = [];
  var phase = 'show'; // 'show' | 'input'
  var litPanel = -1;
  var panelFlash = [];
  for (var pi = 0; pi < PANEL_COUNT; pi++) panelFlash.push(0);

  var round = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var doorOpen = 0;
  var waitTimer = 0;

  function newSequence() {
    var len = 3 + Math.min(4, Math.floor(round / 2));
    sequence = [];
    for (var i = 0; i < len; i++) {
      sequence.push(Math.floor(Math.random() * PANEL_COUNT));
    }
    showIdx = 0;
    showTimer = 0.6;
    litPanel = -1;
    inputSeq = [];
    phase = 'show';
    doorOpen = 0;
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    for (var i = 0; i < PANEL_COUNT; i++) {
      var p = PANEL_POSITIONS[i];
      var dx = tx - p.x, dy = ty - p.y;
      if (dx * dx + dy * dy < (PANEL_R + 20) * (PANEL_R + 20)) {
        panelFlash[i] = 0.3;
        inputSeq.push(i);
        var idx = inputSeq.length - 1;
        if (inputSeq[idx] !== sequence[idx]) {
          // Wrong
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultText = '違う！';
          resultTimer = 0.7;
          game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            phase = 'show'; // replay sequence
            showIdx = 0;
            showTimer = 0.8;
            inputSeq = [];
          }
        } else {
          game.audio.play('se_tap', 0.13);
          if (inputSeq.length >= sequence.length) {
            // Correct!
            round++;
            doorOpen = 1.0;
            flashCol = C.correct;
            flashAnim = 0.35;
            resultText = '扉が開いた！';
            resultTimer = 0.7;
            game.audio.play('se_success', 0.65);
            for (var p2 = 0; p2 < 8; p2++) {
              var pa = Math.random() * Math.PI * 2;
              particles.push({ x: W / 2, y: H * 0.52, vx: Math.cos(pa) * 240, vy: Math.sin(pa) * 240, life: 0.6, col: C.doorHi });
            }
            if (round >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(round * 600 + Math.ceil(timeLeft) * 80); }, 800);
            } else {
              waitTimer = 1.0;
              phase = 'wait';
            }
          }
        }
        break;
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (doorOpen > 0) doorOpen -= dt * 1.5;
    for (var pi2 = 0; pi2 < PANEL_COUNT; pi2++) {
      if (panelFlash[pi2] > 0) panelFlash[pi2] -= dt * 4;
    }

    if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0) newSequence();
    }

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (litPanel >= 0) {
          panelFlash[litPanel] = 0;
          litPanel = -1;
        }
        if (showIdx < sequence.length) {
          litPanel = sequence[showIdx];
          panelFlash[litPanel] = 1.0;
          showIdx++;
          showTimer = SHOW_DUR;
          game.audio.play('se_tap', 0.08);
        } else {
          litPanel = -1;
          phase = 'input';
        }
      } else if (showTimer < 0.15 && litPanel >= 0) {
        panelFlash[litPanel] = Math.max(0, panelFlash[litPanel] - dt * 6);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Door
    var doorAlpha = 0.7 + doorOpen * 0.3;
    var doorW = 280;
    var doorH = 420;
    var doorX = W / 2 - doorW / 2;
    var doorY = H * 0.27;
    game.draw.rect(doorX + 4, doorY + 4, doorW, doorH, '#000', 0.3);
    game.draw.rect(doorX, doorY, doorW, doorH, C.door, doorAlpha);
    game.draw.rect(doorX, doorY, doorW, 14, C.doorHi, doorOpen > 0 ? 0.8 : 0.2);
    game.draw.rect(doorX + doorW - 36, doorY + doorH / 2 - 16, 28, 32, C.doorHi, 0.8);
    if (doorOpen > 0) {
      game.draw.rect(doorX - doorW * doorOpen, doorY, doorW, doorH, C.doorHi, doorOpen * 0.15);
    }

    // Panels
    for (var pni = 0; pni < PANEL_COUNT; pni++) {
      var pos = PANEL_POSITIONS[pni];
      var glow = panelFlash[pni];
      var pCol = glow > 0.2 ? C.panelOn : C.panel;
      var pAlpha = 0.8 + glow * 0.2;
      game.draw.circle(pos.x + 4, pos.y + 4, PANEL_R, '#000', 0.25);
      game.draw.circle(pos.x, pos.y, PANEL_R, pCol, pAlpha);
      if (glow > 0.2) {
        game.draw.circle(pos.x, pos.y, PANEL_R + 16, C.panelHi, glow * 0.3);
        game.draw.circle(pos.x, pos.y, PANEL_R * 0.55, C.panelHi, glow * 0.25);
      }
      // Panel number
      game.draw.text((pni + 1) + '', pos.x, pos.y + 14, { size: 52, color: glow > 0.2 ? '#fff' : '#ffffff33', bold: true });
    }

    // Phase label
    var phStr = phase === 'show' ? '記憶せよ' : (phase === 'input' ? ('入力 ' + inputSeq.length + '/' + sequence.length) : '...');
    game.draw.text(phStr, W / 2, H * 0.88, { size: 44, color: phase === 'input' ? C.correct : '#ffffff55', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.92, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newSequence();
  });
})(game);
