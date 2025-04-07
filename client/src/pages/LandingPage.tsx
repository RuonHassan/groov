import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { List, CheckSquare, CalendarDays, Bell, Check } from "lucide-react";
import { Link, Redirect } from "wouter";
import LandingHeader from "@/components/LandingHeader";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const { session } = useAuth();

  if (session) {
    return <Redirect to="/app" />;
  }

  return (
    <div className="flex flex-col items-center bg-white text-gray-800 min-h-screen">
      <LandingHeader />
      <div className="flex-grow w-full flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full pt-16 pb-8 md:pt-24 md:pb-12 flex flex-col items-center text-center">
          <img 
            src="/groov.png" 
            alt="Groov Logo" 
            className="h-32 w-auto mb-8" // Kept logo large as per previous request
          />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Simple task management</h1>
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-10">
            <Link href="/register"> 
              <Button size="lg" className="bg-gray-900 hover:bg-gray-700 text-white px-6 w-full sm:w-auto">
                Get Started <span aria-hidden="true" className="ml-1">→</span>
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="px-6 w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
          <Separator className="w-full max-w-5xl bg-gray-200" />
        </section>

        {/* Simplify Section */} 
        <section className="w-full max-w-5xl px-6 pt-8 pb-8 md:pt-12 md:pb-12 flex flex-col items-center text-center">
          <h2 className="text-3xl font-semibold mb-3">Simplify your tasks</h2>
          <p className="text-gray-600 mb-10 max-w-2xl">
            groov helps you manage tasks with minimal effort so you can focus on what's important.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full"> {/* Reduced gap slightly */} 
            <Card className="text-left">
              <CardHeader>
                <List className="h-8 w-8 mb-2 text-blue-600" />
                <CardTitle className="text-lg font-semibold">Simple Task Lists</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Create and organize tasks with straightforward, intuitive lists.</CardDescription>
              </CardContent>
            </Card>
            <Card className="text-left">
              <CardHeader>
                <CheckSquare className="h-8 w-8 mb-2 text-green-600" />
                <CardTitle className="text-lg font-semibold">Quick Task Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Mark tasks complete with a single tap and watch them disappear.</CardDescription>
              </CardContent>
            </Card>
            <Card className="text-left">
              <CardHeader>
                <CalendarDays className="h-8 w-8 mb-2 text-purple-600" />
                <CardTitle className="text-lg font-semibold">Scheduling Made Easy</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Set dates for tasks that need to be done at a specific time.</CardDescription>
              </CardContent>
            </Card>
            <Card className="text-left">
              <CardHeader>
                <Bell className="h-8 w-8 mb-2 text-red-600" />
                <CardTitle className="text-lg font-semibold">Smart Reminders</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>Get notified about your tasks only when you need to be.</CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it works Section */} 
        <section className="w-full bg-gray-100 py-12 md:py-16 flex flex-col items-center text-center border-t border-b border-gray-200">
          <div className="w-full max-w-5xl px-6">
            <h2 className="text-3xl font-semibold mb-3">How groov works</h2>
            <p className="text-gray-600 mb-10 max-w-2xl mx-auto">
              No complicated processes. Just simple, effective task management in three easy steps.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xl mb-4">01</div>
                <h3 className="text-xl font-semibold mb-2">Sign up in seconds</h3>
                <p className="text-gray-600">Create your account with just an email - no complex setup required.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xl mb-4">02</div>
                <h3 className="text-xl font-semibold mb-2">Create your first task</h3>
                <p className="text-gray-600">Add tasks quickly with our minimal interface designed for speed.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xl mb-4">03</div>
                <h3 className="text-xl font-semibold mb-2">Stay organized</h3>
                <p className="text-gray-600">Manage your day with simple lists and complete tasks as you go.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why users love Section */} 
        <section className="w-full max-w-3xl px-6 py-12 md:py-16 flex flex-col items-center text-center">
           <div className="bg-gray-100 p-8 rounded-lg w-full">
            <h2 className="text-2xl font-semibold mb-5">Why users love groov</h2>
            <ul className="space-y-3 text-left max-w-md mx-auto">
               <li className="flex items-center text-gray-700">
                <Check className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                No unnecessary features to get in your way
              </li>
              <li className="flex items-center text-gray-700">
                <Check className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                Designed for speed and simplicity
              </li>
              <li className="flex items-center text-gray-700">
                <Check className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                Works perfectly on all your devices
              </li>
              <li className="flex items-center text-gray-700">
                <Check className="h-5 w-5 mr-3 text-green-600 flex-shrink-0" />
                Helps you stay focused on what matters
              </li>
            </ul>
           </div>
        </section>

        {/* Footer placeholder (optional) */} 
        <footer className="w-full py-6 border-t border-gray-200 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Groov. All rights reserved.
        </footer>
      </div>
    </div>
  );
} 