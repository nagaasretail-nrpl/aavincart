import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, Calendar, Filter } from 'lucide-react';
import { Link } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from './layout';

export default function PaymentGatewayReports() {
  // Mock analytics data
  const monthlyData = [
    { month: "Jan", revenue: 12450, transactions: 234, successRate: 96.2 },
    { month: "Feb", revenue: 15670, transactions: 289, successRate: 97.1 },
    { month: "Mar", revenue: 18920, transactions: 356, successRate: 95.8 },
    { month: "Apr", revenue: 21340, transactions: 412, successRate: 98.3 },
    { month: "May", revenue: 19850, transactions: 378, successRate: 96.9 },
    { month: "Jun", revenue: 23180, transactions: 445, successRate: 97.5 }
  ];

  const gatewayPerformance = [
    { gateway: "PayPal", revenue: 32100, transactions: 789, fees: 963, successRate: 96.5 },
    { gateway: "Razorpay", revenue: 54320, transactions: 1247, fees: 375, successRate: 98.2 }
  ];

  return (
    <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/payment-gateway">
          <Button variant="outline" size="sm" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payment Gateway
          </Button>
        </Link>
        <span className="text-gray-400">→</span>
        <span className="text-gray-600">Reports & Analytics</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive payment analytics and performance insights</p>
        </div>
        <div className="flex gap-2">
          <Select>
            <SelectTrigger className="w-32" data-testid="select-period">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button data-testid="button-export-report">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹1,05,170</div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,503</div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+8.3%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">96.8%</div>
            <div className="flex items-center text-sm">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-600">-0.5%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Processing Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹2,916</div>
            <div className="flex items-center text-sm">
              <span className="text-gray-600">2.77% avg fee</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Trends</CardTitle>
          <CardDescription>Monthly revenue and transaction volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="flex flex-col items-center flex-1" data-testid={`chart-bar-${index}`}>
                <div className="w-full bg-blue-100 rounded-t-md mb-2 relative group cursor-pointer">
                  <div 
                    className="bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600"
                    style={{ height: `${(data.revenue / 25000) * 200}px` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      ${data.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-600">{data.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gateway Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gateway Performance Comparison</CardTitle>
          <CardDescription>Revenue, transactions, and fees by payment gateway</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-gray-600">Gateway</th>
                  <th className="text-left p-3 font-medium text-gray-600">Revenue</th>
                  <th className="text-left p-3 font-medium text-gray-600">Transactions</th>
                  <th className="text-left p-3 font-medium text-gray-600">Success Rate</th>
                  <th className="text-left p-3 font-medium text-gray-600">Fees Paid</th>
                  <th className="text-left p-3 font-medium text-gray-600">Market Share</th>
                </tr>
              </thead>
              <tbody>
                {gatewayPerformance.map((gateway) => {
                  const totalRevenue = gatewayPerformance.reduce((sum, g) => sum + g.revenue, 0);
                  const marketShare = ((gateway.revenue / totalRevenue) * 100).toFixed(1);
                  return (
                    <tr key={gateway.gateway} className="border-b hover:bg-gray-50" data-testid={`row-gateway-${gateway.gateway.toLowerCase()}`}>
                      <td className="p-3 font-medium">{gateway.gateway}</td>
                      <td className="p-3">${gateway.revenue.toLocaleString()}</td>
                      <td className="p-3">{gateway.transactions.toLocaleString()}</td>
                      <td className="p-3">
                        <Badge variant={gateway.successRate >= 97 ? "default" : gateway.successRate >= 95 ? "secondary" : "destructive"}>
                          {gateway.successRate}%
                        </Badge>
                      </td>
                      <td className="p-3">${gateway.fees.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${marketShare}%` }}
                            ></div>
                          </div>
                          <span className="text-sm">{marketShare}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Insights</CardTitle>
            <CardDescription>Key transaction metrics and patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Transaction Value</span>
              <span className="font-medium">₹3,502</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Transaction Hour</span>
              <span className="font-medium">2:00 PM - 3:00 PM</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Most Active Day</span>
              <span className="font-medium">Friday</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Refund Rate</span>
              <span className="font-medium text-red-600">2.3%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Alerts</CardTitle>
            <CardDescription>System alerts and recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-yellow-800">Razorpay Success Rate</p>
                <p className="text-xs text-yellow-700">Success rate below 95% threshold</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-green-800">Revenue Growth</p>
                <p className="text-xs text-green-700">12.5% increase from last month</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium text-blue-800">Optimization Tip</p>
                <p className="text-xs text-blue-700">Consider enabling card payments for higher success rates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </AdminLayout>
  );
}