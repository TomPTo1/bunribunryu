import React, { useState } from 'react';
import './App.css';
import HeaderList from './components/HeaderList';
import HeaderSimilarityList from './components/HeaderSimilarityList';
import HeaderCombinationList from './components/HeaderCombinationList';
import HeaderCombinationTextList from './components/HeaderCombinationTextList';
import PathNavigation from './components/PathNavigation';

function App() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedHeader, setSelectedHeader] = useState(null);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [similarityGroups, setSimilarityGroups] = useState([]);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'browse'
  const [headerSearchTerm, setHeaderSearchTerm] = useState('');
  // New state to handle similarity view selection without affecting combination list
  const [similarityViewHeader, setSimilarityViewHeader] = useState(null);

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setSelectedHeader(null); // Reset header selection when changing channel
    setSimilarityViewHeader(null); // Reset similarity header
    setSelectedCombination(null); // Reset combination selection
  };

  const handleHeaderSelect = (header) => {
    setSelectedHeader(header);
    setSimilarityViewHeader(header); // Keep similarity header in sync
    setSelectedCombination(null); // Reset combination selection when changing header
  };

  const handleCombinationSelect = (combination) => {
    setSelectedCombination(combination);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Handle header search from right-click in HeaderCombinationList
  const handleHeaderSearch = (header) => {
    if (selectedChannel && header) {
      // We need to set the header search term in the HeaderList component
      // Set global search term state for HeaderList
      setHeaderSearchTerm(header);
      // Update the similarity view header without changing the main header
      setSimilarityViewHeader(header);
      console.log(`헤더 검색 요청: ${header}`);
    }
  };
  
  // Handle header similarity request from right-click in HeaderCombinationList
  const handleHeaderSimilarityRequest = (header) => {
    if (selectedChannel && header) {
      // Just update the similarity view header without affecting the main header
      setSimilarityViewHeader(header);
      console.log(`헤더 유사군 요청: ${header}`);
    }
  };

  const handleSimilarityGroupUpdate = (group, representative) => {
    if (group.length > 0) {
      // Check if we already have a group with this representative
      const existingGroupIndex = similarityGroups.findIndex(
        g => g.representative === representative
      );

      if (existingGroupIndex >= 0) {
        // Update existing group
        const updatedGroups = [...similarityGroups];
        updatedGroups[existingGroupIndex] = { 
          items: group, 
          representative: representative 
        };
        setSimilarityGroups(updatedGroups);
        console.log('유사군 업데이트됨:', updatedGroups);
      } else {
        // Add new group
        const newGroups = [
          ...similarityGroups, 
          { 
            items: group, 
            representative: representative 
          }
        ];
        setSimilarityGroups(newGroups);
        console.log('새 유사군 추가됨:', newGroups);
      }
    }
  };

  const handleRemoveGroup = (groupIndex) => {
    const updatedGroups = similarityGroups.filter((_, index) => index !== groupIndex);
    setSimilarityGroups(updatedGroups);
    console.log('유사군 삭제됨:', updatedGroups);
  };

  return (
    <div className="App">
      <main className="App-content">
        <PathNavigation 
          selectedChannel={selectedChannel}
          selectedHeader={selectedHeader}
          selectedCombination={selectedCombination}
          onChannelSelect={handleChannelSelect}
          onHeaderSelect={handleHeaderSelect}
          onCombinationSelect={handleCombinationSelect}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />
        {viewMode === 'edit' && (
          <div className="columns-container">
            <HeaderList 
              channel={selectedChannel} 
              onHeaderSelect={handleHeaderSelect} 
              selectedHeader={selectedHeader}
              similarityGroups={similarityGroups}
              headerSearchTerm={headerSearchTerm}
            />
            <HeaderSimilarityList 
              channel={selectedChannel} 
              selectedHeader={similarityViewHeader} // Use the similarity-specific header
              onSimilarityGroupUpdate={handleSimilarityGroupUpdate}
              groups={similarityGroups}
              onRemoveGroup={handleRemoveGroup}
            />
            <HeaderCombinationList 
              channel={selectedChannel} 
              selectedHeader={selectedHeader} // Keep using the main selectedHeader
              onCombinationSelect={handleCombinationSelect}
              selectedCombination={selectedCombination}
              onHeaderSearch={handleHeaderSearch}
              onHeaderSimilarityRequest={handleHeaderSimilarityRequest}
            />
            <HeaderCombinationTextList 
              channel={selectedChannel} 
              selectedCombination={selectedCombination} 
            />
          </div>
        )}
        {viewMode === 'browse' && (
          <div className="browse-container">
            {/* Empty container for browse mode */}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
