import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import aavinLogo from "@assets/F-F_1770588249868.png";
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function MerchantLogin() {
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
        if (data.isSubUser && data.subUser) {
          sessionStorage.setItem('merchantSubUser', JSON.stringify({
            id: data.subUser.id,
            name: data.subUser.name,
            email: data.subUser.email,
            permissions: data.subUser.permissions,
            isSubUser: true
          }));
        } else {
          sessionStorage.removeItem('merchantSubUser');
        }
        
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
    <div className="min-h-screen lg:h-screen flex flex-col lg:flex-row overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img 
          src="/ice-baby.png"
          alt="Happy child with Aavin ice cream"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-purple-400/20"></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 bg-white overflow-hidden">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-4 sm:mb-6">
            <img src={aavinLogo} alt="Aavin" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-center text-gray-800 mb-4 sm:mb-6">
            District Union Login
          </h1>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 border-gray-300 focus:border-green-500"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-gray-300 focus:border-green-500 pr-10"
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
              className="w-full h-11 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
