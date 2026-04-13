import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Shield } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/app');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="flex-1 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-12">
        <div className="text-white text-center max-w-md">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-20 h-20" />
          </div>
          <h1 className="text-5xl mb-4">CLMS</h1>
          <p className="text-xl opacity-90">Children's Location Monitoring System</p>
          <p className="mt-6 text-lg opacity-80">
            Real-time GPS tracking and safety monitoring for your loved ones
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 bg-white flex items-center justify-center p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to access your dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <Button 
              type="submit"
              className="w-full h-12 bg-[#2563eb] hover:bg-[#1d4ed8]"
            >
              Login
            </Button>

            <p className="text-sm text-gray-500 text-center">
              By logging in, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}