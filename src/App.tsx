import { useState } from 'react';
import PhotoExtractorTab from './components/PhotoExtractorTab';
import ZipManagerTab from './components/ZipManagerTab';
import VideoConverterTab from './components/VideoConverterTab';
import OfflineDownload from './components/OfflineDownload';

type TabType = 'extractor' | 'manager' | 'video';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('extractor');
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  const tabs = [
    { id: 'extractor' as TabType, label: 'Extractor de Fotos', icon: 'fas fa-images' },
    { id: 'manager' as TabType, label: 'Gestor de ZIPs', icon: 'fas fa-pen-to-square' },
    { id: 'video' as TabType, label: 'Conversor de Video', icon: 'fas fa-video' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center shadow-md">
                <i className="fas fa-file-archive text-white text-lg"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Gestor ZIP Pro</h1>
                <p className="text-xs text-gray-500">Extractor, Renombrador y Conversor</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowOfflineModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm flex items-center gap-2"
              >
                <i className="fas fa-download"></i>
                <span className="hidden sm:inline">Descargar .EXE Offline</span>
              </button>
              <div className="text-right">
                <p className="text-xs text-gray-400">Desarrollado para</p>
                <p className="text-sm font-semibold text-gray-700">Uso de Digitación</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 text-sm ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white shadow-lg shadow-gray-800/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="pb-8">
          {activeTab === 'extractor' && <PhotoExtractorTab />}
          {activeTab === 'manager' && <ZipManagerTab />}
          {activeTab === 'video' && <VideoConverterTab />}
        </div>

        <footer className="text-center py-6 border-t border-gray-200 mt-8">
          <p className="text-sm text-gray-400">
            © 2026 Gestor ZIP Pro — Desarrollado para uso de digitación
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Aplicación web para gestión de archivos multimedia
          </p>
        </footer>
      </div>

      {showOfflineModal && (
        <OfflineDownload onClose={() => setShowOfflineModal(false)} />
      )}
    </div>
  );
}

export default App;
