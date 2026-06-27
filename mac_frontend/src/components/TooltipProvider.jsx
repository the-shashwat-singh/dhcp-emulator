import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TOOLTIPS, PACKET_EXPLANATIONS } from '../data/tooltips';

export default function TooltipProvider() {
  const [state, setState] = useState({
    visible: false,
    content: null,
    pos: { x: 0, y: 0, placement: 'top', arrowX: 0 }
  });
  const [isClosing, setIsClosing] = useState(false);
  
  const enterTimer = useRef(null);
  const leaveTimer = useRef(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const handleMouseOver = (e) => {
      const target = e.target.closest('[data-tooltip], [data-tooltip-packet]');
      if (!target) return;

      const tooltipKey = target.getAttribute('data-tooltip');
      const packetKey = target.getAttribute('data-tooltip-packet');
      
      let newContent = null;
      if (tooltipKey && TOOLTIPS[tooltipKey]) {
        newContent = { title: tooltipKey, description: TOOLTIPS[tooltipKey] };
      } else if (packetKey && PACKET_EXPLANATIONS[packetKey]) {
        newContent = { 
          title: PACKET_EXPLANATIONS[packetKey].title, 
          description: PACKET_EXPLANATIONS[packetKey].description 
        };
      } else if (tooltipKey) {
        newContent = { title: tooltipKey, description: 'No description available.' };
      }

      if (!newContent) return;

      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
      }

      const rect = target.getBoundingClientRect();
      const tooltipWidth = 280; // Max width defined
      const tooltipHeight = 100; // Estimated height for boundary check
      
      let placement = 'top';
      let x = rect.left + rect.width / 2 - tooltipWidth / 2;
      let y = rect.top - 8; // 8px gap above element
      
      if (y - tooltipHeight < 10) {
        placement = 'bottom';
        y = rect.bottom + 8; // 8px gap below element
      }
      
      let arrowX = tooltipWidth / 2;
      
      // Clamp x to viewport
      if (x < 10) {
        arrowX = arrowX + x - 10;
        x = 10;
      } else if (x + tooltipWidth > window.innerWidth - 10) {
        const diff = x + tooltipWidth - (window.innerWidth - 10);
        arrowX = arrowX + diff;
        x = window.innerWidth - 10 - tooltipWidth;
      }
      
      // Keep arrow within tooltip bounds
      arrowX = Math.max(15, Math.min(tooltipWidth - 15, arrowX));

      const showAction = () => {
        setIsClosing(false);
        setState({
          visible: true,
          content: newContent,
          pos: { x, y, placement, arrowX }
        });
        isVisibleRef.current = true;
      };

      if (enterTimer.current) clearTimeout(enterTimer.current);
      enterTimer.current = setTimeout(showAction, 800);
    };

    const handleMouseOut = (e) => {
      const target = e.target.closest('[data-tooltip], [data-tooltip-packet]');
      if (!target) return;
      
      if (enterTimer.current) clearTimeout(enterTimer.current);
      
      leaveTimer.current = setTimeout(() => {
        setIsClosing(true);
        isVisibleRef.current = false;
        // Wait for exit animation to complete before unmounting
        setTimeout(() => {
          if (!isVisibleRef.current) {
            setState(s => ({ ...s, visible: false }));
          }
        }, 100); // 100ms exit animation
      }, 80);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  // Use a secondary effect to trigger the entrance animation correctly after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (state.visible && !isClosing) {
      // Small tick to ensure DOM paints initial scale(0.92) before transitioning to scale(1)
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [state.visible, isClosing]);

  if (!state.visible || !state.content) return null;

  const { x, y, placement, arrowX } = state.pos;
  const isTop = placement === 'top';
  
  // Animation states
  // Initial enter: opacity 0, scale 0.92
  // Active enter: opacity 1, scale 1.0
  // Exit: opacity 0, scale 0.95
  
  const currentOpacity = isClosing ? 0 : (mounted ? 1 : 0);
  
  const transformYVisible = isTop ? 'translateY(-100%)' : 'translateY(0)';
  const transformYHidden = isTop ? 'translateY(calc(-100% - 4px))' : 'translateY(-4px)';
  const currentTransform = (isClosing || !mounted) ? transformYHidden : transformYVisible;
  
  const transitionDuration = isClosing ? '100ms' : '160ms';
  const transitionTiming = isClosing ? 'ease-in' : 'ease-out';

  return createPortal(
    <>
      <style>
        {`
          .tooltip-container {
            position: fixed;
            z-index: 99999;
            background: rgba(255, 255, 255, 0.45);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            color: rgba(15, 15, 20, 0.85);
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px;
            font-weight: 400;
            line-height: 1.55;
            max-width: 260px;
            width: max-content;
            padding: 10px 14px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 0 rgba(255,255,255,0.8);
            border: 1px solid rgba(255, 255, 255, 0.7);
            pointer-events: none;
            transition: opacity ${transitionDuration} ${transitionTiming}, 
                        transform ${transitionDuration} ${transitionTiming};
            opacity: ${currentOpacity};
            transform: ${currentTransform};
            left: ${x}px;
            top: ${y}px;
          }
          
          .tooltip-arrow {
            position: absolute;
            width: 0; 
            height: 0; 
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            ${isTop ? `
              border-top: 6px solid rgba(255,255,255,0.7);
              bottom: -6px;
            ` : `
              border-bottom: 6px solid rgba(255,255,255,0.7);
              top: -6px;
            `}
            left: ${arrowX}px;
            transform: translateX(-50%);
          }
          .tooltip-arrow::after {
            content: '';
            position: absolute;
            width: 0; 
            height: 0; 
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            ${isTop ? `
              border-top: 5px solid rgba(255, 255, 255, 0.45);
              bottom: 1px;
            ` : `
              border-bottom: 5px solid rgba(255, 255, 255, 0.45);
              top: 1px;
            `}
            left: 0;
            transform: translateX(-50%);
          }
        `}
      </style>
      <div className="tooltip-container">
        <div className="tooltip-arrow" />
        <div style={{ marginBottom: '4px' }}>
          <strong style={{ 
            color: 'rgba(0,0,0,0.35)', 
            fontSize: '10px', 
            fontWeight: 600, 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em' 
          }}>
            {state.content.title}
          </strong>
        </div>
        <div>
          {state.content.description}
        </div>
      </div>
    </>,
    document.body
  );
}
