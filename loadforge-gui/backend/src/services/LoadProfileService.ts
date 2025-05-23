import { LoadProfile } from '../types/index.js';

export class LoadProfileService {
  /**
   * Create a spike load profile
   * Ramps up quickly to peak load, maintains briefly, then ramps down
   */
  static createSpikeProfile(
    peakRequestsPerSecond: number,
    spikeDuration: number = 60,
    rampUpDuration: number = 30,
    rampDownDuration: number = 30
  ): LoadProfile {
    const totalDuration = rampUpDuration + spikeDuration + rampDownDuration;
    
    return {
      type: 'spike',
      duration: totalDuration,
      rampUp: {
        duration: rampUpDuration,
        startRate: 1,
        endRate: peakRequestsPerSecond,
      },
      steadyState: {
        duration: spikeDuration,
        requestsPerSecond: peakRequestsPerSecond,
      },
      rampDown: {
        duration: rampDownDuration,
        startRate: peakRequestsPerSecond,
        endRate: 1,
      },
    };
  }

  /**
   * Create a step load profile
   * Gradually increases load in steps
   */
  static createStepProfile(
    maxRequestsPerSecond: number,
    stepDuration: number = 120,
    numberOfSteps: number = 5
  ): LoadProfile {
    const totalDuration = stepDuration * numberOfSteps;
    
    return {
      type: 'step',
      duration: totalDuration,
      steadyState: {
        duration: totalDuration,
        requestsPerSecond: maxRequestsPerSecond,
      },
    };
  }

  /**
   * Create a soak load profile
   * Maintains steady load for extended period to test stability
   */
  static createSoakProfile(
    requestsPerSecond: number,
    soakDuration: number = 1800, // 30 minutes
    rampUpDuration: number = 300, // 5 minutes
    rampDownDuration: number = 300 // 5 minutes
  ): LoadProfile {
    const totalDuration = rampUpDuration + soakDuration + rampDownDuration;
    
    return {
      type: 'soak',
      duration: totalDuration,
      rampUp: {
        duration: rampUpDuration,
        startRate: 1,
        endRate: requestsPerSecond,
      },
      steadyState: {
        duration: soakDuration,
        requestsPerSecond: requestsPerSecond,
      },
      rampDown: {
        duration: rampDownDuration,
        startRate: requestsPerSecond,
        endRate: 1,
      },
    };
  }

  /**
   * Create a custom load profile
   */
  static createCustomProfile(
    steadyStateRps: number,
    steadyStateDuration: number,
    rampUp?: { duration: number; startRate: number; endRate: number },
    rampDown?: { duration: number; startRate: number; endRate: number }
  ): LoadProfile {
    const totalDuration = 
      (rampUp?.duration || 0) + 
      steadyStateDuration + 
      (rampDown?.duration || 0);
    
    return {
      type: 'custom',
      duration: totalDuration,
      ...(rampUp && { rampUp }),
      steadyState: {
        duration: steadyStateDuration,
        requestsPerSecond: steadyStateRps,
      },
      ...(rampDown && { rampDown }),
    };
  }

  /**
   * Validate a load profile
   */
  static validateLoadProfile(profile: LoadProfile): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check total duration consistency
    const calculatedDuration = 
      (profile.rampUp?.duration || 0) +
      profile.steadyState.duration +
      (profile.rampDown?.duration || 0);

    if (Math.abs(calculatedDuration - profile.duration) > 1) {
      errors.push('Total duration must equal sum of phase durations');
    }

    // Check positive values
    if (profile.duration <= 0) {
      errors.push('Total duration must be positive');
    }

    if (profile.steadyState.duration <= 0) {
      errors.push('Steady state duration must be positive');
    }

    if (profile.steadyState.requestsPerSecond <= 0) {
      errors.push('Steady state requests per second must be positive');
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
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get load profile visualization data
   */
  static getVisualizationData(profile: LoadProfile): Array<{
    time: number;
    requestsPerSecond: number;
    phase: 'rampUp' | 'steadyState' | 'rampDown';
  }> {
    const data: Array<{
      time: number;
      requestsPerSecond: number;
      phase: 'rampUp' | 'steadyState' | 'rampDown';
    }> = [];

    let currentTime = 0;

    // Ramp-up phase
    if (profile.rampUp && profile.rampUp.duration > 0) {
      const steps = Math.min(profile.rampUp.duration, 20); // Max 20 data points
      const timeStep = profile.rampUp.duration / steps;
      const rateStep = (profile.rampUp.endRate - profile.rampUp.startRate) / steps;

      for (let i = 0; i <= steps; i++) {
        data.push({
          time: currentTime + (i * timeStep),
          requestsPerSecond: profile.rampUp.startRate + (i * rateStep),
          phase: 'rampUp',
        });
      }
      currentTime += profile.rampUp.duration;
    }

    // Steady state phase
    data.push({
      time: currentTime,
      requestsPerSecond: profile.steadyState.requestsPerSecond,
      phase: 'steadyState',
    });
    data.push({
      time: currentTime + profile.steadyState.duration,
      requestsPerSecond: profile.steadyState.requestsPerSecond,
      phase: 'steadyState',
    });
    currentTime += profile.steadyState.duration;

    // Ramp-down phase
    if (profile.rampDown && profile.rampDown.duration > 0) {
      const steps = Math.min(profile.rampDown.duration, 20); // Max 20 data points
      const timeStep = profile.rampDown.duration / steps;
      const rateStep = (profile.rampDown.endRate - profile.rampDown.startRate) / steps;

      for (let i = 0; i <= steps; i++) {
        data.push({
          time: currentTime + (i * timeStep),
          requestsPerSecond: profile.rampDown.startRate + (i * rateStep),
          phase: 'rampDown',
        });
      }
    }

    return data;
  }
} 