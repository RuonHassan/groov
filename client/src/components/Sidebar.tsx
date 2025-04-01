import { cn } from "@/lib/utils";
import { useTaskContext } from "@/contexts/TaskContext";
import { 
  List, 
  Inbox, 
  ArrowRight, 
  Clock, 
  Archive, 
  Sparkles
} from "lucide-react";

export default function Sidebar() {
  const { 
    currentView, 
    setCurrentView, 
    currentContext, 
    setCurrentContext,
    energyFilter,
    setEnergyFilter 
  } = useTaskContext();

  return (
    <aside className="w-full md:w-64 md:mr-8 mb-6 md:mb-0">
      <nav className="space-y-1 sticky top-6">
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="px-4 py-5">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-4 space-y-4">
            {/* View Filter */}
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-gray-700">View</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setCurrentView("all")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentView === "all" 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <List 
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentView === "all" ? "text-primary-500" : "text-gray-400"
                    )} 
                  />
                  All Tasks
                </button>
                <button 
                  onClick={() => setCurrentView("inbox")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentView === "inbox" 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Inbox 
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentView === "inbox" ? "text-primary-500" : "text-gray-400"
                    )} 
                  />
                  Inbox
                </button>
                <button 
                  onClick={() => setCurrentView("next")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentView === "next" 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <ArrowRight 
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentView === "next" ? "text-primary-500" : "text-gray-400"
                    )} 
                  />
                  Next Actions
                </button>
                <button 
                  onClick={() => setCurrentView("waiting")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentView === "waiting" 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Clock 
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentView === "waiting" ? "text-primary-500" : "text-gray-400"
                    )} 
                  />
                  Waiting For
                </button>
                <button 
                  onClick={() => setCurrentView("project")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentView === "project" 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Archive 
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentView === "project" ? "text-primary-500" : "text-gray-400"
                    )} 
                  />
                  Projects
                </button>
                <button 
                  onClick={() => setCurrentView("someday")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentView === "someday" 
                      ? "bg-primary-50 text-primary-700" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Sparkles 
                    className={cn(
                      "mr-3 h-5 w-5",
                      currentView === "someday" ? "text-primary-500" : "text-gray-400"
                    )} 
                  />
                  Someday/Maybe
                </button>
              </div>
            </div>

            {/* Context Filter */}
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-gray-700">Contexts</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setCurrentContext("all")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentContext === "all" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  All Contexts
                </button>
                <button 
                  onClick={() => setCurrentContext("work")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentContext === "work" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                  Work
                </button>
                <button 
                  onClick={() => setCurrentContext("home")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentContext === "home" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  Home
                </button>
                <button 
                  onClick={() => setCurrentContext("errands")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentContext === "errands" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-3"></span>
                  Errands
                </button>
                <button 
                  onClick={() => setCurrentContext("calls")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    currentContext === "calls" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Calls
                </button>
              </div>
            </div>

            {/* Energy Filter */}
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-gray-700">Energy</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setEnergyFilter("all")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    energyFilter === "all" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  All Levels
                </button>
                <button 
                  onClick={() => setEnergyFilter("high")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    energyFilter === "high" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="flex mr-3">
                    <span className="w-1 h-4 bg-primary-500 rounded-sm"></span>
                    <span className="w-1 h-4 bg-primary-500 rounded-sm ml-0.5"></span>
                    <span className="w-1 h-4 bg-primary-500 rounded-sm ml-0.5"></span>
                  </div>
                  High
                </button>
                <button 
                  onClick={() => setEnergyFilter("medium")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    energyFilter === "medium" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="flex mr-3">
                    <span className="w-1 h-4 bg-primary-500 rounded-sm"></span>
                    <span className="w-1 h-4 bg-primary-500 rounded-sm ml-0.5"></span>
                    <span className="w-1 h-4 bg-gray-200 rounded-sm ml-0.5"></span>
                  </div>
                  Medium
                </button>
                <button 
                  onClick={() => setEnergyFilter("low")} 
                  className={cn(
                    "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    energyFilter === "low" 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="flex mr-3">
                    <span className="w-1 h-4 bg-primary-500 rounded-sm"></span>
                    <span className="w-1 h-4 bg-gray-200 rounded-sm ml-0.5"></span>
                    <span className="w-1 h-4 bg-gray-200 rounded-sm ml-0.5"></span>
                  </div>
                  Low
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
