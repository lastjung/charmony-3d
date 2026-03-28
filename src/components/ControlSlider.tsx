import React, { startTransition, useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  color?: string; // Tailwind text class or Hex color
  format?: (val: number) => string;
  isAuto?: boolean;
  onAutoToggle?: () => void;
}

export function ControlSlider({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  onChange, 
  color = "text-zinc-300", 
  format,
  isAuto = false,
  onAutoToggle
}: ControlSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Apple Pro Style Red for active state
  const activeColor = "#ff4d4d";
  
  return (
    <div className={`space-y-1.5 transition-all duration-300 ${isAuto ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
      <div className="flex justify-between items-center cursor-default">
        <div 
          className="flex items-center gap-2 cursor-pointer group/label"
          onClick={onAutoToggle}
        >
          {onAutoToggle && (
            <motion.span 
              initial={false}
              animate={{ color: isAuto ? activeColor : "#52525b" }}
              className="text-[10px] font-black transition-colors"
            >
              {isAuto ? '||' : '▶'}
            </motion.span>
          )}
          
          <motion.label 
            animate={isAuto ? { 
              color: activeColor,
              opacity: [1, 0.7, 1]
            } : { 
              opacity: 1
            }}
            transition={isAuto ? { 
              repeat: Infinity, 
              duration: 2, 
              ease: "easeInOut" 
            } : {}}
            className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors ${!isAuto ? color : "text-[#ff4d4d]"}`}
            style={!isAuto && !color.startsWith('text-') ? { color } : {}}
          >
          {label}
          </motion.label>
        </div>
        
        <span 
          className={`text-xs font-mono transition-colors ${!isAuto ? color : "text-[#ff4d4d]"}`}
          style={!isAuto && !color.startsWith('text-') ? { color } : {}}
        >
          {format ? format(localValue) : (step < 0.1 ? localValue.toFixed(3) : localValue.toFixed(1))}
        </span>
      </div>
      
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={localValue} 
        onChange={(e) => {
          const nextValue = parseFloat(e.target.value);
          setLocalValue(nextValue);
          startTransition(() => {
            onChange(nextValue);
          });
        }}
        className={`w-full h-1 rounded-lg appearance-none cursor-pointer transition-all ${isAuto ? 'bg-[#ff4d4d]/30' : 'bg-zinc-800'}`}
        style={{
          accentColor: isAuto ? activeColor : undefined,
          // When in auto, we force the accent color to Red
        } as any}
      />
    </div>
  );
}
