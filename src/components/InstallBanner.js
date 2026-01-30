import { useState, useEffect, useRef } from 'react';

function InstallBanner() {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Don't show if user previously dismissed
    if (localStorage.getItem('pwaInstallDismissed')) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShow(true);
    };

    const handleAppInstalled = () => {
      setShow(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwaInstallDismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <p className="install-banner-text">
          Add <strong>Gut Feeling</strong> to your home screen for quick access
        </p>
        <div className="install-banner-actions">
          <button className="install-banner-btn" onClick={handleInstall}>
            Install
          </button>
          <button className="install-banner-dismiss" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstallBanner;
