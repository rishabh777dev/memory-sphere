import { useEffect, useRef, useCallback, useState } from 'react';
import { Hands, Results } from '@mediapipe/hands';

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement | null>, start: boolean = false) {
  const handsRef = useRef<Hands | null>(null);
  const [isCameraDenied, setIsCameraDenied] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Storage for the latest results that doesn't trigger re-renders
  const latestResults = useRef<Results | null>(null);

  const onResults = useCallback((res: Results) => {
    latestResults.current = res;
  }, []);

  useEffect(() => {
    if (!start) return;
    if (typeof window === 'undefined') return;
    // Note: we do NOT bail out on !videoRef.current here.
    // The video element is always mounted (just hidden), so by the time
    // startCamera's 200ms delay fires, the ref will be populated.
    
    let isMounted = true;
    let animationFrameId: number;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,           // support both one-hand rotate AND two-hand zoom
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults(onResults);
    handsRef.current = hands;

    const startCamera = async (attempt = 0) => {
      // Small delay so any previously released probe stream is fully freed by the browser
      await new Promise(r => setTimeout(r, 200 + attempt * 300));
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 }
        });
        
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            processFrame();
          };
        } else {
          // Ref still not ready — shouldn't happen, but stop stream cleanly
          stream.getTracks().forEach(track => track.stop());
          if (isMounted) setIsCameraDenied(true);
        }
      } catch (err) {
        console.error(`Camera start attempt ${attempt + 1} failed:`, err);
        if (!isMounted) return;
        if (attempt < 2) {
          // Retry up to 3 times — camera may still be releasing
          startCamera(attempt + 1);
        } else {
          setIsCameraDenied(true);
        }
      }
    };

    const processFrame = async () => {
      if (!isMounted) return;
      
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          await hands.send({ image: videoRef.current });
        } catch (e) {
          console.error('Hands process error', e);
        }
      }
      animationFrameId = requestAnimationFrame(processFrame);
    };

    startCamera();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationFrameId);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      hands.close();
    };
  }, [videoRef, onResults, start]);

  return { resultsRef: latestResults, isCameraDenied };
}
