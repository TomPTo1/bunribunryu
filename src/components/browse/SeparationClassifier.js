import React, { useState, useEffect } from 'react';
import PipelineStep from './PipelineStep';
import DataDisplay from './DataDisplay';
import GroupingSheet from './GroupingSheet';
import { processBracketSeparation, processDelimiterSeparation, processSubstringSegmentation, flattenData } from './dataProcessors';
import './SeparationClassifier.css';

const SeparationClassifier = ({ data, onReset }) => {
  const [processedData, setProcessedData] = useState(null);
  const [segmentationData, setSegmentationData] = useState(null);
  const [previousStepData, setPreviousStepData] = useState(null); // Store data from previous steps
  const [groupingData, setGroupingData] = useState(null); // Store grouped data
  const [showProcessedData, setShowProcessedData] = useState(true); // Control data display mode

  const [pipeline, setPipeline] = useState([
    { id: 'bracket-separation', name: '괄호값 분리', active: true },
    { 
      id: 'delimiter-separation', 
      name: '구분자 분리', 
      active: true,
      config: {
        delimiters: [
          { value: ',', enabled: true, order: 1 },
          { value: ' ', enabled: true, order: 2 }
        ]
      }
    },
    {
      id: 'substring-segmentation',
      name: '상호부분문자열 분절',
      active: true,
      config: {
        minSubstringLength: 2,
        minOccurrence: 2
      }
    },
    {
      id: 'number-replacement',
      name: '숫자 대체',
      active: false,
      config: {
        pattern: '\\d+'
      }
    },
    {
      id: 'grouping',
      name: '그룹핑',
      active: true,
      config: {
        removeDuplicates: true,
        showUserGroups: true,
        useSheetView: true
      }
    }
  ]);
  const [selectedStep, setSelectedStep] = useState('delimiter-separation');
  
  // Check which steps are active
  const isSubstringSegmentationActive = pipeline.find(step => step.id === 'substring-segmentation')?.active || false;
  const isGroupingActive = pipeline.find(step => step.id === 'grouping')?.active || false;
  const useSheetView = pipeline.find(step => step.id === 'grouping')?.config?.useSheetView || false;
  
  // Process to replace numbers with patterns
  const processNumberReplacement = (input) => {
    if (!input) return input;
    
    // Get configuration
    const numberStep = pipeline.find(step => step.id === 'number-replacement');
    if (!numberStep || !numberStep.active) return input;
    
    const pattern = numberStep.config.pattern || '\\d+';
    
    // Helper to replace numbers in a string
    const replaceNumbersInString = (str) => {
      if (typeof str !== 'string') return str;
      return str.replace(new RegExp(pattern, 'g'), '\\d+');
    };
    
    // Process object recursively
    const processObject = (obj) => {
      if (typeof obj === 'string') {
        return replaceNumbersInString(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(processObject);
      } else if (typeof obj === 'object' && obj !== null) {
        const result = {};
        
        for (const key in obj) {
          // Special handling for separated arrays
          if (key === 'separated' && Array.isArray(obj[key])) {
            result[key] = obj[key].map(item => {
              if (typeof item === 'string') {
                return replaceNumbersInString(item);
              } else if (typeof item === 'object' && item !== null) {
                const processedItem = { ...item };
                if (processedItem.value) {
                  processedItem.value = replaceNumbersInString(processedItem.value);
                }
                if (processedItem.segments && Array.isArray(processedItem.segments)) {
                  processedItem.segments = processedItem.segments.map(segment => {
                    if (typeof segment === 'string') {
                      return replaceNumbersInString(segment);
                    } else if (segment && segment.text) {
                      return {
                        ...segment,
                        text: replaceNumbersInString(segment.text)
                      };
                    }
                    return segment;
                  });
                }
                return processedItem;
              }
              return item;
            });
          } else {
            result[key] = processObject(obj[key]);
          }
        }
        
        return result;
      }
      
      return obj;
    };
    
    return processObject(input);
  };
  
  // Process grouping data - removes duplicates from segmentation data
  const processGrouping = (segData) => {
    if (!segData) return null;
    
    // Create a simple object to hold grouped data
    const grouped = {};
    
    // Just create a single key for all segments
    const allSegments = [];
    
    // Extract segments from a segmentation object
    const addSegmentsFromSegmentation = (segmentation) => {
      if (!segmentation) return;
      
      // Add the value
      if (segmentation.value) {
        allSegments.push(segmentation.value);
      }
      
      // Add all segments
      if (segmentation.segments && Array.isArray(segmentation.segments)) {
        segmentation.segments.forEach(segment => {
          if (typeof segment === 'string') {
            allSegments.push(segment);
          } else if (segment && segment.text) {
            allSegments.push(segment.text);
          }
        });
      }
    };
    
    // Process segmentations array
    if (segData.segmentations && Array.isArray(segData.segmentations)) {
      segData.segmentations.forEach(segmentation => {
        addSegmentsFromSegmentation(segmentation);
      });
    }
    
    // Process processed data if available
    if (segData.processed) {
      // Extract segments from separated items in processed data
      const extractFromSeparated = (items) => {
        if (!Array.isArray(items)) return;
        
        items.forEach(item => {
          // Add the value
          if (typeof item === 'string') {
            allSegments.push(item);
          } else if (item && item.value) {
            allSegments.push(item.value);
          }
          
          // Add segments
          if (item && item.segments && Array.isArray(item.segments)) {
            item.segments.forEach(segment => {
              if (typeof segment === 'string') {
                allSegments.push(segment);
              } else if (segment && segment.text) {
                allSegments.push(segment.text);
              }
            });
          }
        });
      };
      
      // Process the processed data separated field
      if (segData.processed.separated) {
        extractFromSeparated(segData.processed.separated);
      }
      
      // Also try to process any nested objects with a separated field
      for (const key in segData.processed) {
        const obj = segData.processed[key];
        if (obj && typeof obj === 'object' && obj.separated) {
          extractFromSeparated(obj.separated);
        }
      }
    }
    
    // Remove duplicates
    const uniqueSegments = [...new Set(allSegments)];
    grouped['분절값'] = uniqueSegments;
    
    return grouped;
  };
  
  // Process data through pipeline steps
  useEffect(() => {
    if (data) {
      // Clean up duplicated data before processing
      let cleanedData = { ...data };
      
      // Check if data is already a processed result with duplicate content
      const isDuplicated = (input) => {
        if (typeof input === 'string') {
          const halfLength = Math.floor(input.length / 2);
          for (let i = 1; i <= halfLength; i++) {
            if (input.substring(0, i) === input.substring(i, i * 2)) {
              return true;
            }
          }
        }
        return false;
      };

      // Clean up data if it's duplicated
      const cleanData = (input) => {
        if (typeof input === 'string' && isDuplicated(input)) {
          // Try to find a reasonable split point
          const halfLength = Math.floor(input.length / 2);
          return input.substring(0, halfLength);
        } else if (Array.isArray(input)) {
          return input.map(cleanData);
        } else if (typeof input === 'object' && input !== null) {
          const result = {};
          for (const key in input) {
            result[key] = cleanData(input[key]);
          }
          return result;
        }
        return input;
      };
      
      // Only clean if it appears to be duplicated
      if (Object.values(cleanedData).some(val => 
        typeof val === 'string' && isDuplicated(val)
      )) {
        cleanedData = cleanData(cleanedData);
      }
      
      // Process data through pipeline steps
      let result = { ...cleanedData };
      
      // Process bracket and delimiter steps
      pipeline.forEach(step => {
        if (step.active) {
          if (step.id === 'bracket-separation') {
            result = processBracketSeparation(result);
          } else if (step.id === 'delimiter-separation') {
            result = processDelimiterSeparation(result, step.config.delimiters);
          }
        }
      });
      
      // Store data after bracket and delimiter processing
      setPreviousStepData(result);
      
      // Apply number replacement if active
      const numberStep = pipeline.find(step => step.id === 'number-replacement');
      if (numberStep && numberStep.active) {
        result = processNumberReplacement(result);
      }
      
      // Process substring segmentation separately if active
      let segmentResult = null;
      const segmentationStep = pipeline.find(step => step.id === 'substring-segmentation');
      if (segmentationStep && segmentationStep.active) {
        segmentResult = processSubstringSegmentation(result, segmentationStep.config);
        
        // Apply number replacement to segmentation result if active
        if (numberStep && numberStep.active) {
          segmentResult = processNumberReplacement(segmentResult);
        }
        
        setSegmentationData(segmentResult);
      } else {
        setSegmentationData(null);
      }
      
      // Process grouping if active and segmentation data exists
      const groupingStep = pipeline.find(step => step.id === 'grouping');
      if (groupingStep && groupingStep.active && segmentResult) {
        const groupedResult = processGrouping(segmentResult);
        setGroupingData(groupedResult);
        // Set display mode based on grouping activity
        setShowProcessedData(!groupingStep.active);
      } else {
        setGroupingData(null);
        setShowProcessedData(true);
      }
      
      setProcessedData(result);
    } else {
      setProcessedData(null);
      setSegmentationData(null);
      setPreviousStepData(null);
      setGroupingData(null);
      setShowProcessedData(true);
    }
  }, [data, pipeline]);

  const toggleStepActive = (stepId) => {
    setPipeline(pipeline.map(step => 
      step.id === stepId ? { ...step, active: !step.active } : step
    ));
  };

  const selectStep = (stepId) => {
    setSelectedStep(stepId);
  };

  // Update delimiter configuration
  const updateDelimiters = (delimitersInput) => {
    setPipeline(pipeline.map(step => {
      if (step.id === 'delimiter-separation') {
        // If input is a string, convert to delimiter objects
        if (typeof delimitersInput === 'string') {
          const delimiters = delimitersInput.split('').map((char, idx) => ({
            value: char,
            enabled: true,
            order: idx + 1
          }));
          
          return { 
            ...step, 
            config: { 
              ...step.config, 
              delimiters
            } 
          };
        }
        
        // Input is already an array of delimiter objects
        return { 
          ...step, 
          config: { 
            ...step.config, 
            delimiters: delimitersInput
          } 
        };
      }
      return step;
    }));
  };

  // Update substring segmentation configuration
  const updateSegmentationConfig = (configUpdate) => {
    setPipeline(pipeline.map(step => {
      if (step.id === 'substring-segmentation') {
        return { 
          ...step, 
          config: { 
            ...step.config, 
            ...configUpdate 
          } 
        };
      }
      return step;
    }));
  };
  
  // Update number replacement configuration
  const updateNumberReplacementConfig = (configUpdate) => {
    setPipeline(pipeline.map(step => {
      if (step.id === 'number-replacement') {
        return { 
          ...step, 
          config: { 
            ...step.config, 
            ...configUpdate 
          } 
        };
      }
      return step;
    }));
  };
  
  // Update grouping configuration
  const updateGroupingConfig = (configUpdate) => {
    setPipeline(pipeline.map(step => {
      if (step.id === 'grouping') {
        const updatedStep = { 
          ...step, 
          config: { 
            ...step.config, 
            ...configUpdate 
          } 
        };
        
        // Update showProcessedData based on grouping active state
        if (updatedStep.active) {
          setShowProcessedData(!updatedStep.active);
        }
        
        return updatedStep;
      }
      return step;
    }));
  };

  // Prepare the pipeline steps with callbacks and UI components
  const preparedPipeline = pipeline.map(step => {
    if (step.id === 'delimiter-separation') {
      return {
        ...step,
        onUpdateDelimiters: updateDelimiters
      };
    } else if (step.id === 'substring-segmentation') {
      return {
        ...step,
        onUpdateConfig: updateSegmentationConfig
      };
    } else if (step.id === 'number-replacement') {
      return {
        ...step,
        onUpdateConfig: updateNumberReplacementConfig,
        configUI: (
          <div className="step-config">
            <div className="config-row">
              <label>패턴:</label>
              <input
                type="text"
                className="delimiter-input"
                value={step.config.pattern || '\\d+'}
                onChange={(e) => updateNumberReplacementConfig({ pattern: e.target.value })}
                placeholder="정규식 패턴"
              />
            </div>
            <div className="delimiter-help">
              숫자를 \d+로 대체합니다. 다른 패턴도 사용 가능합니다.
            </div>
          </div>
        )
      };
    } else if (step.id === 'grouping') {
      return {
        ...step,
        onUpdateConfig: updateGroupingConfig,
        configUI: (
          <div className="step-config">
            <div className="config-row">
              <label>중복 제거:</label>
              <input
                type="checkbox"
                checked={step.config.removeDuplicates}
                onChange={(e) => updateGroupingConfig({ removeDuplicates: e.target.checked })}
              />
            </div>
            <div className="config-row">
              <label>시트 뷰:</label>
              <input
                type="checkbox"
                checked={step.config.useSheetView !== false}
                onChange={(e) => updateGroupingConfig({ useSheetView: e.target.checked })}
              />
            </div>
          </div>
        )
      };
    }
    return step;
  });

  // 분절값 목록 추출 함수
  const getSegmentValues = () => {
    if (!groupingData || !groupingData['분절값']) return [];
    return groupingData['분절값'];
  };

  return (
    <div className="separation-classifier" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="classifier-layout" style={{ height: '100%', display: 'flex' }}>
        {/* Data View */}
        <div className="data-view" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <h3>
            {isGroupingActive 
              ? "분절값 목록 및 사용자 정의 그룹" 
              : "처리된 데이터 (회색: 미처리 영역)"}
          </h3>
          <div className="data-content" style={{ flex: 1, overflow: 'auto' }}>
            {isGroupingActive && useSheetView ? (
              // 새로운 시트 뷰 컴포넌트 사용
              <GroupingSheet 
                segmentValues={getSegmentValues()} 
              />
            ) : (
              // 기존 데이터 표시 방식 유지
              <DataDisplay 
                processedData={showProcessedData ? processedData : null} 
                flattenData={flattenData}
                segmentationData={segmentationData}
                groupingData={groupingData}
                showProcessedData={showProcessedData}
                isGroupingActive={isGroupingActive}
              />
            )}
          </div>
        </div>

        {/* Right side - Pipeline */}
        <div className="pipeline-panel" style={{ width: '300px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <h3>파이프라인</h3>
          <div className="pipeline-list" style={{ flex: 1, overflow: 'auto' }}>
            {preparedPipeline.map((step, index) => (
              <PipelineStep 
                key={step.id}
                step={step}
                index={index}
                isSelected={selectedStep === step.id}
                onSelect={selectStep}
                onToggle={toggleStepActive}
              />
            ))}
            
            <button className="add-step">
              + 처리 단계 추가
            </button>
          </div>
          
          <div className="pipeline-actions">
            <button className="reset-button" onClick={onReset}>
              초기화
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeparationClassifier; 