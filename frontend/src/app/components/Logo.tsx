/**
 * Smart Fibre TT — Logo
 * Uses the brand image directly as logo with a styled container.
 */

interface LogoProps {
  size?: number;
  /** Border radius for the container (default 12) */
  radius?: number;
}

export function LogoIcon({ size = 40, radius = 12 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="Smart Fibre TT"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        display: 'block',
        borderRadius: radius,
        flexShrink: 0,
      }}
    />
  );
}

export default LogoIcon;
