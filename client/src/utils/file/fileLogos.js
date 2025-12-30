/**
 * Get file type logo/icon path from public folder
 * Fallback logic:
 * 1. Check if specific logo exists for file extension
 * 2. If not, check if it's a programming language code file -> use code.svg
 * 3. If still not found, use file.svg as default
 */
export const getFileLogo = (filename, mimeType) => {
  if (!filename && !mimeType) {
    return "/file-logos/file.svg";
  }

  const extension = filename?.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  // Map extensions to logo filenames
  const logoMap = {
    // Documents
    pdf: "pdf.svg",
    doc: "doc.svg",
    docx: "docx.svg",
    odt: "odt.svg",
    txt: "txt.svg",
    rtf: "rtf.svg",

    // Spreadsheets
    xls: "xls.svg",
    xlsx: "xlsx.svg",
    csv: "csv.svg",
    ods: "ods.svg",

    // Presentations
    ppt: "ppt.svg",
    pptx: "pptx.svg",
    odp: "odp.svg",

    // Code/Programming
    js: "js.svg",
    jsx: "jsx.svg",
    ts: "ts.svg",
    tsx: "tsx.svg",
    py: "py.svg",
    java: "java.svg",
    c: "c.svg",
    cpp: "cpp.svg",
    cc: "cpp.svg",
    cxx: "cpp.svg",
    h: "h.svg",
    hpp: "hpp.svg",
    go: "go.svg",
    rs: "rs.svg",
    php: "php.svg",
    html: "html.svg",
    htm: "html.svg",
    css: "css.svg",
    scss: "scss.svg",
    sass: "sass.svg",
    less: "less.svg",
    sh: "sh.svg",
    bash: "bash.svg",
    zsh: "zsh.svg",
    sql: "sql.svg",
    json: "json.svg",
    xml: "xml.svg",
    yaml: "yaml.svg",
    yml: "yaml.svg",

    // Images
    jpg: "jpg.svg",
    jpeg: "jpeg.svg",
    png: "image.svg",
    gif: "gif.svg",
    webp: "webp.svg",
    bmp: "bmp.svg",
    svg: "svg.svg",
    ico: "ico.svg",
    tiff: "tiff.svg",
    raw: "raw.svg",
    psd: "psd.svg",
    ai: "ai.svg",
    eps: "eps.svg",

    // Media
    mp3: "mp3.svg",
    wav: "wav.svg",
    aac: "aac.svg",
    flac: "flac.svg",
    m4a: "m4a.svg",
    ogg: "ogg.svg",
    wma: "wma.svg",
    aiff: "aiff.svg",

    // Video
    mp4: "mp4.svg",
    webm: "webm.svg",
    avi: "avi.svg",
    mkv: "mkv.svg",
    mov: "mov.svg",
    flv: "flv.svg",
    wmv: "wmv.svg",
    "3gp": "3gp.svg",
    m3u8: "m3u8.svg",
    mpeg: "mpeg.svg",
    mid: "mid.svg",
    mdb: "mdb.svg",
    dll: "dll.svg",
    exe: "exe.svg",
    iso: "iso.svg",

    // Archives
    zip: "zip.svg",
    rar: "rar.svg",
    "7z": "7z.svg",
    tar: "tar.svg",
    gz: "gz.svg",
    bz2: "bz2.svg",
    xz: "xz.svg",

    // Other
    ps: "ps.svg",
    pub: "pub.svg",
    dwg: "dwg.svg",
    rss: "rss.svg",
    crd: "crd.svg",
  };

  // Check if we have a specific logo for this extension
  if (logoMap[extension]) {
    return `/file-logos/${logoMap[extension]}`;
  }

  // Check if it's a programming language code file
  const codeExtensions = [
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "java",
    "c",
    "cpp",
    "cc",
    "cxx",
    "h",
    "hpp",
    "go",
    "rs",
    "php",
    "html",
    "htm",
    "css",
    "scss",
    "sass",
    "less",
    "sh",
    "bash",
    "zsh",
    "sql",
    "json",
    "xml",
    "yaml",
    "yml",
    "rb",
    "swift",
    "kt",
    "scala",
    "m",
    "mm",
    "r",
    "pl",
    "lua",
    "vim",
    "emacs",
    "clj",
    "cljs",
    "ex",
    "exs",
    "erl",
    "hrl",
    "fs",
    "fsx",
    "fsi",
    "ml",
    "mli",
    "pas",
    "delphi",
    "asm",
    "groovy",
    "gradle",
    "maven",
    "make",
    "cmake",
    "dockerfile",
  ];

  if (codeExtensions.includes(extension)) {
    return "/file-logos/code.svg";
  }

  // Fallback based on MIME type
  if (mime.startsWith("image/")) {
    return "/file-logos/image.svg";
  }
  if (mime.startsWith("audio/")) {
    return "/file-logos/audio.svg";
  }
  if (mime.startsWith("video/")) {
    return "/file-logos/video.svg";
  }
  if (mime.includes("archive") || mime.includes("compressed")) {
    return "/file-logos/archive.svg";
  }
  if (mime.startsWith("text/")) {
    return "/file-logos/txt.svg";
  }

  // Check if MIME type suggests code file
  if (
    mime.includes("text/") ||
    mime.includes("application/x-") ||
    mime === "application/octet-stream"
  ) {
    // Additional check for known code MIME types
    if (
      mime.includes("json") ||
      mime.includes("xml") ||
      mime.includes("sql") ||
      mime.includes("javascript")
    ) {
      return "/file-logos/code.svg";
    }
  }

  // Default file logo
  return "/file-logos/file.svg";
};

/**
 * Determine if file is an image that should be previewed
 */
export const isImageFile = (filename, mimeType) => {
  const extension = filename?.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  // Images that should be previewed inline (excluding SVG)
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "bmp"];

  if (imageExtensions.includes(extension)) {
    return true;
  }

  return mime.startsWith("image/") && !extension.match(/^(svg|ico)$/);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * Get file category for display
 */
export const getFileCategory = (filename, mimeType) => {
  const extension = filename?.split(".").pop()?.toLowerCase() || "";
  const mime = mimeType?.toLowerCase() || "";

  if (
    extension.match(/^(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff|raw|psd|ai|eps)$/)
  ) {
    return "image";
  }
  if (
    extension.match(/^(mp3|wav|aac|flac|m4a|ogg|wma|aiff)$/) ||
    mime.startsWith("audio/")
  ) {
    return "audio";
  }
  if (
    extension.match(/^(mp4|webm|avi|mkv|mov|flv|wmv|3gp|m3u8|mpeg|mid)$/) ||
    mime.startsWith("video/")
  ) {
    return "video";
  }
  if (
    extension.match(/^(zip|rar|7z|tar|gz|bz2|xz|iso)$/) ||
    mime.includes("archive")
  ) {
    return "archive";
  }
  if (
    extension.match(/^(doc|docx|odt|txt|rtf|pdf)$/) ||
    mime.includes("document") ||
    mime.includes("word")
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
      /^(js|jsx|ts|tsx|py|java|c|cpp|go|rs|php|html|css|sh|sql|json|xml|yaml|yml)$/
    )
  ) {
    return "code";
  }

  return "file";
};
