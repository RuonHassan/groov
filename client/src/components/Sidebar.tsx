import { cn } from "@/lib/utils";
import { useTaskContext } from "@/contexts/TaskContext";
import { useState } from "react";
import { 
  List, 
  Inbox, 
  ArrowRight, 
  Clock, 
  Archive, 
  Sparkles,
  Filter,
  X,
  Timer,
  CalendarDays
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Sidebar() {
  const [location] = useLocation();
  const { 
    currentView, 
    setCurrentView, 
    currentContext, 
    setCurrentContext,
    energyFilter,
    setEnergyFilter 
  } = useTaskContext();
  
  // Function to handle filter selection and close mobile sidebar
  const handleFilterSelect = (filterType: string, value: string) => {
    if (filterType === 'view') {
      setCurrentView(value);
    } else if (filterType === 'context') {
      setCurrentContext(value);
    } else if (filterType === 'energy') {
      setEnergyFilter(value);
    }
  };

  // Filter content to be used in both desktop and mobile views
  const FilterContent = () => (
    <div className="space-y-4">
      {/* View Filter */}
      <Accordion type="single" collapsible defaultValue="view" className="w-full">
        <AccordionItem value="view" className="border-none">
          <AccordionTrigger className="py-2 text-sm font-medium text-gray-700 hover:no-underline">
            View
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-1">
              <button 
                onClick={() => handleFilterSelect('view', 'all')} 
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
                onClick={() => handleFilterSelect('view', 'inbox')} 
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
                onClick={() => handleFilterSelect('view', 'next')} 
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
                onClick={() => handleFilterSelect('view', 'waiting')} 
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
                onClick={() => handleFilterSelect('view', 'project')} 
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
                onClick={() => handleFilterSelect('view', 'someday')} 
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Context Filter */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="context" className="border-none">
          <AccordionTrigger className="py-2 text-sm font-medium text-gray-700 hover:no-underline">
            Contexts
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-1">
              <button 
                onClick={() => handleFilterSelect('context', 'all')} 
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
                onClick={() => handleFilterSelect('context', 'work')} 
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
                onClick={() => handleFilterSelect('context', 'home')} 
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
                onClick={() => handleFilterSelect('context', 'errands')} 
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
                onClick={() => handleFilterSelect('context', 'calls')} 
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Energy Filter */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="energy" className="border-none">
          <AccordionTrigger className="py-2 text-sm font-medium text-gray-700 hover:no-underline">
            Energy
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-3">
            <div className="space-y-1">
              <button 
                onClick={() => handleFilterSelect('energy', 'all')} 
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
                onClick={() => handleFilterSelect('energy', 'high')} 
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
                onClick={() => handleFilterSelect('energy', 'medium')} 
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
                onClick={() => handleFilterSelect('energy', 'low')} 
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  // Mobile filter button
  const MobileFilterButton = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="md:hidden mb-4 flex items-center"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {(currentView !== 'all' || currentContext !== 'all' || energyFilter !== 'all') && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-primary text-white">
              {(currentView !== 'all' ? 1 : 0) + 
               (currentContext !== 'all' ? 1 : 0) + 
               (energyFilter !== 'all' ? 1 : 0)}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px]">
        <div className="py-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <FilterContent />
        </div>
      </SheetContent>
    </Sheet>
  );

  // Tools/App navigation section
  const ToolsNavigation = () => (
    <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
      <div className="px-4 py-5">
        <h2 className="text-lg font-medium text-gray-900">Tools</h2>
      </div>
      <div className="border-t border-gray-200 px-4 py-4">
        <div className="space-y-1">
          <Link href="/calendar">
            <div className={cn(
              "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
              location === "/calendar" 
                ? "bg-primary-50 text-primary-700" 
                : "text-gray-600 hover:bg-gray-50"
            )}>
              <CalendarDays className={cn(
                "mr-3 h-5 w-5",
                location === "/calendar" ? "text-primary-500" : "text-gray-400"
              )} />
              Calendar
            </div>
          </Link>
          
          <Link href="/pomodoro">
            <div className={cn(
              "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer",
              location === "/pomodoro" 
                ? "bg-primary-50 text-primary-700" 
                : "text-gray-600 hover:bg-gray-50"
            )}>
              <Timer className={cn(
                "mr-3 h-5 w-5",
                location === "/pomodoro" ? "text-primary-500" : "text-gray-400"
              )} />
              Pomodoro Forest
            </div>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile filters button */}
      <div className="md:hidden w-full mb-2">
        <MobileFilterButton />
      </div>
      
      {/* Desktop sidebar */}
      <aside className="hidden md:block md:w-64 md:mr-8 mb-6 md:mb-0">
        <nav className="space-y-1 sticky top-6">
          <ToolsNavigation />
          
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <div className="px-4 py-5">
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-4">
              <FilterContent />
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}
