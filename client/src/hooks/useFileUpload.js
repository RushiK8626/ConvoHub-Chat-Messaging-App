import { useState, useCallback } from "react";

const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  const uploadFile = useCallback(
    async (file, chatId, senderId, messageText = "") => {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("originalname", file.name); // Send original filename
        formData.append("chat_id", chatId);
        formData.append("sender_id", senderId);
        if (messageText) {
          formData.append("message_text", messageText);
        }

        const token = localStorage.getItem("accessToken");
        const apiUrl = (process.env.REACT_APP_API_URL || "http://localhost:3001").replace(/\/+$/, "");

        const xhr = new XMLHttpRequest();

        // Track upload progress
        if (xhr.upload) {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setUploadProgress(percentComplete);
            }
          });
        }

        return new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                setUploadProgress(100);
                setUploading(false);
                resolve(response);
              } catch (err) {
                reject(new Error("Invalid response from server"));
              }
            } else if (xhr.status === 401) {
              reject(new Error("Unauthorized - Please login again"));
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.message || "Upload failed"));
              } catch {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          };

          xhr.onerror = () => {
            setUploading(false);
            reject(new Error("Network error during upload"));
          };

          xhr.onabort = () => {
            setUploading(false);
            reject(new Error("Upload cancelled"));
          };

          xhr.open("POST", `${apiUrl}/api/messages/upload`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      } catch (err) {
        const errorMessage = err.message || "File upload failed";
        setUploadError(errorMessage);
        setUploading(false);
        throw err;
      }
    },
    []
  );

  const resetUploadState = useCallback(() => {
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  return {
    uploadFile,
    uploading,
    uploadProgress,
    uploadError,
    resetUploadState,
  };
};

export default useFileUpload;
