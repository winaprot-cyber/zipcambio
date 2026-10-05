import { useState, useCallback } from 'react';

interface VideoFile {
  id: string;
  file: File;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  thumbnail: string;
  url: string;
}

interface ConversionSettings {
  format: 'mp4' | 'mov' | 'webm';
  quality: number;
  resolution: 'original' | '1080p' | '720p' | '480p' | '360p';
  bitrate: number;
}

const RESOLUTION_MAP: Record<string, { width: number; height: number } | null> = {
  original: null,
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
};

export default function VideoConverterTab() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingVideo, setProcessingVideo] = useState('');
  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'mp4',
    quality: 70,
    resolution: 'original',
    bitrate: 2500,
  });

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newVideos: VideoFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => { video.currentTime = 1; };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, 160, 90);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
          newVideos.push({
            id: `${Date.now()}-${i}`,
            file,
            name: file.name,
            size: file.size,
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnail,
            url,
          });
          resolve();
        };
        video.src = url;
      });
    }
    setVideos((prev) => [...prev, ...newVideos]);
  }, []);

  const removeVideo = (id: string) => {
    setVideos((prev) => {
      const video = prev.find((v) => v.id === id);
      if (video) URL.revokeObjectURL(video.url);
      return prev.filter((v) => v.id !== id);
    });
  };

  const convertVideo = async (videoFile: VideoFile): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoFile.url;
      video.muted = true;
      video.onloadedmetadata = () => {
        let targetWidth = videoFile.width;
        let targetHeight = videoFile.height;
        const res = RESOLUTION_MAP[settings.resolution];
        if (res) {
          const aspectRatio = videoFile.width / videoFile.height;
          targetWidth = res.width;
          targetHeight = Math.round(targetWidth / aspectRatio);
          if (targetHeight > res.height) {
            targetHeight = res.height;
            targetWidth = Math.round(targetHeight * aspectRatio);
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d')!;
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
        const recorder = new MediaRecorder(canvas.captureStream(30), {
          mimeType,
          videoBitsPerSecond: settings.bitrate * 1000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => { resolve(new Blob(chunks, { type: mimeType })); };
        recorder.onerror = () => reject(new Error('Error recording'));
        video.play().then(() => {
          recorder.start(100);
          const drawFrame = () => {
            if (video.ended || video.paused) { recorder.stop(); return; }
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            setProgress((video.currentTime / video.duration) * 100);
            requestAnimationFrame(drawFrame);
          };
          drawFrame();
        }).catch(() => reject(new Error('Error playing video')));
      };
      video.onerror = () => reject(new Error('Error loading video'));
    });
  };

  const handleConvertAll = async () => {
    if (videos.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        setProcessingVideo(video.name);
        setProgress(0);
        const blob = await convertVideo(video);
        const ext = settings.format;
        const baseName = video.name.replace(/\.[^.]+$/, '');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}_convertido.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      alert('Error al convertir el video.');
    }
    setIsProcessing(false);
    setProgress(0);
    setProcessingVideo('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const estimatedOutputSize = (): string => {
    const totalDuration = videos.reduce((acc, v) => acc + v.duration, 0);
    const estimatedBytes = (settings.bitrate * 1000 * totalDuration) / 8;
    return formatFileSize(estimatedBytes);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-upload text-gray-500"></i> Cargar Videos
        </h2>
        <label className="w-full cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors bg-gray-50">
            <i className="fas fa-film text-4xl text-gray-400 mb-3"></i>
            <p className="text-gray-700 font-medium">Haga clic para seleccionar videos</p>
            <p className="text-gray-400 text-sm mt-1">Formatos: MP4, MOV, AVI, WebM, MKV</p>
          </div>
          <input type="file" accept="video/*" multiple onChange={handleVideoUpload} className="hidden" />
        </label>
      </div>

      {videos.length > 0 && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-sliders text-gray-500"></i> Configuración de Conversión
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Formato de salida</label>
                <select value={settings.format} onChange={(e) => setSettings({ ...settings, format: e.target.value as ConversionSettings['format'] })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:outline-none focus:border-gray-400">
                  <option value="mp4">MP4 (H.264)</option>
                  <option value="mov">MOV (QuickTime)</option>
                  <option value="webm">WebM (VP9)</option>
                </select>
              </div>
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Resolución</label>
                <select value={settings.resolution} onChange={(e) => setSettings({ ...settings, resolution: e.target.value as ConversionSettings['resolution'] })} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 focus:outline-none focus:border-gray-400">
                  <option value="original">Original</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="480p">480p (SD)</option>
                  <option value="360p">360p</option>
                </select>
              </div>
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Calidad: {settings.quality}%</label>
                <input type="range" min="10" max="100" value={settings.quality} onChange={(e) => setSettings({ ...settings, quality: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700" />
              </div>
              <div>
                <label className="text-gray-600 text-sm font-medium mb-2 block">Bitrate: {settings.bitrate} kbps</label>
                <input type="range" min="500" max="10000" step="500" value={settings.bitrate} onChange={(e) => setSettings({ ...settings, bitrate: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700" />
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-500">
                <i className="fas fa-info-circle mr-1"></i>
                Tamaño estimado: <span className="font-medium text-gray-700">{estimatedOutputSize()}</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-list text-gray-500"></i> Videos cargados ({videos.length})
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {videos.map((video) => (
                <div key={video.id} className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex-shrink-0">
                    <img src={video.thumbnail} alt="" className="w-20 h-12 object-cover rounded-lg border border-gray-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm font-medium truncate">{video.name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-gray-400 text-xs"><i className="fas fa-clock mr-1"></i>{formatDuration(video.duration)}</span>
                      <span className="text-gray-400 text-xs"><i className="fas fa-expand mr-1"></i>{video.width}x{video.height}</span>
                      <span className="text-gray-400 text-xs"><i className="fas fa-weight-hanging mr-1"></i>{formatFileSize(video.size)}</span>
                    </div>
                  </div>
                  <button onClick={() => removeVideo(video.id)} className="flex-shrink-0 w-8 h-8 bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors">
                    <i className="fas fa-trash text-xs"></i>
                  </button>
                </div>
              ))}
            </div>
            {isProcessing && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600"><i className="fas fa-spinner fa-spin mr-2"></i>Convirtiendo: {processingVideo}</p>
                  <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-gray-600 to-gray-800 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button onClick={handleConvertAll} disabled={isProcessing} className="px-8 py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center gap-2">
                {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> Convirtiendo...</> : <><i className="fas fa-exchange-alt"></i> Convertir {videos.length} video{videos.length > 1 ? 's' : ''}</>}
              </button>
              <button onClick={() => { videos.forEach((v) => URL.revokeObjectURL(v.url)); setVideos([]); }} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors border border-gray-200 flex items-center gap-2">
                <i className="fas fa-times"></i> Limpiar todo
              </button>
            </div>
          </div>
        </>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <i className="fas fa-lightbulb text-yellow-500"></i> Información
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
            <p>Conversión local en su navegador. No se suben archivos a servidores.</p>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
            <p>Reduzca bitrate y resolución para archivos más ligeros.</p>
          </div>
          <div className="flex items-start gap-2">
            <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
            <p>MP4 y MOV son compatibles con la mayoría de dispositivos.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
