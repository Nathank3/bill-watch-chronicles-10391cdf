import { useSystemSettings } from "@/hooks/useSystemSettings.ts";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { Construction } from "lucide-react";

export const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isMaintenanceMode, loading } = useSystemSettings();
  const { isAdmin } = useAuth();


  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background">Loading system configuration...</div>;
  }

  // If maintenance is off, show content
  if (!isMaintenanceMode) {
    return <>{children}</>;
  }

  // If maintenance is on, but user is admin, allow access with a banner
  if (isMaintenanceMode && isAdmin) {
    return (
      <>
        <div className="bg-orange-500 text-white text-center py-1 px-4 text-xs fixed top-0 left-0 right-0 z-[100] shadow-md">
          MAINTENANCE MODE ACTIVE - Public access is disabled. You can see this page because you are an admin.
        </div>
        <div className="pt-6">
            {children}
        </div>
      </>
    );
  }

  // Otherwise (Maintenance ON and NOT Admin), block access
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md text-center space-y-6">
        <div className="mx-auto bg-orange-500/20 p-6 rounded-full w-fit animate-pulse">
            <Construction className="w-16 h-16 text-orange-500" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">County Assembly Business Update in Progress</h1>
        
        <p className="text-gray-400 text-lg">
            We are currently working to provide you with updated assembly business. 
            Public access and view is temporarily unavailable.
        </p>


      </div>
    </div>
  );
};
