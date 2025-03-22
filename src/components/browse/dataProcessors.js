/**
 * Process text to extract bracket content
 */
export const processBracketSeparation = (input) => {
  if (typeof input === 'string') {
    const bracketRegex = /\[(.*?)\]|\((.*?)\)|\{(.*?)\}/g;
    const matches = [];
    const matchDetails = [];
    let match;
    
    while ((match = bracketRegex.exec(input)) !== null) {
      const value = match[1] || match[2] || match[3];
      if (value) {
        matches.push(value);
        
        // Store metadata about the match
        matchDetails.push({
          value,
          bracketType: match[1] ? 'square' : match[2] ? 'round' : 'curly',
          fullMatch: match[0], // The full match including brackets
          startIndex: match.index,
          endIndex: match.index + match[0].length
        });
      }
    }
    
    // Clean the original string by removing all brackets
    const cleanedOriginal = input.replace(/\[.*?\]|\(.*?\)|\{.*?\}/g, '').replace(/\s+/g, ' ').trim();
    
    return {
      original: input,
      cleaned: cleanedOriginal,
      separated: matches,
      matchDetails: matchDetails,
      type: 'bracket-separation'
    };
  } else if (Array.isArray(input)) {
    return input.map(item => processBracketSeparation(item));
  } else if (typeof input === 'object' && input !== null) {
    const result = {};
    for (const key in input) {
      result[key] = processBracketSeparation(input[key]);
    }
    return result;
  }
  
  return input;
};

/**
 * Process text to separate by delimiters
 */
export const processDelimiterSeparation = (input, delimiters) => {
  // Sort delimiters by order property
  const activeDelimiters = delimiters
    .filter(d => d.enabled)
    .sort((a, b) => a.order - b.order)
    .map(d => d.value);
  
  if (typeof input === 'string') {
    let parts = [input];
    
    // Process each delimiter in sequence
    activeDelimiters.forEach(delimiter => {
      // Create a new array to store results after splitting by current delimiter
      const newParts = [];
      
      parts.forEach(part => {
        // Escape special regex characters in delimiter
        const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedDelimiter})`, 'g');
        
        // Split by current delimiter and add non-empty parts to the result
        part.split(regex)
          .filter(p => p.trim() !== '' && p.trim() !== delimiter)
          .forEach(p => newParts.push(p));
      });
      
      // Update parts for next delimiter
      parts = newParts;
    });
    
    return {
      original: input,
      separated: parts.map(part => ({
        value: part,
        source: 'delimiter'
      })),
      type: 'delimiter-separation'
    };
  } else if (input && input.type === 'bracket-separation') {
    // Get bracket details for later use
    const bracketDetails = input.matchDetails || [];
    
    // Process the original text with delimiter separation
    // Use the cleaned text (without brackets) if available
    const textToProcess = input.cleaned || input.original;
    
    let cleanTextParts = [];
    
    // Process clean text (text without brackets)
    if (textToProcess.trim().length > 0) {
      // Split by commas first if they exist
      if (textToProcess.includes(',')) {
        cleanTextParts = textToProcess.split(',')
          .map(part => part.trim())
          .filter(part => part.length > 0);
      } else {
        // Otherwise just use the whole text
        cleanTextParts = [textToProcess];
      }
    }
    
    // Process clean text parts with delimiters
    let processedCleanTextParts = [];
    
    // Process each delimiter in sequence
    cleanTextParts.forEach(textPart => {
      let parts = [textPart];
      
      activeDelimiters.forEach(delimiter => {
        if (delimiter === ',') return; // Skip comma as we already processed it
        
        const newParts = [];
        
        parts.forEach(part => {
          const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedDelimiter})`, 'g');
          
          part.split(regex)
            .filter(p => p.trim() !== '' && p.trim() !== delimiter)
            .forEach(p => newParts.push(p));
        });
        
        parts = newParts;
      });
      
      processedCleanTextParts = [...processedCleanTextParts, ...parts];
    });
    
    // Process bracket values separately
    const bracketSeparated = [];
    
    if (input.separated) {
      input.separated.forEach((val, index) => {
        // Get the original bracket info
        const bracketInfo = bracketDetails[index];
        
        // Process each bracket value with delimiters
        let bracketParts = [val];
        
        activeDelimiters.forEach(delimiter => {
          if (delimiter === ',') return; // Skip comma as we already processed it
          
          const newParts = [];
          
          bracketParts.forEach(part => {
            const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedDelimiter})`, 'g');
            
            part.split(regex)
              .filter(p => p.trim() !== '' && p.trim() !== delimiter)
              .forEach(p => newParts.push(p));
          });
          
          bracketParts = newParts;
        });
        
        // Add each part with the original bracket info
        if (bracketParts.length <= 1) {
          // If no splitting occurred, add the original value
          bracketSeparated.push({
            value: val,
            source: 'bracket',
            bracketInfo: bracketInfo
          });
        } else {
          // Add each split part with original bracket info
          bracketParts.forEach((part, partIdx) => {
            bracketSeparated.push({
              value: part,
              source: 'bracket',
              bracketInfo: bracketInfo,
              // Indicate this is a part of a split bracket value
              isSplitPart: true,
              partIndex: partIdx,
              totalParts: bracketParts.length
            });
          });
        }
      });
    }
    
    // Add processed clean text parts
    const cleanTextSeparated = processedCleanTextParts.map(part => ({
      value: part,
      source: 'clean-text'
    }));
    
    // Combine all parts (do not remove duplicates to preserve original order)
    const allParts = [...cleanTextSeparated, ...bracketSeparated];
    
    return {
      original: input.original,
      cleaned: input.cleaned,
      separated: allParts,
      type: 'delimiter-separation',
      previous: {
        type: input.type,
        separated: input.separated,
        matchDetails: input.matchDetails
      }
    };
  } else if (Array.isArray(input)) {
    return input.map(item => processDelimiterSeparation(item, delimiters));
  } else if (typeof input === 'object' && input !== null) {
    const result = {};
    for (const key in input) {
      result[key] = processDelimiterSeparation(input[key], delimiters);
    }
    return result;
  }
  
  return input;
};

/**
 * Flatten data structure to generate simple rows for display
 */
export const flattenData = (data, path = '', rows = []) => {
  if (!data) return rows;
  
  if (data.type === 'bracket-separation' || data.type === 'delimiter-separation') {
    rows.push({
      path,
      original: data.original,
      separated: data.separated,
      type: data.type,
      previous: data.previous,
      matchDetails: data.matchDetails || (data.previous ? data.previous.matchDetails : null)
    });
  } else if (data.type === 'substring-grouping') {
    // For substring grouping, preserve the groups and substrings
    rows.push({
      path,
      original: data.original,
      groups: data.groups,
      substrings: data.substrings,
      type: data.type,
      previous: data.previous
    });
  } else if (data.type === 'substring-segmentation') {
    // For substring segmentation, preserve the segmentation data
    rows.push({
      path,
      original: data.original,
      separated: data.separated,
      type: data.type,
      previous: data.previous
    });
  } else if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const itemPath = path ? `${path}[${index}]` : `[${index}]`;
      flattenData(item, itemPath, rows);
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      const keyPath = path ? `${path}.${key}` : key;
      flattenData(value, keyPath, rows);
    });
  } else if (path) {
    // Simple value
    rows.push({
      path,
      original: data,
      separated: []
    });
  }
  
  return rows;
};

/**
 * Process data to group by common substrings (prefixes or suffixes)
 */
export const processSubstringGrouping = (input, config) => {
  const { includeBrackets, minSubstringLength, minFrequency } = config;
  
  // Preserve the original data structure for display purposes
  let originalData = input;
  let previousSeparated = [];
  
  if (input.type === 'delimiter-separation' || input.type === 'bracket-separation') {
    originalData = input.original;
    previousSeparated = input.separated || [];
  }
  
  // Extract all values to group
  const extractValues = (data) => {
    if (!data) return [];
    
    if (Array.isArray(data)) {
      return data.flatMap(extractValues);
    } else if (typeof data === 'object' && data !== null) {
      if (data.separated && Array.isArray(data.separated)) {
        // This is a processed row with separated values
        return data.separated
          .filter(item => {
            // Skip bracket items if not including brackets
            if (!includeBrackets && item.source === 'bracket') {
              return false;
            }
            return true;
          })
          .map(item => typeof item === 'string' ? item : item.value);
      } else if (data.type === 'delimiter-separation' || data.type === 'bracket-separation') {
        // If this is already a processed row but we didn't catch it above
        if (data.separated && Array.isArray(data.separated)) {
          return data.separated
            .filter(item => includeBrackets || (item.source !== 'bracket'))
            .map(item => typeof item === 'string' ? item : item.value);
        }
        return [];
      } else {
        // Recursively extract from nested objects
        return Object.values(data).flatMap(extractValues);
      }
    } else if (typeof data === 'string') {
      return [data];
    }
    
    return [];
  };
  
  // Get all unique values
  const allValues = extractValues(input);
  const uniqueValues = [...new Set(allValues)].filter(val => val && val.trim().length >= minSubstringLength);
  
  // Filter out substrings that are contained within others with the same frequency
  const filterSubstrings = (substrings) => {
    const result = [];
    
    // Group by frequency first
    const freqGroups = new Map();
    for (const [substring, count] of substrings) {
      if (!freqGroups.has(count)) {
        freqGroups.set(count, []);
      }
      freqGroups.get(count).push(substring);
    }
    
    // For each frequency group, filter out contained substrings
    for (const [count, substrs] of freqGroups.entries()) {
      // Sort by length (longest first)
      substrs.sort((a, b) => b.length - a.length);
      
      const filtered = [];
      for (const substr of substrs) {
        // Check if this substring is contained in any already filtered string
        const isContained = filtered.some(existing => 
          existing.includes(substr) && existing !== substr
        );
        
        if (!isContained) {
          filtered.push(substr);
        }
      }
      
      // Add filtered substrings with their counts
      for (const substr of filtered) {
        result.push([substr, count]);
      }
    }
    
    return result;
  };
  
  // Find common prefixes with filtering
  const findPrefixes = (values) => {
    const prefixMap = new Map();
    
    // Count all possible prefixes
    values.forEach(value => {
      if (typeof value !== 'string' || !value) return;
      
      for (let length = minSubstringLength; length <= value.length; length++) {
        const prefix = value.substring(0, length);
        prefixMap.set(prefix, (prefixMap.get(prefix) || 0) + 1);
      }
    });
    
    // Get candidates and filter by minimum frequency
    const candidates = [...prefixMap.entries()]
      .filter(([prefix, count]) => count >= minFrequency)
      .sort((a, b) => {
        // First by frequency (descending)
        if (b[1] !== a[1]) return b[1] - a[1];
        // Then by length (longer first)
        return b[0].length - a[0].length;
      });
    
    return filterSubstrings(candidates);
  };
  
  // Find common suffixes with filtering
  const findSuffixes = (values) => {
    const suffixMap = new Map();
    
    // Count all possible suffixes
    values.forEach(value => {
      if (typeof value !== 'string' || !value) return;
      
      for (let length = minSubstringLength; length <= value.length; length++) {
        const suffix = value.substring(value.length - length);
        suffixMap.set(suffix, (suffixMap.get(suffix) || 0) + 1);
      }
    });
    
    // Get candidates and filter by minimum frequency
    const candidates = [...suffixMap.entries()]
      .filter(([suffix, count]) => count >= minFrequency)
      .sort((a, b) => {
        // First by frequency (descending)
        if (b[1] !== a[1]) return b[1] - a[1];
        // Then by length (longer first)
        return b[0].length - a[0].length;
      });
    
    return filterSubstrings(candidates);
  };
  
  // Find the most significant prefixes and suffixes
  const prefixes = findPrefixes(uniqueValues);
  const suffixes = findSuffixes(uniqueValues);
  
  // Combine prefixes and suffixes, while avoiding duplicates
  let combinedSubstrings = [...prefixes];
  suffixes.forEach(([suffix, count]) => {
    // Check if this suffix already exists in prefixes (avoid duplicates)
    if (!prefixes.some(([prefix]) => prefix === suffix)) {
      combinedSubstrings.push([suffix, count]);
    }
  });
  
  // Sort by frequency and then by length
  combinedSubstrings.sort((a, b) => {
    // First by frequency (descending)
    if (b[1] !== a[1]) return b[1] - a[1];
    // Then by length (longer first)
    return b[0].length - a[0].length;
  });
  
  // Group values by substring
  const groupBySubstring = (values, substrings) => {
    const result = {};
    const ungrouped = [...values]; // Start with all values, remove as they get grouped
    
    // Initialize groups
    substrings.forEach(([substring]) => {
      result[substring] = [];
    });
    
    // Assign values to groups
    substrings.forEach(([substring]) => {
      // Find values that match this substring
      for (let i = ungrouped.length - 1; i >= 0; i--) {
        const value = ungrouped[i];
        if (typeof value !== 'string' || !value) continue;
        
        // Check if value starts with or ends with the substring
        if (value.startsWith(substring) || value.endsWith(substring)) {
          result[substring].push(value);
          ungrouped.splice(i, 1); // Remove from ungrouped
        }
      }
    });
    
    // Add the remaining ungrouped values
    result['__ungrouped__'] = ungrouped.filter(v => typeof v === 'string' && v);
    
    return result;
  };
  
  // Group values by substring
  const groups = groupBySubstring(uniqueValues, combinedSubstrings);
  
  // Return grouped data, including original data structure
  return {
    original: originalData,
    separated: previousSeparated,
    groups,
    substrings: combinedSubstrings.map(([substring, count]) => ({ substring, count })),
    ungrouped: groups['__ungrouped__'] || [],
    type: 'substring-grouping',
    previous: {
      type: input.type,
      separated: input.separated
    }
  };
};

/**
 * Process data to segment strings based on substrings contained in other strings
 */
export const processSubstringSegmentation = (input, config) => {
  const { minSubstringLength, minOccurrence } = config;
  
  // Extract all values from input data
  const extractAllValues = (data) => {
    if (!data) return [];
    
    if (Array.isArray(data)) {
      return data.flatMap(extractAllValues);
    } else if (typeof data === 'object' && data !== null) {
      if (data.separated && Array.isArray(data.separated)) {
        // Extract from processed data rows
        return data.separated
          .map(item => typeof item === 'string' ? item : item.value);
      } else {
        // Recursively extract from nested objects
        return Object.values(data).flatMap(extractAllValues);
      }
    } else if (typeof data === 'string') {
      return [data];
    }
    
    return [];
  };
  
  // Find all strings from input
  let allValues = [];
  
  if (input.type === 'delimiter-separation' || input.type === 'bracket-separation') {
    // Extract from already processed data
    if (input.separated && Array.isArray(input.separated)) {
      allValues = input.separated.map(item => 
        typeof item === 'string' ? item : item.value
      );
    } else {
      allValues = extractAllValues(input);
    }
  } else if (Array.isArray(input)) {
    allValues = input.flatMap(extractAllValues);
  } else if (typeof input === 'object' && input !== null) {
    allValues = Object.values(input).flatMap(extractAllValues);
  }
  
  // Filter out empty or too short strings
  allValues = allValues.filter(val => 
    typeof val === 'string' && val.trim().length >= minSubstringLength
  );
  
  // Identify candidate substrings (those that appear in multiple values)
  const candidateSubstrings = [];
  const valueOccurrences = new Map();
  
  // First pass: collect all possible substrings of sufficient length
  allValues.forEach(value => {
    if (typeof value !== 'string') return;
    
    // Generate all possible substrings of sufficient length
    for (let startIdx = 0; startIdx <= value.length - minSubstringLength; startIdx++) {
      for (let endIdx = startIdx + minSubstringLength; endIdx <= value.length; endIdx++) {
        const substring = value.substring(startIdx, endIdx);
        if (substring.length >= minSubstringLength) {
          const current = valueOccurrences.get(substring) || [];
          // Only add unique values
          if (!current.includes(value)) {
            current.push(value);
            valueOccurrences.set(substring, current);
          }
        }
      }
    }
  });
  
  // Filter substrings that appear in at least minOccurrence different values
  valueOccurrences.forEach((values, substring) => {
    if (values.length >= minOccurrence) {
      candidateSubstrings.push({
        substring,
        occurrences: values.length,
        values: values
      });
    }
  });
  
  // Sort by length (prefer longer substrings) and then by occurrences
  candidateSubstrings.sort((a, b) => {
    // Prefer longer substrings
    if (b.substring.length !== a.substring.length) {
      return b.substring.length - a.substring.length;
    }
    // If same length, prefer more occurrences
    return b.occurrences - a.occurrences;
  });
  
  // Create segmentation info
  const segmentations = new Map();
  
  // Process each string to find segmentation points
  allValues.forEach(value => {
    if (typeof value !== 'string') return;
    
    // Skip short strings
    if (value.length < minSubstringLength * 2) {
      segmentations.set(value, [{ text: value, isSubstring: false }]);
      return;
    }
    
    const segments = [];
    let remaining = value;
    let startIndex = 0;
    let madeChanges = true;
    
    // Continue until no more changes can be made or we've processed the whole string
    while (madeChanges && remaining.length > 0) {
      madeChanges = false;
      
      // Try to find matches from candidate substrings
      for (const candidate of candidateSubstrings) {
        const { substring } = candidate;
        
        // Skip if this substring is the entire value
        if (substring === value) continue;
        
        const index = remaining.indexOf(substring);
        if (index !== -1) {
          // We found a match
          madeChanges = true;
          
          // Add segment before match if it exists
          if (index > 0) {
            segments.push({
              text: remaining.substring(0, index),
              isSubstring: false,
              position: startIndex
            });
          }
          
          // Add the matching substring
          segments.push({
            text: substring,
            isSubstring: true,
            position: startIndex + index
          });
          
          // Update remaining and startIndex
          remaining = remaining.substring(index + substring.length);
          startIndex += index + substring.length;
          
          // Break out to restart with our new remaining string
          break;
        }
      }
    }
    
    // Add any remaining text
    if (remaining.length > 0) {
      segments.push({
        text: remaining,
        isSubstring: false,
        position: startIndex
      });
    }
    
    // If no segmentation was found, just use the original value
    if (segments.length === 0) {
      segments.push({
        text: value,
        isSubstring: false,
        position: 0
      });
    }
    
    // Sort segments by position to ensure correct order
    segments.sort((a, b) => a.position - b.position);
    
    // Store segmentation for this value
    segmentations.set(value, segments);
  });
  
  // Process the input to apply segmentations
  const processWithSegmentations = (data) => {
    if (!data) return data;
    
    if (typeof data === 'string') {
      return {
        original: data,
        segments: segmentations.get(data) || [{ text: data, isSubstring: false }],
        type: 'substring-segmentation'
      };
    } else if (data.type === 'delimiter-separation' || data.type === 'bracket-separation') {
      // Create a copy of the input but with segmented info
      const result = { ...data };
      
      // Add segmentation info to each separated item
      if (result.separated && Array.isArray(result.separated)) {
        // 브라켓 아이템과 일반 아이템 분리
        const bracketItems = result.separated.filter(item => 
          typeof item === 'object' && item.source === 'bracket'
        );
        
        const nonBracketItems = result.separated.filter(item => 
          typeof item !== 'object' || item.source !== 'bracket'
        );
        
        // 각각 처리
        const processedBracketItems = bracketItems.map(item => {
          const value = typeof item === 'string' ? item : item.value;
          const segments = segmentations.get(value) || [{ text: value, isSubstring: false }];
          return {
            ...item,
            segments
          };
        });
        
        const processedNonBracketItems = nonBracketItems.map(item => {
          const value = typeof item === 'string' ? item : item.value;
          const segments = segmentations.get(value) || [{ text: value, isSubstring: false }];
          
          if (typeof item === 'string') {
            return {
              value,
              segments,
              source: 'text'
            };
          } else {
            return {
              ...item,
              segments
            };
          }
        });
        
        // 브라켓 아이템을 원래 위치에 맞게 배치 - 원래 배열 순서 유지
        let resultItems = [];
        
        if (data.type === 'bracket-separation' && data.matchDetails) {
          // 괄호 위치 정보가 있는 경우 위치 순서대로 배치
          const bracketsByIndex = {};
          processedBracketItems.forEach((item, idx) => {
            if (item.bracketInfo && item.bracketInfo.startIndex !== undefined) {
              bracketsByIndex[item.bracketInfo.startIndex] = item;
            }
          });
          
          // 원래 배열에서의 순서를 유지
          result.separated.forEach(originalItem => {
            if (typeof originalItem === 'object' && originalItem.source === 'bracket') {
              if (originalItem.bracketInfo && bracketsByIndex[originalItem.bracketInfo.startIndex]) {
                resultItems.push(bracketsByIndex[originalItem.bracketInfo.startIndex]);
              }
            } else {
              // 일반 아이템 중에서 찾기
              const value = typeof originalItem === 'string' ? originalItem : originalItem.value;
              const matchingItem = processedNonBracketItems.find(item => {
                const itemValue = typeof item === 'string' ? item : item.value;
                return itemValue === value;
              });
              
              if (matchingItem) {
                resultItems.push(matchingItem);
                // 이미 사용된 아이템 제거
                processedNonBracketItems.splice(processedNonBracketItems.indexOf(matchingItem), 1);
              }
            }
          });
          
          // 남은 아이템 추가
          resultItems = [...resultItems, ...processedNonBracketItems];
        } else {
          // 위치 정보가 없는 경우 원래 순서 유지
          resultItems = result.separated.map(item => {
            if (typeof item === 'object' && item.source === 'bracket') {
              return processedBracketItems.find(b => b.value === item.value) || item;
            } else {
              const value = typeof item === 'string' ? item : item.value;
              return processedNonBracketItems.find(b => {
                const itemValue = typeof b === 'string' ? b : b.value;
                return itemValue === value;
              }) || item;
            }
          });
        }
        
        result.separated = resultItems;
      }
      
      result.type = 'substring-segmentation';
      result.previous = {
        type: data.type,
        separated: data.separated,
        matchDetails: data.matchDetails
      };
      
      return result;
    } else if (Array.isArray(data)) {
      return data.map(processWithSegmentations);
    } else if (typeof data === 'object' && data !== null) {
      const result = {};
      for (const key in data) {
        result[key] = processWithSegmentations(data[key]);
      }
      return result;
    }
    
    return data;
  };
  
  return {
    segmentations: Array.from(segmentations.entries()).map(([value, segments]) => ({
      value,
      segments
    })),
    candidateSubstrings,
    processed: processWithSegmentations(input)
  };
}; 