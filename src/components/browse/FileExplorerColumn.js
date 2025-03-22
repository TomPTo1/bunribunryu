import React, { useState, useEffect, useRef } from 'react';
import './FileExplorerColumn.css';
import { getDirectoryStructure } from '../../services/fileSystemService';
import { parseXLSXFile } from '../../services/xlsxParserService';

const FileExplorerColumn = ({ onFileSelect }) => {
  const [rootDirectory, setRootDirectory] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [parsedXlsxFiles, setParsedXlsxFiles] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const columnRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    // Load the initial directory structure
    loadDirectory('src/browse_mode_sample_data');
  }, []);

  // Add a transition end handler
  useEffect(() => {
    const handleTransitionEnd = (e) => {
      // Only process width transitions
      if (e.propertyName === 'width') {
        if (!collapsed) {
          // Focus the search input when expanded
          searchInputRef.current?.focus();
        }
      }
    };

    const columnElement = columnRef.current;
    if (columnElement) {
      columnElement.addEventListener('transitionend', handleTransitionEnd);
    }

    return () => {
      if (columnElement) {
        columnElement.removeEventListener('transitionend', handleTransitionEnd);
      }
    };
  }, [collapsed]);

  const toggleCollapse = (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setCollapsed(!collapsed);
  };

  const loadDirectory = async (path) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDirectoryStructure(path);
      setRootDirectory(data);
      // Automatically expand the root directory
      setExpandedFolders(prev => ({ ...prev, [data.id]: true }));
    } catch (err) {
      console.error('디렉토리 로드 오류:', err);
      setError(`디렉토리 로드 실패: ${err.message}`);
      setRootDirectory(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderToggle = async (folder) => {
    const folderId = folder.id;
    const isExpanded = expandedFolders[folderId];

    if (!isExpanded && !folder.childrenLoaded) {
      // Load children only if we're expanding and haven't loaded children before
      try {
        setLoading(true);
        setError(null);
        const data = await getDirectoryStructure(folder.path);
        
        // Update the root directory with the new children
        updateFolderChildren(rootDirectory, folder.id, data.children);
        
        // Mark this folder as having its children loaded
        updateFolderLoadedState(rootDirectory, folder.id, true);
      } catch (err) {
        console.error('폴더 내용 로드 오류:', err);
        setError(`폴더 내용 로드 실패: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    // Toggle expanded state
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !isExpanded
    }));
  };

  const handleFileClick = async (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    // Special handling for XLSX files
    if (fileExtension === 'xlsx') {
      // Check if we've already parsed this file
      if (!parsedXlsxFiles[file.path]) {
        try {
          setLoading(true);
          setError(null);
          console.log('XLSX 파일 파싱 시작:', file.path);
          
          // 파일 파싱 요청
          const xlsxData = await parseXLSXFile(file.path);
          console.log('XLSX 파싱 결과:', xlsxData);
          
          if (!xlsxData || !xlsxData.sheets) {
            throw new Error('XLSX 데이터 형식이 올바르지 않습니다');
          }
          
          // Store the parsed data
          setParsedXlsxFiles(prev => ({
            ...prev,
            [file.path]: xlsxData
          }));
          
          // Create virtual headers as children of the XLSX file
          const headerChildren = [];
          
          // Add sheet and header entries
          Object.entries(xlsxData.sheets).forEach(([sheetName, sheetData]) => {
            const sheetId = `${file.id}_sheet_${sheetName}`;
            
            // Create a sheet node
            const sheetNode = {
              id: sheetId,
              name: sheetName,
              type: 'xlsx_sheet',
              path: `${file.path}#${sheetName}`,
              parentFile: file,
              sheetData: sheetData
            };
            
            headerChildren.push(sheetNode);
            
            // Add headers as children of the sheet
            if (sheetData.headers && Array.isArray(sheetData.headers)) {
              sheetData.headers.forEach((header, index) => {
                headerChildren.push({
                  id: `${sheetId}_header_${index}`,
                  name: header,
                  type: 'xlsx_header',
                  path: `${file.path}#${sheetName}#${header}`,
                  parentFile: file,
                  parentSheet: sheetName,
                  headerIndex: index,
                  sheetData: sheetData
                });
              });
            } else {
              console.warn('시트에 헤더가 없거나 형식이 올바르지 않습니다:', sheetName);
            }
          });
          
          // Update file with virtual children
          file.children = headerChildren;
          file.isXlsxExpanded = true;
          
          // Force a re-render
          setRootDirectory({...rootDirectory});
          
          // Also expand this file
          setExpandedFolders(prev => ({
            ...prev,
            [file.id]: true
          }));
        } catch (err) {
          console.error('XLSX 파일 파싱 오류:', err);
          setError(`XLSX 파일 파싱 실패: ${err.message}`);
          // 파일에 children 속성이 없도록 설정
          file.children = [];
          file.isXlsxExpanded = false;
        } finally {
          setLoading(false);
        }
      } else {
        // We've already parsed this file, just toggle expansion
        file.isXlsxExpanded = !file.isXlsxExpanded;
        
        // Force a re-render
        setRootDirectory({...rootDirectory});
        
        // Toggle expanded state
        setExpandedFolders(prev => ({
          ...prev,
          [file.id]: !prev[file.id]
        }));
      }
    }
    
    // For all files (including XLSX), notify parent component
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleHeaderClick = (header) => {
    // When a header is clicked, notify parent with header info
    if (onFileSelect) {
      onFileSelect(header);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filterItems = (items, term) => {
    if (!term) return items;
    
    return items.filter(item => {
      const matchesName = item.name.toLowerCase().includes(term.toLowerCase());
      
      // For folders, also check children
      if (item.type === 'folder' && item.children) {
        const matchingChildren = filterItems(item.children, term);
        return matchesName || matchingChildren.length > 0;
      }
      
      return matchesName;
    });
  };

  const updateFolderChildren = (node, folderId, children) => {
    if (node.id === folderId) {
      node.children = children;
      return true;
    }
    
    if (node.children) {
      for (let child of node.children) {
        if (child.type === 'folder') {
          if (updateFolderChildren(child, folderId, children)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  const updateFolderLoadedState = (node, folderId, loadedState) => {
    if (node.id === folderId) {
      node.childrenLoaded = loadedState;
      return true;
    }
    
    if (node.children) {
      for (let child of node.children) {
        if (child.type === 'folder') {
          if (updateFolderLoadedState(child, folderId, loadedState)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };

  const renderTree = (node) => {
    if (!node) return null;

    // Filter children if search term exists
    const filteredChildren = node.children 
      ? filterItems(node.children, searchTerm)
      : [];

    const isExpanded = expandedFolders[node.id] || node.isXlsxExpanded;
    
    return (
      <div className="tree-node" key={node.id}>
        <div 
          className={`tree-item ${node.type}`}
          onClick={() => {
            if (node.type === 'folder') {
              handleFolderToggle(node);
            } else if (node.type === 'file') {
              handleFileClick(node);
            } else if (node.type === 'xlsx_header') {
              handleHeaderClick(node);
            } else if (node.type === 'xlsx_sheet') {
              handleHeaderClick(node);
            }
          }}
        >
          <span className="icon">
            {node.type === 'folder' 
              ? (isExpanded ? '📂' : '📁') 
              : node.type === 'xlsx_sheet'
                ? '📑'
                : node.type === 'xlsx_header'
                  ? '🔍'
                  : getFileIcon(node.name)}
          </span>
          <span className="name">{node.name}</span>
        </div>
        
        {(node.type === 'folder' || node.type === 'file') && isExpanded && node.children && (
          <div className="tree-children">
            {filteredChildren.length > 0 ? (
              filteredChildren.map(child => renderTree(child))
            ) : (
              <div className="empty-folder-message">
                {searchTerm ? 'No matching files or folders' : 'Empty folder'}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const getFileIcon = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    
    // Return different icons based on file extension
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp3':
      case 'wav':
        return '🎵';
      case 'mp4':
      case 'mov':
        return '🎬';
      default:
        return '📄';
    }
  };

  const handleRetry = () => {
    loadDirectory('src/browse_mode_sample_data');
  };

  return (
    <div 
      className={`file-explorer-column ${collapsed ? 'collapsed' : ''}`}
      ref={columnRef}
      onClick={() => {
        // If the column is collapsed and user clicks anywhere on it, expand it
        if (collapsed) {
          setCollapsed(false);
        }
      }}
    >
      <div className="glass-overlay"></div>

      <div className="column-title">
        {collapsed ? 'Files' : 'File Explorer'}
      </div>
      
      <button 
        className="toggle-collapse-btn" 
        onClick={toggleCollapse}
        title={collapsed ? "Expand panel" : "Collapse panel"}
      >
        {collapsed ? '›' : '‹'}
      </button>

      <div className="search-box">
        <input 
          ref={searchInputRef}
          type="text" 
          placeholder="Search files..." 
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>
      
      <div className="tree-view">
        {loading && <div className="loading-message">로딩 중...</div>}
        
        {error && (
          <div className="error-container">
            <div className="error-message">{error}</div>
            <button className="retry-button" onClick={handleRetry}>다시 시도</button>
          </div>
        )}
        
        {!loading && !error && rootDirectory && renderTree(rootDirectory)}
        
        {!loading && !error && !rootDirectory && (
          <div className="empty-message">파일이나 폴더가 없습니다.</div>
        )}
      </div>
    </div>
  );
};

export default FileExplorerColumn; 