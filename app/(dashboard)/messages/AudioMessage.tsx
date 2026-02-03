'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AudioMessageProps {
  url: string;
  duration: number;
  isOwn: boolean;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioMessage({ url, duration, isOwn }: AudioMessageProps) {
  const [state, setState] = useState<'idle' | 'downloading' | 'ready' | 'playing' | 'paused'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [playProgress, setPlayProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const updatePlayProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      const dur = audio.duration || duration;
      setCurrentTime(audio.currentTime);
      setPlayProgress(dur > 0 ? audio.currentTime / dur : 0);
      animFrameRef.current = requestAnimationFrame(updatePlayProgress);
    }
  }, [duration]);

  const downloadAudio = useCallback(async () => {
    setState('downloading');
    setDownloadProgress(0);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength) : 0;
      const reader = response.body?.getReader();

      if (!reader) throw new Error('No reader');

      const chunks: Uint8Array[] = [];
      let loaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
          setDownloadProgress(loaded / total);
        } else {
          // Unknown size — fake progress based on expected size (~8KB/s * duration)
          const expectedSize = Math.max(duration * 8000, 50000);
          setDownloadProgress(Math.min(loaded / expectedSize, 0.95));
        }
      }

      const blob = new Blob(chunks, { type: 'audio/webm' });
      const blobUrl = URL.createObjectURL(blob);
      blobUrlRef.current = blobUrl;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;

      audio.addEventListener('ended', () => {
        setState('ready');
        setPlayProgress(0);
        setCurrentTime(0);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      });

      // Wait for audio to be loaded
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => resolve(), { once: true });
        audio.addEventListener('error', () => reject(new Error('Audio load error')), { once: true });
      });

      setDownloadProgress(1);
      setState('ready');
    } catch (err) {
      console.error('Audio download error:', err);
      setState('idle');
      setDownloadProgress(0);
    }
  }, [url, duration]);

  const handlePlayPause = useCallback(async () => {
    if (state === 'idle') {
      await downloadAudio();
      // Auto-play after download
      if (audioRef.current) {
        await audioRef.current.play();
        setState('playing');
        animFrameRef.current = requestAnimationFrame(updatePlayProgress);
      }
    } else if (state === 'ready' || state === 'paused') {
      if (audioRef.current) {
        await audioRef.current.play();
        setState('playing');
        animFrameRef.current = requestAnimationFrame(updatePlayProgress);
      }
    } else if (state === 'playing') {
      if (audioRef.current) {
        audioRef.current.pause();
        setState('paused');
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      }
    }
  }, [state, downloadAudio, updatePlayProgress]);

  // Seek on progress bar click
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || state === 'idle' || state === 'downloading') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = audioRef.current.duration || duration;
    audioRef.current.currentTime = ratio * dur;
    setPlayProgress(ratio);
    setCurrentTime(ratio * dur);
  }, [state, duration]);

  const displayTime = state === 'playing' || state === 'paused'
    ? formatDuration(currentTime)
    : formatDuration(duration);

  // Circle progress for download
  const circleRadius = 16;
  const circumference = 2 * Math.PI * circleRadius;

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      {/* Play / Download button */}
      <button
        onClick={handlePlayPause}
        disabled={state === 'downloading'}
        className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn
            ? 'bg-white/20 hover:bg-white/30'
            : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
        }`}
      >
        {state === 'downloading' ? (
          /* Circular progress indicator */
          <svg className="w-10 h-10 absolute inset-0 -rotate-90" viewBox="0 0 40 40">
            <circle
              cx="20" cy="20" r={circleRadius}
              fill="none"
              stroke={isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(156,163,175,0.3)'}
              strokeWidth="2.5"
            />
            <circle
              cx="20" cy="20" r={circleRadius}
              fill="none"
              stroke={isOwn ? '#ffffff' : '#3b82f6'}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - downloadProgress)}
              strokeLinecap="round"
              className="transition-all duration-150"
            />
          </svg>
        ) : state === 'playing' ? (
          /* Pause icon */
          <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          /* Play icon */
          <svg className={`w-5 h-5 ml-0.5 ${isOwn ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform / Progress bar */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="relative h-6 cursor-pointer flex items-center"
          onClick={handleSeek}
        >
          {/* Background bars (fake waveform) */}
          <div className="w-full flex items-center gap-[2px] h-full">
            {Array.from({ length: 32 }).map((_, i) => {
              const heights = [40, 65, 50, 80, 35, 70, 55, 90, 45, 60, 75, 85, 50, 65, 40, 95, 55, 70, 45, 80, 60, 50, 75, 85, 40, 65, 55, 90, 50, 70, 60, 45];
              const h = heights[i % heights.length];
              const progress = state === 'downloading' ? downloadProgress : playProgress;
              const filled = i / 32 < progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-100 ${
                    filled
                      ? isOwn ? 'bg-white' : 'bg-blue-600 dark:bg-blue-400'
                      : isOwn ? 'bg-white/30' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <span className={`text-[11px] ${isOwn ? 'text-white/60' : 'text-gray-400 dark:text-gray-500'}`}>
          {displayTime}
        </span>
      </div>
    </div>
  );
}
