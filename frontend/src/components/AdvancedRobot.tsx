'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';

type RobotState = 'idle' | 'greeting' | 'thinking' | 'streaming' | 'success' | 'error';

interface AdvancedRobotProps {
  state?: RobotState;
}

export function AdvancedRobot({ state = 'idle' }: AdvancedRobotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalState, setInternalState] = useState<RobotState>('greeting');
  const [speechText, setSpeechText] = useState<string | null>(null);

  // Use the passed state or the internal one if we're doing a greeting/click
  const currentState = state !== 'idle' ? state : internalState;

  // Mouse tracking for hover
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothMouseX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothMouseY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  // Map mouse position to rotations and translations
  const headRotateX = useTransform(smoothMouseY, [-0.5, 0.5], [15, -15]);
  const headRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-20, 20]);
  const eyeOffsetX = useTransform(smoothMouseX, [-0.5, 0.5], [-4, 4]);
  const eyeOffsetY = useTransform(smoothMouseY, [-0.5, 0.5], [-4, 4]);
  const bodyRotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);
  const bodyTranslateX = useTransform(smoothMouseX, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    // Initial greeting sequence
    const doGreeting = async () => {
      setInternalState('greeting');
      await new Promise(r => setTimeout(r, 2500));
      setInternalState('idle');
    };
    doGreeting();
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleClick = () => {
    if (currentState === 'idle') {
      setSpeechText('Hello! Ready to chat?');
      setInternalState('greeting'); // trigger wave/bounce
      setTimeout(() => setSpeechText(null), 3000);
      setTimeout(() => setInternalState('idle'), 2500);
    }
  };

  // State-based animation variants
  const floatAnimation: any = {
    idle: { y: [0, -10, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
    greeting: { y: [-50, 0, -15, 0], transition: { duration: 1, times: [0, 0.4, 0.7, 1], ease: 'easeOut' } },
    thinking: { y: [0, -5, 0], transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } },
    streaming: { y: [0, -2, 0], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
    success: { y: [0, -20, 0, -10, 0], transition: { duration: 1 } },
    error: { y: [0, 2, -2, 2, 0], transition: { duration: 0.5 } }
  };

  const antennaAnimation: any = {
    idle: { rotate: [0, 5, -5, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } },
    thinking: { rotate: [0, 15, -15, 0], transition: { duration: 0.5, repeat: Infinity } },
    error: { rotate: [0, -30, 0], transition: { duration: 2, repeat: Infinity } }
  };

  const eyeBlink: any = {
    idle: { scaleY: [1, 1, 0.1, 1, 1], transition: { duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] } },
    thinking: { scaleY: 0.1, transition: { duration: 0.2 } },
    error: { scaleY: 0.5, rotate: 10 },
    success: { scaleY: [1, 0.2, 1], transition: { duration: 0.5 } }
  };

  const rightArmWave: any = {
    idle: { rotate: [0, 5, -5, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
    greeting: { rotate: [0, -120, -100, -130, -100, 0], transition: { duration: 1.5, ease: 'easeInOut' } },
    thinking: { rotate: -20 },
    success: { rotate: -150 }
  };

  const leftArmAnim: any = {
    idle: { rotate: [0, -5, 5, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } },
    thinking: { rotate: 20 },
    error: { rotate: -40 } // scratching head
  };

  const glowColor = currentState === 'error' ? 'rgba(255,100,0,0.6)' : 
                    currentState === 'success' ? 'rgba(0,255,100,0.6)' : 
                    currentState === 'thinking' ? 'rgba(0,200,255,0.8)' :
                    'rgba(0,255,200,0.5)';

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-[140px] md:w-[180px] lg:w-[240px] h-[140px] md:h-[180px] lg:h-[240px] mx-auto cursor-pointer perspective-1000"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Ambient Radial Glow */}
      <motion.div 
        className="absolute inset-0 rounded-full blur-3xl pointer-events-none transition-colors duration-500"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ backgroundColor: glowColor }}
      />

      {/* Holographic Ring */}
      <motion.div 
        className="absolute bottom-0 w-3/4 h-4 rounded-[100%] border-2 border-primary/40 blur-[1px]"
        style={{ boxShadow: `0 0 15px ${glowColor}, inset 0 0 10px ${glowColor}` }}
        animate={{ 
          scale: currentState === 'thinking' ? [1, 1.2, 1] : [1, 1.05, 1],
          opacity: [0.4, 0.8, 0.4],
          rotateX: 75,
          rotateZ: currentState === 'thinking' ? 360 : 0
        }}
        transition={{ duration: currentState === 'thinking' ? 2 : 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Main Robot Assembly */}
      <motion.div 
        className="relative flex flex-col items-center justify-center z-10 w-full h-full transform-style-3d"
        style={{ x: bodyTranslateX, rotateY: bodyRotateY }}
        animate={currentState}
        variants={floatAnimation}
      >
        {/* Antenna */}
        <motion.div 
          className="absolute top-[5%] w-1.5 h-[15%] bg-gradient-to-b from-gray-300 to-gray-400 rounded-full origin-bottom shadow-lg"
          animate={currentState}
          variants={antennaAnimation}
        >
          {/* Antenna Tip Glow */}
          <motion.div 
            className="absolute -top-2 -left-1 w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: currentState === 'error' ? '#ff6b00' : '#00ffd0', boxShadow: `0 0 10px ${glowColor}` }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>

        {/* Head */}
        <motion.div 
          className="relative w-[60%] h-[45%] mt-[15%] rounded-[40px] bg-white border border-gray-100 flex items-center justify-center overflow-hidden z-20"
          style={{ 
            rotateX: headRotateX, 
            rotateY: headRotateY,
            boxShadow: 'inset -5px -10px 20px rgba(0,0,0,0.1), inset 5px 5px 15px rgba(255,255,255,0.9), 0 10px 20px rgba(0,0,0,0.15)'
          }}
        >
          {/* Face Plate / Screen */}
          <div className="relative w-[80%] h-[60%] bg-gray-900 rounded-[20px] shadow-inner overflow-hidden border-2 border-gray-800">
            {/* Screen Glass Reflection */}
            <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-white/10 to-transparent rounded-t-[20px] pointer-events-none" />
            
            <div className="relative w-full h-full flex items-center justify-center gap-4">
              {/* Left Eye */}
              <motion.div 
                className="w-[18%] h-[25%] rounded-full"
                style={{ 
                  backgroundColor: currentState === 'error' ? '#ff6b00' : '#00ffd0',
                  boxShadow: `0 0 15px ${glowColor}`,
                  x: eyeOffsetX, y: eyeOffsetY
                }}
                animate={currentState}
                variants={eyeBlink}
              />
              {/* Right Eye */}
              <motion.div 
                className="w-[18%] h-[25%] rounded-full"
                style={{ 
                  backgroundColor: currentState === 'error' ? '#ff6b00' : '#00ffd0',
                  boxShadow: `0 0 15px ${glowColor}`,
                  x: eyeOffsetX, y: eyeOffsetY
                }}
                animate={currentState}
                variants={eyeBlink}
              />
            </div>
          </div>
        </motion.div>

        {/* Neck */}
        <div className="w-[15%] h-[5%] bg-gradient-to-b from-gray-400 to-gray-500 rounded-sm shadow-inner z-10" />

        {/* Body */}
        <div 
          className="relative w-[50%] h-[35%] rounded-[30px] bg-white border border-gray-100 flex items-center justify-center z-20"
          style={{ boxShadow: 'inset -5px -10px 20px rgba(0,0,0,0.1), inset 5px 5px 15px rgba(255,255,255,0.9), 0 15px 25px rgba(0,0,0,0.1)' }}
        >
          {/* Core Chest Light */}
          <motion.div 
            className="w-1/3 h-1/3 rounded-full blur-[1px]"
            style={{ backgroundColor: currentState === 'error' ? '#ff6b00' : '#00ffd0', boxShadow: `0 0 20px ${glowColor}` }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: currentState === 'thinking' ? 1 : 3, repeat: Infinity }}
          />
        </div>

        {/* Left Arm */}
        <motion.div 
          className="absolute top-[60%] left-[10%] w-[12%] h-[30%] bg-white rounded-full origin-top z-10"
          style={{ boxShadow: 'inset -2px -5px 10px rgba(0,0,0,0.1), 0 5px 10px rgba(0,0,0,0.1)' }}
          animate={currentState}
          variants={leftArmAnim}
        />

        {/* Right Arm */}
        <motion.div 
          className="absolute top-[60%] right-[10%] w-[12%] h-[30%] bg-white rounded-full origin-top z-10"
          style={{ boxShadow: 'inset -2px -5px 10px rgba(0,0,0,0.1), 0 5px 10px rgba(0,0,0,0.1)' }}
          animate={currentState}
          variants={rightArmWave}
        />
      </motion.div>

      {/* Speech Bubble */}
      <AnimatePresence>
        {speechText && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: -20 }}
            exit={{ opacity: 0, scale: 0.8, y: 0 }}
            className="absolute -top-4 right-[-40%] bg-white text-gray-900 px-4 py-2 rounded-2xl shadow-xl border border-gray-100 text-sm font-medium z-50 pointer-events-none"
          >
            {speechText}
            <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white transform rotate-45 border-r border-b border-gray-100" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking Particles */}
      <AnimatePresence>
        {currentState === 'thinking' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center"
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary rounded-full blur-[1px]"
                animate={{
                  rotate: 360,
                  scale: [1, 1.5, 1],
                  opacity: [0, 1, 0],
                  radius: [30, 50, 30] // Custom property to simulate orbiting via transform below
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "linear"
                }}
                style={{
                  transformOrigin: '50% 50%',
                  marginTop: '-40px'
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
