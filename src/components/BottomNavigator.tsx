'use client'

import { Home, Search, List, Info } from 'lucide-react'

export type TabType = 'home' | 'search' | 'sos' | 'weather'

interface BottomNavigatorProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  sosCount?: number
}

export function BottomNavigator({
  activeTab,
  onTabChange,
  sosCount = 0,
}: BottomNavigatorProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-2000 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] safe-area-bottom">
      <div className="grid grid-cols-4 h-16">
        {/* Home Tab */}
        <button
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
            activeTab === 'home'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-200 ${
              activeTab === 'home'
                ? 'bg-primary-600 dark:bg-primary-400 opacity-100'
                : 'opacity-0'
            }`}
          />
          <Home
            className={`size-6 transition-transform duration-200 ${
              activeTab === 'home' ? 'scale-110' : ''
            }`}
          />
          <span
            className={`text-sm font-medium transition-all duration-200 ${
              activeTab === 'home' ? 'font-semibold' : ''
            }`}
          >
            Trang chủ
          </span>
        </button>

        {/* Search Tab */}
        <button
          onClick={() => onTabChange('search')}
          className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
            activeTab === 'search'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-200 ${
              activeTab === 'search'
                ? 'bg-primary-600 dark:bg-primary-400 opacity-100'
                : 'opacity-0'
            }`}
          />
          <Search
            className={`size-6 transition-transform duration-200 ${
              activeTab === 'search' ? 'scale-110' : ''
            }`}
          />
          <span
            className={`text-sm font-medium transition-all duration-200 ${
              activeTab === 'search' ? 'font-semibold' : ''
            }`}
          >
            Tìm kiếm
          </span>
        </button>

        {/* SOS List Tab */}
        <button
          onClick={() => onTabChange('sos')}
          className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
            activeTab === 'sos'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-200 ${
              activeTab === 'sos'
                ? 'bg-primary-600 dark:bg-primary-400 opacity-100'
                : 'opacity-0'
            }`}
          />
          <div className="relative">
            <List
              className={`size-6 transition-transform duration-200 ${
                activeTab === 'sos' ? 'scale-110' : ''
              }`}
            />
            {sosCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-error-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 border-2 border-white dark:border-gray-900 shadow-sm">
                {sosCount > 9 ? '9+' : sosCount}
              </span>
            )}
          </div>
          <span
            className={`text-sm font-medium transition-all duration-200 ${
              activeTab === 'sos' ? 'font-semibold' : ''
            }`}
          >
            SOS
          </span>
        </button>

        {/* Weather & Layers Tab */}
        <button
          onClick={() => onTabChange('weather')}
          className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${
            activeTab === 'weather'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 rounded-b-full transition-all duration-200 ${
              activeTab === 'weather'
                ? 'bg-primary-600 dark:bg-primary-400 opacity-100'
                : 'opacity-0'
            }`}
          />
          <Info
            className={`size-6 transition-transform duration-200 ${
              activeTab === 'weather' ? 'scale-110' : ''
            }`}
          />
          <span
            className={`text-sm font-medium transition-all duration-200 ${
              activeTab === 'weather' ? 'font-semibold' : ''
            }`}
          >
            Thông tin
          </span>
        </button>
      </div>
    </div>
  )
}
