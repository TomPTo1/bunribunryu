import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { fetchHeaderList, searchHeaderList, fetchHeaderSimilarityList } from '../services/api';
import './Column.css';

const HeaderList = forwardRef(({ 
  channel, 
  onHeaderSelect, 
  selectedHeader, 
  similarityGroups, 
  headerSearchTerm, 
  onSimilarityGroupUpdate,
  onRemoveGroup,
  similarityViewTrigger,
  onSimilarityViewProcessed
}, ref) => {
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'unprocessed'
  const [headerToGroupMap, setHeaderToGroupMap] = useState({});
  const [groupedHeaders, setGroupedHeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [ignoreHeaderSearchTerm, setIgnoreHeaderSearchTerm] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);
  
  // Similar header selection states
  const [similarHeaders, setSimilarHeaders] = useState([]);
  const [filteredSimilarHeaders, setFilteredSimilarHeaders] = useState([]);
  const [selectedSimilarityGroup, setSelectedSimilarityGroup] = useState([]);
  const [representativeHeader, setRepresentativeHeader] = useState(null);
  const [isSelectedGroupCollapsed, setIsSelectedGroupCollapsed] = useState(false);
  const [similarHeaderLoading, setSimilarHeaderLoading] = useState(false);
  const [similarHeaderError, setSimilarHeaderError] = useState(null);
  const [currentSimilarityHeader, setCurrentSimilarityHeader] = useState(null);
  
  // 마지막 클릭된 헤더와 타임스탬프를 저장
  const lastClickRef = useRef({ header: null, timestamp: 0 });

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    viewSimilarHeaders: (header) => {
      fetchSimilarHeaders(header);
      setCurrentSimilarityHeader(header);
    }
  }));

  // Handle headerSearchTerm updates from right-clicks in other components
  useEffect(() => {
    if (!headerSearchTerm || ignoreHeaderSearchTerm) {
      return;
    }
    
    setSearchTerm(headerSearchTerm);
    setIsSearchMode(true);
  }, [headerSearchTerm, ignoreHeaderSearchTerm]);
  
  // Handle similarity view trigger from HeaderCombinationList
  useEffect(() => {
    if (similarityViewTrigger && channel) {
      fetchSimilarHeaders(similarityViewTrigger);
      setCurrentSimilarityHeader(similarityViewTrigger);
      
      // Call the callback to reset the trigger
      if (onSimilarityViewProcessed) {
        onSimilarityViewProcessed();
      }
    }
  }, [similarityViewTrigger, channel]);

  useEffect(() => {
    if (!channel) return;
    
    const getHeaders = async () => {
      setLoading(true);
      try {
        let response;
        if (isSearchMode && searchTerm.trim()) {
          // Use search API with keyword
          response = await searchHeaderList(channel, searchTerm);
        } else {
          // Use regular API without keyword
          response = await fetchHeaderList(channel);
        }
        console.log('Header list response:', response);
        setHeaders(response.list || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        setHeaders([]);
      } finally {
        setLoading(false);
      }
    };

    getHeaders();
  }, [channel, searchTerm, isSearchMode]);

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsSearchMode(true);
      performApiSearch(searchTerm);
    } else {
      setIsSearchMode(false);
    }
  };

  // Handle search input change with debouncing
  const handleSimilarHeaderSearch = (e) => {
    const searchValue = e.target.value;
    setSearchTerm(searchValue);
    
    // Clear any existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (!searchValue.trim()) {
      setIsSearchMode(false);
      
      // If search is cleared, revert to showing similar headers for the current header
      if (currentSimilarityHeader) {
        fetchSimilarHeaders(currentSimilarityHeader);
      } else {
        setFilteredSimilarHeaders([]);
      }
    } else {
      setIsSearchMode(true);
      
      // Set a new timeout to delay the API call
      const timeoutId = setTimeout(() => {
        performApiSearch(searchValue);
      }, 500); // 500ms debounce delay
      
      setSearchTimeout(timeoutId);
    }
  };
  
  // Perform API search for headers
  const performApiSearch = async (query) => {
    if (!channel || !query.trim()) return;
    
    setSimilarHeaderLoading(true);
    try {
      // Use the searchHeaderList API instead of local filtering
      const response = await searchHeaderList(channel, query);
      console.log('Search results:', response);
      const headerList = response.list || [];
      setSimilarHeaders(headerList);
      setFilteredSimilarHeaders(headerList);
      setSimilarHeaderError(null);
    } catch (err) {
      setSimilarHeaderError(`검색 오류: ${err.message}`);
      setSimilarHeaders([]);
      setFilteredSimilarHeaders([]);
    } finally {
      setSimilarHeaderLoading(false);
    }
  };
  
  // Clear search button handler with proper state updates
  const handleClearSearch = () => {
    setSearchTerm('');
    setIsSearchMode(false);
    setIgnoreHeaderSearchTerm(true);
    
    // If clearing search, reload the original similar headers
    if (currentSimilarityHeader) {
      fetchSimilarHeaders(currentSimilarityHeader);
    }
    
    // Also notify parent to clear headerSearchTerm
    if (onSimilarityViewProcessed) {
      onSimilarityViewProcessed(true);
    }
  };

  // 유사군이 변경될 때마다 관련 데이터를 업데이트
  useEffect(() => {
    console.log('HeaderList - similarityGroups 변경감지:', similarityGroups);
    
    // 유사군에 포함된 모든 헤더 추출
    const newGroupedHeaders = similarityGroups && similarityGroups.length > 0
      ? similarityGroups.flatMap(group => 
          // 대표어를 제외한 헤더만 포함
          group.items
            .filter(item => item.header !== group.representative)
            .map(item => item.header)
        )
      : [];
    
    // 각 헤더별로 유사군 매핑 생성
    const newHeaderToGroupMap = {};
    if (similarityGroups && similarityGroups.length > 0) {
      similarityGroups.forEach((group, idx) => {
        console.log(`HeaderList - 유사군 #${idx + 1} 처리:`, group.representative, group.items.length);
        
        // 대표어에 유사군 카운트 태그 추가
        newHeaderToGroupMap[group.representative] = {
          isRepresentative: true,
          count: group.items.length
        };
        
        // 대표어가 아닌 항목들은 매핑에서 제외 (목록에 표시되지 않음)
        group.items.forEach(item => {
          if (item.header !== group.representative) {
            newHeaderToGroupMap[item.header] = {
              representative: group.representative,
              count: group.items.length
            };
          }
        });
      });
    }
    
    console.log('HeaderList - headerToGroupMap 업데이트:', newHeaderToGroupMap);
    console.log('HeaderList - groupedHeaders 업데이트:', newGroupedHeaders);
    
    setGroupedHeaders(newGroupedHeaders);
    setHeaderToGroupMap(newHeaderToGroupMap);
  }, [similarityGroups]);

  const fetchSimilarHeaders = async (header) => {
    if (!channel || !header) return;
    
    setSimilarHeaderLoading(true);
    try {
      const response = await fetchHeaderSimilarityList(channel, header);
      console.log('Similar headers response:', response);
      const headerList = response.list || [];
      setSimilarHeaders(headerList);
      setFilteredSimilarHeaders(headerList);
      setSimilarHeaderError(null);
    } catch (err) {
      setSimilarHeaderError(err.message);
      setSimilarHeaders([]);
      setFilteredSimilarHeaders([]);
    } finally {
      setSimilarHeaderLoading(false);
    }
  };
  
  const handleSimilarHeaderSelect = (header, isRightClick = false) => {
    // 중복 클릭 방지 및 디바운싱
    const now = Date.now();
    if (lastClickRef.current.header === header && 
        now - lastClickRef.current.timestamp < 500) {
      // 0.5초 이내에 동일한 헤더를 다시 클릭한 경우 무시
      return;
    }
    
    // 클릭 정보 업데이트
    lastClickRef.current = { header, timestamp: now };
    
    // 버그 수정: 중복 호출 방지를 위한 체크 추가
    const headerObj = similarHeaders.find(h => h.header === header);
    
    if (!headerObj) return; // 헤더가 존재하지 않으면 무시

    if (isRightClick) {
      // 우클릭 처리 - 유사어 -> 대표어 -> 선택 해제 순환
      const isAlreadySelected = selectedSimilarityGroup.some(h => h.header === header);
      const isRepresentative = representativeHeader === header;
      
      if (!isAlreadySelected) {
        // 선택되지 않은 상태 -> 유사어로 추가
        const newGroup = [...selectedSimilarityGroup, headerObj];
        setSelectedSimilarityGroup(newGroup);
      } else if (isAlreadySelected && !isRepresentative) {
        // 유사어 상태 -> 대표어로 변경
        setRepresentativeHeader(header);
      } else if (isAlreadySelected && isRepresentative) {
        // 대표어 상태 -> 선택 해제
        const newGroup = selectedSimilarityGroup.filter(h => h.header !== header);
        setSelectedSimilarityGroup(newGroup);
        
        // 대표어가 해제된 경우 새로운 대표어 설정
        if (newGroup.length > 0) {
          setRepresentativeHeader(newGroup[0].header);
        } else {
          setRepresentativeHeader(null);
        }
      }
    } else {
      // 좌클릭 처리 - HeaderCombinationList API 호출
      onHeaderSelect && onHeaderSelect(header);
    }
  };
  
  const handleRemoveFromGroup = (header) => {
    setSelectedSimilarityGroup(prev => prev.filter(h => h.header !== header));
    // If representative header is removed, reset it
    if (representativeHeader === header) {
      setRepresentativeHeader(selectedSimilarityGroup.length > 1 ? selectedSimilarityGroup[0].header : null);
    }
  };
  
  const handleSetRepresentative = (header) => {
    setRepresentativeHeader(header);
  };
  
  const handleSaveGroup = () => {
    if (selectedSimilarityGroup.length > 0 && representativeHeader) {
      // 유사군 데이터를 일관된 형식으로 변환
      const groupData = selectedSimilarityGroup.map(item => ({
        header: item.header,
        // 기타 필요한 속성 유지
        ...item
      }));
      
      // 선택한 그룹에 현재 선택한 헤더가 없다면 추가
      const hasCurrentHeader = groupData.some(item => item.header === currentSimilarityHeader);
      if (!hasCurrentHeader && currentSimilarityHeader) {
        groupData.push({ header: currentSimilarityHeader });
      }
      
      console.log('저장할 유사군 데이터:', groupData, representativeHeader);
      
      onSimilarityGroupUpdate && onSimilarityGroupUpdate(
        groupData, 
        representativeHeader
      );
    }
  };

  // 유사군에 속하지 않거나 대표어인 헤더만 표시
  const filteredHeaders = headers.filter(item => 
    !groupedHeaders.includes(item.header)
  );

  // 유사군이 있는 헤더 (대표어)와 없는 헤더를 구분
  const headersWithGroups = filteredHeaders.filter(item => 
    headerToGroupMap[item.header] && headerToGroupMap[item.header].isRepresentative
  );
  
  const headersWithoutGroups = filteredHeaders.filter(item => 
    !headerToGroupMap[item.header] || !headerToGroupMap[item.header].isRepresentative
  );

  if (!channel) {
    return (
      <div className="column-container">
        <div className="column-empty">채널을 선택해주세요.</div>
      </div>
    );
  }

  // Create a list of all headers that are already part of saved groups
  const savedGroupHeaders = similarityGroups ? similarityGroups.flatMap(group => 
    group.items.map(item => item.header)
  ) : [];

  return (
    <div className="column-container similarity-view">
      <h2 className="column-title">
        헤더명 관리
      </h2>
      
      <form onSubmit={handleSearchSubmit} className="search-form">
        <div className="search-input-container">
          <span className="search-icon">&#128269;</span>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSimilarHeaderSearch}
            placeholder="헤더 검색"
            className="search-input"
            readOnly={false} 
          />
          {isSearchMode && (
            <div className="search-result-count">
              {filteredSimilarHeaders.length}건
            </div>
          )}
          {isSearchMode && (
            <button 
              className="clear-search-button" 
              onClick={handleClearSearch}
              title="검색 취소"
            >
              ✕
            </button>
          )}
        </div>
      </form>
      
      <div className="column-content">
        <div className="similarity-vertical-layout">
          <div className="similarity-header-section">
            <h3 className="group-subtitle">
              유사 헤더 선택
              {selectedSimilarityGroup.length >= 2 && representativeHeader && (
                <button 
                  className="save-group-btn action-btn header-action-btn"
                  onClick={handleSaveGroup}
                  title="현재 선택된 유사 헤더를 그룹으로 저장합니다"
                >
                  유사군 저장 ({selectedSimilarityGroup.length}개)
                </button>
              )}
            </h3>
            
            <div className="click-guide">
              <span className="guide-item"><span className="guide-icon">🖱️</span> 좌클릭: 헤더 조합 로드</span>
              <span className="guide-item"><span className="guide-icon">🖱️</span> 우클릭: 유사어→대표어→해제 순환</span>
            </div>
            
            <div className="similarity-items">
              {similarHeaderLoading ? (
                <div className="loading">로딩 중...</div>
              ) : similarHeaderError ? (
                <div className="error">에러: {similarHeaderError}</div>
              ) : filteredSimilarHeaders && filteredSimilarHeaders.length > 0 ? (
                filteredSimilarHeaders.map((item, index) => {
                  // 이미 선택된 항목인지 확인
                  const isSelected = selectedSimilarityGroup.some(h => h.header === item.header);
                  // 대표 헤더인지 확인
                  const isRepresentative = representativeHeader === item.header;
                  
                  // 이미 저장된 그룹에 있는지 확인
                  const isSavedInGroup = savedGroupHeaders.includes(item.header);
                  
                  // 선택 상태 클래스 결정
                  let statusClass = '';
                  if (isSelected) {
                    statusClass = isRepresentative ? 'representative' : 'similar';
                  } else if (isSavedInGroup) {
                    // 저장된 그룹에 있지만 현재 선택되지 않은 항목
                    const savedGroupInfo = similarityGroups.find(group => 
                      group.items.some(g => g.header === item.header)
                    );
                    if (savedGroupInfo) {
                      statusClass = savedGroupInfo.representative === item.header ? 'saved-representative' : 'saved-similar';
                    }
                  }
                  
                  return (
                    <div 
                      key={index} 
                      className={`similarity-item ${statusClass}`}
                      onClick={() => handleSimilarHeaderSelect(item.header, false)}
                      onContextMenu={(e) => {
                        e.preventDefault(); // 기본 컨텍스트 메뉴 방지
                        handleSimilarHeaderSelect(item.header, true);
                      }}
                    >
                      {item.header}
                      {isSelected && (
                        <span className={`status-badge ${isRepresentative ? 'representative' : 'similar'}`}>
                          {isRepresentative ? '대' : '유'}
                        </span>
                      )}
                      {!isSelected && isSavedInGroup && (
                        <span className="status-badge saved">
                          {similarityGroups.find(group => 
                            group.items.some(g => g.header === item.header) && 
                            group.representative === item.header
                          ) ? '대' : '유'}
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  {isSearchMode 
                    ? '검색 결과가 없습니다.' 
                    : (currentSimilarityHeader 
                      ? '유사한 헤더가 없습니다.' 
                      : '헤더를 선택하면 유사 헤더 목록이 표시됩니다.')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          검색
        </button>
        <button 
          className={`tab ${activeTab === 'unprocessed' ? 'active' : ''}`}
          onClick={() => setActiveTab('unprocessed')}
        >
          미처리
        </button>
      </div>
    </div>
  );
});

export default HeaderList; 