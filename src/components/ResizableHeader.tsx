import React, { useRef, useState, useCallback, useEffect } from 'react';

interface ResizableHeaderProps {
  label?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
  minWidth?: number;
  onResize: (width: number) => void;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}

export default function ResizableHeader({ label, children, width, minWidth = 50, onResize, className = '', onClick }: ResizableHeaderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const thRef = useRef<HTMLTableCellElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.pageX;
    startWidthRef.current = thRef.current?.getBoundingClientRect().width || width || 100;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.pageX - startXRef.current;
      const newWidth = Math.max(minWidth, startWidthRef.current + diff);
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Add a class to body to prevent text selection and show resize cursor
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, minWidth, onResize]);

  return (
    <th 
      ref={thRef}
      onClick={onClick}
      className={`relative group select-none ${className}`}
      style={{ width: width ? `${width}px` : undefined, minWidth: minWidth ? `${minWidth}px` : undefined }}
    >
      <div className="w-full overflow-hidden">
        {children ?? label}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 ${isResizing ? 'bg-black/20' : ''}`}
        style={{ transform: 'translateX(50%)', zIndex: 10 }}
      />
    </th>
  );
}
