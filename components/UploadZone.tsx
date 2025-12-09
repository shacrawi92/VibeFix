import React, { useCallback, useState } from 'react';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, selectedFile }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      } else {
        alert("Please upload a video file.");
      }
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`relative group border-2 border-dashed rounded-xl p-8 transition-all duration-300 ease-in-out cursor-pointer
        ${isDragging 
          ? 'border-vibe-accent bg-vibe-accent/10' 
          : 'border-vibe-muted/30 hover:border-vibe-accent/50 hover:bg-vibe-card/50'
        }
        ${selectedFile ? 'bg-vibe-card border-vibe-success/50' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        accept="video/*"
        onChange={handleFileInput}
      />
      
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {selectedFile ? (
          <>
            <div className="w-16 h-16 rounded-full bg-vibe-success/20 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-vibe-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-white">{selectedFile.name}</p>
              <p className="text-sm text-vibe-muted">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <p className="text-xs text-vibe-muted">Click to change video</p>
          </>
        ) : (
          <>
             <div className="w-16 h-16 rounded-full bg-vibe-accent/10 flex items-center justify-center group-hover:bg-vibe-accent/20 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-vibe-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-lg text-white">Upload Screen Recording</p>
              <p className="text-sm text-vibe-muted">Drag & drop or click to browse</p>
            </div>
            <div className="text-xs text-vibe-muted/70 max-w-xs">
              Supports MP4, WebM, MOV. Max recommended size 20MB for this demo.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UploadZone;