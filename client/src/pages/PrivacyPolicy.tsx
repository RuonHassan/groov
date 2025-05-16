import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p>This Privacy Policy explains how Groov ("we", "us", "our") collects, uses, and protects your personal information when you use our task management application ("the App").</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              <h3 className="text-lg font-medium mb-2">2.1 Information you provide:</h3>
              <ul className="list-disc pl-6 mt-2">
                <li>Account information (email, name)</li>
                <li>Task data (titles, descriptions, due dates)</li>
                <li>User preferences and settings</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">2.2 Google Calendar Data:</h3>
              <ul className="list-disc pl-6 mt-2">
                <li>Calendar events (read-only access)</li>
                <li>Calendar metadata</li>
                <li>Calendar integration preferences</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">2.3 Automatically collected information:</h3>
              <ul className="list-disc pl-6 mt-2">
                <li>Device information</li>
                <li>IP address</li>
                <li>Usage data</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Provide and maintain the App</li>
                <li>Sync with Google Calendar</li>
                <li>Improve our services</li>
                <li>Send important notifications</li>
                <li>Respond to your requests</li>
                <li>Prevent fraud and abuse</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Google Calendar Integration</h2>
              <p>When you connect your Google Calendar:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>We request read-only access to your calendar data</li>
                <li>We only access calendar information necessary for the App's functionality</li>
                <li>We do not store your calendar data permanently</li>
                <li>We do not share your calendar data with third parties</li>
                <li>You can revoke access at any time through your Google Account settings</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Data Storage and Security</h2>
              <p>We implement appropriate security measures to protect your information:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Data encryption in transit and at rest</li>
                <li>Regular security audits</li>
                <li>Secure database management</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. Data Sharing</h2>
              <p>We do not sell your personal information. We may share your information with:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Service providers who assist in operating the App</li>
                <li>Law enforcement when required by law</li>
                <li>Other users only when you explicitly choose to share</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mt-2">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data</li>
                <li>Opt-out of communications</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Children's Privacy</h2>
              <p>The App is not intended for children under 13. We do not knowingly collect information from children under 13.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Changes to Privacy Policy</h2>
              <p>We may update this policy periodically. We will notify you of significant changes via email or through the App.</p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
              <p>For privacy-related questions or concerns, please contact us at:</p>
              <p>Email: privacy@groov.com</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
} 