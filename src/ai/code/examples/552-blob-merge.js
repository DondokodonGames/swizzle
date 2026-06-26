// 552-blob-merge.js
// ブロブマージ — 同じ色のブロブをタップして合体させ、巨大化で消去
// 操作: タップでブロブを選択→別のブロブタップで合体（同じ色のみ）
// 成功: 10回消去  失敗: 画面がブロブで埋まる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0510',
    blob0:   '#ef4444',
    blob1:   '#3b82f6',
    blob2:   '#22c55e',
    blob3:   '#f59e0b',
    blobHi:  '#ffffff',
    selected:'#ffffff',
    pop:     '#ffee44',
    text:    '#f1f5f9',
    ui:      '#374151',
    danger:  '#ef4444'
  };

  var BLOB_COLORS = [C.blob0, C.blob1, C.blob2, C.blob3];
  var blobs = [];
  var selected = -1;
  var merged = 0;
  var NEEDED = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var nextSpawn = 2.0;
  var popAnim = 0;
  var MAX_BLOBS = 18;

  function spawnBlob() {
    if (blobs.length >= MAX_BLOBS) return;
    var colorIdx = Math.floor(Math.random() * BLOB_COLORS.length);
    var r = 44;
    var attempts = 0;
    var x, y;
    do {
      x = r + 40 + Math.random() * (W - 2 * r - 80);
      y = r + 200 + Math.random() * (H * 0.7 - 2 * r);
      var ok = true;
      for (var i = 0; i < blobs.length; i++) {
        var dx = x - blobs[i].x, dy = y - blobs[i].y;
        if (Math.sqrt(dx * dx + dy * dy) < r + blobs[i].r + 20) { ok = false; break; }
      }
      if (ok) break;
      attempts++;
    } while (attempts < 20);

    blobs.push({
      x: x, y: y, r: r, colorIdx: colorIdx,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 1.5 + Math.random() * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var tapped = -1;
    // Find tapped blob (last on top)
    for (var i = blobs.length - 1; i >= 0; i--) {
      var b = blobs[i];
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.r + 20) {
        tapped = i;
        break;
      }
    }

    if (tapped === -1) {
      selected = -1;
      return;
    }

    if (selected === -1) {
      selected = tapped;
      game.audio.play('se_tap', 0.3);
      return;
    }

    if (selected === tapped) {
      selected = -1;
      return;
    }

    var sa = blobs[selected], sb = blobs[tapped];
    if (sa.colorIdx !== sb.colorIdx) {
      // Wrong color — can't merge
      selected = tapped;
      game.audio.play('se_failure', 0.2);
      return;
    }

    // Merge!
    var newR = Math.sqrt(sa.r * sa.r + sb.r * sb.r);
    var newX = (sa.x * sa.r + sb.x * sb.r) / (sa.r + sb.r);
    var newY = (sa.y * sa.r + sb.y * sb.r) / (sa.r + sb.r);

    if (newR >= 110) {
      // Pop! too big
      merged++;
      popAnim = 0.5;
      game.audio.play('se_success', 0.9);
      flashAnim = 0.3;
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: newX, y: newY, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, life: 0.5, col: BLOB_COLORS[sa.colorIdx] });
      }
      // Remove both
      var removeIdxs = [selected, tapped].sort(function(a, b) { return b - a; });
      blobs.splice(removeIdxs[0], 1);
      blobs.splice(removeIdxs[1], 1);
      selected = -1;
      if (merged >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(merged * 500 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Grow merge
      var biggerIdx = selected, smallerIdx = tapped;
      if (sb.r > sa.r) { biggerIdx = tapped; smallerIdx = selected; }
      blobs[biggerIdx].r = newR;
      blobs[biggerIdx].x = newX;
      blobs[biggerIdx].y = newY;
      blobs.splice(smallerIdx, 1);
      selected = biggerIdx > smallerIdx ? biggerIdx - 1 : biggerIdx;
      game.audio.play('se_tap', 0.5);
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
    if (popAnim > 0) popAnim -= dt * 3;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnBlob();
      nextSpawn = Math.max(0.8, 2.0 - merged * 0.08);
      // Check if too full
      if (blobs.length >= MAX_BLOBS && !done) {
        done = true;
        game.audio.play('se_failure', 0.6);
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Update blobs
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.wobble += b.wobbleSpeed * dt;
      b.vx *= Math.pow(0.97, dt * 60);
      b.vy *= Math.pow(0.97, dt * 60);
      // Bounce walls
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < 180) { b.y = 180 + b.r; b.vy = Math.abs(b.vy); }
      if (b.y + b.r > H * 0.94) { b.y = H * 0.94 - b.r; b.vy = -Math.abs(b.vy); }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Blob count warning
    var blobRatio = blobs.length / MAX_BLOBS;
    if (blobRatio > 0.7) {
      game.draw.rect(0, 0, W, H, C.danger, (blobRatio - 0.7) * 0.08);
    }

    // Blobs
    for (var i2 = 0; i2 < blobs.length; i2++) {
      var b2 = blobs[i2];
      var col = BLOB_COLORS[b2.colorIdx];
      var isSel = selected === i2;
      var wobX = Math.sin(b2.wobble) * b2.r * 0.08;
      var wobY = Math.cos(b2.wobble * 1.3) * b2.r * 0.08;

      // Glow for selected
      if (isSel) game.draw.circle(b2.x + wobX, b2.y + wobY, b2.r + 20, C.selected, 0.2 + Math.sin(elapsed * 6) * 0.1);

      // Body
      game.draw.circle(b2.x + wobX, b2.y + wobY, b2.r + 4, col, 0.2);
      game.draw.circle(b2.x + wobX, b2.y + wobY, b2.r, col, 0.9);
      game.draw.circle(b2.x + wobX - b2.r * 0.25, b2.y + wobY - b2.r * 0.25, b2.r * 0.3, '#ffffff', 0.25);

      if (isSel) {
        game.draw.circle(b2.x + wobX, b2.y + wobY, b2.r, C.selected, 0.3);
      }

      // Size indicator
      var sizeProgress = (b2.r - 44) / (110 - 44);
      if (sizeProgress > 0) {
        game.draw.circle(b2.x + wobX, b2.y + wobY, b2.r + 12, col, sizeProgress * 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 16 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, BLOB_COLORS[selected >= 0 && blobs[selected] ? blobs[selected].colorIdx : 0], flashAnim * 0.1);

    // Blob count bar
    game.draw.rect(80, H * 0.88, W - 160, 20, C.ui, 0.4);
    game.draw.rect(80, H * 0.88, (W - 160) * blobRatio, 20, blobRatio > 0.7 ? C.danger : '#5577aa', 0.9);
    game.draw.text('ブロブ: ' + blobs.length + '/' + MAX_BLOBS, W / 2, H * 0.88 + 52, { size: 36, color: blobRatio > 0.7 ? C.danger : C.text });

    game.draw.text(merged + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    for (var i = 0; i < 6; i++) spawnBlob();
  });
})(game);
