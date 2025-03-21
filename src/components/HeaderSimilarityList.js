// import React, { useState, useEffect, useRef } from 'react';
// import { fetchHeaderSimilarityList } from '../services/api';
// import './Column.css';

// const HeaderSimilarityList = ({ channel, selectedHeader, onSimilarityGroupUpdate, groups, onRemoveGroup }) => {
//   const [similarHeaders, setSimilarHeaders] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedSimilarityGroup, setSelectedSimilarityGroup] = useState([]);
//   const [representativeHeader, setRepresentativeHeader] = useState(null);
//   const [activeTab, setActiveTab] = useState('select'); // 'select' or 'saved'
//   const [isSelectedGroupCollapsed, setIsSelectedGroupCollapsed] = useState(false);
  
//   // 마지막 클릭된 헤더와 타임스탬프를 저장
//   const lastClickRef = useRef({ header: null, timestamp: 0 });

//   useEffect(() => {
//     const getSimilarHeaders = async () => {
//       if (!channel || !selectedHeader) return;
      
//       setLoading(true);
//       try {
//         const response = await fetchHeaderSimilarityList(channel, selectedHeader);
//         console.log('Similar headers response:', response);
//         setSimilarHeaders(response.list || []);
//         setError(null);
//       } catch (err) {
//         setError(err.message);
//         setSimilarHeaders([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     getSimilarHeaders();
//     // Reset selected group when header changes
//     setSelectedSimilarityGroup([]);
//     setRepresentativeHeader(null);
//   }, [channel, selectedHeader]);

//   const handleSimilarHeaderSelect = (header) => {
//     // 중복 클릭 방지 및 디바운싱
//     const now = Date.now();
//     if (lastClickRef.current.header === header && 
//         now - lastClickRef.current.timestamp < 500) {
//       // 0.5초 이내에 동일한 헤더를 다시 클릭한 경우 무시
//       return;
//     }
    
//     // 클릭 정보 업데이트
//     lastClickRef.current = { header, timestamp: now };
    
//     // 버그 수정: 중복 호출 방지를 위한 체크 추가
//     const headerObj = similarHeaders.find(h => h.header === header);
    
//     if (!headerObj) return; // 헤더가 존재하지 않으면 무시

//     // 이미 선택된 헤더인지 확인
//     const isAlreadySelected = selectedSimilarityGroup.some(h => h.header === header);
    
//     if (isAlreadySelected) {
//       // 이미 선택된 경우, 선택 해제
//       const newGroup = selectedSimilarityGroup.filter(h => h.header !== header);
//       setSelectedSimilarityGroup(newGroup);
      
//       // 대표어가 제거된 경우 새로운 대표어 선택
//       if (representativeHeader === header) {
//         setRepresentativeHeader(newGroup.length > 0 ? newGroup[0].header : null);
//       }
//     } else {
//       // 선택되지 않은 경우, 선택에 추가
//       const newGroup = [...selectedSimilarityGroup, headerObj];
//       setSelectedSimilarityGroup(newGroup);
      
//       // 첫 번째 항목인 경우 대표어로 설정
//       if (selectedSimilarityGroup.length === 0) {
//         setRepresentativeHeader(header);
//       }
//     }
//   };

//   const handleRemoveFromGroup = (header) => {
//     setSelectedSimilarityGroup(prev => prev.filter(h => h.header !== header));
//     // If representative header is removed, reset it
//     if (representativeHeader === header) {
//       setRepresentativeHeader(selectedSimilarityGroup.length > 1 ? selectedSimilarityGroup[0].header : null);
//     }
//   };

//   const handleSetRepresentative = (header) => {
//     setRepresentativeHeader(header);
//   };

//   const handleSaveGroup = () => {
//     if (selectedSimilarityGroup.length > 0 && representativeHeader) {
//       // 유사군 데이터를 일관된 형식으로 변환
//       const groupData = selectedSimilarityGroup.map(item => ({
//         header: item.header,
//         // 기타 필요한 속성 유지
//         ...item
//       }));
      
//       // 선택한 그룹에 현재 선택한 헤더가 없다면 추가
//       const hasCurrentHeader = groupData.some(item => item.header === selectedHeader);
//       if (!hasCurrentHeader && selectedHeader) {
//         groupData.push({ header: selectedHeader });
//       }
      
//       console.log('저장할 유사군 데이터:', groupData, representativeHeader);
      
//       onSimilarityGroupUpdate && onSimilarityGroupUpdate(
//         groupData, 
//         representativeHeader
//       );
      
//       // Clear the selected group after saving
//       setSelectedSimilarityGroup([]);
//       setRepresentativeHeader(null);
      
//       // 저장 후 자동으로 저장된 탭으로 전환
//       setActiveTab('saved');
//     }
//   };

//   // Create a list of all headers that are already part of saved groups
//   const savedGroupHeaders = groups ? groups.flatMap(group => 
//     group.items.map(item => item.header)
//   ) : [];

//   // Filter out headers that are already in the selected group or in any saved group
//   const filteredSimilarHeaders = similarHeaders.filter(
//     h => !selectedSimilarityGroup.some(selected => selected.header === h.header) &&
//          !savedGroupHeaders.includes(h.header)
//   );

//   if (!channel || !selectedHeader) {
//     return (
//       <div className="column-container">
//         <div className="column-empty">채널과 헤더를 선택해주세요.</div>
//       </div>
//     );
//   }

//   return (
//     <div className="column-container">
//       <h2 className="column-title">
//         헤더명 유사군: {selectedHeader}
//         {selectedSimilarityGroup.length > 0 && (
//           <span className="selection-badge">{selectedSimilarityGroup.length}</span>
//         )}
//       </h2>
      
//       {activeTab === 'select' ? (
//         <div className="tab-content">
//           {/* 선택된 유사군 섹션 */}
//           {selectedSimilarityGroup.length > 0 && (
//             <div className="selected-group-compact">
//               <div className="selected-group-header">
//                 <div className="header-section">
//                   <h3 className="group-subtitle">
//                     선택된 유사군 ({selectedSimilarityGroup.length})
//                     <button 
//                       className="toggle-collapse-btn"
//                       onClick={() => setIsSelectedGroupCollapsed(!isSelectedGroupCollapsed)}
//                       title={isSelectedGroupCollapsed ? "펼치기" : "접기"}
//                     >
//                       {isSelectedGroupCollapsed ? "+" : "-"}
//                     </button>
//                   </h3>
                  
//                   {!isSelectedGroupCollapsed && (
//                     <>
//                       {!representativeHeader && (
//                         <div className="no-rep-warning">대표 헤더를 선택해 주세요</div>
//                       )}
//                       {representativeHeader && (
//                         <div className="representative-label">
//                           대표: <span className="rep-name">{representativeHeader}</span>
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
                
//                 {!isSelectedGroupCollapsed && (
//                   <button 
//                     className="save-group-btn"
//                     disabled={!representativeHeader || selectedSimilarityGroup.length < 2}
//                     onClick={handleSaveGroup}
//                     title="현재 선택된 유사 헤더를 그룹으로 저장합니다"
//                   >
//                     저장
//                   </button>
//                 )}
                
//                 {isSelectedGroupCollapsed && selectedSimilarityGroup.length > 0 && (
//                   <div className="collapsed-summary">
//                     {selectedSimilarityGroup.length} 항목 선택됨
//                     {representativeHeader && ` (대표: ${representativeHeader})`}
//                   </div>
//                 )}
//               </div>
              
//               {!isSelectedGroupCollapsed && (
//                 <div className="selected-group-content">
//                   <div className="selected-items-horizontal">
//                     {selectedSimilarityGroup.map((item, index) => (
//                       <div key={index} className="selected-tag">
//                         <span className={`tag-text ${representativeHeader === item ? 'is-representative' : ''}`}>
//                           {item}
//                         </span>
//                         <button 
//                           className="remove-btn small"
//                           onClick={() => handleRemoveFromGroup(item)}
//                           title="선택에서 제거"
//                         >
//                           ×
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
          
//           <div className="similarity-vertical-layout">
//             <div className="similarity-header-section">
//               <h3 className="group-subtitle">유사 헤더 선택</h3>
              
//               {/* 유사 헤더 아이템 목록 */}
//               <div className="similarity-items">
//                 {loading ? (
//                   <div className="loading">로딩 중...</div>
//                 ) : error ? (
//                   <div className="error">에러: {error}</div>
//                 ) : similarHeaders && similarHeaders.length > 0 ? (
//                   similarHeaders.map((item, index) => {
//                     // 이미 선택된 항목인지 확인
//                     const isSelected = selectedSimilarityGroup.includes(item.header);
//                     // 대표 헤더인지 확인
//                     const isRepresentative = representativeHeader === item.header;
                    
//                     return (
//                       <div 
//                         key={index} 
//                         className={`similarity-item ${isSelected ? 'selected' : ''}`}
//                         onClick={() => handleSimilarHeaderSelect(item.header)}
//                       >
//                         {item.header}
                        
//                         {isSelected && (
//                           <>
//                             <div className="item-actions">
//                               <button
//                                 className={`representative-btn ${isRepresentative ? 'active' : ''}`}
//                                 onClick={(e) => {
//                                   e.stopPropagation();
//                                   handleSetRepresentative(item.header);
//                                 }}
//                                 title={isRepresentative ? "대표 헤더 해제" : "대표 헤더로 설정"}
//                                 disabled={!isSelected}
//                               >
//                                 {isRepresentative ? "대표 ★" : "대표 ☆"}
//                               </button>
//                               <button
//                                 className="remove-btn"
//                                 onClick={(e) => {
//                                   e.stopPropagation();
//                                   handleRemoveFromGroup(item.header);
//                                 }}
//                                 title="선택에서 제거"
//                               >
//                                 제거
//                               </button>
//                             </div>
//                           </>
//                         )}
//                       </div>
//                     );
//                   })
//                 ) : (
//                   <div className="column-empty">유사 헤더가 없습니다.</div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : (
//         <div className="tab-content">
//           {/* 저장된 유사군 목록 */}
//           <div className="saved-groups">
//             {groups && groups.length > 0 ? (
//               groups.map((group, groupIndex) => (
//                 <div key={groupIndex} className="saved-group">
//                   <div className="group-header">
//                     <h3>그룹 {groupIndex + 1}</h3>
//                     <button 
//                       className="remove-group-btn"
//                       onClick={() => onRemoveGroup(groupIndex)}
//                       title="그룹 삭제"
//                     >
//                       삭제
//                     </button>
//                   </div>
//                   <div className="group-items">
//                     <div className="representative-header">
//                       대표어: {group.representative}
//                     </div>
//                     {group.items.map((item, itemIndex) => (
//                       <div key={itemIndex} className="group-item">
//                         <span className={item.header === group.representative ? 'representative' : ''}>
//                           {item.header}
//                         </span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               ))
//             ) : (
//               <div className="column-empty">저장된 유사군이 없습니다.</div>
//             )}
//           </div>
//         </div>
//       )}
      
//       <div className="tabs">
//         <button 
//           className={`tab ${activeTab === 'select' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('select');
//             // 탭 전환 시 선택된 유사군 초기화하지 않음 (선택 상태 유지)
//           }}
//         >
//           유사군 선택
//         </button>
//         <button 
//           className={`tab ${activeTab === 'saved' ? 'active' : ''}`}
//           onClick={() => {
//             setActiveTab('saved');
//             // 저장된 탭으로 이동할 때 선택된 유사군 초기화
//             setSelectedSimilarityGroup([]);
//             setRepresentativeHeader(null);
//           }}
//         >
//           저장된 유사군 {groups && groups.length > 0 ? `(${groups.length})` : ''}
//         </button>
//       </div>
//     </div>
//   );
// };

// export default HeaderSimilarityList;