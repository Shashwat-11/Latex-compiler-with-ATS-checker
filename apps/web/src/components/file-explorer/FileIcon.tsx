import { FileText, Folder, Image, FileCode } from 'lucide-react';

interface FileIconProps {
  name: string;
  type: 'file' | 'folder';
}

export function FileIcon({ name, type }: FileIconProps) {
  if (type === 'folder') return <Folder className="h-4 w-4 shrink-0 text-yellow-500" />;

  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tex':
      return <FileText className="h-4 w-4 shrink-0 text-blue-500" />;
    case 'bib':
      return <FileCode className="h-4 w-4 shrink-0 text-green-500" />;
    case 'sty':
    case 'cls':
      return <FileCode className="h-4 w-4 shrink-0 text-purple-500" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'svg':
      return <Image className="h-4 w-4 shrink-0 text-pink-500" />;
    default:
      return <FileText className="h-4 w-4 shrink-0 text-gray-400" />;
  }
}
