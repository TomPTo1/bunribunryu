import React, { useState } from 'react';
import FileExplorerColumn from './FileExplorerColumn';
import WorkspaceColumn from './WorkspaceColumn';
// import ControlColumn from './ControlColumn';
import './BrowseMode.css';

const BrowseMode = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    // In a real app, this would load the file content from the backend
    // For now, we'll just set dummy content
    if (file) {
      setFileContent({
        path: file.path,
        name: file.name,
        type: file.type,
        content: `Sample content for ${file.name}`
      });
    } else {
      setFileContent(null);
    }
  };

  return (
    <div className="browse-mode-container">
      <FileExplorerColumn onFileSelect={handleFileSelect} />
      <WorkspaceColumn selectedFile={selectedFile} fileContent={fileContent} />
      {/* <ControlColumn selectedFile={selectedFile} /> */}
    </div>
  );
};

export default BrowseMode; 