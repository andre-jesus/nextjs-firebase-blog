import { useState, useEffect } from 'react';

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  layout = 'responsive',
  quality = 75,
  priority = false,
  loading = 'lazy'
}) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Reset state when src changes
  useEffect(() => {
    setImgSrc(src);
    setIsLoading(true);
    setError(false);
  }, [src]);
  
  // Handle image loading
  const onLoad = () => {
    setIsLoading(false);
  };
  
  // Handle image error
  const onError = () => {
    setError(true);
    setIsLoading(false);
    
    // Use placeholder image on error
    setImgSrc('/placeholder-image.jpg');
  };
  
  // Add responsive sizing based on layout
  let imgStyle = {};
  let containerStyle = {};
  
  if (layout === 'responsive') {
    containerStyle = {
      position: 'relative',
      paddingBottom: height && width ? `${(height / width) * 100}%` : '56.25%' // Default to 16:9 aspect ratio
    };
    
    imgStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    };
  } else if (layout === 'fill') {
    containerStyle = {
      position: 'relative',
      width: '100%',
      height: '100%'
    };
    
    imgStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    };
  } else {
    // Fixed layout
    imgStyle = {
      width: width || 'auto',
      height: height || 'auto'
    };
  }
  
  return (
    <div
      className={`image-container ${className || ''} ${
        isLoading ? 'bg-gray-200 animate-pulse' : ''
      }`}
      style={containerStyle}
    >
      {/* Add blur-up effect with a very low-quality image */}
      {isLoading && layout !== 'fixed' && (
        <div
          className="absolute inset-0 bg-cover bg-center blur-sm"
          style={{
            backgroundImage: `url(${imgSrc}?w=20&q=10)`,
            filter: 'blur(10px)'
          }}
        />
      )}
      
      <img
        src={imgSrc}
        alt={alt || ''}
        width={width}
        height={height}
        loading={priority ? 'eager' : loading}
        onLoad={onLoad}
        onError={onError}
        style={imgStyle}
        className={`transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}