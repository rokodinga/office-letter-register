import { useAuth } from '../firebase/auth-context';
import { LogOut } from 'lucide-react';

export function DashboardPage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">Office Letter Register</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">Welcome, <span className="font-semibold">{user?.email}</span></span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to the Dashboard</h2>
          <p className="text-gray-600 text-lg mb-6">
            You have successfully logged in to the Office Letter Register system.
          </p>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Incoming Letters Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-xl font-bold mb-2">Incoming Letters</h3>
              <p className="text-4xl font-bold mb-2">0</p>
              <p className="text-blue-100">Manage incoming correspondence</p>
            </div>

            {/* Outgoing Letters Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-xl font-bold mb-2">Outgoing Letters</h3>
              <p className="text-4xl font-bold mb-2">0</p>
              <p className="text-green-100">Track outgoing correspondence</p>
            </div>

            {/* Total Records Card */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
              <h3 className="text-xl font-bold mb-2">Total Records</h3>
              <p className="text-4xl font-bold mb-2">0</p>
              <p className="text-purple-100">All registered letters</p>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Features</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Register and track incoming letters</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Register and track outgoing letters</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Search and filter records</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Generate reports</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
