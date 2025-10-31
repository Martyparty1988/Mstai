
import React, { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';

interface SummaryModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ title, content, onClose }) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-lg p-4">
      <div className="w-full max-w-2xl p-8 bg-black/20 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto bg-black/20 p-4 rounded-xl border border-white/10">
          <pre className="text-gray-200 whitespace-pre-wrap text-lg">{content}</pre>
        </div>
        <div className="flex justify-end gap-4 mt-6 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="px-6 py-3 bg-green-600/80 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-md text-lg w-40 text-center"
          >
            {copied ? t('copied') : t('copy_to_clipboard')}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
