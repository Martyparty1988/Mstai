'use client';
import { useRef, useEffect } from 'react';

export default function CanvasMap({ tables, onTableClick }) {
    const canvasRef = useRef(null);

    // Constants
    const TABLE_RADIUS = 10;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !tables) return;
        const ctx = canvas.getContext('2d');

        // Simple responsive resize logic
        const resizeObserver = new ResizeObserver(() => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 400; // Fixed height
            draw();
        });
        resizeObserver.observe(canvas.parentElement);

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            tables.forEach(table => {
                // Map table coordinates to canvas space (assuming 0-1000 range in DB, scale to actual canvas)
                // For simplicity, we use raw values wrap-around if too large, or scale fit
                // Here assuming raw x,y fits in 800x600 approximately

                const x = table.x; // Simplified
                const y = table.y;

                // Color based on status
                let color = '#94a3b8'; // pending (gray)
                if (table.status === 'completed') color = '#22c55e'; // green
                if (table.status === 'issue') color = '#ef4444'; // red

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, TABLE_RADIUS, 0, Math.PI * 2);
                ctx.fill();

                // Glow if completed
                if (table.status === 'completed') {
                    ctx.shadowColor = '#22c55e';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.shadowBlur = 0;
                }
            });
        };

        draw();

        return () => resizeObserver.disconnect();
    }, [tables]);

    const handleClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Find clicked table
        const clickedTable = tables.find(t => {
            const tx = t.x;
            const ty = t.y;
            const dist = Math.sqrt((x - tx) ** 2 + (y - ty) ** 2);
            return dist < TABLE_RADIUS + 5; // Hitbox padding
        });

        if (clickedTable) {
            onTableClick(clickedTable);
        }
    };

    return (
        <canvas
            ref={canvasRef}
            onClick={handleClick}
            style={{
                width: '100%',
                height: '400px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer'
            }}
        />
    );
}
