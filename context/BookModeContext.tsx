import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useSegments } from 'expo-router';

type BookModeContextType = {
  isBookMode: boolean;
  bookPassword: string | null;
  bookId: string | null;
  bookName: string | null;
  enterBookMode: (password: string, bookId: string, bookName?: string) => Promise<void>;
  exitBookMode: () => Promise<void>;
  clearBookMode: () => void;
};

const BookModeContext = createContext<BookModeContextType | undefined>(undefined);

export function BookModeProvider({ children }: { children: React.ReactNode }) {
  const [isBookMode, setIsBookMode] = useState(false);
  const [bookPassword, setBookPassword] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookName, setBookName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();

  // Load book mode state on app start
  useEffect(() => {
    loadBookModeState();
  }, []);

  // Monitor navigation to handle back button in book mode
  useEffect(() => {
    const inAuthScreen = segments[0] === 'auth';
    const inTabsScreen = segments[0] === '(tabs)';
    
    // If we're in book mode and somehow end up on auth screen, redirect to tabs
    if (isBookMode && inAuthScreen && !isLoading) {
      console.log("📖 Book mode active, redirecting from auth to tabs");
      router.replace('/(tabs)');
    }
  }, [segments, isBookMode, isLoading]);

  const loadBookModeState = async () => {
    try {
      const savedBookMode = await AsyncStorage.getItem('bookMode');
      const savedBookPassword = await AsyncStorage.getItem('bookPassword');
      const savedBookId = await AsyncStorage.getItem('bookId');
      const savedBookName = await AsyncStorage.getItem('bookName');
      
      if (savedBookMode === 'true' && savedBookPassword && savedBookId) {
        setIsBookMode(true);
        setBookPassword(savedBookPassword);
        setBookId(savedBookId);
        setBookName(savedBookName);
        console.log("📖 Book mode loaded from storage:", { bookId: savedBookId, bookName: savedBookName });
      }
    } catch (error) {
      console.error('Error loading book mode state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enterBookMode = useCallback(async (password: string, bookId: string, bookName?: string) => {
    try {
      await AsyncStorage.setItem('bookMode', 'true');
      await AsyncStorage.setItem('bookPassword', password);
      await AsyncStorage.setItem('bookId', bookId);
      if (bookName) {
        await AsyncStorage.setItem('bookName', bookName);
      }
      
      setIsBookMode(true);
      setBookPassword(password);
      setBookId(bookId);
      setBookName(bookName || null);
      
      console.log("📖 Entered book mode:", { bookId, bookName });
    } catch (error) {
      console.error('Error entering book mode:', error);
    }
  }, []);

  const exitBookMode = useCallback(async () => {
    try {
      // Clear all book mode related storage
      await AsyncStorage.multiRemove(['bookMode', 'bookPassword', 'bookId', 'bookName']);
      
      setIsBookMode(false);
      setBookPassword(null);
      setBookId(null);
      setBookName(null);
      
      console.log("📖 Exited book mode - returning to auth screen");
      
      // Navigate back to auth screen
      router.dismissAll();
      router.replace('/auth');
    } catch (error) {
      console.error('Error exiting book mode:', error);
    }
  }, []);

  const clearBookMode = useCallback(() => {
    setIsBookMode(false);
    setBookPassword(null);
    setBookId(null);
    setBookName(null);
  }, []);

  const value = {
    isBookMode,
    bookPassword,
    bookId,
    bookName,
    enterBookMode,
    exitBookMode,
    clearBookMode,
  };

  return (
    <BookModeContext.Provider value={value}>
      {children}
    </BookModeContext.Provider>
  );
}

export function useBookMode() {
  const context = useContext(BookModeContext);
  if (context === undefined) {
    throw new Error('useBookMode must be used within a BookModeProvider');
  }
  return context;
}