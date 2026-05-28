import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import unionLogo from '@assets/aavin-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function DistrictUnionLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/merchant/login', {
        username,
        password
      });
      
      const data = await response.json();
      
      if (data.success) {
        queryClient.clear();
        toast({
          title: 'Success',
          description: 'Login successful!'
        });
        setLocation('/');
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
          src="/ice-baby.png"
          alt="Child enjoying Aavin ice cream"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={unionLogo} alt="Aavin Union" className="w-12 h-12 sm:w-20 sm:h-20 object-contain rounded-xl" />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold text-center text-gray-800 mb-2">
            District Union Login
          </h1>
          <p className="text-center text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            Sign in to manage your union operations
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Union Code / Mobile Number</label>
              <Input
                type="text"
                placeholder="Union code (e.g., slm, cbe) or mobile number"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 border-gray-300 focus:border-green-500"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-gray-300 focus:border-green-500 pr-10"
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
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium"
              disabled={isLoading}
            >
              <Building2 className="mr-2 h-5 w-5" />
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/district-union/signup" className="text-green-600 hover:underline font-medium">
                Register your District Union
              </Link>
            </p>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500 flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login" className="hover:underline">Customer Login</Link>
            <span>|</span>
            <Link href="/inter-union/login" className="hover:underline">Inter-Union Login</Link>
            <span>|</span>
            <Link href="/dealer/login" className="hover:underline">Dealer Login</Link>
            <span>|</span>
            <Link href="/driver/login" className="hover:underline">Driver Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
