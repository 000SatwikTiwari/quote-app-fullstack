import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="flex max-w-[1280px] mx-auto min-h-screen bg-black">
      <Sidebar />
      <main className="flex-1 border-x border-border min-h-screen ml-[80px] sm:ml-[250px] lg:ml-[275px]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
