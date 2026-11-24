// Turns script.js into:
//   timeline.json          — scene + cue timings the animation reads
//   subtitles.srt / .vtt   — caption files for YouTube, social, or an editor
//   voiceover-script.txt   — clean text to paste into a voiceover/TTS tool
//   voiceover-script-timed.md — same script with timecodes, for pacing a human read
//
// Timing assumes ~155 words per minute, the default pace of most TTS voices.
const fs = require('fs');
const path = require('path');
const scenes = require('./script.js');

const WORDS_PER_SEC = 2.6;
const CUE_GAP = 0.25;
const SCENE_LEAD = 0.6;
const SCENE_TAIL = 0.7;
const FINAL_TAIL = 3.5;

const words = (s) => s.replace(/[—…:]/g, ' ').split(/\s+/).filter(Boolean).length;

let t = 0;
let cueId = 0;
const out = { scenes: [], cues: [] };
scenes.forEach((scene, si) => {
  const start = t;
  t += si === 0 ? 1.0 : SCENE_LEAD;
  const cues = scene.lines.map((line) => {
    const spoken = line.say || line.text;
    const dur = Math.max(1.8, words(spoken) / WORDS_PER_SEC + 0.3);
    const cue = { id: cueId++, scene: scene.id, start: +t.toFixed(2), end: +(t + dur).toFixed(2), text: line.text, say: spoken };
    t += dur + CUE_GAP;
    return cue;
  });
  t += (si === scenes.length - 1 ? FINAL_TAIL : SCENE_TAIL) - CUE_GAP;
  out.scenes.push({ id: scene.id, title: scene.title, start: +start.toFixed(2), end: +t.toFixed(2), cues: cues.map((c) => c.id) });
  out.cues.push(...cues);
});
out.duration = +t.toFixed(2);

const pad = (n, w = 2) => String(n).padStart(w, '0');
const stamp = (s, sep) => {
  const ms = Math.round(s * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${pad(ms % 1000, 3)}`;
};
const mmss = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

// Break captions onto two balanced lines when they're long.
function wrap(text, max = 44) {
  if (text.length <= max) return text;
  const ws = text.split(' ');
  let best = null;
  for (let i = 1; i < ws.length; i++) {
    const a = ws.slice(0, i).join(' ');
    const b = ws.slice(i).join(' ');
    const score = Math.max(a.length, b.length);
    if (!best || score < best.score) best = { score, s: `${a}\n${b}` };
  }
  return best.s;
}

const dir = __dirname;
fs.writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify(out, null, 2));

fs.writeFileSync(
  path.join(dir, 'subtitles.srt'),
  out.cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${wrap(c.text)}\n`).join('\n'),
);
fs.writeFileSync(
  path.join(dir, 'subtitles.vtt'),
  'WEBVTT\n\n' + out.cues.map((c, i) => `${i + 1}\n${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${wrap(c.text)}\n`).join('\n'),
);

// Plain script: one paragraph per scene, blank line between — TTS tools read
// paragraph breaks as a natural pause.
fs.writeFileSync(
  path.join(dir, 'voiceover-script.txt'),
  out.scenes.map((s) => s.cues.map((id) => out.cues[id].say).join(' ')).join('\n\n') + '\n',
);

const totalWords = out.cues.reduce((n, c) => n + words(c.say), 0);
let md = `# Repair Bee explainer — voiceover script\n\n`;
md += `Runtime: **${mmss(out.duration)}** · ${totalWords} words · paced for ~155 words/minute (a calm, friendly read).\n\n`;
md += `Tone: warm, confident, conversational — a helpful neighbor, not a car-lot ad. Small smile in the voice. `;
md += `Brief pause at each scene break. Lean into "Meet Repair Bee" and the final tagline.\n\n`;
for (const s of out.scenes) {
  md += `## ${mmss(s.start)} — ${s.title}\n\n`;
  for (const id of s.cues) {
    const c = out.cues[id];
    md += `- \`${mmss(c.start)}\` ${c.say}\n`;
  }
  md += '\n';
}
fs.writeFileSync(path.join(dir, 'voiceover-script-timed.md'), md);

console.log(`duration ${out.duration}s, ${out.cues.length} cues, ${totalWords} words`);
