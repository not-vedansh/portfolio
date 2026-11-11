(() => {
  const game = document.querySelector("#elevator-game");
  const board = document.querySelector("#circuit-board");
  const time = document.querySelector("#elevator-time");
  const moveDisplay = document.querySelector("#elevator-moves");
  const status = document.querySelector("#elevator-status");
  const start = document.querySelector("#elevator-start");
  const practice = document.querySelector("#elevator-practice");
  const solution = [6, 10, 12, 9, 10, 3, 3, 12, 9];
  const scramble = [1, 1, 3, 2, 0, 1, 3, 2, 1];
  const directions = [
    { bit: 1, opposite: 4, row: -1, col: 0, name: "north" },
    { bit: 2, opposite: 8, row: 0, col: 1, name: "east" },
    { bit: 4, opposite: 1, row: 1, col: 0, name: "south" },
    { bit: 8, opposite: 2, row: 0, col: -1, name: "west" }
  ];
  const glyph = { 3: "└", 5: "│", 6: "┌", 9: "┘", 10: "─", 12: "┐" };
  const rotate = (mask) => ((mask << 1) | (mask >> 3)) & 15;
  const startTile = 3;
  const exitTile = 5;
  let tiles = [];
  let moves = 0;
  let phase = "idle";
  let deadline = null;
  let frame = 0;

  function trace(masks) {
    const reached = new Set();
    const queue = masks[startTile] & 8 ? [startTile] : [];
    for (const cell of queue) {
      if (reached.has(cell)) continue;
      reached.add(cell);
      for (const d of directions) {
        const row = Math.floor(cell / 3) + d.row;
        const col = cell % 3 + d.col;
        if (row < 0 || row > 2 || col < 0 || col > 2) continue;
        const neighbor = row * 3 + col;
        if ((masks[cell] & d.bit) && (masks[neighbor] & d.opposite)) queue.push(neighbor);
      }
    }
    return { reached, won: reached.has(exitTile) && Boolean(masks[exitTile] & 2) };
  }

  const cells = solution.map((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "junction";
    button.addEventListener("click", () => {
      if (phase !== "playing") return;
      if (deadline !== null && performance.now() >= deadline) return finish(false);
      tiles[i] = rotate(tiles[i]);
      moves++;
      if (paint().won) finish(true);
    });
    board.append(button);
    return button;
  });

  function paint() {
    const result = trace(tiles);
    cells.forEach((button, i) => {
      button.textContent = glyph[tiles[i]];
      button.classList.toggle("powered", result.reached.has(i) && phase !== "lost");
      button.disabled = phase !== "playing";
      const ports = directions.filter((d) => tiles[i] & d.bit).map((d) => d.name).join(" and ");
      button.setAttribute("aria-label", `Junction ${i + 1}: ${ports}`);
    });
    moveDisplay.textContent = String(moves);
    game.dataset.phase = phase;
    return result;
  }

  function finish(won) {
    cancelAnimationFrame(frame);
    phase = won ? "won" : "lost";
    if (!won) time.textContent = "0.0s";
    status.textContent = won ? `Power restored. Elevator doors open. ${moves} moves.` : "Backup power ran out. Start another run or practice without a timer.";
    start.textContent = "Play again · 30s";
    paint();
    start.focus();
  }

  function clock(now) {
    const remaining = Math.max(0, deadline - now);
    time.textContent = `${(remaining / 1000).toFixed(1)}s`;
    if (remaining === 0) finish(false);
    else frame = requestAnimationFrame(clock);
  }

  function reset(mode) {
    cancelAnimationFrame(frame);
    phase = mode === "idle" ? "idle" : "playing";
    moves = 0;
    tiles = solution.map((mask, i) => {
      for (let j = 0; j < scramble[i]; j++) mask = rotate(mask);
      return mask;
    });
    deadline = mode === "timed" ? performance.now() + 30000 : null;
    time.textContent = mode === "practice" ? "UNTIMED" : "30.0s";
    start.textContent = mode === "timed" ? "Restart · 30s" : "Start 30s challenge";
    status.textContent = phase === "idle" ? "Backup power is ready. Start when you are." : "Connect the lit path to the lift.";
    paint();
    if (deadline !== null) frame = requestAnimationFrame(clock);
    if (phase === "playing") cells[startTile].focus();
  }

  start.addEventListener("click", () => reset("timed"));
  practice.addEventListener("click", () => reset("practice"));
  game.addEventListener("close", () => cancelAnimationFrame(frame));
  window.openElevator = () => {
    reset("idle");
    game.showModal();
    start.focus();
  };
})();
