import React from 'react';

const SECTIONS = [
  {
    title: 'If you think you\u2019ve spotted someone',
    items: [
      'Don\u2019t approach or confront anyone directly — your safety comes first.',
      'Note the exact location, time, and what they were wearing as precisely as you can.',
      'Use "Report a sighting" on that person\u2019s case page — it goes straight to the assigned police station.',
      'If they appear to be in immediate danger, call your local police station or 112 first, then file the sighting.',
    ],
  },
  {
    title: 'How a sighting report is handled',
    items: [
      'It\u2019s sent to the police station handling that case, and to any NGO active in that area.',
      'An officer reviews it and marks it verified or not — you can track this under "My Reports".',
      'A verified sighting appears on the family\u2019s case timeline automatically.',
    ],
  },
  {
    title: 'Reporting responsibly',
    items: [
      'Only report what you actually observed — avoid speculation or secondhand information presented as a sighting.',
      'A knowingly false report can lead to account suspension and is taken seriously, since it can misdirect an active search.',
      'If you\u2019re not sure it\u2019s a match, report it anyway with your uncertainty noted — officers can rule it out.',
    ],
  },
  {
    title: 'In an emergency',
    items: [
      'National emergency number: 112',
      'Women\u2019s helpline: 1091',
      'Child helpline: 1098',
      'If someone is in immediate danger, contact emergency services before using this platform.',
    ],
  },
];

export default function SafetyHelp() {
  return (
    <div>
      <h2>Safety &amp; Help</h2>
      <p className="muted">How to use this platform safely and effectively.</p>

      <div className="grid" style={{ gap: 16 }}>
        {SECTIONS.map((s) => (
          <div className="card" key={s.title}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>{s.title}</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.7 }}>
              {s.items.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
