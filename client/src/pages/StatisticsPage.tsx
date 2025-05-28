import { useState, useMemo } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, isSameDay, isSameWeek, isSameMonth } from "date-fns";
import { BarChart3, TrendingUp, Calendar, CheckCircle2, Clock } from "lucide-react";

type ViewType = "day" | "week" | "month";

interface ChartDataPoint {
  period: string;
  fullDate: Date;
  completed: number;
  label: string;
}

interface TimeblockingData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export default function StatisticsPage() {
  const { tasks } = useTaskContext();
  const [viewType, setViewType] = useState<ViewType>("week");

  // Filter completed tasks
  const completedTasks = useMemo(() => {
    return tasks.filter(task => task.completed_at).map(task => ({
      ...task,
      completedDate: parseISO(task.completed_at!)
    }));
  }, [tasks]);

  // Calculate timeblocking data
  const timeblockingData = useMemo(() => {
    const timeblocked = completedTasks.filter(task => task.start_time && task.end_time).length;
    const notTimeblocked = completedTasks.filter(task => !task.start_time || !task.end_time).length;
    const total = timeblocked + notTimeblocked;

    if (total === 0) {
      return [];
    }

    return [
      {
        name: "Timeblocked",
        value: timeblocked,
        percentage: Math.round((timeblocked / total) * 100),
        color: "hsl(var(--primary))"
      },
      {
        name: "Not Timeblocked",
        value: notTimeblocked,
        percentage: Math.round((notTimeblocked / total) * 100),
        color: "hsl(var(--muted))"
      }
    ] as TimeblockingData[];
  }, [completedTasks]);

  // Generate chart data based on view type
  const chartData = useMemo(() => {
    const now = new Date();
    let intervals: Date[] = [];
    let formatString = "";
    
    switch (viewType) {
      case "day":
        // Last 30 days
        const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        const endDay = now;
        intervals = eachDayOfInterval({ start: startDay, end: endDay });
        formatString = "MMM dd";
        break;
        
      case "week":
        // Last 12 weeks
        const startWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (12 * 7));
        const endWeek = now;
        intervals = eachWeekOfInterval({ start: startWeek, end: endWeek }, { weekStartsOn: 1 });
        formatString = "MMM dd";
        break;
        
      case "month":
        // Last 12 months
        const startMonth = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        const endMonth = now;
        intervals = eachMonthOfInterval({ start: startMonth, end: endMonth });
        formatString = "MMM yyyy";
        break;
    }

    return intervals.map(interval => {
      let count = 0;
      let label = "";
      
      if (viewType === "day") {
        count = completedTasks.filter(task => 
          isSameDay(task.completedDate, interval)
        ).length;
        label = format(interval, formatString);
      } else if (viewType === "week") {
        const weekStart = startOfWeek(interval, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(interval, { weekStartsOn: 1 });
        count = completedTasks.filter(task => 
          isWithinInterval(task.completedDate, { start: weekStart, end: weekEnd })
        ).length;
        label = `${format(weekStart, "MMM dd")} - ${format(weekEnd, "dd")}`;
      } else if (viewType === "month") {
        const monthStart = startOfMonth(interval);
        const monthEnd = endOfMonth(interval);
        count = completedTasks.filter(task => 
          isWithinInterval(task.completedDate, { start: monthStart, end: monthEnd })
        ).length;
        label = format(interval, formatString);
      }

      return {
        period: format(interval, formatString),
        fullDate: interval,
        completed: count,
        label
      } as ChartDataPoint;
    });
  }, [completedTasks, viewType]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalCompleted = completedTasks.length;
    const currentPeriodCount = chartData[chartData.length - 1]?.completed || 0;
    const previousPeriodCount = chartData[chartData.length - 2]?.completed || 0;
    const percentChange = previousPeriodCount > 0 ? 
      ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100 : 0;
    
    const average = chartData.length > 0 ? 
      chartData.reduce((sum, data) => sum + data.completed, 0) / chartData.length : 0;

    return {
      totalCompleted,
      currentPeriodCount,
      percentChange,
      average: Math.round(average * 10) / 10
    };
  }, [chartData, completedTasks]);

  const chartConfig = {
    completed: {
      label: "Completed Tasks",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Statistics</h1>
            <p className="text-muted-foreground">Track your productivity and task completion trends</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current {viewType === "day" ? "Day" : viewType === "week" ? "Week" : "Month"}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentPeriodCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.percentChange > 0 ? "+" : ""}{stats.percentChange.toFixed(1)}% from last period
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per {viewType === "day" ? "Day" : viewType === "week" ? "Week" : "Month"}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average}</div>
              <p className="text-xs text-muted-foreground">Based on selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peak {viewType === "day" ? "Day" : viewType === "week" ? "Week" : "Month"}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.max(...chartData.map(d => d.completed), 0)}</div>
              <p className="text-xs text-muted-foreground">Highest completion count</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart - Takes 2/3 width */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-2 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                  <div>
                    <CardTitle className="text-lg">Completed Tasks Over Time</CardTitle>
                    <CardDescription>
                      Your task completion trends {viewType === "day" ? "over the last 30 days" : 
                        viewType === "week" ? "over the last 12 weeks" : "over the last 12 months"}
                    </CardDescription>
                  </div>
                  
                  <Tabs value={viewType} onValueChange={(value) => setViewType(value as ViewType)}>
                    <TabsList>
                      <TabsTrigger value="day">Daily</TabsTrigger>
                      <TabsTrigger value="week">Weekly</TabsTrigger>
                      <TabsTrigger value="month">Monthly</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                      angle={viewType === "day" ? -45 : 0}
                      textAnchor={viewType === "day" ? "end" : "middle"}
                      height={viewType === "day" ? 80 : 60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip 
                      content={<ChartTooltipContent 
                        formatter={(value, name) => [
                          `${value} task${value !== 1 ? 's' : ''}`,
                          'Completed'
                        ]}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return payload[0].payload.label;
                          }
                          return label;
                        }}
                      />} 
                    />
                    <Bar 
                      dataKey="completed" 
                      fill="var(--color-completed)" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Timeblocking Pie Chart - Takes 1/3 width */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Timeblocking Habits</CardTitle>
                    <CardDescription>How often do you timeblock?</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {timeblockingData.length > 0 ? (
                  <div className="space-y-4">
                    <ChartContainer 
                      config={{
                        timeblocked: {
                          label: "Timeblocked",
                          color: "hsl(var(--primary))",
                        },
                        notTimeblocked: {
                          label: "Not Timeblocked", 
                          color: "hsl(var(--muted))",
                        },
                      }} 
                      className="h-[200px] w-full"
                    >
                      <PieChart>
                        <Pie
                          data={timeblockingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {timeblockingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={<ChartTooltipContent 
                            formatter={(value, name) => [
                              `${value} task${value !== 1 ? 's' : ''} (${timeblockingData.find(d => d.name === name)?.percentage}%)`,
                              name
                            ]}
                          />} 
                        />
                      </PieChart>
                    </ChartContainer>
                    
                    {/* Legend */}
                    <div className="space-y-2">
                      {timeblockingData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-muted-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-medium">{item.value}</span>
                            <span className="text-muted-foreground">({item.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <div className="text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No completed tasks yet</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completion Trend</CardTitle>
            <CardDescription>Trend line showing your productivity pattern</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tick={{ fontSize: 12 }}
                  angle={viewType === "day" ? -45 : 0}
                  textAnchor={viewType === "day" ? "end" : "middle"}
                  height={viewType === "day" ? 80 : 60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value, name) => [
                      `${value} task${value !== 1 ? 's' : ''}`,
                      'Completed'
                    ]}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.label;
                      }
                      return label;
                    }}
                  />} 
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="var(--color-completed)" 
                  strokeWidth={3}
                  dot={{ fill: "var(--color-completed)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 