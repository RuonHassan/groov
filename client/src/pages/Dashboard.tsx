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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row py-6">
          <Sidebar />
          <TaskGrid />
        </div>
      </main>
    </div>
  );
}
