import React from 'react';

const EraserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
        <path d="M20.42 4.58a2.12 2.12 0 1 0-3-3L5.42 16.58a2.12 2.12 0 0 0 0 3l7 7a2.12 2.12 0 0 0 3 0l5-5a2.12 2.12 0 0 0 0-3l-5-5Z" />
        <path d="m14 8 6 6" />
        <path d="M5.42 16.58 11 22" />
        <path d="M2 11h4" />
        <path d="M2 16h4" />
    </svg>
);

export default EraserIcon;
