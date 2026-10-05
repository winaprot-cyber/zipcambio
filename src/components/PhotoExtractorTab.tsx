import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

interface ImageFile {
  name: string;
  dataUrl: string;
  selected: boolean;
}

type OutputFormat = 'loose' | 'zip' | 'pdf';

export default function PhotoExtractorTab() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [zipFileName, setZipFileName] = useState('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('loose');
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const handleZipUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFileName(file.name);
    setIsProcessing(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const imageFiles: ImageFile[] = [];
      const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        if (!exts.includes(ext)) continue;
        const blob = await zipEntry.async('blob');
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        imageFiles.push({ name: filename.split('/').pop() || filename, dataUrl, selected: true });
      }
      setImages(imageFiles);
    } catch {
      alert('Error al leer el archivo ZIP.');
    }
    setIsProcessing(false);
  }, []);

  const toggleImage = (index: number) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, selected: !img.selected } : img)));
  };

  const toggleSelectAll = () => {
    const newState = !selectAll;
    setSelectAll(newState);
    setImages((prev) => prev.map((img) => ({ ...img, selected: newState })));
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

  const addImageToPdf = (pdf: jsPDF, dataUrl: string, x: number, y: number, mw: number, mh: number): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ar = img.width / img.height;
        let w = mw, h = mw / ar;
        if (h > mh) { h = mh; w = mh * ar; }
        pdf.addImage(dataUrl, 'JPEG', x + (mw - w) / 2, y + (mh - h) / 2, w, h);
        resolve();
      };
      img.src = dataUrl;
    });
  };

  const handleExport = async () => {
    const sel = images.filter((img) => img.selected);
    if (sel.length === 0) { alert('No hay imágenes seleccionadas.'); return; }
    setIsProcessing(true);
    try {
      if (outputFormat === 'loose') {
        for (const img of sel) {
          const b = await compressImage(img.dataUrl, quality);
          saveAs(b, img.name.replace(/\.[^.]+$/, '.jpg'));
        }
      } else if (outputFormat === 'zip') {
        const z = new JSZip();
        for (const img of sel) {
          const b = await compressImage(img.dataUrl, quality);
          z.file(img.name.replace(/\.[^.]+$/, '.jpg'), b);
        }
        const zb = await z.generateAsync({ type: 'blob' });
        saveAs(zb, `${(zipFileName.replace(/\.zip$/i, '') || 'fotos')}_extraido.zip`);
      } else if (outputFormat === 'pdf') {
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pw = pdf.internal.pageSize.getWidth();
        const ph = pdf.internal.pageSize.getHeight();
        const m = 10, iw = (pw - m * 3) / 2, ih = ph - m * 2;
        for (let i = 0; i < sel.length; i += 2) {
          if (i > 0) pdf.addPage();
          await addImageToPdf(pdf, sel[i].dataUrl, m, m, iw, ih);
          if (i + 1 < sel.length) await addImageToPdf(pdf, sel[i + 1].dataUrl, m * 2 + iw, m, iw, ih);
        }
        pdf.save(`${(zipFileName.replace(/\.zip$/i, '') || 'fotos')}_fotos.pdf`);
      }
    } catch { alert('Error al exportar.'); }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-upload text-gray-500"></i> Cargar Archivo ZIP
        </h2>
        <label className="w-full max-w-md mx-auto cursor-pointer block">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors bg-gray-50">
            <i className="fas fa-file-archive text-4xl text-gray-400 mb-3"></i>
            <p className="text-gray-700 font-medium">{zipFileName || 'Haga clic para seleccionar un archivo ZIP'}</p>
            <p className="text-gray-400 text-sm mt-1">Se detectarán automáticamente las imágenes</p>
          </div>
          <input type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
        </label>
      </div>

      {images.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <i className="fas fa-images text-gray-500"></i> Imágenes ({images.length})
              </h2>
              <button onClick={toggleSelectAll} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm border border-gray-200">
                {selectAll ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-2">
              {images.map((img, index) => (
                <div key={index} onClick={() => toggleImage(index)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${img.selected ? 'border-gray-700 shadow-md' : 'border-gray-200 opacity-50'}`}>
                  <img src={img.dataUrl} alt={img.name} className="w-full h-28 object-cover" />
                  <div className="absolute top-1 right-1">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${img.selected ? 'bg-gray-700 border-gray-600' : 'bg-white/80 border-gray-300'}`}>
                      {img.selected && <i className="fas fa-check text-white text-xs"></i>}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                    <p className="text-white text-xs truncate">{img.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-file-export text-gray-500"></i> Opciones de Exportación
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Formato de salida</label>
                <div className="space-y-2">
                  {(['loose', 'zip', 'pdf'] as OutputFormat[]).map((fmt) => (
                    <label key={fmt} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${outputFormat === fmt ? 'bg-gray-100 border-gray-400' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" name="format" checked={outputFormat === fmt} onChange={() => setOutputFormat(fmt)} />
                      <div>
                        <p className="text-gray-800 text-sm font-medium">
                          {fmt === 'loose' ? 'Fotos sueltas' : fmt === 'zip' ? 'Formato ZIP' : 'PDF (2 fotos/hoja)'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-600 text-sm font-medium mb-2 block">Calidad: {quality}%</label>
                  <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700" />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <button onClick={handleExport} disabled={isProcessing}
                className="px-8 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> Procesando...</> : <><i className="fas fa-download"></i> Exportar {images.filter((i) => i.selected).length} imágenes</>}
              </button>
            </div>
          </div>
        </>
      )}

      {isProcessing && images.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">Procesando archivo ZIP...</p>
        </div>
      )}
    </div>
  );
}
