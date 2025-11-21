import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceCommand } from './useVoiceCommand';

// Mock Web Speech API
const mockRecognition = {
  continuous: false,
  interimResults: false,
  lang: 'uz-UZ',
  start: vi.fn(),
  stop: vi.fn(),
  onstart: null as any,
  onresult: null as any,
  onerror: null as any,
  onend: null as any,
};

describe('useVoiceCommand', () => {
  beforeEach(() => {
    // Mock SpeechRecognition
    (window as any).SpeechRecognition = vi.fn(() => mockRecognition);
    (window as any).webkitSpeechRecognition = vi.fn(() => mockRecognition);
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('should set error if SpeechRecognition is not supported', () => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    expect(result.current.error).toContain('not supported');
  });

  it('should start listening when startListening is called', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    act(() => {
      result.current.startListening();
    });

    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('should stop listening when stopListening is called', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    act(() => {
      result.current.startListening();
    });

    // Simulate onstart to set isListening to true
    act(() => {
      if (mockRecognition.onstart) {
        mockRecognition.onstart();
      }
    });

    act(() => {
      result.current.stopListening();
    });

    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it('should parse ON command and call onCommand', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    act(() => {
      result.current.startListening();
    });

    // Simulate recognition result - "yoq" without "motor" to avoid motor detection
    act(() => {
      if (mockRecognition.onresult) {
        mockRecognition.onresult({
          results: [[{ transcript: 'yoq' }]],
        } as any);
      }
    });

    expect(onCommand).toHaveBeenCalledWith({ action: 'ON', motor: undefined });
  });

  it('should parse OFF command and call onCommand', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    act(() => {
      result.current.startListening();
    });

    // Simulate recognition result - use "stop" which is in offCommands and doesn't conflict
    act(() => {
      if (mockRecognition.onresult) {
        mockRecognition.onresult({
          results: [[{ transcript: 'stop' }]],
        } as any);
      }
    });

    expect(onCommand).toHaveBeenCalledWith({ action: 'OFF', motor: undefined });
  });

  it('should parse motor1 command', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    act(() => {
      result.current.startListening();
    });

    // Simulate recognition result - use "MOTOR 1" which is explicitly checked
    act(() => {
      if (mockRecognition.onresult) {
        mockRecognition.onresult({
          results: [[{ transcript: 'motor 1 yoq' }]],
        } as any);
      }
    });

    expect(onCommand).toHaveBeenCalledWith({ action: 'ON', motor: 'motor1' });
  });

  it('should clear transcript when clearTranscript is called', () => {
    const onCommand = vi.fn();
    const { result } = renderHook(() => useVoiceCommand(onCommand, 'uz'));

    act(() => {
      result.current.startListening();
    });

    // Simulate recognition result
    act(() => {
      if (mockRecognition.onresult) {
        mockRecognition.onresult({
          results: [[{ transcript: 'test' }]],
        } as any);
      }
    });

    expect(result.current.transcript).toBe('test');

    act(() => {
      result.current.clearTranscript();
    });

    expect(result.current.transcript).toBe('');
  });
});

