// Single source of truth for the narration. Each scene's `lines` become
// voiceover lines AND subtitle cues; build-timeline.js turns them into
// timings that both the animation and the .srt/.vtt files use.
//
// Optional `say` overrides how a line is written in the voiceover script
// (e.g. spelling numbers out for TTS) while `text` stays what's on screen.

module.exports = [
  {
    id: 'hook',
    title: 'The inspection report',
    lines: [
      { text: 'You found the house. You made the offer.' },
      { text: 'Then the inspection report lands: forty pages, two dozen repairs…' },
      { text: '…and a closing date that isn’t going anywhere.', say: 'And a closing date that isn’t going anywhere.' },
    ],
  },
  {
    id: 'problem',
    title: 'The old way',
    lines: [
      { text: 'Now someone has to call a plumber, an electrician, a roofer — one by one.' },
      { text: 'Waiting on callbacks. Chasing estimates. Watching the deal stall.' },
    ],
  },
  {
    id: 'intro',
    title: 'Meet Repair Bee',
    lines: [
      { text: 'There’s a better way. Meet Repair Bee.' },
      { text: 'The fastest way to turn a repair list into real quotes from verified local pros.' },
    ],
  },
  {
    id: 'upload',
    title: 'Step 1 — Upload',
    lines: [
      { text: 'Step one: upload the inspection report or repair addendum.' },
      { text: 'Repair Bee reads it for you and breaks it into individual repairs —' },
      { text: 'each one matched to the right trade.' },
    ],
  },
  {
    id: 'send',
    title: 'Step 2 — Send',
    lines: [
      { text: 'Step two: review the list, make any tweaks, and hit send.' },
      { text: 'Every request goes out at once to verified pros near the property.' },
      { text: 'No phone tag. No repeat data entry.' },
    ],
  },
  {
    id: 'quotes',
    title: 'Step 3 — Compare quotes',
    lines: [
      { text: 'Step three: the quotes come to you.' },
      { text: 'Compare price and timing side by side, and message pros with questions.' },
      { text: 'Then accept the one you want.' },
    ],
  },
  {
    id: 'schedule',
    title: 'Step 4 — Schedule & finish',
    lines: [
      { text: 'Step four: schedule the work and follow progress right from your dashboard.' },
      { text: 'You pay the pro directly. Repair Bee never touches your money.' },
      { text: 'When the job’s done, leave a review.' },
    ],
  },
  {
    id: 'benefits',
    title: 'Who wins',
    lines: [
      { text: 'So who wins?' },
      { text: 'Real estate agents save hours on every transaction and keep deals on track to close.' },
      { text: 'Buyers get real repair numbers before closing, so they can negotiate with confidence.' },
      { text: 'And sellers knock out repairs fast, avoid surprise credits, and close on time.' },
    ],
  },
  {
    id: 'pros',
    title: 'For contractors — the Pro List',
    lines: [
      { text: 'And if you’re a contractor? This is your new pipeline.' },
      { text: 'Join the Repair Bee Pro List and see every lead near you — free.' },
      {
        text: 'You only pay when you send a quote: $5 a quote, or $20 a month for unlimited.',
        say: 'You only pay when you send a quote: five dollars a quote, or twenty dollars a month for unlimited.',
      },
      { text: 'No commissions. Customers pay you directly.' },
      {
        text: 'And each trade is capped at 5 pros per city, so you’re not one of 50 fighting for the same job.',
        say: 'And each trade is capped at five pros per city, so you’re not one of fifty fighting for the same job.',
      },
      { text: 'Just steady work from agents who close deals every single month.' },
    ],
  },
  {
    id: 'cta',
    title: 'Call to action',
    lines: [
      { text: 'Repair Bee. Your repair list, handled.' },
      { text: 'Upload a repair list, or join the Pro List today.' },
    ],
  },
];
