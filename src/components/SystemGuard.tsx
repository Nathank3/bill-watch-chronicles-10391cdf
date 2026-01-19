
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card.tsx";
import { Lock } from "lucide-react";

interface SystemConfig {
  maintenanceMode: boolean;
  developerCredits: boolean;
  allowedDomains: string[];
}

// Extend Window interface for our custom methods
declare global {
    interface Window {
        _sys_admin_lock: () => void;
        _sys_admin_unlock: () => void;
    }
}

// Default configuration - In a real scenario, this could be fetched from a remote Gist
const DEFAULT_CONFIG: SystemConfig = {
  maintenanceMode: false,
  developerCredits: false, // Set to true to show "Developed by..." permanently
  allowedDomains: ["localhost", "127.0.0.1", "bill-watch-chronicles.vercel.app"] // Add production domains here
};

export const SystemGuard = ({ children }: { children: React.ReactNode }) => {
  const [config] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [isLocked, setIsLocked] = useState(false);
  const [showCredits] = useState(false);

  useEffect(() => {
    // 1. Check Local Storage "Kill Switch" (Manual Override)
    const localLock = localStorage.getItem('__sys_lock_v1');
    if (localLock === 'true') {
      setIsLocked(true);
    }

    // 2. Check Domain Integrity
    const currentDomain = globalThis.location.hostname;
    const isAllowed = config.allowedDomains.some(d => currentDomain.includes(d));
    
    // Warn if domain not allowed (Anti-theft) - Optional: Lock it
    if (!isAllowed) {
       console.warn("System running on unauthorized domain:", currentDomain);
       // Uncomment to enforce domain locking:
       // setIsLocked(true);
    }

    // 3. Remote Config Check (Placeholder)
    const checkRemoteStatus = () => {
        try {
            // Placeholder: await fetch(...)
            // const data = { kill_switch: false };
            // if (data.kill_switch) setIsLocked(true);
        } catch (e) {
            console.error("Failed to check remote status", e);
        }
    };
    checkRemoteStatus();

    // 4. Developer Signature Console Log
    console.log(
      "%c Developed by Nathan Kimeu ",
      "background: #222; color: #bada55; font-size: 20px; padding: 10px; border-radius: 5px;"
    );
    console.log("LinkedIn: https://www.linkedin.com/in/nathan-kimeu/");

  }, [config]);

  // Secret Trigger listening (Konami Code-ish)
  useEffect(() => {
    globalThis.window._sys_admin_lock = () => {
        localStorage.setItem('__sys_lock_v1', 'true');
        globalThis.location.reload();
    };
    globalThis.window._sys_admin_unlock = () => {
        localStorage.removeItem('__sys_lock_v1');
        globalThis.location.reload();
    };
  }, []);

  if (isLocked) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-600 bg-gray-800 text-white">
          <CardHeader className="text-center">
            <div className="mx-auto bg-red-900/50 p-3 rounded-full w-fit mb-4">
                <Lock className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-xl text-red-500">System Unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-300">
                This system is currently undergoing critical maintenance or license verification issues.
            </p>
            <p className="text-sm text-gray-400">
                Please contact the administrator or the developer for assistance.
            </p>
            <div className="pt-4 border-t border-gray-700 mt-4">
                 <p className="text-xs text-gray-500">Error Code: LIC_VER_FAIL_0X1</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Developer Credit Overlay (Activated optionally) */}
      {(showCredits || config.developerCredits) && (
          <div className="fixed bottom-2 right-2 z-50 bg-black/80 text-white text-[10px] px-2 py-1 rounded cursor-pointer hover:bg-black"
               onClick={() => globalThis.open('https://www.linkedin.com/in/nathan-kimeu/', '_blank')}>
              Built by Nathan Kimeu
          </div>
      )}
    </>
  );
};
