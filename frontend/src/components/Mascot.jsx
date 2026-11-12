// Kei: the show's original guide character. Moods: idle, talk, shock, happy, sad.
export default function Mascot({ mood = "idle" }) {
  const eyes = {
    happy: (
      <g fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round">
        <path d="M37 70 q8 -10 16 0" />
        <path d="M67 70 q8 -10 16 0" />
      </g>
    ),
    shock: (
      <g stroke="#111" strokeWidth="3">
        <ellipse cx="45" cy="68" rx="9" ry="11" fill="#fff" />
        <ellipse cx="75" cy="68" rx="9" ry="11" fill="#fff" />
        <circle cx="45" cy="69" r="2.5" fill="#111" stroke="none" />
        <circle cx="75" cy="69" r="2.5" fill="#111" stroke="none" />
      </g>
    ),
    sad: (
      <g>
        <ellipse cx="45" cy="70" rx="8" ry="9" fill="#2b1a66" stroke="#111" strokeWidth="3" />
        <ellipse cx="75" cy="70" rx="8" ry="9" fill="#2b1a66" stroke="#111" strokeWidth="3" />
        <circle cx="42" cy="66" r="3" fill="#fff" />
        <circle cx="72" cy="66" r="3" fill="#fff" />
        <path d="M36 57 l16 5 M84 57 l-16 5" stroke="#111" strokeWidth="3" strokeLinecap="round" />
        <path d="M40 80 q-2 8 2 12 q4 -4 -2 -12z" fill="#3ee6ff" stroke="#111" strokeWidth="1.5" />
      </g>
    ),
  };
  const normalEyes = (
    <g>
      <ellipse cx="45" cy="68" rx="8.5" ry="12" fill="#2b1a66" stroke="#111" strokeWidth="3" />
      <ellipse cx="75" cy="68" rx="8.5" ry="12" fill="#2b1a66" stroke="#111" strokeWidth="3" />
      <ellipse cx="45" cy="72" rx="5" ry="6" fill="#7b5cff" />
      <ellipse cx="75" cy="72" rx="5" ry="6" fill="#7b5cff" />
      <circle cx="42" cy="63" r="3.6" fill="#fff" />
      <circle cx="72" cy="63" r="3.6" fill="#fff" />
      <circle cx="48" cy="74" r="1.6" fill="#fff" />
      <circle cx="78" cy="74" r="1.6" fill="#fff" />
    </g>
  );
  const mouth = {
    idle: <path d="M55 88 q5 4 10 0" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" />,
    talk: <ellipse cx="60" cy="89" rx="5" ry="4" fill="#c2185b" stroke="#111" strokeWidth="2.5" />,
    shock: <ellipse cx="60" cy="91" rx="5" ry="7" fill="#c2185b" stroke="#111" strokeWidth="2.5" />,
    happy: <path d="M50 85 q10 13 20 0 z" fill="#c2185b" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />,
    sad: <path d="M53 92 q7 -6 14 0" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" />,
  };

  return (
    <svg className={`mascot mood-${mood}`} viewBox="0 0 120 120" role="img" aria-label="Kei, the guide">
      {/* back hair */}
      <path d="M18 70 q-6 -50 42 -52 q48 2 42 52 l-6 30 h-72z" fill="#5a1fd1" stroke="#111" strokeWidth="3" />
      {/* face */}
      <ellipse cx="60" cy="70" rx="36" ry="34" fill="#ffe3c9" stroke="#111" strokeWidth="3" />
      {/* blush */}
      <ellipse cx="36" cy="82" rx="6" ry="3" fill="#ff8fb8" opacity="0.8" />
      <ellipse cx="84" cy="82" rx="6" ry="3" fill="#ff8fb8" opacity="0.8" />
      {/* bangs */}
      <path
        d="M22 62 q2 -38 38 -40 q36 2 38 40 l-10 -12 l-4 12 l-8 -16 l-6 14 l-10 -18 l-8 18 l-6 -14 l-8 16 l-4 -12z"
        fill="#7b2ff7"
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M40 30 q10 -6 22 -6" fill="none" stroke="#c9a7ff" strokeWidth="4" strokeLinecap="round" />
      {/* ahoge */}
      <path d="M60 22 q-4 -16 10 -18 q-10 6 -6 18z" fill="#7b2ff7" stroke="#111" strokeWidth="2.5" />
      {/* headband */}
      <path d="M24 46 q36 -16 72 0 l-2 7 q-34 -14 -68 0z" fill="#ff3b6b" stroke="#111" strokeWidth="2.5" />
      <path d="M96 48 l18 -6 l-6 10 l10 4 l-20 0z" fill="#ff3b6b" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
      {eyes[mood] || normalEyes}
      {mouth[mood] || mouth.idle}
      {mood === "shock" && (
        <g className="mascot-pop">
          <path d="M100 18 l4 16 l-8 0z" fill="#ffd23f" stroke="#111" strokeWidth="2" />
          <circle cx="100" cy="40" r="3" fill="#ffd23f" stroke="#111" strokeWidth="2" />
        </g>
      )}
      {mood === "happy" && (
        <g className="mascot-pop" fill="#ffd23f" stroke="#111" strokeWidth="1.5">
          <path d="M104 22 l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" />
          <path d="M14 26 l2 5 l5 1 l-4 3 l1 5 l-4 -2 l-4 2 l1 -5 l-4 -3 l5 -1z" />
        </g>
      )}
    </svg>
  );
}
