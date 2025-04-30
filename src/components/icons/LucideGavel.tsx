
import React from "react";

export const LucideGavel = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m14 14-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L11 11" />
      <path d="M16 16 22 9.97" />
      <path d="m8 8 6-6 3 3-6.5 6.5" />
      <path d="m12.5 3.5 1 1" />
      <path d="M16 7 17.5 8.5" />
      <path d="m19 11 1.5-1.5" />
    </svg>
  );
};
