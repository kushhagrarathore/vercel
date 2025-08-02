import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase/client';

// Enhanced server time synchronization with multiple samples and median offset
async function getServerTimeOffset() {
  const samples = [];
  const numSamples = 3;
  
  for (let i = 0; i < numSamples; i++) {
    const start = Date.now();
    try {
      const { data, error } = await supabase.rpc('get_server_time');
      const end = Date.now();
      
      if (error) {
        console.error('[useServerTimer] Server time RPC error:', error);
        continue;
      }
      
      const roundTripTime = end - start;
      const serverTime = new Date(data).getTime();
      const estimatedOffset = serverTime - (start + roundTripTime / 2);
      
      samples.push(estimatedOffset);
    } catch (err) {
      console.error('[useServerTimer] Server time fetch error:', err);
    }
    
    // Small delay between samples
    if (i < numSamples - 1) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  if (samples.length === 0) {
    console.warn('[useServerTimer] No valid server time samples');
    return 0;
  }
  
  // Use median offset for better accuracy
  samples.sort((a, b) => a - b);
  const medianOffset = samples[Math.floor(samples.length / 2)];
  
  console.log('[useServerTimer] Server time offset calculated:', {
    samples,
    medianOffset,
    sampleCount: samples.length
  });
  
  return medianOffset;
}

export function useServerTimer(sessionId, timerEnd, isActive = true) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState(null);
  const [lastServerSync, setLastServerSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const intervalRef = useRef(null);
  const serverTimeOffsetRef = useRef(0);
  const lastTimerEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Enhanced sync function with drift detection
  const syncWithServer = useCallback(async (force = false) => {
    if (isSyncing && !force) return;
    
    setIsSyncing(true);
    try {
      const offset = await getServerTimeOffset();
      serverTimeOffsetRef.current = offset;
      setLastServerSync(new Date().toISOString());
      
      console.log('[useServerTimer] Server sync completed:', {
        offset,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('[useServerTimer] Server sync failed:', err);
      setError('Failed to sync with server time');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Update timer based on server time
  const updateTimer = useCallback(() => {
    if (!timerEnd || !isActive) {
      setTimeLeft(0);
      setIsExpired(false);
      return;
    }

    const now = Date.now() + serverTimeOffsetRef.current;
    const endTime = new Date(timerEnd).getTime();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    
    // Detect significant drift and re-sync if needed
    const expectedTimeLeft = Math.max(0, Math.floor((endTime - (Date.now() + serverTimeOffsetRef.current)) / 1000));
    if (Math.abs(remaining - expectedTimeLeft) > 2) {
      console.warn('[useServerTimer] Timer drift detected, re-syncing:', {
        remaining,
        expectedTimeLeft,
        drift: Math.abs(remaining - expectedTimeLeft)
      });
      syncWithServer(true);
    }

    setTimeLeft(remaining);
    setIsExpired(remaining <= 0);
    
    if (remaining <= 0) {
      console.log('[useServerTimer] Timer expired');
    }
  }, [timerEnd, isActive, syncWithServer]);

  // Initial sync and timer setup
  useEffect(() => {
    if (!sessionId || !isActive) return;

    console.log('[useServerTimer] Initializing timer for session:', sessionId);
    
    // Initial server sync
    syncWithServer();
    
    // Set up timer interval
    intervalRef.current = setInterval(updateTimer, 1000);
    
    // Set up real-time subscription for timer updates
    subscriptionRef.current = supabase
      .channel(`timer-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'lq_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        const newTimerEnd = payload.new?.timer_end;
        if (newTimerEnd && newTimerEnd !== lastTimerEndRef.current) {
          console.log('[useServerTimer] Timer update received via subscription:', {
            oldTimerEnd: lastTimerEndRef.current,
            newTimerEnd,
            sessionId
          });
          lastTimerEndRef.current = newTimerEnd;
          // Trigger immediate sync and update
          syncWithServer(true);
          updateTimer();
        }
      })
      .subscribe();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [sessionId, isActive, syncWithServer, updateTimer]);

  // Periodic re-sync every 15 seconds
  useEffect(() => {
    if (!isActive) return;
    
    const syncInterval = setInterval(() => {
      syncWithServer();
    }, 15000);
    
    return () => clearInterval(syncInterval);
  }, [isActive, syncWithServer]);

  // Update timer when timerEnd changes
  useEffect(() => {
    if (timerEnd !== lastTimerEndRef.current) {
      console.log('[useServerTimer] Timer end changed:', {
        old: lastTimerEndRef.current,
        new: timerEnd
      });
      lastTimerEndRef.current = timerEnd;
      updateTimer();
    }
  }, [timerEnd, updateTimer]);

  return {
    timeLeft,
    isExpired,
    error,
    lastServerSync,
    isSyncing,
    syncWithServer
  };
}

export function useAdminTimer(sessionId) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  
  const intervalRef = useRef(null);
  const serverTimeOffsetRef = useRef(0);

  // Get server time offset
  const getServerTimeOffset = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_server_time');
      if (error) throw error;
      
      const serverTime = new Date(data).getTime();
      const clientTime = Date.now();
      const offset = serverTime - clientTime;
      
      serverTimeOffsetRef.current = offset;
      return offset;
    } catch (err) {
      console.error('[useAdminTimer] Failed to get server time:', err);
      return 0;
    }
  }, []);

  // Start timer with server-based calculation
  const startTimer = useCallback(async (duration = 20) => {
    if (isStarting) return null;
    
    setIsStarting(true);
    try {
      // Get current server time to ensure accurate timer start
      const offset = await getServerTimeOffset();
      const serverNow = Date.now() + offset;
      const timerEnd = new Date(serverNow + (duration * 1000)).toISOString();
      
      console.log('[useAdminTimer] Starting timer with server time:', {
        duration,
        serverNow: new Date(serverNow).toISOString(),
        timerEnd,
        offset
      });
      
      // Update session with timer end
      const { error } = await supabase
        .from('lq_sessions')
        .update({ 
          timer_end: timerEnd,
          phase: 'question',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setIsTimerActive(true);
      setError(null);
      
      return timerEnd;
    } catch (err) {
      console.error('[useAdminTimer] Failed to start timer:', err);
      setError('Failed to start timer');
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [sessionId, isStarting, getServerTimeOffset]);

  // Stop timer
  const stopTimer = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('lq_sessions')
        .update({ 
          timer_end: null,
          phase: 'times_up',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setIsTimerActive(false);
      setTimeLeft(0);
      setIsExpired(true);
      
      console.log('[useAdminTimer] Timer stopped');
    } catch (err) {
      console.error('[useAdminTimer] Failed to stop timer:', err);
      setError('Failed to stop timer');
    }
  }, [sessionId]);

  // Reset timer
  const resetTimer = useCallback(() => {
    setIsTimerActive(false);
    setTimeLeft(0);
    setIsExpired(false);
    setError(null);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    console.log('[useAdminTimer] Timer reset');
  }, []);

  // Update timer display
  const updateTimer = useCallback(() => {
    if (!isTimerActive) return;
    
    const now = Date.now() + serverTimeOffsetRef.current;
    const endTime = new Date().getTime() + (timeLeft * 1000);
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    
    setTimeLeft(remaining);
    setIsExpired(remaining <= 0);
  }, [isTimerActive, timeLeft]);

  // Timer interval
  useEffect(() => {
    if (isTimerActive) {
      intervalRef.current = setInterval(updateTimer, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isTimerActive, updateTimer]);

  return {
    timeLeft,
    isExpired,
    isTimerActive,
    error,
    isStarting,
    startTimer,
    stopTimer,
    resetTimer
  };
} 