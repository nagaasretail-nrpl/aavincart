import Footer from "@/components/footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Terms of Service</h1>
          <p className="text-cyan-100 mt-1 sm:mt-2 text-sm sm:text-base">Last updated: February 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 space-y-5 sm:space-y-6">
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing and using Aavin Cart, you agree to be bound by these Terms of Service. 
              If you do not agree with any part of these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">2. Account Registration</h2>
            <p className="text-gray-600">
              To place orders, you must create an account with accurate and complete information. 
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">3. Orders and Payment</h2>
            <p className="text-gray-600">
              All orders are subject to product availability. Prices are in Indian Rupees (INR) 
              and include applicable taxes. Payment must be made at the time of order through 
              our secure payment gateway. We accept online payments and cash on delivery.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">4. Delivery</h2>
            <p className="text-gray-600">
              We strive to deliver orders within the estimated timeframe. Delivery times may 
              vary based on location and availability. You must provide accurate delivery 
              address information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">5. Returns and Refunds</h2>
            <p className="text-gray-600">
              Due to the perishable nature of dairy products, returns are accepted only for 
              damaged or defective items. Please report any issues within 24 hours of delivery. 
              Refunds will be processed to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">6. Product Quality</h2>
            <p className="text-gray-600">
              All Aavin products meet FSSAI standards and undergo strict quality control. 
              Please check expiry dates and storage instructions upon delivery. Store dairy 
              products as recommended to maintain freshness.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">7. Limitation of Liability</h2>
            <p className="text-gray-600">
              Aavin Cart shall not be liable for any indirect, incidental, or consequential 
              damages arising from the use of our services. Our liability is limited to the 
              value of the products ordered.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">8. Modifications</h2>
            <p className="text-gray-600">
              We reserve the right to modify these terms at any time. Changes will be effective 
              immediately upon posting. Continued use of our services constitutes acceptance 
              of the modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-3">9. Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms of Service, contact us at:<br />
              Email: legal@aavincart.com<br />
              Phone: 1800-425-3300 (Toll Free)
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
