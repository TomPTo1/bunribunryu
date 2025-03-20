import React, { useState, useEffect } from 'react';
import { fetchHeaderCombinationTextList } from '../services/api';
import './HeaderCombinationTextList.css';

const HeaderCombinationTextList = ({ channel, selectedCombination }) => {
  const [combinationTexts, setCombinationTexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('텍스트조회');
  const [sectionName, setSectionName] = useState('');

  useEffect(() => {
    const getCombinationTexts = async () => {
      if (!channel || !selectedCombination) return;
      
      setLoading(true);
      try {
        const response = await fetchHeaderCombinationTextList(channel, [selectedCombination]);
        console.log('Combination texts response:', response);
        setCombinationTexts(response.list || []);
        setError(null);
      } catch (err) {
        setError(err.message);
        setCombinationTexts([]);
      } finally {
        setLoading(false);
      }
    };

    getCombinationTexts();
  }, [channel, selectedCombination]);

  const handleSectionNameChange = (e) => {
    setSectionName(e.target.value);
  };

  const handleCreateSection = () => {
    if (!sectionName.trim()) {
      alert('섹션명을 입력해주세요.');
      return;
    }
    
    // 여기에 섹션 생성 로직을 추가합니다
    console.log('섹션 생성:', sectionName, '조합:', selectedCombination);
    // TODO: API 호출 및 성공 후 처리
    alert(`"${sectionName}" 섹션이 생성되었습니다.`);
    setSectionName('');
  };

  if (!channel || !selectedCombination) {
    return (
      <div className="column-container">
        <div className="column-empty">채널과 헤더 조합을 선택해주세요.</div>
      </div>
    );
  }

  const renderSectionCreationArea = () => {
    // Count of selected combinations (currently only one)
    const selectedCount = selectedCombination ? 1 : 0;
    
    return (
      <div className="section-creation-area">
        <div className="section-creation-header">
          <div className="section-creation-title">섹션 생성 영역</div>
          <div className="selected-combination-count">선택된 조합: {selectedCount}개</div>
        </div>
        <div className="section-creation-form">
          <div className="section-input-group">
            <label htmlFor="section-name">섹션명:</label>
            <input 
              type="text" 
              id="section-name" 
              value={sectionName}
              onChange={handleSectionNameChange}
              placeholder="새 섹션 이름을 입력하세요"
              className="section-name-input"
            />
          </div>
          <button 
            className="create-section-btn"
            onClick={handleCreateSection}
            disabled={!sectionName.trim()}
          >
            섹션 등록
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="column-container">
      <h2 className="column-title">섹션 생성</h2>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === '텍스트조회' ? 'active' : ''}`}
          onClick={() => setActiveTab('텍스트조회')}
        >
          텍스트조회
        </button>
      </div>
      
      {renderSectionCreationArea()}
      
      <div className="column-content">
        {loading ? (
          <div className="loading">로딩 중...</div>
        ) : error ? (
          <div className="error">에러: {error}</div>
        ) : combinationTexts && combinationTexts.length > 0 ? (
          combinationTexts.map((item, index) => (
            <div
              key={index}
              className="column-item"
            >
              <div className="item-text">{item.text}</div>
              <div className="item-count">({item.count})</div>
            </div>
          ))
        ) : (
          <div className="column-empty">헤더 조합 텍스트 정보가 없습니다.</div>
        )}
      </div>
    </div>
  );
};

export default HeaderCombinationTextList; 