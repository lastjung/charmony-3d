import { useState, useRef, useEffect } from 'react';

export const useAudioReactivity = (enabled: boolean) => {
  const [volume, setVolume] = useState(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      setVolume(0);
      return;
    }

    let audioContext: AudioContext;
    let source: MediaStreamAudioSourceNode;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.8;
        
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyzer);
        
        analyzerRef.current = analyzer;
        const bufferLength = analyzer.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        const update = () => {
          if (analyzerRef.current && dataArrayRef.current) {
            analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
            let sum = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
              sum += dataArrayRef.current[i];
            }
            const avg = sum / dataArrayRef.current.length;
            setVolume(avg / 255); // Normalized 0-1
          }
          animationRef.current = requestAnimationFrame(update);
        };
        update();
      } catch (err) {
        console.error("Audio access denied or error:", err);
      }
    };

    setupAudio();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContext) audioContext.close();
    };
  }, [enabled]);

  return volume;
};
