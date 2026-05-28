import Footer from "@/components/footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Privacy Policy</h1>
          <p className="text-cyan-100 mt-1 sm:mt-2 text-sm sm:text-base">Last updated: February 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 space-y-5 sm:space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">1. Information We Collect</h2>
            <p className="text-gray-600">
              We collect information you provide directly to us, such as when you create an account, 
              place an order, contact customer support, or subscribe to our newsletter. This may include 
              your name, email address, phone number, delivery address, and payment information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-600">
              We use the information we collect to process orders, communicate with you, improve our 
              services, and send you promotional offers (with your consent). We do not sell your 
              personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">3. Data Security</h2>
            <p className="text-gray-600">
              We implement appropriate security measures to protect your personal information. 
              All payment transactions are encrypted using SSL technology. We store your data 
              on secure servers and follow industry best practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">4. Cookies</h2>
            <p className="text-gray-600">
              We use cookies to enhance your browsing experience, analyze site traffic, and 
              personalize content. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Third-Party Services</h2>
            <p className="text-gray-600">
              We may share your information with trusted third-party service providers who assist 
              us in operating our platform, processing payments, and delivering orders. These 
              providers are bound by confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">6. Your Rights</h2>
            <p className="text-gray-600">
              You have the right to access, correct, or delete your personal information. 
              You may also opt out of marketing communications at any time. Contact us at 
              support@aavincart.com for any privacy-related requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">7. Contact Us</h2>
            <p className="text-gray-600">
              For questions about this Privacy Policy, please contact:<br />
              Email: support@aavincart.com<br />
              Phone: 1800-425-3300 (Toll Free)
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
