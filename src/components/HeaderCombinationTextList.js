import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchHeaderCombinationTextList } from '../services/api';
import './HeaderCombinationTextList.css';

const HeaderCombinationTextList = ({ channel, selectedCombination, selectedCombinations = [] }) => {
  const [combinationTexts, setCombinationTexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('텍스트조회');
  const [sectionName, setSectionName] = useState('');
  // Mining states
  const [miningData, setMiningData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [minSupport, setMinSupport] = useState(0.01);
  const [minConfidence, setMinConfidence] = useState(0.01);
  const [maxDepth, setMaxDepth] = useState(100);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const settingsPopupRef = useRef(null);

  // 실제 사용할 조합 목록 결정 (단일 selectedCombination과 다중 selectedCombinations 지원)
  const effectiveCombinations = useMemo(() => {
    // 다중 선택이 있는 경우 우선 사용
    if (selectedCombinations && selectedCombinations.length > 0) {
      return selectedCombinations;
    }
    // 다중 선택이 없고 단일 선택이 있는 경우
    if (selectedCombination) {
      return [selectedCombination];
    }
    // 아무것도 선택되지 않은 경우
    return [];
  }, [selectedCombination, selectedCombinations]);

  useEffect(() => {
    const getCombinationTexts = async () => {
      if (!channel || effectiveCombinations.length === 0) return;
      
      setLoading(true);
      try {
        // 모든 선택된 조합을 API에 전달
        const response = await fetchHeaderCombinationTextList(channel, effectiveCombinations);
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
  }, [channel, effectiveCombinations]);

  // Generate FP-growth tree when combination texts change
  useEffect(() => {
    if (combinationTexts && combinationTexts.length > 0 && activeTab === '마이닝') {
      generateFPGrowthTree(combinationTexts);
    } else {
      setMiningData(null);
    }
  }, [combinationTexts, activeTab, minSupport, minConfidence, maxDepth]);

  // Close settings popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsPopupRef.current && !settingsPopupRef.current.contains(event.target)) {
        setShowSettingsPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Function to generate FP-growth tree from text data
  const generateFPGrowthTree = (textData) => {
    if (!textData || textData.length === 0) {
      setMiningData(null);
      return;
    }

    // Step 1: Create transactions by splitting each text 
    // If text contains '>' delimiter, split by it, otherwise use the whole text as a single item
    const transactions = textData
      .filter(item => item.text)
      .map(item => {
        if (item.text.includes('>')) {
          return item.text
            .split('>')
            .map(segment => segment.trim())
            .filter(segment => segment.length > 0);
        } else {
          // If no delimiter, use the whole text as a single item
          return [item.text.trim()];
        }
      })
      .filter(transaction => transaction.length > 0);

    // Step 2: Count item frequencies
    const itemCounts = {};
    const totalTransactions = transactions.length;
    
    transactions.forEach(transaction => {
      transaction.forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1;
      });
    });

    // Calculate minimum support threshold - use absolute minimum of 2
    const minSupportCount = Math.max(2, Math.floor(totalTransactions * minSupport));
    
    // Get frequent items sorted by frequency
    const frequentItems = Object.keys(itemCounts)
      .filter(item => itemCounts[item] >= minSupportCount)
      .sort((a, b) => itemCounts[b] - itemCounts[a]);
    
    // Create single tree structure with most frequent item as root
    if (frequentItems.length === 0) {
      setMiningData([]);
      return;
    }
    
    // FP-GROWTH for a single hierarchical tree
    // Step 3: Reorder transactions based on frequency
    const orderedTransactions = transactions.map(transaction => {
      return transaction
        .filter(item => frequentItems.includes(item))
        .sort((a, b) => itemCounts[b] - itemCounts[a]);
    }).filter(transaction => transaction.length > 0);
    
    // Create a single root node for the most frequent item
    const rootItem = frequentItems[0];
    
    const singleTreeRoot = {
      id: rootItem,
      name: rootItem,
      support: itemCounts[rootItem],
      confidence: itemCounts[rootItem] / totalTransactions,
      children: []
    };
    
    // Create a mapping of patterns to their support count
    const patternSupports = {};
    
    // First pass - gather all pattern supports
    orderedTransactions.forEach(transaction => {
      if (transaction.length < 2) return;
      
      for (let i = 0; i < transaction.length; i++) {
        for (let j = i + 1; j < transaction.length; j++) {
          const pattern = [transaction[i], transaction[j]];
          const key = pattern.join('-');
          patternSupports[key] = (patternSupports[key] || 0) + 1;
        }
      }
    });
    
    // Then build tree with those precomputed pattern supports
    const buildOrderedFPTree = (currentNode, level) => {
      if (level >= maxDepth) return;
      
      const currentItemIndex = frequentItems.indexOf(currentNode.name);
      
      for (let i = currentItemIndex + 1; i < frequentItems.length; i++) {
        const nextItem = frequentItems[i];
        
        // Check if the pair meets minimum support
        const patternKey = [currentNode.name, nextItem].join('-');
        const support = patternSupports[patternKey] || 0;
        
        if (support >= Math.max(2, minSupportCount)) {
          const confidence = support / itemCounts[currentNode.name];
          
          if (confidence >= (level > 2 ? minConfidence/2 : minConfidence)) {
            const childNode = {
              id: `${currentNode.id}-${nextItem}`,
              name: nextItem,
              support: support,
              confidence: confidence,
              children: []
            };
            
            currentNode.children.push(childNode);
            buildOrderedFPTree(childNode, level + 1);
          }
        }
      }
      
      // Sort children by support
      if (currentNode.children.length > 0) {
        currentNode.children.sort((a, b) => b.support - a.support);
      }
    };
    
    // Start building the tree from the root
    buildOrderedFPTree(singleTreeRoot, 1);
    
    // Initialize expanded nodes for visualization - initially expand all nodes
    const initialExpanded = {};
    
    // Function to recursively expand all nodes
    const expandAllNodes = (node) => {
      if (!node) return;
      
      initialExpanded[node.id] = true;
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => expandAllNodes(child));
      }
    };
    
    // Start expanding from the root
    expandAllNodes(singleTreeRoot);
    
    // Set the result as a single-item array containing the root
    setMiningData([singleTreeRoot]);
    setExpandedNodes(initialExpanded);
  };

  // Toggle node expansion
  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Select a node and update section name
  const handleNodeSelect = (node) => {
    const isDeselecting = node === selectedNode;
    setSelectedNode(isDeselecting ? null : node);
    
    // 노드 선택 시 섹션명 입력창에 노드 이름 설정
    if (!isDeselecting) {
      setSectionName(node.name);
    }
  };

  // Toggle all nodes
  const toggleAllNodes = (expand) => {
    if (!miningData || miningData.length === 0) return;
    
    const newExpandedState = {};
    
    const processNode = (node) => {
      if (!node) return;
      
      newExpandedState[node.id] = expand;
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => processNode(child));
      }
    };
    
    miningData.forEach(root => processNode(root));
    setExpandedNodes(newExpandedState);
  };

  const handleSupportChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setMinSupport(value);
    }
  };

  const handleConfidenceChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      setMinConfidence(value);
    }
  };

  const handleDepthChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setMaxDepth(value);
    }
  };

  const handleSectionNameChange = (e) => {
    setSectionName(e.target.value);
  };

  // Render tree node with improved display
  const renderTreeNode = (node, level = 0) => {
    if (!node) return null;
    
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode && selectedNode.id === node.id;
    
    return (
      <div 
        className={`itemset-node ${isSelected ? 'selected' : ''}`} 
        key={node.id}
      >
        <div 
          className="itemset-header" 
          onClick={() => handleNodeSelect(node)}
          title={`노드 선택 - 섹션명으로 설정: ${node.name}`}
        >
          <div className="node-prefix" style={{ width: `${level * 20}px` }}>
            {hasChildren && (
              <button 
                className="toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                title={isExpanded ? "노드 접기" : "노드 펼치기"}
              >
                {isExpanded ? '▼' : '►'}
              </button>
            )}
          </div>
          <div className="node-content">
            <div className="node-name" title={node.name}>
              {node.name}
            </div>
            <div className="node-metrics">
              <span className="metric-badge support" title={`지지도: ${Math.round(node.support)} (${(node.support / (miningData?.[0]?.support || 1) * 100).toFixed(1)}%)`}>
                지지도: {Math.round(node.support)}
              </span>
              <span className="metric-badge confidence" title={`신뢰도: ${(node.confidence * 100).toFixed(1)}%`}>
                신뢰도: {(node.confidence * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="itemset-children">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render settings popup
  const renderSettingsPopup = () => {
    if (!showSettingsPopup) return null;
    
    return (
      <div className="settings-popup-overlay">
        <div className="settings-popup" ref={settingsPopupRef}>
          <div className="settings-popup-header">
            <h3>마이닝 설정</h3>
            <button 
              className="close-popup-btn"
              onClick={() => setShowSettingsPopup(false)}
            >
              ✕
            </button>
          </div>
          <div className="settings-popup-content">
            <div className="setting-group">
              <label>최소 지지도:</label>
              <input 
                type="number" 
                min="0.01" 
                max="1" 
                step="0.01" 
                value={minSupport} 
                onChange={handleSupportChange}
              />
              <span className="setting-description">
                전체 거래 중 해당 패턴이 나타나는 비율 (0.01 ~ 1)
              </span>
            </div>
            <div className="setting-group">
              <label>최소 신뢰도:</label>
              <input 
                type="number" 
                min="0.01" 
                max="1" 
                step="0.01" 
                value={minConfidence} 
                onChange={handleConfidenceChange}
              />
              <span className="setting-description">
                선행 항목이 있을 때 결과 항목이 나타날 확률 (0.01 ~ 1)
              </span>
            </div>
            <div className="setting-group">
              <label>최대 깊이:</label>
              <input 
                type="number" 
                min="1" 
                max="100" 
                step="1" 
                value={maxDepth} 
                onChange={handleDepthChange}
              />
              <span className="setting-description">
                패턴의 최대 길이 설정 (1 ~ 100)
              </span>
            </div>
          </div>
          <div className="settings-popup-footer">
            <button 
              className="apply-settings-btn"
              onClick={() => setShowSettingsPopup(false)}
            >
              적용
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render mining view
  const renderMiningView = () => {
    return (
      <div className="column-content-inner">
        <div className="mining-container">
          <div className="mining-header">
            <div className="mining-header-title">FP-Growth 패턴 분석</div>
            <div className="mining-actions">
              <button 
                className="create-section-btn small-btn"
                onClick={() => setShowSettingsPopup(true)}
                title="마이닝 설정 변경"
              >
                설정
              </button>
              <button
                className="action-btn"
                onClick={() => toggleAllNodes(true)}
                title="모든 노드 펼치기"
              >
                ▼
              </button>
              <button
                className="action-btn"
                onClick={() => toggleAllNodes(false)}
                title="모든 노드 접기"
              >
                ▲
              </button>
            </div>
          </div>
          
          <div className="mining-content">
            {loading ? (
              <div className="loading">로딩 중...</div>
            ) : error ? (
              <div className="error">에러: {error}</div>
            ) : miningData && miningData.length > 0 ? (
              <div className="itemset-tree-container">
                {miningData.map(root => renderTreeNode(root))}
              </div>
            ) : (
              <div className="column-empty">마이닝 데이터가 없습니다.</div>
            )}
          </div>
        </div>
        {renderSettingsPopup()}
      </div>
    );
  };

  const handleCreateSection = () => {
    if (!sectionName.trim()) {
      alert('섹션명을 입력해주세요.');
      return;
    }
    
    // 여기에 섹션 생성 로직을 추가합니다
    console.log('섹션 생성:', sectionName, '조합:', effectiveCombinations);
    // TODO: API 호출 및 성공 후 처리
    alert(`"${sectionName}" 섹션이 생성되었습니다.`);
    setSectionName('');
  };

  if (!channel || effectiveCombinations.length === 0) {
    return (
      <div className="column-container">
        <div className="column-empty">채널과 헤더 조합을 선택해주세요.</div>
      </div>
    );
  }

  const renderSectionCreationArea = () => {
    // Count of selected combinations
    const selectedCount = effectiveCombinations.length;
    
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
            <button 
              className="create-section-btn"
              onClick={handleCreateSection}
              disabled={!sectionName.trim()}
            >
              섹션 등록
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="column-container">
      <h2 className="column-title">섹션 생성</h2>
      
      {renderSectionCreationArea()}
      
      <div className="column-content">
        {activeTab === '텍스트조회' ? (
          loading ? (
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
          )
        ) : (
          renderMiningView()
        )}
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === '마이닝' ? 'active' : ''}`}
          onClick={() => setActiveTab('마이닝')}
        >
          마이닝
        </button>
        <button 
          className={`tab ${activeTab === '텍스트조회' ? 'active' : ''}`}
          onClick={() => setActiveTab('텍스트조회')}
        >
          텍스트조회
        </button>
      </div>
    </div>
  );
};

export default HeaderCombinationTextList; 