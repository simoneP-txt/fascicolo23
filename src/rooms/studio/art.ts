// Study drawings (mockup 06): over the sage wall and the desk that the host paints (tokens.css), the desk's
// front edge, its boards and grain, and the lamp on the left with its cone of light. The cone fades out
// before the bottom edge of the stage, so the bottom band carries on the bare desk with no seam. Then the red
// blot of the plate, the same half mirrored, with no figure in it (decision 8), and the check of a solved
// report.

export const STUDY = `<svg class="studio__art" viewBox="0 0 1920 1080" aria-hidden="true">
  <defs>
    <linearGradient id="studio-cone" gradientUnits="userSpaceOnUse" x1="0" y1="344" x2="0" y2="1080">
      <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.26"/>
      <stop offset="0.7" stop-color="var(--lamp)" stop-opacity="0.2"/>
      <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="584" width="1920" height="16" fill="var(--frame)"/>
  <path d="M0 696 H1920 M0 800 H1920 M0 904 H1920 M0 1008 H1920" fill="none" stroke="var(--frame)" stroke-width="2" opacity="0.18"/>
  <path d="M120 648 Q 320 632 520 648 M760 752 Q 1000 736 1240 752 M1440 856 Q 1640 840 1840 856 M240 960 Q 480 944 720 960"
    fill="none" stroke="var(--frame)" stroke-width="2" opacity="0.12"/>
  <path d="M344 376 L432 344 L1216 1080 L64 1080 Z" fill="url(#studio-cone)"/>
  <ellipse cx="216" cy="584" rx="80" ry="14" fill="var(--ink)"/>
  <path d="M216 576 L248 440 L336 336" fill="none" stroke="var(--ink)" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="248" cy="440" r="10" fill="var(--frame)"/>
  <path d="M296 304 L392 264 L432 344 L344 376 Z" fill="var(--ink)"/>
  <circle cx="392" cy="352" r="16" fill="var(--lamp)"/>
</svg>`;

// Half of the blot, drawn on the left of a 240 box and mirrored onto the right: the body down the fold and
// the drops thrown around it.
const HALF = `<path d="M120 36 C 104 40, 94 54, 98 72 C 76 56, 44 50, 30 74 C 18 96, 38 118, 64 114 C 44 130, 34 158, 54 176
    C 70 190, 92 180, 100 162 C 98 186, 106 204, 120 214 Z"/>
  <circle cx="36" cy="44" r="6"/><circle cx="16" cy="140" r="4"/><circle cx="64" cy="206" r="5"/>
  <circle cx="96" cy="22" r="3"/><circle cx="12" cy="98" r="3"/>`;

export const BLOT = `<svg class="studio__blot" viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
  <g fill="var(--red)">${HALF}</g>
  <g fill="var(--red)" transform="translate(240 0) scale(-1 1)">${HALF}</g>
  <ellipse cx="86" cy="94" rx="12" ry="6" fill="var(--paper)"/>
  <ellipse cx="154" cy="94" rx="12" ry="6" fill="var(--paper)"/>
  <ellipse cx="104" cy="144" rx="5" ry="10" fill="var(--paper)"/>
  <ellipse cx="136" cy="144" rx="5" ry="10" fill="var(--paper)"/>
</svg>`;

export const CHECK = `<svg class="studio__check" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
  <path d="M4 13 L10 19 L20 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
