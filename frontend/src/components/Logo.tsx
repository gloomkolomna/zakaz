interface LogoProps {
  size?: number;
}

export default function Logo({ size = 38 }: LogoProps) {
  return (
    <img
      className="brand-logo"
      src={`${import.meta.env.BASE_URL}logo.png`}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
