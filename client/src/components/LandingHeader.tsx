import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LandingHeader() {
  return (
    <header className="w-full bg-gray-100 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-end items-center h-16">
          {/* Logo removed from here */}
          
          <div className="hidden sm:flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gray-900 hover:bg-gray-700 text-white">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 