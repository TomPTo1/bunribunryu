import React, { useState, useEffect } from 'react';
import './WorkspaceColumn.css';
import SeparationClassifier from './SeparationClassifier';

const WorkspaceColumn = ({ selectedFile, fileContent }) => {
  const [content, setContent] = useState('');
  const [tableData, setTableData] = useState({
    headers: [],
    rows: []
  });
  const [originalTableData, setOriginalTableData] = useState(null);

  useEffect(() => {
    // Reset content when file changes
    if (selectedFile) {
      if (selectedFile.type === 'xlsx_header') {
        // Handle XLSX header selection
        const { sheetData, headerIndex } = selectedFile;
        
        // Extract the column data for this header
        const headerName = sheetData.headers[headerIndex];
        const columnData = sheetData.rows.map(row => row[headerIndex]);
        
        // Set the table data for display
        const newTableData = {
          headers: [headerName],
          rows: columnData.map(value => [value])
        };
        
        setTableData(newTableData);
        setOriginalTableData({...newTableData});
        
        // Set content to empty to use table view instead
        setContent('');
      } else if (selectedFile.type === 'file') {
        // Regular file selected, show file info
        setContent(JSON.stringify({
          fileName: selectedFile.name,
          path: selectedFile.path,
          type: selectedFile.type
        }, null, 2));
        
        // Clear table data
        setTableData({
          headers: [],
          rows: []
        });
        setOriginalTableData(null);
      } else if (selectedFile.type === 'xlsx_sheet') {
        // Sheet selected, show all data from the sheet
        const { sheetData } = selectedFile;
        
        const newTableData = {
          headers: sheetData.headers,
          rows: sheetData.rows
        };
        
        setTableData(newTableData);
        setOriginalTableData({...newTableData});
        
        // Set content to empty to use table view instead
        setContent('');
      }
    } else {
      // No file selected
      setContent(JSON.stringify({
        message: "No file selected",
        instruction: "Select a file or header from the file explorer"
      }, null, 2));
      
      // Clear table data
      setTableData({
        headers: [],
        rows: []
      });
      setOriginalTableData(null);
    }
  }, [selectedFile]);
  
  // 원본 데이터로 복원하는 함수
  const resetToOriginal = () => {
    if (originalTableData) {
      setTableData({...originalTableData});
    }
  };

  // If no file is selected or no table data, show JSON content
  if (!tableData.headers.length) {
    return <pre className="json-viewer">{content}</pre>;
  }
  
  // If it's a header selection, show the classifier directly
  if (selectedFile?.type === 'xlsx_header' && originalTableData) {
    return <SeparationClassifier data={originalTableData} onReset={resetToOriginal} />;
  }
  
  // Otherwise show the regular table with just a reset button if needed
  return (
    <>
      {originalTableData && (
        <div className="reset-container">
          <button 
            className="action-button reset-button" 
            title="원본 데이터로 복원"
            onClick={resetToOriginal}
          >
            <span>🔄</span>
          </button>
        </div>
      )}
      <div className="data-table-container">
        <h4>{selectedFile?.name} - Data View</h4>
        <table className="data-table">
          <thead>
            <tr>
              {tableData.headers.map((header, idx) => (
                <th key={idx}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default WorkspaceColumn; 