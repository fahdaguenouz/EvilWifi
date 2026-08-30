import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface AuthorizationModalProps {
  onAuthorize: () => void;
  onCancel: () => void;
}

export function AuthorizationModal({ onAuthorize, onCancel }: AuthorizationModalProps) {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-accent/30 p-8 rounded-2xl shadow-2xl max-w-lg w-full mx-4">
        <div className="flex items-center gap-4 mb-6 text-accent">
          <div className="p-3 bg-accent/10 rounded-full">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-bold">AUTHORIZED SECURITY TESTING ONLY</h2>
        </div>

        <div className="space-y-4 text-text/80 mb-8">
          <p>
            EvilWifi Lab is a cybersecurity education platform designed to demonstrate wireless security concepts.
          </p>
          <p className="font-semibold text-text">
            This operation must only be performed on networks and devices that you own or are explicitly authorized to test.
          </p>
          <p>
            Unauthorized use of this tool against third-party networks or devices is strictly prohibited.
          </p>
        </div>

        <label className="flex items-start gap-3 p-4 bg-background rounded-lg border border-border cursor-pointer mb-8 hover:bg-background/80 transition-colors">
          <div className="flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="w-5 h-5 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-surface"
            />
          </div>
          <span className="text-sm font-medium">
            I confirm that I am authorized to perform this test and will use this tool responsibly for educational purposes only.
          </span>
        </label>

        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-lg font-medium text-muted hover:text-text hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAuthorize}
            disabled={!isChecked}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors ${
              isChecked 
                ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20' 
                : 'bg-primary/50 text-white/50 cursor-not-allowed'
            }`}
          >
            <ShieldCheck size={20} />
            CONTINUE
          </button>
        </div>
      </div>
    </div>
  );
}
