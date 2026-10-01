import React from 'react';

const paths = {
  home:
    'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',

  bot:
    'M12 3v3m-4 5h.01M16 11h.01M7 8h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3zM8 16h8',

  doctor:
    'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0M19 8v6m-3-3h6',

  calendar:
    'M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',

  chat:
    'M4 5h16v11H8l-4 4z',

  file:
    'M6 3h8l4 4v14H6zM14 3v5h5',

  bell:
    'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',

  settings:
    'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.7v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 7.76 15a1.7 1.7 0 0 0-1.56-1.03H6V11.3h.09A1.7 1.7 0 0 0 7.65 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.9-1.9.06.06A1.7 1.7 0 0 0 11.09 5.9 1.7 1.7 0 0 0 12.12 4.3h2.7v.09A1.7 1.7 0 0 0 15.85 5.9a1.7 1.7 0 0 0 1.88.34l.06-.06 1.9 1.9-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.85 11h.09v2.7h-.09A1.7 1.7 0 0 0 19.4 15z',
};

export default function Icon({ name, size = 19 }) {
  const path = paths[name] || paths.home;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}