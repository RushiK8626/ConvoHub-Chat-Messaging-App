import React from "react";
import {
  File,
  FileText,
  FileCode,
  FileJson,
  FileArchive,
  Music,
  Video,
  Image,
  Disc3,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";

/**
 * Determine file icon based on file extension or MIME type
 */
export const getFileIcon = (filename, mimeType, size = 24) => {
  if (!filename && !mimeType) {
    return <File size={size} />;
  }

  const extension = filename?.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  // Image files
  if (
    extension.match(/^(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/) ||
    mime.startsWith("image/")
  ) {
    return (
      <Image
        size={size}
        className="file-icon-image"
        color="#9b59b6"
        strokeWidth={2}
      />
    );
  }

  // PDF
  if (extension === "pdf" || mime === "application/pdf") {
    return (
      <FileText
        size={size}
        className="file-icon-pdf"
        color="#e74c3c"
        strokeWidth={2}
      />
    );
  }

  // Word/Document files
  if (
    extension.match(/^(doc|docx|odt)$/) ||
    mime.includes("word") ||
    mime.includes("document")
  ) {
    return (
      <FileText
        size={size}
        className="file-icon-document"
        color="#3498db"
        strokeWidth={2}
      />
    );
  }

  // Excel/Spreadsheet files
  if (
    extension.match(/^(xls|xlsx|csv|ods)$/) ||
    mime.includes("spreadsheet") ||
    mime.includes("sheet")
  ) {
    return (
      <FileSpreadsheet
        size={size}
        className="file-icon-spreadsheet"
        color="#27ae60"
        strokeWidth={2}
      />
    );
  }

  // PowerPoint/Presentation files
  if (extension.match(/^(ppt|pptx|odp)$/) || mime.includes("presentation")) {
    return (
      <BarChart3
        size={size}
        className="file-icon-presentation"
        color="#f39c12"
        strokeWidth={2}
      />
    );
  }

  // Code files - JavaScript/TypeScript
  if (
    extension.match(/^(js|jsx|ts|tsx)$/) ||
    mime === "text/javascript" ||
    mime === "application/javascript"
  ) {
    return (
      <FileCode
        size={size}
        className="file-icon-code-js"
        stroke="#f7df1e"
        strokeWidth={2}
        color="#f7df1e"
      />
    );
  }

  // Code files - Python
  if (extension === "py" || mime === "text/x-python") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-python"
        stroke="#3776ab"
        strokeWidth={2}
        color="#3776ab"
      />
    );
  }

  // Code files - Java
  if (extension === "java" || mime === "text/x-java-source") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-java"
        stroke="#007396"
        strokeWidth={2}
        color="#007396"
      />
    );
  }

  // Code files - C/C++
  if (
    extension.match(/^(c|cpp|cc|cxx|h|hpp)$/) ||
    mime === "text/x-c" ||
    mime === "text/x-cpp"
  ) {
    return (
      <FileCode
        size={size}
        className="file-icon-code-cpp"
        stroke="#00599c"
        strokeWidth={2}
        color="#00599c"
      />
    );
  }

  // Code files - Go
  if (extension === "go" || mime === "text/x-go") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-go"
        stroke="#00add8"
        strokeWidth={2}
        color="#00add8"
      />
    );
  }

  // Code files - Rust
  if (extension === "rs" || mime === "text/x-rust") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-rust"
        stroke="#ce422b"
        strokeWidth={2}
        color="#ce422b"
      />
    );
  }

  // Code files - PHP
  if (extension === "php" || mime === "application/x-php") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-php"
        stroke="#777bb4"
        strokeWidth={2}
        color="#777bb4"
      />
    );
  }

  // Code files - HTML/CSS
  if (
    extension.match(/^(html|htm|css|scss|sass|less)$/) ||
    mime.includes("html") ||
    mime.includes("css")
  ) {
    return (
      <FileCode
        size={size}
        className="file-icon-code-web"
        stroke="#e34c26"
        strokeWidth={2}
        color="#e34c26"
      />
    );
  }

  // Code files - Shell/Bash
  if (extension.match(/^(sh|bash|zsh)$/) || mime === "text/x-shell") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-shell"
        stroke="#4eaa25"
        strokeWidth={2}
        color="#4eaa25"
      />
    );
  }

  // Code files - SQL
  if (extension === "sql" || mime === "text/x-sql") {
    return (
      <FileCode
        size={size}
        className="file-icon-code-sql"
        stroke="#336791"
        strokeWidth={2}
        color="#336791"
      />
    );
  }

  // Code files - JSON
  if (extension === "json" || mime === "application/json") {
    return (
      <FileJson
        size={size}
        className="file-icon-json"
        stroke="#fcdc00"
        strokeWidth={2}
        color="#fcdc00"
      />
    );
  }

  // Code files - XML/YAML
  if (
    extension.match(/^(xml|yaml|yml)$/) ||
    mime.includes("xml") ||
    mime.includes("yaml")
  ) {
    return (
      <FileCode
        size={size}
        className="file-icon-code-xml"
        stroke="#cc3300"
        strokeWidth={2}
        color="#cc3300"
      />
    );
  }

  // Text files
  if (extension.match(/^(txt|md|markdown|rtf)$/) || mime.startsWith("text/")) {
    return (
      <FileText
        size={size}
        className="file-icon-text"
        stroke="#7f8c8d"
        strokeWidth={2}
        color="#7f8c8d"
      />
    );
  }

  // Archive files
  if (
    extension.match(/^(zip|rar|7z|tar|gz|bz2|xz|iso)$/) ||
    mime.includes("archive") ||
    mime.includes("compressed")
  ) {
    return (
      <FileArchive
        size={size}
        className="file-icon-archive"
        stroke="#a569bd"
        strokeWidth={2}
        color="#a569bd"
      />
    );
  }

  // Audio files
  if (
    extension.match(/^(mp3|wav|aac|flac|m4a|ogg|wma|aiff)$/) ||
    mime.startsWith("audio/")
  ) {
    return (
      <Music
        size={size}
        className="file-icon-audio"
        stroke="#e91e63"
        strokeWidth={2}
        color="#e91e63"
      />
    );
  }

  // Video files
  if (
    extension.match(/^(mp4|webm|avi|mkv|mov|flv|wmv|3gp|m3u8)$/) ||
    mime.startsWith("video/")
  ) {
    return (
      <Video
        size={size}
        className="file-icon-video"
        stroke="#2196f3"
        strokeWidth={2}
        color="#2196f3"
      />
    );
  }

  // Disc/ISO files
  if (extension.match(/^(iso|dmg|img)$/) || mime.includes("disc")) {
    return (
      <Disc3
        size={size}
        className="file-icon-disc"
        stroke="#95a5a6"
        strokeWidth={2}
        color="#95a5a6"
      />
    );
  }

  // Default file icon
  return (
    <File
      size={size}
      className="file-icon-default"
      stroke="#95a5a6"
      strokeWidth={2}
      color="#95a5a6"
    />
  );
};

/**
 * Get file category from extension or MIME type
 */
export const getFileCategory = (filename, mimeType) => {
  if (!filename && !mimeType) return "file";

  const extension = filename?.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  if (
    extension.match(/^(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/) ||
    mime.startsWith("image/")
  ) {
    return "image";
  }
  if (extension === "pdf" || mime === "application/pdf") {
    return "pdf";
  }
  if (
    extension.match(/^(doc|docx|odt)$/) ||
    mime.includes("word") ||
    mime.includes("document")
  ) {
    return "document";
  }
  if (extension.match(/^(xls|xlsx|csv|ods)$/) || mime.includes("spreadsheet")) {
    return "spreadsheet";
  }
  if (extension.match(/^(ppt|pptx|odp)$/) || mime.includes("presentation")) {
    return "presentation";
  }
  if (
    extension.match(
      /^(js|jsx|ts|tsx|py|java|c|cpp|go|rs|php|html|css|sql|json|xml|yaml|yml|sh|bash)$/
    ) ||
    mime.includes("code")
  ) {
    return "code";
  }
  if (extension.match(/^(txt|md|markdown|rtf)$/) || mime.startsWith("text/")) {
    return "text";
  }
  if (extension.match(/^(zip|rar|7z|tar|gz)$/) || mime.includes("archive")) {
    return "archive";
  }
  if (
    extension.match(/^(mp3|wav|aac|flac|m4a|ogg)$/) ||
    mime.startsWith("audio/")
  ) {
    return "audio";
  }
  if (
    extension.match(/^(mp4|webm|avi|mkv|mov)$/) ||
    mime.startsWith("video/")
  ) {
    return "video";
  }

  return "file";
};

/**
 * Get file description for accessibility
 */
export const getFileDescription = (filename, category) => {
  const ext = filename?.split(".").pop()?.toUpperCase() || "File";

  const descriptions = {
    image: `Image file (${ext})`,
    pdf: "PDF Document",
    document: `Document file (${ext})`,
    spreadsheet: `Spreadsheet file (${ext})`,
    presentation: `Presentation file (${ext})`,
    code: `Source code file (${ext})`,
    text: `Text file (${ext})`,
    archive: `Archive file (${ext})`,
    audio: `Audio file (${ext})`,
    video: `Video file (${ext})`,
    file: `${ext} file`,
  };

  return descriptions[category] || descriptions.file;
};
