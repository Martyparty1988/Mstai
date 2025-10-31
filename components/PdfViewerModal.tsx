
import React, { useMemo, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';

interface PdfViewerModalProps {
  pdfBlob: Blob;
  onClose: () => void;
}

const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ pdfBlob, onClose }) => {
  const { t } = useI18n();

  const pdfUrl = useMemo(() => URL.createObjectURL(pdfBlob), [pdfBlob]);

  // Clean up the object URL when the component unmounts
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="relative w-full h-full max-w-6xl p-4 bg-black/30 backdrop-blur-2xl rounded-3xl shadow-xl border border-white/10 flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
            <h2 className="text-2xl font-bold text-white">{t('plan_preview')}</h2>
            <button onClick={onClose} className="px-5 py-2 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors">
                {t('close')}
            </button>
        </div>
        <div className="flex-grow w-full h-full overflow-hidden rounded-xl">
            <iframe
                src={pdfUrl}
                title={t('plan_preview')}
                className="w-full h-full border-0"
            />
        </div>
      </div>
    </div>
  );
};

export default PdfViewerModal;
