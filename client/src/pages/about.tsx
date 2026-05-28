import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Truck, Award, MapPin, Phone } from "lucide-react";
import Footer from "@/components/footer";
import customerLogo from "@assets//aavin-logo.png";

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="text-center">
            <img src={customerLogo} alt="Aavin" className="h-16 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-xl" />
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 sm:mb-4">About Aavin Cart</h1>
            <p className="text-base sm:text-xl text-cyan-100 max-w-3xl mx-auto">
              Tamil Nadu Cooperative Milk Producers' Federation Ltd - Serving fresh dairy products since 1981
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Our Mission</h2>
            <p className="text-gray-600 mb-4">
              Tamil Nadu Cooperative Milk Producers' Federation Ltd (TCMPF), popularly known as AAVIN, 
              is the apex body of the Dairy Cooperative Movement in Tamil Nadu. We are committed to 
              procuring milk from farmers at fair prices and delivering quality dairy products to consumers.
            </p>
            <p className="text-gray-600">
              TCMPF serves as the marketing federation for 27 District Cooperative Milk Producers' Unions 
              and 4 Federation Dairies, facilitating milk procurement from over 3.85 lakh farmers across 
              Tamil Nadu.
            </p>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Our Vision</h2>
            <p className="text-gray-600 mb-4">
              To be the most trusted dairy brand in India, ensuring the welfare of milk producers 
              while delivering the highest quality dairy products to every household.
            </p>
            <p className="text-gray-600">
              We aim to modernize dairy farming, empower rural communities, and maintain the highest 
              standards of quality and food safety.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
          <Card className="text-center p-3 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <Building2 className="h-8 w-8 sm:h-12 sm:w-12 text-cyan-600 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">27+</h3>
              <p className="text-gray-600">District Unions</p>
            </CardContent>
          </Card>
          <Card className="text-center p-3 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <Users className="h-8 w-8 sm:h-12 sm:w-12 text-green-600 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">3.85L+</h3>
              <p className="text-gray-600">Farmer Members</p>
            </CardContent>
          </Card>
          <Card className="text-center p-3 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <Truck className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">35L+</h3>
              <p className="text-gray-600">Liters Daily</p>
            </CardContent>
          </Card>
          <Card className="text-center p-3 sm:p-6">
            <CardContent className="pt-2 sm:pt-4 p-0 sm:p-6">
              <Award className="h-8 w-8 sm:h-12 sm:w-12 text-yellow-600 mx-auto mb-2 sm:mb-4" />
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">40+</h3>
              <p className="text-gray-600">Years of Trust</p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8 mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">Contact Us</h2>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-cyan-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800">Registered Office</h3>
                <p className="text-gray-600">
                  Tamil Nadu Cooperative Milk Producers' Federation Ltd<br />
                  Aavin Illam, Madhavaram Milk Colony<br />
                  Chennai - 600 051, Tamil Nadu
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Phone className="h-6 w-6 text-cyan-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800">Phone</h3>
                <p className="text-gray-600">
                  Toll Free: 1800-425-3300<br />
                  Office: +91-44-25550823
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
