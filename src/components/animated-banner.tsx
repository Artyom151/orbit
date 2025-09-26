'use client';
import './animated-banner.css';

interface AnimatedBannerProps {
  color?: string[];
}

export function AnimatedBanner({ color }: AnimatedBannerProps) {
  const gradientStyle = color
    ? { background: `linear-gradient(to top, ${color[0]}, ${color[1]})` }
    : {};

  return <div className="animated-banner-container" style={gradientStyle}></div>;
}
