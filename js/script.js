<script>
    const music = document.getElementById('bg-music');

    // Try to play automatically
    music.play().catch(() => {
      console.log("Autoplay blocked — trying muted playback");
      music.muted = true;
      music.play();

      // Optional: unmute after 2 seconds (fade-in effect)
      setTimeout(() => {
        music.muted = false;
      }, 2000);
    });
  </script>