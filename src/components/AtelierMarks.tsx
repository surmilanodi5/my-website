import React from 'react';

interface MarkProps {
  className?: string;
}

export const NeedleMark: React.FC<MarkProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M19 5L5 19" />
    <ellipse cx="17.5" cy="6.5" rx="1.2" ry="2.2" transform="rotate(45 17.5 6.5)" />
    <path d="M16 8C11 9.5 14.5 15 9 16.5C5.5 17.4 4.5 20 4.5 20" />
  </svg>
);

export const NibMark: React.FC<MarkProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 3L19 14L15 20H9L5 14L12 3Z" />
    <path d="M12 3V12" />
    <circle cx="12" cy="13" r="1.2" />
  </svg>
);

export const SpoolMark: React.FC<MarkProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M6 5H18" />
    <path d="M6 19H18" />
    <path d="M8 5V19" />
    <path d="M16 5V19" />
    <path d="M8 9.5L16 11" />
    <path d="M8 13L16 14.5" />
  </svg>
);

export const FrameMark: React.FC<MarkProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3.5" y="5.5" width="17" height="13" rx="1" />
    <path d="M10 9.5L15 12L10 14.5V9.5Z" />
  </svg>
);

export const NodeThreadMark: React.FC<MarkProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="5.5" cy="7" r="2" />
    <circle cx="18.5" cy="7" r="2" />
    <circle cx="12" cy="17.5" r="2" />
    <path d="M7.5 7C10.5 7 11.5 11.5 12 15.5" />
    <path d="M16.5 7C13.5 7 12.5 11.5 12 15.5" />
  </svg>
);

export const MessageThreadMark: React.FC<MarkProps> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 6.5H20V16.5H9L5 19.5V16.5H4V6.5Z" />
    <path d="M8 10.5H16" />
    <path d="M8 13.5H13" />
  </svg>
);

export const ArrowRightMark: React.FC<MarkProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 10H16" />
    <path d="M11.5 5.5L16 10L11.5 14.5" />
  </svg>
);

export const CloseMark: React.FC<MarkProps> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 5L15 15" />
    <path d="M15 5L5 15" />
  </svg>
);
