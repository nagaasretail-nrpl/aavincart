import { Facebook, Twitter, Instagram } from "lucide-react";
import { Link } from "wouter";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`bg-secondary text-secondary-foreground py-8 sm:py-12 pb-20 md:pb-8 sm:pb-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-8">
          <div className="col-span-2 sm:col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={customerLogo} alt="Aavin Cart" className="h-10 w-10 md:h-12 md:w-12 object-contain rounded-lg" />
              <h3 className="text-lg md:text-xl font-bold">Aavin Cart</h3>
            </div>
            <p className="text-xs md:text-sm opacity-80 mb-4">
              Tamil Nadu Cooperative Milk Producers' Federation - Fresh dairy products from 27 District Unions.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 opacity-80 hover:opacity-100 cursor-pointer" />
              <Twitter className="h-5 w-5 opacity-80 hover:opacity-100 cursor-pointer" />
              <Instagram className="h-5 w-5 opacity-80 hover:opacity-100 cursor-pointer" />
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">For Customers</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm opacity-80">
              <li><Link href="/unions" className="hover:opacity-100">Browse Unions</Link></li>
              <li><Link href="/orders" className="hover:opacity-100">Track Order</Link></li>
              <li><Link href="/support" className="hover:opacity-100">Support</Link></li>
              <li><Link href="/apps" className="hover:opacity-100">Mobile App</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">For Unions</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm opacity-80">
              <li><Link href="/union/signup" className="hover:opacity-100">Partner with Us</Link></li>
              <li><Link href="/union/login" className="hover:opacity-100">Union Dashboard</Link></li>
              <li><Link href="/pos" className="hover:opacity-100">Business Tools</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Union Staff</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm opacity-80">
              <li><Link href="/union-staff-register" className="hover:opacity-100">Staff Register</Link></li>
              <li><Link href="/union-staff-login" className="hover:opacity-100">Staff Login</Link></li>
              <li><Link href="/union/login" className="hover:opacity-100">Admin Login</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 md:mb-4 text-sm md:text-base">Company</h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm opacity-80">
              <li><Link href="/about" className="hover:opacity-100">About Us</Link></li>
              <li><Link href="/careers" className="hover:opacity-100">Careers</Link></li>
              <li><Link href="/privacy" className="hover:opacity-100">Privacy</Link></li>
              <li><Link href="/terms" className="hover:opacity-100">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center text-sm opacity-80">
          <p>&copy; {new Date().getFullYear()} Aavin Cart - Tamil Nadu Cooperative Milk Producers' Federation Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
