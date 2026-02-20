// Universal Skeleton Loader for all UI elements
import React from "react";

export default function Skeleton({ width = '100%', height = 36, borderRadius = 4, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)',
        backgroundSize: '400% 100%',
        animation: 'skeleton-loading 1.2s ease-in-out infinite',
        borderRadius,
        width,
        height,
        marginBottom: 4,
        ...style,
      }}
    />
  );
}

// Add skeleton keyframes to the document (only once)
if (typeof window !== 'undefined' && !window.__skeleton_css) {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes skeleton-loading { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`;
  document.head.appendChild(style);
  window.__skeleton_css = true;
}
