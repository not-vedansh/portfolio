(() => {
  const button = document.querySelector("#watch-trailer");
  const video = document.querySelector("#phantom-trailer");
  const status = document.querySelector("#trailer-status");
  const manifest = "https://video.fastly.steamstatic.com/store_trailers/4607190/1789646200/73b8ef7fbb45031bc1df77d1fba8439849fbb004/1779606033/dash_av1.mpd?t=1779618847";
  const steam = "https://store.steampowered.com/app/4607190/Phantom_Echoes_Chapter_I/";
  let loading;
  let player;

  function unavailable() {
    clearTimeout(loading);
    if (player) player.reset();
    status.replaceChildren("This browser could not load the Steam stream. ");
    const link = document.createElement("a");
    link.href = steam;
    link.textContent = "Watch on Steam ↗";
    status.append(link);
    button.hidden = true;
  }

  button.addEventListener("click", () => {
    button.disabled = true;
    button.textContent = "Loading trailer…";
    const script = document.createElement("script");
    script.src = "https://cdn.dashjs.org/v4.7.4/dash.all.min.js";
    script.onerror = unavailable;
    script.onload = () => {
      try {
        player = window.dashjs.MediaPlayer().create();
        player.on(window.dashjs.MediaPlayer.events.ERROR, unavailable);
        player.initialize(video, manifest, false);
      } catch { unavailable(); }
    };
    loading = setTimeout(unavailable, 15000);
    video.addEventListener("canplay", () => {
      clearTimeout(loading);
      button.hidden = true;
      video.play().catch(() => video.focus());
    }, { once: true });
    document.head.append(script);
  }, { once: true });
})();
