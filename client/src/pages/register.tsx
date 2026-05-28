import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Store, ShoppingBag, User, ArrowRight } from "lucide-react";
import aavinLogo from "@assets/F-F_1770588249868.png";

const REGISTRATION_ROLES = [
  {
    id: "WHOLESALE_DEALER",
    title: "Wholesale Dealer",
    description: "For bulk buyers and distributors purchasing large quantities",
    icon: Building2,
    color: "bg-blue-500",
    pricing: "Get wholesale prices on bulk orders",
  },
  {
    id: "DEALER",
    title: "Dealer",
    description: "For authorized dealers and shop owners",
    icon: Store,
    color: "bg-green-500",
    pricing: "Special dealer pricing on all products",
  },
  {
    id: "RETAILER",
    title: "Retailer",
    description: "For retail shop owners selling to consumers",
    icon: ShoppingBag,
    color: "bg-orange-500",
    pricing: "Retailer margin pricing",
  },
  {
    id: "MRP",
    title: "Consumer",
    description: "For individual customers and households",
    icon: User,
    color: "bg-purple-500",
    pricing: "Standard MRP pricing",
  },
];

export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 sm:py-12 px-3 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <img src={aavinLogo} alt="Aavin" className="w-12 h-12 sm:w-20 sm:h-20 object-contain rounded-xl mx-auto mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-3">
            Register with Aavincart
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            Choose your business type to get started. Your pricing tier determines the prices you see for dairy products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {REGISTRATION_ROLES.map((role) => (
            <Link key={role.id} href={`/signup/${role.id.toLowerCase().replace('_', '-')}`}>
              <Card className="h-full cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-green-500">
                <CardHeader className="pb-3 p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`${role.color} p-2.5 sm:p-3 rounded-full`}>
                      <role.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl">{role.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {role.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600 font-medium">
                      {role.pricing}
                    </span>
                    <Button variant="ghost" size="sm" className="text-green-600 h-11 sm:h-auto">
                      Register <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="text-center mt-6 sm:mt-8">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/admin/login" className="text-green-600 hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-6 sm:mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact us at <span className="font-medium">9843777277</span></p>
        </div>
      </div>
    </div>
  );
}
