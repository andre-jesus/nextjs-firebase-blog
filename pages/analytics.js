import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../lib/firebase';
import { getUserProfile } from '../lib/models/userModel';
import { getEventsByVenue } from '../lib/models/eventModel';
import { getVenue, getVenueFollowersCount } from '../lib/models/venueModel';
import Head from 'next/head';
import Link from 'next/link';

// Chart components
const MetricCard = ({ title, value, change, icon, changeType = 'percentage' }) => {
  const isPositive = change > 0;
  const changeText = changeType === 'percentage' 
    ? `${isPositive ? '+' : ''}${change}%` 
    : `${isPositive ? '+' : ''}${change}`;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
        <div className="text-blue-600 dark:text-blue-400 w-6 h-6">{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {change !== null && (
          <span className={`flex items-center text-sm ${
            isPositive 
              ? 'text-green-600 dark:text-green-400' 
              : change < 0 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-gray-500 dark:text-gray-400'
          }`}>
            {isPositive && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
              </svg>
            )}
            {change < 0 && (
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {changeText}
          </span>
        )}
      </div>
    </div>
  );
};

const BarChart = ({ data, title }) => {
  // Find the max value to scale the bars
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-300 font-medium">{item.label}</span>
              <span className="text-gray-700 dark:text-gray-300 font-medium">{item.value}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full"
                style={{ width: `${Math.max(3, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const EventPerformanceTable = ({ events }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Event Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-750">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Event Name
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attendees
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Interested
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Conversion Rate
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {events.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
                  No events found
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const conversionRate = event.viewCount > 0 
                  ? ((event.attendeeCount / event.viewCount) * 100).toFixed(1) 
                  : '0.0';
                
                return (
                  <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link href={`/events/${event.id}`}>
                        <span className="font-medium text-blue-600 dark:text-blue-500 hover:underline">
                          {event.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {new Date(event.startDateTime?.seconds * 1000).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {event.attendeeCount || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {event.interestedCount || 0}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        parseFloat(conversionRate) > 15
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : parseFloat(conversionRate) > 5
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {conversionRate}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
const DemographicsChart = ({ data }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Attendee Demographics</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Age Groups</h4>
          {data.ageGroups.map((item, index) => (
            <div key={index} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                <span className="text-gray-700 dark:text-gray-300">{item.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 dark:bg-indigo-500 h-2.5 rounded-full"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Gender</h4>
          <div className="flex items-center h-32">
            {data.gender.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-grow">
                <div 
                  className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-sm"
                  style={{ height: `${item.percentage}%`, backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">{item.label}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TimeSeriesChart = ({ data, title }) => {
  // Find max to calculate relative heights
  const maxValue = Math.max(...data.map(point => point.value));
  const totalPoints = data.length;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      
      <div className="flex h-32 items-end space-x-2">
        {data.map((point, index) => (
          <div
            key={index}
            className="group relative flex flex-col items-center flex-grow"
          >
            <div className="absolute bottom-full mb-2 hidden group-hover:block w-24 text-center bg-gray-800 text-white text-xs rounded px-2 py-1 transform -translate-x-1/2 left-1/2">
              {point.label}: {point.value}
            </div>
            <div
              className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-sm hover:bg-blue-700 dark:hover:bg-blue-600 transition"
              style={{ 
                height: `${Math.max(4, (point.value / maxValue) * 100)}%`,
                backgroundColor: point.color || undefined
              }}
            />
            {(index === 0 || index === totalPoints - 1 || index % Math.max(1, Math.floor(totalPoints / 5)) === 0) && (
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-2 truncate w-full text-center">
                {point.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const TrafficSourceChart = ({ data }) => {
  const total = data.reduce((sum, source) => sum + source.value, 0);
  
  // Calculate cumulative percentages for the pie chart
  let cumulativePercentage = 0;
  const sourcesWithPercentages = data.map(source => {
    const percentage = (source.value / total) * 100;
    const startPercentage = cumulativePercentage;
    cumulativePercentage += percentage;
    
    return {
      ...source,
      percentage,
      startPercentage,
      endPercentage: cumulativePercentage
    };
  });
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Traffic Sources</h3>
      
      <div className="flex">
        <div className="w-32 h-32 relative mr-6">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {sourcesWithPercentages.map((source, index) => {
              // Calculate angles for the SVG arc
              const startAngle = (source.startPercentage / 100) * 360;
              const endAngle = (source.endPercentage / 100) * 360;
              
              // Convert angles to radians and calculate coordinates
              const startRad = ((startAngle - 90) * Math.PI) / 180;
              const endRad = ((endAngle - 90) * Math.PI) / 180;
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              // Determine if it's a large arc (more than 180 degrees)
              const largeArc = endAngle - startAngle > 180 ? 1 : 0;
              
              return (
                <path
                  key={index}
                  d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={source.color}
                  className="hover:opacity-90 transition"
                />
              );
            })}
          </svg>
        </div>
        
        <div className="flex-grow">
          {sourcesWithPercentages.map((source, index) => (
            <div key={index} className="flex items-center mb-2">
              <div
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: source.color }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300 flex-grow">
                {source.label}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {source.value} ({source.percentage.toFixed(1)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};