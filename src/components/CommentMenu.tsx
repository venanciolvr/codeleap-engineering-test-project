import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface CommentMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

export function CommentMenu({ isOpen, onClose, onEdit, onDelete, buttonRef }: CommentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const buttonRect = buttonRef.current?.getBoundingClientRect();
  if (!buttonRect) return null;

  const menuStyle = {
    position: 'fixed' as const,
    top: `${buttonRect.bottom + window.scrollY + 4}px`,
    left: `${buttonRect.right - 110}px`,
    zIndex: 9999
  };

  return createPortal(
    <div ref={menuRef} className="comment-menu-dropdown" style={menuStyle}>
      <button className="comment-menu-item" onClick={onEdit}>Edit</button>
      <button className="comment-menu-item" onClick={onDelete}>Delete</button>
    </div>,
    document.body
  );
} 