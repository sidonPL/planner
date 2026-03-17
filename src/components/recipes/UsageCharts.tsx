"use client";

import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Rejestracja komponentów Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface UsageChartsProps {
  dailyUsage: Record<string, number>;
  popularRecipes: Array<{ recipeName: string; count: number }>;
  popularIngredients: Array<{ name: string; count: number; totalQuantity: number }>;
  className?: string;
}

export function UsageCharts({
  dailyUsage,
  popularRecipes,
  popularIngredients,
  className,
}: UsageChartsProps) {
  // Wykres liniowy - Użycie w czasie
  const dailyData = Object.entries(dailyUsage)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30); // Ostatnie 30 dni

  const lineChartData = {
    labels: dailyData.map(([date]) => {
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: "Użyć dziennie",
        data: dailyData.map(([, count]) => count),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Trend użycia w czasie",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Wykres słupkowy - Najpopularniejsze przepisy
  const barChartData = {
    labels: popularRecipes.slice(0, 10).map((r) => r.recipeName),
    datasets: [
      {
        label: "Liczba użyć",
        data: popularRecipes.slice(0, 10).map((r) => r.count),
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)",
          "rgba(255, 159, 64, 0.7)",
          "rgba(199, 199, 199, 0.7)",
          "rgba(83, 102, 255, 0.7)",
          "rgba(255, 99, 255, 0.7)",
          "rgba(99, 255, 132, 0.7)",
        ],
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Top 10 przepisów",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Wykres kołowy - Rozkład składników
  const topIngredients = popularIngredients.slice(0, 5);
  const doughnutChartData = {
    labels: topIngredients.map((i) => i.name),
    datasets: [
      {
        label: "Użycia",
        data: topIngredients.map((i) => i.count),
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
      title: {
        display: true,
        text: "Top 5 składników",
      },
    },
  };

  if (dailyData.length === 0 && popularRecipes.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Wykres liniowy */}
      {dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aktywność w czasie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={lineChartData} options={lineOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wykres słupkowy */}
        {popularRecipes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Najpopularniejsze przepisy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Bar data={barChartData} options={barOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wykres kołowy */}
        {popularIngredients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Rozkład składników</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <Doughnut data={doughnutChartData} options={doughnutOptions} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

