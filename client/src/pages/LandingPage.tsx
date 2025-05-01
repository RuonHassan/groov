import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

// Testimonial data
const testimonials = [
  {
    quote: "Groov has completely changed how our team manages tasks. It's the perfect balance of simplicity and power.",
    author: "Alex Murray",
    title: "Product Manager, Vercel",
    avatar: "https://i.pravatar.cc/150?img=1"
  },
  {
    quote: "The clean design and intuitive interface make Groov a standout productivity tool. Our team adopted it immediately.",
    author: "Morgan Chen",
    title: "COO, Amplitude",
    avatar: "https://i.pravatar.cc/150?img=2"
  },
  {
    quote: "Our productivity increased by 34% after switching to Groov. The team loves how easy it is to stay organized.",
    author: "Sam Johnson",
    title: "CTO, Rippling",
    avatar: "https://i.pravatar.cc/150?img=3"
  }
];

export default function LandingPage() {
  const { session } = useAuth();

  if (session) {
    return <Redirect to="/app" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
        {/* Header */}
        <header className="bg-gray-900 py-8">
          <div className="container mx-auto px-4">
          </div>
        </header>

        {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 -z-10"></div>

        <div className="container max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 text-center md:text-left mb-12 md:mb-0">
              <div className="mb-8">
          <img 
            src="/groov.png" 
            alt="Groov Logo" 
                  className="h-62 w-auto inline-block animate-float"
                />
              </div>
              <h1 className="text-[3.5rem] md:text-[4rem] lg:text-[4.5rem] font-bold tracking-tight text-[#1a1f36] mb-6 leading-[1.1]">
                Simplify your<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] animate-gradient">
                  daily workflow
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-lg">
                The sleek todo list app designed with modern teams in mind. 
                Minimize complexity and maximise productivity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            <Link href="/register"> 
                  <Button className="bg-[#1a1f36] hover:bg-[#1a1f36]/90 text-white font-medium px-8 py-6 rounded-xl text-lg w-full sm:w-auto">
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
              <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/20 bg-white">
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
              Designed for modern teams
            </h2>
            <p className="text-lg text-gray-600">
              Groov helps you stay organized with powerful but intuitive features that fit seamlessly into your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: "📝",
                title: "Simple Task Management",
                description: "Create, organize, and track tasks with a clean interface designed for efficiency."
              },
              {
                icon: "✅",
                title: "Satisfying Completions",
                description: "Experience the satisfaction of checking off tasks with delightful micro-interactions."
              },
              {
                icon: "📅",
                title: "Calendar Integration",
                description: "Seamlessly sync with Google Calendar to manage tasks and events in one place."
              },
              {
                icon: "👥",
                title: "Team Collaboration",
                description: "Share tasks and projects with team members to coordinate efficiently."
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4">{feature.icon}</div>
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
              See what teams are saying about their experience with Groov
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
        <div className="absolute inset-0 bg-hero-gradient bg-gradient-size animate-gradient-shift opacity-10 -z-10"></div>
        
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/2 p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-6">
                  Ready to simplify your workflow?
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Join thousands of teams who use Groov to stay organized, focused, and productive.
                </p>
                
                <ul className="space-y-4 mb-8">
                  {[
                    "Free to get started, no credit card required",
                    "Unlimited tasks on the free plan",
                    "Seamless team collaboration",
                    "Priority support for all users"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center">
                      <span className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
                
                <Link href="/register">
                  <Button className="w-full bg-groov-navy hover:bg-groov-navy/90 text-white font-medium px-8 py-6 rounded-xl text-lg">
                    Start Using Groov — It's Free
                  </Button>
                </Link>
              </div>
              
              <div className="w-full md:w-1/2 overflow-hidden">
                <img 
                  src="/app-preview-2.png" 
                  alt="Groov App Preview" 
                  className="w-full h-full object-contain"
                />
              </div>
              </div>
            </div>
          </div>
        </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <img 
              src="/groov.png" 
              alt="Groov Logo" 
              className="h-10 mb-4 invert"
            />
            <p className="text-gray-400 mb-8 max-w-md">
              Simple, beautiful and powerful todo list app for modern teams.
            </p>
            <div className="border-t border-white/10 pt-8 w-full flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} Groov. All rights reserved.
              </p>
              <div className="flex space-x-8 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white text-sm">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 