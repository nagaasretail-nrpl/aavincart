import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import deliveryLogo from '@assets/F-F_1770588249868.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function DriverLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [driverCode, setDriverCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/driver/login', {
        driverCode,
        password
      });
      
      const data = await response.json();
      
      if (data.success) {
        queryClient.clear();
        toast({
          title: 'Success',
          description: 'Login successful!'
        });
        setLocation('/driver/trip');
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Invalid credentials',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Login failed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative flex-shrink-0">
        <img 
          src="https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=800&h=1200&fit=crop"
          alt="Delivery driver"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-blue-400/30"></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={deliveryLogo} alt="Aavin Delivery" className="w-12 h-12 sm:w-20 sm:h-20 object-contain rounded-xl" />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-2">
            Delivery Driver Login
          </h1>
          <p className="text-center text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            Sign in to manage your deliveries
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Email / Driver Code"
                value={driverCode}
                onChange={(e) => setDriverCode(e.target.value)}
                className="h-12 border-gray-300 focus:border-blue-500"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-gray-300 focus:border-blue-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium"
              disabled={isLoading}
            >
              <Truck className="mr-2 h-5 w-5" />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/driver/signup" className="text-blue-600 hover:underline font-medium">
                Register as Driver
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login" className="hover:underline">Customer Login</Link>
            <span>|</span>
            <Link href="/dealer/login" className="hover:underline">Dealer Login</Link>
            <span>|</span>
            <Link href="/district-union/login" className="hover:underline">Union Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
