import React, { useState, useEffect, useMemo } from 'react';
import { fetchHeaderCombinationList } from '../services/api';
import MiningView from './MiningView';
import './Column.css';

const HeaderCombinationList = ({ channel, selectedHeader, onCombinationSelect, selectedCombination, onHeaderSearch, onHeaderSimilarityRequest }) => {
  const [combinationHeaders, setCombinationHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('combination'); // 'combination' or 'mining'
  const [testMode, setTestMode] = useState(false); // Add test mode state
  
  // New state for filtering and sorting
  const [uniqueItems, setUniqueItems] = useState([]);
  const [activeFilters, setActiveFilters] = useState([]);
  const [excludedFilters, setExcludedFilters] = useState([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    const getCombinationHeaders = async () => {
      // Test mode can work without channel or header selection
      if (!testMode && (!channel || !selectedHeader)) return;
      
      setLoading(true);
      try {
        if (testMode) {
          // Use sample data in test mode
          const response = await import('../sample_data/header_combination.json');
          console.log('Using sample data for combination headers:', response);
          setCombinationHeaders(response.list || []);
        } else if (channel && selectedHeader) {
          // Use API in normal mode only if channel and header are selected
          const headers = Array.isArray(selectedHeader) ? selectedHeader : [selectedHeader];
          const response = await fetchHeaderCombinationList(channel, headers);
          console.log('Combination headers response:', response);
          setCombinationHeaders(response.list || []);
        } else {
          // Clear data if test mode is turned off and no channel/header is selected
          setCombinationHeaders([]);
        }
        setError(null);
      } catch (err) {
        setError(err.message);
        setCombinationHeaders([]);
      } finally {
        setLoading(false);
      }
    };

    getCombinationHeaders();
  }, [channel, selectedHeader, testMode]);

  // Extract unique items and count their frequency when combinationHeaders changes
  useEffect(() => {
    if (combinationHeaders.length === 0) {
      setUniqueItems([]);
      return;
    }

    const itemFrequency = {};
    
    // Count frequency of each unique item
    combinationHeaders.forEach(item => {
      if (!item.header_group) return;
      
      const headers = item.header_group.split('|');
      headers.forEach(header => {
        if (header) {
          if (itemFrequency[header]) {
            itemFrequency[header]++;
          } else {
            itemFrequency[header] = 1;
          }
        }
      });
    });
    
    // Convert to array and sort by frequency (descending)
    const sortedItems = Object.entries(itemFrequency)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    setUniqueItems(sortedItems);
  }, [combinationHeaders]);

  const handleCombinationClick = (combination) => {
    if (onCombinationSelect) {
      onCombinationSelect(combination);
    }
  };

  // Handle right-click on tag to search and get similarity
  const handleTagRightClick = (e, header) => {
    e.preventDefault(); // Prevent default context menu
    e.stopPropagation(); // Don't trigger parent's click
    
    // Call parent handlers if they exist
    if (onHeaderSearch) {
      onHeaderSearch(header);
    }
    
    if (onHeaderSimilarityRequest) {
      onHeaderSimilarityRequest(header);
    }
  };

  // Updated function to cycle through states: AND -> NOT -> REMOVE (for filter section)
  const toggleFilter = (item) => {
    // Check if item is in active filters
    if (activeFilters.includes(item)) {
      // If already in active, move to excluded
      setActiveFilters(activeFilters.filter(filter => filter !== item));
      setExcludedFilters([...excludedFilters, item]);
    } 
    // Check if item is in excluded filters
    else if (excludedFilters.includes(item)) {
      // If already in excluded, remove from all filters
      setExcludedFilters(excludedFilters.filter(filter => filter !== item));
    } 
    // Item is not in any filter
    else {
      // Add to active filters
      setActiveFilters([...activeFilters, item]);
    }
  };

  // Simple toggle for combination list tags (only toggle active/inactive)
  const toggleCombinationTagFilter = (item) => {
    // If already in active filters, remove it
    if (activeFilters.includes(item)) {
      setActiveFilters(activeFilters.filter(filter => filter !== item));
    } 
    // If not in active filters, add it (and remove from excluded if needed)
    else {
      // Remove from excluded if present
      if (excludedFilters.includes(item)) {
        setExcludedFilters(excludedFilters.filter(filter => filter !== item));
      }
      // Add to active filters
      setActiveFilters([...activeFilters, item]);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setActiveFilters([]);
    setExcludedFilters([]);
  };

  // Function to render header_group as tags
  const renderHeaderGroupAsTags = (headerGroup) => {
    if (!headerGroup) return null;
    
    const headers = headerGroup.split('|');
    return (
      <div className="header-tags">
        {headers.map((header, index) => {
          const isActive = activeFilters.includes(header);
          const isExcluded = excludedFilters.includes(header);
          const className = `similarity-tag ${isActive ? 'active' : ''} ${isExcluded ? 'filtered-out' : ''}`;
          
          return (
            <span 
              key={index} 
              className={className}
              onClick={(e) => {
                e.stopPropagation(); // Don't trigger parent's click
                toggleCombinationTagFilter(header); // Use the simple toggle for combination list
              }}
              onContextMenu={(e) => {
                handleTagRightClick(e, header);
              }}
            >
              {header}
            </span>
          );
        })}
      </div>
    );
  };

  const toggleTestMode = () => {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    
    // Log the test mode state change
    console.log(`Test mode ${newTestMode ? 'enabled' : 'disabled'}`);
    
    // Clear combination data when turning off test mode if no channel/header selected
    if (!newTestMode && (!channel || !selectedHeader)) {
      setCombinationHeaders([]);
    }
  };

  // Filter and sort the combination headers
  const filteredAndSortedCombinations = useMemo(() => {
    if (!combinationHeaders.length) return [];
    
    // Filter combinations based on activeFilters and excludedFilters
    let filtered = [...combinationHeaders];
    
    if (activeFilters.length > 0 || excludedFilters.length > 0) {
      filtered = combinationHeaders.filter(item => {
        if (!item.header_group) return false;
        
        const headers = item.header_group.split('|');
        
        // Check if ALL active filters are included (AND logic)
        const containsAllActive = activeFilters.length === 0 || 
          activeFilters.every(filter => headers.includes(filter));
          
        // Check if NONE of the excluded filters are included (NOT logic)
        const containsNoExcluded = excludedFilters.length === 0 || 
          !excludedFilters.some(filter => headers.includes(filter));
          
        return containsAllActive && containsNoExcluded;
      });
    }
    
    // Sort combinations: first by number of items (ascending), then alphabetically
    return filtered.sort((a, b) => {
      // Count items in each combination
      const aCount = a.header_group ? a.header_group.split('|').length : 0;
      const bCount = b.header_group ? b.header_group.split('|').length : 0;
      
      // First sort by count (ascending)
      if (aCount !== bCount) {
        return aCount - bCount;
      }
      
      // Then sort alphabetically
      return a.header_group.localeCompare(b.header_group);
    });
  }, [combinationHeaders, activeFilters, excludedFilters]);

  return (
    <div className="column-container">
      <div className="column-title-container">
        <h2 className="column-title">
          {!testMode && selectedHeader 
            ? `헤더명 조합 목록: ${selectedHeader}` 
            : '헤더명 조합 목록'}
        </h2>
        <div className="test-mode-toggle">
          <label className="toggle-label">
            <span>Test Mode {testMode ? 'ON' : 'OFF'}</span>
            <input 
              type="checkbox" 
              checked={testMode}
              onChange={toggleTestMode}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'combination' ? 'active' : ''}`}
          onClick={() => setActiveTab('combination')}
        >
          조합뷰
        </button>
        <button 
          className={`tab ${activeTab === 'mining' ? 'active' : ''}`}
          onClick={() => setActiveTab('mining')}
        >
          마이닝뷰
        </button>
      </div>
      
      {activeTab === 'combination' ? (
        <div className="tab-content">
          {/* Filter controls */}
          <div className="filter-section">
            <div className="filter-header" onClick={() => setIsFilterOpen(!isFilterOpen)}>
              <div className="filter-title">
                <h3>태그 필터 {activeFilters.length > 0 || excludedFilters.length > 0 ? `(${activeFilters.length + excludedFilters.length})` : ''}</h3>
                <button className="filter-toggle-btn">
                  {isFilterOpen ? '▲' : '▼'}
                </button>
              </div>
              {filteredAndSortedCombinations.length > 0 && (
                <span className="filter-results-count">
                  {filteredAndSortedCombinations.length}개 조합 {combinationHeaders.length !== filteredAndSortedCombinations.length ? `(전체 ${combinationHeaders.length}개 중)` : ''}
                </span>
              )}
            </div>
            
            {isFilterOpen && (
              <div className="filter-content">
                <div className="filter-info">
                  <p>클릭: 포함(AND) → 제외(NOT) → 해제</p>
                  {(activeFilters.length > 0 || excludedFilters.length > 0) && (
                    <button className="reset-filters-btn" onClick={resetFilters}>
                      초기화
                    </button>
                  )}
                </div>
                
                <div className="filter-tags">
                  {uniqueItems.map((item, index) => {
                    const isActive = activeFilters.includes(item.name);
                    const isExcluded = excludedFilters.includes(item.name);
                    const className = `filter-tag ${isActive ? 'active' : ''} ${isExcluded ? 'excluded' : ''}`;
                    
                    return (
                      <div 
                        key={index} 
                        className={className}
                        onClick={() => toggleFilter(item.name)}
                      >
                        <span className="tag-text">
                          {item.name} <span className="tag-count">({item.count})</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* Results display */}
          {loading ? (
            <div className="loading">로딩 중...</div>
          ) : error ? (
            <div className="error">에러: {error}</div>
          ) : filteredAndSortedCombinations.length > 0 ? (
            <div className="column-content">
              {filteredAndSortedCombinations.map((item, index) => (
                <div
                  key={index}
                  className={`column-item ${selectedCombination === item.header_group ? 'selected' : ''}`}
                  onClick={() => handleCombinationClick(item.header_group)}
                >
                  <div className="item-count-badge">
                    {item.header_group ? item.header_group.split('|').length : 0}
                  </div>
                  {renderHeaderGroupAsTags(item.header_group)}
                </div>
              ))}
            </div>
          ) : (
            <div className="column-empty">
              {activeFilters.length > 0 || excludedFilters.length > 0 ? (
                "필터 조건에 맞는 결과가 없습니다."
              ) : testMode ? (
                "테스트 모드가 활성화되었습니다."
              ) : (
                "채널과 헤더를 선택해주세요."
              )}
            </div>
          )}
        </div>
      ) : (
        <MiningView 
          combinationHeaders={combinationHeaders}
          loading={loading}
          error={error}
          testMode={testMode}
        />
      )}
    </div>
  );
};

export default HeaderCombinationList; 