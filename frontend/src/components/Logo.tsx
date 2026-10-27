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
      <path d="M19 4.4 9.6 13.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18.1" cy="5.3" r="0.55" fill="#F4F5F1" />
      <path d="M17.6 6.2C15.2 3.4 11.4 2.8 9 4.6 7 6.2 6.4 9 7.4 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
