import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";

// Add animations
const animations = `
  @keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
    100% { transform: translateY(0px); }
  }

  @keyframes gradient-slow {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

// Add the style tag to the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = animations;
  document.head.appendChild(style);
}

// Testimonial data
const testimonials = [
  {
    quote: "Groov has completely changed how I manage my tasks. The smart scheduling feature is incredibly helpful.",
    author: "Alex Murray",
    title: "Software Engineer",
    avatar: "https://i.pravatar.cc/150?img=1"
  },
  {
    quote: "The app automatically schedules my tasks at the perfect times. I've never been more productive - it's like having a personal assistant!",
    author: "Morgan Chen",
    title: "Content Creator",
    avatar: "https://i.pravatar.cc/150?img=2"
  },
  {
    quote: "My productivity increased significantly after switching to Groov. The intelligent scheduling feature is a game-changer for staying organized.",
    author: "Sam Johnson",
    title: "Freelance Designer",
    avatar: "https://i.pravatar.cc/150?img=3"
  }
];

export default function LandingPage() {
  const { session } = useAuth();
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);

  const handleScroll = useCallback(() => {
    // Get the hero logo element
    const heroLogo = document.querySelector('#hero-logo');
    if (heroLogo) {
      // Get the bottom position of the hero logo
      const heroLogoBottom = heroLogo.getBoundingClientRect().bottom;
      // Update header state when we scroll past the hero logo
      setIsHeaderCompact(heroLogoBottom < 0);
    }
  }, []);

  useEffect(() => {
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [handleScroll]);

  if (session) {
    return <Redirect to="/app" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header - fixed compact size with animated elements */}
      <header className="bg-black text-white fixed w-full top-0 z-50 py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center relative">
            {/* Logo container - left on mobile, center on larger screens */}
            <div className="md:absolute md:left-1/2 md:-translate-x-1/2">
              <img 
                src="/groov.png" 
                alt="Groov Logo" 
                className={`h-6 invert transition-all duration-300 ${
                  isHeaderCompact 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-1'
                }`}
              />
            </div>
            {/* Empty div to maintain space on the left - only show on larger screens */}
            <div className="hidden md:block w-20"></div>
            {/* Buttons on the right */}
            <div className="flex gap-2">
              <Link href="/login">
                <Button 
                  variant="link" 
                  className={`text-white no-underline hover:text-white/80 h-8 px-3 text-sm transition-all duration-300 ${
                    isHeaderCompact 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-1'
                  }`}
                >
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button 
                  variant="secondary" 
                  className={`bg-white text-black hover:bg-white/90 hover:text-black h-8 px-3 text-sm transition-all duration-300 ${
                    isHeaderCompact 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-1'
                  }`}
                >
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Fixed padding for compact header */}
      <div className="pt-14">
        {/* Hero Section */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center bg-white">
          {/* Background layers */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100/80 via-blue-50 to-purple-50 opacity-90 animate-gradient-slow"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_50%)]"></div>
          </div>

          {/* Content */}
          <div className="container max-w-7xl mx-auto px-4 py-12 md:py-16 relative">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="w-full md:w-1/2 text-center md:text-left mb-12 md:mb-0">
                <div className="mb-8">
                  <img 
                    id="hero-logo"
                    src="/groov.png" 
                    alt="Groov Logo" 
                    className="h-62 w-auto inline-block animate-float motion-safe:animate-float"
                    style={{
                      animation: "float 3s ease-in-out infinite"
                    }}
                  />
                </div>
                <h1 className="text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] font-bold tracking-tight text-[#1a1f36] mb-6 leading-[1.1]">
                  Simplify your<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] animate-gradient">
                    daily workflow
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-lg">
                  The sleek todo list app designed for modern productivity. 
                  Minimize complexity and maximize your potential with intelligent scheduling.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link href="/register"> 
                    <Button className="bg-black hover:bg-black/80 text-white font-medium px-8 py-6 rounded-xl text-lg w-full sm:w-auto">
                      Sign Up for Free
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" className="border-[#1a1f36] text-[#1a1f36] hover:bg-[#1a1f36]/5 font-medium px-8 py-6 rounded-xl text-lg w-full sm:w-auto">
                      Login <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="w-full md:w-1/2 relative pl-4">
                <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-2 border-black/20 bg-black">
                  <img 
                    src="/app-preview-new.jpeg" 
                    alt="Groov App Interface" 
                    className="w-full h-auto"
                  />
                </div>
                {/* Decorative blobs */}
                <div className="absolute -bottom-6 -right-6 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl"></div>
                <div className="absolute -top-6 -left-6 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50" id="features">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Designed for your productivity
              </h2>
              <p className="text-lg text-gray-600">
                Groov helps you stay organized with intelligent features that fit seamlessly into your daily routine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "AI Powered Scheduling",
                  description: "Use AI to optimize your task schedule based on your priorities, deadlines, and available time slots."
                },
                {
                  title: "Simple Task Management",
                  description: "Create, organize, and track tasks with a clean interface designed for efficiency."
                },
                {
                  title: "Satisfying Completions",
                  description: "Experience the satisfaction of checking off tasks with delightful micro-interactions."
                },
                {
                  title: "Calendar Integration",
                  description: "Seamlessly sync with Google Calendar to manage AI-scheduled tasks and events in one place."
                }
              ].map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Loved by productivity enthusiasts
              </h2>
              <p className="text-lg text-gray-600">
                See what users are saying about their experience with Groov
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index}
                  className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-center mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className="h-4 w-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>

                  <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>

                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full overflow-hidden mr-4">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.author} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{testimonial.author}</h4>
                      <p className="text-sm text-gray-500">{testimonial.title}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100/80 via-blue-50 to-purple-50 opacity-90 animate-gradient-slow"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.15),transparent_70%)]"></div>
          
          <div className="container mx-auto px-4 relative">
            <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl border border-white/20">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/2 p-8 md:p-12">
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">
                    Ready to simplify your workflow?
                  </h2>
                  <p className="text-lg text-gray-600 mb-8">
                    Join thousands of users who use Groov to stay organized, focused, and productive.
                  </p>
                  
                  <ul className="space-y-4 mb-8">
                    {[
                      "Free to get started, no credit card required",
                      "Smart scheduling features included",
                      "Beautiful, intuitive interface",
                      "Priority support for all users"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/register">
                    <Button className="bg-[#1a1f36] hover:bg-[#1a1f36]/90 text-white font-medium px-8 py-6 rounded-xl text-lg w-full">
                      Get Started Free
                    </Button>
                  </Link>
                </div>

                <div className="w-full md:w-1/2 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] p-8 md:p-12 text-white flex items-center">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-4">
                      "Groov has transformed how I manage my daily tasks."
                    </h3>
                    <p className="text-white/90 mb-6">
                      The smart scheduling automatically optimizes my day while the clean design makes it a joy to use. I've never been more productive.
                    </p>
                    <div className="flex items-center">
                      <img 
                        src="https://i.pravatar.cc/150?img=4" 
                        alt="User testimonial" 
                        className="h-12 w-12 rounded-full border-2 border-white/20"
                      />
                      <div className="ml-4">
                        <div className="font-medium">Sarah Chen</div>
                        <div className="text-white/80 text-sm">Product Designer</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center">
              <img 
                src="/groov.png" 
                alt="Groov Logo" 
                className="h-10 mb-4 invert"
              />
              <p className="text-white/60 mb-8 max-w-md">
                Simple, beautiful and intelligent todo list app for modern productivity.
              </p>
              <div className="border-t border-white/10 pt-8 w-full flex flex-col md:flex-row justify-between items-center">
                <p className="text-white/60 text-sm">
                  © {new Date().getFullYear()} Groov. All rights reserved.
                </p>
                <div className="flex space-x-8 mt-4 md:mt-0">
                  <Link href="/privacy" className="text-white/60 hover:text-white transition-colors duration-200 text-sm">Privacy Policy</Link>
                  <Link href="/terms" className="text-white/60 hover:text-white transition-colors duration-200 text-sm">Terms of Service</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
} 