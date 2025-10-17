import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function FloatingFAQButton() {
  return (
    <Link href="/faq">
      <button
        className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-40 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 group"
        aria-label="Open FAQ"
        title="Frequently Asked Questions"
      >
        <HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        
        {/* Tooltip */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-3 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
          Quick FAQ
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-800"></div>
        </div>
        
        {/* Pulse animation */}
        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></div>
      </button>
    </Link>
  );
}