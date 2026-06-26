// 466-reel-stop.js
// リール停止 — スロットマシンのリールを1本ずつ狙った絵柄で止める
// 操作: タップで回転中のリールを順番に止める
// 成功: 3本揃えて3回  失敗: 7回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0500',
    machine:'#1a0e00',
    machineHi:'#2d1a00',
    reel:   '#fff8e1',
    reelHi: '#fffde7',
    sym0:   '#ef4444',
    sym1:   '#f97316',
    sym2:   '#eab308',
    sym3:   '#22c55e',
    sym4:   '#06b6d4',
    sym5:   '#8b5cf6',
    win:    '#fbbf24',
    winHi:  '#fef08a',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var SYMBOLS = ['♥', '★', '♦', '♣', '7', '$'];
  var SYM_COLORS = [C.sym0, C.sym1, C.sym2, C.sym3, C.sym4, C.sym5];
  var REEL_COUNT = 3;
  var REEL_W = 220;
  var REEL_H = 200;
  var REEL_GAP = 20;
  var TOTAL_W = REEL_COUNT * REEL_W + (REEL_COUNT - 1) * REEL_GAP;
  var OX = (W - TOTAL_W) / 2;
  var OY = H * 0.38;

  var reels = [];
  var currentReel = 0;  // which reel to stop next
  var particles = [];
  var wins = 0;
  var NEEDED = 3;
  var misses = 0;
  var MAX_MISS = 7;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.win;
  var resultTimer = 0;
  var phase = 'spinning';

  function initReels() {
    reels = [];
    for (var i = 0; i < REEL_COUNT; i++) {
      reels.push({
        pos: Math.random() * SYMBOLS.length,
        speed: 8 + Math.random() * 4,
        stopped: false,
        stoppedSym: 0,
        targetSym: Math.floor(Math.random() * SYMBOLS.length)
      });
    }
    // All reels target the same symbol (win condition)
    var targetSym = Math.floor(Math.random() * SYMBOLS.length);
    for (var j = 0; j < REEL_COUNT; j++) {
      reels[j].targetSym = targetSym;
    }
    currentReel = 0;
    phase = 'spinning';
  }

  function stopReel(idx) {
    reels[idx].stopped = true;
    reels[idx].stoppedSym = Math.round(reels[idx].pos) % SYMBOLS.length;
    game.audio.play('se_tap', 0.5);
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'spinning') return;
    if (currentReel < REEL_COUNT && !reels[currentReel].stopped) {
      stopReel(currentReel);
      currentReel++;
      if (currentReel >= REEL_COUNT) {
        // All stopped — check win
        phase = 'result';
        resultTimer = 0;
        var sym0 = reels[0].stoppedSym;
        var allMatch = reels.every(function(r) { return r.stoppedSym === sym0; });
        if (allMatch) {
          wins++;
          flashCol = C.win;
          flashAnim = 1.0;
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 20; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W/2, y: OY + REEL_H/2, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250, life: 0.8, col: C.winHi });
          }
          if (wins >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(wins * 1000 + Math.ceil(timeLeft) * 80); }, 800);
          }
        } else {
          misses++;
          flashCol = C.wrong;
          flashAnim = 0.6;
          game.audio.play('se_failure', 0.5);
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
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

    // Spin reels
    for (var i = 0; i < REEL_COUNT; i++) {
      if (!reels[i].stopped) {
        reels[i].pos += reels[i].speed * dt;
      }
    }

    if (phase === 'result') {
      resultTimer += dt;
      if (resultTimer > 1.3 && !done) {
        initReels();
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Machine body
    game.draw.rect(OX - 40, OY - 50, TOTAL_W + 80, REEL_H + 100, C.machine, 0.9);
    game.draw.rect(OX - 40, OY - 50, TOTAL_W + 80, 14, C.machineHi, 0.6);

    // Reels
    for (var i2 = 0; i2 < REEL_COUNT; i2++) {
      var rx = OX + i2 * (REEL_W + REEL_GAP);
      game.draw.rect(rx, OY, REEL_W, REEL_H, C.reel, 0.95);

      // Show symbols (visible window = 3 symbols, middle is center)
      for (var sy = -1; sy <= 1; sy++) {
        var symIdx = (Math.floor(reels[i2].pos) + sy + SYMBOLS.length * 10) % SYMBOLS.length;
        var frac = reels[i2].pos - Math.floor(reels[i2].pos);
        var syY = OY + REEL_H/2 + (sy - frac) * (REEL_H/3) + 20;
        if (syY < OY + 10 || syY > OY + REEL_H - 10) continue;
        game.draw.text(SYMBOLS[symIdx], rx + REEL_W/2, syY, { size: 90, color: SYM_COLORS[symIdx], bold: true });
      }

      // Stopped indicator
      if (reels[i2].stopped) {
        game.draw.rect(rx, OY, REEL_W, 6, C.win, 0.7);
        game.draw.rect(rx, OY + REEL_H - 6, REEL_W, 6, C.win, 0.7);
      }

      // Next to stop highlight
      if (i2 === currentReel && !reels[i2].stopped && phase === 'spinning') {
        var blink = Math.sin(elapsed * 12) * 0.3 + 0.5;
        game.draw.rect(rx - 4, OY - 4, REEL_W + 8, REEL_H + 8, C.win, 0.1 * blink);
        game.draw.rect(rx - 4, OY - 4, REEL_W + 8, 6, C.win, blink * 0.7);
      }
    }

    // Center line
    game.draw.line(OX - 40, OY + REEL_H/2, OX + TOTAL_W + 40, OY + REEL_H/2, C.win, 4);

    // Win/result display
    if (phase === 'result') {
      var sym0b = reels[0].stoppedSym;
      var allMatch2 = reels.every(function(r2) { return r2.stoppedSym === sym0b; });
      if (allMatch2) {
        game.draw.text('777 WIN!!!', W/2, H * 0.78, { size: 64, color: C.win, bold: true });
      } else {
        game.draw.text('バラバラ...', W/2, H * 0.78, { size: 52, color: C.wrong });
      }
    }

    // Tap hint
    if (phase === 'spinning' && currentReel < REEL_COUNT) {
      game.draw.text('タップで止める！', W/2, H * 0.87, { size: 44, color: C.machineHi });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W*0.07 + mi * (W*0.86/6), H*0.955, 14, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(wins + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sym1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initReels();
  });
})(game);
