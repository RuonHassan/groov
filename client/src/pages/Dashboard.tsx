import { useTaskContext } from "@/contexts/TaskContext";
import Header from "@/components/Header";
import TaskGrid from "@/components/TaskGrid";

export default function Dashboard() {
  const { isLoading } = useTaskContext();

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-800 font-sans">
      <Header />
      
      {/* Main Content */}
      <main className="flex-1 w-full">
        <TaskGrid />
      </main>
    </div>
  );
}
