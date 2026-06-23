// context/AuthContext.tsx

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { 
  getAuth,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, getDoc, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookMode } from "./BookModeContext";
interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

interface BookAccessInfo {
  bookId: string;
  bookName: string;
  accessLevel: "read" | "write";
  accessedViaPassword: string; // The password used to access this book
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithBookAccess: (email: string, bookPassword: string) => Promise<BookAccessInfo | null>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  currentBookAccess: BookAccessInfo | null;
  isBookRestricted: boolean;
  clearBookAccess: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBookAccess, setCurrentBookAccess] = useState<BookAccessInfo | null>(null);
  const [isBookRestricted, setIsBookRestricted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.data();
        
        setUser({
          id: firebaseUser.uid,
          username: userData?.username || firebaseUser.email?.split('@')[0] || '',
          displayName: userData?.displayName || firebaseUser.displayName || '',
          email: firebaseUser.email || '',
        });
        
        // Check if there's stored book access from previous session
        const storedBookAccess = await AsyncStorage.getItem('bookAccess');
        if (storedBookAccess) {
          const access = JSON.parse(storedBookAccess);
          setCurrentBookAccess(access);
          setIsBookRestricted(true);
        }
      } else {
        setUser(null);
        setCurrentBookAccess(null);
        setIsBookRestricted(false);
        await AsyncStorage.removeItem('bookAccess');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Regular login - sees ALL books they own or are member of
  const login = useCallback(async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    const userData = userDoc.data();
    
    setUser({
      id: firebaseUser.uid,
      username: userData?.username || email.split('@')[0],
      displayName: userData?.displayName || firebaseUser.displayName || '',
      email: firebaseUser.email || '',
    });
    
    // Clear any book-specific access
    setCurrentBookAccess(null);
    setIsBookRestricted(false);
    await AsyncStorage.removeItem('bookAccess');
  }, []);
const loginWithBookAccess = useCallback(async (email: string, bookPassword: string): Promise<BookAccessInfo | null> => {
  try {
    console.log("🔐 Attempting book access login for:", email);
    console.log("🔑 Book password:", bookPassword);
    
    // Find the user by email in Firestore
    const usersQuery = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const userSnapshot = await getDocs(usersQuery);
    
    if (userSnapshot.empty) {
      console.log("❌ User not found in Firestore");
      throw new Error("User not found. Please sign up first.");
    }
    
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    console.log("✅ User found:", userData.email);
    
    // Find the book with this password
    const booksQuery = query(collection(db, 'books'), where('accessPassword', '==', bookPassword));
    const bookSnapshot = await getDocs(booksQuery);
    
    if (bookSnapshot.empty) {
      console.log("❌ No book found with password:", bookPassword);
      throw new Error("Invalid book password. No book found with this password.");
    }
    
    const bookDoc = bookSnapshot.docs[0];
    const bookData = bookDoc.data();
    console.log("📖 Book found:", bookData.name);
    console.log("🔑 Password access level:", bookData.passwordAccessLevel);
    
    // Check if user has permission to access this book
    let hasPermission = false;
    let accessLevel: "read" | "write" = "read";
    
    // Check if user is the owner
    if (bookData.userId === userDoc.id) {
      hasPermission = true;
      accessLevel = "write";
      console.log("👑 User is owner - granting write access");
    } else {
      // Check if user is invited to this book
      const memberQuery = query(
        collection(db, 'bookMembers'),
        where('bookId', '==', bookDoc.id),
        where('email', '==', email.toLowerCase())
      );
      const memberSnapshot = await getDocs(memberQuery);
      
      if (!memberSnapshot.empty) {
        hasPermission = true;
        // Use the book's password access level
        accessLevel = bookData.passwordAccessLevel || bookData.defaultAccess || "read";
        console.log(`✅ User is invited. Access level: ${accessLevel}`);
      } else {
        console.log("❌ User is not invited to this book");
        throw new Error("You don't have permission to access this book. Please ask the owner to invite you.");
      }
    }
    
    if (!hasPermission) {
      throw new Error("Access denied. You are not authorized to view this book.");
    }
    
    // Create a session for this book access
    const bookAccess: BookAccessInfo = {
      bookId: bookDoc.id,
      bookName: bookData.name,
      accessLevel: accessLevel,
      accessedViaPassword: bookPassword,
    };
    
    // Set the user
    setUser({
      id: userDoc.id,
      username: userData.username || email.split('@')[0],
      displayName: userData.displayName || '',
      email: email.toLowerCase(),
    });
    
    setCurrentBookAccess(bookAccess);
    setIsBookRestricted(true);
    
    // Store book access for session persistence
    await AsyncStorage.setItem('bookAccess', JSON.stringify(bookAccess));
    
    console.log("✅ Book access login successful!");
    return bookAccess;
  } catch (error: any) {
    console.error("❌ Book access login error:", error);
    throw error;
  }
}, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Update profile
    await updateProfile(firebaseUser, { displayName });
    
    // Create user document in Firestore
    const username = email.split('@')[0];
    await setDoc(doc(db, 'users', firebaseUser.uid), {
      username,
      displayName,
      email,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    
    setUser({
      id: firebaseUser.uid,
      username,
      displayName,
      email,
    });
    
    // Clear any book access on new registration
    setCurrentBookAccess(null);
    setIsBookRestricted(false);
    await AsyncStorage.removeItem('bookAccess');
  }, []);

  const logout = useCallback(async () => {
  try {
    // Clear Firebase auth
    await signOut(auth);
    
    // Clear all user state
    setUser(null);
    setCurrentBookAccess(null);
    setIsBookRestricted(false);
    
    // Clear ALL relevant storage items
    await AsyncStorage.multiRemove([
      'bookAccess', 
      'bookMode', 
      'bookPassword', 
      'bookId',
      'user',
      'token'
    ]);
    
    console.log("✅ Logout successful - cleared all sessions");
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}, []);

  const clearBookAccess = useCallback(async () => {
    setCurrentBookAccess(null);
    setIsBookRestricted(false);
    await AsyncStorage.removeItem('bookAccess');
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      loginWithBookAccess,
      register, 
      logout,
      currentBookAccess,
      isBookRestricted,
      clearBookAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}