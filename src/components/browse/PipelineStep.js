import React, { useEffect } from 'react';
import './SeparationClassifier.css';

const PipelineStep = ({ step, index, isSelected, onSelect, onToggle }) => {
  // Select segmentation-grouping by default when component mounts
  useEffect(() => {
    if (step.id === 'segmentation-grouping' && !isSelected) {
      onSelect(step.id);
    }
    
    // Enable number replacement by default for segmentation-grouping
    if (step.id === 'segmentation-grouping' && step.config && 
        step.onToggleNumberReplacement && 
        step.config.replaceNumbers === false) {
      step.onToggleNumberReplacement();
    }
  }, [step.id, isSelected, onSelect, step.config, step.onToggleNumberReplacement]);

  const handleToggleClick = (e) => {
    e.stopPropagation();
    onToggle(step.id);
  };

  const renderDelimiterControls = () => {
    if (!step.config || !step.config.delimiters) return null;

    const handleDelimiterChange = (e) => {
      e.stopPropagation();
      const value = e.target.value;
      const delimiters = value.split('').map((char, idx) => ({
        value: char,
        enabled: true,
        order: idx + 1
      }));
      
      if (step.onUpdateDelimiters) {
        step.onUpdateDelimiters(delimiters);
      }
    };

    const handleDelimiterToggle = (e, idx) => {
      e.stopPropagation();
      const updatedDelimiters = [...step.config.delimiters];
      updatedDelimiters[idx] = {
        ...updatedDelimiters[idx],
        enabled: e.target.checked
      };
      
      if (step.onUpdateDelimiters) {
        step.onUpdateDelimiters(updatedDelimiters);
      }
    };

    const handleMoveUp = (e, idx) => {
      e.stopPropagation();
      if (idx === 0) return; // Already at the top
      
      const updatedDelimiters = [...step.config.delimiters];
      const currentOrder = updatedDelimiters[idx].order;
      const prevOrder = updatedDelimiters[idx-1].order;
      
      // Swap orders
      updatedDelimiters[idx] = {...updatedDelimiters[idx], order: prevOrder};
      updatedDelimiters[idx-1] = {...updatedDelimiters[idx-1], order: currentOrder};
      
      // Sort by order
      updatedDelimiters.sort((a, b) => a.order - b.order);
      
      if (step.onUpdateDelimiters) {
        step.onUpdateDelimiters(updatedDelimiters);
      }
    };

    const handleMoveDown = (e, idx) => {
      e.stopPropagation();
      if (idx === step.config.delimiters.length - 1) return; // Already at the bottom
      
      const updatedDelimiters = [...step.config.delimiters];
      const currentOrder = updatedDelimiters[idx].order;
      const nextOrder = updatedDelimiters[idx+1].order;
      
      // Swap orders
      updatedDelimiters[idx] = {...updatedDelimiters[idx], order: nextOrder};
      updatedDelimiters[idx+1] = {...updatedDelimiters[idx+1], order: currentOrder};
      
      // Sort by order
      updatedDelimiters.sort((a, b) => a.order - b.order);
      
      if (step.onUpdateDelimiters) {
        step.onUpdateDelimiters(updatedDelimiters);
      }
    };

    // Sort delimiters by order for display
    const sortedDelimiters = [...step.config.delimiters].sort((a, b) => a.order - b.order);
    
    const delimiterString = sortedDelimiters
      .filter(d => d.enabled)
      .map(d => d.value)
      .join('');

    return (
      <div className="step-config" onClick={e => e.stopPropagation()}>
        <div className="config-row">
          <label>구분자:</label>
          <input 
            type="text" 
            value={delimiterString}
            onChange={handleDelimiterChange}
            className="delimiter-input"
            placeholder="구분자 입력 (예: ,;)"
          />
        </div>
        
        <div className="delimiter-help">
          각 문자는 개별 구분자로 처리됩니다. 순서대로 적용됩니다.
        </div>
        
        <div className="delimiter-list">
          {sortedDelimiters.map((delimiter, idx) => (
            <div key={idx} className="delimiter-item">
              <div className="delimiter-item-content">
                <label className="toggle">
                  <input 
                    type="checkbox" 
                    checked={delimiter.enabled}
                    onChange={(e) => handleDelimiterToggle(e, idx)}
                  />
                  <span className="toggle-track"></span>
                </label>
                <span className="delimiter-value">
                  {delimiter.value === ' ' ? '(공백)' : delimiter.value}
                </span>
                <span className="delimiter-order">순서: {delimiter.order}</span>
              </div>
              <div className="delimiter-item-actions">
                <button 
                  className="order-button"
                  onClick={(e) => handleMoveUp(e, idx)}
                  disabled={idx === 0}
                >
                  ▲
                </button>
                <button 
                  className="order-button"
                  onClick={(e) => handleMoveDown(e, idx)}
                  disabled={idx === sortedDelimiters.length - 1}
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSegmentationControls = () => {
    if (!step.config) return null;

    const { minSubstringLength, minOccurrence } = step.config;

    const handleConfigChange = (e) => {
      e.stopPropagation();
      const { name, value, type, checked } = e.target;
      const newValue = type === 'checkbox' ? checked : 
                      type === 'number' ? parseInt(value, 10) : value;
      
      if (step.onUpdateConfig) {
        step.onUpdateConfig({ [name]: newValue });
      }
    };

    return (
      <div className="step-config" onClick={e => e.stopPropagation()}>
        <div className="config-row">
          <label>최소 길이:</label>
          <input 
            type="number" 
            name="minSubstringLength"
            value={minSubstringLength}
            onChange={handleConfigChange}
            className="number-input"
            min="1"
            max="10"
          />
        </div>
        
        <div className="config-row">
          <label>최소 출현:</label>
          <input 
            type="number" 
            name="minOccurrence"
            value={minOccurrence}
            onChange={handleConfigChange}
            className="number-input"
            min="2"
            max="20"
          />
        </div>
        
        <div className="config-help">
          상호부분문자열 분절은 다른 태그에 포함된 문자열 기준으로 분절합니다.
          예) '대추방울토마토'가 '대추'와 '토마토'를 포함하면 '대추 / 방울 / 토마토'로 분절
        </div>
      </div>
    );
  };

  const renderSubstringControls = () => {
    if (!step.config) return null;

    const { includeBrackets, minSubstringLength, minFrequency } = step.config;

    const handleConfigChange = (e) => {
      e.stopPropagation();
      const { name, value, type, checked } = e.target;
      const newValue = type === 'checkbox' ? checked : 
                      type === 'number' ? parseInt(value, 10) : value;
      
      if (step.onUpdateConfig) {
        step.onUpdateConfig({ [name]: newValue });
      }
    };

    return (
      <div className="step-config" onClick={e => e.stopPropagation()}>
        <div className="config-row">
          <label>괄호값 포함:</label>
          <label className="toggle">
            <input 
              type="checkbox" 
              name="includeBrackets"
              checked={includeBrackets}
              onChange={handleConfigChange}
            />
            <span className="toggle-track"></span>
          </label>
        </div>
        
        <div className="config-row">
          <label>최소 길이:</label>
          <input 
            type="number" 
            name="minSubstringLength"
            value={minSubstringLength}
            onChange={handleConfigChange}
            className="number-input"
            min="1"
            max="10"
          />
        </div>
        
        <div className="config-row">
          <label>최소 빈도:</label>
          <input 
            type="number" 
            name="minFrequency"
            value={minFrequency}
            onChange={handleConfigChange}
            className="number-input"
            min="2"
            max="20"
          />
        </div>
        
        <div className="config-help">
          부분문자열 그룹화는 접두사나 접미사 기준으로 유사한 태그들을 그룹화합니다.
        </div>
      </div>
    );
  };

  const renderGroupingControls = () => {
    if (!step.config) return null;

    const handleNumberReplacementToggle = (e) => {
      e.stopPropagation();
      if (step.onToggleNumberReplacement) {
        step.onToggleNumberReplacement();
      }
    };

    return (
      <div className="step-config" onClick={e => e.stopPropagation()}>
        <div className="config-row">
          <label>숫자를 \d+로 대체:</label>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={step.config.replaceNumbers}
              onChange={handleNumberReplacementToggle}
            />
            <span className="toggle-track"></span>
          </label>
        </div>
        
        <div className="grouping-layout-info">
          <p>분절값 그룹핑 레이아웃: 좌측(분절값 목록) : 우측(그룹 박스) = 1:2</p>
        </div>
        
        <div className="config-help">
          왼쪽에는 고유 분절값들이 표시되며, 오른쪽에는 사용자가 만든 그룹들이 표시됩니다.
          분절값은 뒷글자부터 앞글자 순으로 정렬됩니다.
          숫자 대체 기능을 사용하면 모든 숫자가 \d+로 대체되어 분절값 목록이 줄어듭니다.
        </div>
      </div>
    );
  };

  const renderStepConfig = () => {
    if (!isSelected) return null;
    
    if (step.id === 'delimiter-separation') {
      return renderDelimiterControls();
    } else if (step.id === 'substring-grouping') {
      return renderSubstringControls();
    } else if (step.id === 'substring-segmentation') {
      return renderSegmentationControls();
    } else if (step.id === 'segmentation-grouping') {
      return renderGroupingControls();
    }
    
    return null;
  };

  return (
    <div 
      className={`pipeline-step ${step.active ? 'active' : 'inactive'} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(step.id)}
    >
      <div className="step-details">
        <div className="step-number">{index + 1}</div>
        <div className="step-title">{step.name}</div>
        <div className="step-control">
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={step.active}
              onChange={handleToggleClick}
            />
            <span className="toggle-track"></span>
          </label>
        </div>
      </div>
      {renderStepConfig()}
    </div>
  );
};

export default PipelineStep; 