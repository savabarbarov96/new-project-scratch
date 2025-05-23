import { LoadProfile } from '../types/index.js';

export interface LoadProfileTemplate {
  name: string;
  description: string;
  generate: (params: any) => LoadProfile;
}

/**
 * Spike Test Profile
 * Sudden increase in load to test system breaking point
 */
export const spikeProfile: LoadProfileTemplate = {
  name: 'Spike Test',
  description: 'Sudden spike in load to test system resilience',
  generate: (params: {
    baselineRps: number;
    spikeRps: number;
    totalDuration: number;
  }): LoadProfile => {
    const { baselineRps, spikeRps, totalDuration } = params;
    const rampUpDuration = 10; // Quick ramp up
    const rampDownDuration = 10; // Quick ramp down
    const steadyDuration = totalDuration - rampUpDuration - rampDownDuration;

    return {
      type: 'spike',
      duration: totalDuration,
      rampUp: {
        duration: rampUpDuration,
        startRate: baselineRps,
        endRate: spikeRps,
      },
      steadyState: {
        duration: steadyDuration,
        requestsPerSecond: spikeRps,
      },
      rampDown: {
        duration: rampDownDuration,
        startRate: spikeRps,
        endRate: baselineRps,
      },
    };
  },
};

/**
 * Step Test Profile
 * Gradual increase in load in steps
 */
export const stepProfile: LoadProfileTemplate = {
  name: 'Step Test',
  description: 'Gradual increase in load to find performance limits',
  generate: (params: {
    startRps: number;
    endRps: number;
    stepDuration: number;
    steps: number;
  }): LoadProfile => {
    const { startRps, endRps, stepDuration, steps } = params;
    const totalDuration = stepDuration * steps;

    // For simplicity, we'll use the final step as steady state
    return {
      type: 'step',
      duration: totalDuration,
      rampUp: {
        duration: totalDuration * 0.8, // 80% for ramping
        startRate: startRps,
        endRate: endRps,
      },
      steadyState: {
        duration: totalDuration * 0.2, // 20% at peak
        requestsPerSecond: endRps,
      },
    };
  },
};

/**
 * Soak Test Profile
 * Sustained load over extended period
 */
export const soakProfile: LoadProfileTemplate = {
  name: 'Soak Test',
  description: 'Sustained load over extended period to test stability',
  generate: (params: {
    targetRps: number;
    soakDuration: number;
    rampUpDuration?: number;
    rampDownDuration?: number;
  }): LoadProfile => {
    const { targetRps, soakDuration, rampUpDuration = 60, rampDownDuration = 60 } = params;
    const totalDuration = rampUpDuration + soakDuration + rampDownDuration;

    return {
      type: 'soak',
      duration: totalDuration,
      rampUp: {
        duration: rampUpDuration,
        startRate: 1,
        endRate: targetRps,
      },
      steadyState: {
        duration: soakDuration,
        requestsPerSecond: targetRps,
      },
      rampDown: {
        duration: rampDownDuration,
        startRate: targetRps,
        endRate: 1,
      },
    };
  },
};

/**
 * Custom Profile Builder
 */
export const customProfile: LoadProfileTemplate = {
  name: 'Custom Test',
  description: 'Custom load profile with user-defined parameters',
  generate: (params: {
    duration: number;
    rampUp?: { duration: number; startRate: number; endRate: number };
    steadyState: { duration: number; requestsPerSecond: number };
    rampDown?: { duration: number; startRate: number; endRate: number };
  }): LoadProfile => {
    return {
      type: 'custom',
      ...params,
    };
  },
};

/**
 * Get all available load profile templates
 */
export const getLoadProfileTemplates = (): LoadProfileTemplate[] => {
  return [spikeProfile, stepProfile, soakProfile, customProfile];
};

/**
 * Generate a load profile by template name
 */
export const generateLoadProfile = (templateName: string, params: any): LoadProfile => {
  const templates = getLoadProfileTemplates();
  const template = templates.find(t => t.name.toLowerCase().includes(templateName.toLowerCase()));
  
  if (!template) {
    throw new Error(`Load profile template '${templateName}' not found`);
  }

  return template.generate(params);
};

/**
 * Validate load profile configuration
 */
export const validateLoadProfile = (profile: LoadProfile): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check duration consistency
  const totalCalculated = 
    (profile.rampUp?.duration || 0) +
    profile.steadyState.duration +
    (profile.rampDown?.duration || 0);

  if (Math.abs(totalCalculated - profile.duration) > 1) {
    errors.push('Total duration must equal sum of phase durations');
  }

  // Check positive values
  if (profile.duration <= 0) {
    errors.push('Duration must be positive');
  }

  if (profile.steadyState.requestsPerSecond <= 0) {
    errors.push('Requests per second must be positive');
  }

  if (profile.steadyState.duration <= 0) {
    errors.push('Steady state duration must be positive');
  }

  // Check ramp-up phase
  if (profile.rampUp) {
    if (profile.rampUp.duration < 0) {
      errors.push('Ramp-up duration cannot be negative');
    }
    if (profile.rampUp.startRate < 0 || profile.rampUp.endRate < 0) {
      errors.push('Ramp-up rates cannot be negative');
    }
  }

  // Check ramp-down phase
  if (profile.rampDown) {
    if (profile.rampDown.duration < 0) {
      errors.push('Ramp-down duration cannot be negative');
    }
    if (profile.rampDown.startRate < 0 || profile.rampDown.endRate < 0) {
      errors.push('Ramp-down rates cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}; 