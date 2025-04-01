import { useTaskContext } from "@/contexts/TaskContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import TaskGrid from "@/components/TaskGrid";

export default function Dashboard() {
  const { isLoading } = useTaskContext();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
      <Header />
      
      {/* Main Content */}
      <main className="flex-1 w-full mx-auto px-3 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col md:flex-row py-3 md:py-6">
          <Sidebar />
          <TaskGrid />
        </div>
      </main>
    </div>
  );
}
