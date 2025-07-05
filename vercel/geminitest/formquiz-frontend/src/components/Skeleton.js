import React from 'react';

const Skeleton = ({ width = '100%', height = 24, style = {}, count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          width,
          height,
          background: 'linear-gradient(90deg, #f3f3f3 25%, #ececec 50%, #f3f3f3 75%)',
          borderRadius: 8,
          margin: '8px 0',
          animation: 'skeleton-loading 1.2s infinite linear',
          ...style,
        }}
      />
    ))}
    <style>{`
      @keyframes skeleton-loading {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }
    `}</style>
  </>
);

export default Skeleton; 