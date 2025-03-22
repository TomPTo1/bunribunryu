import React, { useState, useRef } from 'react';
import './App.css';
import HeaderList from './components/HeaderList';
import HeaderCombinationList from './components/HeaderCombinationList';
import HeaderCombinationTextList from './components/HeaderCombinationTextList';
import PathNavigation from './components/PathNavigation';
import BrowseMode from './components/browse/BrowseMode';

function App() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedHeader, setSelectedHeader] = useState(null);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [selectedCombinations, setSelectedCombinations] = useState([]);
  const [similarityGroups, setSimilarityGroups] = useState([]);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'browse'
  const [headerSearchTerm, setHeaderSearchTerm] = useState('');
  const [similarityViewTrigger, setSimilarityViewTrigger] = useState(null);
  
  // HeaderList 컴포넌트 ref
  const headerListRef = useRef(null);

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setSelectedHeader(null); // Reset header selection when changing channel
    setSelectedCombination(null); // Reset combination selection
    setSelectedCombinations([]); // Reset multiple combination selection
  };

  const handleHeaderSelect = (header) => {
    setSelectedHeader(header);
    setSelectedCombination(null); // Reset combination selection when changing header
    setSelectedCombinations([]); // Reset multiple combination selection
  };

  const handleCombinationSelect = (combination) => {
    setSelectedCombination(combination);
  };

  const handleMultipleCombinationsSelect = (combinations) => {
    setSelectedCombinations(combinations || []);
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
      console.log(`헤더 검색 요청: ${header}`);
    }
  };
  
  // 항목 조합에서 우클릭으로 유사헤더 보기 요청 처리
  const handleHeaderSimilarityRequest = (header) => {
    if (selectedChannel && header) {
      // 유사헤더 보기 트리거 설정
      setSimilarityViewTrigger(header);
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
              ref={headerListRef}
              channel={selectedChannel} 
              onHeaderSelect={handleHeaderSelect} 
              selectedHeader={selectedHeader}
              similarityGroups={similarityGroups}
              headerSearchTerm={headerSearchTerm}
              onSimilarityGroupUpdate={handleSimilarityGroupUpdate}
              onRemoveGroup={handleRemoveGroup}
              similarityViewTrigger={similarityViewTrigger}
              onSimilarityViewProcessed={() => setSimilarityViewTrigger(null)}
            />
            <HeaderCombinationList 
              channel={selectedChannel} 
              selectedHeader={selectedHeader}
              onCombinationSelect={handleCombinationSelect}
              selectedCombination={selectedCombination}
              onHeaderSearch={handleHeaderSearch}
              onHeaderSimilarityRequest={handleHeaderSimilarityRequest}
              onMultipleCombinationsSelect={handleMultipleCombinationsSelect}
            />
            <HeaderCombinationTextList 
              channel={selectedChannel} 
              selectedCombination={selectedCombination}
              selectedCombinations={selectedCombinations}
            />
          </div>
        )}
        {viewMode === 'browse' && (
          <div className="browse-container">
            <BrowseMode />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
