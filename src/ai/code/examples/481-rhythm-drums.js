// 481-rhythm-drums.js
// リズムドラム — 4つのドラムを光ったタイミングで叩くリズムゲーム
// 操作: タップで対応するドラムを叩く
// 成功: 50ヒット  失敗: 15ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0005',
    drum0:  '#ef4444',
    drum1:  '#3b82f6',
    drum2:  '#22c55e',
    drum3:  '#f59e0b',
    drumHi: '#fff',
    hit0:   '#fca5a5',
    hit1:   '#93c5fd',
    hit2:   '#86efac',
    hit3:   '#fde68a',
    miss:   '#475569',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    bg2:    '#140008'
  };

  var DRUM_COLORS = [C.drum0, C.drum1, C.drum2, C.drum3];
  var HIT_COLORS  = [C.hit0,  C.hit1,  C.hit2,  C.hit3];

  // 2x2 grid layout
  var DRUM_POS = [
    { x: W * 0.28, y: H * 0.42 },
    { x: W * 0.72, y: H * 0.42 },
    { x: W * 0.28, y: H * 0.68 },
    { x: W * 0.72, y: H * 0.68 }
  ];
  var DRUM_R = 130;

  var hits = 0;
  var NEEDED = 50;
  var misses = 0;
  var MAX_MISS = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];

  // Beat system
  var BPM = 100;
  var BEAT_INTERVAL = 60 / BPM;
  var beatTimer = 0;
  var beatCount = 0;

  // Active notes
  var notes = []; // {drum, lit, litTimer, LIT_DURATION}
  var drumLit = [false, false, false, false];
  var drumLitTimer = [0, 0, 0, 0];
  var drumHitAnim = [0, 0, 0, 0];
  var LIT_DURATION = 0.45;

  // Pattern: which drums light up on each beat (16th note grid)
  // Simple pattern that loops
  var PATTERN = [
    [0, 2],     // beat 1
    [],         // beat 2
    [1, 3],     // beat 3
    [],         // beat 4
    [0],        // beat 5
    [2, 3],     // beat 6
    [1],        // beat 7
    [0, 1, 2],  // beat 8
    [3],        // beat 9
    [0, 2],     // beat 10
    [1],        // beat 11
    [0, 3],     // beat 12
    [2],        // beat 13
    [1, 3],     // beat 14
    [0],        // beat 15
    [1, 2, 3]   // beat 16
  ];

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitDrum = -1;
    for (var di = 0; di < 4; di++) {
      var dp = DRUM_POS[di];
      var dx = tx - dp.x;
      var dy = ty - dp.y;
      if (Math.sqrt(dx * dx + dy * dy) < DRUM_R + 20) {
        hitDrum = di;
        break;
      }
    }
    if (hitDrum < 0) return;

    drumHitAnim[hitDrum] = 0.3;

    if (drumLit[hitDrum]) {
      // Correct hit
      hits++;
      drumLit[hitDrum] = false;
      drumLitTimer[hitDrum] = 0;
      game.audio.play('se_tap', 0.5);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: DRUM_POS[hitDrum].x, y: DRUM_POS[hitDrum].y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: HIT_COLORS[hitDrum] });
      }
      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hits * 100 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      // Miss or early hit
      misses++;
      game.audio.play('se_failure', 0.2);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    // Beat timer
    beatTimer += dt;
    if (beatTimer >= BEAT_INTERVAL) {
      beatTimer -= BEAT_INTERVAL;
      var patIdx = beatCount % PATTERN.length;
      var drumsToLight = PATTERN[patIdx];
      for (var di2 = 0; di2 < drumsToLight.length; di2++) {
        var d = drumsToLight[di2];
        if (!drumLit[d]) {
          drumLit[d] = true;
          drumLitTimer[d] = LIT_DURATION;
        }
      }
      beatCount++;
    }

    // Lit timers
    for (var di3 = 0; di3 < 4; di3++) {
      if (drumLit[di3]) {
        drumLitTimer[di3] -= dt;
        if (drumLitTimer[di3] <= 0) {
          // Missed note
          drumLit[di3] = false;
          misses++;
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
      if (drumHitAnim[di3] > 0) drumHitAnim[di3] -= dt * 4;
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Background grid lines (stage feel)
    game.draw.rect(0, H * 0.28, W, 4, C.bg2, 0.8);
    game.draw.rect(0, H * 0.55, W, 4, C.bg2, 0.8);
    game.draw.rect(0, H * 0.82, W, 4, C.bg2, 0.8);

    // Beat visualizer (top)
    var beatPhase = beatTimer / BEAT_INTERVAL;
    game.draw.rect(W * beatPhase * 0.8 + W * 0.1, H * 0.17, 14, 14, C.text, 0.6);

    // Drums
    for (var di4 = 0; di4 < 4; di4++) {
      var dp2 = DRUM_POS[di4];
      var isLit = drumLit[di4];
      var hitA = drumHitAnim[di4];
      var lifeRatio = drumLit[di4] ? (drumLitTimer[di4] / LIT_DURATION) : 0;

      // Outer glow
      if (isLit) {
        game.draw.circle(dp2.x, dp2.y, DRUM_R + 30 * lifeRatio, DRUM_COLORS[di4], 0.2 * lifeRatio);
      }

      // Drum body
      var col2 = isLit ? DRUM_COLORS[di4] : C.miss;
      game.draw.circle(dp2.x, dp2.y, DRUM_R + 8, col2, 0.15);
      game.draw.circle(dp2.x, dp2.y, DRUM_R, col2, isLit ? 0.9 : 0.4);
      game.draw.circle(dp2.x, dp2.y, DRUM_R * 0.55, col2, isLit ? 0.5 : 0.15);

      // Hit animation flash
      if (hitA > 0) {
        game.draw.circle(dp2.x, dp2.y, DRUM_R + 20, C.drumHi, hitA * 0.4);
      }

      // Lit progress ring
      if (isLit) {
        var ringAlpha = lifeRatio * 0.9;
        game.draw.circle(dp2.x, dp2.y, DRUM_R + 16, DRUM_COLORS[di4], ringAlpha * 0.5);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.9);
    }

    // Miss display
    var missBarW = W * 0.8 * (1 - misses / MAX_MISS);
    game.draw.rect(W * 0.1, H * 0.87, W * 0.8, 16, C.ui, 0.3);
    game.draw.rect(W * 0.1, H * 0.87, missBarW, 16, C.drum2, 0.8);

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.drum3 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
