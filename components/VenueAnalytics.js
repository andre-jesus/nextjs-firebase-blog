import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

/**
 * VenueAnalytics component for displaying venue performance metrics
 * @param {Object} props - Component props
 * @param {string} props.venueId - ID of the venue to display analytics for
 */
const VenueAnalytics = ({ venueId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!venueId) return;
      
      setLoading(true);
      setError(null);
      
      try {
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
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchAnalyticsData();
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
      
      const eventDate = event.startDateTime.toDate();
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
  
  if (loading) {
    return <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>;
  }
  
  if (error) {
    return <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="text-red-500 dark:text-red-400">{error}</div>
    </div>;
  }
  
  if (!attendanceData || !categoryData) {
    return <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <p className="text-gray-600 dark:text-gray-400">No analytics data available for this venue yet.</p>
      <p className="mt-2 text-gray-600 dark:text-gray-400">Create events and track attendance to see analytics.</p>
    </div>;
  }
  
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Venue Analytics</h2>
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
        
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Analytics Summary</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</h4>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{attendanceData.datasets[0].data.reduce((a, b) => a + b, 0)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Most Popular Category</h4>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {categoryData.labels[categoryData.datasets[0].data.indexOf(Math.max(...categoryData.datasets[0].data))]}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Peak Attendance Day</h4>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {attendanceData.labels[attendanceData.datasets[0].data.indexOf(Math.max(...attendanceData.datasets[0].data))]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueAnalytics;
