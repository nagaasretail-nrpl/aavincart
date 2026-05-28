import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import aavinLogo from "@assets//aavin-logo.png";
import { useToast } from '@/hooks/use-toast';

interface Parlour {
  id: string;
  code: string;
  name: string;
  unionName: string;
  managerName: string;
  password: string;
  type: 'own' | 'private';
}

const parlours: Parlour[] = [
  { id: '1', code: 'SLM-001', name: 'Aavin Parlour - Salem Main', unionName: 'Salem District Cooperative', managerName: 'Rajesh Kumar', password: 'parlour123', type: 'own' },
  { id: '2', code: 'SLM-002', name: 'Aavin Parlour - Salem Junction', unionName: 'Salem District Cooperative', managerName: 'Priya Devi', password: 'parlour123', type: 'private' },
  { id: '3', code: 'ERD-001', name: 'Aavin Parlour - Erode Central', unionName: 'Erode District Cooperative', managerName: 'Senthil Nathan', password: 'parlour123', type: 'own' },
  { id: '4', code: 'CBE-001', name: 'Aavin Parlour - Coimbatore RS Puram', unionName: 'Coimbatore District Cooperative', managerName: 'Lakshmi Narayanan', password: 'parlour123', type: 'private' },
  { id: '5', code: 'MDU-001', name: 'Aavin Parlour - Madurai Meenakshi', unionName: 'Madurai District Cooperative', managerName: 'Muthu Krishnan', password: 'parlour123', type: 'own' },
  { id: '6', code: 'CHN-001', name: 'Aavin Parlour - Chennai T Nagar', unionName: 'Chennai District Cooperative', managerName: 'Venkatesh Iyer', password: 'parlour123', type: 'private' },
];

export default function ParlourLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [parlourCode, setParlourCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const parlour = parlours.find(p => 
      p.code.toLowerCase() === parlourCode.toLowerCase() && 
      p.password === password
    );

    if (parlour) {
      localStorage.setItem('parlourId', parlour.id);
      localStorage.setItem('parlourCode', parlour.code);
      localStorage.setItem('parlourName', parlour.name);
      localStorage.setItem('parlourUnion', parlour.unionName);
      localStorage.setItem('parlourManager', parlour.managerName);
      localStorage.setItem('parlourType', parlour.type);
      
      toast({
        title: 'Success',
        description: `Welcome, ${parlour.managerName}!`
      });
      setLocation('/');
    } else {
      toast({
        title: 'Error',
        description: 'Invalid parlour code or password',
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  const fillDemoCredentials = () => {
    setParlourCode('SLM-001');
    setPassword('parlour123');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-600 to-purple-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <img src={aavinLogo} alt="Aavin" className="h-24 w-24 mx-auto mb-6 rounded-xl object-contain" />
            <h2 className="text-4xl font-bold mb-4">Aavin Parlour</h2>
            <p className="text-xl text-purple-200">Point of Sale System</p>
            <p className="text-purple-300 mt-2">Tamil Nadu Cooperative Milk Producers' Federation</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-3 sm:px-4 py-6 sm:py-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6 sm:mb-8">
            <img src={aavinLogo} alt="Aavin" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded-xl" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-center text-gray-800 mb-2">
            Parlour Login
          </h1>
          <p className="text-center text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">
            Access your parlour's POS system
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Parlour Code (e.g., SLM-001)"
                value={parlourCode}
                onChange={(e) => setParlourCode(e.target.value)}
                className="h-11 border-gray-300 focus:border-purple-500"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-gray-300 focus:border-purple-500 pr-10"
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
              <a href="#" className="text-sm text-purple-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in to Parlour'}
            </Button>
          </form>

          <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600 font-medium mb-2">Demo Credentials:</p>
            <div className="text-sm text-gray-600">
              <p>Parlour Code: SLM-001</p>
              <p>Password: parlour123</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button 
              onClick={fillDemoCredentials}
              className="text-sm text-purple-600 hover:underline"
            >
              Use demo credentials
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/merchant/login" className="text-sm text-gray-500 hover:text-gray-700">
              District Union Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
