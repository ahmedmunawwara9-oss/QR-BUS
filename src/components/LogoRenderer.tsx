/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoRendererProps {
  logo?: string;
  className?: string;
  fallbackText?: string;
}

export const LogoRenderer: React.FC<LogoRendererProps> = ({ 
  logo, 
  className = "w-12 h-12", 
  fallbackText = "درة" 
}) => {
  if (!logo || !logo.trim()) {
    return (
      <div className={`${className} bg-sky-900 text-white border border-sky-800 rounded-xl flex items-center justify-center text-center font-bold text-[10px] leading-tight select-none`}>
        {fallbackText}
      </div>
    );
  }

  const trimmed = logo.trim();

  // If it looks like raw SVG code
  if (trimmed.startsWith('<svg') || trimmed.includes('</svg>')) {
    return (
      <div 
        className={`${className} flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full`}
        dangerouslySetInnerHTML={{ __html: logo }}
      />
    );
  }

  // Otherwise, render as standard image tag
  return (
    <img 
      src={logo} 
      className={`${className} object-contain`} 
      alt="شعار الشركة" 
      referrerPolicy="no-referrer"
      onError={(e) => {
        // Fallback to text initials if load fails
        const target = e.target as HTMLImageElement;
        target.onerror = null;
        target.style.display = 'none';
        const parent = target.parentElement;
        if (parent) {
          const fallbackDiv = document.createElement('div');
          fallbackDiv.className = `${className} bg-sky-900 text-white border border-sky-800 rounded-xl flex items-center justify-center text-center font-bold text-[10px] leading-tight`;
          fallbackDiv.innerText = fallbackText;
          parent.appendChild(fallbackDiv);
        }
      }}
    />
  );
};
