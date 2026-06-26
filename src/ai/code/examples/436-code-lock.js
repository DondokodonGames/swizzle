// 436-code-lock.js
// 暗号錠 — 閃光する数字を記憶してダイヤルを合わせる
// 操作: スワイプ上下で数字を変更、タップで確定
// 成功: 5桁の暗証番号を3回解錠  失敗: 3回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060408',
    vault:  '#1e1b2e',
    vaultHi:'#312e55',
    dial:   '#374151',
    dialHi: '#4b5563',
    number: '#f1f5f9',
    numberHi:'#fbbf24',
    correct:'#22c55e',
    wrong:  '#ef4444',
    flash:  '#fbbf24',
    lock:   '#d97706',
    lockHi: '#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var DIGITS = 5;
  var secretCode = [];
  var playerDials = [0, 0, 0, 0, 0];
  var selectedDial = 0;
  var peekTimer = 0;
  var PEEK_DURATION = 2.5;
  var phase = 'peek';  // peek, enter, result
  var flashDigit = -1;
  var flashTimer = 0;

  var solved = 0;
  var NEEDED = 3;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];

  var DIAL_W = 140;
  var DIAL_H = 200;
  var DIAL_GAP = 20;
  var TOTAL_W = DIGITS * DIAL_W + (DIGITS - 1) * DIAL_GAP;
  var DIAL_X0 = (W - TOTAL_W) / 2;
  var DIAL_Y = H * 0.5;

  function generateCode() {
    secretCode = [];
    for (var i = 0; i < DIGITS; i++) {
      secretCode.push(Math.floor(Math.random() * 10));
    }
    playerDials = [0, 0, 0, 0, 0];
    selectedDial = 0;
    peekTimer = 0;
    phase = 'peek';
    flashDigit = 0;
    flashTimer = 0;
  }

  function submit() {
    var correct2 = true;
    for (var i = 0; i < DIGITS; i++) {
      if (playerDials[i] !== secretCode[i]) { correct2 = false; break; }
    }
    if (correct2) {
      solved++;
      flashCol = C.correct;
      flashAnim = 0.9;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: DIAL_Y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200-100, life: 0.8, col: C.lockHi });
      }
      if (solved >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(solved * 1000 + Math.ceil(timeLeft) * 80); }, 800);
        return;
      }
      phase = 'result';
      setTimeout(function() { generateCode(); }, 1200);
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.7;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      // Reveal which were wrong briefly
      phase = 'result';
      setTimeout(function() { generateCode(); }, 1000);
    }
  }

  game.onSwipe(function(dir) {
    if (done || phase !== 'enter') return;
    if (dir === 'up') {
      playerDials[selectedDial] = (playerDials[selectedDial] + 1) % 10;
    } else if (dir === 'down') {
      playerDials[selectedDial] = (playerDials[selectedDial] + 9) % 10;
    } else if (dir === 'right') {
      selectedDial = Math.min(DIGITS - 1, selectedDial + 1);
    } else if (dir === 'left') {
      selectedDial = Math.max(0, selectedDial - 1);
    }
    game.audio.play('se_tap', 0.25);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'enter') {
      // Tapping a dial selects it
      for (var di = 0; di < DIGITS; di++) {
        var dx = DIAL_X0 + di * (DIAL_W + DIAL_GAP) + DIAL_W/2;
        if (Math.abs(tx - dx) < DIAL_W/2) {
          selectedDial = di;
          game.audio.play('se_tap', 0.2);
          return;
        }
      }
      // Tap submit area
      if (ty > H * 0.73 && ty < H * 0.8) {
        submit();
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

    if (flashAnim > 0) flashAnim -= dt * 1.5;

    if (phase === 'peek') {
      peekTimer += dt;
      // Flash each digit in sequence
      flashTimer += dt;
      if (flashTimer > 0.4) {
        flashTimer = 0;
        flashDigit++;
      }
      if (peekTimer >= PEEK_DURATION) {
        phase = 'enter';
        flashDigit = -1;
      }
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

    // Vault door
    game.draw.rect(W*0.08, H*0.18, W*0.84, H*0.68, C.vault, 0.9);
    game.draw.rect(W*0.08, H*0.18, W*0.84, 12, C.vaultHi, 0.5);
    game.draw.rect(W*0.08, H*0.18, 12, H*0.68, C.vaultHi, 0.3);

    // Lock body center
    game.draw.circle(W*0.5, H*0.33, 60, C.lock, 0.8);
    game.draw.circle(W*0.5, H*0.33, 44, C.lockHi, 0.6);
    game.draw.circle(W*0.5, H*0.33, 24, C.vault, 0.9);

    // Code display (during peek)
    if (phase === 'peek') {
      for (var di2 = 0; di2 < DIGITS; di2++) {
        var dx2 = DIAL_X0 + di2 * (DIAL_W + DIAL_GAP) + DIAL_W/2;
        var isFlashing = di2 === flashDigit;
        game.draw.rect(dx2 - DIAL_W/2, DIAL_Y - DIAL_H/2, DIAL_W, DIAL_H, C.dial, 0.9);
        game.draw.rect(dx2 - DIAL_W/2, DIAL_Y - DIAL_H/2, DIAL_W, DIAL_H, C.flash, isFlashing ? 0.25 : 0.0);
        game.draw.text(secretCode[di2] + '', dx2, DIAL_Y + 20, { size: 100, color: isFlashing ? C.flash : C.number, bold: true });
      }
      var countdown = PEEK_DURATION - peekTimer;
      game.draw.text('覚えて！ ' + countdown.toFixed(1), W/2, H*0.74, { size: 48, color: C.flash, bold: true });
    }

    // Player dials (during enter)
    if (phase === 'enter' || phase === 'result') {
      for (var di3 = 0; di3 < DIGITS; di3++) {
        var dx3 = DIAL_X0 + di3 * (DIAL_W + DIAL_GAP) + DIAL_W/2;
        var isSelected = di3 === selectedDial && phase === 'enter';
        var isCorrectDig = phase === 'result' && playerDials[di3] === secretCode[di3];
        var dialCol = isSelected ? C.dialHi : C.dial;
        var numCol = isCorrectDig ? C.correct : (phase === 'result' ? C.wrong : C.number);

        game.draw.rect(dx3 - DIAL_W/2, DIAL_Y - DIAL_H/2, DIAL_W, DIAL_H, dialCol, 0.9);
        if (isSelected) {
          game.draw.rect(dx3 - DIAL_W/2, DIAL_Y - DIAL_H/2, DIAL_W, 6, C.numberHi, 0.8);
          game.draw.rect(dx3 - DIAL_W/2, DIAL_Y + DIAL_H/2 - 6, DIAL_W, 6, C.numberHi, 0.8);
        }
        // Adj numbers
        game.draw.text(((playerDials[di3] + 9) % 10) + '', dx3, DIAL_Y - DIAL_H*0.3 + 12, { size: 52, color: C.ui });
        game.draw.text(playerDials[di3] + '', dx3, DIAL_Y + 20, { size: 90, color: numCol, bold: true });
        game.draw.text(((playerDials[di3] + 1) % 10) + '', dx3, DIAL_Y + DIAL_H*0.3 + 12, { size: 52, color: C.ui });
      }
      if (phase === 'enter') {
        game.draw.rect(W*0.3, H*0.73, W*0.4, 70, C.lock, 0.8);
        game.draw.text('解錠', W/2, H*0.765, { size: 52, color: C.lockHi, bold: true });
        game.draw.text('↑↓ で変更 / ←→ で移動', W/2, H*0.84, { size: 36, color: C.ui });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(solved + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lock : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateCode();
  });
})(game);
