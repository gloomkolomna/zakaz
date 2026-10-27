interface LogoProps {
  size?: number;
}

export default function Logo({ size = 22 }: LogoProps) {
  return (
    <svg
      className="brand-logo"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M18.6 4.7 10.8 12.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <ellipse cx="18.1" cy="4.2" rx="0.85" ry="1.35" transform="rotate(-45 18.1 4.2)" stroke="currentColor" strokeWidth="1.05" />
      <path d="M17.6 4.9C16.2 2.4 13.2 2 11.7 3.6c-1.1 1.2-.8 3 .5 3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4.6 15.2 9.4 20M9.4 15.2 4.6 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
