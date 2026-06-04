import { Chart, registerables } from 'chart.js';
import { useEffect, useRef } from 'react';

// Register chart.js components
Chart.register(...registerables);

// Example 1: Line Chart
const LineChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Dataset',
            data,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          accessibility: {
            enabled: true
          }
        }
      });
    }
  }, [data, labels]);

  return <canvas ref={chartRef} className="w-full h-64" />;
};

// Example 2: Bar Chart
const BarChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      new Chart(chartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Sales',
            data,
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          accessibility: {
            enabled: true,
            description: 'Bar chart showing sales data',
            label: 'Sales by month'
          },
          plugins: {
            legend: {
              position: 'top' as const
            },
            title: {
              display: true,
              text: 'Monthly Sales'
            }
          }
        }
      });
    }
  }, [data, labels]);

  return <canvas ref={chartRef} className="w-full h-64" />;
};

// Example 3: Pie Chart
const PieChart = ({ data, labels }: { data: number[]; labels: string[] }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      new Chart(chartRef.current, {
        type: 'pie',
        data: {
          labels,
          datasets: [{
            label: 'Market Share',
            data,
            backgroundColor: [
              '#FF6384',
              '#36A2EB',
              '#FFCE56',
              '#4BC0C0',
              '#9966FF',
              '#FF9F40'
            ],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          accessibility: {
            enabled: true,
            description: 'Pie chart showing market share distribution',
            label: 'Market Share by Category'
          },
          plugins: {
            legend: {
              position: 'right' as const
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.parsed;
                  const sum = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                  const percentage = ((value / sum) * 100).toFixed(2) + '%';
                  return `${context.label}: ${value} (${percentage})`;
                }
              }
            }
          }
        }
      });
    }
  }, [data, labels]);

  return <canvas ref={chartRef} className="w-full h-64" />;
};

export { LineChart, BarChart, PieChart };