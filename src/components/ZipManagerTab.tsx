import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ZipEntry {
  originalName: string;
  blob: Blob;
  size: number;
  fileCount: number;
  imagePreviews: string[];
}

export default function ZipManagerTab() {
  const [zipFiles, setZipFiles] = useState<ZipEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [fixedText, setFixedText] = useState('');
  const [fixedTextPosition, setFixedTextPosition] = useState<'prefix' | 'suffix'>('prefix');
  const [quality, setQuality] = useState(80);
  const [newNames, setNewNames] = useState<{ [key: number]: string }>({});

  const handleZipUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    const newEntries: ZipEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.zip')) continue;
      try {
        const zip = await JSZip.loadAsync(file);
        const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        let fileCount = 0;
        const previews: string[] = [];
        for (const [filename, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir) continue;
          const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
          if (exts.includes(ext)) {
            fileCount++;
            if (previews.length < 3) {
              const blob = await zipEntry.async('blob');
              const dataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              previews.push(dataUrl);
            }
          }
        }
        newEntries.push({ originalName: file.name, blob: file, size: file.size, fileCount, imagePreviews: previews });
      } catch (error) { console.error('Error reading ZIP:', error); }
    }
    setZipFiles((prev) => [...prev, ...newEntries]);
    setIsProcessing(false);
  }, []);

  const handleRename = (index: number, newName: string) => {
    setNewNames((prev) => ({ ...prev, [index]: newName }));
  };

  const handleApplyFixedText = () => {
    if (!fixedText.trim()) return;
    const updatedNames: { [key: number]: string } = {};
    zipFiles.forEach((zip, index) => {
      const baseName = newNames[index] || zip.originalName.replace(/\.zip$/i, '');
      updatedNames[index] = fixedTextPosition === 'prefix' ? `${fixedText}_${baseName}` : `${baseName}_${fixedText}`;
    });
    setNewNames(updatedNames);
  };

  const handleApplyGroupName = () => {
    if (!groupName.trim()) return;
    const updatedNames: { [key: number]: string } = {};
    zipFiles.forEach((zip, index) => {
      updatedNames[index] = `${groupName}_${zip.originalName.replace(/\.zip$/i, '')}`;
    });
    setNewNames(updatedNames);
  };

  const compressImage = (dataUrl: string, q: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', q / 100);
      };
      img.src = dataUrl;
    });
  };

  const handleExportAll = async () => {
    if (zipFiles.length === 0) return;
    setIsProcessing(true);
    try {
      for (let i = 0; i < zipFiles.length; i++) {
        const zip = zipFiles[i];
        const originalZip = await JSZip.loadAsync(zip.blob);
        const newZip = new JSZip();
        const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        for (const [filename, zipEntry] of Object.entries(originalZip.files)) {
          if (zipEntry.dir) continue;
          const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
          if (exts.includes(ext) && quality < 100) {
            const blob = await zipEntry.async('blob');
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const compressedBlob = await compressImage(dataUrl, quality);
            newZip.file(filename.replace(/\.[^.]+$/, '.jpg'), compressedBlob);
          } else {
            const content = await zipEntry.async('arraybuffer');
            newZip.file(filename, content);
          }
        }
        const outputBlob = await newZip.generateAsync({ type: 'blob' });
        const outputName = newNames[i] || zip.originalName.replace(/\.zip$/i, '');
        saveAs(outputBlob, `${outputName}.zip`);
      }
    } catch (error) { alert('Error al exportar.'); }
    setIsProcessing(false);
  };

  const handleRemoveZip = (index: number) => {
    setZipFiles((prev) => prev.filter((_, i) => i !== index));
    setNewNames((prev) => { const updated = { ...prev }; delete updated[index]; return updated; });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-upload text-gray-500"></i> Cargar Archivos ZIP
        </h2>
        <label className="w-full cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors bg-gray-50">
            <i className="fas fa-file-archive text-4xl text-gray-400 mb-3"></i>
            <p className="text-gray-700 font-medium">Haga clic para seleccionar archivos ZIP</p>
            <p className="text-gray-400 text-sm mt-1">Puede seleccionar múltiples archivos</p>
          </div>
          <input type="file" accept=".zip" multiple onChange={handleZipUpload} className="hidden" />
        </label>
      </div>

      {isProcessing && zipFiles.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">Procesando archivos ZIP...</p>
        </div>
      )}

      {zipFiles.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-pen-to-square text-gray-500"></i> Opciones de Renombrado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Nombre del grupo</label>
                <div className="flex gap-2">
                  <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej: Proyecto_2026" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm" />
                  <button onClick={handleApplyGroupName} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-sm border border-gray-300">
                    <i className="fas fa-check"></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Texto fijo</label>
                <div className="flex gap-2">
                  <input type="text" value={fixedText} onChange={(e) => setFixedText(e.target.value)} placeholder="Ej: EDITADO" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 text-sm" />
                  <select value={fixedTextPosition} onChange={(e) => setFixedTextPosition(e.target.value as 'prefix' | 'suffix')} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-gray-700 text-sm focus:outline-none focus:border-gray-400">
                    <option value="prefix">Prefijo</option>
                    <option value="suffix">Sufijo</option>
                  </select>
                  <button onClick={handleApplyFixedText} className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-sm border border-gray-300">
                    <i className="fas fa-check"></i>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-gray-600 text-sm font-medium mb-1 block">Calidad: {quality}%</label>
                <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-list text-gray-500"></i> Archivos ZIP ({zipFiles.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {zipFiles.map((zip, index) => (
                <div key={index} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex-shrink-0 flex gap-1">
                    {zip.imagePreviews.length > 0 ? zip.imagePreviews.map((preview, pIdx) => (
                      <img key={pIdx} src={preview} alt="" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                    )) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <i className="fas fa-file-archive text-gray-400"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">Original: {zip.originalName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-gray-400 text-xs">{zip.fileCount} fotos</span>
                      <span className="text-gray-400 text-xs">{formatFileSize(zip.size)}</span>
                    </div>
                    <input type="text" value={newNames[index] || ''} onChange={(e) => handleRename(index, e.target.value)} placeholder="Nuevo nombre (sin extensión)" className="mt-2 w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 text-xs" />
                  </div>
                  <button onClick={() => handleRemoveZip(index)} className="flex-shrink-0 w-8 h-8 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button onClick={handleExportAll} disabled={isProcessing} className="px-8 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> Procesando...</> : <><i className="fas fa-download"></i> Exportar todos los ZIPs</>}
              </button>
              <button onClick={() => { setZipFiles([]); setNewNames({}); }} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors border border-gray-200 flex items-center gap-2">
                <i className="fas fa-times"></i> Limpiar todo
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
