
import React from 'react';
import { BeakerIcon } from './Icons';

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-slate-800 shadow-md">
      <div className="container mx-auto px-4 py-4 md:px-8 md:py-6 flex items-center space-x-4">
        <BeakerIcon className="h-10 w-10 text-cyan-500" />
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            多组分色谱方法开发系统
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            智能预测多组分分离的最佳色谱条件
          </p>
        </div>
      </div>
    </header>
  );
};
