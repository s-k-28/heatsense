// Remembers, for this app session only, that the welcome intro has played. A fresh session (a cold
// start, or reloading the page on web) plays it again; coming back to Welcome in the same session, or a
// rerender, shows the settled screen.
let played = false;

export function introPlayedThisSession() {
  return played;
}

export function markIntroPlayed() {
  played = true;
}
