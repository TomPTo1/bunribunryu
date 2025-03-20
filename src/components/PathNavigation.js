import React, { useState, useEffect, useRef } from 'react';
import { fetchChannels, fetchHeaders, fetchCombinations } from '../services/api';
import './PathNavigation.css';

const PathNavigation = ({ 
  selectedChannel, 
  selectedHeader, 
  selectedCombination,
  onChannelSelect,
  onHeaderSelect,
  onCombinationSelect,
  viewMode,
  onViewModeChange
}) => {
  const [channels, setChannels] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [headers, setHeaders] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [combinations, setCombinations] = useState([]);
  const [showNavigationPanel, setShowNavigationPanel] = useState(false);
  const [channelLevels, setChannelLevels] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  
  const navigationRef = useRef(null);

  // Parse channel into hierarchical levels
  const parseChannelLevels = (channelList) => {
    const levelMap = {};
    
    channelList.forEach(channel => {
      const channelKey = channel.채널키;
      if (!channelKey) return;
      
      const levels = channelKey.split('_');
      
      // Initialize levelMap for each depth
      levels.forEach((level, index) => {
        const parentPath = index === 0 ? '' : levels.slice(0, index).join('_');
        const currentPath = index === 0 ? level : `${parentPath}_${level}`;
        
        if (!levelMap[index]) {
          levelMap[index] = [];
        }
        
        // Check if this level item already exists in the array
        const existingItem = levelMap[index].find(item => 
          item.name === level && item.parentPath === parentPath
        );
        
        if (!existingItem) {
          levelMap[index].push({
            name: level,
            fullPath: currentPath,
            parentPath
          });
        }
      });
    });
    
    return levelMap;
  };

  // Fetch channels on component mount
  useEffect(() => {
    const getChannels = async () => {
      try {
        const response = await fetchChannels();
        const channelList = response.list || [];
        setChannels(channelList);
        
        // Parse channel levels
        const levels = parseChannelLevels(channelList);
        setChannelLevels(levels);
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    getChannels();
  }, []);

  // Fetch headers when a channel is selected
  useEffect(() => {
    if (selectedChannel) {
      const getHeaders = async () => {
        try {
          const response = await fetchHeaders(selectedChannel);
          setHeaders(response.list || []);
        } catch (error) {
          console.error('Error fetching headers:', error);
        }
      };

      getHeaders();
      
      // Update selected levels based on selected channel
      const levels = selectedChannel.split('_');
      setSelectedLevels(levels);
    } else {
      setHeaders([]);
      setSelectedLevels([]);
    }
  }, [selectedChannel]);

  // Fetch combinations when a header is selected
  useEffect(() => {
    if (selectedChannel && selectedHeader) {
      const getCombinations = async () => {
        try {
          const response = await fetchCombinations(selectedChannel, selectedHeader);
          setCombinations(response.list || []);
        } catch (error) {
          console.error('Error fetching combinations:', error);
        }
      };

      getCombinations();
    } else {
      setCombinations([]);
    }
  }, [selectedChannel, selectedHeader]);

  // Close navigation panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navigationRef.current && !navigationRef.current.contains(event.target)) {
        setShowNavigationPanel(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleNavigationPanel = () => {
    setShowNavigationPanel(!showNavigationPanel);
  };

  const handleLevelSelect = (level, index) => {
    // Create a full channel path up to the selected level
    const newSelectedLevels = [...selectedLevels];
    newSelectedLevels[index] = level.name;
    
    // Trim any levels after the selected index
    const trimmedLevels = newSelectedLevels.slice(0, index + 1);
    const newPath = trimmedLevels.join('_');
    
    // Update selected levels first
    setSelectedLevels(trimmedLevels);
    
    // Find the full channel that matches this path
    const channel = channels.find(c => c.채널키 === newPath);
    
    if (channel) {
      onChannelSelect(channel.채널키);
      setShowNavigationPanel(false);
    } else {
      // If it's a partial path, we keep the navigation panel open
      // to show lower levels without navigating away
      const matchingChannel = channels.find(c => c.채널키.startsWith(newPath + '_'));
      if (matchingChannel) {
        // Don't call onChannelSelect yet, just update the local selectedLevels
        // This allows users to see the next level before committing to a navigation
      } else {
        // If no matching channels at all, close the panel
        setShowNavigationPanel(false);
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
  const getFilteredLevelItems = (levelIndex) => {
    if (!channelLevels[levelIndex]) return [];
    
    // For the first level, return all items
    if (levelIndex === 0) {
      return channelLevels[0];
    }
    
    // For deeper levels, filter based on parent path
    const parentPath = selectedLevels.slice(0, levelIndex).join('_');
    return channelLevels[levelIndex].filter(item => item.parentPath === parentPath);
  };

  const renderChannelPath = () => {
    if (!selectedChannel) {
      return (
        <div className="nav-section-button" onClick={toggleNavigationPanel} style={{ width: '100%' }}>
          <div className="nav-section-label">채널:</div>
          <div className="nav-section-value">선택해주세요</div>
          <span className="dropdown-arrow">▼</span>
        </div>
      );
    }
    
    return (
      <div className="nav-section-button" onClick={toggleNavigationPanel} style={{ width: '100%' }}>
        <div className="nav-section-label">채널:</div>
        <div className="nav-section-path" style={{ flex: '1 1 auto' }}>
          {selectedLevels.map((level, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="path-separator">&gt;</span>}
              <div className="path-level">
                {level}
              </div>
            </React.Fragment>
          ))}
        </div>
        <span className="dropdown-arrow">▼</span>
      </div>
    );
  };

  const renderSectionPath = () => {
    return (
      <div className="nav-section-button" onClick={toggleNavigationPanel} style={{ width: '100%' }}>
        <div className="nav-section-label">섹션:</div>
        <div className="nav-section-value">선택해주세요</div>
        <span className="dropdown-arrow">▼</span>
      </div>
    );
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'edit' ? 'browse' : 'edit';
    onViewModeChange(newMode);
  };

  return (
    <div className="path-navigation" ref={navigationRef}>
      <div className="navigation-container">
        <div className="navigation-sections">
          <div className="nav-section" style={{ flex: '1 1 auto' }}>
            {renderChannelPath()}
          </div>
          
          <div className="nav-section">
            {renderSectionPath()}
          </div>

          <div className="nav-section mode-toggle">
            <div className="nav-section-button" onClick={toggleViewMode}>
              <div className="nav-section-value">
                {viewMode === 'edit' ? 'Edit' : 'Browse'}
              </div>
              <span className="mode-icon">{viewMode === 'edit' ? '✏️' : '👁️'}</span>
            </div>
          </div>
        </div>
        
        {showNavigationPanel && (
          <div className="navigation-panel">
            <div className="level-columns">
              {/* Render columns for each level */}
              {Object.keys(channelLevels).map((levelIndex) => {
                const index = parseInt(levelIndex);
                
                // Get items for this level based on parent selections
                let items = [];
                if (index === 0) {
                  items = channelLevels[0] || [];
                } else if (index <= selectedLevels.length) {
                  const parentPath = selectedLevels.slice(0, index).join('_');
                  items = channelLevels[index] ? 
                    channelLevels[index].filter(item => item.parentPath === parentPath) : 
                    [];
                }
                
                // Only render the column if there are items
                if (items.length === 0) return null;
                
                return (
                  <div className="level-column" key={index}>
                    <div className="level-column-header">
                      채널레벨 {index + 1}
                    </div>
                    <div className="level-column-items">
                      {items.map((item, itemIndex) => (
                        <div 
                          key={itemIndex}
                          className={`level-item ${selectedLevels[index] === item.name ? 'selected' : ''}`}
                          onClick={() => handleLevelSelect(item, index)}
                        >
                          {item.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Add a button to complete navigation when ready */}
              {selectedLevels.length > 0 && (
                <div className="level-column">
                  <div className="level-column-header">
                    작업
                  </div>
                  <div 
                    className="level-item action-button"
                    onClick={() => {
                      const path = selectedLevels.join('_');
                      onChannelSelect(path);
                      setShowNavigationPanel(false);
                    }}
                  >
                    이 경로로 이동
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathNavigation; 