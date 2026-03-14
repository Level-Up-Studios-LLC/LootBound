import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faSpinner, faDownload } from '../fa.ts';

interface PhotoViewerProps {
  photo: string | null;
  canSave?: boolean;
  onClose: () => void;
}

export default function PhotoViewer(p: PhotoViewerProps) {
  var _loaded = useState(false),
    loaded = _loaded[0],
    setLoaded = _loaded[1];
  var _saving = useState(false),
    saving = _saving[0],
    setSaving = _saving[1];

  useEffect(function () {
    setLoaded(false);
  }, [p.photo]);

  async function handleSave() {
    if (!p.photo || saving) return;
    setSaving(true);

    try {
      var response = await fetch(p.photo);
      var blob = await response.blob();
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'lootbound-photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error('[PhotoViewer] Save failed:', err);
      window.open(p.photo, '_blank');
    } finally {
      setSaving(false);
    }
  }

  if (!p.photo) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-5 animate-fade-in"
      onClick={p.onClose}
    >
      <div
        className="max-w-[360px] w-full"
        onClick={function (e) {
          e.stopPropagation();
        }}
      >
        {!loaded && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FontAwesomeIcon
              icon={faSpinner}
              spin
              className="text-white text-3xl"
            />
            <div className="text-white/80 text-sm font-body">
              Loading photo...
            </div>
          </div>
        )}
        <img
          src={p.photo}
          alt="proof"
          className={'w-full rounded-btn shadow-lg' + (loaded ? '' : ' hidden')}
          onLoad={function () {
            setLoaded(true);
          }}
        />
        <div className={'flex gap-2 mt-3' + (loaded ? '' : ' hidden')}>
          {p.canSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-qteal hover:bg-qteal/90 text-white rounded-btn px-4 py-3 font-semibold font-body cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FontAwesomeIcon icon={saving ? faSpinner : faDownload} spin={saving} />
              {saving ? 'Saving...' : 'Save Photo'}
            </button>
          )}
          <button
            onClick={p.onClose}
            className={(p.canSave ? 'flex-1' : 'w-full') + ' bg-white hover:bg-qcard-hover text-qslate rounded-btn px-4 py-3 font-semibold font-body border border-qborder cursor-pointer transition-colors flex items-center justify-center gap-2'}
          >
            <FontAwesomeIcon icon={faXmark} />
            Close
          </button>
        </div>
        {!loaded && (
          <button
            onClick={p.onClose}
            className="w-full mt-3 bg-white hover:bg-qcard-hover text-qslate rounded-btn px-4 py-3 font-semibold font-body border border-qborder cursor-pointer transition-colors flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faXmark} />
            Close
          </button>
        )}
      </div>
    </div>
  );
}
