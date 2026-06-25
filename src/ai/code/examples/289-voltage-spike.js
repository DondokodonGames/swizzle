// 289-voltage-spike.js
// ボルテージスパイク — 電圧グラフのスパイクを素早くタップして電力網を安定させる
// 操作: 画面の急騰スパイクをタップして電圧を安定させる
// 成功: 25個のスパイクを抑える  失敗: 8個見逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020508',
    grid:   '#0d1020',
    line:   '#3b82f6',
    lineHi: '#93c5fd',
    spike:  '#ef4444',
    spikeHi:'#fca5a5',
    safe:   '#22c55e',
    safeHi: '#86efac',
    tap:    '#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var GRAPH_Y = H * 0.45;
  var GRAPH_H = H * 0.35;
  var graphData = [];
  var baseVoltage = GRAPH_Y; // y center
  var phase = 0;

  var spikes = [];
  var suppressed = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var tapFlashes = [];

  // Initialize graph with noise
  for (var i = 0; i < W; i++) graphData.push(GRAPH_Y);

  function spawnSpike() {
    var sx = W * 0.6 + Math.random() * W * 0.35;
    var height = 80 + Math.random() * 100;
    var upward = Math.random() < 0.5;
    spikes.push({
      x: sx,
      y: upward ? baseVoltage - height : baseVoltage + height,
      height: height,
      upward: upward,
      life: 0.9 + Math.random() * 0.4,
      maxLife: 0,
      hit: false
    });
    spikes[spikes.length - 1].maxLife = spikes[spikes.length - 1].life;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find closest spike
    for (var si = spikes.length - 1; si >= 0; si--) {
      var sp = spikes[si];
      if (sp.hit) continue;
      var dx = tx - sp.x, dy = ty - sp.y;
      if (dx * dx + dy * dy < 80 * 80) {
        sp.hit = true;
        suppressed++;
        tapFlashes.push({ x: sp.x, y: sp.y, life: 0.4 });
        game.audio.play('se_success', 0.4);
        if (suppressed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(suppressed * 100 + Math.ceil(timeLeft) * 80); }, 400);
        }
        return;
      }
    }
    tapFlashes.push({ x: tx, y: ty, life: 0.3, miss: true });
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    phase += dt * 2;

    // Update graph
    var noise = (Math.sin(phase * 3.7) * 18 + Math.sin(phase * 7.3) * 8 + Math.sin(phase * 1.1) * 30);
    graphData.push(baseVoltage + noise);
    if (graphData.length > W) graphData.shift();

    // Spike effects on graph
    for (var si = 0; si < spikes.length; si++) {
      var sp = spikes[si];
      if (!sp.hit) {
        var ratio = sp.life / sp.maxLife;
        var graphIdx = Math.round(W * 0.7 + (W * 0.3 - 1));
        var spikeContrib = sp.height * ratio * (sp.upward ? -1 : 1);
        if (graphIdx >= 0 && graphIdx < graphData.length) {
          graphData[graphData.length - 1] += spikeContrib * 0.3;
        }
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnSpike();
      spawnTimer = 0.7 + Math.random() * 0.6;
    }

    for (var si2 = spikes.length - 1; si2 >= 0; si2--) {
      var sp2 = spikes[si2];
      sp2.x -= 120 * dt;
      sp2.life -= dt;
      if (sp2.hit || sp2.x < -40) {
        if (!sp2.hit && !sp2.hit_counted) {
          sp2.hit_counted = true;
          missed++;
          game.audio.play('se_failure', 0.3);
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        spikes.splice(si2, 1);
      }
    }

    for (var tf = tapFlashes.length - 1; tf >= 0; tf--) {
      tapFlashes[tf].life -= dt;
      if (tapFlashes[tf].life <= 0) tapFlashes.splice(tf, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var gi = 0; gi < 8; gi++) {
      var gy = GRAPH_Y - GRAPH_H / 2 + gi * GRAPH_H / 7;
      game.draw.line(0, gy, W, gy, C.grid, 1);
    }

    // Baseline
    game.draw.line(0, baseVoltage, W, baseVoltage, C.ui, 2);

    // Graph line
    for (var i2 = 1; i2 < graphData.length; i2++) {
      game.draw.line(i2 - 1, graphData[i2 - 1], i2, graphData[i2], C.line, 3);
    }

    // Spikes
    for (var si3 = 0; si3 < spikes.length; si3++) {
      var sp3 = spikes[si3];
      if (sp3.hit) continue;
      var lifeRatio = sp3.life / sp3.maxLife;
      var col2 = sp3.upward ? C.spike : C.safeHi;
      var hiCol2 = sp3.upward ? C.spikeHi : C.safe;
      // Spike shape
      game.draw.line(sp3.x, baseVoltage, sp3.x, sp3.y, col2, 6);
      game.draw.circle(sp3.x, sp3.y, 36 + 10 * Math.sin(elapsed * 8), col2, 0.8 * lifeRatio);
      game.draw.circle(sp3.x, sp3.y, 24, hiCol2, lifeRatio * 0.9);
      game.draw.text('!', sp3.x, sp3.y + 10, { size: 36, color: '#fff', bold: true });
      // Timer ring
      var segs2 = 8;
      for (var sg = 0; sg < Math.ceil(segs2 * lifeRatio); sg++) {
        var a1 = -Math.PI / 2 + (sg / segs2) * Math.PI * 2;
        var a2 = -Math.PI / 2 + ((sg + 0.9) / segs2) * Math.PI * 2;
        game.draw.line(sp3.x + Math.cos(a1) * 44, sp3.y + Math.sin(a1) * 44,
                       sp3.x + Math.cos(a2) * 44, sp3.y + Math.sin(a2) * 44, col2, 5);
      }
    }

    // Tap flashes
    for (var tf2 = 0; tf2 < tapFlashes.length; tf2++) {
      var tfr = tapFlashes[tf2];
      var a3 = tfr.life / 0.4;
      game.draw.circle(tfr.x, tfr.y, 60 * (1 - a3) + 20, tfr.miss ? C.spike : C.tap, a3 * 0.8);
    }

    // UI
    game.draw.text('電圧スパイクをタップ', W / 2, H * 0.84, { size: 40, color: C.ui });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 22 + mi * 44, H * 0.9, 13, mi < missed ? C.spike : '#04060e');
    }

    game.draw.text(suppressed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.line : C.spike);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.6;
  });
})(game);
