import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";
import Footer from "@/components/footer";

export default function Careers() {
  const openings = [
    {
      title: "Delivery Executive",
      location: "Multiple Locations",
      type: "Full-time",
      description: "Join our delivery team to serve fresh dairy products across Tamil Nadu."
    },
    {
      title: "District Union Manager",
      location: "Various Districts",
      type: "Full-time",
      description: "Lead operations and manage dairy distribution at the district level."
    },
    {
      title: "Quality Control Officer",
      location: "Chennai",
      type: "Full-time",
      description: "Ensure the highest standards of quality for all Aavin products."
    },
    {
      title: "Technical Support Executive",
      location: "Chennai (Remote)",
      type: "Full-time",
      description: "Provide technical support for our digital platforms."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 text-center">
          <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">Careers at Aavin Cart</h1>
          <p className="text-base sm:text-xl text-cyan-100 max-w-2xl mx-auto">
            Join India's most trusted dairy cooperative. Build your career while serving millions of families.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Why Work With Us?</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Growth Opportunities</h3>
              <p className="text-gray-600 text-sm">Clear career paths with regular training and development programs.</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Social Impact</h3>
              <p className="text-gray-600 text-sm">Support 3.85 lakh farmers and serve millions of families daily.</p>
            </div>
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
              <h3 className="font-semibold text-lg text-gray-800 mb-2">Great Benefits</h3>
              <p className="text-gray-600 text-sm">Competitive salary, health insurance, and cooperative member benefits.</p>
            </div>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Current Openings</h2>
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {openings.map((job, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-cyan-600" />
                  {job.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{job.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {job.type}
                  </span>
                </div>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                  Apply Now <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 sm:mt-12 bg-white rounded-lg shadow-lg p-5 sm:p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Don't see a suitable position?</h2>
          <p className="text-gray-600 mb-4">
            Send your resume to careers@aavincart.com and we'll keep you in mind for future opportunities.
          </p>
          <Button variant="outline">
            Send Your Resume
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
