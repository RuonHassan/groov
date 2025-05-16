import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p>By accessing and using Groov ("the App"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you do not have permission to access the App.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p>Groov is a productivity application that provides task management and calendar integration features. The App allows users to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Create and manage tasks</li>
                <li>Integrate with Google Calendar</li>
                <li>Organize tasks by time and priority</li>
                <li>Collaborate with team members</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>
              <p>To use the App, you must:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Be at least 13 years of age</li>
                <li>Register for an account with valid information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Google Calendar Integration</h2>
              <p>When you connect your Google Calendar:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>You grant us read-only access to your calendar data</li>
                <li>We will only access calendar data necessary for the App's functionality</li>
                <li>You can revoke access at any time through your Google Account settings</li>
                <li>We handle all data in accordance with our Privacy Policy</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. User Content</h2>
              <p>You retain ownership of any content you create in the App. By using the App, you grant us a license to host and display your content for the purpose of providing the service.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Use the App for any illegal purpose</li>
                <li>Share inappropriate or harmful content</li>
                <li>Attempt to gain unauthorized access</li>
                <li>Interfere with the App's security features</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Termination</h2>
              <p>We reserve the right to terminate or suspend access to the App for violations of these terms or for any other reason at our discretion.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Changes to Terms</h2>
              <p>We may modify these terms at any time. We will notify users of significant changes via email or through the App.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p>The App is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the App.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Contact Information</h2>
              <p>For questions about these Terms, please contact us at support@groov.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 