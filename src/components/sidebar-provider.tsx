
'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type SidebarContextType = {
  isLeftSidebarCollapsed: boolean;
  toggleLeftSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);

  const toggleLeftSidebar = useCallback(() => {
    setIsLeftSidebarCollapsed(prev => !prev);
  }, []);
  

  return (
    <SidebarContext.Provider value={{ isLeftSidebarCollapsed, toggleLeftSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

    