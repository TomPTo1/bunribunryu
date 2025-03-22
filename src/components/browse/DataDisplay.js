import React, { useState, useEffect } from 'react';
import './SeparationClassifier.css';

const DataDisplay = ({ processedData, flattenData, segmentationData, groupingData, showProcessedData, isGroupingActive }) => {
  // Add state for user-defined groups
  const [userGroups, setUserGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingGroupIndex, setEditingGroupIndex] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  // Track which values have been added to any group
  const [usedValues, setUsedValues] = useState(new Set());

  // 훅은 조건문 밖에서 선언해야 함
  useEffect(() => {
    // 이 훅은 컴포넌트가 마운트될 때 한 번만 실행됩니다
    // 필요한 초기화 작업이 있다면 여기에 작성
  }, []);

  if (!processedData && !groupingData && !isGroupingActive) {
    return <div className="no-data">처리할 데이터가 없습니다</div>;
  }

  // Check if the text is a duplicated string (contains itself twice)
  const isDuplicatedText = (text) => {
    if (typeof text !== 'string' || text.length === 0) return false;
    const halfLength = Math.floor(text.length / 2);
    const firstHalf = text.substring(0, halfLength);
    return text.includes(firstHalf + firstHalf);
  };

  // Remove duplicated text if needed
  const cleanDuplicatedText = (text) => {
    if (!isDuplicatedText(text)) return text;
    const halfLength = Math.floor(text.length / 2);
    return text.substring(0, halfLength);
  };

  // Check if a value has segmentation data
  const hasSegmentationData = (value) => {
    if (!segmentationData || !segmentationData.segmentations) return false;
    
    const segmentations = segmentationData.segmentations;
    return segmentations.some(seg => seg.value === value && seg.segments.length > 1);
  };

  // Get segmentation data for a value
  const getSegmentationData = (value) => {
    if (!segmentationData || !segmentationData.segmentations) return null;
    
    const segmentations = segmentationData.segmentations;
    return segmentations.find(seg => seg.value === value);
  };

  // Check if a value has been used in any group
  const isValueUsed = (value) => {
    return usedValues.has(value);
  };

  // Handle segment click
  const handleSegmentClick = (segment, e) => {
    // 전파 중지 - 부모의 클릭 이벤트가 발생하지 않도록
    e.stopPropagation();
    console.log('Segment clicked:', segment);
    
    // If a group is selected, add the segment to that group
    if (selectedGroup !== null) {
      const segmentValue = typeof segment === 'string' ? segment : segment.text;
      addToGroup(selectedGroup, segmentValue);
    }
  };

  // Handle whole tag click
  const handleTagClick = (value) => {
    console.log('Whole tag clicked:', value);
    
    // If a group is selected and value not already used, add the value to that group
    if (selectedGroup !== null && !isValueUsed(value)) {
      addToGroup(selectedGroup, value);
    }
  };

  // Helper function to render a tag with appropriate styling
  const renderTag = (value, source, key, isLastStep) => {
    let className = `value-tag ${
      source === 'bracket' ? 'bracket-source' : 
      source === 'clean-text' ? 'text-source' : 'delimiter-source'
    }`;
    
    // Add class if this value is already used in a group
    if (isValueUsed(typeof value === 'string' ? value : value.value)) {
      className += ' used-value';
    }
    
    // Check if we have segmentation data for this value
    const valueText = typeof value === 'string' ? value : value.value;
    const segmentation = getSegmentationData(valueText);
    
    if (segmentation && segmentation.segments.length > 1) {
      // Render with inner segments
      return (
        <div key={key} className={`${className} tag-container ${isValueUsed(valueText) ? 'used-value' : ''}`}>
          <button 
            className="whole-tag-button" 
            onClick={() => handleTagClick(valueText)}
            title="전체 태그 선택"
            disabled={isValueUsed(valueText)}
          >
            {valueText}
          </button>
          <div className="segments-container">
            {segmentation.segments.map((segment, segIdx) => {
              const segmentText = segment.text;
              return (
                <button 
                  key={`seg-${segIdx}`} 
                  className={`segment-button ${segment.isSubstring ? 'segment-matched' : 'segment-unmatched'} ${isValueUsed(segmentText) ? 'used-value' : ''}`}
                  onClick={(e) => handleSegmentClick(segment, e)}
                  disabled={isValueUsed(segmentText)}
                >
                  {segmentText}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // No segmentation, render normally but still clickable
    return (
      <button 
        key={key} 
        className={`${className} clickable-tag simple-tag-button ${isValueUsed(valueText) ? 'used-value' : ''}`}
        onClick={() => handleTagClick(valueText)}
        disabled={isValueUsed(valueText)}
      >
        {valueText}
      </button>
    );
  };

  // Render the enhanced view that shows processed and unprocessed parts in sequence
  const renderEnhancedView = (row) => {
    // Handle substring segmentation data
    if (row.type === 'substring-segmentation') {
      return renderSubstringSegmentationView(row);
    }
    
    // Check if this is the last pipeline step (right before substring segmentation)
    const isLastStep = segmentationData && segmentationData.processed && 
                       (segmentationData.processed.previous &&
                        segmentationData.processed.previous.type === row.type);
    
    // Clean up potentially duplicated original text
    let original = row.original;
    if (isDuplicatedText(original)) {
      original = cleanDuplicatedText(original);
    }
    
    if (!original || typeof original !== 'string') {
      return renderSeparatedValues(row, isLastStep);
    }
    
    // If no separation has happened yet
    if (!row.separated || row.separated.length === 0) {
      return <span className="unprocessed-tag">{original}</span>;
    }
    
    if (row.type === 'bracket-separation') {
      // For bracket separation, highlight brackets and content
      let result = [];
      let lastIndex = 0;
      
      // Sort match details by start index if available
      const matchDetails = row.matchDetails || [];
      const sortedMatches = [...matchDetails].sort((a, b) => a.startIndex - b.startIndex);
      
      sortedMatches.forEach((match, idx) => {
        // Add unprocessed text before this match
        if (match.startIndex > lastIndex) {
          const unprocessedText = original.substring(lastIndex, match.startIndex);
          result.push(
            <span key={`unproc-${idx}`} className="unprocessed-tag">{unprocessedText}</span>
          );
        }
        
        // Add the processed bracket content
        result.push(
          renderTag(match.value, 'bracket', `proc-${idx}`, isLastStep)
        );
        
        lastIndex = match.endIndex;
      });
      
      // Add any remaining text
      if (lastIndex < original.length) {
        result.push(
          <span key="unproc-last" className="unprocessed-tag">
            {original.substring(lastIndex)}
          </span>
        );
      }
      
      return result;
    }
    
    // Fallback to original display method
    return renderSeparatedValues(row, isLastStep);
  };
  
  // Render substring segmentation view with segmented parts
  const renderSubstringSegmentationView = (row) => {
    if (!row.previous || !row.previous.separated || row.previous.separated.length === 0) {
      return <span className="no-values">이전 단계의 값이 없습니다</span>;
    }
    
    return (
      <div className="substring-segmentation-view">
        {row.separated.map((item, idx) => {
          const value = typeof item === 'string' ? item : item.value;
          const segments = item.segments || [];
          const source = item.source || 'text';
          
          // If there are segments, render them
          if (segments.length > 1) {
            return (
              <div 
                key={idx} 
                className={`value-tag tag-container ${source === 'bracket' ? 'bracket-source' : source === 'clean-text' ? 'text-source' : 'delimiter-source'} ${isValueUsed(value) ? 'used-value' : ''}`}
              >
                <button 
                  className="whole-tag-button" 
                  onClick={() => handleTagClick(value)}
                  title="전체 태그 선택"
                  disabled={isValueUsed(value)}
                >
                  {value}
                </button>
                <div className="segments-container">
                  {segments.map((segment, segIdx) => {
                    const segmentText = segment.text;
                    return (
                      <button 
                        key={`seg-${segIdx}`} 
                        className={`segment-button ${segment.isSubstring ? 'segment-matched' : 'segment-unmatched'} ${isValueUsed(segmentText) ? 'used-value' : ''}`}
                        onClick={(e) => handleSegmentClick(segment, e)}
                        disabled={isValueUsed(segmentText)}
                      >
                        {segmentText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          // No segments, render normally
          return (
            <button 
              key={idx} 
              className={`value-tag simple-tag-button ${source === 'bracket' ? 'bracket-source' : source === 'clean-text' ? 'text-source' : 'delimiter-source'} ${isValueUsed(value) ? 'used-value' : ''}`}
              onClick={() => handleTagClick(value)}
              disabled={isValueUsed(value)}
            >
              {value}
            </button>
          );
        })}
      </div>
    );
  };

  const renderSeparatedValues = (row, isLastStep) => {
    if (!row.separated || row.separated.length === 0) {
      return <span className="no-values">추출된 값 없음</span>;
    }

    if (Array.isArray(row.separated) && row.separated.every(v => typeof v === 'string')) {
      // Old format (just strings)
      return row.separated.map((val, idx) => 
        renderTag(val, 'text', idx, isLastStep)
      );
    } 
    
    // New format (with metadata)
    return row.separated.map((item, idx) => 
      renderTag(item, item.source || 'text', idx, isLastStep)
    );
  };
  
  // Render grouped data (segmented values)
  const renderGroupedData = () => {
    if (!groupingData) {
      return <div className="no-data">그룹핑 데이터가 없습니다</div>;
    }
    
    return (
      <div className="grouped-data">
        <h4>분절값 목록</h4>
        <div className="segment-values-list">
          {groupingData['분절값'] && groupingData['분절값'].length > 0 ? (
            <div className="segment-values">
              {groupingData['분절값'].map((value, idx) => (
                <button 
                  key={`segment-${idx}`}
                  className={`segment-button ${isValueUsed(value) ? 'used-value' : ''}`}
                  onClick={() => handleTagClick(value)}
                  disabled={isValueUsed(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ) : (
            <div className="no-segments">분절값이 없습니다</div>
          )}
        </div>
      </div>
    );
  };
  
  // Add a new empty user group
  const addUserGroup = () => {
    if (newGroupName.trim() === '') return;
    
    const newGroup = {
      name: newGroupName.trim(),
      items: []
    };
    
    setUserGroups([...userGroups, newGroup]);
    setNewGroupName('');
  };
  
  // Start editing group name
  const startEditingGroupName = (index, name, e) => {
    e.stopPropagation();
    setEditingGroupIndex(index);
    setEditingGroupName(name);
  };
  
  // Save edited group name
  const saveGroupName = (index, e) => {
    e.stopPropagation();
    
    if (editingGroupName.trim() === '') return;
    
    const updatedGroups = [...userGroups];
    updatedGroups[index].name = editingGroupName.trim();
    
    setUserGroups(updatedGroups);
    setEditingGroupIndex(null);
    setEditingGroupName('');
  };
  
  // Handle key press in edit mode
  const handleEditKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      saveGroupName(index, e);
    } else if (e.key === 'Escape') {
      setEditingGroupIndex(null);
      setEditingGroupName('');
    }
  };
  
  // Add a value to a user-defined group
  const addToGroup = (groupIndex, value) => {
    if (userGroups[groupIndex].items.includes(value)) return;
    
    const updatedGroups = [...userGroups];
    updatedGroups[groupIndex].items.push(value);
    setUserGroups(updatedGroups);
    
    // Update used values set
    const newUsedValues = new Set(usedValues);
    newUsedValues.add(value);
    setUsedValues(newUsedValues);
  };
  
  // Remove a value from a user-defined group
  const removeFromGroup = (groupIndex, itemIndex) => {
    const updatedGroups = [...userGroups];
    const removedValue = updatedGroups[groupIndex].items[itemIndex];
    updatedGroups[groupIndex].items.splice(itemIndex, 1);
    setUserGroups(updatedGroups);
    
    // Check if the value is used in any other group
    const isUsedElsewhere = userGroups.some((group, gIdx) => 
      gIdx !== groupIndex && group.items.includes(removedValue)
    );
    
    // If not used elsewhere, remove from used values set
    if (!isUsedElsewhere) {
      const newUsedValues = new Set(usedValues);
      newUsedValues.delete(removedValue);
      setUsedValues(newUsedValues);
    }
  };

  // Toggle group selection
  const toggleGroupSelection = (index) => {
    setSelectedGroup(selectedGroup === index ? null : index);
  };
  
  // Render user-defined groups
  const renderUserGroups = () => {
    return (
      <div className="user-groups">
        <h4>사용자 정의 그룹</h4>
        
        {/* Add new group input */}
        <div className="add-group-form">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="새 그룹 이름"
            className="group-name-input"
            onKeyDown={(e) => e.key === 'Enter' && addUserGroup()}
          />
          <button onClick={addUserGroup} className="add-group-button">
            그룹 추가
          </button>
        </div>
        
        {/* Group list */}
        <div className="groups-list">
          {userGroups.map((group, index) => (
            <div 
              key={`group-${index}`} 
              className={`user-group ${selectedGroup === index ? 'selected-group' : ''}`}
              onClick={() => toggleGroupSelection(index)}
            >
              <div className="group-header">
                {editingGroupIndex === index ? (
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={(e) => saveGroupName(index, e)}
                    onKeyDown={(e) => handleEditKeyDown(index, e)}
                    className="edit-group-name"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="group-name">
                      {group.name} ({group.items.length})
                    </span>
                    <button 
                      className="edit-name-button"
                      onClick={(e) => startEditingGroupName(index, group.name, e)}
                      title="그룹 이름 수정"
                    >
                      ✏️
                    </button>
                  </>
                )}
              </div>
              
              <div className="group-items-container">
                {group.items.map((item, itemIndex) => (
                  <div key={`item-${itemIndex}`} className="group-item">
                    <span className="item-value">{item}</span>
                    <button 
                      className="remove-item-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromGroup(index, itemIndex);
                      }}
                      title="항목 제거"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                {group.items.length === 0 && (
                  <div className="empty-group-message">
                    {selectedGroup === index 
                      ? "분절값을 클릭하여 이 그룹에 추가하세요" 
                      : "그룹이 비어 있습니다"}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {userGroups.length === 0 && (
            <div className="no-groups-message">
              사용자 정의 그룹이 없습니다. 새 그룹을 추가하고 분절값을 할당하세요.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="data-display">
      {isGroupingActive ? (
        // Grouping mode - show segmented values and user-defined groups
        <div className="grouping-view">
          {renderGroupedData()}
          {renderUserGroups()}
        </div>
      ) : (
        // Regular mode - show processed data with original table layout
        showProcessedData && processedData ? (
          <div className="processed-data-section">
            <table className="data-table">
              <tbody>
                {flattenData(processedData).map((row, index) => (
                  <tr key={index}>
                    <td className="enhanced-view">
                      {renderEnhancedView(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">처리된 데이터가 없습니다</div>
        )
      )}
    </div>
  );
};

export default DataDisplay; 