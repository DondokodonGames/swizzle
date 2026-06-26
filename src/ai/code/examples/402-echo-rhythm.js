// 402-echo-rhythm.js
// エコーリズム — 聞こえたビートを正確に繰り返してタップ
// 操作: 音のパターンを記憶してタップで再現
// 成功: 6ラウンドクリア  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06040f',
    panel:  '#1a1040',
    beat:   '#a855f7',
    beatHi: '#d8b4fe',
    beatOn: '#f0abfc',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    note:   '#fbbf24'
  };

  var BEAT_INTERVAL = 0.5;  // seconds between beats in pattern
  var MAX_LEN = 4;          // max beats in pattern

  var phase = 'showing';    // showing, waiting, inputting
  var pattern = [];
  var playerInput = [];
  var showIdx = 0;
  var showTimer = 0;
  var pauseTimer = 0;

  var round = 0;
  var NEEDED = 6;
  var wrong = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var beatFlash = -1;
  var beatFlashTimer = 0;

  // Beat positions (circle layout)
  var BEATS = [];
  var NBEATS = 6;
  for (var bi = 0; bi < NBEATS; bi++) {
    var ang = bi / NBEATS * Math.PI * 2 - Math.PI/2;
    BEATS.push({ x: W/2 + Math.cos(ang)*260, y: H*0.46 + Math.sin(ang)*260, id: bi });
  }

  function generatePattern() {
    var len = 2 + Math.min(round, MAX_LEN-2);
    pattern = [];
    for (var i = 0; i < len; i++) {
      pattern.push(Math.floor(Math.random()*NBEATS));
    }
    playerInput = [];
    showIdx = 0;
    showTimer = BEAT_INTERVAL;
    pauseTimer = 0;
    phase = 'showing';
  }

  function checkInput() {
    for (var i = 0; i < playerInput.length; i++) {
      if (playerInput[i] !== pattern[i]) {
        wrong++;
        flashCol = C.wrong;
        flashAnim = 0.7;
        game.audio.play('se_failure', 0.4);
        if (wrong >= MAX_WRONG && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 500); }
        playerInput = [];
        setTimeout(function(){ generatePattern(); }, 800);
        return;
      }
    }
    if (playerInput.length === pattern.length) {
      round++;
      flashCol = C.correct;
      flashAnim = 0.6;
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 12; pi++) {
        var ang2 = Math.random()*Math.PI*2;
        particles.push({ x:W/2, y:H*0.46, vx:Math.cos(ang2)*220, vy:Math.sin(ang2)*220, life:0.7, col:C.beatOn });
      }
      if (round >= NEEDED && !done) { done = true; setTimeout(function(){ game.end.success(round*500+Math.ceil(timeLeft)*80); }, 700); return; }
      setTimeout(function(){ generatePattern(); }, 900);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'inputting') return;
    // Find nearest beat
    var nearest = -1, nearestDist = 999999;
    for (var bi2 = 0; bi2 < BEATS.length; bi2++) {
      var d = Math.hypot(tx-BEATS[bi2].x, ty-BEATS[bi2].y);
      if (d < nearestDist) { nearestDist = d; nearest = bi2; }
    }
    if (nearestDist > 100) return;
    beatFlash = nearest;
    beatFlashTimer = 0.25;
    playerInput.push(nearest);
    game.audio.play('se_tap', 0.4);
    checkInput();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (beatFlashTimer > 0) beatFlashTimer -= dt;

    if (phase === 'showing') {
      showTimer -= dt;
      if (showTimer <= 0) {
        // Flash beat
        if (showIdx < pattern.length) {
          beatFlash = pattern[showIdx];
          beatFlashTimer = BEAT_INTERVAL * 0.6;
          game.audio.play('se_tap', 0.35);
          showIdx++;
          showTimer = BEAT_INTERVAL;
        } else {
          // Done showing
          phase = 'pause';
          pauseTimer = 0.4;
        }
      }
    }

    if (phase === 'pause') {
      pauseTimer -= dt;
      if (pauseTimer <= 0) {
        phase = 'inputting';
        playerInput = [];
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Connection ring
    for (var bi3 = 0; bi3 < BEATS.length; bi3++) {
      var next = (bi3+1) % BEATS.length;
      game.draw.line(BEATS[bi3].x, BEATS[bi3].y, BEATS[next].x, BEATS[next].y, C.panel, 2);
    }

    // Beat nodes
    for (var bi4 = 0; bi4 < BEATS.length; bi4++) {
      var bt = BEATS[bi4];
      var isFlashing = (bt.id === beatFlash && beatFlashTimer > 0);
      var alpha = isFlashing ? 0.95 : 0.5;
      var col2 = isFlashing ? C.beatOn : C.beat;
      if (isFlashing) game.draw.circle(bt.x, bt.y, 68, C.beatHi, beatFlashTimer*0.4);
      game.draw.circle(bt.x, bt.y, 52, col2, alpha);
      game.draw.circle(bt.x, bt.y, 32, C.beatHi, isFlashing ? 0.8 : 0.15);
      game.draw.text((bt.id+1)+'', bt.x, bt.y+16, { size: 44, color: isFlashing ? C.bg : C.text, bold: true });
    }

    // Pattern display (dots showing progress)
    if (phase === 'inputting') {
      var dotY = H*0.75;
      for (var di = 0; di < pattern.length; di++) {
        var filled = di < playerInput.length;
        game.draw.circle(W/2-(pattern.length-1)*30+di*60, dotY, filled ? 18 : 12, filled ? C.beatHi : C.ui, 0.9);
      }
    }

    // Status text
    var statusText = phase === 'showing' ? '覚えて！' : (phase === 'pause' ? '...' : '繰り返して！');
    game.draw.text(statusText, W/2, H*0.8, { size: 52, color: phase === 'inputting' ? C.beatOn : C.ui, bold: phase === 'inputting' });

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.9);
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2-(MAX_WRONG-1)*40+wi*80, H*0.935, 16, wi < wrong ? C.wrong : C.panel, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.beat : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generatePattern();
  });
})(game);
