import { useState, useEffect, useCallback } from 'react';
import '@/App.css';
import axios from 'axios';
import { Plus, Fish, TrendingUp, Calendar, Weight, Award, Trash2, User, LogOut, LogIn, UserPlus, Save, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth helper functions
const getToken = () => localStorage.getItem('carplog_token');
const setToken = (token) => localStorage.setItem('carplog_token', token);
const removeToken = () => localStorage.removeItem('carplog_token');

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Auth form
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [rememberMe, setRememberMe] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [catches, setCatches] = useState([]);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const [dashboardMonth, setDashboardMonth] = useState(new Date().getMonth() + 1);
  const [statsView, setStatsView] = useState('monthly');
  const [displayUnit, setDisplayUnit] = useState('kg');
  const [modalImage, setModalImage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Profile expanded sections
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    gear: false,
    line: false,
    preferences: false,
    locations: false
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: '',
    surname: '',
    age: '',
    years_angling: '',
    bio: '',
    rods: '',
    reels: '',
    alarms: '',
    bobbins: '',
    rod_pod_banksticks: '',
    bivvy_brolly: '',
    baitboat: '',
    net_and_mat: '',
    mainline: '',
    mainline_breaking_strain: '',
    hooklink: '',
    hooklink_breaking_strain: '',
    favorite_brands: '',
    favorite_bait_company: '',
    favorite_rigs: '',
    favorite_baits: '',
    home_waters: '',
    favorite_venues: '',
    pb_weight: '',
    pb_weight_unit: 'kg'
  });

  // Catch form state
  const [formData, setFormData] = useState({
    fish_name: '',
    weight: '',
    weight_lb: '',
    weight_oz: '',
    weight_unit: 'kg',
    length: '',
    venue: '',
    peg_number: '',
    wraps_count: '',
    bait_used: '',
    notes: '',
    photo_base64: '',
    catch_date: new Date().toISOString().split('T')[0]
  });

  // Check authentication on mount - also load remembered credentials
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchCurrentUser();
    }
    // Load remembered credentials
    const rememberedEmail = localStorage.getItem('carplog_remembered_email');
    const rememberedPassword = localStorage.getItem('carplog_remembered_password');
    if (rememberedEmail && rememberedPassword) {
      setAuthForm(prev => ({ ...prev, email: rememberedEmail, password: rememberedPassword }));
      setRememberMe(true);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: getAuthHeaders()
      });
      setUser(response.data);
      setIsAuthenticated(true);
      // Populate profile form
      if (response.data.profile) {
        setProfileForm(prev => ({
          ...prev,
          ...response.data.profile,
          age: response.data.profile.age || '',
          years_angling: response.data.profile.years_angling || '',
          pb_weight: response.data.profile.pb_weight || ''
        }));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      removeToken();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const headers = getAuthHeaders();
      const [catchesRes, yearlyRes, monthlyRes] = await Promise.all([
        axios.get(`${API}/catches?limit=50`, { headers }),
        axios.get(`${API}/stats/yearly`, { headers }),
        axios.get(`${API}/stats/monthly?year=${selectedYear}`, { headers })
      ]);
      setCatches(catchesRes.data);
      setYearlyStats(yearlyRes.data);
      setMonthlyStats(monthlyRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  }, [isAuthenticated, selectedYear]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, selectedYear, dashboardYear, dashboardMonth, loadData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      const formDataObj = new URLSearchParams();
      formDataObj.append('username', authForm.email);
      formDataObj.append('password', authForm.password);
      
      const response = await axios.post(`${API}/auth/login`, formDataObj, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('carplog_remembered_email', authForm.email);
        localStorage.setItem('carplog_remembered_password', authForm.password);
      } else {
        localStorage.removeItem('carplog_remembered_email');
        localStorage.removeItem('carplog_remembered_password');
      }
      
      setToken(response.data.access_token);
      await fetchCurrentUser();
      setAuthForm({ email: '', password: '', name: '' });
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    
    try {
      await axios.post(`${API}/auth/register`, {
        email: authForm.email,
        password: authForm.password,
        name: authForm.name
      });
      
      // Auto-login after registration
      const formDataObj = new URLSearchParams();
      formDataObj.append('username', authForm.email);
      formDataObj.append('password', authForm.password);
      
      const loginResponse = await axios.post(`${API}/auth/login`, formDataObj, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      setToken(loginResponse.data.access_token);
      await fetchCurrentUser();
      setAuthForm({ email: '', password: '', name: '' });
    } catch (error) {
      setAuthError(error.response?.data?.detail || 'Registration failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    setIsAuthenticated(false);
    setUser(null);
    setCatches([]);
    setYearlyStats([]);
    setMonthlyStats([]);
    setActiveTab('dashboard');
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const profileData = {
        ...profileForm,
        age: profileForm.age ? parseInt(profileForm.age) : null,
        years_angling: profileForm.years_angling ? parseInt(profileForm.years_angling) : null,
        pb_weight: profileForm.pb_weight ? parseFloat(profileForm.pb_weight) : null
      };
      
      const response = await axios.put(`${API}/auth/profile`, profileData, {
        headers: getAuthHeaders()
      });
      
      setUser(response.data);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
      const catchDateTime = new Date(`${formData.catch_date}T12:00:00`).toISOString();
      
      // Calculate weight based on unit
      let finalWeight = 0;
      if (formData.weight_unit === 'lb') {
        const lbs = parseFloat(formData.weight_lb) || 0;
        const oz = parseFloat(formData.weight_oz) || 0;
        finalWeight = lbs + (oz / 16);
      } else {
        finalWeight = formData.weight ? parseFloat(formData.weight) : 0;
      }
      
      const submitData = {
        ...formData,
        weight: finalWeight,
        length: formData.length ? parseFloat(formData.length) : null,
        wraps_count: formData.wraps_count ? parseInt(formData.wraps_count) : null,
        caught_at: catchDateTime
      };
      
      // Remove temporary fields
      delete submitData.catch_date;
      delete submitData.weight_lb;
      delete submitData.weight_oz;
      
      await axios.post(`${API}/catches`, submitData, {
        headers: getAuthHeaders()
      });
      
      setFormData({
        fish_name: '',
        weight: '',
        weight_lb: '',
        weight_oz: '',
        weight_unit: 'kg',
        length: '',
        venue: '',
        peg_number: '',
        wraps_count: '',
        bait_used: '',
        notes: '',
        photo_base64: '',
        catch_date: new Date().toISOString().split('T')[0]
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
        await axios.delete(`${API}/catches/${catchId}`, {
          headers: getAuthHeaders()
        });
        await loadData();
      } catch (error) {
        console.error('Error deleting catch:', error);
      }
    }
  };

  const getCurrentYearStats = () => {
    return yearlyStats.find(s => s.year === selectedYear) || { total_count: 0, total_weight: 0, average_weight: 0 };
  };

  const getMonthName = (monthNum) => {
    return new Date(2000, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const getAvailableYears = () => {
    const startYear = 2026;
    const currentYear = new Date().getFullYear();
    const endYear = Math.max(startYear + 10, currentYear + 5);
    
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push(year);
    }
    return years;
  };

  const formatWeight = (weight, unit) => {
    if (!weight) return unit === 'lb' ? '0 lb 0 oz' : '0 kg';
    if (unit === 'lb') {
      const totalOz = weight * 16;
      const lbs = Math.floor(totalOz / 16);
      const oz = Math.round(totalOz % 16);
      return `${lbs} lb ${oz} oz`;
    }
    return `${weight} kg`;
  };

  const formatWeightFromKg = (weightKg, toUnit) => {
    if (!weightKg) return toUnit === 'lb' ? '0 lb 0 oz' : '0 kg';
    if (toUnit === 'lb') {
      const weightLb = weightKg * 2.20462;
      const totalOz = weightLb * 16;
      const lbs = Math.floor(totalOz / 16);
      const oz = Math.round(totalOz % 16);
      return `${lbs} lb ${oz} oz`;
    }
    return `${weightKg.toFixed(2)} kg`;
  };

  const convertWeight = (weight, fromUnit, toUnit) => {
    if (!weight) return 0;
    if (fromUnit === toUnit) return weight;
    
    let weightInKg = weight;
    if (fromUnit === 'lb') {
      weightInKg = weight / 2.20462;
    }
    
    if (toUnit === 'lb') {
      return weightInKg * 2.20462;
    }
    return weightInKg;
  };

  // Auth Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Fish className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-emerald-400 mb-2">Carplog-Pro</h1>
            <p className="text-slate-400">Your personal carp fishing diary</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
            <div className="flex mb-6">
              <button
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
                className={`flex-1 py-2 text-center rounded-l-lg transition-colors ${authMode === 'login' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                data-testid="login-mode-btn"
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Login
              </button>
              <button
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
                className={`flex-1 py-2 text-center rounded-r-lg transition-colors ${authMode === 'register' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                data-testid="register-mode-btn"
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Register
              </button>
            </div>
            
            {authError && (
              <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-2 rounded-lg mb-4" data-testid="auth-error">
                {authError}
              </div>
            )}
            
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
              {authMode === 'register' && (
                <div className="mb-4">
                  <label className="block text-slate-300 mb-2">Name (Optional)</label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100"
                    placeholder="Your name"
                    data-testid="register-name-input"
                  />
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100"
                  placeholder="your@email.com"
                  required
                  data-testid="auth-email-input"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="auth-password-input"
                />
              </div>
              
              {authMode === 'login' && (
                <div className="mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900"
                      data-testid="remember-me-checkbox"
                    />
                    <span className="text-slate-300">Remember my login details</span>
                  </label>
                </div>
              )}
              
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
                data-testid="auth-submit-btn"
              >
                {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

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
            <nav className="flex items-center space-x-1">
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
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${activeTab === 'profile' ? 'bg-emerald-700 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                data-testid="profile-tab"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 rounded-lg bg-red-900/50 text-red-300 hover:bg-red-800 transition-colors flex items-center space-x-2"
                data-testid="logout-btn"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Profile Page */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto" data-testid="profile-view">
            <h2 className="text-3xl font-bold text-slate-100 mb-6">My Profile & Setup</h2>
            <p className="text-slate-400 mb-6">All fields are optional. Fill in what you'd like to share about yourself and your gear.</p>
            
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* Personal Info Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('personal')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-emerald-400">Personal Information</h3>
                  {expandedSections.personal ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedSections.personal && (
                  <div className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">First Name</label>
                        <input
                          type="text"
                          value={profileForm.name || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          data-testid="profile-name-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Surname</label>
                        <input
                          type="text"
                          value={profileForm.surname || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, surname: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          data-testid="profile-surname-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Age</label>
                        <input
                          type="number"
                          value={profileForm.age || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          data-testid="profile-age-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Years Angling</label>
                        <input
                          type="number"
                          value={profileForm.years_angling || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, years_angling: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          data-testid="profile-years-input"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-2">Bio / About Me</label>
                      <textarea
                        value={profileForm.bio || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 h-24"
                        placeholder="Tell us about yourself and your fishing journey..."
                        data-testid="profile-bio-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Personal Best (PB)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={profileForm.pb_weight || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, pb_weight: e.target.value })}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                            placeholder="Weight"
                            data-testid="profile-pb-input"
                          />
                          <select
                            value={profileForm.pb_weight_unit || 'kg'}
                            onChange={(e) => setProfileForm({ ...profileForm, pb_weight_unit: e.target.value })}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                          >
                            <option value="kg">kg</option>
                            <option value="lb">lb</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Gear Setup Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('gear')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-emerald-400">Gear Setup</h3>
                  {expandedSections.gear ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedSections.gear && (
                  <div className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Rods</label>
                        <input
                          type="text"
                          value={profileForm.rods || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, rods: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Nash Scope 10ft 3lb TC"
                          data-testid="profile-rods-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Reels</label>
                        <input
                          type="text"
                          value={profileForm.reels || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, reels: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Shimano Ultegra 14000 XTD"
                          data-testid="profile-reels-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Alarms</label>
                        <input
                          type="text"
                          value={profileForm.alarms || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, alarms: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Fox RX+ 4 Rod Set"
                          data-testid="profile-alarms-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Bobbins/Hangers</label>
                        <input
                          type="text"
                          value={profileForm.bobbins || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, bobbins: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Nash Siren S5"
                          data-testid="profile-bobbins-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Rod Pod / Banksticks</label>
                        <input
                          type="text"
                          value={profileForm.rod_pod_banksticks || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, rod_pod_banksticks: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Solar P1 Pod"
                          data-testid="profile-rodpod-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Bivvy / Brolly</label>
                        <input
                          type="text"
                          value={profileForm.bivvy_brolly || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, bivvy_brolly: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Nash Titan T2000"
                          data-testid="profile-bivvy-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Baitboat</label>
                        <input
                          type="text"
                          value={profileForm.baitboat || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, baitboat: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Waverunner Atom"
                          data-testid="profile-baitboat-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Net & Unhooking Mat</label>
                        <input
                          type="text"
                          value={profileForm.net_and_mat || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, net_and_mat: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Nash Scope Landing Net"
                          data-testid="profile-net-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Line Setup Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('line')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-emerald-400">Line Setup</h3>
                  {expandedSections.line ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedSections.line && (
                  <div className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Mainline</label>
                        <input
                          type="text"
                          value={profileForm.mainline || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, mainline: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Gardner GT-HD Mono"
                          data-testid="profile-mainline-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Breaking Strain</label>
                        <input
                          type="text"
                          value={profileForm.mainline_breaking_strain || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, mainline_breaking_strain: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., 15lb"
                          data-testid="profile-mainline-bs-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Hooklink Material</label>
                        <input
                          type="text"
                          value={profileForm.hooklink || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, hooklink: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Korda Dark Matter Braid"
                          data-testid="profile-hooklink-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Breaking Strain</label>
                        <input
                          type="text"
                          value={profileForm.hooklink_breaking_strain || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, hooklink_breaking_strain: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., 25lb"
                          data-testid="profile-hooklink-bs-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Preferences Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('preferences')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-emerald-400">Preferences & Favorites</h3>
                  {expandedSections.preferences ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedSections.preferences && (
                  <div className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Favorite Tackle Brands</label>
                        <input
                          type="text"
                          value={profileForm.favorite_brands || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, favorite_brands: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Nash, Korda, Fox"
                          data-testid="profile-brands-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Favorite Bait Company</label>
                        <input
                          type="text"
                          value={profileForm.favorite_bait_company || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, favorite_bait_company: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Mainline, CC Moore"
                          data-testid="profile-baitcompany-input"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 mb-2">Favorite Rigs</label>
                        <input
                          type="text"
                          value={profileForm.favorite_rigs || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, favorite_rigs: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Ronnie Rig, German Rig"
                          data-testid="profile-rigs-input"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-2">Favorite Baits</label>
                        <input
                          type="text"
                          value={profileForm.favorite_baits || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, favorite_baits: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                          placeholder="e.g., Cell, Krill"
                          data-testid="profile-baits-input"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fishing Locations Section */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('locations')}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
                >
                  <h3 className="text-xl font-semibold text-emerald-400">Fishing Locations</h3>
                  {expandedSections.locations ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {expandedSections.locations && (
                  <div className="px-6 pb-6 space-y-4">
                    <div>
                      <label className="block text-slate-300 mb-2">Home Waters</label>
                      <input
                        type="text"
                        value={profileForm.home_waters || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, home_waters: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                        placeholder="e.g., Local club lake, syndicate water"
                        data-testid="profile-homewaters-input"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-2">Favorite Venues</label>
                      <textarea
                        value={profileForm.favorite_venues || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, favorite_venues: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 h-20"
                        placeholder="e.g., Linear Fisheries, Yateley, etc."
                        data-testid="profile-venues-input"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                data-testid="save-profile-btn"
              >
                <Save className="w-5 h-5" />
                <span>{loading ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6" data-testid="dashboard-view">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-slate-100">Dashboard</h2>
              
              <div className="flex items-center space-x-3">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 flex">
                  <button
                    onClick={() => setDisplayUnit('kg')}
                    className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${displayUnit === 'kg' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    data-testid="kg-unit-btn"
                  >
                    kg
                  </button>
                  <button
                    onClick={() => setDisplayUnit('lb')}
                    className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${displayUnit === 'lb' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    data-testid="lb-unit-btn"
                  >
                    lb
                  </button>
                </div>

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
                  {getAvailableYears().map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
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
                    <p className="text-2xl font-bold text-cyan-400" data-testid="month-total">
                      {formatWeightFromKg(getDashboardMonthStats().total_weight, displayUnit)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">this month</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-cyan-500/30" />
                </div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Average Weight</p>
                    <p className="text-2xl font-bold text-orange-400" data-testid="month-avg">
                      {formatWeightFromKg(getDashboardMonthStats().average_weight, displayUnit)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">per catch</p>
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
                        <p className="text-2xl font-bold text-amber-400" data-testid="month-biggest">
                          {formatWeightFromKg(getDashboardMonthStats().biggest_catch.weight, displayUnit)}
                        </p>
                        <p className="text-slate-500 text-xs mt-1">{getDashboardMonthStats().biggest_catch.fish_name || ''}</p>
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

              <div>
                <label className="block text-slate-300 mb-2">Catch Date *</label>
                <input
                  type="date"
                  value={formData.catch_date}
                  onChange={(e) => setFormData({ ...formData, catch_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                  required
                  data-testid="catch-date-input"
                />
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
                  <label className="block text-slate-300 mb-2">Weight (Optional)</label>
                  <div className="flex gap-2 items-center">
                    <select
                      value={formData.weight_unit}
                      onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value, weight: '', weight_lb: '', weight_oz: '' })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                      data-testid="weight-unit-select"
                    >
                      <option value="kg">kg</option>
                      <option value="lb">lb/oz</option>
                    </select>
                    {formData.weight_unit === 'kg' ? (
                      <input
                        type="number"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                        data-testid="weight-input"
                        placeholder="kg"
                      />
                    ) : (
                      <>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={formData.weight_lb}
                          onChange={(e) => setFormData({ ...formData, weight_lb: e.target.value })}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                          data-testid="weight-lb-input"
                          placeholder="lb"
                        />
                        <span className="text-slate-400">lb</span>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="15"
                          value={formData.weight_oz}
                          onChange={(e) => setFormData({ ...formData, weight_oz: e.target.value })}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                          data-testid="weight-oz-input"
                          placeholder="oz"
                        />
                        <span className="text-slate-400">oz</span>
                      </>
                    )}
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
            {catches.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl">
                <Fish className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">No catches logged yet</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Log Your First Catch
                </button>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* Statistics */}
        {activeTab === 'stats' && (
          <div data-testid="stats-view">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold text-slate-100">Statistics</h2>
              <div className="flex items-center space-x-3">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-1 flex">
                  <button
                    onClick={() => setDisplayUnit('kg')}
                    className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${displayUnit === 'kg' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    kg
                  </button>
                  <button
                    onClick={() => setDisplayUnit('lb')}
                    className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${displayUnit === 'lb' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    lb
                  </button>
                </div>

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
                
                {statsView === 'monthly' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-100"
                    data-testid="year-selector"
                  >
                    {getAvailableYears().map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {statsView === 'monthly' && (
              <>
                <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6 mb-6">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">{selectedYear} Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-slate-400 text-sm">Total Catches</p>
                      <p className="text-3xl font-bold text-emerald-400" data-testid="year-total-count">{getCurrentYearStats().total_count}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Total Weight</p>
                      <p className="text-2xl font-bold text-cyan-400" data-testid="year-total-weight">
                        {formatWeightFromKg(getCurrentYearStats().total_weight, displayUnit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Average Weight</p>
                      <p className="text-2xl font-bold text-orange-400" data-testid="year-avg-weight">
                        {formatWeightFromKg(getCurrentYearStats().average_weight, displayUnit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Biggest Catch</p>
                      {getCurrentYearStats().biggest_catch && (
                        <div data-testid="year-biggest-catch">
                          <p className="text-2xl font-bold text-amber-400">
                            {formatWeightFromKg(getCurrentYearStats().biggest_catch.weight, displayUnit)}
                          </p>
                          <p className="text-slate-500 text-xs">{getCurrentYearStats().biggest_catch.fish_name || 'Unnamed'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

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
                            <span className="text-slate-100 font-semibold">
                              {formatWeightFromKg(stat.total_weight, displayUnit)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Average:</span>
                            <span className="text-slate-100 font-semibold">
                              {formatWeightFromKg(stat.average_weight, displayUnit)}
                            </span>
                          </div>
                          {stat.biggest_catch && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <p className="text-amber-400 text-xs mb-1">Biggest:</p>
                              <p className="text-amber-300 font-bold">
                                {formatWeightFromKg(stat.biggest_catch.weight, displayUnit)}
                              </p>
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

            {statsView === 'yearly' && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-emerald-900/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-slate-100 mb-4">All Years Summary</h3>
                {yearlyStats.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500">No statistics available yet. Start logging catches!</p>
                  </div>
                ) : (
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
                            <span className="text-slate-100 font-semibold">
                              {formatWeightFromKg(stat.total_weight, displayUnit)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Average:</span>
                            <span className="text-slate-100 font-semibold">
                              {formatWeightFromKg(stat.average_weight, displayUnit)}
                            </span>
                          </div>
                          {stat.biggest_catch && (
                            <div className="mt-3 pt-3 border-t border-slate-700">
                              <p className="text-amber-400 text-xs mb-1">Biggest Catch:</p>
                              <p className="text-amber-300 font-bold">
                                {formatWeightFromKg(stat.biggest_catch.weight, displayUnit)}
                              </p>
                              <p className="text-slate-500 text-xs">{stat.biggest_catch.fish_name || 'Unnamed'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
