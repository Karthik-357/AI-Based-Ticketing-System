import React from 'react';
import { Loader2 } from 'lucide-react';

const Loader = ({ fullScreen = true }) => {
  const containerClass = fullScreen 
    ? "flex justify-center items-center w-full h-full min-h-[400px]"
    : "flex justify-center items-center w-full p-8";

  return (
    <div className={containerClass}>
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
    </div>
  );
};

export default Loader;
