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
      <path d="M17.9 5 9.4 13.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <ellipse cx="17.4" cy="4.5" rx="1" ry="1.5" transform="rotate(-45 17.4 4.5)" stroke="currentColor" strokeWidth="1.15" />
      <path d="M16.7 5.9c-1.6-2.8-5.2-3.1-6.9-.8-1.1 1.6-.6 3.5 1 4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.4 14.6 9.4 18.6M9.4 14.6 5.4 18.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
