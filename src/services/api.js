import axios from 'axios';

// Authorization token - should be managed through a better auth system in production
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjI3NGFhYzA1NTAwZTQ2M2RjZmE0NDE2IiwibmFtZSI6Iuygleyihe2YhCIsInR5cGUiOiJpbnZlc3RvciIsImNvbXBhbnlfaWQiOiJBOjcyOTc0MGMxZDI4YTdhYTEyMDQ1YzI3ODhiNGRlZmM5OTc4Y2JhZWI0OWFlMzU1NmVmOTlhMTY2NWY4MTI4OTdmM2NjMTE0MzVlNjQ4MCIsImNvbXBhbnlfbmFtZSI6IuygnOygnOyGjO2UhO2KuCIsImNhdGVnb3J5IjoiVkMiLCJuaWNrbmFtZSI6IjQ0MTY2Mjc0Iiwib3JnX3JvbGUiOiJzb3VyY2luZyIsIm9yZ19pZCI6IjYyZWI2YmQxOGQzYWUxNDI4MWQ1ODAyZiIsImlhdCI6MTY2Mzc0ODU3MSwiZXhwIjoxNjY0MzUzMzcxLCJpc3MiOiJuc2lnaHQtYmFja2VuZCJ9.BGbPFVbUSF04rnPA7p23kB1uaIY_ouX9KOVxGYyxnxE';

// API base URL
const API_BASE_URL = 'https://api-backend.nventure.co.kr/solution';

// Common axios config
const axiosConfig = {
  maxBodyLength: Infinity,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN
  }
};

// Fetch channels list
export const fetchChannels = async () => {
  try {
    const config = {
      ...axiosConfig,
      method: 'get',
      url: `${API_BASE_URL}/crawlChannelList`
    };
    
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
};

// Fetch header list for a specific channel
export const fetchHeaderList = async (channel, size = 100, afterKey = '') => {
  try {
    const data = JSON.stringify({
      channel,
      size,
      afterKey
    });
    
    const config = {
      ...axiosConfig,
      method: 'post',
      url: `${API_BASE_URL}/headerList?channel=${encodeURIComponent(channel)}`,
      data
    };
    
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching header list:', error);
    throw error;
  }
};

// Search headers with keyword
export const searchHeaderList = async (channel, keyword, size = 100, afterKey = '') => {
  try {
    const data = JSON.stringify({
      channel,
      keyword,
      size,
      afterKey
    });
    
    const config = {
      ...axiosConfig,
      method: 'post',
      url: `${API_BASE_URL}/headerList`,
      data
    };
    
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error searching header list:', error);
    throw error;
  }
};

// Alias for fetchHeaderList for the PathNavigation component
export const fetchHeaders = fetchHeaderList;

// Fetch header similarity list
export const fetchHeaderSimilarityList = async (channel, keyword, size = 100) => {
  try {
    const data = JSON.stringify({
      channel,
      keyword,
      size
    });
    
    const config = {
      ...axiosConfig,
      method: 'post',
      url: `${API_BASE_URL}/headerSimilarityList?channel=${encodeURIComponent(channel)}&keyword=${encodeURIComponent(keyword)}&size=${size}`,
      data
    };
    
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching header similarity list:', error);
    throw error;
  }
};

// Fetch header combination list
export const fetchHeaderCombinationList = async (channel, headers) => {
  try {
    // Make sure headers is an array
    const headersArray = Array.isArray(headers) ? headers : [headers];
    
    const data = JSON.stringify({
      channel,
      headers: headersArray
    });
    
    const config = {
      ...axiosConfig,
      method: 'post',
      url: `${API_BASE_URL}/headerCombinationList`,
      data
    };
    
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching header combination list:', error);
    throw error;
  }
};

// Alias for fetchHeaderCombinationList for the PathNavigation component
export const fetchCombinations = fetchHeaderCombinationList;

// Fetch header combination text list
export const fetchHeaderCombinationTextList = async (channel, headerGroups, size = 1000, afterKey = '') => {
  try {
    const data = JSON.stringify({
      size,
      channel,
      header_groups: headerGroups,
      afterKey
    });
    
    const config = {
      ...axiosConfig,
      method: 'post',
      url: `${API_BASE_URL}/tableTextList`,
      data
    };
    
    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching header combination text list:', error);
    throw error;
  }
}; 