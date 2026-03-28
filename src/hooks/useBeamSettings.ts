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
  revolution: -148,
  rotation: 58,
  spread: 330,
  count: 1000,
  speed: 96.98612347264257,
  width: 2.1,
  reflections: 19,
  alpha: 1,
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
      if (beamAutoModes.rotation) next.rotation = Math.sin(elapsedSeconds * 0.8) * 180;
      if (beamAutoModes.spread) next.spread = 30 + ((Math.sin(elapsedSeconds * 0.7) + 1) / 2) * 330;
      if (beamAutoModes.count) next.count = Math.round(20 + ((Math.sin(elapsedSeconds * 0.9) + 1) / 2) * 980);
      if (beamAutoModes.speed) next.speed = 10 + ((Math.sin(elapsedSeconds * 0.6) + 1) / 2) * 90;
      if (beamAutoModes.reflections) next.reflections = Math.round(1 + ((Math.sin(elapsedSeconds * 0.5) + 1) / 2) * 19);

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
