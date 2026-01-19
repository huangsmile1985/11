
import React from 'react';

interface ResultCardProps {
  title: string;
  children: React.ReactNode;
}

export const ResultCard: React.FC<ResultCardProps> = ({ title, children }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};
