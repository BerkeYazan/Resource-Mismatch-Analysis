import { useState, useEffect } from "react";

function FileUpload() {
  const [currentFile, setCurrentFile] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);

  // Load both history and current file on component mount
  useEffect(() => {
    // Load history
    const savedHistory = localStorage.getItem("fileUploadHistory");
    if (savedHistory) {
      setUploadHistory(JSON.parse(savedHistory));
    }

    // Load current file
    const savedCurrentFile = localStorage.getItem("currentUploadedFile");
    if (savedCurrentFile) {
      setCurrentFile(JSON.parse(savedCurrentFile));
    }
  }, []);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Create file data object
      const fileData = {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        uploadDate: new Date().toISOString(),
      };

      // Store current file in state and localStorage
      setCurrentFile(fileData);
      localStorage.setItem("currentUploadedFile", JSON.stringify(fileData));

      // Add to history
      const newHistory = [...uploadHistory, fileData];
      setUploadHistory(newHistory);
      localStorage.setItem("fileUploadHistory", JSON.stringify(newHistory));
    }
  };

  const removeFromHistory = (index) => {
    const newHistory = uploadHistory.filter((_, i) => i !== index);
    setUploadHistory(newHistory);
    localStorage.setItem("fileUploadHistory", JSON.stringify(newHistory));
  };

  // Function to select a file from history as current
  const selectFileFromHistory = (fileData) => {
    setCurrentFile(fileData);
    localStorage.setItem("currentUploadedFile", JSON.stringify(fileData));
  };

  // Function to clear current file
  const clearCurrentFile = () => {
    setCurrentFile(null);
    localStorage.removeItem("currentUploadedFile");
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />

      {/* Display current file */}
      {currentFile && (
        <div className="current-file">
          <h3>Current File</h3>
          <div className="file-info">
            <span>{currentFile.name}</span>
            <span className="file-size">
              ({(currentFile.size / 1024).toFixed(1)} KB)
            </span>
            <button
              onClick={clearCurrentFile}
              className="remove-btn"
              aria-label="Clear current file"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Upload history */}
      {uploadHistory.length > 0 && (
        <div className="upload-history">
          <h3>Upload History</h3>
          <ul>
            {uploadHistory.map((item, index) => (
              <li key={index}>
                <span>{item.name}</span>
                <span className="file-size">
                  ({(item.size / 1024).toFixed(1)} KB)
                </span>
                <span className="upload-date">
                  {new Date(item.uploadDate).toLocaleDateString()}
                </span>
                <button
                  onClick={() => selectFileFromHistory(item)}
                  className="select-btn"
                  aria-label={`Select ${item.name} as current file`}
                >
                  Select
                </button>
                <button
                  onClick={() => removeFromHistory(index)}
                  className="remove-btn"
                  aria-label={`Remove ${item.name} from history`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
