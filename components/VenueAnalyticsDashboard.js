import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { collection, query, where, getDocs, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement,
  PointElement,
  LineElement
);

/**
 * Enhanced VenueAnalytics component for displaying comprehensive venue performance metrics
 * @param {Object} props - Component props
 * @param {string} props.venueId - ID of the venue to display analytics for
 */
const VenueAnalyticsDashboard = ({ venueId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [venue, setVenue] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [demographicData, setDemographicData] = useState(null);
  const [topEvents, setTopEvents] = useState([]);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'events', 'demographics', 'trends'

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!venueId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get venue details
        const venueDoc = await getDoc(doc(db, 'venues', venueId));
        if (!venueDoc.exists()) {
          setError('Venue not found');
          setLoading(false);
          return;
        }
        
        setVenue({ id: venueDoc.id, ...venueDoc.data() });
        
        // Get events for this venue
        const eventsQuery = query(
          collection(db, 'events'),
          where('venueId', '==', venueId),
          orderBy('startDateTime', 'desc')
        );
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const events = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (events.length === 0) {
          setLoading(false);
          return;
        }
        
        // Process attendance data
        const attendanceByDate = processAttendanceData(events, dateRange);
        setAttendanceData(attendanceByDate);
        
        // Process category data
        const categoryCounts = processCategoryData(events);
        setCategoryData(categoryCounts);
        
        // Process trend data
        const trends = processTrendData(events);
        setTrendData(trends);
        
        // Process demographic data (mock data for now)
        const demographics = processDemographicData(events);
        setDemographicData(demographics);
        
        // Get top events by attendance
        const sortedEvents = [...events].sort((a, b) => 
          (b.attendeeCount || 0) - (a.attendeeCount || 0)
        ).slice(0, 5);
        
        setTopEvents(sortedEvents);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching venue analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchVenueData();
  }, [venueId, dateRange]);
  
  // Process attendance data based on date range
  const processAttendanceData = (events, range) => {
    const labels = [];
    const data = [];
    
    // Generate date labels based on range
    const now = new Date();
    let dateFormat;
    let numPoints;
    
    if (range === 'week') {
      dateFormat = date => date.toLocaleDateString('en-US', { weekday: 'short' });
      numPoints = 7;
    } else if (range === 'month') {
      dateFormat = date => date.toLocaleDateString('en-US', { day: 'numeric' });
      numPoints = 30;
    } else { // year
      dateFormat = date => date.toLocaleDateString('en-US', { month: 'short' });
      numPoints = 12;
    }
    
    // Create labels and initialize data points
    for (let i = 0; i < numPoints; i++) {
      const date = new Date();
      if (range === 'week') {
        date.setDate(now.getDate() - i);
      } else if (range === 'month') {
        date.setDate(now.getDate() - i);
      } else { // year
        date.setMonth(now.getMonth() - i);
      }
      
      labels.unshift(dateFormat(date));
      data.unshift(0);
    }
    
    // Populate data from events
    events.forEach(event => {
      if (!event.startDateTime || !event.attendeeCount) return;
      
      const eventDate = event.startDateTime.toDate ? event.startDateTime.toDate() : new Date(event.startDateTime);
      let index;
      
      if (range === 'week') {
        const dayDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 7) {
          index = numPoints - 1 - dayDiff;
        }
      } else if (range === 'month') {
        const dayDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 30) {
          index = numPoints - 1 - dayDiff;
        }
      } else { // year
        const monthDiff = (now.getFullYear() - eventDate.getFullYear()) * 12 + 
                          (now.getMonth() - eventDate.getMonth());
        if (monthDiff >= 0 && monthDiff < 12) {
          index = numPoints - 1 - monthDiff;
        }
      }
      
      if (index !== undefined) {
        data[index] += event.attendeeCount || 0;
      }
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'Attendance',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Process category data
  const processCategoryData = (events) => {
    const categories = {};
    
    events.forEach(event => {
      if (!event.categories) return;
      
      event.categories.forEach(category => {
        if (!categories[category]) {
          categories[category] = 0;
        }
        categories[category] += event.attendeeCount || 0;
      });
    });
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    
    // Generate colors
    const backgroundColors = labels.map((_, i) => {
      const hue = (i * 137) % 360; // Golden angle approximation for good distribution
      return `hsla(${hue}, 70%, 60%, 0.7)`;
    });
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Process trend data
  const processTrendData = (events) => {
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = a.startDateTime ? (a.startDateTime.toDate ? a.startDateTime.toDate() : new Date(a.startDateTime)) : new Date(0);
      const dateB = b.startDateTime ? (b.startDateTime.toDate ? b.startDateTime.toDate() : new Date(b.startDateTime)) : new Date(0);
      return dateA - dateB;
    });
    
    // Group events by month
    const monthlyData = {};
    
    sortedEvents.forEach(event => {
      if (!event.startDateTime) return;
      
      const eventDate = event.startDateTime.toDate ? event.startDateTime.toDate() : new Date(event.startDateTime);
      const monthYear = `${eventDate.getFullYear()}-${eventDate.getMonth() + 1}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          totalAttendance: 0,
          eventCount: 0,
          avgRating: 0,
          totalRatings: 0
        };
      }
      
      monthlyData[monthYear].totalAttendance += event.attendeeCount || 0;
      monthlyData[monthYear].eventCount += 1;
      
      if (event.rating) {
        monthlyData[monthYear].avgRating += event.rating * (event.ratingCount || 1);
        monthlyData[monthYear].totalRatings += (event.ratingCount || 1);
      }
    });
    
    // Calculate averages and prepare chart data
    const labels = Object.keys(monthlyData).sort();
    const attendanceData = [];
    const eventCountData = [];
    const ratingData = [];
    
    labels.forEach(month => {
      const data = monthlyData[month];
      attendanceData.push(data.totalAttendance);
      eventCountData.push(data.eventCount);
      ratingData.push(data.totalRatings > 0 ? data.avgRating / data.totalRatings : 0);
    });
    
    // Format labels to be more readable
    const formattedLabels = labels.map(month => {
      const [year, monthNum] = month.split('-');
      return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });
    
    return {
      labels: formattedLabels,
      datasets: [
        {
          label: 'Attendance',
          data: attendanceData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'y',
          tension: 0.4
        },
        {
          label: 'Event Count',
          data: eventCountData,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    };
  };
  
  // Process demographic data (mock data for now)
  const processDemographicData = (events) => {
    // In a real application, this would come from user profiles of attendees
    // For now, we'll generate mock data
    
    // Age distribution
    const ageData = {
      labels: ['18-24', '25-34', '35-44', '45-54', '55+'],
      datasets: [
        {
          data: [25, 40, 20, 10, 5],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };
    
    // Gender distribution
    const genderData = {
      labels: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
      datasets: [
        {
          data: [45, 48, 5, 2],
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1,
        },
      ],
    };
    
    return {
      age: ageData,
      gender: genderData
    };
  };
  
  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    );
  }
  
  if (!venue) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <p className="text-gray-600 dark:text-gray-400">Venue not found</p>
      </div>
    );
  }
  
  if (!attendanceData || !categoryData) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{venue.name} Analytics</h2>
        <p className="text-gray-600 dark:text-gray-400">No analytics data available for this venue yet.</p>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Create events and track attendance to see analytics.</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{venue.name} Analytics</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setDateRange('week')}
            className={`px-3 py-1 rounded ${dateRange === 'week' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
          >
            Week
          </button>
          <button 
            onClick={() => setDateRange('month')}
            className={`px-3 py-1 rounded ${dateRange === 'month' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setDateRange('year')}
            className={`px-3 py-1 rounded ${dateRange === 'year' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}
          >
            Year
          </button>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('demographics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'demographics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Demographics
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'trends'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Trends
          </button>
        </nav>
      </div>
      
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Total Attendance</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {attendanceData.datasets[0].data.reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dateRange === 'week' ? 'This week' : dateRange === 'month' ? 'This month' : 'This year'}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Top Category</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {categoryData.labels[categoryData.datasets[0].data.indexOf(Math.max(...categoryData.datasets[0].data))]}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {Math.max(...categoryData.datasets[0].data)} attendees
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Peak Day</h3>
              <p className="text-3xl font-bold text-gray-800 dark:text-white">
                {attendanceData.labels[attendanceData.datasets[0].data.indexOf(Math.max(...attendanceData.datasets[0].data))]}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {Math.max(...attendanceData.datasets[0].data)} attendees
              </p>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Attendance Over Time</h3>
            <div className="h-64">
              <Bar 
                data={attendanceData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: 'rgba(156, 163, 175, 1)'
                      },
                      grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgba(156, 163, 175, 1)'
                      },
                      grid: {
                        display: false
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      display: false
                    },
                    tooltip: {
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      titleColor: 'rgba(243, 244, 246, 1)',
                      bodyColor: 'rgba(243, 244, 246, 1)',
                      displayColors: false
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Attendance by Category</h3>
              <div className="h-64">
                <Pie 
                  data={categoryData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: 'rgba(156, 163, 175, 1)',
                          padding: 20,
                          font: {
                            size: 12
                          }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.8)',
                        titleColor: 'rgba(243, 244, 246, 1)',
                        bodyColor: 'rgba(243, 244, 246, 1)',
                        displayColors: false
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Top Events</h3>
              <div className="space-y-3">
                {topEvents.map((event, index) => (
                  <div key={event.id} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white rounded-full mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 dark:text-white">{event.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {event.startDateTime ? new Date(event.startDateTime.seconds * 1000).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">{event.attendeeCount || 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">attendees</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Events Tab */}
      {activeTab === 'events' && (
        <div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Event Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Event
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Attendance
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Check-ins
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-800">
                  {topEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {event.startDateTime ? new Date(event.startDateTime.seconds * 1000).toLocaleDateString() : 'No date'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{event.attendeeCount || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {event.categories ? event.categories.join(', ') : 'Uncategorized'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{event.checkInCount || 0}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Event Capacity Utilization</h3>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: topEvents.map(event => event.title),
                    datasets: [
                      {
                        label: 'Attendance',
                        data: topEvents.map(event => event.attendeeCount || 0),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                      },
                      {
                        label: 'Capacity',
                        data: topEvents.map(event => event.capacity || 0),
                        backgroundColor: 'rgba(201, 203, 207, 0.6)',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: 'rgba(156, 163, 175, 1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: 'rgba(156, 163, 175, 1)',
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        labels: {
                          color: 'rgba(156, 163, 175, 1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Event Promotion Effectiveness</h3>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: ['Social Media', 'Email', 'Website', 'Word of Mouth', 'Other'],
                    datasets: [
                      {
                        label: 'Attendees by Source',
                        data: [45, 30, 15, 8, 2],
                        backgroundColor: [
                          'rgba(255, 99, 132, 0.6)',
                          'rgba(54, 162, 235, 0.6)',
                          'rgba(255, 206, 86, 0.6)',
                          'rgba(75, 192, 192, 0.6)',
                          'rgba(153, 102, 255, 0.6)'
                        ]
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: 'rgba(156, 163, 175, 1)'
                        }
                      },
                      x: {
                        ticks: {
                          color: 'rgba(156, 163, 175, 1)'
                        }
                      }
                    },
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Demographics Tab */}
      {activeTab === 'demographics' && demographicData && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Age Distribution</h3>
              <div className="h-64">
                <Pie 
                  data={demographicData.age}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: 'rgba(156, 163, 175, 1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Gender Distribution</h3>
              <div className="h-64">
                <Pie 
                  data={demographicData.gender}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: 'rgba(156, 163, 175, 1)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Geographic Distribution</h3>
            <div className="bg-gray-100 dark:bg-gray-700 h-96 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">Map visualization would be displayed here</p>
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Note: This is a placeholder for a map visualization that would show the geographic distribution of attendees.
            </p>
          </div>
        </div>
      )}
      
      {/* Trends Tab */}
      {activeTab === 'trends' && trendData && (
        <div>
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Attendance & Event Trends</h3>
            <div className="h-64">
              <Line 
                data={trendData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Attendance',
                        color: 'rgba(75, 192, 192, 1)'
                      },
                      ticks: {
                        color: 'rgba(75, 192, 192, 1)'
                      }
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: {
                        display: true,
                        text: 'Event Count',
                        color: 'rgba(153, 102, 255, 1)'
                      },
                      ticks: {
                        color: 'rgba(153, 102, 255, 1)'
                      },
                      grid: {
                        drawOnChartArea: false
                      }
                    },
                    x: {
                      ticks: {
                        color: 'rgba(156, 163, 175, 1)'
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      labels: {
                        color: 'rgba(156, 163, 175, 1)'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Growth Analysis</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Attendance Growth</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">+24%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '24%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Event Frequency</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">+12%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Revenue Growth</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">+32%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">Seasonal Analysis</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Spring</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">245</span>
                    <span className="text-xs text-green-600 dark:text-green-400">+12%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Summer</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">312</span>
                    <span className="text-xs text-green-600 dark:text-green-400">+28%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fall</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">198</span>
                    <span className="text-xs text-red-600 dark:text-red-400">-5%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Winter</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">156</span>
                    <span className="text-xs text-red-600 dark:text-red-400">-8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueAnalyticsDashboard;
