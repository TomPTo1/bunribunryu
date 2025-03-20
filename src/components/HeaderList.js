import React, { useState, useEffect } from 'react';
import { fetchHeaderList, searchHeaderList } from '../services/api';
import './Column.css';

const HeaderList = ({ channel, onHeaderSelect, selectedHeader, similarityGroups, headerSearchTerm }) => {
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'withGroup', or 'withoutGroup'
  const [headerToGroupMap, setHeaderToGroupMap] = useState({});
  const [groupedHeaders, setGroupedHeaders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Handle headerSearchTerm updates from right-clicks in other components
  useEffect(() => {
    if (headerSearchTerm && headerSearchTerm !== searchTerm) {
      setSearchTerm(headerSearchTerm);
      setIsSearchMode(true);
    }
  }, [headerSearchTerm, searchTerm]);

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
    } else {
      setIsSearchMode(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) {
      setIsSearchMode(false);
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

  // 활성 탭에 따라 표시할 헤더 목록 선택
  let displayHeaders = filteredHeaders;
  if (activeTab === 'withGroup') {
    displayHeaders = headersWithGroups;
  } else if (activeTab === 'withoutGroup') {
    displayHeaders = headersWithoutGroups;
  }

  if (!channel) {
    return (
      <div className="column-container">
        <div className="column-empty">채널을 선택해주세요.</div>
      </div>
    );
  }

  return (
    <div className="column-container">
      <h2 className="column-title">
        헤더 목록
        {/* : {channel} */}
      </h2>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          전체 ({filteredHeaders.length})
        </button>
        <button 
          className={`tab ${activeTab === 'withGroup' ? 'active' : ''}`}
          onClick={() => setActiveTab('withGroup')}
        >
          유사군 있음 ({headersWithGroups.length})
        </button>
        <button 
          className={`tab ${activeTab === 'withoutGroup' ? 'active' : ''}`}
          onClick={() => setActiveTab('withoutGroup')}
        >
          유사군 없음 ({headersWithoutGroups.length})
        </button>
      </div>
      
      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="검색어를 입력하세요"
          className="search-input"
        />
        <button type="submit" className="search-button">검색</button>
      </form>
      
      {isSearchMode && (
        <div className="search-status">
          "{searchTerm}" 검색 결과 {headers.length}건
          <button 
            className="clear-search-button" 
            onClick={() => {
              setSearchTerm('');
              setIsSearchMode(false);
            }}
          >
            검색 취소
          </button>
        </div>
      )}
      
      <div className="column-content">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : error ? (
          <div className="error">에러: {error}</div>
        ) : displayHeaders.length > 0 ? (
          displayHeaders.map((item, index) => {
            // 각 헤더 항목 처리 시 로그 추가
            const hasGroupInfo = headerToGroupMap[item.header];
            const isRepresentative = hasGroupInfo && headerToGroupMap[item.header].isRepresentative;
            const groupCount = isRepresentative ? headerToGroupMap[item.header].count : 0;
            
            if (isRepresentative) {
              console.log(`헤더 렌더링 - 대표어 표시: ${item.header}, 유사군 수: ${groupCount}`);
            }
            
            return (
              <div
                key={index}
                className={`column-item ${selectedHeader === item.header ? 'selected' : ''}`}
                onClick={() => onHeaderSelect(item.header)}
              >
                {item.header}
                {isRepresentative && (
                  <span className="similarity-tag" title={`${groupCount}개의 유사어가 있습니다`}>
                    유사군 {groupCount}
                  </span>
                )}
                {hasGroupInfo && !isRepresentative && (
                  <span className="similarity-tag" title={`대표어: ${headerToGroupMap[item.header].representative}`}>
                    유사군
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="column-empty">
            {activeTab === 'withGroup' ? '유사군이 있는 헤더가 없습니다.' : 
             activeTab === 'withoutGroup' ? '유사군이 없는 헤더가 없습니다.' : 
             '헤더 정보가 없습니다.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderList; 