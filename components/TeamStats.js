'use client';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TeamStats() {
    const data = {
        labels: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
        datasets: [
            {
                label: 'Výkon (kWp)',
                data: [120, 190, 300, 250, 200, 310, 280],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                tension: 0.4
            },
            {
                label: 'Hodiny',
                data: [8, 8.5, 9, 8, 7, 9, 6],
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.5)',
                tension: 0.4,
                yAxisID: 'y1',
            }
        ]
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                ticks: { color: '#94a3b8' },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                display: false
            },
            y1: {
                display: false,
                position: 'right'
            }
        },
        plugins: {
            legend: {
                labels: { color: '#e2e8f0' }
            }
        }
    };

    return <Line data={data} options={options} />;
}
