import { useState } from 'react';

export type BeamShape = 'semicircle' | 'V' | 'parabola' | 'U';

export interface BeamSettings {
  shape: BeamShape;
  revolution: number;
  rotation: number;
  spread: number;
  count: number;
  speed: number;
  width: number;
  reflections: number;
  alpha: number;
  isParallelLight: boolean;
}

export interface BeamAutoModes {
  revolution: boolean;
  rotation: boolean;
  spread: boolean;
  count: boolean;
  speed: boolean;
  reflections: boolean;
}

const DEFAULT_BEAM_AUTO_MODES: BeamAutoModes = {
  revolution: false,
  rotation: false,
  spread: false,
  count: false,
  speed: false,
  reflections: false,
};

export const DEFAULT_BEAM_SETTINGS: BeamSettings = {
  shape: 'parabola',
  revolution: 0,
  rotation: 270,
  spread: 24,
  count: 120,
  speed: 2.4,
  width: 0.45,
  reflections: 8,
  alpha: 0.42,
  isParallelLight: false,
};

export function useBeamSettings() {
  const [beamSettings, setBeamSettings] = useState<BeamSettings>(DEFAULT_BEAM_SETTINGS);
  const [beamAutoModes, setBeamAutoModes] = useState<BeamAutoModes>(DEFAULT_BEAM_AUTO_MODES);
  const [beamResetToken, setBeamResetToken] = useState(0);

  const updateBeamSetting = <K extends keyof BeamSettings>(key: K, value: BeamSettings[K]) => {
    const autoKeyMap: Partial<Record<keyof BeamSettings, keyof BeamAutoModes>> = {
      revolution: 'revolution',
      rotation: 'rotation',
      spread: 'spread',
      count: 'count',
      speed: 'speed',
      reflections: 'reflections',
    };

    const autoKey = autoKeyMap[key];
    if (autoKey) {
      setBeamAutoModes((prev) => ({ ...prev, [autoKey]: false }));
    }

    setBeamSettings((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBeamAutoMode = (key: keyof BeamAutoModes) => {
    setBeamAutoModes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyBeamAutoMotion = (elapsedSeconds: number) => {
    setBeamSettings((prev) => {
      const next = { ...prev };

      if (beamAutoModes.revolution) next.revolution = Math.sin(elapsedSeconds * 0.4) * 180;
      if (beamAutoModes.rotation) next.rotation = ((Math.sin(elapsedSeconds * 0.8) + 1) / 2) * 360;
      if (beamAutoModes.spread) next.spread = 8 + ((Math.sin(elapsedSeconds * 0.7) + 1) / 2) * 72;
      if (beamAutoModes.count) next.count = Math.round(40 + ((Math.sin(elapsedSeconds * 0.9) + 1) / 2) * 240);
      if (beamAutoModes.speed) next.speed = 0.8 + ((Math.sin(elapsedSeconds * 0.6) + 1) / 2) * 3.4;
      if (beamAutoModes.reflections) next.reflections = Math.round(2 + ((Math.sin(elapsedSeconds * 0.5) + 1) / 2) * 10);

      return next;
    });
  };

  const resetBeamSettings = () => {
    setBeamSettings(DEFAULT_BEAM_SETTINGS);
    setBeamAutoModes(DEFAULT_BEAM_AUTO_MODES);
    setBeamResetToken((prev) => prev + 1);
  };

  const restartBeamSimulation = () => {
    setBeamResetToken((prev) => prev + 1);
  };

  return {
    beamSettings,
    beamAutoModes,
    beamResetToken,
    updateBeamSetting,
    toggleBeamAutoMode,
    applyBeamAutoMotion,
    resetBeamSettings,
    restartBeamSimulation,
  };
}
