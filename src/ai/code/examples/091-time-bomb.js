// 091-time-bomb.js
// タイムボム — 爆弾の解除コードを素早く入力する極限の集中力
// 操作: 表示された4桁の数字ボタンを順番にタップして解除
// 成功: 4問解除  失敗: 1問でも時間切れ爆発 or ミスタップ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0200',
    bomb:     '#1a0a00',
    bombHi:   '#292407',
    wire:     '#ef4444',
    wireGreen:'#22c55e',
    display:  '#031a03',
    digit:    '#22c55e',
    btn:      '#0f1a0f',
    btnHi:    '#1a2e1a',
    pressed:  '#22c55e',
    wrong:    '#ef4444',
    ui:       '#475569'
  };

  var CODE_LEN = 4;
  var FUSE_TIME = 8; // seconds per bomb

  var code = [];
  var input = [];
  var fuseTimer = FUSE_TIME;
  var score = 0;
  var needed = 4;
  var done = false;
  var exploding = 0;
  var defused = 0; // flash
  var wrongFlash = 0;
  var particles = [];

  // 3x4 numpad layout
  var NUMPAD = [
    [1,2,3],
    [4,5,6],
    [7,8,9],
    [-1,0,-2] // -1=clear, -2=unused
  ];
  var BTN_W = 200, BTN_H = 160;
  var BTN_GAP = 24;
  var NUMPAD_X = (W - (3 * BTN_W + 2 * BTN_GAP)) / 2;
  var NUMPAD_Y = H * 0.58;

  function generateCode() {
    code = [];
    for (var i = 0; i < CODE_LEN; i++) {
      code.push(Math.floor(Math.random() * 10));
    }
    input = [];
    fuseTimer = Math.max(4, FUSE_TIME - score * 0.8);
  }

  function btnPos(col, row) {
    return {
      x: NUMPAD_X + col * (BTN_W + BTN_GAP),
      y: NUMPAD_Y + row * (BTN_H + BTN_GAP)
    };
  }

  game.onTap(function(tx, ty) {
    if (done || exploding > 0 || defused > 0) return;
    // Check numpad buttons
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 3; c++) {
        var num = NUMPAD[r][c];
        if (num === -2) continue;
        var pos = btnPos(c, r);
        if (tx >= pos.x && tx <= pos.x + BTN_W && ty >= pos.y && ty <= pos.y + BTN_H) {
          if (num === -1) {
            // Clear
            input = [];
            game.audio.play('se_tap', 0.4);
          } else {
            // Digit tap
            input.push(num);
            game.audio.play('se_tap', 0.7);

            // Check if input matches code
            if (input.length === CODE_LEN) {
              var correct = true;
              for (var i = 0; i < CODE_LEN; i++) {
                if (input[i] !== code[i]) { correct = false; break; }
              }
              if (correct) {
                score++;
                defused = 0.6;
                game.audio.play('se_success');
                if (score >= needed && !done) {
                  done = true;
                  setTimeout(function() { game.end.success(score * 100 + Math.ceil(fuseTimer) * 20); }, 700);
                  return;
                }
                setTimeout(generateCode, 700);
              } else {
                // Wrong code!
                wrongFlash = 0.4;
                input = [];
                game.audio.play('se_failure', 0.7);
                fuseTimer -= 2; // penalty
              }
            }
          }
          return;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done && exploding <= 0 && defused <= 0) {
      fuseTimer -= dt;
      if (fuseTimer <= 0) {
        fuseTimer = 0;
        exploding = 0.8;
        game.audio.play('se_failure');
        // Particles
        for (var i = 0; i < 30; i++) {
          var ang = Math.random() * Math.PI * 2;
          var spd = 300 + Math.random() * 400;
          particles.push({ x: W / 2, y: H * 0.4, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 0.7 });
        }
        setTimeout(function() { if (!done) { done = true; game.end.failure(); } }, 900);
      }
    }

    if (exploding > 0) exploding -= dt;
    if (defused > 0) defused -= dt;
    if (wrongFlash > 0) wrongFlash -= dt;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 500 * dt;
      p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Bomb body
    game.draw.circle(W / 2, H * 0.34, 140, C.bomb);
    game.draw.circle(W / 2, H * 0.34, 120, C.bombHi, 0.5);
    // Fuse
    var fuseColor = fuseTimer > 4 ? C.wireGreen : (fuseTimer > 2 ? '#f59e0b' : C.wire);
    game.draw.line(W / 2, H * 0.21, W / 2 + 40, H * 0.16, fuseColor, 8);
    // Spark at fuse tip
    var sparkPulse = Math.abs(Math.sin(game.time.elapsed * 10));
    game.draw.circle(W / 2 + 40, H * 0.16, 14 + sparkPulse * 6, '#fbbf24', 0.8 + sparkPulse * 0.2);

    // Timer display on bomb
    var fuseDisplay = Math.max(0, fuseTimer).toFixed(1);
    var dispColor = fuseTimer > 4 ? C.digit : (fuseTimer > 2 ? '#fbbf24' : C.wire);
    game.draw.text(fuseDisplay, W / 2, H * 0.34, { size: 72, color: dispColor, bold: true });

    // Code display
    game.draw.rect(W / 2 - 280, H * 0.47, 560, 96, C.display);
    for (var d = 0; d < CODE_LEN; d++) {
      var dx = W / 2 - 200 + d * 132;
      game.draw.text(code[d] + '', dx, H * 0.50, { size: 72, color: '#22c55e', bold: true });
    }
    // Separator
    game.draw.line(W / 2 - 280, H * 0.56, W / 2 + 280, H * 0.56, '#0f2a0f', 3);
    // Input display
    for (var id = 0; id < CODE_LEN; id++) {
      var ix = W / 2 - 200 + id * 132;
      if (id < input.length) {
        game.draw.text(input[id] + '', ix, H * 0.57, { size: 60, color: '#fff', bold: true });
      } else {
        game.draw.text('_', ix, H * 0.57, { size: 60, color: '#334155' });
      }
    }

    // Numpad
    for (var row = 0; row < 4; row++) {
      for (var col = 0; col < 3; col++) {
        var num = NUMPAD[row][col];
        if (num === -2) continue;
        var pos = btnPos(col, row);
        game.draw.rect(pos.x, pos.y, BTN_W, BTN_H, C.btn);
        game.draw.rect(pos.x + 4, pos.y + 4, BTN_W - 8, 8, C.btnHi, 0.5);
        if (num === -1) {
          game.draw.text('CLR', pos.x + BTN_W / 2, pos.y + BTN_H / 2, { size: 40, color: '#ef4444', bold: true });
        } else {
          game.draw.text(num + '', pos.x + BTN_W / 2, pos.y + BTN_H / 2, { size: 64, color: '#22c55e', bold: true });
        }
      }
    }

    // Wrong flash
    if (wrongFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, wrongFlash * 0.4);
      game.draw.text('コードが違う！', W / 2, H * 0.43, { size: 56, color: C.wrong, bold: true });
    }

    // Defused flash
    if (defused > 0) {
      game.draw.rect(0, 0, W, H, C.wireGreen, defused / 0.6 * 0.3);
      game.draw.text('解除！', W / 2, H * 0.43, { size: 80, color: C.wireGreen, bold: true });
    }

    // Explosion
    if (exploding > 0) {
      game.draw.rect(0, 0, W, H, '#ff6600', exploding * 0.6);
    }
    for (var pi = 0; pi < particles.length; pi++) {
      var pp = particles[pi];
      game.draw.circle(pp.x, pp.y, 12 * pp.life, '#f97316', pp.life);
    }

    // Score (progress bombs)
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 140, 28, s < score ? C.wireGreen : '#1a0a00');
      if (s < score) game.draw.text('✓', sx, 140, { size: 28, color: '#fff', bold: true });
      else game.draw.text('💣', sx, 140, { size: 28, color: '#fff' });
    }

    // Timer bar
    var ratio = Math.max(0, fuseTimer / FUSE_TIME);
    game.draw.rect(0, 0, W, 72, '#0a0200');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.4 ? '#22c55e' : (ratio > 0.2 ? '#f59e0b' : C.wire));
    game.draw.text(fuseDisplay, W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    generateCode();
  });
})(game);
