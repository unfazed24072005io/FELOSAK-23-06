import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/config/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TransactionType = "income" | "expense";

// In AppContext.tsx
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
  paymentMode: string;
  attachment: string;
  createdAt: number;
  userId: string;
  bookId?: string | null;
  goalId?: string | null; // ✅ Make sure this exists
}

export interface Debt {
  id: string;
  direction: "owed_to_me" | "i_owe";
  name: string;
  amount: number;
  note: string;
  phone: string;
  dueDate: string;
  settled: boolean;
  createdAt: number;
  userId: string;
  bookId: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  createdAt: number;
  userId: string;
  bookId: string;
}

export interface CashBook {
  id: string;
  name: string;
  description: string;
  isCloud: boolean;
  role: string;
  createdAt: number;
  userId: string;
  color?: string;
  icon?: string;
  accessPassword?: string;
  passwordProtected?: boolean;
  defaultAccess?: "read" | "write";
  passwordAccessLevel?: "read" | "write";
}

export interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: "draft" | "unpaid" | "paid" | "overdue";
  dueDate: string;
  invoiceDate: string;
  items: InvoiceItem[];
  notes: string;
  createdAt: number;
  userId: string;
  bookId: string;
}

// NEW: Document types for AI generation
export type DocumentType = "Invoice" | "Quote" | "PO" | "Credit Note" | "Purchase Order" | "Delivery Note";

export interface Document {
  id: string;
  number: string;
  type: DocumentType;
  partyName: string;
  amount: number;
  date: string;
  status: "draft" | "sent" | "paid" | "overdue";
  items?: Array<{ name: string; quantity: number; price: number; total: number }>;
  dueDate?: string;
  notes?: string;
  createdAt: number;
  userId: string;
  bookId: string;
}

interface AppContextValue {
  books: CashBook[];
  activeBook: CashBook | null;
  setActiveBook: (book: CashBook | null) => void;
  createBook: (name: string, description: string, isCloud: boolean, icon?: string, accessPassword?: string, defaultAccess?: "read" | "write") => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  updateBook: (id: string, data: { name?: string; description?: string; icon?: string; accessPassword?: string; passwordProtected?: boolean }) => Promise<void>;
  transactions: Transaction[];
  debts: Debt[];
  totalBalanceAllBooks: number;
  totalIncomeAllBooks: number;
  totalExpenseAllBooks: number;
  products: Product[];
  pin: string | null;
  invoices: Invoice[];
  documents: Document[];
  addInvoice: (invoice: Omit<Invoice, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  addDocument: (document: Omit<Document, "id" | "createdAt" | "userId" | "bookId">) => Promise<Document>;
  updateDocument: (id: string, document: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  fetchDocuments: (bookId: string) => Promise<void>;
  isLocked: boolean;
  addTransaction: (t: Omit<Transaction, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addDebt: (d: Omit<Debt, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateDebt: (id: string, d: Partial<Debt>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  addProduct: (p: Omit<Product, "id" | "createdAt" | "userId" | "bookId">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  setPin: (pin: string | null) => Promise<void>;
  unlock: (pin: string) => boolean;
  lock: () => void;
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  refreshBooks: () => Promise<void>;
  isLoadingBooks: boolean;
  // NEW: Book password functions
  setBookPassword: (bookId: string, password: string, accessLevel?: "read" | "write") => Promise<void>;
  removeBookPassword: (bookId: string) => Promise<void>;
  verifyBookPassword: (bookId: string, password: string) => Promise<{ valid: boolean; accessLevel?: string }>;
}

const AppContext = createContext<AppContextValue | null>(null);

// Storage keys for local-only data
const PIN_KEY = "misr_pin";
const LAST_ACTIVE_BOOK_KEY = "lastActiveBookId";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<CashBook[]>([]);
  const [activeBook, setActiveBookState] = useState<CashBook | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pin, setPinState] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [totalBalanceAllBooks, setTotalBalanceAllBooks] = useState(0);
  const [totalIncomeAllBooks, setTotalIncomeAllBooks] = useState(0);
  const [totalExpenseAllBooks, setTotalExpenseAllBooks] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // NEW: Documents state for AI-generated documents
  const [documents, setDocuments] = useState<Document[]>([]);

  // Load PIN from AsyncStorage
  useEffect(() => {
    (async () => {
      try {
        const pinRaw = await AsyncStorage.getItem(PIN_KEY);
        if (pinRaw) {
          setPinState(pinRaw);
          setIsLocked(true);
        }
      } catch (e) {
        console.error("Failed to load PIN", e);
      }
    })();
  }, []);

  const calculateAllBooksTotals = useCallback(async () => {
    const userId = user?.id;
    
    if (!userId) {
      console.log("No user ID, skipping totals calculation");
      return { totalBalance: 0, totalIncome: 0, totalExpense: 0 };
    }
    
    try {
      console.log("Calculating totals for user:", userId);
      
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      
      let totalIncome = 0;
      let totalExpense = 0;
      
      transactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.type === 'income') {
          totalIncome += data.amount || 0;
        } else if (data.type === 'expense') {
          totalExpense += data.amount || 0;
        }
      });
      
      console.log("Totals calculated - Income:", totalIncome, "Expense:", totalExpense, "Balance:", totalIncome - totalExpense);
      
      return {
        totalBalance: totalIncome - totalExpense,
        totalIncome: totalIncome,
        totalExpense: totalExpense
      };
    } catch (error) {
      console.error("Failed to calculate all books totals:", error);
      return { totalBalance: 0, totalIncome: 0, totalExpense: 0 };
    }
  }, [user]);

  const [allBooksTotals, setAllBooksTotals] = useState({ totalBalance: 0, totalIncome: 0, totalExpense: 0 });
  
  useEffect(() => {
    if (user) {
      calculateAllBooksTotals().then(setAllBooksTotals);
    }
  }, [user, transactions]);

  useEffect(() => {
    calculateAllBooksTotals();
  }, [user, books]);

  // NEW: Set book password with access level
const setBookPassword = useCallback(async (bookId: string, password: string, accessLevel: "read" | "write" = "read") => {
  if (!user) throw new Error("User not authenticated");
  
  const bookRef = doc(db, 'books', bookId);
  await updateDoc(bookRef, {
    accessPassword: password,
    passwordProtected: true,
    passwordAccessLevel: accessLevel,
    passwordSetAt: Timestamp.now(),
    passwordSetBy: user.id,
  });
  
  setBooks(prev => prev.map(b => 
    b.id === bookId 
      ? { ...b, accessPassword: password, passwordProtected: true, defaultAccess: accessLevel }
      : b
  ));
  
  if (activeBook?.id === bookId) {
    setActiveBookState(prev => prev ? { ...prev, accessPassword: password, passwordProtected: true, defaultAccess: accessLevel } : prev);
  }
}, [user, activeBook]);

  // NEW: Remove book password
  const removeBookPassword = useCallback(async (bookId: string) => {
    if (!user) throw new Error("User not authenticated");
    
    const bookRef = doc(db, 'books', bookId);
    await updateDoc(bookRef, {
      accessPassword: null,
      passwordProtected: false,
    });
    
    setBooks(prev => prev.map(b => 
      b.id === bookId 
        ? { ...b, accessPassword: undefined, passwordProtected: false }
        : b
    ));
    
    if (activeBook?.id === bookId) {
      setActiveBookState(prev => prev ? { ...prev, accessPassword: undefined, passwordProtected: false } : prev);
    }
  }, [user, activeBook]);

  // NEW: Verify book password for access
const verifyBookPassword = useCallback(async (bookId: string, password: string) => {
  try {
    const bookRef = doc(db, 'books', bookId);
    const bookSnap = await getDoc(bookRef);
    
    if (!bookSnap.exists()) {
      return { valid: false };
    }
    
    const bookData = bookSnap.data();
    
    // Check if password matches
    if (bookData.accessPassword === password) {
      // Get the access level from the book's password settings
      let accessLevel = bookData.passwordAccessLevel || "read";
      
      // Owner always gets write access
      if (bookData.userId === user?.id) {
        accessLevel = "write";
      }
      
      return { valid: true, accessLevel };
    }
    
    return { valid: false };
  } catch (error) {
    console.error("Error verifying book password:", error);
    return { valid: false };
  }
}, [user]);

  const loadBookData = useCallback(async (book: CashBook) => {
    const userId = user?.id;
    
    if (!userId) {
      console.log("No user yet, waiting...");
      return;
    }

    console.log("Loading data for book:", book.id, "User:", userId);

    try {
      setTransactions([]);
      setDebts([]);
      setProducts([]);
      setInvoices([]);
      setDocuments([]);

      // Load Transactions
      const txQuery = query(
        collection(db, 'transactions'),
        where('bookId', '==', book.id),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const txSnapshot = await getDocs(txQuery);
      console.log("Transactions found:", txSnapshot.size);
      
      const loadedTransactions: Transaction[] = txSnapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
        amount: doc.data().amount,
        category: doc.data().category,
        note: doc.data().note || "",
        date: doc.data().date,
        paymentMode: doc.data().paymentMode || "cash",
        attachment: doc.data().attachment || "",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setTransactions(loadedTransactions);

      // Load Debts
      const debtQuery = query(
        collection(db, 'debtors'),
        where('bookId', '==', book.id),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const debtSnapshot = await getDocs(debtQuery);
      const loadedDebts: Debt[] = debtSnapshot.docs.map(doc => ({
        id: doc.id,
        direction: doc.data().direction,
        name: doc.data().name,
        amount: doc.data().amount,
        note: doc.data().note || "",
        phone: doc.data().phone || "",
        dueDate: doc.data().dueDate || "",
        settled: doc.data().settled || false,
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setDebts(loadedDebts);

      // Load Products
      const prodQuery = query(
        collection(db, 'products'),
        where('bookId', '==', book.id),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const prodSnapshot = await getDocs(prodQuery);
      const loadedProducts: Product[] = prodSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description || "",
        price: doc.data().price,
        image: doc.data().image || "",
        category: doc.data().category || "",
        inStock: doc.data().inStock !== false,
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setProducts(loadedProducts);

      // Load Invoices
      const invoiceQuery = query(
        collection(db, 'invoices'),
        where('bookId', '==', book.id),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const invoiceSnapshot = await getDocs(invoiceQuery);
      const loadedInvoices: Invoice[] = invoiceSnapshot.docs.map(doc => ({
        id: doc.id,
        number: doc.data().number,
        customerId: doc.data().customerId,
        customerName: doc.data().customerName,
        amount: doc.data().amount,
        status: doc.data().status,
        dueDate: doc.data().dueDate,
        invoiceDate: doc.data().invoiceDate,
        items: doc.data().items || [],
        notes: doc.data().notes || "",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setInvoices(loadedInvoices);

      // Load Documents
      const docQuery = query(
        collection(db, 'documents'),
        where('bookId', '==', book.id),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const docSnapshot = await getDocs(docQuery);
      const loadedDocuments: Document[] = docSnapshot.docs.map(doc => ({
        id: doc.id,
        number: doc.data().number,
        type: doc.data().type,
        partyName: doc.data().partyName,
        amount: doc.data().amount,
        date: doc.data().date,
        status: doc.data().status,
        items: doc.data().items || [],
        dueDate: doc.data().dueDate,
        notes: doc.data().notes || "",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setDocuments(loadedDocuments);
      console.log("Documents found:", loadedDocuments.length);

    } catch (error) {
      console.error("Failed to load book data:", error);
    }
  }, [user]);

  const addInvoice = useCallback(async (invoice: Omit<Invoice, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user || !activeBook) throw new Error("No active book or user");
    
    const newInvoice = {
      ...invoice,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'invoices'), newInvoice);
    const createdInvoice: Invoice = {
      ...invoice,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setInvoices(prev => [createdInvoice, ...prev]);
  }, [user, activeBook]);

  const updateInvoice = useCallback(async (id: string, invoice: Partial<Invoice>) => {
    if (!user) return;
    
    console.log("Updating invoice:", id, invoice);
    
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, ...invoice } : inv));
    
    try {
      const invoiceRef = doc(db, 'invoices', id);
      await updateDoc(invoiceRef, invoice);
      console.log("Firestore update successful");
    } catch (error) {
      console.error("Failed to update invoice in Firestore:", error);
    }
  }, [user]);

  const deleteInvoice = useCallback(async (id: string) => {
    if (!user) return;
    
    const invoiceRef = doc(db, 'invoices', id);
    await deleteDoc(invoiceRef);
    
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  }, [user]);

  // NEW: Document CRUD operations
// In AppContext.tsx, replace the addDocument function with this:

const addDocument = useCallback(async (document: Omit<Document, "id" | "createdAt" | "userId" | "bookId">) => {
  if (!user) throw new Error("No user logged in");
  
  // Use provided bookId or default to empty string
  const bookId = document.bookId || "";
  
  const newDocument = {
    ...document,
    userId: user.id,
    bookId: bookId,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'documents'), newDocument);
  const createdDocument: Document = {
    ...document,
    id: docRef.id,
    createdAt: Date.now(),
    userId: user.id,
    bookId: bookId,
  };
  
  setDocuments(prev => [createdDocument, ...prev]);
  return createdDocument;
}, [user]);

  const updateDocument = useCallback(async (id: string, documentData: Partial<Document>) => {
    if (!user) return;
    
    try {
      const docRef = doc(db, 'documents', id);
      await updateDoc(docRef, documentData);
      
      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, ...documentData } : doc
      ));
    } catch (error) {
      console.error("Failed to update document:", error);
    }
  }, [user]);

  const deleteDocument = useCallback(async (id: string) => {
    if (!user) return;
    
    const docRef = doc(db, 'documents', id);
    await deleteDoc(docRef);
    
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  }, [user]);

  const fetchDocuments = useCallback(async (bookId: string) => {
    if (!user) return;
    
    try {
      const docQuery = query(
        collection(db, 'documents'),
        where('bookId', '==', bookId),
        where('userId', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(docQuery);
      const loadedDocs: Document[] = snapshot.docs.map(doc => ({
        id: doc.id,
        number: doc.data().number,
        type: doc.data().type,
        partyName: doc.data().partyName,
        amount: doc.data().amount,
        date: doc.data().date,
        status: doc.data().status,
        items: doc.data().items || [],
        dueDate: doc.data().dueDate,
        notes: doc.data().notes || "",
        createdAt: doc.data().createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: doc.data().userId,
        bookId: doc.data().bookId,
      }));
      setDocuments(loadedDocs);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  }, [user]);

  const setActiveBook = useCallback((book: CashBook | null) => {
    console.log("Setting active book:", book?.id, book?.name);
    setActiveBookState(book);
    
    if (book) {
      AsyncStorage.setItem(LAST_ACTIVE_BOOK_KEY, book.id);
      loadBookData(book);
    } else {
      AsyncStorage.removeItem(LAST_ACTIVE_BOOK_KEY);
      setTransactions([]);
      setDebts([]);
      setProducts([]);
      setInvoices([]);
      setDocuments([]);
    }
  }, [loadBookData]);

  const loadBooks = useCallback(async () => {
  const userId = user?.id;
  
  console.log("📚 loadBooks called, user:", userId);
  
  if (!userId) {
    console.log("No user found, skipping book load");
    setIsLoadingBooks(false);
    setBooks([]);
    return;
  }
  
  setIsLoadingBooks(true);
  try {
    console.log("📚 Loading books for user:", userId);
    
    const loadedBooks: CashBook[] = [];
    
    // 1. Load books the user OWNS
    const ownedBooksQuery = query(
      collection(db, 'books'),
      where('userId', '==', userId)
    );
    const ownedBooksSnapshot = await getDocs(ownedBooksQuery);
    console.log("Found", ownedBooksSnapshot.size, "owned books");
    
    ownedBooksSnapshot.forEach(doc => {
      const bookData = doc.data();
      console.log("📖 Book data from Firestore:", doc.id, bookData);
      
      loadedBooks.push({
        id: doc.id,
        name: bookData.name || "Unnamed Book",
        description: bookData.description || "",
        isCloud: true,
        role: "owner",
        createdAt: bookData.createdAt?.toDate?.()?.getTime() || Date.now(),
        userId: bookData.userId,
        color: bookData.color,
        icon: bookData.icon,
        accessPassword: bookData.accessPassword,
        passwordProtected: bookData.passwordProtected || false,
        passwordAccessLevel: bookData.passwordAccessLevel || "read",
        type: bookData.type || "personal", // ✅ READ TYPE
        category: bookData.category || "assets", // ✅ READ CATEGORY
      });
    });
    
    // 2. Load shared books
    const userBooksQuery = query(
      collection(db, 'userBooks'),
      where('userId', '==', userId)
    );
    const userBooksSnapshot = await getDocs(userBooksQuery);
    console.log("Found", userBooksSnapshot.size, "shared book entries");
    
    for (const ubDoc of userBooksSnapshot.docs) {
      const userBookData = ubDoc.data();
      const bookId = userBookData.bookId;
      
      if (!bookId) continue;
      
      const bookRef = doc(db, 'books', bookId);
      const bookSnap = await getDoc(bookRef);
      
      if (bookSnap.exists()) {
        const bookData = bookSnap.data();
        if (!loadedBooks.some(b => b.id === bookSnap.id)) {
          loadedBooks.push({
            id: bookSnap.id,
            name: bookData.name || "Unnamed Book",
            description: bookData.description || "",
            isCloud: true,
            role: userBookData.role || "viewer",
            createdAt: bookData.createdAt?.toDate?.()?.getTime() || Date.now(),
            userId: bookData.userId,
            color: bookData.color,
            icon: bookData.icon,
            accessPassword: bookData.accessPassword,
            passwordProtected: bookData.passwordProtected || false,
            type: bookData.type || "personal", // ✅ READ TYPE
            category: bookData.category || "assets", // ✅ READ CATEGORY
          });
          console.log("✅ Loaded shared book:", bookData.name);
        }
      }
    }
    
    console.log("Total books loaded:", loadedBooks.length);
    console.log("📚 Loaded books with types:", loadedBooks.map(b => ({ name: b.name, type: b.type, category: b.category })));
    setBooks(loadedBooks);
    
    // Only set active book if there's a last active book saved
    const lastActiveBookId = await AsyncStorage.getItem(LAST_ACTIVE_BOOK_KEY);
    if (lastActiveBookId) {
      const bookToActivate = loadedBooks.find(b => b.id === lastActiveBookId);
      if (bookToActivate) {
        console.log("Activating book:", bookToActivate.name);
        setActiveBook(bookToActivate);
      }
    }
    // Don't auto-activate the first book - let user choose
    
  } catch (error) {
    console.error("Failed to load books:", error);
  } finally {
    setIsLoadingBooks(false);
  }
}, [user, setActiveBook]);

  useEffect(() => {
    if (user && activeBook) {
      console.log("User became available, reloading data for active book");
      loadBookData(activeBook);
    }
  }, [user, activeBook, loadBookData]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

const createBook = useCallback(async (name: string, description: string, isCloud: boolean, icon?: string, accessPassword?: string, defaultAccess?: "read" | "write") => {
  if (!user) {
    console.error("Cannot create book: User not authenticated");
    throw new Error("You must be logged in to create a book");
  }
  
  const newBook: Omit<CashBook, "id"> = {
    name,
    description,
    isCloud: true,
    role: "owner",
    createdAt: Date.now(),
    userId: user.id,
    color: "#" + Math.floor(Math.random()*16777215).toString(16),
    icon: icon || "📒",
    accessPassword: accessPassword,
    passwordProtected: !!accessPassword,
    defaultAccess: defaultAccess || "read",
  };

  const docRef = await addDoc(collection(db, 'books'), {
    ...newBook,
    createdAt: Timestamp.now(),
    accessPassword: accessPassword || null,
    passwordProtected: !!accessPassword,
    passwordAccessLevel: defaultAccess || "read",
  });
  
  const createdBook = { ...newBook, id: docRef.id };
  setBooks(prev => [createdBook, ...prev]);
  
  // REMOVE THIS LINE - Don't auto-activate
  // setActiveBook(createdBook);
  
  // Optionally, refresh books to get the latest list
  // await loadBooks(); // or refreshBooks()
}, [user, setActiveBook]);

  const deleteBook = useCallback(async (id: string) => {
    if (!user) return;
    
    const batch = writeBatch(db);
    
    const txQuery = query(collection(db, 'transactions'), where('bookId', '==', id));
    const txSnapshot = await getDocs(txQuery);
    txSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const debtQuery = query(collection(db, 'debtors'), where('bookId', '==', id));
    const debtSnapshot = await getDocs(debtQuery);
    debtSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const prodQuery = query(collection(db, 'products'), where('bookId', '==', id));
    const prodSnapshot = await getDocs(prodQuery);
    prodSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const invoiceQuery = query(collection(db, 'invoices'), where('bookId', '==', id));
    const invoiceSnapshot = await getDocs(invoiceQuery);
    invoiceSnapshot.forEach(doc => batch.delete(doc.ref));
    
    // NEW: Delete documents
    const docQuery = query(collection(db, 'documents'), where('bookId', '==', id));
    const docSnapshot = await getDocs(docQuery);
    docSnapshot.forEach(doc => batch.delete(doc.ref));
    
    const bookRef = doc(db, 'books', id);
    batch.delete(bookRef);
    
    await batch.commit();
    
    setBooks(prev => prev.filter(b => b.id !== id));
    if (activeBook?.id === id) {
      setActiveBook(null);
    }
  }, [user, activeBook, setActiveBook]);

  const updateBook = useCallback(async (id: string, data: { name?: string; description?: string; icon?: string; accessPassword?: string; passwordProtected?: boolean }) => {
    if (!user) return;
    
    const bookRef = doc(db, 'books', id);
    await updateDoc(bookRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    if (activeBook?.id === id) {
      setActiveBookState(prev => prev ? { ...prev, ...data } : prev);
    }
  }, [user, activeBook]);

  const refreshBooks = useCallback(async () => {
    console.log("🔄 Manually refreshing books...");
    await loadBooks();
    if (activeBook) {
      await loadBookData(activeBook);
    }
  }, [loadBooks, loadBookData, activeBook]);

// In AppContext.tsx, add this to addTransaction
const addTransaction = useCallback(async (t: Omit<Transaction, "id" | "createdAt" | "userId" | "bookId">) => {
  if (!user) throw new Error("User not authenticated");
  
  // If bookId is explicitly set to null, it's a personal transaction
  // Otherwise, use activeBook.id
  const bookId = t.bookId !== undefined ? t.bookId : activeBook?.id || null;
  
  console.log("Adding transaction:", { ...t, bookId, isPersonal: bookId === null });
  
  const newTransaction = {
    ...t,
    userId: user.id,
    bookId: bookId,
    createdAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
  console.log("Transaction saved with ID:", docRef.id);
  
  const createdTx: Transaction = {
    ...t,
    id: docRef.id,
    createdAt: Date.now(),
    userId: user.id,
    bookId: bookId,
  };
  
  setTransactions(prev => [createdTx, ...prev]);
  
  // If it's a personal transaction (bookId === null), also trigger a refresh for goals
  if (bookId === null || bookId === "personal") {
    // This will trigger the useEffect in the main screen to update goals
    console.log("✅ Personal transaction added, goals will be updated");
  }
  
}, [user, activeBook]);

  const updateTransaction = useCallback(async (id: string, t: Partial<Transaction>) => {
    if (!user) return;
    
    const txRef = doc(db, 'transactions', id);
    await updateDoc(txRef, t);
    
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...t } : tx));
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) return;
    
    const txRef = doc(db, 'transactions', id);
    await deleteDoc(txRef);
    
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, [user]);

  const addDebt = useCallback(async (d: Omit<Debt, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user || !activeBook) throw new Error("No active book or user");
    
    const newDebt = {
      ...d,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'debtors'), newDebt);
    const createdDebt: Debt = {
      ...d,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setDebts(prev => [createdDebt, ...prev]);
  }, [user, activeBook]);

  const updateDebt = useCallback(async (id: string, d: Partial<Debt>) => {
    if (!user) return;
    
    const debtRef = doc(db, 'debtors', id);
    await updateDoc(debtRef, d);
    
    setDebts(prev => prev.map(debt => debt.id === id ? { ...debt, ...d } : debt));
  }, [user]);

  const deleteDebt = useCallback(async (id: string) => {
    if (!user) return;
    
    const debtRef = doc(db, 'debtors', id);
    await deleteDoc(debtRef);
    
    setDebts(prev => prev.filter(debt => debt.id !== id));
  }, [user]);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt" | "userId" | "bookId">) => {
    if (!user || !activeBook) throw new Error("No active book or user");
    
    const newProduct = {
      ...p,
      userId: user.id,
      bookId: activeBook.id,
      createdAt: Timestamp.now(),
    };
    
    const docRef = await addDoc(collection(db, 'products'), newProduct);
    const createdProduct: Product = {
      ...p,
      id: docRef.id,
      createdAt: Date.now(),
      userId: user.id,
      bookId: activeBook.id,
    };
    
    setProducts(prev => [createdProduct, ...prev]);
  }, [user, activeBook]);

  const updateProduct = useCallback(async (id: string, p: Partial<Product>) => {
    if (!user) return;
    
    const prodRef = doc(db, 'products', id);
    await updateDoc(prodRef, p);
    
    setProducts(prev => prev.map(prod => prod.id === id ? { ...prod, ...p } : prod));
  }, [user]);

  const deleteProduct = useCallback(async (id: string) => {
    if (!user) return;
    
    const prodRef = doc(db, 'products', id);
    await deleteDoc(prodRef);
    
    setProducts(prev => prev.filter(prod => prod.id !== id));
  }, [user]);

  const setPin = useCallback(async (newPin: string | null) => {
    setPinState(newPin);
    if (newPin) {
      await AsyncStorage.setItem(PIN_KEY, newPin);
    } else {
      await AsyncStorage.removeItem(PIN_KEY);
    }
  }, []);

  const unlock = useCallback((enteredPin: string): boolean => {
    if (enteredPin === pin) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [pin]);

  const lock = useCallback(() => {
    if (pin) setIsLocked(true);
  }, [pin]);

  const { totalBalance, totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    
    const safeTransactions = transactions || [];
    
    for (const t of safeTransactions) {
      if (t && t.type === "income") {
        income += t.amount || 0;
      } else if (t && t.type === "expense") {
        expense += t.amount || 0;
      }
    }
    
    console.log("Calculated totals - Income:", income, "Expense:", expense, "Balance:", income - expense);
    
    return {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: income - expense,
    };
  }, [transactions]);

  const value = useMemo<AppContextValue>(
    () => ({
      books,
      activeBook,
      setActiveBook,
      createBook,
      deleteBook,
      updateBook,
      transactions,
      debts,
      products,
      pin,
      invoices,
      documents,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addDocument,
      updateDocument,
      deleteDocument,
      fetchDocuments,
      isLocked,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      addProduct,
      updateProduct,
      deleteProduct,
      setPin,
      unlock,
      lock,
      totalBalance,
      totalIncome,
      totalExpense,
      refreshBooks,
      isLoadingBooks,
      totalBalanceAllBooks,
      totalIncomeAllBooks,
      totalExpenseAllBooks,
      setBookPassword,
      removeBookPassword,
      verifyBookPassword,
    }),
    [
      books,
      activeBook,
      setActiveBook,
      createBook,
      deleteBook,
      updateBook,
      transactions,
      debts,
      products,
      pin,
      invoices,
      documents,
      addInvoice,
      updateInvoice,
      deleteInvoice,
      addDocument,
      updateDocument,
      deleteDocument,
      fetchDocuments,
      isLocked,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addDebt,
      updateDebt,
      deleteDebt,
      addProduct,
      updateProduct,
      deleteProduct,
      setPin,
      unlock,
      lock,
      totalBalance,
      totalIncome,
      totalExpense,
      refreshBooks,
      isLoadingBooks,
      totalBalanceAllBooks,
      totalIncomeAllBooks,
      totalExpenseAllBooks,
      setBookPassword,
      removeBookPassword,
      verifyBookPassword,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}