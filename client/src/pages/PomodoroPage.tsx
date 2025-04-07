import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  PlayCircle, 
  PauseCircle, 
  RotateCcw, 
  TimerReset, 
  Settings, 
  List, 
  Trees, 
  PalmtreeIcon, 
  Flower2 
} from "lucide-react";
import type { Task, PomodoroSession, ForestTree } from "@shared/schema";

const userId = 1; // For demo, hardcoded user ID

export default function PomodoroPage() {
  // Timer states
  const [mode, setMode] = useState<"pomodoro" | "shortBreak" | "longBreak">("pomodoro");
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60); // in seconds
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<PomodoroSession | null>(null);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState<number>(0);

  // Timer settings
  const [settings, setSettings] = useState({
    pomodoroTime: 25, // in minutes
    shortBreakTime: 5, // in minutes
    longBreakTime: 15, // in minutes
    autoStartBreaks: true,
    autoStartPomodoros: false,
    longBreakInterval: 4, // every 4 pomodoros
  });

  // UI states
  const [activeTab, setActiveTab] = useState<string>("timer");
  const { toast } = useToast();

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get timer duration based on mode
  const getTimerDuration = (): number => {
    switch (mode) {
      case "pomodoro":
        return settings.pomodoroTime * 60;
      case "shortBreak":
        return settings.shortBreakTime * 60;
      case "longBreak":
        return settings.longBreakTime * 60;
      default:
        return 25 * 60;
    }
  };

  // Get progress percentage
  const getProgress = (): number => {
    const duration = getTimerDuration();
    return ((duration - timeLeft) / duration) * 100;
  };

  // Fetch tasks
  const { data: tasks = [] as Task[] } = useQuery<Task[]>({
    queryKey: ['/api/tasks'],
  });

  // Fetch user's completed pomodoro sessions
  const { data: userSessions = [] as PomodoroSession[] } = useQuery<PomodoroSession[]>({
    queryKey: ['/api/users', userId, 'pomodoro-sessions'],
    queryFn: () => apiRequest<PomodoroSession[]>(`/api/users/${userId}/pomodoro-sessions`),
  });

  // Fetch user's forest trees
  const { data: forestTrees = [] as ForestTree[] } = useQuery<ForestTree[]>({
    queryKey: ['/api/users', userId, 'forest-trees'],
    queryFn: () => apiRequest<ForestTree[]>(`/api/users/${userId}/forest-trees`),
  });

  // Create pomodoro session mutation
  const createSessionMutation = useMutation({
    mutationFn: (session: any) => apiRequest<PomodoroSession>('/api/pomodoro-sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'pomodoro-sessions'] });
    },
  });

  // Update pomodoro session mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => apiRequest<PomodoroSession>(`/api/pomodoro-sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'pomodoro-sessions'] });
    },
  });

  // Create forest tree mutation
  const createTreeMutation = useMutation({
    mutationFn: (tree: any) => apiRequest<ForestTree>('/api/forest-trees', {
      method: 'POST',
      body: JSON.stringify(tree),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'forest-trees'] });
      toast({
        title: "🌲 New tree planted!",
        description: "You've grown a new tree in your forest.",
      });
    },
  });

  // Start the timer
  const startTimer = async () => {
    if (mode === "pomodoro" && !currentSession) {
      // Start a new pomodoro session
      const session = {
        userId,
        taskId: selectedTask,
        duration: settings.pomodoroTime,
        status: "in-progress",
        startTime: new Date().toISOString(),
      };

      try {
        const result = await createSessionMutation.mutateAsync(session);
        setCurrentSession(result as PomodoroSession);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start session. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsRunning(true);
  };

  // Pause the timer
  const pauseTimer = () => {
    setIsRunning(false);
  };

  // Reset the timer
  const resetTimer = async () => {
    setIsRunning(false);
    setTimeLeft(getTimerDuration());
    
    // If we're resetting a pomodoro session that's in progress, mark it as abandoned
    if (mode === "pomodoro" && currentSession && currentSession.status === "in-progress") {
      try {
        await updateSessionMutation.mutateAsync({
          id: currentSession.id,
          data: {
            status: "abandoned",
            endTime: new Date().toISOString(),
          }
        });
        setCurrentSession(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reset session. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Skip to the next mode
  const skipToNext = async () => {
    if (mode === "pomodoro" && currentSession) {
      // If skipping a pomodoro, mark it as abandoned
      try {
        await updateSessionMutation.mutateAsync({
          id: currentSession.id,
          data: {
            status: "abandoned",
            endTime: new Date().toISOString(),
          }
        });
        setCurrentSession(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to skip session. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Move to the next mode
    switch (mode) {
      case "pomodoro":
        if (completedPomodoros % settings.longBreakInterval === settings.longBreakInterval - 1) {
          setMode("longBreak");
        } else {
          setMode("shortBreak");
        }
        break;
      case "shortBreak":
      case "longBreak":
        setMode("pomodoro");
        break;
    }

    setIsRunning(false);
  };

  // Handle timer completion
  const completeTimer = async () => {
    if (mode === "pomodoro" && currentSession) {
      // Complete the pomodoro session
      try {
        const updatedSession = await updateSessionMutation.mutateAsync({
          id: currentSession.id,
          data: {
            status: "completed",
            endTime: new Date().toISOString(),
          }
        }) as PomodoroSession;
        
        // Plant a tree for completed pomodoro
        await createTreeMutation.mutateAsync({
          userId,
          pomodoroSessionId: updatedSession.id,
          treeType: ["oak", "pine", "cherry", "maple"][Math.floor(Math.random() * 4)],
          growthStage: 100,
          plantedAt: new Date().toISOString(),
        });
        
        setCurrentSession(null);
        setCompletedPomodoros(prev => prev + 1);
        
        // Show success message
        toast({
          title: "🎉 Pomodoro completed!",
          description: "Time to take a break.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to complete session. Please try again.",
          variant: "destructive",
        });
      }
    }

    // Move to the next mode
    if (mode === "pomodoro") {
      // After pomodoro, go to break
      const nextMode = completedPomodoros % settings.longBreakInterval === settings.longBreakInterval - 1 
        ? "longBreak" 
        : "shortBreak";
      setMode(nextMode);
      
      // Auto-start break if enabled
      if (settings.autoStartBreaks) {
        setTimeout(() => setIsRunning(true), 500);
      }
    } else {
      // After break, go back to pomodoro
      setMode("pomodoro");
      
      // Auto-start pomodoro if enabled
      if (settings.autoStartPomodoros) {
        setTimeout(() => startTimer(), 500);
      }
    }
  };

  // Update time left when mode changes
  useEffect(() => {
    setTimeLeft(getTimerDuration());
  }, [mode, settings.pomodoroTime, settings.shortBreakTime, settings.longBreakTime]);

  // Timer effect
  useEffect(() => {
    let interval: number | undefined;
    
    if (isRunning && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      completeTimer();
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Set document title for notifications
  useEffect(() => {
    document.title = isRunning 
      ? `(${formatTime(timeLeft)}) ${mode === "pomodoro" ? "Focus" : "Break"} - Pomodoro Timer` 
      : "Pomodoro Forest";
    
    return () => {
      document.title = "Pomodoro Forest";
    };
  }, [timeLeft, isRunning, mode]);

  // Update completed pomodoros count when sessions are loaded
  useEffect(() => {
    if (userSessions) {
      const completed = userSessions.filter(session => session.status === "completed").length;
      setCompletedPomodoros(completed);
    }
  }, [userSessions]);

  // Get filtered tasks (only show "next" and "inbox" tasks)
  const filteredTasks = tasks.filter((task: Task) => 
    task.status === "next" || task.status === "inbox"
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-gray-800">
      <div className="container mx-auto py-8 flex-1">
        <h1 className="text-3xl font-bold mb-6">Pomodoro Forest</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Tabs defaultValue="timer" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 grid grid-cols-3">
                <TabsTrigger value="timer">
                  <Clock className="h-4 w-4 mr-2" />
                  Timer
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="forest">
                  <Trees className="h-4 w-4 mr-2" />
                  My Forest
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="timer" className="space-y-4">
                <Card>
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">
                      {mode === "pomodoro" ? "Focus Time" : mode === "shortBreak" ? "Short Break" : "Long Break"}
                    </CardTitle>
                    <CardDescription>
                      {mode === "pomodoro" 
                        ? "Stay focused on your task" 
                        : "Take a break and relax"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <h1 className="text-6xl font-bold font-mono tracking-widest">
                        {formatTime(timeLeft)}
                      </h1>
                    </div>
                    
                    <Progress value={getProgress()} className="h-2 w-full" />
                    
                    {mode === "pomodoro" && (
                      <div className="space-y-2">
                        <Label htmlFor="task-select">Working on</Label>
                        <Select 
                          value={selectedTask?.toString() || "0"} 
                          onValueChange={(value) => setSelectedTask(value !== "0" ? parseInt(value) : null)}
                          disabled={isRunning || !!currentSession}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a task (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No specific task</SelectItem>
                            {filteredTasks.map((task: Task) => (
                              <SelectItem key={task.id} value={task.id.toString()}>
                                {task.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-center gap-2 flex-wrap">
                    {!isRunning ? (
                      <Button onClick={startTimer} size="lg" className="gap-2">
                        <PlayCircle className="h-5 w-5" />
                        Start
                      </Button>
                    ) : (
                      <Button onClick={pauseTimer} size="lg" variant="secondary" className="gap-2">
                        <PauseCircle className="h-5 w-5" />
                        Pause
                      </Button>
                    )}
                    
                    <Button onClick={resetTimer} variant="outline" size="lg" className="gap-2">
                      <RotateCcw className="h-5 w-5" />
                      Reset
                    </Button>
                    
                    <Button onClick={skipToNext} variant="outline" size="lg" className="gap-2">
                      <TimerReset className="h-5 w-5" />
                      Skip
                    </Button>
                  </CardFooter>
                </Card>
                
                <div className="grid grid-cols-3 gap-4">
                  <Card className={cn("cursor-pointer", mode === "pomodoro" ? "border-primary bg-primary/10" : "")}
                    onClick={() => {
                      if (!isRunning) {
                        setMode("pomodoro");
                      }
                    }}
                  >
                    <CardHeader className="text-center p-4">
                      <CardTitle className="text-xl">Pomodoro</CardTitle>
                      <CardDescription>{settings.pomodoroTime} min</CardDescription>
                    </CardHeader>
                  </Card>
                  
                  <Card className={cn("cursor-pointer", mode === "shortBreak" ? "border-primary bg-primary/10" : "")}
                    onClick={() => {
                      if (!isRunning) {
                        setMode("shortBreak");
                      }
                    }}
                  >
                    <CardHeader className="text-center p-4">
                      <CardTitle className="text-xl">Short Break</CardTitle>
                      <CardDescription>{settings.shortBreakTime} min</CardDescription>
                    </CardHeader>
                  </Card>
                  
                  <Card className={cn("cursor-pointer", mode === "longBreak" ? "border-primary bg-primary/10" : "")}
                    onClick={() => {
                      if (!isRunning) {
                        setMode("longBreak");
                      }
                    }}
                  >
                    <CardHeader className="text-center p-4">
                      <CardTitle className="text-xl">Long Break</CardTitle>
                      <CardDescription>{settings.longBreakTime} min</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Session Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-muted-foreground text-sm">Completed</p>
                        <p className="text-2xl font-bold">{completedPomodoros}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Trees</p>
                        <p className="text-2xl font-bold">{forestTrees?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Today's Focus</p>
                        <p className="text-2xl font-bold">
                          {userSessions
                            ? Math.round(userSessions
                                .filter(s => s.status === "completed" && new Date(s.startTime).toDateString() === new Date().toDateString())
                                .reduce((acc, s) => acc + s.duration, 0))
                            : 0} min
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Timer Settings</CardTitle>
                    <CardDescription>Customize your pomodoro timer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="pomodoro-time">Pomodoro Length (minutes)</Label>
                      <Select 
                        value={settings.pomodoroTime.toString()} 
                        onValueChange={(value) => setSettings(prev => ({ ...prev, pomodoroTime: parseInt(value) }))}
                        disabled={isRunning}
                      >
                        <SelectTrigger id="pomodoro-time">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(value => (
                            <SelectItem key={value} value={value.toString()}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="short-break-time">Short Break Length (minutes)</Label>
                      <Select 
                        value={settings.shortBreakTime.toString()} 
                        onValueChange={(value) => setSettings(prev => ({ ...prev, shortBreakTime: parseInt(value) }))}
                        disabled={isRunning}
                      >
                        <SelectTrigger id="short-break-time">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                            <SelectItem key={value} value={value.toString()}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="long-break-time">Long Break Length (minutes)</Label>
                      <Select 
                        value={settings.longBreakTime.toString()} 
                        onValueChange={(value) => setSettings(prev => ({ ...prev, longBreakTime: parseInt(value) }))}
                        disabled={isRunning}
                      >
                        <SelectTrigger id="long-break-time">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 15, 20, 25, 30].map(value => (
                            <SelectItem key={value} value={value.toString()}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="long-break-interval">Long Break Interval (pomodoros)</Label>
                      <Select 
                        value={settings.longBreakInterval.toString()} 
                        onValueChange={(value) => setSettings(prev => ({ ...prev, longBreakInterval: parseInt(value) }))}
                      >
                        <SelectTrigger id="long-break-interval">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2, 3, 4, 5, 6].map(value => (
                            <SelectItem key={value} value={value.toString()}>{value}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-start-breaks">Auto-start Breaks</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically start breaks after completing a pomodoro
                        </p>
                      </div>
                      <Switch 
                        id="auto-start-breaks"
                        checked={settings.autoStartBreaks}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, autoStartBreaks: checked }))
                        }
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-start-pomodoros">Auto-start Pomodoros</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically start pomodoros after completing a break
                        </p>
                      </div>
                      <Switch 
                        id="auto-start-pomodoros"
                        checked={settings.autoStartPomodoros}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, autoStartPomodoros: checked }))
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="forest">
                <Card>
                  <CardHeader>
                    <CardTitle>Your Forest</CardTitle>
                    <CardDescription>
                      {forestTrees?.length 
                        ? `You've grown ${forestTrees.length} trees in your forest.`
                        : "Complete pomodoros to grow trees in your forest."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {forestTrees?.length === 0 ? (
                      <div className="text-center py-8">
                        <Trees className="h-16 w-16 mx-auto text-muted-foreground opacity-20" />
                        <p className="mt-4 text-muted-foreground">Your forest is empty. Complete pomodoros to plant trees!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {forestTrees?.map((tree) => (
                          <div key={tree.id} className="text-center group">
                            <div className="bg-primary/5 aspect-square rounded-md flex items-center justify-center p-2 group-hover:bg-primary/10 transition-colors">
                              {tree.treeType === "oak" && <Trees className="h-10 w-10 text-primary" />}
                              {tree.treeType === "pine" && <PalmtreeIcon className="h-10 w-10 text-green-600" />}
                              {tree.treeType === "cherry" && <Flower2 className="h-10 w-10 text-pink-500" />}
                              {tree.treeType === "maple" && <Trees className="h-10 w-10 text-orange-500" />}
                            </div>
                            <p className="text-xs mt-1 capitalize">{tree.treeType}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(tree.plantedAt).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Task List</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1">
                    <List className="h-4 w-4" />
                    All Tasks
                  </Button>
                </div>
                <CardDescription>Select a task to work on</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">No tasks found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTasks.map((task: Task) => (
                      <div 
                        key={task.id}
                        className={cn(
                          "p-3 rounded-lg border flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors",
                          selectedTask === task.id ? "border-primary bg-primary/10" : "border-border"
                        )}
                        onClick={() => !isRunning && !currentSession && setSelectedTask(task.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{task.title}</h3>
                        </div>
                        {task.time && (
                          <span className="text-sm text-muted-foreground flex items-center ml-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {task.time} min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}