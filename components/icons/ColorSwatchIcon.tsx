import React from 'react';

const ColorSwatchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <path d="M12 22s-2-4-2-8 2-8 2-8" />
        <path d="M20 22s-2-4-2-8 2-8 2-8" />
        <path d="M2 12h20" />
    </svg>
);

export default ColorSwatchIcon;
