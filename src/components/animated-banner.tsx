
'use client';
import './animated-banner.css';

interface AnimatedBannerProps {
  color?: string[];
  videoUrl?: string;
}

export function AnimatedBanner({ color, videoUrl }: AnimatedBannerProps) {
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        autoPlay
        loop
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  }

  const gradientStyle = color
    ? { background: `linear-gradient(to top, ${color[0]}, ${color[1]})` }
    : {}; // Empty object uses the default from CSS

  return <div className="animated-banner-container" style={gradientStyle}></div>;
}
