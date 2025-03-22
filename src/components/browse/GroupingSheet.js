import React, { useState, useEffect, useRef } from 'react';
import './GroupingSheet.css';

const GroupingSheet = ({ segmentValues = [] }) => {
  // 기본 빈 그룹들 생성 (미처리 + 추가 빈 그룹들)
  const [groups, setGroups] = useState([
    { id: 'unprocessed', name: '미처리', items: [], isDefault: true, isEditable: false },
    { id: 'group-1', name: '그룹 1', items: [], isDefault: false, isEditable: true },
    { id: 'group-2', name: '그룹 2', items: [], isDefault: false, isEditable: true },
    { id: 'group-3', name: '그룹 3', items: [], isDefault: false, isEditable: true }
  ]);
  
  // 값들의 그룹 할당 상태 관리
  const [valueGroups, setValueGroups] = useState({});
  
  // 선택된 그룹 관리
  const [selectedGroupId, setSelectedGroupId] = useState('group-1');
  
  // 각 그룹별 정렬 상태 관리
  const [sortStates, setSortStates] = useState({});
  
  // 미처리 칼럼의 그리드 레이아웃 상태 관리 (1xn, 2xn, 3xn, 4xn)
  const [columnCount, setColumnCount] = useState(2);
  
  // 스크롤 가능한 영역 참조
  const scrollableRef = useRef(null);
  
  // 각 그룹 칼럼 참조를 저장하는 객체
  const columnRefs = useRef({});
  
  // 미처리 아이템 스크롤 영역 참조
  const unprocessedItemsRef = useRef(null);
  
  // 컴포넌트 마운트시 미처리 그룹에 모든 분절값 추가
  useEffect(() => {
    if (segmentValues.length > 0) {
      // 초기 상태에서 모든 값은 미처리 그룹에 할당
      const initialValueGroups = {};
      segmentValues.forEach(value => {
        initialValueGroups[value] = 'unprocessed';
      });
      
      setValueGroups(initialValueGroups);
      
      // 미처리 그룹에 값 할당
      setGroups(prevGroups => {
        const updatedGroups = [...prevGroups];
        const unprocessedGroup = updatedGroups.find(g => g.id === 'unprocessed');
        if (unprocessedGroup) {
          unprocessedGroup.items = [...segmentValues];
        }
        return updatedGroups;
      });
      
      // 각 그룹의 정렬 상태 초기화
      const initialSortStates = {};
      groups.forEach(group => {
        initialSortStates[group.id] = {
          type: 'none', // 'none', 'firstAsc', 'firstDesc', 'lastAsc', 'lastDesc'
        };
      });
      setSortStates(initialSortStates);
    }
  }, [segmentValues]);
  
  // 그룹 선택 함수
  const selectGroup = (groupId) => {
    if (groupId !== 'unprocessed') {
      setSelectedGroupId(groupId);
      scrollToGroup(groupId);
    }
  };
  
  // 특정 그룹으로 스크롤하는 함수
  const scrollToGroup = (groupId) => {
    if (scrollableRef.current && columnRefs.current[groupId]) {
      const container = scrollableRef.current;
      const element = columnRefs.current[groupId];
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // 요소가 컨테이너 범위 밖에 있는지 확인
      if (elementRect.left < containerRect.left || elementRect.right > containerRect.right) {
        // 요소의 왼쪽 위치로 스크롤 (부드러운 스크롤 애니메이션 적용)
        container.scrollTo({
          left: element.offsetLeft - container.offsetLeft,
          behavior: 'smooth'
        });
      }
    }
  };
  
  // 값을 그룹에 할당하는 함수
  const assignToGroup = (value, groupId) => {
    // 같은 그룹으로 이동이면 무시
    if (valueGroups[value] === groupId) return;
    
    // 현재 할당된 그룹에서 제거
    const currentGroupId = valueGroups[value];
    if (currentGroupId) {
      setGroups(prevGroups => {
        return prevGroups.map(group => {
          if (group.id === currentGroupId) {
            return {
              ...group,
              items: group.items.filter(item => item !== value)
            };
          }
          return group;
        });
      });
    }
    
    // 새 그룹에 추가
    setGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.id === groupId) {
          return {
            ...group,
            items: [...group.items, value]
          };
        }
        return group;
      });
    });
    
    // 값의 그룹 매핑 업데이트
    setValueGroups({
      ...valueGroups,
      [value]: groupId
    });
  };
  
  // 아이템 클릭 핸들러
  const handleItemClick = (value, currentGroupId) => {
    // 미처리 항목을 클릭한 경우, 선택된 그룹으로 이동
    if (currentGroupId === 'unprocessed' && selectedGroupId !== 'unprocessed') {
      assignToGroup(value, selectedGroupId);
    }
    // 다른 그룹의 항목을 클릭한 경우, 미처리로 되돌림
    else if (currentGroupId !== 'unprocessed') {
      assignToGroup(value, 'unprocessed');
    }
  };
  
  // 그룹명 변경 함수
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  
  const startEditingGroupName = (group, e) => {
    // 이벤트 전파 방지 (그룹 선택과 충돌방지)
    e.stopPropagation();
    
    if (!group.isEditable) return; // 수정 불가 그룹은 변경 불가
    setEditingGroupId(group.id);
    setEditingGroupName(group.name);
  };
  
  const saveGroupName = () => {
    if (!editingGroupName.trim()) return;
    
    setGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.id === editingGroupId) {
          return {
            ...group,
            name: editingGroupName.trim()
          };
        }
        return group;
      });
    });
    
    setEditingGroupId(null);
    setEditingGroupName('');
  };
  
  // 그룹 추가 함수
  const addGroup = () => {
    const newGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: newGroupId,
      name: `그룹 ${groups.length}`,
      items: [],
      isDefault: false,
      isEditable: true
    };
    
    setGroups([...groups, newGroup]);
    
    // 새 그룹의 정렬 상태 초기화
    setSortStates(prevStates => ({
      ...prevStates,
      [newGroupId]: { type: 'none' }
    }));
  };
  
  // 정렬 상태 순서 정의
  const sortCycle = ['none', 'firstAsc', 'firstDesc', 'lastAsc', 'lastDesc'];
  
  // 정렬 버튼 클릭시 순환하는 함수
  const cycleSortType = (groupId) => {
    const currentType = sortStates[groupId]?.type || 'none';
    const currentIndex = sortCycle.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % sortCycle.length;
    const nextType = sortCycle[nextIndex];
    
    sortItems(groupId, nextType);
  };
  
  // 정렬 함수
  const sortItems = (groupId, sortType) => {
    setSortStates(prevStates => ({
      ...prevStates,
      [groupId]: { type: sortType }
    }));
    
    setGroups(prevGroups => {
      return prevGroups.map(group => {
        if (group.id === groupId) {
          const sortedItems = [...group.items];
          
          switch (sortType) {
            case 'firstAsc':
              sortedItems.sort((a, b) => a.localeCompare(b));
              break;
            case 'firstDesc':
              sortedItems.sort((a, b) => b.localeCompare(a));
              break;
            case 'lastAsc':
              sortedItems.sort((a, b) => {
                const aLast = a.charAt(a.length - 1);
                const bLast = b.charAt(b.length - 1);
                return aLast.localeCompare(bLast) || a.localeCompare(b);
              });
              break;
            case 'lastDesc':
              sortedItems.sort((a, b) => {
                const aLast = a.charAt(a.length - 1);
                const bLast = b.charAt(b.length - 1);
                return bLast.localeCompare(aLast) || b.localeCompare(a);
              });
              break;
            default:
              break;
          }
          
          return {
            ...group,
            items: sortedItems
          };
        }
        return group;
      });
    });
  };
  
  // 정렬 상태에 따른 아이콘 및 텍스트 표시
  const getSortLabel = (groupId) => {
    const currentSort = sortStates[groupId]?.type || 'none';
    
    switch (currentSort) {
      case 'firstAsc':
        return '앞글자 A→Z';
      case 'firstDesc':
        return '앞글자 Z→A';
      case 'lastAsc':
        return '끝글자 A→Z';
      case 'lastDesc':
        return '끝글자 Z→A';
      default:
        return '정렬';
    }
  };
  
  // 미처리 칼럼의 레이아웃 변경 함수
  const cycleColumnCount = (e) => {
    e.stopPropagation(); // 그룹 선택과 충돌방지
    setColumnCount(prevCount => {
      // 1, 2, 3, 4 순으로 순환
      return prevCount === 4 ? 1 : prevCount + 1;
    });
  };
  
  // 레이아웃 변경 버튼 텍스트 반환
  const getLayoutLabel = () => {
    return `${columnCount}x`;
  };
  
  // 일반 그룹만 따로 필터링 (미처리 제외)
  const normalGroups = groups.filter(group => group.id !== 'unprocessed');
  
  // 미처리 그룹 찾기
  const unprocessedGroup = groups.find(group => group.id === 'unprocessed');

  // 인덱스 그룹으로 스크롤 함수
  const scrollToIndex = (index) => {
    if (!unprocessedItemsRef.current) return;
    
    const indexElement = document.getElementById(`index-${index}`);
    if (indexElement) {
      unprocessedItemsRef.current.scrollTop = indexElement.offsetTop;
    }
  };

  // 항목을 인덱스별로 그룹화하는 함수
  const getGroupedItems = (items) => {
    const grouped = {};
    
    // 한글 자음 및 알파벳 인덱스 정의
    const koreanIndices = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const alphabetIndices = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    const numericIndex = '#';
    
    // 인덱스 초기화
    [...koreanIndices, ...alphabetIndices, numericIndex].forEach(index => {
      grouped[index] = [];
    });
    
    // 각 항목을 해당 인덱스에 분류
    items.forEach(item => {
      const firstChar = item.charAt(0).toUpperCase();
      
      // 첫 글자가 한글인지 확인
      if (/[가-힣]/.test(firstChar)) {
        // 한글 자음 결정 (초성 추출)
        const code = firstChar.charCodeAt(0) - 44032;
        const cho = Math.floor(code / 588);
        const index = koreanIndices[cho] || koreanIndices[0];
        grouped[index].push(item);
      }
      // 첫 글자가 알파벳인지 확인
      else if (/[A-Z]/.test(firstChar)) {
        grouped[firstChar].push(item);
      }
      // 숫자 및 기타 문자
      else {
        grouped[numericIndex].push(item);
      }
    });
    
    // 비어있지 않은 그룹만 필터링
    const filteredGroups = {};
    [...koreanIndices, ...alphabetIndices, numericIndex].forEach(index => {
      if (grouped[index].length > 0) {
        filteredGroups[index] = grouped[index];
      }
    });
    
    return filteredGroups;
  };

  // 그룹 헤더 렌더링 함수
  const renderGroupHeader = (group) => (
    <div 
      className={`group-header ${selectedGroupId === group.id ? 'selected-group-header' : ''} ${group.id === 'unprocessed' ? 'unprocessed-header' : ''}`}
      onClick={() => selectGroup(group.id)}
    >
      {editingGroupId === group.id ? (
        <div className="group-name-edit" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editingGroupName}
            onChange={(e) => setEditingGroupName(e.target.value)}
            onBlur={saveGroupName}
            onKeyDown={(e) => e.key === 'Enter' && saveGroupName()}
            autoFocus
          />
        </div>
      ) : (
        <div className="group-title">
          <span 
            className="group-name"
            onClick={(e) => startEditingGroupName(group, e)}
            title={!group.isEditable ? "이 그룹명은 변경할 수 없습니다" : "클릭하여 그룹명 변경"}
          >
            {group.name} ({group.items.length})
          </span>
          
          <div className="header-actions">
            <button 
              className={`sort-cycle-btn ${sortStates[group.id]?.type !== 'none' ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                cycleSortType(group.id);
              }}
              title="클릭하여 정렬 방식 변경"
            >
              {getSortLabel(group.id)}
            </button>
            
            {group.id === 'unprocessed' && (
              <button 
                className="column-layout-btn"
                onClick={cycleColumnCount}
                title="클릭하여 열 레이아웃 변경"
              >
                {getLayoutLabel()}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // 그룹 아이템 렌더링 함수
  const renderGroupItems = (group) => {
    if (group.id === 'unprocessed') {
      // 미처리 항목은 동적 그리드로 표시
      const groupedItems = getGroupedItems(group.items);
      
      return (
        <div className="unprocessed-items-container">
          <div className="alphabet-index">
            {Object.keys(groupedItems).map(index => (
              <div 
                key={`alphabet-${index}`} 
                className="index-item"
                onClick={() => scrollToIndex(index)}
              >
                {index}
              </div>
            ))}
          </div>
          
          <div className="unprocessed-items" ref={unprocessedItemsRef}>
            {Object.entries(groupedItems).map(([index, items]) => (
              <div key={`section-${index}`}>
                <div className="index-header" id={`index-${index}`}>{index}</div>
                <div className={`multi-column-grid columns-${columnCount}`}>
                  {items.map(value => (
                    <div 
                      key={`${group.id}-${value}`}
                      className="group-item clickable"
                      onClick={() => handleItemClick(value, group.id)}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // 일반 그룹은 기존 방식대로 표시
      return (
        <div className="group-items">
          {group.items.map(value => (
            <div 
              key={`${group.id}-${value}`}
              className={`group-item ${(group.id === 'unprocessed' || group.id !== 'unprocessed') ? 'clickable' : ''}`}
              onClick={() => handleItemClick(value, group.id)}
            >
              {value}
            </div>
          ))}
          {group.items.length === 0 && group.id !== 'unprocessed' && (
            <div className="empty-group-message">
              미처리 항목을 클릭하여 이 그룹에 추가하세요
            </div>
          )}
        </div>
      );
    }
  };
  
  return (
    <div className="grouping-sheet">
      <div className="grouping-actions">
        <button className="add-group-btn" onClick={addGroup}>
          <span className="btn-icon">+</span>새 그룹 추가
        </button>
        
        <div className="group-tags">
          {normalGroups.map(group => (
            <div 
              key={`tag-${group.id}`}
              className={`group-tag ${selectedGroupId === group.id ? 'active' : ''}`}
              onClick={() => selectGroup(group.id)}
            >
              {group.name}
            </div>
          ))}
        </div>
      </div>
      
      <div className="sheet-container">
        {unprocessedGroup && (
          <div className="freeze-column">
            {renderGroupHeader(unprocessedGroup)}
            <div className="group-column unprocessed-column">
              {renderGroupItems(unprocessedGroup)}
            </div>
          </div>
        )}
        
        <div className="scrollable-columns" ref={scrollableRef}>
          <div className="grouping-grid">
            {normalGroups.map(group => (
              <div 
                key={group.id} 
                className="group-col fixed-width"
                ref={el => columnRefs.current[group.id] = el}
              >
                {renderGroupHeader(group)}
                <div 
                  className={`group-column ${selectedGroupId === group.id ? 'selected-group' : ''}`}
                >
                  {renderGroupItems(group)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupingSheet; 