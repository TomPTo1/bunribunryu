import React, { useState, useEffect, useRef, useCallback } from 'react';

const MiningView = ({ combinationHeaders, loading, error, testMode, onPatternSelect }) => {
  const [miningData, setMiningData] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [highlightedPattern, setHighlightedPattern] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [algorithm, setAlgorithm] = useState('fpgrowth'); // Only use FP-Growth
  const [minSupport, setMinSupport] = useState(0.01); // Changed to 1% default
  const [minConfidence, setMinConfidence] = useState(0.01); // Changed to 1% default
  const [maxDepth, setMaxDepth] = useState(100); // No practical limit
  const [currentPath, setCurrentPath] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [ignoredNodes, setIgnoredNodes] = useState([]); // 배열로 변경
  const treeContainerRef = useRef(null);
  
  // Console log for debugging
  useEffect(() => {
    console.log('onPatternSelect prop:', onPatternSelect);
    console.log('combinationHeaders:', combinationHeaders);
  }, [onPatternSelect, combinationHeaders]);

  // 메모이즈된 무시 노드 확인 함수
  const isNodeIgnored = useCallback((nodeId) => {
    return ignoredNodes.includes(nodeId);
  }, [ignoredNodes]);

  // 데이터가 변경될 때마다 마이닝 실행
  useEffect(() => {
    if (combinationHeaders && combinationHeaders.length > 0) {
      generateMiningData(combinationHeaders, algorithm);
    } else {
      setMiningData(null);
    }
  }, [combinationHeaders, algorithm, minSupport, minConfidence, maxDepth]);
  
  // Function to generate mining data using Eclat or FP Growth algorithm
  const generateMiningData = (combinationData, algo = 'eclat') => {
    if (!combinationData || combinationData.length === 0) {
      setMiningData(null);
      return;
    }

    // Step 1: Create transactions from header combinations
    const transactions = combinationData
      .filter(item => item.header_group)
      .map(item => item.header_group.split('|'));

    // Step 2: Count item frequencies for both algorithms
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
    
    // Build a single hierarchical tree structure instead of multiple independent trees
    if (algo === 'eclat') {
      // ECLAT ALGORITHM IMPLEMENTATION
      
      // Step 1: Build vertical tid-lists (transaction ID lists) for each item
      const tidLists = {};
      frequentItems.forEach(item => {
        tidLists[item] = new Set();
      });
      
      transactions.forEach((transaction, tid) => {
        transaction.forEach(item => {
          if (frequentItems.includes(item)) {
            tidLists[item].add(tid);
          }
        });
      });
      
      // Create a single root node representing the most frequent item
      const rootItem = frequentItems[0];
      const rootSupport = tidLists[rootItem].size;
      
      const singleTreeRoot = {
        id: rootItem,
        name: rootItem,
        support: rootSupport,
        confidence: rootSupport / totalTransactions,
        children: []
      };
      
      // Build a tree structure following the frequency order of items
      const buildOrderedTree = (currentNode, currentPrefix, currentTids, level) => {
        if (level >= maxDepth) return;
        
        // Find index of the current node's item in the frequentItems list
        const currentItemIndex = frequentItems.indexOf(currentNode.name);
        
        // Check for next items in the frequency order
        for (let i = currentItemIndex + 1; i < frequentItems.length; i++) {
          const nextItem = frequentItems[i];
          const nextItemTids = tidLists[nextItem];
          
          // Calculate intersection
          const intersection = new Set([...currentTids].filter(tid => nextItemTids.has(tid)));
          const support = intersection.size;
          
          // Add to tree if support is sufficient
          if (support >= Math.max(2, minSupportCount)) {
            const newPrefix = [...currentPrefix, nextItem];
            const confidence = support / currentTids.size;
            
            // Add only if confidence is sufficient (reduced for deeper patterns)
            if (confidence >= (level > 2 ? minConfidence/2 : minConfidence)) {
              const childNode = {
                id: `${currentNode.id}-${nextItem}`,
                name: nextItem,
                support: support,
                confidence: confidence,
                children: []
              };
              
              currentNode.children.push(childNode);
              
              // Recursively build tree with this child as new parent
              buildOrderedTree(childNode, newPrefix, intersection, level + 1);
            }
          }
        }
      };
      
      // Start building the tree from the root
      buildOrderedTree(singleTreeRoot, [rootItem], tidLists[rootItem], 1);
      
      // Initialize expanded nodes for visualization
      const initialExpanded = {};
      initialExpanded[rootItem] = true; // Expand root node
      
      // Expand first level children
      if (singleTreeRoot.children && singleTreeRoot.children.length > 0) {
        singleTreeRoot.children.slice(0, 5).forEach(child => {
          initialExpanded[child.id] = true;
          
          // Also expand first grandchild if available
          if (child.children && child.children.length > 0) {
            initialExpanded[child.children[0].id] = true;
          }
        });
      }
      
      // Set the result as a single-item array containing the root
      setMiningData([singleTreeRoot]);
      setExpandedNodes(initialExpanded);
      
    } else {
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
      };
      
      // Start building the tree from the root
      buildOrderedFPTree(singleTreeRoot, 1);
      
      // Initialize expanded nodes for visualization
      const initialExpanded = {};
      initialExpanded[rootItem] = true; // Expand root node
      
      // Expand first level children
      if (singleTreeRoot.children && singleTreeRoot.children.length > 0) {
        singleTreeRoot.children.slice(0, 5).forEach(child => {
          initialExpanded[child.id] = true;
          
          // Also expand first grandchild if available
          if (child.children && child.children.length > 0) {
            initialExpanded[child.children[0].id] = true;
          }
        });
      }
      
      // Set the result as a single-item array containing the root
      setMiningData([singleTreeRoot]);
      setExpandedNodes(initialExpanded);
    }
  };

  // Function to toggle node expansion
  const toggleNode = (nodeId) => {
    console.log('Toggle node expansion:', nodeId);
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Function to ignore a node
  const ignoreNode = (nodeId) => {
    if (!nodeId) {
      console.warn('ignoreNode: nodeId is undefined');
      return;
    }
    
    console.log('Ignoring node:', nodeId);
    
    // 배열로 상태 업데이트 - React가 확실히 변경을 감지
    setIgnoredNodes(prev => {
      if (prev.includes(nodeId)) {
        return prev; // 이미 무시 중이면 변경하지 않음
      }
      
      const newIgnored = [...prev, nodeId]; // 새 배열 생성
      console.log('New ignored nodes:', newIgnored);
      
      // 피드백 표시
      const parts = nodeId.split('-');
      const nodeName = parts[parts.length - 1];
      showNotification(`'${nodeName}' 노드가 무시됨`, 'ignore');
      
      return newIgnored;
    });
  };
  
  // 알림 표시 함수
  const showNotification = (message, type = 'normal') => {
    // 이전 알림 제거
    const existingNotifications = document.querySelectorAll('.pattern-notification');
    existingNotifications.forEach(n => {
      if (n.parentNode) {
        n.parentNode.removeChild(n);
      }
    });
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = `pattern-notification ${type === 'ignore' ? 'ignore-notification' : ''}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2000);
  };
  
  // Function to get path from node to root
  const getPathToRoot = (nodeId) => {
    const parts = nodeId.split('-');
    const path = [];
    
    for (let i = 0; i < parts.length; i++) {
      const segment = parts.slice(0, i + 1).join('-');
      path.push(segment);
    }
    
    return path.reverse(); // Return path from root to node
  };
  
  // Function to send pattern to API
  const sendPatternToAPI = (node) => {
    console.log('sendPatternToAPI called with node:', node);
    
    if (!node || !node.id) {
      console.warn('Invalid node:', node);
      return;
    }
    
    // Check if callback is provided
    if (typeof onPatternSelect !== 'function') {
      console.warn('onPatternSelect is not a function:', onPatternSelect);
      showNotification('패턴 선택 핸들러가 없습니다', 'ignore');
      return;
    }
    
    // Get full pattern from node ID (splitting by dash)
    const patternParts = node.id.split('-');
    
    // Filter out ignored nodes
    const filteredPattern = patternParts.filter(part => !ignoredNodes.includes(part));
    
    // Join with delimiter
    const patternString = filteredPattern.join('|');
    
    console.log('Pattern to send:', patternString);
    
    // Check if pattern is empty
    if (!patternString) {
      console.warn('Pattern is empty after filtering ignored nodes');
      showNotification('선택한 패턴이 비어 있습니다', 'ignore');
      return;
    }
    
    // Send pattern to callback
    try {
      onPatternSelect(patternString);
      console.log('Pattern sent successfully:', patternString);
      showNotification(`패턴 선택됨: ${patternString}`);
    } catch (error) {
      console.error('Error sending pattern:', error);
      showNotification('패턴 전송 중 오류 발생', 'ignore');
    }
  };

  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(prev => !prev);
  };

  // Setup initial path on first render
  useEffect(() => {
    if (miningData && miningData.length > 0) {
      // Set initial path to root node
      const rootItem = miningData[0].name;
      setCurrentPath([rootItem]);
    }
  }, [miningData]);
  
  // Change minimum support threshold
  const handleSupportChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 1) {
      setMinSupport(value);
    }
  };
  
  // Change minimum confidence threshold
  const handleConfidenceChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0 && value <= 1) {
      setMinConfidence(value);
    }
  };
  
  // Change maximum depth
  const handleDepthChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setMaxDepth(value);
    }
  };

  // Helper function to find node by ID in the tree
  const findNodeById = useCallback((nodeId) => {
    if (!miningData) return null;
    
    const findNodeRecursively = (nodes, id) => {
      for (const node of nodes) {
        if (node.id === id) return node;
        
        if (node.children && node.children.length > 0) {
          const found = findNodeRecursively(node.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNodeRecursively(miningData, nodeId);
  }, [miningData]);

  // Recursive function to render tree nodes using divs
  const renderTreeNode = (node, level) => {
    if (!node || isNodeIgnored(node.id)) return null;
    
    const isExpanded = expandedNodes[node.id] || false;
    const isSelected = selectedNode === node.id;
    const isHighlighted = highlightedPattern && highlightedPattern.includes(node.id);
    
    const handleNodeMouseEnter = () => {
      // Find path from node to root
      const path = getPathToRoot(node.id);
      setHighlightedPattern(path);
      
      // Extract only the item names for the path display
      const simplifiedPath = path.map(id => {
        const parts = id.split('-');
        return parts[parts.length - 1];
      });
      
      setCurrentPath(simplifiedPath);
    };
    
    const handleNodeMouseLeave = () => {
      // Only clear highlight if no node is selected
      if (!selectedNode) {
        setHighlightedPattern(null);
      }
    };
    
    const handleNodeClick = (e) => {
      if (e.target.closest('.ignore-button') || e.target.closest('.expand-button')) {
        // Ignore clicks on buttons
        return;
      }
      
      // Handle node selection
      console.log('Node clicked:', node.id);
      
      // Set this node as selected
      setSelectedNode(node.id);
      
      // Keep its path highlighted
      const path = getPathToRoot(node.id);
      setHighlightedPattern(path);
      
      // Send pattern to API
      sendPatternToAPI(node);
    };
    
    const handleToggleClick = (e) => {
      e.stopPropagation();
      toggleNode(node.id);
    };
    
    const handleIgnoreClick = (e) => {
      e.stopPropagation();
      ignoreNode(node.id);
      
      // If this node was selected, clear selection
      if (selectedNode === node.id) {
        setSelectedNode(null);
        setHighlightedPattern(null);
      }
    };
    
    // Truncate display text if too long
    let displayText = node.name;
    if (displayText.length > 25) {
      displayText = displayText.substring(0, 23) + '...';
    }
    
    // Calculate connection lines position
    const hasParent = node.id.includes('-');
    
    return (
      <div 
        key={node.id}
        className={`tree-node-div ${isHighlighted ? 'node-highlighted' : ''} ${isSelected ? 'node-selected' : ''} ${level === 0 ? 'root-node' : ''}`}
        style={{ marginLeft: level * 35 }}
        onMouseEnter={handleNodeMouseEnter}
        onMouseLeave={handleNodeMouseLeave}
        onClick={handleNodeClick}
      >
        {/* Tree connector line */}
        {hasParent && (
          <div className={`tree-connector ${isHighlighted ? 'connector-highlighted' : ''}`}>
            <div className="vertical-line"></div>
            <div className="horizontal-line"></div>
          </div>
        )}
        
        <div className="node-content">
          <span className="node-text" style={{ fontWeight: level === 0 ? 'bold' : 'normal' }}>
            {displayText}
          </span>
          <div className="node-actions">
            <span className="support-value">{node.support}</span>
            <button 
              className="ignore-button" 
              onClick={handleIgnoreClick}
              title="이 노드 무시하기"
            >
              ✕
            </button>
            {node.children && node.children.length > 0 && (
              <button 
                className="expand-button" 
                onClick={handleToggleClick}
                title={isExpanded ? "접기" : "펼치기"}
              >
                {isExpanded ? '−' : '+'}
              </button>
            )}
          </div>
        </div>
        
        {/* Children */}
        {isExpanded && node.children && node.children.length > 0 && (
          <div className="node-children">
            {node.children
              .sort((a, b) => b.support - a.support)
              .map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tab-content">
      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : error ? (
        <div className="error">에러: {error}</div>
      ) : combinationHeaders && combinationHeaders.length > 0 ? (
        <div className="mining-view">
          <div className="mining-header">
            <div className="current-path">
              {currentPath.map((item, index) => (
                <span key={item + index}>
                  {index > 0 && <span className="path-separator">→</span>}
                  <span className={index === 0 ? "path-root" : ""}>{item}</span>
                </span>
              ))}
            </div>
            <div className="header-actions">
              {ignoredNodes.length > 0 && (
                <button 
                  className="reset-button" 
                  onClick={() => {
                    console.log('Reset ignored nodes');
                    setIgnoredNodes([]);
                    showNotification('무시된 노드를 모두 초기화했습니다');
                  }}
                >
                  무시 초기화 ({ignoredNodes.length})
                </button>
              )}
              <button className="settings-button" onClick={toggleSettings}>
                ⚙️
              </button>
            </div>
          </div>
          
          <div className="mining-tree-container" ref={treeContainerRef}>
            <div className="div-tree">
              {miningData && miningData.map(node => renderTreeNode(node, 0))}
            </div>
          </div>
          
          {showSettings && (
            <div className="settings-panel">
              <div className="settings-header">
                <h3>패턴 설정</h3>
                <button className="close-button" onClick={toggleSettings}>×</button>
              </div>
              <div className="settings-content">
                <div className="threshold-item">
                  <div className="threshold-label">{(minSupport * 100).toFixed(0)}%</div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="0.5" 
                    step="0.01" 
                    value={minSupport}
                    onChange={handleSupportChange}
                  />
                  <div className="threshold-name">최소 지지도</div>
                </div>
                <div className="threshold-item">
                  <div className="threshold-label">{(minConfidence * 100).toFixed(0)}%</div>
                  <input 
                    type="range" 
                    min="0.01" 
                    max="0.9" 
                    step="0.01" 
                    value={minConfidence}
                    onChange={handleConfidenceChange}
                  />
                  <div className="threshold-name">최소 신뢰도</div>
                </div>
                <div className="threshold-item">
                  <div className="threshold-label">{maxDepth}</div>
                  <input 
                    type="range" 
                    min="3" 
                    max="100" 
                    step="1" 
                    value={maxDepth}
                    onChange={handleDepthChange}
                  />
                  <div className="threshold-name">최대 패턴 깊이</div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="column-empty">
          {testMode 
            ? "마이닝 데이터를 로딩 중입니다..." 
            : "채널과 헤더를 선택하면 마이닝 결과가 표시됩니다."}
        </div>
      )}

      <style jsx>{`
        .mining-view {
          height: 100%;
          display: flex;
          flex-direction: column;
          position: relative;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        
        .mining-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background-color: #ffffff;
          border-bottom: 1px solid #e8eaed;
          z-index: 2;
          position: sticky;
          top: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .current-path {
          font-size: 13px;
          color: #444;
          flex-grow: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .path-separator {
          margin: 0 6px;
          color: #999;
        }
        
        .path-root {
          font-weight: 600;
        }
        
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .reset-button {
          background: #f1f3f4;
          border: 1px solid #dadce0;
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 12px;
          cursor: pointer;
          color: #444;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        
        .reset-button:hover {
          background: #e8eaed;
          border-color: #c6c9ce;
        }
        
        .settings-button {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 4px;
          transition: background-color 0.15s ease;
          color: #5f6368;
        }
        
        .settings-button:hover {
          background-color: #f1f3f4;
        }
        
        .mining-tree-container {
          flex-grow: 1;
          overflow: auto;
          background-color: #ffffff;
          padding: 18px 15px 15px 15px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        
        .div-tree {
          width: 100%;
          position: relative;
          padding-left: 15px;
        }
        
        /* Tree node styling */
        .tree-node-div {
          position: relative;
          margin-bottom: 14px;
          cursor: pointer;
        }
        
        .node-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          background-color: #ffffff;
          border: 1px solid #dadce0;
          border-radius: 6px;
          min-height: 36px;
          box-shadow: 0 1px 3px rgba(60,64,67,0.08);
          transition: all 0.2s ease;
        }
        
        .root-node .node-content {
          background-color: #f8f9fa;
          border-color: #d2d5d9;
          font-weight: 500;
        }
        
        .node-highlighted .node-content {
          background-color: #e8f0fe;
          border-color: #4285f4;
          box-shadow: 0 1px 4px rgba(66, 133, 244, 0.15);
        }
        
        .node-selected .node-content {
          background-color: #e8f0fe;
          border-color: #4285f4;
          box-shadow: 0 1px 5px rgba(66, 133, 244, 0.3);
        }
        
        .node-text {
          flex-grow: 1;
          font-size: 13px;
          color: #3c4043;
          margin-right: 12px;
          letter-spacing: -0.1px;
        }
        
        .node-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .support-value {
          font-size: 12px;
          color: #5f6368;
          min-width: 22px;
          text-align: right;
          font-weight: 500;
        }
        
        .ignore-button, .expand-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          font-size: 12px;
          background: #f1f3f4;
          border: 1px solid #dadce0;
          border-radius: 50%;
          cursor: pointer;
          padding: 0;
          transition: all 0.15s ease;
          color: #5f6368;
        }
        
        .ignore-button:hover {
          background: #feeaeb;
          color: #d93025;
          border-color: #f28b82;
        }
        
        .expand-button:hover {
          background: #e8eaed;
          border-color: #c6c9ce;
        }
        
        /* Tree connector styling - improved */
        .tree-connector {
          position: absolute;
          left: -20px;
          top: 18px;
          width: 20px;
          height: calc(100% - 18px);
          overflow: visible;
        }
        
        .vertical-line {
          position: absolute;
          left: 0;
          top: -18px;
          width: 2px;
          height: 18px;
          background-color: #dadce0;
        }
        
        .horizontal-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 20px;
          height: 2px;
          background-color: #dadce0;
        }
        
        .connector-highlighted .vertical-line,
        .connector-highlighted .horizontal-line {
          background-color: #4285f4;
        }
        
        .node-children {
          position: relative;
          margin-top: 8px;
        }
        
        .settings-panel {
          position: absolute;
          top: 48px;
          right: 12px;
          width: 300px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15);
          z-index: 10;
          overflow: hidden;
        }
        
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #dadce0;
        }
        
        .settings-header h3 {
          margin: 0;
          font-size: 15px;
          color: #202124;
          font-weight: 500;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #5f6368;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          height: 28px;
          width: 28px;
          transition: background-color 0.15s ease;
        }
        
        .close-button:hover {
          background-color: #f1f3f4;
        }
        
        .settings-content {
          padding: 16px;
        }
        
        .threshold-item {
          margin-bottom: 18px;
        }
        
        .threshold-label {
          font-size: 13px;
          font-weight: 500;
          color: #202124;
          margin-bottom: 4px;
          text-align: right;
        }
        
        .threshold-name {
          font-size: 12px;
          color: #5f6368;
          margin-top: 4px;
        }
        
        .threshold-item input {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: #dadce0;
          outline: none;
          border-radius: 2px;
        }
        
        .threshold-item input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #4285f4;
          cursor: pointer;
          border: none;
        }
        
        .pattern-notification {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: rgba(66, 133, 244, 0.95);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          z-index: 1000;
          transition: opacity 0.3s;
          opacity: 1;
          box-shadow: 0 2px 10px rgba(0,0,0,0.25);
          max-width: 300px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .ignore-notification {
          background: rgba(217, 48, 37, 0.95);
        }
      `}</style>
    </div>
  );
};

export default MiningView; 