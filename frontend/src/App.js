import { useState, useEffect } from 'react';
import '@/App.css';
import axios from 'axios';
import { Plus, Fish, TrendingUp, Calendar, Weight, Award, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [catches, setCatches] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [dashboardMonth, setDashboardMonth] = useState(new Date().getMonth() + 1);
  const [statsView, setStatsView] = useState('monthly'); // 'monthly' or 'yearly'
  const [modalImage, setModalImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fish_name: '',
    weight: '',
    weight_unit: 'kg',
    length: '',
    venue: '',
    peg_number: '',
    wraps_count: '',
    bait_used: '',
    notes: '',
    photo_base64: '',
    catch_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    catch_time: new Date().toTimeString().slice(0, 5) // HH:MM format
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, dashboardYear, dashboardMonth]);

  const loadData = async () => {
    try {
      const [catchesRes, yearlyRes, monthlyRes] = await Promise.all([
        axios.get(`${API}/catches?limit=50`),
        axios.get(`${API}/stats/yearly`),
        axios.get(`${API}/stats/monthly?year=${selectedYear}`)
      ]);
      setCatches(catchesRes.data);
      setYearlyStats(yearlyRes.data);
      setMonthlyStats(monthlyRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getFilteredCatches = () => {
    return catches.filter(catch_item => {
      const catchDate = new Date(catch_item.caught_at);
      return catchDate.getFullYear() === dashboardYear && 
             catchDate.getMonth() + 1 === dashboardMonth;
    });
  };

  const getDashboardMonthStats = () => {
    return monthlyStats.find(s => s.month === dashboardMonth && s.year === dashboardYear) || 
           { total_count: 0, total_weight: 0, average_weight: 0, biggest_catch: null };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_base64: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Combine date and time into ISO format
      const catchDateTime = new Date(`${formData.catch_date}T${formData.catch_time}`).toISOString();
      
      const submitData = {
        ...formData,
        weight: parseFloat(formData.weight),
        length: formData.length ? parseFloat(formData.length) : null,
        wraps_count: formData.wraps_count ? parseInt(formData.wraps_count) : null,
        caught_at: catchDateTime
      };
      
      // Remove the separate date/time fields before sending
      delete submitData.catch_date;
      delete submitData.catch_time;
      
      await axios.post(`${API}/catches`, submitData);
      setFormData({
        fish_name: '',
        weight: '',
        weight_unit: 'kg',
        length: '',
        venue: '',
        peg_number: '',
        wraps_count: '',
        bait_used: '',
        notes: '',
        photo_base64: '',
        catch_date: new Date().toISOString().split('T')[0],
        catch_time: new Date().toTimeString().slice(0, 5)
      });
      await loadData();
      setActiveTab('catches');
    } catch (error) {
      console.error('Error adding catch:', error);
      alert('Failed to add catch');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (catchId) => {
    if (window.confirm('Delete this catch?')) {
      try {
        await axios.delete(`${API}/catches/${catchId}`);
        await loadData();
      } catch (error) {
        console.error('Error deleting catch:', error);
      }
    }
  };

  const getCurrentMonthStats = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    return monthlyStats.find(s => s.month === currentMonth && s.year === currentYear) || 
           { total_count: 0, total_weight: 0, average_weight: 0 };
  };

  const getCurrentYearStats = () => {
    return yearlyStats.find(s => s.year === selectedYear) || { total_count: 0, total_weight: 0, average_weight: 0 };
  };

  const getMonthName = (monthNum) => {
    return new Date(2000, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const formatWeight = (weight, unit) => {
    if (unit === 'lb') {
      return `${weight} lb`;
    }
    return `${weight} kg`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-emerald-900/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Fish className="w-8 h-8 text-emerald-500" />
              <h1 className="text-2xl font-bold text-emerald-400">Carplog-Pro</h1>
            </div>
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                data-testid="dashboard-tab"
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${activeTab === 'add' ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                data-testid="add-catch-tab"
              >
                <Plus className="w-4 h-4" />
                <span>Add Catch</span>
              </button>
              <button
                onClick={() => setActiveTab('catches')}
                className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'catches' ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                data-testid="catches-tab"
              >
                All Catches
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'stats' ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                data-testid="stats-tab"
              >
                Statistics
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6" data-testid="dashboard-view">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-slate-100">Dashboard</h2>
              
              {/* Month/Year Selector */}
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <select
                  value={dashboardMonth}
                  onChange={(e) => setDashboardMonth(parseInt(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                  data-testid="dashboard-month-selector"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month}>{getMonthName(month)}</option>
                  ))}
                </select>
                <select
                  value={dashboardYear}
                  onChange={(e) => setDashboardYear(parseInt(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                  data-testid="dashboard-year-selector"
                >
                  {yearlyStats.map((stat) => (
                    <option key={stat.year} value={stat.year}>{stat.year}</option>
                  ))}
                  {yearlyStats.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
                </select>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{getMonthName(dashboardMonth)} {dashboardYear}</p>
                    <p className="text-3xl font-bold text-emerald-400" data-testid="month-count">{getDashboardMonthStats().total_count}</p>
                    <p className="text-slate-500 text-xs mt-1">catches</p>
                  </div>
                  <Fish className="w-12 h-12 text-emerald-500/30" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Weight</p>
                    <p className="text-3xl font-bold text-cyan-400" data-testid="month-total">{getDashboardMonthStats().total_weight.toFixed(2)}</p>
                    <p className="text-slate-500 text-xs mt-1">kg this month</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-cyan-500/30" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Average Weight</p>
                    <p className="text-3xl font-bold text-orange-400" data-testid="month-avg">{getDashboardMonthStats().average_weight.toFixed(2)}</p>
                    <p className="text-slate-500 text-xs mt-1">kg</p>
                  </div>
                  <Weight className="w-12 h-12 text-orange-500/30" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Biggest Catch</p>
                    {getDashboardMonthStats().biggest_catch ? (
                      <>
                        <p className="text-3xl font-bold text-amber-400" data-testid="month-biggest">{getDashboardMonthStats().biggest_catch.weight}</p>
                        <p className="text-slate-500 text-xs mt-1">{getDashboardMonthStats().biggest_catch.fish_name || 'kg'}</p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-slate-600">—</p>
                    )}
                  </div>
                  <Award className="w-12 h-12 text-amber-500/30" />
                </div>
              </div>
            </div>

            {/* Month Catches */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-slate-100 mb-4">
                {getMonthName(dashboardMonth)} {dashboardYear} Catches ({getFilteredCatches().length})
              </h3>
              {getFilteredCatches().length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFilteredCatches().map((catch_item) => (
                    <div key={catch_item.id} className="bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden" data-testid="recent-catch-card">
                      {catch_item.photo_base64 && (
                        <img 
                          src={catch_item.photo_base64} 
                          alt="Catch" 
                          className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setModalImage(catch_item.photo_base64)}
                        />
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-lg font-semibold text-emerald-400">{catch_item.fish_name || 'Unnamed'}</h4>
                          <span className="text-2xl font-bold text-orange-400">{formatWeight(catch_item.weight, catch_item.weight_unit)}</span>
                        </div>
                        {catch_item.length && (
                          <p className="text-amber-400 text-sm font-medium">
                            📏 {catch_item.length} {catch_item.weight_unit === 'kg' ? 'cm' : 'in'}
                          </p>
                        )}
                        {catch_item.venue && <p className="text-cyan-400 text-sm font-medium mb-1">📍 {catch_item.venue}</p>}
                        {catch_item.peg_number && <p className="text-slate-400 text-sm">Peg: {catch_item.peg_number}</p>}
                        {catch_item.bait_used && <p className="text-slate-400 text-sm">Bait: {catch_item.bait_used}</p>}
                        <p className="text-slate-500 text-xs mt-2">{new Date(catch_item.caught_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Fish className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-500">No catches recorded for {getMonthName(dashboardMonth)} {dashboardYear}</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Log Your First Catch
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Catch Form */}
        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto" data-testid="add-catch-form">
            <h2 className="text-3xl font-bold text-slate-100 mb-6">Log a New Catch</h2>
            <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6 space-y-4">
              <div>
                <label className="block text-slate-300 mb-2">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-300"
                  data-testid="photo-input"
                />
                {formData.photo_base64 && (
                  <img src={formData.photo_base64} alt="Preview" className="mt-2 max-h-48 rounded-lg" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-2">Fish Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.fish_name}
                    onChange={(e) => setFormData({ ...formData, fish_name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    placeholder="e.g., Big Bertha"
                    data-testid="fish-name-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-2">Weight *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                      required
                      data-testid="weight-input"
                    />
                    <select
                      value={formData.weight_unit}
                      onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      data-testid="weight-unit-select"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-2">Length (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={formData.length}
                      onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                      placeholder="e.g., 85"
                      data-testid="length-input"
                    />
                    <span className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-400 flex items-center">
                      {formData.weight_unit === 'kg' ? 'cm' : 'in'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-2">Venue (Optional)</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    placeholder="e.g., Linear Fisheries"
                    data-testid="venue-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-2">Peg Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.peg_number}
                    onChange={(e) => setFormData({ ...formData, peg_number: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    data-testid="peg-input"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-2">Wraps (Optional)</label>
                  <input
                    type="number"
                    value={formData.wraps_count}
                    onChange={(e) => setFormData({ ...formData, wraps_count: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    data-testid="wraps-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Bait Used (Optional)</label>
                <input
                  type="text"
                  value={formData.bait_used}
                  onChange={(e) => setFormData({ ...formData, bait_used: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                  placeholder="e.g., Boilies, Corn"
                  data-testid="bait-input"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-2">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 h-24"
                  placeholder="Any additional notes..."
                  data-testid="notes-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                data-testid="submit-catch-btn"
              >
                {loading ? 'Adding...' : 'Log Catch'}
              </button>
            </form>
          </div>
        )}

        {/* All Catches */}
        {activeTab === 'catches' && (
          <div data-testid="catches-view">
            <h2 className="text-3xl font-bold text-slate-100 mb-6">All Catches ({catches.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {catches.map((catch_item) => (
                <div key={catch_item.id} className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl overflow-hidden" data-testid="catch-card">
                  {catch_item.photo_base64 && (
                    <img 
                      src={catch_item.photo_base64} 
                      alt="Catch" 
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      onClick={() => setModalImage(catch_item.photo_base64)}
                    />
                  )}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold text-emerald-400">{catch_item.fish_name || 'Unnamed'}</h4>
                      <span className="text-2xl font-bold text-orange-400">{formatWeight(catch_item.weight, catch_item.weight_unit)}</span>
                    </div>
                    <div className="space-y-1 text-sm text-slate-400">
                      {catch_item.length && (
                        <p className="text-amber-400 font-medium">📏 {catch_item.length} {catch_item.weight_unit === 'kg' ? 'cm' : 'in'}</p>
                      )}
                      {catch_item.venue && <p className="text-cyan-400 font-medium">📍 {catch_item.venue}</p>}
                      {catch_item.peg_number && <p>Peg: {catch_item.peg_number}</p>}
                      {catch_item.wraps_count && <p>Wraps: {catch_item.wraps_count}</p>}
                      {catch_item.bait_used && <p>Bait: {catch_item.bait_used}</p>}
                      {catch_item.notes && <p className="text-slate-500 text-xs italic">{catch_item.notes}</p>}
                      <p className="text-slate-500 text-xs mt-2">{new Date(catch_item.caught_at).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(catch_item.id)}
                      className="mt-3 w-full bg-red-900/50 hover:bg-red-800 text-red-300 px-3 py-2 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors"
                      data-testid="delete-catch-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        {activeTab === 'stats' && (
          <div data-testid="stats-view">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-slate-100">Statistics</h2>
              <div className="flex items-center space-x-3">
                {/* View Toggle */}
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 flex">
                  <button
                    onClick={() => setStatsView('monthly')}
                    className={`px-4 py-2 rounded-md transition-colors ${statsView === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    data-testid="monthly-view-btn"
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setStatsView('yearly')}
                    className={`px-4 py-2 rounded-md transition-colors ${statsView === 'yearly' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    data-testid="yearly-view-btn"
                  >
                    Yearly
                  </button>
                </div>
                
                {/* Year Selector (shown for monthly view) */}
                {statsView === 'monthly' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    data-testid="year-selector"
                  >
                    {yearlyStats.map((stat) => (
                      <option key={stat.year} value={stat.year}>{stat.year}</option>
                    ))}
                    {yearlyStats.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
                  </select>
                )}
              </div>
            </div>

            {/* Monthly View */}
            {statsView === 'monthly' && (
              <>
                {/* Year Summary */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">{selectedYear} Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-slate-400 text-sm">Total Catches</p>
                      <p className="text-3xl font-bold text-emerald-400" data-testid="year-total-count">{getCurrentYearStats().total_count}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Total Weight</p>
                      <p className="text-3xl font-bold text-cyan-400" data-testid="year-total-weight">{getCurrentYearStats().total_weight.toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Average Weight</p>
                      <p className="text-3xl font-bold text-orange-400" data-testid="year-avg-weight">{getCurrentYearStats().average_weight.toFixed(2)} kg</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Biggest Catch</p>
                      {getCurrentYearStats().biggest_catch && (
                        <div data-testid="year-biggest-catch">
                          <p className="text-3xl font-bold text-amber-400">{getCurrentYearStats().biggest_catch.weight} kg</p>
                          <p className="text-slate-500 text-xs">{getCurrentYearStats().biggest_catch.fish_name || 'Unnamed'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">Monthly Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {monthlyStats.map((stat) => (
                      <div key={stat.month} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4" data-testid="month-stat-card">
                        <h4 className="text-lg font-semibold text-emerald-400 mb-3">
                          {new Date(stat.year, stat.month - 1).toLocaleDateString('en-US', { month: 'long' })}
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Catches:</span>
                            <span className="text-slate-100 font-semibold">{stat.total_count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Total:</span>
                            <span className="text-slate-100 font-semibold">{stat.total_weight.toFixed(2)} kg</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Average:</span>
                            <span className="text-slate-100 font-semibold">{stat.average_weight.toFixed(2)} kg</span>
                          </div>
                          {stat.biggest_catch && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <p className="text-amber-400 text-xs mb-1">Biggest:</p>
                              <p className="text-amber-300 font-bold">{stat.biggest_catch.weight} kg</p>
                              <p className="text-slate-500 text-xs">{stat.biggest_catch.fish_name || 'Unnamed'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Yearly View */}
            {statsView === 'yearly' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-100 mb-4">All Years Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {yearlyStats.map((stat) => (
                    <div key={stat.year} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4" data-testid="year-stat-card">
                      <h4 className="text-2xl font-bold text-emerald-400 mb-3">{stat.year}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Catches:</span>
                          <span className="text-slate-100 font-semibold">{stat.total_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Weight:</span>
                          <span className="text-slate-100 font-semibold">{stat.total_weight.toFixed(2)} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Average:</span>
                          <span className="text-slate-100 font-semibold">{stat.average_weight.toFixed(2)} kg</span>
                        </div>
                        {stat.biggest_catch && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-amber-400 text-xs mb-1">Biggest Catch:</p>
                            <p className="text-amber-300 font-bold">{stat.biggest_catch.weight} kg</p>
                            <p className="text-slate-500 text-xs">{stat.biggest_catch.fish_name || 'Unnamed'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Image Modal */}
      {modalImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setModalImage(null)}
          data-testid="image-modal"
        >
          {/* Close Button - Top Right of Screen */}
          <button
            onClick={() => setModalImage(null)}
            className="fixed top-4 right-4 bg-slate-800/90 hover:bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-3xl font-bold transition-colors shadow-lg z-10"
            data-testid="close-modal-btn"
            title="Close (or click outside)"
          >
            ×
          </button>
          
          <div className="relative max-w-6xl max-h-screen">
            <img 
              src={modalImage} 
              alt="Full size catch" 
              className="max-w-full max-h-screen object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;