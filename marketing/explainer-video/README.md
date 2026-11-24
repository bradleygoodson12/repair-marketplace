# Repair Bee explainer video

A 2:36 animated explainer (1920×1080, 30 fps) covering the full workflow and who it helps:
the inspection-report problem → upload → send → compare quotes → schedule & pay directly →
benefits for agents, buyers and sellers → the contractor Pro List → call to action.

## Files

| File | What it's for |
|---|---|
| `voiceover-script.txt` | Paste straight into a voiceover/TTS tool (ElevenLabs, Murf, WellSaid, etc.). One paragraph per scene; numbers are spelled out so the voice reads them correctly. |
| `voiceover-script-timed.md` | The same script with a timecode on every line, plus tone direction, for a human voice actor or for checking pace. |
| `subtitles.srt` / `subtitles.vtt` | Caption files. Upload alongside the clean video on YouTube, Facebook, LinkedIn or Vimeo, or import into an editor. |
| `out/repair-bee-explainer-captioned.mp4` | Video with subtitles burned in (for Instagram, TikTok, autoplay feeds that play muted). |
| `out/repair-bee-explainer-clean.mp4` | Video without captions. Use this one when you upload the `.srt` separately or add your own captions. |
| `script.js` | **Source of truth** for the narration. Edit lines here. |
| `video.html` | The animation. Open `http://localhost:<port>/video.html?play` from a local server to preview in real time (`&t=60` to start at 1:00). |
| `build-timeline.js`, `render.js` | Build tools (see below). |

`out/` is git-ignored because the MP4s are large. Re-render them with the steps below.

## Adding the voiceover

1. Generate audio from `voiceover-script.txt` at a natural, friendly pace (~155 words/min,
   which is the default for most TTS voices).
2. In any editor (CapCut, Descript, Premiere, iMovie), drop the audio under the video starting
   at 0:00. Every line's on-screen visual starts at the timecode in `voiceover-script-timed.md`,
   so if one read runs long or short, nudge that clip to line up with its timecode.
3. Optional: add quiet background music at about −20 dB under the voice.

If the finished voiceover comes out noticeably faster or slower overall, change `WORDS_PER_SEC`
in `build-timeline.js` and re-render. Video, subtitles and timed script will all move together.

## Changing the words or numbers

The on-screen prices ($5/quote, $20/month) and the 5-pros-per-trade cap come from
`src/lib/pricing.ts` and `src/lib/capacity.ts` as of November 2026. If those change, update
`script.js` (text and `say`) and the matching numbers in `video.html`, then re-render.

## Re-rendering

Needs Node, Playwright with Chromium, and ffmpeg (with libass for burned-in captions).

```bash
node build-timeline.js          # script.js -> timeline.json, subtitles, voiceover scripts
node render.js                  # -> out/repair-bee-explainer-clean.mp4  (~4–5 min on 4 cores)
node render.js --stills 10,60   # quick PNG frames at given seconds, for checking a change
ffmpeg -i out/repair-bee-explainer-clean.mp4 \
  -vf "subtitles=subtitles.srt:force_style='FontName=Inter,Bold=1,FontSize=15,BackColour=&H99000000,OutlineColour=&H99000000,BorderStyle=4,Outline=6,Shadow=0,MarginV=14'" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart out/repair-bee-explainer-captioned.mp4
```
