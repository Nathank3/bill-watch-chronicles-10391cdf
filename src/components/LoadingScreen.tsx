import React from "react";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-[9999]">
      <div className="flex flex-col items-center gap-4">
        <div className="loader-squares">
          <div className="loader-square bg-loader-orange anim-delay-1" />
          <div className="loader-square bg-loader-blue anim-delay-2" />
          <div className="loader-square bg-loader-yellow anim-delay-3" />
          <div className="loader-square bg-loader-green anim-delay-4" />
        </div>
        <p className="text-sm font-medium animate-pulse text-muted-foreground tracking-widest uppercase">
          Loading
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
